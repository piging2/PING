#!/usr/bin/env python3
"""fleet-acq-2 sitemap harness v2: hostile-input XML checks, spec caps, verbatim records."""
import json, os, re, sys
from xml.parsers import expat

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "sitemap")
URL_CAP = 50000
KNOWN = {"urlset", "sitemapindex", "url", "sitemap", "loc", "lastmod", "changefreq",
         "priority", "image", "loc2", "content_loc", "link", "publication_date", "video", "news"}
CHANGEFREQ = {"always", "hourly", "daily", "weekly", "monthly", "yearly", "never"}
BIDI = re.compile("[\u202a-\u202e\u2066-\u2069]")
HOST_SSRF = re.compile(r"^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1\]?)", re.I)


def hygiene(loc, flags, dup_check=False, seen=None):
    low = loc.strip().lower()
    if low.startswith(("javascript:", "data:", "vbscript:")):
        flags.add("scheme_dropped"); return "drop"
    if "@" in (low.split("://", 1)[-1].split("/", 1)[0]) and "://" in low:
        flags.add("credential_url_rejected"); return "drop"
    if loc != loc.strip(): flags.add("whitespace_value")
    if "<" in loc: flags.add("markup_in_loc")
    if BIDI.search(loc): flags.add("bidi_neutralized")
    if loc and not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", loc.strip()):
        flags.add("unresolved_ref")
    else:
        h = host_of(loc)
        if h and HOST_SSRF.match(h): flags.add("ssrf_suspect")
    if dup_check and seen is not None:
        if loc and loc in seen: flags.add("duplicate_loc")
        seen.add(loc)
    return "keep"

ISO_DATE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})([Tt ].*)?$")
def iso_date(t):
    m = ISO_DATE.match(t.strip())
    if not m: return False
    mo, dy = int(m.group(2)), int(m.group(3))
    return 1 <= mo <= 12 and 1 <= dy <= 31
def host_of(loc):
    m = re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#@]+)", loc.strip())
    if not m: return None
    return m.group(1).lower()

