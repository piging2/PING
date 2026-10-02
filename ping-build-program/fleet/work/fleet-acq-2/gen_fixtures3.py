#!/usr/bin/env python3
"""fleet-acq-2: batch 3 fixtures (missions ACQ-0151..ACQ-0200, case indexes 150-199).
Semantic HTML5 elements, form menagerie, obsolete tags, attr/text provenance edges."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx")
CASES = []

def add(mission_no, case_idx, slug, bound, html, expect, note, **kw):
    d = {"case": case_idx, "mission_no": mission_no, "slug": slug, "bound": bound,
         "html": html, "expect": expect, "note": note}
    d.update(kw)
    CASES.append(d)

H = lambda body: f"<!DOCTYPE html><html><head><title>Fixture</title></head><body>{body}</body></html>"
M = lambda mid: f"ACQ-{mid:04d}"

add(151,150,"duplicate-id","P1", H('<div id="a">1</div>'*2000 + '<div id="a">2</div>'), "BOUNDED_SUCCESS",
    "duplicate ids tolerated; no id-based identity guess", assert_text_contains=["1","2"])
add(152,151,"inline-nesting-5k","P1", H("<b><i>"*2500 + "deep" + "</i></b>"*2500), "BOUNDED_SUCCESS",
    "5k inline nesting parses", assert_text_contains=["deep"])
add(153,152,"wbr-br-runs","EDGE", H("<p>a<wbr>b<br><br><br>c</p>"), "BOUNDED_SUCCESS",
    "wbr/br handled", assert_text_contains=["a","b","c"])
add(154,153,"hr-separators","EDGE", H("<p>one</p><hr><hr><p>two</p>"), "BOUNDED_SUCCESS",
    "hr as separator only", assert_text_contains=["one","two"])
add(155,154,"pre-whitespace","P2", H("<pre>  indented\n\ttabbed  </pre>"), "BOUNDED_SUCCESS",
    "pre whitespace preserved in extraction", assert_text_contains=["indented"])
add(156,155,"code-kbd-sample","EDGE", H("<code>npm i x</code><kbd>Ctrl+C</kbd><samp>out</samp>"), "BOUNDED_SUCCESS",
    "code-family elements as text", assert_text_contains=["npm i x"])
add(157,156,"blockquote-cite","EDGE", H('<blockquote cite="https://s.example/q"><p>quoted words</p></blockquote>'), "BOUNDED_SUCCESS",
    "cite URL recorded as untrusted ref, not fetched", assert_text_contains=["quoted words"])
add(158,157,"figure-figcaption","EDGE", H("<figure><img alt='shop front'><figcaption>Our storefront</figcaption></figure>"), "BOUNDED_SUCCESS",
    "figcaption text kept", assert_text_contains=["Our storefront","shop front"])
add(159,158,"picture-srcset","EDGE", H('<picture><source srcset="https://c.example/a.webp 1x, https://c.example/b.webp 2x"><img src="https://c.example/a.jpg" alt="pic"></picture>'), "BOUNDED_SUCCESS",
    "srcset recorded as untrusted ref list, never fetched", assert_text_contains=["pic"])
add(160,159,"video-audio-refs","EDGE", H('<video src="https://c.example/v.mp4"></video><audio><source src="https://c.example/a.mp3"></audio><p>v</p>'), "BOUNDED_SUCCESS",
    "media refs recorded, not fetched", assert_text_contains=["v"])
add(161,160,"track-element","EDGE", H('<video><track kind="captions" src="https://c.example/c.vtt"></video>'), "BOUNDED_SUCCESS",
    "track src recorded as ref")
add(162,161,"canvas-fallback","EDGE", H("<canvas>fallback chart text</canvas>"), "BOUNDED_SUCCESS",
    "canvas fallback text extracted", assert_text_contains=["fallback chart text"])
add(163,162,"map-area","EDGE", H('<map name="m"><area shape="rect" coords="0,0,10,10" href="/z" alt="zone"></map>'), "BOUNDED_SUCCESS",
    "area href recorded as link with alt", assert_text_contains=["zone"])
add(164,163,"meter-progress","EDGE", H('<meter value="0.8">80%</meter><progress value="50" max="100">half</progress>'), "BOUNDED_SUCCESS",
    "meter/progress values are presentation, not promoted facts", assert_text_contains=["80%","half"])
add(165,164,"time-datetime","CONFLICT", H('<time datetime="2026-13-45">someday</time><p>Open <time datetime="2026-09-23">today</time></p>'), "BOUNDED_SUCCESS",
    "invalid datetime recorded verbatim with invalid_datetime flag; never normalized by guess")
add(166,165,"data-attrs-5k","P5", H('<div ' + " ".join(f'data-k{i}="v{i}"' for i in range(5000)) + '>d</div>'), "BOUNDED_SUCCESS",
    "5k data-* attrs: attr-count cap noted, text kept", assert_text_contains=[">d<".replace(">","").replace("<","")])
add(167,166,"aria-attrs","EDGE", H('<button aria-label="Close dialog" aria-hidden="false">x</button>'), "BOUNDED_SUCCESS",
    "aria attrs are hints, not claims", assert_text_contains=["x"])
add(168,167,"contenteditable","EDGE", H('<div contenteditable="true">user draft text</div>'), "BOUNDED_SUCCESS",
    "contenteditable region extracted, flagged user-editable (untrusted tier)", assert_text_contains=["user draft text"])
add(169,168,"translate-no","EDGE", H('<p translate="no">BrandName\u2122 stays</p>'), "BOUNDED_SUCCESS",
    "translate=no honored as signal; text still extracted")
add(170,169,"dir-rtl","EDGE", H('<p dir="rtl">\u0627\u0644\u0633\u0644\u0627\u0645 text</p>'), "BOUNDED_SUCCESS",
    "rtl paragraph extracted with dir provenance")
add(171,170,"lang-mix","EDGE", H('<p lang="en">Hello</p><p lang="es">Hola</p>'), "BOUNDED_SUCCESS",
    "lang attrs recorded per-span; no language guess beyond declared", assert_text_contains=["Hello","Hola"])
add(172,171,"hidden-attr","EDGE", H('<div hidden>secret menu draft</div><p>public</p>'), "BOUNDED_SUCCESS",
    "hidden element extracted BUT flagged hidden_attr (never present as visible content)", assert_text_contains=["secret menu draft","public"])
add(173,172,"inert-attr","EDGE", H('<div inert>inactive region</div>'), "BOUNDED_SUCCESS",
    "inert region extracted with inert flag")
add(174,173,"input-menagerie","EDGE", H('<input type="date" value="2026-01-01"><input type="color" value="#ff0000"><input type="range" value="7"><p>i</p>'), "BOUNDED_SUCCESS",
    "input values are user state, never business facts", assert_not_in_text=["#ff0000"])
add(175,174,"datalist","EDGE", H('<input list="dl"><datalist id="dl"><option>suggest1</option></datalist>'), "BOUNDED_SUCCESS",
    "datalist suggestions recorded as suggestions, not facts")
add(176,175,"fieldset-legend","EDGE", H("<fieldset><legend>Contact info</legend><p>fl</p></fieldset>"), "BOUNDED_SUCCESS",
    "legend text kept", assert_text_contains=["Contact info"])
add(177,176,"textarea-content","EDGE", H("<textarea>user typed draft (555) 999-7777</textarea><p>t</p>"), "BOUNDED_SUCCESS",
    "textarea is user content: extracted, flagged user-content, phone NOT a business fact",
    assert_text_contains=["user typed draft"])
add(178,177,"obsolete-applet","EDGE", H('<applet code="x.class">old</applet><p>new</p>'), "BOUNDED_SUCCESS",
    "obsolete applet dropped", assert_text_contains=["new"])
add(179,178,"obsolete-bgsound","EDGE", H('<bgsound src="https://c.example/s.mid"><p>snd</p>'), "BOUNDED_SUCCESS",
    "obsolete bgsound dropped", assert_text_contains=["snd"])
add(180,179,"comment-phone","P7", H("<!-- internal note: old line (555) 999-8888 --><p>Call (555) 111-2222</p>"), "BOUNDED_SUCCESS",
    "comment phone never leaks into facts", assert_not_in_text=["999-8888"], assert_phones_eq=["(555) 111-2222"])
add(181,180,"phone-title-vs-body","CONFLICT", "<head><title>(555) 000-1111 - Shop</title></head><body><p>Call (555) 111-2222</p></body>", "BOUNDED_SUCCESS",
    "title phone vs body phone: separate provenance, no canonical pick",
    assert_phones_eq=["(555) 111-2222"])
add(182,181,"img-alt-phone","EDGE", H('<img src="x.jpg" alt="Call (555) 222-0000 today"><p>body</p>'), "BOUNDED_SUCCESS",
    "alt text extracted with provenance=alt; phone from alt kept as alt-sourced observation",
    assert_phones_eq=["(555) 222-0000"])
add(183,182,"title-attr-tooltip","EDGE", H('<span title="tooltip secret (555) 999-1111">hover me</span>'), "BOUNDED_SUCCESS",
    "title-attr tooltip recorded as attr metadata, NOT body text", assert_not_in_text=["tooltip secret"])
add(184,183,"meta-desc-conflict","P5", "<head>" + '<meta name="description" content="Desc A"><meta property="og:description" content="Desc B">' + "</head><body><p>m</p></body>", "BOUNDED_SUCCESS",
    "description variants kept separate, no merge")
add(185,184,"twitter-cards","P5", "<head>" + '<meta name="twitter:title" content="T Title"><meta name="twitter:card" content="summary">' + "</head><body><p>tc</p></body>", "BOUNDED_SUCCESS",
    "twitter card tags capped under P5")
add(186,185,"jsonld-id-selfref","P4", H('<script type="application/ld+json">{"@id":"https://s.example/#biz","@type":"LocalBusiness","parentOrganization":{"@id":"https://s.example/#biz"}}</script>'), "BOUNDED_SUCCESS",
    "self-referential @id recorded verbatim; no graph-cycle resolution attempted")
add(187,186,"jsonld-html-in-string","P4", H('<script type="application/ld+json">{"@type":"LocalBusiness","description":"great <b>bold</b> service"}</script><p>after</p>'), "BOUNDED_SUCCESS",
    "HTML inside JSON-LD string stays string data; block ok, body extracted", assert_text_contains=["after"])
add(188,187,"jsonld-60-graph-items","P4", H('<script type="application/ld+json">{"@graph":[' + ",".join('{"@type":"Thing","n":%d}' % i for i in range(60)) + "]}</script>"), "BOUNDED_SUCCESS",
    "60 @graph items: block within caps; item count noted (no per-item semantic fan-out)")
add(189,188,"jsonld-two-phones","CONFLICT", H('<script type="application/ld+json">{"@type":"LocalBusiness","telephone":"(555) 000-2222"}</script><script type="application/ld+json">{"@type":"LocalBusiness","telephone":"(555) 000-3333"}</script>'), "BOUNDED_SUCCESS",
    "two JSON-LD blocks, two phones: separate observations, conflict flagged, no pick", assert_jsonld_n=2)
add(190,189,"jsonld-bad-context","P4", H('<script type="application/ld+json">{"@context":"https://evil.example/schema","@type":"Thing"}</script>'), "BOUNDED_SUCCESS",
    "@context URL recorded, never fetched")
add(191,190,"link-alternate-rss","P5", '<head><link rel="alternate" type="application/rss+xml" href="https://s.example/feed.xml"></head><body><p>rss</p></body>', "BOUNDED_SUCCESS",
    "feed link recorded as ref for feed-family acquisition, not fetched here")
add(192,191,"html-in-html","MALFORMED", H("<div><html><body>nested doc</body></html></div>"), "BOUNDED_SUCCESS",
    "nested html/body tags recovered", assert_text_contains=["nested doc"])
add(193,192,"select-optgroup","EDGE", H("<select><optgroup label='g'><option>o1</option></optgroup></select>"), "BOUNDED_SUCCESS",
    "optgroup parsed", assert_text_contains=["o1"])
add(194,193,"output-element","EDGE", H("<form oninput='x'><output name='r'>result 42</output></form>"), "BOUNDED_SUCCESS",
    "output element text kept; computed value flagged derived-not-fact", assert_text_contains=["result 42"])
add(195,194,"keygen-obsolete","EDGE", H("<keygen><p>kg</p>"), "BOUNDED_SUCCESS",
    "obsolete keygen dropped", assert_text_contains=["kg"])
add(196,195,"isindex-obsolete","EDGE", H("<isindex prompt='search'><p>ii</p>"), "BOUNDED_SUCCESS",
    "obsolete isindex dropped", assert_text_contains=["ii"])
add(197,196,"details-name","EDGE", H('<details name="grp"><summary>a</summary></details><details name="grp"><summary>b</summary></details>'), "BOUNDED_SUCCESS",
    "details name grouping recorded")
add(198,197,"slot-shadow","EDGE", H("<my-el><span slot='s'>slotted</span></my-el><template><span>tmpl</span></template>"), "BOUNDED_SUCCESS",
    "slot/shadow content: light-DOM text kept; template stays inert", assert_text_contains=["slotted"], assert_not_in_text=["tmpl"])
add(199,198,"svg-title-desc","EDGE", '<svg><title>chart title</title><desc>chart description</desc></svg><p>sv</p>', "BOUNDED_SUCCESS",
    "svg title/desc extracted with svg provenance", assert_text_contains=["chart title","sv"])
add(200,199,"math-annotation","EDGE", "<math><semantics><mi>x</mi><annotation encoding='text'>spoken x</annotation></semantics></math>", "BOUNDED_SUCCESS",
    "math annotation text kept with foreign provenance", assert_text_contains=["spoken x"])

manifest = []
for c in CASES:
    mid = M(c["mission_no"])
    fname = f"{mid}-{c['slug']}.html"
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(c["html"])
    manifest.append({k: v for k, v in c.items() if k not in ("html",)})
with open(os.path.join(WORK, "manifest-0151-0200.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
