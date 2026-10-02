#!/usr/bin/env python3
"""fleet-acq-2: js-heavy batch 2 (missions ACQ-2201..ACQ-2250, js-heavy cases 0-49).
Deeper traps: dynamic import, service workers, shadow DOM, blob/object URLs,
hash routing, postMessage, mutation observers, framework hydration markers."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "jsheavy2")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, html, expect, note, flags=()):
    CASES.append({"case": case, "mission_no": 2201 + case, "slug": slug, "bound": "JSHEAVY",
                  "html": html, "expect": expect, "note": note, "expect_flags": list(flags)})

B = lambda body, head="": f"<!doctype html><html><head>{head}</head><body>{body}</body></html>"
S = lambda code, attrs="": f"<script{attrs}>{code}</script>"

add(0, "dynamic-import", B("<p>x</p>" + S("import('https://cdn.example/chunk.js').then(m=>m.run());")),
    "BOUNDED_SUCCESS", "dynamic import URL not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(1, "service-worker", B("<p>x</p>" + S("navigator.serviceWorker.register('/sw.js');")),
    "BOUNDED_SUCCESS", "service worker registration inert; /sw.js not a URL claim", flags=["script_inert", "no_url_harvest_from_js"])
add(2, "shadow-dom", B("<div id=h></div>" + S("h.attachShadow({mode:'open'}).innerHTML='<p>s</p>';")),
    "BOUNDED_SUCCESS", "shadow DOM never rendered", flags=["script_inert", "dom_mutation_guess"])
add(3, "blob-url", B("<p>x</p>" + S("var u=URL.createObjectURL(new Blob(['hi']));")),
    "BOUNDED_SUCCESS", "blob URL inert", flags=["script_inert"])
add(4, "hash-routing", B("<div id=app></div>" + S("addEventListener('hashchange',()=>render(location.hash));")),
    "BOUNDED_SUCCESS", "hash routes never resolved", flags=["script_inert"])
add(5, "postmessage", B("<p>x</p>" + S("parent.postMessage({t:'tok',v:'abc'},'https://parent.example');")),
    "BOUNDED_SUCCESS", "postMessage target not harvested; secret-shaped value never extracted", flags=["script_inert", "no_url_harvest_from_js"])
add(6, "mutation-observer", B("<p>x</p>" + S("new MutationObserver(cb).observe(document,{childList:true});")),
    "BOUNDED_SUCCESS", "mutation observer inert", flags=["script_inert"])
add(7, "hydration-marker", B('<div id=app data-server-rendered="true"><p>SSR text</p></div>' + S("hydrate();")),
    "BOUNDED_SUCCESS", "SSR text extracted; hydration code inert", flags=["script_inert"])
add(8, "json-in-comment", B("<p>x</p>" + S("/* {\"price\": 5} */ var a=1;")),
    "BOUNDED_SUCCESS", "JSON inside JS comment is not a data block", flags=["script_inert"])
add(9, "data-uri-img-js", B("<p>x</p>" + S("img.src='data:image/png;base64,AAA';")),
    "BOUNDED_SUCCESS", "data: assigned in JS inert", flags=["script_inert"])
add(10, "trusted-types", B("<p>x</p>" + S("trustedTypes.createPolicy('p',{createHTML:s=>s});")),
    "BOUNDED_SUCCESS", "trusted types inert", flags=["script_inert"])
add(11, "amd-define", B("<p>x</p>" + S("define(['https://cdn.example/dep.js'],function(d){});")),
    "BOUNDED_SUCCESS", "AMD dep URL not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(12, "require-call", B("<p>x</p>" + S("var m=require('https://cdn.example/m.js');")),
    "BOUNDED_SUCCESS", "require URL not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(13, "css-in-js", B("<p>x</p>" + S("el.style.backgroundImage='url(https://a.example/bg.jpg)';")),
    "BOUNDED_SUCCESS", "CSS url() inside JS not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(14, "anchor-click-js", B('<a id=l href="https://a.example/real">R</a>' + S("l.click();")),
    "BOUNDED_SUCCESS", "real anchor extracted; JS click() changes nothing", flags=["script_inert", "untrusted_ref"])
add(15, "form-submit-js", B('<form action="https://a.example/submit"></form>' + S("document.forms[0].submit();")),
    "BOUNDED_SUCCESS", "form action recorded as claimed endpoint, not submitted", flags=["script_inert", "form_action_claimed"])
add(16, "ajax-html", B("<p>x</p>" + S("fetch('/frag').then(r=>r.text()).then(t=>d.innerHTML=t);")),
    "BOUNDED_SUCCESS", "AJAX HTML never materialized", flags=["script_inert", "no_url_harvest_from_js", "dom_mutation_guess"])
add(17, "graphql-query", B("<p>x</p>" + S("fetch('https://gql.example/',{method:'POST',body:JSON.stringify({query:'{user}'})});")),
    "BOUNDED_SUCCESS", "GraphQL endpoint not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(18, "beacon", B("<p>x</p>" + S("navigator.sendBeacon('https://beacon.example/e','d');")),
    "BOUNDED_SUCCESS", "beacon URL not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(19, "pixel-js", B("<p>x</p>" + S("new Image().src='https://px.example/p.gif';")),
    "BOUNDED_SUCCESS", "JS pixel not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(20, "open-window", B("<p>x</p>" + S("window.open('https://ads.example/pop');")),
    "BOUNDED_SUCCESS", "window.open URL not harvested, never followed", flags=["script_inert", "no_url_harvest_from_js"])
add(21, "location-replace", B("<p>x</p>" + S("location.replace('https://a.example/new');")),
    "BOUNDED_SUCCESS", "location.replace: claimed intent, never followed", flags=["script_inert", "js_redirect_claimed"])
add(22, "meta-refresh-js", B("<p>x</p>" + S("var m=document.createElement('meta');m.httpEquiv='refresh';")),
    "BOUNDED_SUCCESS", "JS-created refresh never honored", flags=["script_inert", "dom_mutation_guess"])
add(23, "cookie-read", B("<p>x</p>" + S("var c=document.cookie;")),
    "BOUNDED_SUCCESS", "cookie read inert; no secret extraction", flags=["script_inert"])
add(24, "localstorage", B("<p>x</p>" + S("localStorage.setItem('k','v');")),
    "BOUNDED_SUCCESS", "storage inert", flags=["script_inert"])
add(25, "intersection-lazy", B('<img data-src="https://a.example/lz.jpg">' + S("new IntersectionObserver(e=>load(e)).observe(img);")),
    "BOUNDED_SUCCESS", "lazy image claimed not loaded", flags=["script_inert", "lazy_ref"])
add(26, "infinite-scroll", B("<div id=feed></div>" + S("addEventListener('scroll',()=>fetchMore('/page2'));")),
    "BOUNDED_SUCCESS", "infinite scroll endpoint not followed", flags=["script_inert", "no_url_harvest_from_js"])
add(27, "json-ld-string-concat", B("<p>x</p>" + S("var j='{\"@'+'type\":\"X\"}';")),
    "BOUNDED_SUCCESS", "concatenated JSON string not a data block", flags=["script_inert"])
add(28, "script-error-attr", B("<p>x</p>", '<script src="https://c.example/a.js" onerror="retry()"></script>'),
    "BOUNDED_SUCCESS", "onerror handler inert; src unfetched", flags=["script_inert", "script_src_unfetched", "event_handler_inert"])
add(29, "nomodule", B("<p>x</p>", '<script nomodule src="https://c.example/legacy.js"></script>'),
    "BOUNDED_SUCCESS", "nomodule src unfetched", flags=["script_src_unfetched"])
add(30, "async-order", B(S("var order=[];") + S("order.push(1);", ' src="https://c.example/a.js" async')),
    "BOUNDED_SUCCESS", "execution order never simulated", flags=["script_inert", "script_src_unfetched"])
add(31, "iife-dom", B("<p>Before</p>" + S("(function(){document.body.innerHTML='After';})();")),
    "BOUNDED_SUCCESS", "IIFE DOM rewrite never applied", flags=["script_inert", "dom_mutation_guess"])
add(32, "framework-state", B("<div id=app></div>" + S("var state={user:{name:'Ann'}};render(state);")),
    "BOUNDED_SUCCESS", "framework state never rendered", flags=["script_inert"])
add(33, "template-engine", B("<p>x</p>" + S("var h=Mustache.render(tpl,{name:'Ann'});")),
    "BOUNDED_SUCCESS", "template engine output never produced", flags=["script_inert"])
add(34, "markdown-js", B("<p>x</p>" + S("el.innerHTML=marked('# Hello');")),
    "BOUNDED_SUCCESS", "JS markdown never rendered", flags=["script_inert", "dom_mutation_guess"])
add(35, "sanitizer-bypass", B("<p>x</p>" + S("el.innerHTML=DOMPurify.sanitize(userHtml);")),
    "BOUNDED_SUCCESS", "sanitized output still never materialized", flags=["script_inert", "dom_mutation_guess"])
add(36, "event-delegation", B('<div id=list><button data-id="1">A</button></div>' + S("list.addEventListener('click',h);")),
    "BOUNDED_SUCCESS", "delegated handlers inert; data-id not a fact claim", flags=["script_inert"])
add(37, "dataset-facts", B('<div data-price="9.99" data-hours="24/7">x</div>'),
    "BOUNDED_SUCCESS", "data-* attrs recorded as claimed attrs, not facts", flags=["data_attr_claimed"])
add(38, "aria-live", B('<div aria-live="polite" id=live></div>' + S("live.textContent='Updated';")),
    "BOUNDED_SUCCESS", "aria-live updates never applied", flags=["script_inert", "dom_mutation_guess"])
add(39, "web-component-fetch", B("<user-card></user-card>" + S("customElements.define('user-card',class extends HTMLElement{connectedCallback(){fetch('/u/1');}});")),
    "BOUNDED_SUCCESS", "custom element lifecycle never runs", flags=["script_inert", "custom_element_inert", "no_url_harvest_from_js"])
add(40, "import-attributes", B("<p>x</p>" + S("import d from 'https://cdn.example/d.json' with {type:'json'};")),
    "BOUNDED_SUCCESS", "import-attribute URL not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(41, "worker-src", B("<p>x</p>" + S("new Worker('https://cdn.example/w.js');")),
    "BOUNDED_SUCCESS", "worker URL not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(42, "shared-worker", B("<p>x</p>" + S("new SharedWorker('/sw2.js');")),
    "BOUNDED_SUCCESS", "shared worker inert", flags=["script_inert", "no_url_harvest_from_js"])
add(43, "eventsource", B("<p>x</p>" + S("new EventSource('https://sse.example/stream');")),
    "BOUNDED_SUCCESS", "EventSource URL not harvested", flags=["script_inert", "no_url_harvest_from_js"])
add(44, "rtc", B("<p>x</p>" + S("new RTCPeerConnection({iceServers:[{urls:'stun:stun.example'}]});")),
    "BOUNDED_SUCCESS", "RTC config inert", flags=["script_inert"])
add(45, "payment-request", B("<p>x</p>" + S("new PaymentRequest([{supportedMethods:'basic-card'}],{total:{amount:{value:'5'}}});")),
    "BOUNDED_SUCCESS", "payment request inert", flags=["script_inert"])
add(46, "credential-api", B("<p>x</p>" + S("navigator.credentials.get({password:true});")),
    "BOUNDED_SUCCESS", "credential API inert; no secret handling", flags=["script_inert"])
add(47, "geolocation", B("<p>x</p>" + S("navigator.geolocation.getCurrentPosition(show);")),
    "BOUNDED_SUCCESS", "geolocation inert", flags=["script_inert"])
add(48, "notification", B("<p>x</p>" + S("new Notification('Hi');")),
    "BOUNDED_SUCCESS", "notification inert", flags=["script_inert"])
add(49, "kitchen-sink", B("<title>K</title><div id=app data-server-rendered=true><p>SSR</p></div>" +
    S("import('https://cdn.example/a.js');fetch('/more').then(t=>app.innerHTML=t);") +
    '<noscript><p>NoJS menu</p></noscript>',
    '<script type="application/json">{"env":"prod"}</script>'),
    "BOUNDED_SUCCESS", "combined: SSR kept, dynamic import/fetch inert, noscript fallback, JSON data block",
    flags=["script_inert", "no_url_harvest_from_js", "dom_mutation_guess", "noscript_provenance", "json_data_block"])

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.html"
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(c["html"])
    manifest.append({k: v for k, v in c.items() if k != "html"})
with open(os.path.join(WORK, "manifest-2201-2250.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