def parse(xml):
    flags = set()
    if not xml or not xml.strip():
        return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": ["empty_input"]}
    if "<!DOCTYPE" in xml or "<!ENTITY" in xml:
        return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": ["entity_rejected"]}
    enc = re.match(r"<\?xml[^?]*encoding=[\"']([^\"']+)", xml)
    if enc and enc.group(1).lower().replace("-", "") != "utf8":
        flags.add("encoding_suspect")
    urls, smaps = [], []
    root = None
    stack = []
    cur_url, cur_sm = None, None
    seen = set()
    try:
        p = expat.ParserCreate(namespace_separator="}")
        def sh(n, a):
            nonlocal cur_url, cur_sm, root
            local = n.split("}")[-1]
            if root is None:
                root = local
                ns = n.split("}")[0] if "}" in n else ""
                if root in ("urlset", "sitemapindex"):
                    if ns != "http://www.sitemaps.org/schemas/sitemap/0.9":
                        flags.add("namespace_mismatch" if 'xmlns=' in xml[:2000] else "namespace_missing")
            stack.append((local, "".join(chars)))
            chars.clear()
            if local not in KNOWN and local not in ("image:image",) and not local.startswith(("image", "video", "news")):
                if local not in {"image", "video", "news", "publication", "publication_date"}:
                    flags.add("unknown_element")
            if local == "url": cur_url = {"meta": {}}
            if local == "sitemap":
                if root != "sitemapindex": flags.add("misplaced_entry")
                cur_sm = {}
            if local == "url" and root == "sitemapindex": flags.add("misplaced_entry")
            if local == "sitemapindex" and len(stack) > 1: flags.add("nested_index_ignored")
            if local == "link" and a.get("href"):
                smaps.append({"href": a["href"]}); flags.add("untrusted_ref")
                if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", a["href"]): flags.add("unresolved_ref")
        def chh(d): chars.append(d)
        def eh(n):
            nonlocal cur_url, cur_sm
            local = n.split("}")[-1]
            t = "".join(chars)
            if stack: stack.pop()
            chars.clear()
            if local == "loc":
                parent = stack[-1][0] if stack else ""
                loc = t  # verbatim, no strip guess
                if loc != loc.strip(): flags.add("whitespace_value")
                if "<" in loc: flags.add("markup_in_loc")
                if BIDI.search(loc): flags.add("bidi_neutralized")
                if parent == "url" and cur_url is not None:
                    cur_url["loc"] = loc
                elif parent == "sitemap" and cur_sm is not None:
                    cur_sm["loc"] = loc
                else:
                    smaps.append({"ext_loc": loc})
                    if hygiene(loc, flags) == "drop": pass
                    flags.add("untrusted_ref")
            elif local == "publication_date":
                if not iso_date(t.strip()):
                    flags.add("format_suspect")
            elif local in ("lastmod", "changefreq", "priority"):
                if stack and stack[-1][0] == "url" and cur_url is not None:
                    cur_url["meta"][local] = t
                elif stack and stack[-1][0] == "sitemap" and cur_sm is not None:
                    cur_sm[local] = t
            elif local == "url" and cur_url is not None:
                u = cur_url; cur_url = None
                loc = u.get("loc", "")
                if hygiene(loc, flags, dup_check=True, seen=seen) == "drop":
                    return
                m = u["meta"]
                if "priority" in m:
                    try:
                        pr = float(m["priority"].strip())
                        if not (0.0 <= pr <= 1.0): flags.add("range_suspect")
                    except Exception: flags.add("format_suspect")
                if "lastmod" in m and not iso_date(m["lastmod"].strip()):
                    flags.add("format_suspect")
                if "changefreq" in m and m["changefreq"].strip().lower() not in CHANGEFREQ:
                    flags.add("invalid_enum")
                if len(urls) < URL_CAP: urls.append(u)
            elif local == "sitemap" and cur_sm is not None:
                lm = cur_sm.get("lastmod")
                smaps.append(cur_sm); cur_sm = None
                flags.add("child_unfetched")
                if lm and not iso_date(str(lm).strip()):
                    flags.add("format_suspect")
        chars = []
        p.StartElementHandler, p.CharacterDataHandler, p.EndElementHandler = sh, chh, eh
        p.Parse(xml.encode("utf-8"), True)
    except Exception:
        return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": ["quarantined"]}
    if root not in ("urlset", "sitemapindex"):
        return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": ["not_xml"]}
    if xml.count("<url>") + xml.count("<url ") > URL_CAP or len(urls) == URL_CAP:
        if "<url>" in xml or "<url " in xml: flags.add("url_cap")
    if root in ("urlset", "sitemapindex") or urls or smaps:
        flags.add("untrusted_ref")
    return {"outcome": "BOUNDED_SUCCESS", "urls": len(urls), "sitemaps": len(smaps),
            "kind": root, "flags": sorted(flags),
            "locs": [u.get("loc", "") for u in urls]}

def check(m):
    path = os.path.join(FX, f"ACQ-{m['mission_no']:04d}-{m['slug']}.xml")
    with open(path, encoding="utf-8") as f: xml = f.read()
    got = parse(xml)
    exp = m["expect"]
    eflags = m["expect_flags"]
    if exp.startswith("BOUNDED_SUCCESS"):
        ok = got["outcome"] == "BOUNDED_SUCCESS" and all(f in got["flags"] for f in eflags)
    else:
        code = exp.split(":")[1]
        ok = got["outcome"] == "TYPED_FAILURE" and got["code"] == code and all(f in got["flags"] for f in eflags)
    if ok and m.get("verbatim"):
        ok = all(v in got.get("locs", []) for v in m["verbatim"])
    return ok, got

if __name__ == "__main__":
    manifest = json.load(open(os.path.join(WORK, "manifest-0551-0600.json")))
    fails = 0
    for m in manifest:
        ok, got = check(m)
        if not ok:
            print("FAIL", f"ACQ-{m['mission_no']:04d}", m["slug"], "need", m["expect_flags"], "got", json.dumps(got)[:220])
            fails += 1
    print("fails:", fails, "/", len(manifest))
    sys.exit(1 if fails else 0)
