#!/usr/bin/env python3
"""fleet-acq-2 js-heavy harness: script is inert, JS strings are not URLs,
noscript is the only fallback source, JSON data blocks are data."""
import json, os, re, sys
from html.parser import HTMLParser

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "jsheavy")
JSON_CAP = 262144
SSRF = re.compile(r"^(localhost|127\.|10\.|192\.168\.|169\.254\.)", re.I)
JS_URL = re.compile(r"""https?://[^\s'"]+|wss?://[^\s'"]+|/api/[^\s'"]*""")
QUOTED_PATH = re.compile(r"""['"](/[A-Za-z0-9._~:/?#@!$&'()*+,;=-]*)['"]""")

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.flags = set(); self.text = []; self.noscript_text = []
        self.title = None; self.in_title = False
        self.script = None; self.scripts = []; self.json_blocks = []
        self.in_style = False; self.in_template = 0; self.in_noscript = False
        self.links = []; self.lazy = []; self.iframes = []; self.media = []
        self.csp = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "script":
            self.script = {"attrs": a, "code": ""}
        elif tag == "style": self.in_style = True
        elif tag == "template": self.in_template += 1; self.flags.add("template_inert")
        elif tag == "noscript": self.in_noscript = True
        elif tag == "title": self.in_title = True
        elif tag == "a":
            href = a.get("href", "")
            if self.in_noscript:
                self.flags.add("noscript_provenance")
            if href.strip().lower().startswith(("javascript:", "data:", "vbscript:")):
                self.flags.add("scheme_dropped")
            else:
                self.links.append(href); self.flags.add("untrusted_ref")
        elif tag == "form":
            act = a.get("action", "")
            if act:
                low = act.strip().lower()
                if low.startswith(("javascript:", "data:", "vbscript:")):
                    self.flags.add("scheme_dropped")
                else:
                    self.flags.add("form_action_claimed"); self.flags.add("untrusted_ref")
        elif tag == "iframe":
            if "srcdoc" in a: self.flags.add("iframe_srcdoc_inert")
            elif "src" in a: self.iframes.append(a["src"]); self.flags.add("iframe_unfetched")
        elif tag == "source":
            if "src" in a: self.media.append(a["src"]); self.flags.add("media_unfetched")
        elif tag == "meta" and a.get("http-equiv", "").lower() == "content-security-policy":
            self.csp = a.get("content", ""); self.flags.add("policy_signal")
        for k in a:
            if k.startswith("on"): self.flags.add("event_handler_inert")
        for k in ("data-src", "data-href"):
            if k in a: self.lazy.append(a[k]); self.flags.add("lazy_ref")
        for k in a:
            if k.startswith("data-") and k not in ("data-src", "data-href"):
                self.flags.add("data_attr_claimed")
        if "-" in tag: self.flags.add("custom_element_inert")
    def handle_endtag(self, tag):
        if tag == "script" and self.script is not None:
            s = self.script; self.script = None
            stype = s["attrs"].get("type", "").lower()
            code = s["code"]
            if stype in ("application/json", "application/ld+json"):
                if len(code) > JSON_CAP:
                    self.flags.add("json_data_block"); self.flags.add("json_cap")
                else:
                    try:
                        json.loads(code); self.flags.add("json_data_block")
                    except Exception: self.flags.add("json_block_failure")
            else:
                self.flags.add("script_inert")
                if "src" in s["attrs"]:
                    src = s["attrs"]["src"].strip()
                    low = src.lower()
                    if low.startswith(("javascript:", "data:", "vbscript:")):
                        self.flags.add("scheme_dropped")
                    else:
                        self.flags.add("script_src_unfetched")
                        if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", src):
                            self.flags.add("unresolved_ref")
                        else:
                            h = re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)", src)
                            if h and SSRF.match(h.group(1)): self.flags.add("ssrf_suspect")
                if ("document.write" in code or "innerHTML" in code or "createElement" in code or "appendChild" in code
                        or "textContent" in code or "innerText" in code):
                    self.flags.add("dom_mutation_guess")
                if re.search(r"(window\.)?location\s*=|location\.(replace|assign)\s*\(", code):
                    self.flags.add("js_redirect_claimed")
                if JS_URL.search(code) or QUOTED_PATH.search(code):
                    self.flags.add("no_url_harvest_from_js")
                if "getContext" in code or "WebGL" in code:
                    self.flags.add("unrendered_surface")
                if "sourceMappingURL" in code:
                    pass  # recorded, not fetched; inert already
        elif tag == "style": self.in_style = False
        elif tag == "template": self.in_template = max(0, self.in_template - 1)
        elif tag == "noscript": self.in_noscript = False
        elif tag == "title": self.in_title = False
    def handle_data(self, d):
        if self.script is not None: self.script["code"] += d; return
        if self.in_style or self.in_template: return
        if self.in_title: self.title = (self.title or "") + d; return
        if self.in_noscript:
            self.noscript_text.append(d); self.flags.add("noscript_provenance"); return
        self.text.append(d)

def parse(html):
    p = P()
    try: p.feed(html)
    except Exception: return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": ["quarantined"]}
    return {"outcome": "BOUNDED_SUCCESS", "flags": sorted(p.flags),
            "text": "".join(p.text), "noscript": "".join(p.noscript_text),
            "title": p.title, "links": p.links, "lazy": p.lazy}

def check(m):
    path = os.path.join(fxdir, f"ACQ-{m['mission_no']:04d}-{m['slug']}.html")
    got = parse(open(path, encoding="utf-8").read())
    exp = m["expect"]; eflags = m["expect_flags"]
    if exp.startswith("BOUNDED_SUCCESS"):
        ok = got["outcome"] == "BOUNDED_SUCCESS" and all(f in got["flags"] for f in eflags)
    else:
        code = exp.split(":")[1]
        ok = got["outcome"] == "TYPED_FAILURE" and got["code"] == code and all(f in got["flags"] for f in eflags)
    return ok, got

if __name__ == "__main__":
    manfile = sys.argv[1] if len(sys.argv) > 1 else os.path.join(WORK, "manifest-2151-2200.json")
    fxdir = sys.argv[2] if len(sys.argv) > 2 else FX
    manifest = json.load(open(manfile))
    fails = 0
    for m in manifest:
        ok, got = check(m)
        if not ok:
            print("FAIL", f"ACQ-{m['mission_no']:04d}", m["slug"], "need", m["expect_flags"], "got", got["flags"])
            fails += 1
    print("fails:", fails, "/", len(manifest))
    sys.exit(1 if fails else 0)
