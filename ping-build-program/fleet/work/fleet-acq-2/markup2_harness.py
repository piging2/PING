#!/usr/bin/env python3
"""fleet-acq-2 malformed-markup batch-2 harness: BOM sniffing, foreign content,
form-secret redaction, <base> resolution policy (single absolute base only)."""
import json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urljoin

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "malformed2")
SECRET_NAME = re.compile(r"token|secret|api[_-]?key|password|passwd|ssn|csrf|auth", re.I)
BIDI = re.compile("[\u202a-\u202e\u2066-\u2069]")
NONASCII_HOST = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)")

def sniff(raw: bytes):
    flags = set()
    if raw.startswith(b"\xff\xfe"): return raw[2:].decode("utf-16-le", errors="replace"), flags | {"utf16_bom"}
    if raw.startswith(b"\xfe\xff"): return raw[2:].decode("utf-16-be", errors="replace"), flags | {"utf16_bom"}
    if raw.startswith(b"\xef\xbb\xbf"):
        flags.add("bom_stripped"); raw = raw[3:]
    text = raw.decode("utf-8", errors="replace")
    if "�" in text: flags.add("encoding_suspect")
    return text, flags

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.flags = set(); self.text = []
        self.title = None; self.in_title = False
        self.in_raw = None
        self.links = []; self.bases = []
        self.in_noscript = False
        self.charsets = []
        self.redacted = 0; self.fields = 0
    def handle_starttag(self, tag, attrs):
        if self.in_raw: return
        a = dict(attrs)
        for k in a:
            if k.startswith("on"): self.flags.add("event_handler_inert")
            if k in ("contenteditable", "draggable", "spellcheck", "translate",
                     "autocapitalize", "autocomplete", "tabindex", "accesskey"):
                self.flags.add("attr_recorded")
        if tag in ("input", "textarea", "select", "button"):
            self.fields += 1; self.flags.add("form_field_recorded")
            name = a.get("name", ""); val = a.get("value", "")
            if SECRET_NAME.search(name) and val:
                self.redacted += 1; self.flags.add("secret_redacted")
        if tag == "button" and a.get("formaction"):
            self.flags.add("form_action_claimed")
        if tag in ("script", "style", "textarea") or tag == "title":
            self.in_raw = tag
            if tag == "title": self.in_title = True
            if tag == "script": self.flags.add("script_inert")
            if tag == "textarea": self.flags.add("rawtext_element")
            return
        if tag == "template": self.flags.add("template_inert"); return
        if tag == "noscript": self.in_noscript = True
        if tag == "svg" or tag == "math": self.flags.add("foreign_content")
        if tag == "meta":
            if "charset" in a: self.charsets.append(a["charset"].lower())
            he = a.get("http-equiv", "").lower()
            if he == "content-type" and "charset" in a.get("content", "").lower():
                self.flags.add("charset_declared")
        if tag == "base":
            if "href" in a:
                bh = a["href"].strip()
                if bh.lower().startswith(("javascript:", "data:", "vbscript:")):
                    self.flags.add("scheme_dropped")
                else:
                    self.bases.append(a["href"])
            if "target" in a: self.flags.add("base_recorded")
        if tag == "a" or (tag == "a"):
            href = a.get("href") or a.get("xlink:href")
            if href: self._link(href)
        if tag == "image":
            href = a.get("href") or a.get("xlink:href")
            if href: self._link(href)
        if tag == "link":
            href = a.get("href", "")
            if href:
                if self.in_noscript: self.flags.add("noscript_provenance")
                self.flags.add("stylesheet_ref" if a.get("rel") == "stylesheet" else "untrusted_ref")
                self.links.append(href)
        if tag in ("object",):
            if a.get("data"): self.flags.add("plugin_data_unfetched")
        if tag == "embed":
            if a.get("src"): self.flags.add("plugin_data_unfetched")
        if tag == "applet": self.flags.add("legacy_plugin_ignored")
        if tag in ("marquee", "blink", "keygen"): self.flags.add("legacy_tag")
        if tag == "slot": self.flags.add("shadow_slot")
        if tag == "details": self.flags.add("details_present")

    def _link(self, href):
        low = href.strip().lower()
        if low.startswith(("javascript:", "data:", "vbscript:")):
            self.flags.add("scheme_dropped"); return
        m = NONASCII_HOST.match(href.strip())
        if m:
            try: m.group(1).encode("ascii")
            except UnicodeEncodeError: self.flags.add("idn_suspect")
            if m.group(1).startswith("xn--"): self.flags.add("punycode_noted")
        self.links.append(href)
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", href.strip()):
            self.flags.add("untrusted_ref")
    def handle_endtag(self, tag):
        if tag == "noscript": self.in_noscript = False
        if self.in_raw:
            if tag == self.in_raw: self.in_raw = None; self.in_title = False
            return
    def handle_data(self, d):
        if self.in_raw == "title": self.title = (self.title or "") + d; return
        if self.in_raw: return
        self.text.append(d)
        if "\u200b" in d or "\u200c" in d or "\u200d" in d or "\ufeff" in d:
            self.flags.add("zw_chars")
        if BIDI.search(d): self.flags.add("bidi_neutralized")
        if "\u00ad" in d: self.flags.add("soft_hyphen")

