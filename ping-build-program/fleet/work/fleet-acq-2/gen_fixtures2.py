#!/usr/bin/env python3
"""fleet-acq-2: batch 2 fixtures (missions ACQ-0101..ACQ-0150, case indexes 100-149).
Second 50 html-hardening cases: foreign content, forms, unicode spoofing, tag-soup edges."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(mission_no, case_idx, slug, bound, html, expect, note, **kw):
    d = {"case": case_idx, "mission_no": mission_no, "slug": slug, "bound": bound,
         "html": html, "expect": expect, "note": note}
    d.update(kw)
    CASES.append(d)

H = lambda body: f"<!DOCTYPE html><html><head><title>Fixture</title></head><body>{body}</body></html>"
M = lambda mid: f"ACQ-{mid:04d}"

# P1 node-cap family, structural variety
add(101,100,"nested-tables-50","P1", H("<table>"*50 + "<tr><td>deep</td></tr>" + "</table>"*50), "BOUNDED_SUCCESS",
    "50-deep table nesting parses; depth recorded", assert_text_contains=["deep"])
add(102,101,"div-soup-300k","P1", H("<div>" + "<div>v</div>"*300000 + "</div>"), "TYPED_FAILURE:INVALID_PAYLOAD",
    "600k+ nodes exceed 200k cap -> abort with node count")
add(103,102,"option-bomb","P1", H('<select>' + "".join(f"<option>v{i}</option>" for i in range(60000)) + "</select>"), "BOUNDED_SUCCESS",
    "60k options under node cap; parsed, count recorded")
add(104,103,"legacy-presentational","P1", H("<marquee>scroll</marquee><blink>flash</blink><font size=7>big</font>"), "BOUNDED_SUCCESS",
    "legacy tags treated as inline text carriers", assert_text_contains=["scroll","flash","big"])
add(105,104,"ruby-nested","P1", H("<ruby>" + "<rb>a</rb><rt>b</rt>"*5000 + "</ruby>"), "BOUNDED_SUCCESS",
    "ruby annotations parsed, text kept")
add(106,105,"details-10k","P1", H("".join(f"<details><summary>s{i}</summary><p>d{i}</p></details>" for i in range(10000))), "BOUNDED_SUCCESS",
    "10k details/summary blocks parsed")
# inert / fallback content
add(107,106,"template-inert","P7", H("<template><p>template phone (555) 999-0000</p></template><p>real (555) 111-2222</p>"), "BOUNDED_SUCCESS",
    "template content is inert: must not enter extracted text",
    assert_not_in_text=["999-0000"], assert_phones_eq=["(555) 111-2222"])
add(108,107,"dialog-open","EDGE", H("<dialog open>dialog text</dialog><p>after</p>"), "BOUNDED_SUCCESS",
    "dialog text extracted with provenance", assert_text_contains=["dialog text"])
add(109,108,"noscript-fallback","EDGE", H("<noscript>JS disabled message</noscript><p>main</p>"), "BOUNDED_SUCCESS",
    "noscript content extracted, flagged noscript-source (no JS ran)", assert_text_contains=["JS disabled message"])
add(110,109,"iframe-fallback-text","EDGE", H('<iframe src="https://ads.example/x">fallback ad text</iframe><p>page</p>'), "BOUNDED_SUCCESS",
    "iframe inner fallback text only; src NOT fetched, recorded as untrusted ref", assert_text_contains=["fallback ad text"])
add(111,110,"object-embed-dropped","EDGE", H('<object data="https://x.example/m.swf"><param name="a" value="b"></object><p>ok</p>'), "BOUNDED_SUCCESS",
    "object/embed params never become facts", assert_text_contains=["ok"])
# microdata / rdfa: no semantic promotion
add(112,111,"microdata-itemscope","META", H('<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="telephone">(555) 222-3333</span></div>'), "BOUNDED_SUCCESS",
    "microdata stays plain text; telephone NOT promoted to canonical fact without JSON-LD/verification",
    assert_phones_eq=["(555) 222-3333"])
add(113,112,"rdfa-prefix","META", H('<div vocab="https://schema.org/" typeof="LocalBusiness"><span property="name">Acme</span></div>'), "BOUNDED_SUCCESS",
    "RDFa attrs dropped from claim set; text kept", assert_text_contains=["Acme"])
# JSON-LD semantic traps
add(114,113,"jsonld-graph-3biz","P4", H('<script type="application/ld+json">{"@graph":[{"@type":"LocalBusiness","name":"A"},{"@type":"LocalBusiness","name":"B"},{"@type":"LocalBusiness","name":"C"}]}</script>'), "BOUNDED_SUCCESS",
    "@graph 3 businesses -> 3 separate observations, no canonical pick", assert_jsonld_n=1)
add(115,114,"jsonld-type-confusion","P4", H('<script type="application/ld+json">{"@type":"Person","name":"Acme Plumbing LLC"}</script>'), "BOUNDED_SUCCESS",
    "type/name mismatch recorded verbatim, never reconciled by guess")
add(116,115,"jsonld-sameas","P4", H('<script type="application/ld+json">{"@type":"LocalBusiness","sameAs":["https://evil.example/p"]}</script>'), "BOUNDED_SUCCESS",
    "sameAs recorded as untrusted refs, never fetched")
add(117,116,"script-json-not-ld","P7", H('<script type="application/json">{"config":{"apiKey":"SECRET-123"}}</script><p>visible</p>'), "BOUNDED_SUCCESS",
    "non-ld+json script config dropped per P7; secret-shaped blob never in facts",
    assert_not_in_text=["SECRET-123"], assert_text_contains=["visible"])
# meta / head signals
add(118,117,"meta-og-vs-title","P5", "<head><title>Body Title Shop</title>" + '<meta property="og:title" content="OG Title Shop">' + "</head><body><p>x</p></body>", "BOUNDED_SUCCESS",
    "og:title vs <title> conflict -> separate provenance records, no merge")
add(119,118,"meta-keywords-stuff","P5", "<head>" + '<meta name="keywords" content="' + ("kw,"*3000) + '">' + "</head><body><p>y</p></body>", "BOUNDED_SUCCESS",
    "oversize keywords truncated per meta value cap")
add(120,119,"link-canonical","P5", '<head><link rel="canonical" href="https://shop.example/canonical"></head><body><p>z</p></body>', "BOUNDED_SUCCESS",
    "canonical recorded as signal, not authority")
add(121,120,"meta-refresh-30s","P5", '<head><meta http-equiv="refresh" content="30;url=https://shop.example/new"></head><body><p>w</p></body>', "BOUNDED_SUCCESS",
    "delayed refresh recorded, not followed")
add(122,121,"base-hijack","XSS", '<head><base href="http://evil.example/"></head><body><a href="/about">about</a><p>q</p></body>', "BOUNDED_SUCCESS",
    "base href recorded as untrusted; relative links flagged base-relative, quarantined from canonical URL set")
# forms
add(123,122,"form-get-benign","EDGE", H('<form action="/search" method="get"><input name="q"><button>Go</button></form>'), "BOUNDED_SUCCESS",
    "benign form recorded as present, never submitted")
add(124,123,"input-hidden-csrf","EDGE", H('<form><input type="hidden" name="csrf" value="tok123"></form><p>f</p>'), "BOUNDED_SUCCESS",
    "hidden inputs never become facts", assert_not_in_text=["tok123"])
add(125,124,"button-formaction-js","XSS", H('<form action="/ok"><button formaction="javascript:evil()">x</button></form>'), "BOUNDED_SUCCESS",
    "javascript: formaction neutralized")
add(126,125,"honeypot-field","EDGE", H('<form><input name="email_confirm" style="display:none"><input name="email"></form>'), "BOUNDED_SUCCESS",
    "honeypot field recorded as bot-trap signal, not a real field")
# unicode spoofing / normalization
add(127,126,"homograph-link","XSS", H('<a href="https://\u0440\u0430\u0443\u0440\u0430l.com/">\u0440\u0430\u0443\u0440\u0430l bank login</a>'), "BOUNDED_SUCCESS",
    "cyrillic homograph in link recorded verbatim with confusable flag; no punycode guess into fact")
add(128,127,"invisible-white-text","EDGE", H('<span style="color:#fff">hidden offer</span><p>visible</p>'), "BOUNDED_SUCCESS",
    "style-visibility unknown without render: text extracted, marked visibility_unverified (never claim 'hidden')",
    assert_text_contains=["hidden offer","visible"])
add(129,128,"zero-width-phone","EDGE", H("<p>Call (5\u200b55) 111-2222</p>"), "BOUNDED_SUCCESS",
    "zero-width chars stripped in normalization; digits preserved", assert_text_contains=["(555) 111-2222"])
add(130,129,"soft-hyphen","EDGE", H("<p>plum\u00adber ser\u00advice</p>"), "BOUNDED_SUCCESS",
    "soft hyphens removed in normalized text", assert_text_contains=["plumber"])
add(131,130,"fullwidth-chars","EDGE", H("<p>\uff30\uff29\uff2e\uff27 deals</p>"), "BOUNDED_SUCCESS",
    "fullwidth kept verbatim with script-mix flag; no transliteration guess")
add(132,131,"emoji-text","EDGE", H("<p>Best \U0001f527 plumber \U0001f602</p>"), "BOUNDED_SUCCESS",
    "emoji preserved in text", assert_text_contains=["plumber"])
# foreign elements / custom tags
add(133,132,"mathml-isolated","P1", "<math xmlns='http://www.w3.org/1998/Math/MathML'><mi>x</mi></math><p>t</p>", "BOUNDED_SUCCESS",
    "MathML isolated as foreign content")
add(134,133,"custom-elements","EDGE", H("<my-widget data-v='1'>widget text</my-widget><p>u</p>"), "BOUNDED_SUCCESS",
    "unknown custom element: text kept, tag not interpreted", assert_text_contains=["widget text"])
# tag-soup edges
add(135,134,"unquoted-attrs","MALFORMED", H("<div class=foo id=bar data-x=baz>q</div>"), "BOUNDED_SUCCESS",
    "unquoted attrs parsed per HTML rules", assert_text_contains=["q"])
add(136,135,"duplicate-attrs","MALFORMED", H('<a href="/first" href="/second">d</a>'), "BOUNDED_SUCCESS",
    "duplicate attr: first wins, dup recorded (no silent pick of second)")
add(137,136,"attr-no-value","MALFORMED", H("<input disabled required><p>e</p>"), "BOUNDED_SUCCESS",
    "valueless attrs fine")
add(138,137,"comment-inside-tag","MALFORMED", H('<div <!-- weird --> class="x">cmt</div>'), "BOUNDED_SUCCESS",
    "comment inside tag recovered", assert_text_contains=["cmt"])
add(139,138,"bogus-tag-names","MALFORMED", H("<123>no</123><foo!>bar</foo!><p>real</p>"), "BOUNDED_SUCCESS",
    "bogus tags dropped, inner text kept", assert_text_contains=["real"])
add(140,139,"cdata-in-html","MALFORMED", H("<p>a</p><![CDATA[raw <b>not bold</b>]]><p>b</p>"), "BOUNDED_SUCCESS",
    "CDATA section in HTML treated as bogus comment, dropped", assert_text_contains=["a"])
add(141,140,"conditional-comment","MALFORMED", H("<!--[if IE 9]><p>ie only</p><![endif]--><p>all</p>"), "BOUNDED_SUCCESS",
    "conditional comment content extracted with provenance conditional-comment (condition not evaluated)")
add(142,141,"xmp-literal","MALFORMED", H("<xmp><b>not bold</b></xmp><p>after</p>"), "BOUNDED_SUCCESS",
    "xmp raw-text: markup inside kept literal-ish; 'after' extracted", assert_text_contains=["after"])
add(143,142,"plaintext-element","MALFORMED", H("<p>before</p><plaintext><b>raw tail"), "BOUNDED_SUCCESS",
    "plaintext swallows rest as literal; no tag interpretation after")
add(144,143,"nested-forms","MALFORMED", H("<form id=a><form id=b><input></form></form>"), "BOUNDED_SUCCESS",
    "nested form dropped per spec; recorded")
add(145,144,"table-misnesting","MALFORMED", H("<table><div><tr><td>cell</td></tr></div></table>"), "BOUNDED_SUCCESS",
    "misnested table recovered (foster parenting); text kept", assert_text_contains=["cell"])
add(146,145,"li-stray","MALFORMED", H("<li>stray one</li><p>p</p>"), "BOUNDED_SUCCESS",
    "stray li text kept", assert_text_contains=["stray one"])
add(147,146,"heading-skip","EDGE", H("<h1>Title</h1><h4>Deep</h4>"), "BOUNDED_SUCCESS",
    "heading levels recorded as-is; no inference of missing h2/h3", assert_text_contains=["Title","Deep"])
add(148,147,"address-element","CONFLICT", H("<address>Contact: 789 Pine Rd, Springfield</address><p>We are at 789 Pine Rd</p>"), "BOUNDED_SUCCESS",
    "<address> contact block extracted as text only, NOT promoted to canonical address")
add(149,148,"doctype-public","EDGE", '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN"><p>old</p>', "BOUNDED_SUCCESS",
    "legacy doctype tolerated", assert_text_contains=["old"])
add(150,149,"svg-foreignobject-text","XSS", '<svg><foreignObject><p xmlns="http://www.w3.org/1999/xhtml">fo text</p><script>bad()</script></foreignObject></svg><p>out</p>', "BOUNDED_SUCCESS",
    "foreignObject HTML parsed but script inside stripped per P7", assert_text_contains=["fo text","out"], assert_not_in_text=["bad()"])

manifest = []
for c in CASES:
    mid = M(c["mission_no"])
    fname = f"{mid}-{c['slug']}.html"
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(c["html"])
    manifest.append({k: v for k, v in c.items() if k not in ("html",)})
with open(os.path.join(WORK, "manifest-0101-0150.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
