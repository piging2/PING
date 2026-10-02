#!/usr/bin/env python3
"""fleet-acq-2: malformed-markup batch 2 (missions ACQ-2301..ACQ-2350, cases 0-49).
Encoding sniffing, foreign content (SVG/MathML), form secrets, <base> resolution
policy: resolve against base ONLY when exactly one absolute base href is declared;
otherwise relative refs stay unresolved."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "malformed2")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, payload, expect, note, flags=(), binary=False):
    CASES.append({"case": case, "mission_no": 2301 + case, "slug": slug, "bound": "MALFORMED",
                  "payload": payload, "binary": binary, "expect": expect, "note": note,
                  "expect_flags": list(flags)})

B = lambda body, head="": f"<!doctype html><html><head>{head}</head><body>{body}</body></html>"

add(0, "utf16le-bom", b"\xff\xfe" + "<p>hi</p>".encode("utf-16-le"), "BOUNDED_SUCCESS",
    "UTF-16LE BOM: decoded, flagged", flags=["utf16_bom"], binary=True)
add(1, "utf16be-bom", b"\xfe\xff" + "<p>hi</p>".encode("utf-16-be"), "BOUNDED_SUCCESS",
    "UTF-16BE BOM: decoded, flagged", flags=["utf16_bom"], binary=True)
add(2, "charset-meta", B("<p>hi</p>", '<meta charset="utf-8">'), "BOUNDED_SUCCESS",
    "declared utf-8, content matches", flags=[])
add(3, "charset-conflict", B("<p>hi</p>", '<meta charset="utf-8"><meta charset="iso-8859-1">'), "BOUNDED_SUCCESS",
    "conflicting charsets: first wins, conflict flagged", flags=["charset_conflict"])
add(4, "bom-vs-meta", b"\xef\xbb\xbf" + B("<p>hi</p>", '<meta charset="iso-8859-1">').encode(), "BOUNDED_SUCCESS",
    "BOM wins over meta, flagged", flags=["bom_wins"], binary=True)
add(5, "http-equiv-ct", B("<p>hi</p>", '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">'), "BOUNDED_SUCCESS",
    "http-equiv content type recorded", flags=["charset_declared"])
add(6, "svg-script", B('<svg><script>alert(1)</script></svg><p>x</p>'), "BOUNDED_SUCCESS",
    "script inside SVG still inert", flags=["script_inert", "foreign_content"])
add(7, "svg-a-xlink", B('<svg><a xlink:href="https://a.example/s">t</a></svg>'), "BOUNDED_SUCCESS",
    "SVG xlink:href recorded as untrusted ref", flags=["untrusted_ref", "foreign_content"])
add(8, "svg-a-href", B('<svg><a href="https://a.example/s2">t</a></svg>'), "BOUNDED_SUCCESS",
    "SVG2 href recorded", flags=["untrusted_ref", "foreign_content"])
add(9, "mathml", B('<math><mi>x</mi><mo>+</mo><mn>1</mn></math>'), "BOUNDED_SUCCESS",
    "MathML inert, text extracted", flags=["foreign_content"])
add(10, "svg-image", B('<svg><image href="https://a.example/i.png"/></svg>'), "BOUNDED_SUCCESS",
    "SVG image href unfetched", flags=["untrusted_ref", "foreign_content"])
add(11, "svg-foreignobject", B('<svg><foreignObject><p>html in svg</p></foreignObject></svg>'), "BOUNDED_SUCCESS",
    "foreignObject HTML parsed as HTML", flags=["foreign_content"])
add(12, "hidden-token", B('<input type="hidden" name="csrf_token" value="ABC123">'), "BOUNDED_SUCCESS",
    "secret-shaped hidden value redacted", flags=["secret_redacted"])
add(13, "hidden-page", B('<input type="hidden" name="page" value="2">'), "BOUNDED_SUCCESS",
    "non-secret hidden value kept verbatim", flags=["form_field_recorded"])
add(14, "password-input", B('<input type="password" name="pw" value="">'), "BOUNDED_SUCCESS",
    "password field noted, no value captured", flags=["form_field_recorded"])
add(15, "apikey-value", B('<input name="api_key" value="sk-live-FAKE">'), "BOUNDED_SUCCESS",
    "api_key value redacted by name shape", flags=["secret_redacted"])
add(16, "textarea-notes", B('<textarea name="notes">hello</textarea>'), "BOUNDED_SUCCESS",
    "plain textarea kept", flags=["form_field_recorded", "rawtext_element"])
add(17, "base-single", B('<a href="page">x</a>', '<base href="https://a.example/sub/">'), "BOUNDED_SUCCESS",
    "single absolute base: relative resolved, flagged", flags=["base_applied", "untrusted_ref"])
add(18, "base-relative", B('<a href="page">x</a>', '<base href="/sub/">'), "BOUNDED_SUCCESS",
    "relative base: refs stay unresolved", flags=["base_recorded", "unresolved_ref"])
add(19, "base-multiple", B('<a href="page">x</a>', '<base href="https://a.example/a"><base href="https://b.example/">'), "BOUNDED_SUCCESS",
    "multiple bases: conflict, unresolved", flags=["base_conflict", "unresolved_ref"])
add(20, "base-target", B('<a href="https://a.example/">x</a>', '<base target="_blank">'), "BOUNDED_SUCCESS",
    "base target recorded", flags=["base_recorded", "untrusted_ref"])
add(21, "base-js", B('<a href="page">x</a>', '<base href="javascript:x">'), "BOUNDED_SUCCESS",
    "javascript base dropped", flags=["scheme_dropped", "unresolved_ref"])
add(22, "zw-text", "<p>caf\u200be\u200b</p>", "BOUNDED_SUCCESS",
    "zero-width chars kept verbatim, flagged", flags=["zw_chars"])
add(23, "bidi-text", "<p>\u202eReversed</p>", "BOUNDED_SUCCESS",
    "bidi override neutralized in normalized view", flags=["bidi_neutralized"])
add(24, "soft-hyphen", "<p>super\u00adcali</p>", "BOUNDED_SUCCESS",
    "soft hyphen kept verbatim, flagged", flags=["soft_hyphen"])
add(25, "homoglyph-domain", '<a href="https://\u0430.example/">x</a>', "BOUNDED_SUCCESS",
    "cyrillic-a domain flagged", flags=["idn_suspect", "untrusted_ref"])
add(26, "punycode", '<a href="https://xn--80a.example/">x</a>', "BOUNDED_SUCCESS",
    "punycode recorded verbatim", flags=["punycode_noted", "untrusted_ref"])
add(27, "contenteditable", '<div contenteditable="true">edit me</div>', "BOUNDED_SUCCESS",
    "contenteditable recorded as attr, no behavior", flags=["attr_recorded"])
add(28, "dialog-open", "<dialog open><p>modal text</p></dialog>", "BOUNDED_SUCCESS",
    "dialog text extracted, no modal semantics", flags=[])
add(29, "details", "<details><summary>S</summary><p>hidden text</p></details>", "BOUNDED_SUCCESS",
    "details content extracted regardless of open state", flags=["details_present"])
add(30, "input-types", B('<input type="email" name="e"><input type="date" name="d"><input type="checkbox" checked name="c">'), "BOUNDED_SUCCESS",
    "input types recorded verbatim", flags=["form_field_recorded"])
add(31, "file-input", B('<input type="file" name="f">'), "BOUNDED_SUCCESS",
    "file input recorded, no file interaction", flags=["form_field_recorded"])
add(32, "select", B('<select name="s"><option value="1">One</option><option>Two</option></select>'), "BOUNDED_SUCCESS",
    "options extracted as text", flags=["form_field_recorded"])
add(33, "label", B('<label for="e">Email</label><input id="e" name="e">'), "BOUNDED_SUCCESS",
    "label text extracted", flags=["form_field_recorded"])
add(34, "button-formaction", B('<button formaction="https://a.example/b">Go</button>'), "BOUNDED_SUCCESS",
    "button formaction recorded as claimed endpoint", flags=["form_action_claimed"])
add(35, "object-data", B('<object data="https://a.example/x.swf"></object>'), "BOUNDED_SUCCESS",
    "object data unfetched", flags=["plugin_data_unfetched"])
add(36, "embed-src", B('<embed src="https://a.example/x.pdf">'), "BOUNDED_SUCCESS",
    "embed src unfetched", flags=["plugin_data_unfetched"])
add(37, "applet", B('<applet code="Old.class">x</applet>'), "BOUNDED_SUCCESS",
    "applet ignored as legacy", flags=["legacy_plugin_ignored"])
add(38, "marquee", "<marquee>scrolling</marquee>", "BOUNDED_SUCCESS",
    "marquee text extracted", flags=["legacy_tag"])
add(39, "blink", "<blink>hi</blink>", "BOUNDED_SUCCESS",
    "blink text extracted", flags=["legacy_tag"])
add(40, "keygen", B("<keygen>"), "BOUNDED_SUCCESS",
    "keygen ignored", flags=["legacy_tag"])
add(41, "ruby", "<ruby>漢<rt>kan</rt></ruby>", "BOUNDED_SUCCESS",
    "ruby text extracted", flags=[])
add(42, "wbr", "<p>super<wbr>cali</p>", "BOUNDED_SUCCESS",
    "wbr: text joined", flags=[])
add(43, "template-nested", B("<template><template><p>x</p></template></template><p>y</p>"), "BOUNDED_SUCCESS",
    "nested templates inert", flags=["template_inert"])
add(44, "slot", B("<slot name=\"s\">fallback</slot>"), "BOUNDED_SUCCESS",
    "slot fallback text extracted", flags=["shadow_slot"])
add(45, "noscript-css", B("<p>x</p>", "<noscript><link rel=\"stylesheet\" href=\"https://a.example/s.css\"></noscript>"), "BOUNDED_SUCCESS",
    "noscript stylesheet ref recorded unfetched", flags=["noscript_provenance", "stylesheet_ref"])
add(46, "draggable", '<div draggable="true" ondragstart="d()">x</div>', "BOUNDED_SUCCESS",
    "drag handlers inert", flags=["event_handler_inert", "attr_recorded"])
add(47, "spellcheck", '<textarea spellcheck="false" translate="no">x</textarea>', "BOUNDED_SUCCESS",
    "attrs recorded verbatim", flags=["attr_recorded", "rawtext_element"])
add(48, "autocapitalize", B('<input autocapitalize="off" autocomplete="email" name="e">'), "BOUNDED_SUCCESS",
    "input attrs recorded", flags=["attr_recorded", "form_field_recorded"])
add(49, "everything2", '<!doctype html><html><head><base href="https://a.example/b/"><meta charset="utf-8"></head><body><svg><a href="s1">t</a></svg><a href="p2">u</a><input type="hidden" name="token" value="V"><p>\u200bok\u00ad</p></body></html>',
    "BOUNDED_SUCCESS", "kitchen sink: base applied, foreign links kept, secret redacted, zw/shy flagged",
    flags=["base_applied", "untrusted_ref", "foreign_content", "secret_redacted", "zw_chars", "soft_hyphen", "charset_declared"])

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.html"
    p = c["payload"]
    with open(os.path.join(FX, fname), "wb") as f:
        f.write(p if isinstance(p, bytes) else p.encode("utf-8"))
    manifest.append({k: v for k, v in c.items() if k != "payload"})
with open(os.path.join(WORK, "manifest-2301-2350.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
