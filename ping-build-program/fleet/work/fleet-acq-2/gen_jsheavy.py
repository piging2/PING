#!/usr/bin/env python3
"""fleet-acq-2: js-heavy fixtures (missions ACQ-2151..ACQ-2200, js-heavy cases 0-49).
Rule: script content is inert; URLs inside JS are never harvested; noscript is the
only legitimate fallback; JSON data blocks are data, everything else is code."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "jsheavy")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, html, expect, note, flags=()):
    CASES.append({"case": case, "mission_no": 2151 + case, "slug": slug, "bound": "JSHEAVY",
                  "html": html, "expect": expect, "note": note, "expect_flags": list(flags)})

B = lambda body, head="": f"<!doctype html><html><head>{head}</head><body>{body}</body></html>"
S = lambda code, attrs="": f"<script{attrs}>{code}</script>"

add(0, "noscript-fallback", B("<div id=app></div>" + S("render()") + "<noscript><p>Static menu: coffee, tea</p></noscript>"),
    "BOUNDED_SUCCESS", "noscript text extracted with provenance; script inert, src-less inline flagged",
    flags=["script_inert", "noscript_provenance"])
add(1, "inline-ignored", B("<p>Hello</p>" + S("var x=1;document.title='Hacked';")),
    "BOUNDED_SUCCESS", "inline JS never executes; static text kept; title from JS never adopted",
    flags=["script_inert"])
add(2, "json-data-block", B("<p>x</p>", '<script type="application/json" id="d">{"price": 9}</script>'),
    "BOUNDED_SUCCESS", "typed JSON data block parsed as data, bounded", flags=["json_data_block"])
add(3, "ldjson-data-block", B("<p>x</p>", '<script type="application/ld+json">{"@type":"Thing"}</script>'),
    "BOUNDED_SUCCESS", "ld+json data block parsed as data", flags=["json_data_block"])
add(4, "unknown-script-type", B("<p>x</p>", '<script type="text/babel">const a = <div/>;</script>'),
    "BOUNDED_SUCCESS", "unknown script type: fully inert", flags=["script_inert"])
add(5, "module-src", B("<p>x</p>", '<script type="module" src="https://cdn.example/app.js"></script>'),
    "BOUNDED_SUCCESS", "module src recorded as untrusted ref, never fetched", flags=["script_src_unfetched"])
add(6, "document-write", B("<p>x</p>" + S("document.write('<p>Injected</p>')")),
    "BOUNDED_SUCCESS", "document.write flagged; injected markup never materialized", flags=["script_inert", "dom_mutation_guess"])
add(7, "innerhtml", B("<div id=a></div>" + S("a.innerHTML='<img src=\"https://a.example/tracker.gif\">'")),
    "BOUNDED_SUCCESS", "innerHTML assignment inert; no URL harvested from JS string", flags=["script_inert", "no_url_harvest_from_js"])
add(8, "eval", B("<p>x</p>" + S("eval('alert(1)')")),
    "BOUNDED_SUCCESS", "eval inert", flags=["script_inert"])
add(9, "obfuscated", B("<p>x</p>" + S("var _0x1=['\\x68\\x69'];console.log(_0x1[0]);")),
    "BOUNDED_SUCCESS", "obfuscated JS: no deobfuscation guess", flags=["script_inert"])
add(10, "template-literal", B("<p>x</p>" + S("el.innerHTML=`<p>${userInput}</p>`;")),
    "BOUNDED_SUCCESS", "template literal HTML never rendered", flags=["script_inert", "dom_mutation_guess"])
add(11, "js-comment-facts", B("<p>Real text</p>" + S("// price is $5\n// open 24 hours")),
    "BOUNDED_SUCCESS", "JS comments never become extracted facts", flags=["script_inert"])
add(12, "onclick", B('<button onclick="steal()">Click</button>'),
    "BOUNDED_SUCCESS", "event handler attrs inert", flags=["event_handler_inert"])
add(13, "js-href", B('<a href="javascript:evil()">x</a>'),
    "BOUNDED_SUCCESS", "javascript: href dropped", flags=["scheme_dropped"])
add(14, "data-script-src", B("<p>x</p>", '<script src="data:text/javascript,alert(1)"></script>'),
    "BOUNDED_SUCCESS", "data: script src dropped", flags=["scheme_dropped"])
add(15, "relative-script-src", B("<p>x</p>", '<script src="/static/app.js"></script>'),
    "BOUNDED_SUCCESS", "relative script src: unresolved_ref, never resolved by guess", flags=["unresolved_ref"])
add(16, "noscript-links", B(S("render()") + '<noscript><a href="https://a.example/menu">Menu</a></noscript>'),
    "BOUNDED_SUCCESS", "noscript links extracted with provenance", flags=["noscript_provenance", "untrusted_ref"])
add(17, "noscript-hostile", B('<noscript><a href="javascript:x()">x</a></noscript>'),
    "BOUNDED_SUCCESS", "noscript still goes through link hygiene", flags=["noscript_provenance", "scheme_dropped"])
add(18, "lazy-datasrc", B('<img data-src="https://a.example/hi.jpg" src="blank.gif">'),
    "BOUNDED_SUCCESS", "data-src recorded as lazy_ref (claimed, not loaded)", flags=["lazy_ref"])
add(19, "json-malformed", B("<p>Visible</p>", '<script type="application/json">{bad json</script>'),
    "BOUNDED_SUCCESS", "malformed JSON block: typed block failure; page text still extracted",
    flags=["json_block_failure"])
add(20, "json-huge", B("<p>x</p>", '<script type="application/json">' + '{"k":"' + "v"*300000 + '"}' + "</script>"),
    "BOUNDED_SUCCESS", "300KB JSON block capped with flag", flags=["json_data_block", "json_cap"])
add(21, "script-localhost", B("<p>x</p>", '<script src="http://localhost:3000/a.js"></script>'),
    "BOUNDED_SUCCESS", "localhost script src flagged, unfetched", flags=["script_src_unfetched", "ssrf_suspect"])
add(22, "many-scripts", B("<p>x</p>") + "".join(f'<script src="https://c.example/{i}.js"></script>' for i in range(5)),
    "BOUNDED_SUCCESS", "all script srcs recorded, none fetched", flags=["script_src_unfetched"])
add(23, "defer-async", B("<p>x</p>", '<script defer async src="https://c.example/a.js" nonce="abc123"></script>'),
    "BOUNDED_SUCCESS", "defer/async/nonce recorded verbatim as opaque attrs", flags=["script_src_unfetched"])
add(24, "importmap", B("<p>x</p>", '<script type="importmap">{"imports":{"a":"https://c.example/a.js"}}</script>'),
    "BOUNDED_SUCCESS", "importmap inert; URLs inside JS not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(25, "jsonp", B("<p>x</p>" + S('cb123({"a":1})', ' src="https://c.example/j?cb=cb123"')),
    "BOUNDED_SUCCESS", "JSONP: code, not data", flags=["script_inert", "script_src_unfetched"])
add(26, "template-el", B("<template><p>shadow</p></template><p>light</p>"),
    "BOUNDED_SUCCESS", "template content inert (regression: no leak)", flags=["template_inert"])
add(27, "custom-elements", B("<my-widget><p>x</p></my-widget>"),
    "BOUNDED_SUCCESS", "custom elements: tags recorded, no behavior guess", flags=["custom_element_inert"])
add(28, "fetch-url", B("<p>x</p>" + S("fetch('https://api.example/secret').then(r=>r.json())")),
    "BOUNDED_SUCCESS", "fetch URL inside JS never harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(29, "xhr-relative", B("<p>x</p>" + S("var x=new XMLHttpRequest();x.open('GET','/api/v1');")),
    "BOUNDED_SUCCESS", "XHR endpoint not a URL claim", flags=["script_inert", "no_url_harvest_from_js"])
add(30, "websocket", B("<p>x</p>" + S("new WebSocket('wss://sock.example/ch')")),
    "BOUNDED_SUCCESS", "websocket URL not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(31, "js-string-url", B("<p>x</p>" + S("var u=\"https://a.example/from-js-string\";")),
    "BOUNDED_SUCCESS", "string-literal URL never becomes a link observation", flags=["script_inert", "no_url_harvest_from_js"])
add(32, "b64-blob", B("<p>x</p>" + S("var b='aGVsbG8=';")),
    "BOUNDED_SUCCESS", "base64 blob inert", flags=["script_inert"])
add(33, "sourcemap", B("<p>x</p>" + S("var a=1;\n//# sourceMappingURL=/maps/a.js.map")),
    "BOUNDED_SUCCESS", "sourcemap comment recorded, not fetched", flags=["script_inert"])
add(34, "integrity", B("<p>x</p>", '<script src="https://c.example/a.js" integrity="sha384-xyz"></script>'),
    "BOUNDED_SUCCESS", "integrity hash recorded verbatim", flags=["script_src_unfetched"])
add(35, "csp-meta", B("<p>x</p>", '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">'),
    "BOUNDED_SUCCESS", "CSP recorded as policy signal", flags=["policy_signal"])
add(36, "js-redirect", B("<p>x</p>" + S("window.location='https://evil.example/phish';")),
    "BOUNDED_SUCCESS", "JS redirect: claimed intent only, never followed", flags=["script_inert", "js_redirect_claimed"])
add(37, "pushstate", B("<p>x</p>" + S("history.pushState({},'','/new-url')")),
    "BOUNDED_SUCCESS", "pushState URL not adopted", flags=["script_inert"])
add(38, "title-in-js", B("<p>x</p>", "<title>Static</title>") + S("document.title='JS Title';"),
    "BOUNDED_SUCCESS", "static title wins; JS title never adopted", flags=["script_inert"])
add(39, "meta-in-js", B("<p>x</p>") + S("var m=document.createElement('meta');m.name='x';"),
    "BOUNDED_SUCCESS", "JS-created meta never adopted", flags=["script_inert", "dom_mutation_guess"])
add(40, "canvas", B("<canvas id=c></canvas>" + S("c.getContext('2d').fillText('hi',0,0);")),
    "BOUNDED_SUCCESS", "canvas content unrendered, recorded as such", flags=["script_inert", "unrendered_surface"])
add(41, "iframe-src", B('<iframe src="https://embed.example/v/1"></iframe>'),
    "BOUNDED_SUCCESS", "iframe src recorded unfetched", flags=["iframe_unfetched"])
add(42, "iframe-srcdoc", B('<iframe srcdoc="<p>inner</p>"></iframe>'),
    "BOUNDED_SUCCESS", "srcdoc inert", flags=["iframe_srcdoc_inert"])
add(43, "video-source", B('<video><source src="https://v.example/a.mp4"></video>'),
    "BOUNDED_SUCCESS", "video source recorded unfetched", flags=["media_unfetched"])
add(44, "ldjson-in-string", B("<p>x</p>" + S("var s='{\"@type\":\"Thing\"}';")),
    "BOUNDED_SUCCESS", "JSON-looking string inside code is not a data block", flags=["script_inert"])
add(45, "dup-noscript", B(S("a()") + "<noscript><p>A</p></noscript>" + S("b()") + "<noscript><p>B</p></noscript>"),
    "BOUNDED_SUCCESS", "all noscript blocks extracted with provenance", flags=["script_inert", "noscript_provenance"])
add(46, "empty-script", B("<p>x</p><script></script>"),
    "BOUNDED_SUCCESS", "empty script harmless", flags=[])
add(47, "syntax-error", B("<p>x</p>" + S("function broken( { ;;")),
    "BOUNDED_SUCCESS", "broken JS still inert, text intact", flags=["script_inert"])
add(48, "comment-cdata", B("<p>x</p>" + S("<!-- var old=1; //-->")),
    "BOUNDED_SUCCESS", "legacy comment-wrapped script inert", flags=["script_inert"])
add(49, "all-together", B("<title>T</title><p>Body</p>" + S("renderApp();") +
    '<noscript><p>Fallback</p><a href="https://a.example/f">F</a></noscript>',
    '<script type="application/json">{"k":1}</script>'),
    "BOUNDED_SUCCESS", "combined: inert code, noscript fallback, one JSON data block",
    flags=["script_inert", "noscript_provenance", "json_data_block", "untrusted_ref"])

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.html"
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(c["html"])
    manifest.append({k: v for k, v in c.items() if k != "html"})
with open(os.path.join(WORK, "manifest-2151-2200.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
