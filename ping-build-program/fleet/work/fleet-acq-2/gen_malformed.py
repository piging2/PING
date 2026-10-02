#!/usr/bin/env python3
"""fleet-acq-2: malformed-markup fixtures (missions ACQ-2251..ACQ-2300, cases 0-49).
Rule: lenient recovery is allowed but every recovery is flagged; structure is never
guessed beyond what the parser yields; hostile bytes are quarantined, not interpreted."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "malformed")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, html, expect, note, flags=(), raw=False):
    CASES.append({"case": case, "mission_no": 2251 + case, "slug": slug, "bound": "MALFORMED",
                  "html": html, "raw": raw, "expect": expect, "note": note,
                  "expect_flags": list(flags)})

add(0, "unclosed-p", "<p>one<p>two<p>three", "BOUNDED_SUCCESS",
    "unclosed paragraphs: text recovered, soup flagged", flags=["soup_recovered"])
add(1, "unclosed-div", "<div><span>text", "BOUNDED_SUCCESS",
    "unclosed div/span: text kept, structure flagged", flags=["soup_recovered"])
add(2, "mismatched", "<b><i>text</b></i>", "BOUNDED_SUCCESS",
    "mismatched nesting: no structure guess, text kept", flags=["soup_recovered"])
add(3, "stray-lt", "<p>5 < 3 and 10 > 2</p>", "BOUNDED_SUCCESS",
    "stray angle brackets stay literal text", flags=["literal_angle"])
add(4, "stray-lt-gt", "a < b > c", "BOUNDED_SUCCESS",
    "bare text angles literal", flags=["literal_angle"])
add(5, "broken-entity", "<p>&bogus; &; &#; &#xZZ;</p>", "BOUNDED_SUCCESS",
    "broken entities stay literal, never decoded by guess", flags=["entity_literal"])
add(6, "unclosed-comment", "<p>hi</p><!-- never ends <p>secret</p>", "BOUNDED_SUCCESS",
    "unclosed comment swallows rest: flagged, no secret extraction", flags=["comment_unclosed"])
add(7, "comment-dashes", "<!-- a -- b --><p>x</p>", "BOUNDED_SUCCESS",
    "double-dash inside comment flagged", flags=["comment_abuse"])
add(8, "cdata-html", "<p><![CDATA[not xml]]></p>", "BOUNDED_SUCCESS",
    "CDATA in HTML is bogus comment, content not treated as markup", flags=["cdata_bogus"])
add(9, "dup-attrs", '<a href="https://a.example/1" href="https://a.example/2">x</a>', "BOUNDED_SUCCESS",
    "duplicate attrs: both recorded, no winner guessed", flags=["dup_attr"])
add(10, "unquoted-attrs", '<a href=https://a.example/x title=hi>x</a>', "BOUNDED_SUCCESS",
    "unquoted attrs are valid HTML: no recovery needed", flags=[])
add(11, "missing-quote", '<a href="https://a.example/x>x</a><p>after</p>', "BOUNDED_SUCCESS",
    "missing quote swallows rest into attr: nothing extractable, no URL invented", flags=["no_content"])
add(12, "no-value-attr", "<input disabled>", "BOUNDED_SUCCESS",
    "valueless attr recorded as present", flags=[])
add(13, "deep-nesting", "<div>" * 500 + "x" + "</div>" * 500, "BOUNDED_SUCCESS",
    "500-deep nesting capped with flag", flags=["depth_cap"])
add(14, "deep-1000", "<div>" * 1000 + "x", "BOUNDED_SUCCESS",
    "1000-deep unclosed capped", flags=["depth_cap", "soup_recovered"])
add(15, "many-attrs", "<div " + " ".join(f'a{i}="v"' for i in range(300)) + ">x</div>", "BOUNDED_SUCCESS",
    "300 attrs capped", flags=["attr_cap"])
add(16, "huge-attr", '<div title="' + "t" * 200000 + '">x</div>', "BOUNDED_SUCCESS",
    "200KB attr value truncated with flag", flags=["attr_length_cap"])
add(17, "huge-text", "<p>" + "w" * 3000000 + "</p>", "BOUNDED_SUCCESS",
    "3MB text capped", flags=["text_cap"])
add(18, "null-byte", "<p>ab\x00cd</p>", "BOUNDED_SUCCESS",
    "null byte dropped with flag, text continues", flags=["null_byte_dropped"])
add(19, "null-many", "\x00" * 100 + "<p>x</p>", "BOUNDED_SUCCESS",
    "leading null run dropped", flags=["null_byte_dropped"])
add(20, "control-chars", "<p>a\x01b\x02c</p>", "BOUNDED_SUCCESS",
    "control chars dropped, flagged", flags=["control_char_dropped"])
add(21, "bad-nesting-table", "<table><div><tr><td>x</td></tr></div></table>", "BOUNDED_SUCCESS",
    "tag stream is balanced: no restructure guess, no flag", flags=[])
add(22, "li-outside", "<li>orphan</li><p>x</p>", "BOUNDED_SUCCESS",
    "orphan li: balanced stream, kept as-is", flags=[])
add(23, "nested-a", '<a href="https://a.example/1">one<a href="https://a.example/2">two</a></a>', "BOUNDED_SUCCESS",
    "nested anchors: tag stream balanced; both hrefs recorded, no nesting guess", flags=["untrusted_ref"])
add(24, "nested-form", '<form action="/a"><form action="/b"></form></form>', "BOUNDED_SUCCESS",
    "nested forms: balanced stream; both actions recorded as claimed", flags=["form_action_claimed", "no_content"])
add(25, "script-unclosed", "<script>var a=1;<p>text</p>", "BOUNDED_SUCCESS",
    "unclosed script swallows rest as code: nothing extracted beyond", flags=["script_inert", "script_unclosed"])
add(26, "style-unclosed", "<style>.a{color:red}<p>text</p>", "BOUNDED_SUCCESS",
    "unclosed style swallows rest", flags=["style_unclosed"])
add(27, "textarea-raw", "<textarea><p>not markup</p></textarea>", "BOUNDED_SUCCESS",
    "textarea content is raw text", flags=["rawtext_element"])
add(28, "title-raw", "<title><b>not bold</b></title><p>x</p>", "BOUNDED_SUCCESS",
    "title content raw", flags=["rawtext_element"])
add(29, "bogus-tag", "<foo:bar><blah>x</blah>", "BOUNDED_SUCCESS",
    "unknown tags kept, no behavior", flags=["unknown_tag"])
add(30, "processing-instruction", "<?php echo 1; ?><p>x</p>", "BOUNDED_SUCCESS",
    "processing instruction ignored", flags=["pi_ignored"])
add(31, "doctype-weird", "<!DOCTYPE html PUBLIC 'x'><p>x</p>", "BOUNDED_SUCCESS",
    "doctype ignored", flags=["doctype_ignored"])
add(32, "doctype-inside", "<p>x</p><!DOCTYPE html>", "BOUNDED_SUCCESS",
    "misplaced doctype ignored", flags=["doctype_ignored"])
add(33, "html-twice", "<html><body><p>a</p></body></html><html><body><p>b</p></body></html>", "BOUNDED_SUCCESS",
    "double html: balanced stream, both bodies' text kept", flags=[])
add(34, "head-in-body", "<body><head><title>T</title></head><p>x</p></body>", "BOUNDED_SUCCESS",
    "misplaced head: title still captured as rawtext, stream balanced", flags=["rawtext_element"])
add(35, "body-in-head", "<head><body><p>x</p></body></head>", "BOUNDED_SUCCESS",
    "body in head: balanced stream, text kept", flags=[])
add(36, "self-close-div", "<div/>text<p/>more", "BOUNDED_SUCCESS",
    "self-closing syntax on non-void closes immediately per parser; no structure guessed", flags=[])
add(37, "br-no-close", "<p>a<br>b<br>c</p>", "BOUNDED_SUCCESS",
    "void elements fine, no flag needed", flags=[])
add(38, "entity-mixed", "<p>&lt;tag&gt; &amp; &quot;q&quot; &#65;</p>", "BOUNDED_SUCCESS",
    "valid entities decoded normally", flags=[])
add(39, "entity-nonascii", "<p>caf&eacute; na&iuml;ve</p>", "BOUNDED_SUCCESS",
    "named entities decoded", flags=[])
add(40, "attr-entity", '<a title="&lt;hi&gt;" href="https://a.example/">x</a>', "BOUNDED_SUCCESS",
    "attr entities decoded, recorded verbatim-ish", flags=["untrusted_ref"])
add(41, "whitespace-doc", "   \n\t  ", "TYPED_FAILURE:INVALID_PAYLOAD",
    "whitespace-only: INVALID_PAYLOAD", flags=["empty_input"])
add(42, "empty-doc", "", "TYPED_FAILURE:INVALID_PAYLOAD",
    "empty: INVALID_PAYLOAD", flags=["empty_input"])
add(43, "only-comment", "<!-- nothing -->", "BOUNDED_SUCCESS",
    "comment-only: success with zero text, flagged", flags=["no_content"])
add(44, "only-script", "<script>var a=1;</script>", "BOUNDED_SUCCESS",
    "script-only: success, no text, inert", flags=["script_inert", "no_content"])
add(45, "bom-text", "﻿<p>hi</p>", "BOUNDED_SUCCESS",
    "BOM stripped", flags=["bom_stripped"])
add(46, "replacement-char", "<p>caf�</p>", "BOUNDED_SUCCESS",
    "replacement char kept, encoding noted", flags=["encoding_suspect"])
add(47, "mixed-newlines", "<p>a\r\nb\rc</p>", "BOUNDED_SUCCESS",
    "CR/CRLF normalized", flags=["newline_normalized"])
add(48, "tab-in-tag", "<\tp>x</p>", "BOUNDED_SUCCESS",
    "tab before tag name recovered", flags=["soup_recovered"])
add(49, "everything", "<div><p>unclosed <b>bold <i>both <a href=https://a.example/x>link</a> &bogus; \x00 <template><p>t</p></template>",
    "BOUNDED_SUCCESS", "kitchen sink: text out, every recovery flagged, null dropped",
    flags=["soup_recovered", "entity_literal", "null_byte_dropped", "template_inert", "untrusted_ref"])

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.html"
    mode = "w"
    with open(os.path.join(FX, fname), mode, encoding="utf-8", errors="surrogateescape") as f:
        f.write(c["html"])
    manifest.append({k: v for k, v in c.items() if k != "html"})
with open(os.path.join(WORK, "manifest-2251-2300.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
