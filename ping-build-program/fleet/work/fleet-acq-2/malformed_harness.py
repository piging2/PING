#!/usr/bin/env python3
"""fleet-acq-2 malformed-markup harness: lenient recovery with every recovery flagged."""
import json, os, re, sys
from html.parser import HTMLParser

WORK = os.path.dirname(os.path.abspath(__file__))
DEPTH_CAP = 200
ATTR_CAP = 100
ATTR_LEN_CAP = 65536
TEXT_CAP = 2_000_000

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.flags = set(); self.text = []; self.text_len = 0
        self.depth = 0; self.stack = []
        self.title = None; self.in_title = False
        self.in_raw = None  # script/style/textarea/title rawtext
        self.links = []
    def handle_starttag(self, tag, attrs):
        if self.in_raw:
            return  # rawtext swallows
        keys = [k for k, v in attrs]
        if len(keys) != len(set(keys)): self.flags.add("dup_attr")
        if len(attrs) > ATTR_CAP: self.flags.add("attr_cap"); attrs = attrs[:ATTR_CAP]
        for k, v in attrs:
            if v and len(v) > ATTR_LEN_CAP: self.flags.add("attr_length_cap")
        self.depth += 1; self.stack.append(tag)
        if self.depth > DEPTH_CAP: self.flags.add("depth_cap")
        if tag in ("script", "style", "textarea") or (tag == "title"):
            self.in_raw = tag
            if tag == "title": self.in_title = True
            if tag == "script": self.flags.add("script_inert")
        if tag == "template": self.flags.add("template_inert")
        if tag == "a":
            href = dict(attrs).get("href", "")
            if href.strip().lower().startswith(("javascript:", "data:", "vbscript:")):
                self.flags.add("scheme_dropped")
            elif href: self.links.append(href); self.flags.add("untrusted_ref")
        if tag == "form":
            act = dict(attrs).get("action", "")
            if act: self.flags.add("form_action_claimed")
        if ":" in tag or tag in ("blah",): self.flags.add("unknown_tag")
    def handle_endtag(self, tag):
        if self.in_raw:
            if tag == self.in_raw:
                self.in_raw = None; self.in_title = False
                if self.stack and self.stack[-1] == tag:
                    self.stack.pop(); self.depth -= 1
            return
        if tag in self.stack:
            # pop through mismatches, flag soup
            while self.stack and self.stack[-1] != tag:
                self.stack.pop(); self.depth -= 1; self.flags.add("soup_recovered")
            self.stack.pop(); self.depth -= 1
        else:
            self.flags.add("soup_recovered")
    def handle_data(self, d):
        if self.in_raw == "title":
            self.flags.add("rawtext_element")
            self.title = (self.title or "") + d; return
        if self.in_raw:
            if self.in_raw in ("textarea", "title"): self.flags.add("rawtext_element")
            return
        # decode only well-formed entities; leave broken ones literal
        d2 = re.sub(r"&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);",
                    lambda m: self._ent(m.group(1)), d)
        if d2 != d and "&" in d: pass
        if re.search(r"&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*)(?![a-zA-Z0-9]*;)", d):
            self.flags.add("entity_literal")
        if self.text_len < TEXT_CAP:
            room = TEXT_CAP - self.text_len
            self.text.append(d2[:room]); self.text_len += min(len(d2), room)
            if len(d2) > room: self.flags.add("text_cap")
    def _ent(self, e):
        try:
            if e.startswith("#x") or e.startswith("#X"): return chr(int(e[2:], 16))
            if e.startswith("#"): return chr(int(e[1:]))
            import html.entities
            return chr(html.entities.name2codepoint[e])
        except Exception:
            self.flags.add("entity_literal"); return "&" + e + ";"
    def handle_entityref(self, name):
        import html.entities
        if name in html.entities.name2codepoint:
            self.handle_data(chr(html.entities.name2codepoint[name]))
        else:
            self.flags.add("entity_literal"); self.handle_data("&" + name + ";")
    def handle_charref(self, name):
        try:
            c = chr(int(name[2:], 16)) if name.lower().startswith("x") else chr(int(name))
            self.handle_data(c)
        except Exception:
            self.flags.add("entity_literal"); self.handle_data("&#" + name + ";")
    def handle_comment(self, d):
        if "--" in d: self.flags.add("comment_abuse")
    def handle_decl(self, d): self.flags.add("doctype_ignored")
    def handle_pi(self, d): self.flags.add("pi_ignored")
    def unknown_decl(self, d): self.flags.add("cdata_bogus")

def parse(html):
    flags = set()
    if html.startswith("﻿"): flags.add("bom_stripped"); html = html[1:]
    if not html.strip():
        return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": ["empty_input"]}
    if "\x00" in html: flags.add("null_byte_dropped"); html = html.replace("\x00", "")
    html2 = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f]", "", html)
    if html2 != html: flags.add("control_char_dropped")
    if "\r" in html2: flags.add("newline_normalized"); html2 = html2.replace("\r\n", "\n").replace("\r", "\n")
    if "�" in html2: flags.add("encoding_suspect")
    li = html2.rfind("<!--")
    if li != -1 and "-->" not in html2[li:]: flags.add("comment_unclosed")
    if "<" in re.sub(r"<[a-zA-Z!/][^>]*>", "", html2):
        flags.add("literal_angle")
    p = P()
    try:
        p.feed(html2)
    except Exception:
        return {"outcome": "TYPED_FAILURE", "code": "INVALID_PAYLOAD", "flags": ["quarantined"]}
    if p.stack: p.flags.add("soup_recovered")
    if p.in_raw in ("script",): p.flags.add("script_unclosed")
    if p.in_raw == "style": p.flags.add("style_unclosed")
    p.flags |= flags
    text = "".join(p.text)
    if not text.strip() and not p.links: p.flags.add("no_content")
    return {"outcome": "BOUNDED_SUCCESS", "flags": sorted(p.flags),
            "text": text, "title": p.title, "links": p.links}

def check(m):
    path = os.path.join(WORK, "fx", "malformed", f"ACQ-{m['mission_no']:04d}-{m['slug']}.html")
    got = parse(open(path, encoding="utf-8", errors="replace", newline="").read())
    exp = m["expect"]; eflags = m["expect_flags"]
    if exp.startswith("BOUNDED_SUCCESS"):
        ok = got["outcome"] == "BOUNDED_SUCCESS" and all(f in got["flags"] for f in eflags)
    else:
        code = exp.split(":")[1]
        ok = got["outcome"] == "TYPED_FAILURE" and got["code"] == code and all(f in got["flags"] for f in eflags)
    return ok, got

if __name__ == "__main__":
    manifest = json.load(open(os.path.join(WORK, "manifest-2251-2300.json")))
    fails = 0
    for m in manifest:
        ok, got = check(m)
        if not ok:
            print("FAIL", f"ACQ-{m['mission_no']:04d}", m["slug"], "need", m["expect_flags"], "got", got["flags"][:12])
            fails += 1
    print("fails:", fails, "/", len(manifest))
    sys.exit(1 if fails else 0)