def parse(raw: bytes):
    text, flags = sniff(raw)
    if not text.strip():
        return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": sorted(flags | {"empty_input"})}
    p = P()
    try: p.feed(text)
    except Exception:
        return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": ["quarantined"]}
    p.flags |= flags
    # charset policy
    if len(p.charsets) > 1: p.flags.add("charset_conflict")
    elif p.charsets: p.flags.add("charset_declared")
    # base policy: resolve only with exactly one absolute http(s) base
    abs_bases = [b for b in p.bases if re.match(r"^https?://", b.strip(), re.I)]
    if len(p.bases) > 1: p.flags.add("base_conflict")
    elif len(p.bases) == 1 and not re.match(r"^https?://", p.bases[0].strip(), re.I):
        p.flags.add("base_recorded")
    if "bom_stripped" in p.flags and any(c not in ("utf-8", "utf8") for c in p.charsets):
        p.flags.add("bom_wins")
    resolved = []
    for L in p.links:
        if len(abs_bases) == 1 and len(p.bases) == 1 and not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", L.strip()):
            resolved.append(urljoin(abs_bases[0], L.strip()))
            p.flags.add("base_applied"); p.flags.add("untrusted_ref")
        elif not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", L.strip()):
            p.flags.add("unresolved_ref"); resolved.append(L)
        else:
            resolved.append(L); p.flags.add("untrusted_ref")
    return {"outcome": "BOUNDED_SUCCESS", "flags": sorted(p.flags),
            "text": "".join(p.text), "title": p.title,
            "links": resolved, "redacted": p.redacted}

def check(m):
    path = os.path.join(FX, f"ACQ-{m['mission_no']:04d}-{m['slug']}.html")
    got = parse(open(path, "rb").read())
    exp = m["expect"]; eflags = m["expect_flags"]
    if exp.startswith("BOUNDED_SUCCESS"):
        ok = got["outcome"] == "BOUNDED_SUCCESS" and all(f in got["flags"] for f in eflags)
    else:
        code = exp.split(":")[1]
        ok = got["outcome"] == "TYPED_FAILURE" and got["code"] == code and all(f in got["flags"] for f in eflags)
    return ok, got

if __name__ == "__main__":
    manifest = json.load(open(os.path.join(WORK, "manifest-2301-2350.json")))
    fails = 0
    for m in manifest:
        ok, got = check(m)
        if not ok:
            print("FAIL", f"ACQ-{m['mission_no']:04d}", m["slug"], "need", m["expect_flags"], "got", got["flags"])
            fails += 1
    print("fails:", fails, "/", len(manifest))
    sys.exit(1 if fails else 0)
