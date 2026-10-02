#!/usr/bin/env python3
"""W-CORRECT helper: typed correction chain driver for the FYD demo journal.

Subcommands (run on the Pig, python3 /tmp/wcorrect/wc.py <cmd>):
  inspect <site>            fetch customize inspect view, save + summarize
  page <site>               fetch served site HTML, save, report markers
  parse <site> <text...>    POST parse, save parse.json, print proposal digest + review card
  approve <site> <text...>  POST approve using saved parse.json proposal, save approve.json
  clear <site> <intentId>   POST clear, save clear.json
  journal                    list FYD_SITE_OVERLAY event ids + op kinds from gateway
  dump <site>               run dump.py, print projection meta summary
  pjson <site>              print projection meta + presentationIntent summary
"""
import json, subprocess, sys, urllib.request, urllib.parse, os

BASE = "http://127.0.0.1:3100"
GW = "http://127.0.0.1:18199"
WORK = "/tmp/wcorrect"

def http_json(method, url, body=None, params=None):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, json.loads(r.read().decode())

def http_text(url):
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read().decode()

def save(name, obj):
    p = os.path.join(WORK, name)
    mode = "w"
    with open(p, mode) as f:
        if isinstance(obj, str):
            f.write(obj)
        else:
            json.dump(obj, f, indent=1)
    return p

def cmd_inspect(site):
    st, d = http_json("GET", BASE + "/api/fyd/customize",
                      params={"siteId": site, "view": "inspect"})
    p = save("inspect-%s.json" % site, d)
    print("saved", p, "http", st)
    print("ok:", d.get("ok"))
    print("specDigest:", d.get("specDigest", "")[:16])
    print("baseSpecDigest:", d.get("baseSpecDigest", "")[:16])
    print("demoOwnerMode:", d.get("demoOwnerMode"))
    print("directives:", [(x.get("intentId"), (x.get("siteIntent") or {}).get("kind")) for x in d.get("directives", [])])
    print("appliedIntentIds:", d.get("appliedIntentIds"))
    print("unresolved:", d.get("unresolved"))
    for pg in d.get("pageOrder", []):
        print("page", pg["pageSlug"], [(s["id"], s["component"], s["hidden"]) for s in pg["sections"]])

def cmd_page(site):
    st, html = http_text(BASE + "/sites/" + site)
    p = os.path.join(WORK, "page-%s.html" % site)
    with open(p, "w") as f:
        f.write(html)
    print("saved", p, "http", st, "bytes", len(html))
    markers = ["Services", "Heating", "Plumbing", "Ventilation", "Our Services"]
    for m in markers:
        print("marker %-14s count %d" % (m, html.count(m)))

def cmd_parse(site, text):
    st, d = http_json("POST", BASE + "/api/fyd/customize",
                      {"action": "parse", "siteId": site, "text": text})
    p = save("parse.json", d)
    print("saved", p, "http", st)
    print("ok:", d.get("ok"), "code:", d.get("code"), "error:", d.get("error"))
    if d.get("ok"):
        print("intent:", json.dumps(d.get("intent")))
        print("intentDigest:", d.get("intentDigest", "")[:16])
        print("resolutionNote:", d.get("resolutionNote"))
        print("siteIntent:", json.dumps(d.get("siteIntent")))
        prop = d.get("proposal") or {}
        print("proposalDigest:", prop.get("proposalDigest", "")[:32])
        print("proposal keys:", sorted(prop.keys()))
        rc = d.get("reviewCard") or {}
        print("reviewCard title:", rc.get("title"))
        print("BEFORE:", rc.get("before"))
        print("AFTER:", rc.get("after"))
        print("specDigest:", d.get("specDigest", "")[:16])

def cmd_approve(site, text):
    with open(os.path.join(WORK, "parse.json")) as f:
        parsed = json.load(f)
    proposal = parsed["proposal"]
    st, d = http_json("POST", BASE + "/api/fyd/customize",
                      {"action": "approve", "siteId": site, "text": text,
                       "proposal": proposal})
    p = save("approve.json", d)
    print("saved", p, "http", st)
    print("ok:", d.get("ok"), "code:", d.get("code"), "error:", d.get("error"))
    print("intentId:", d.get("intentId"))
    print("eventId:", d.get("eventId"))
    print("proposalDigest:", (d.get("proposalDigest") or "")[:32])
    print("note:", (d.get("note") or "")[:200])

