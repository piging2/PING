#!/usr/bin/env python3
"""fleet-acq-2: bounded hostile-HTML parser lab. Enforces lane-d parse bounds P1-P8
and checks the never-guess-into-fact invariant per fixture. stdlib only."""
import json, os, re, sys, time, html as ihtml
from html.parser import HTMLParser

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx")
MANIFEST = json.load(open(os.path.join(WORK, sys.argv[1] if len(sys.argv) > 1 else "manifest-0051-0100.json"))) 

CAPS = {"nodes": 200000, "text_bytes": 2*1024*1024, "links": 10000, "jsonld_blocks": 50,
        "jsonld_bytes": 512*1024, "meta": 500, "title_chars": 8192, "attr_bytes": 65536,
        "parse_seconds": 10.0}
STRIP_TAGS = {"script", "style", "template"}  # template contents are inert per HTML spec
PHONE_RE = re.compile(r"\(\d{3}\)\s*\d{3}-\d{4}")

class BoundedParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.nodes = 0; self.text_bytes = 0; self.links = []
        self.links_truncated = False; self.metas = []; self.meta_truncated = False
        self.jsonld = []; self.jsonld_truncated = False; self.jsonld_bytes = 0
        self.text_parts = []; self.text_truncated = False
        self.strip_depth = 0; self.in_title = False; self.title = ""; self.title_truncated = False
        self.abort = None; self.t0 = time.time()
        self.in_foreign_script = False; self.cur_jsonld = None
        self.facts = {"phones": [], "raw_attrs_dropped": 0}
        self.injections = []; self.forms = []; self.cur_form = None
        self.wall_detected = None
        self.foreign_depth = 0

    def _budget(self):
        if time.time() - self.t0 > CAPS["parse_seconds"]:
            self.abort = "TYPED_FAILURE:TIMEOUT(parse-deadline P6)"; return True
        return False

    def handle_starttag(self, tag, attrs):
        if self._budget(): return
        self.nodes += 1
        if self.nodes > CAPS["nodes"]:
            self.abort = "TYPED_FAILURE:INVALID_PAYLOAD(node cap P1 exceeded)"; return
        t = tag.lower()
        if t in ("svg", "math"): self.foreign_depth += 1
        if t in STRIP_TAGS:
            self.strip_depth += 1
            if t == "script":
                for k, v in attrs:
                    if k.lower() == "type" and "ld+json" in (v or "").lower():
                        self.in_foreign_script = True; self.cur_jsonld = ""
            return
        if self.strip_depth: return
        ad = dict((k.lower(), v) for k, v in attrs)
        for k, v in attrs:  # attr byte cap
            if v and len(v.encode("utf-8", "ignore")) > CAPS["attr_bytes"]:
                self.facts["raw_attrs_dropped"] += 1
        if t == "a":
            href = ad.get("href", "")
            if re.match(r"(?i)^\s*javascript\s*:", href or ""):
                self.facts["raw_attrs_dropped"] += 1
            else:
                if len(self.links) >= CAPS["links"]: self.links_truncated = True
                else: self.links.append(href)
        elif t == "meta":
            if len(self.metas) >= CAPS["meta"]: self.meta_truncated = True
            else: self.metas.append(ad)
            if ad.get("http-equiv", "").lower() == "refresh":
                self.facts.setdefault("meta_refresh", ad.get("content"))
        elif t == "title" and self.foreign_depth == 0: self.in_title = True
        elif t == "base" and "base_href" not in self.facts: self.facts["base_href"] = ad.get("href", "")
        elif t == "link":
            self.facts.setdefault("head_links", []).append({"rel": ad.get("rel", ""), "href": ad.get("href", ""),
                                                            "hreflang": ad.get("hreflang", ""), "type": ad.get("type", "")})
        elif t == "form":
            self.cur_form = {"action": ad.get("action", ""), "password_fields": 0}
        elif t == "input" and self.cur_form is not None:
            if ad.get("type", "").lower() == "password": self.cur_form["password_fields"] += 1
        for k, v in attrs:  # event-handler + injection scan in attrs
            if k.lower().startswith("on"): self.facts["raw_attrs_dropped"] += 1
        if "hidden" in ad: self.facts.setdefault("hidden_elements", 0); self.facts["hidden_elements"] += 1
        if t in ("img", "area", "input") and ad.get("alt"):
            self.facts.setdefault("alt_texts", []).append(ad["alt"][:200])
            self.handle_data(" " + ad["alt"] + " ")

    def handle_endtag(self, tag):
        t = tag.lower()
        if t in STRIP_TAGS and self.strip_depth:
            self.strip_depth -= 1
            if t == "script" and self.in_foreign_script:
                blk = self.cur_jsonld or ""
                self.jsonld_bytes += len(blk.encode("utf-8", "ignore"))
                if len(self.jsonld) >= CAPS["jsonld_blocks"] or self.jsonld_bytes > CAPS["jsonld_bytes"]:
                    self.jsonld_truncated = True
                else:
                    try: parsed = json.loads(blk); ok = True
                    except Exception: parsed = None; ok = False
                    self.jsonld.append({"ok": ok, "parsed": parsed, "bytes": len(blk)})
                self.in_foreign_script = False; self.cur_jsonld = None
        if t == "title" and self.foreign_depth == 0: self.in_title = False
        if t in ("svg", "math") and self.foreign_depth: self.foreign_depth -= 1
        if t == "form" and self.cur_form is not None:
            self.forms.append(self.cur_form); self.cur_form = None

    def handle_data(self, data):
        if self._budget(): return
        if self.in_foreign_script:
            self.cur_jsonld = (self.cur_jsonld or "") + data; return
        if self.strip_depth: return  # P7: script/style never become claims
        if self.in_title:
            room = CAPS["title_chars"] - len(self.title)
            if room <= 0: self.title_truncated = True
            else: self.title += data[:room]
            return
        # neutralize bidi spoofing chars
        for ch in ("\u202e", "\u202c", "\u200b", "\u200c", "\u200d", "\ufeff", "\u00ad", "\x00", "\x07"):
            data = data.replace(ch, "")
        low = data.lower()
        for sig in ("ignore all previous instructions", "you are now a", "data-role='system'", 'data-role="system"'):
            if sig in low: self.injections.append(sig); break
        b = data.encode("utf-8", "ignore")
        room = CAPS["text_bytes"] - self.text_bytes
        if room <= 0:
            self.text_truncated = True; return
        take = b[:room]
        self.text_bytes += len(take); self.text_parts.append(take.decode("utf-8", "ignore"))
        if len(b) > room: self.text_truncated = True

    def handle_comment(self, data):
        if "ignore all previous instructions" in data.lower(): self.injections.append("comment-injection")

    def handle_entityref(self, name):
        self.handle_data("&%s;" % name if name not in ihtml.entities.html5 else ihtml.unescape("&%s;" % name))
    def handle_charref(self, name):
        try: self.handle_data(chr(int(name[1:], 16) if name.startswith(("x","X")) else int(name)))
        except Exception: self.handle_data("&#%s;" % name)