def cmd_clear(site, intent_id):
    st, d = http_json("POST", BASE + "/api/fyd/customize",
                      {"action": "clear", "siteId": site, "intentId": intent_id})
    p = save("clear.json", d)
    print("saved", p, "http", st)
    print("ok:", d.get("ok"), "code:", d.get("code"), "error:", d.get("error"))
    print("intentId:", d.get("intentId"), "eventId:", d.get("eventId"))

def cmd_journal():
    st, d = http_json("GET", GW + "/events/FYD_SITE_OVERLAY")
    evs = d.get("events", d if isinstance(d, list) else [])
    print("http", st, "event count:", len(evs))
    for e in evs:
        ops = (e.get("event_data") or {}).get("ops", [])
        kinds = [o.get("op") + (":" + o.get("intentId", "")[:19] if o.get("intentId") else "") for o in ops]
        print(e.get("event_id"), e.get("timestamp"), (e.get("event_data") or {}).get("siteId"), kinds)

def cmd_dump(site):
    r = subprocess.run(["python3", "/home/nolan/ping/tools/fyd-site-projection/dump.py", site],
                       capture_output=True, text=True, timeout=120)
    print("dump rc:", r.returncode)
    out = (r.stdout + r.stderr).strip()
    print(out[:1500])
    cmd_pjson(site)

def cmd_analyze(site):
    """Structural markers from the saved served-page HTML."""
    import re
    p = os.path.join(WORK, "page-%s.html" % site)
    h = open(p).read()
    print("bytes:", len(h))
    heads = re.findall(r"<h[123][^>]*>(.*?)</h[123]>", h, re.S)
    clean = [re.sub(r"<[^>]+>", "", x).strip() for x in heads]
    print("headings:", [c for c in clean if c][:20])
    ids = sorted(set(re.findall(r'id="([^"]*(?:ection|ervices)[^"]*)"', h, re.I)))
    print("section-ish ids:", ids[:20])
    for m in ["Heating", "Ventilation", "Services", "Plumbing"]:
        print("marker %-12s count %d" % (m, h.count(m)))

def cmd_pjson(site):
    p = "/home/nolan/ping/var/fyd-projections/%s.json" % site
    with open(p) as f:
        d = json.load(f)
    m = d["meta"]
    print("projection:", p)
    print("siteId:", m["siteId"], "dumperVersion:", m.get("dumperVersion"))
    print("baseDigest:", m.get("baseDigest", "")[:16])
    print("fixtureFileDigest:", m.get("fixtureFileDigest", "")[:16])
    print("graphDigest:", m.get("graphDigest", "")[:16])
    print("presentationIntentDigest:", m.get("presentationIntentDigest"))
    print("overlayEventIds:", m.get("overlayEventIds"))
    pi = d.get("presentationIntent") or {}
    ds = pi.get("directives", [])
    print("directives in projection:", len(ds))
    for x in ds:
        si = x.get("siteIntent") or {}
        print(" -", x.get("intentId"), si.get("kind"), si.get("sectionId"), "hidden=", si.get("hidden"))

CMDS = {"inspect": cmd_inspect, "page": cmd_page, "parse": cmd_parse,
        "approve": cmd_approve, "clear": cmd_clear, "journal": cmd_journal,
        "dump": cmd_dump, "pjson": cmd_pjson, "analyze": cmd_analyze}

if __name__ == "__main__":
    cmd = sys.argv[1]
    args = sys.argv[2:]
    if cmd in ("parse", "approve"):
        site = args[0]
        CMDS[cmd](site, " ".join(args[1:]))
    elif cmd == "clear":
        CMDS[cmd](args[0], args[1])
    elif cmd == "journal":
        CMDS[cmd]()
    else:
        CMDS[cmd](args[0])