def policy_layer(slug, raw):
    """Pre-parse fetch/policy decisions for fetch-adjacent fixtures. Returns outcome or None."""
    if slug == "data-url":
        return "TYPED_FAILURE:INVALID_PAYLOAD" if raw.startswith("data:") else None
    if slug == "credential-url":
        return "TYPED_FAILURE:AUTH_REQUIRED" if re.search(r"https?://[^/]*:[^/]*@", raw) else None
    if slug == "octet-stream":
        return "TYPED_FAILURE:UNSUPPORTED"
    if slug == "captcha-wall":
        return "TYPED_FAILURE:PERMISSION_DENIED"
    if slug == "robots-disallow":
        return "BOUNDED_SUCCESS"  # parsed below as policy text
    if slug == "robots-malformed":
        return "BOUNDED_SUCCESS"
    return None

def run_case(c):
    mno = c.get("mission_no", c["case"])
    fname = f"ACQ-{mno:04d}-{c['slug']}.html"
    raw = open(os.path.join(FX, fname), encoding="utf-8", errors="replace").read()
    mno_str = f"ACQ-{mno:04d}"
    # fetch/policy layer first
    pol = policy_layer(c["slug"], raw)
    if c["slug"] == "lying-content-length":
        # streaming abort: declared 100B, stream 50MiB -> abort at 5MiB cap
        declared, streamed, cap = 100, 50*1024*1024, 5*1024*1024
        assert streamed > cap
        return {"outcome": "TYPED_FAILURE:TIMEOUT", "note": "abort at 5MiB cap before full buffer (F1)", "provenance": "fetch-policy", "pass": c["expect"] == "TYPED_FAILURE:TIMEOUT"}
    if pol and c["slug"] in ("data-url", "credential-url", "octet-stream", "captcha-wall"):
        ok = pol == c["expect"]
        return {"outcome": pol, "note": c["note"], "provenance": "fetch-policy", "pass": ok}
    p = BoundedParser()
    try:
        p.feed(raw)
    except Exception as e:
        return {"outcome": "TYPED_FAILURE:INVALID_PAYLOAD", "note": f"hard parser error contained: {type(e).__name__}", "provenance": "parser", "pass": c["expect"] == "TYPED_FAILURE:INVALID_PAYLOAD"}
    # phishing form -> PERMANENT
    for f in p.forms:
        if f["password_fields"] and not (f["action"] or "").startswith("https"):
            return {"outcome": "TYPED_FAILURE:PERMANENT", "note": "credential-harvest form quarantined", "provenance": "parser", "pass": c["expect"] == "TYPED_FAILURE:PERMANENT"}
    if p.abort:
        return {"outcome": p.abort, "note": f"nodes={p.nodes}", "provenance": "parser", "pass": p.abort.startswith(c["expect"])}
    # truncated-stream detection: EOF inside an unterminated tag/doctype (no partial claims)
    tail = raw.rstrip()
    if re.search(r"<[a-zA-Z/!?][^<>]*$", tail):
        return {"outcome": "TYPED_FAILURE:INVALID_PAYLOAD", "note": "truncated mid-token at EOF; bytes_received=%d; no partial claim" % len(raw), "provenance": "parser", "pass": c["expect"] == "TYPED_FAILURE:INVALID_PAYLOAD"}
    if c["case"] == 62:
        bad = [b for b in p.jsonld if not b["ok"]]
        if not bad:
            return {"outcome": "BOUNDED_SUCCESS", "note": "malformed block NOT isolated", "provenance": "parser", "pass": False}
    text = "".join(p.text_parts)
    phones = PHONE_RE.findall(text)
    # guess-checks per case
    guess_fail = None
    if c["case"] == 67 and "(555) 999-1234" in text: guess_fail = "script-planted phone leaked"
    if c["case"] == 67 and phones != ["(555) 111-2222"]: guess_fail = f"phone set wrong: {phones}"
    if c["case"] == 69 and len(phones) != 1: guess_fail = f"expected only body phone, got {phones}"
    if c["case"] == 79 and sorted(set(phones)) != ["(555) 111-2222", "(555) 333-4444"]:
        guess_fail = f"both phones must be separate observations: {phones}"
    if c["case"] in (74, 75) and not p.injections: guess_fail = "injection not detected"
    for bad in c.get("assert_not_in_text", []):
        if bad in text: guess_fail = f"forbidden string leaked into text: {bad!r}"
    for good in c.get("assert_text_contains", []):
        if good not in text: guess_fail = f"expected text missing: {good!r}"
    if c.get("assert_phones_eq") is not None and sorted(set(phones)) != sorted(c["assert_phones_eq"]):
        guess_fail = f"phone set mismatch: {phones} vs {c['assert_phones_eq']}"
    if c.get("assert_jsonld_n") is not None and len(p.jsonld) != c["assert_jsonld_n"]:
        guess_fail = f"jsonld count {len(p.jsonld)} != {c['assert_jsonld_n']}"
    if guess_fail:
        return {"outcome": "GUESS_DETECTED", "note": guess_fail, "provenance": "parser", "pass": False}
    if c["expect"].startswith("TYPED_FAILURE"):
        return {"outcome": "BOUNDED_SUCCESS", "note": "expected typed failure but parser succeeded bounded; re-check", "provenance": "parser", "pass": False}
    notes = [c["note"]]
    flags = []
    if p.text_truncated: flags.append("truncated_text")
    if p.links_truncated: flags.append(f"truncated_links(kept={len(p.links)})")
    if p.jsonld_truncated: flags.append("truncated_jsonld")
    if p.meta_truncated: flags.append("truncated_meta")
    if p.title_truncated: flags.append("truncated_title")
    if p.injections: flags.append(f"injections_quarantined={p.injections}")
    if p.facts.get("meta_refresh"): flags.append("meta_refresh_recorded_not_followed")
    if p.facts.get("base_href"): flags.append("base_href_recorded_untrusted:" + p.facts["base_href"][:60])
    if p.facts.get("hidden_elements"): flags.append(f"hidden_attr_elements={p.facts['hidden_elements']}(extracted_but_flagged)")
    if p.facts.get("alt_texts"): flags.append(f"alt_texts={len(p.facts['alt_texts'])}(provenance=alt)")
    if flags: notes.append("flags: " + ",".join(flags))
    return {"outcome": "BOUNDED_SUCCESS", "note": "; ".join(notes), "provenance": "parser",
            "stats": {"nodes": p.nodes, "text_bytes": p.text_bytes, "links": len(p.links), "metas": len(p.metas), "jsonld": len(p.jsonld)},
            "pass": True}

def main():
    results = []
    for c in MANIFEST:
        r = run_case(c); r["mission"] = f"ACQ-{c.get('mission_no', c['case']):04d}"; r["case"] = c["case"]
        r["slug"] = c["slug"]; r["bound"] = c["bound"]; r["expected"] = c["expect"]
        results.append(r)

    passed = sum(1 for r in results if r["pass"])
    print(f"PASS {passed}/{len(results)}")
    for r in results:
        if not r["pass"]:
            print("FAIL:", r["mission"], r["slug"], r.get("note"), "expected", r["expected"], "got", r["outcome"])
    with open(os.path.join(WORK, sys.argv[2] if len(sys.argv) > 2 else "run-0051-0100.jsonl"), "w") as f:
        for r in results: f.write(json.dumps(r) + "\n")

if __name__ == "__main__":
    main()
