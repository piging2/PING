# QA-HOSTILE Verdict: FYD Projection Seam Hostile-Input Sweep

**Verdict: FAIL** (invariant violated by confirmed bypasses)
**Date:** 2026-09-23 (run artifacts timestamped 2026-09-24T01:17:03Z UTC)
**Invariant under test:** NO EXECUTABLE SOURCE CONTENT CROSSES THE PROJECTION SEAM
**Branch under test:** fyd-factory (Pig repo /home/nolan/projects/ping, read-only)
**Agent:** QA-HOSTILE (resumed after daemon restart; prior agent completed probes, delivered no verdict)

## Lane intent (recovered from artifacts)

Attack the FYD projection seam (fixture -> generateSiteSpec -> buildRenderContext -> SitePageView -> renderToStaticMarkup, plus the seam gates directly: resolveSafeLink, contactMethodFor, importCustomerData/exportCustomerData, buildCapabilities/composeObjectView for the /o object-page lane) with hostile inputs, and determine whether any executable content survives into rendered output.

**Artifacts inspected:**
- `zz-hostile-seam.test.ts` (52 attacks, A01-A52) + `.b64` copy
- `results-extract.json` (01:17, full 52-outcome JSON extraction)
- `raw-run-output.txt` (01:17, truncated harness stdout capture)
- `zz-hostile-supp.test.ts` (01:21, S1/S2 supplementary, never executed by prior agent)
- `run-harness.sh`, `dbg-harness.sh`, `run-supp.sh`, `read*.sh` exploration helpers

**Spot-check:** the raw capture's visible JSON (generatedAt 2026-09-24T01:17:03.539Z, suspects list prefix, A35/A36/A44 excerpts) matches `results-extract.json`. Jest ran 5 tests, all passed, 52 outcomes recorded. The extract is trustworthy as the primary record.

## Critical adjudication note (false-positive flag)

The harness's first-pass flagging marked **46 of 52 outcomes SUSPECT**, but 43 of those carry only the flag `extra-style-close` (more than one `</style>` in page output). That flag fires on benign renderer output (the legitimate `FydMotionStyles` style block plus page styles) and is **orthogonal to the attacks**: in every such excerpt the hostile payload is visibly escaped to inert text (e.g. `&lt;script&gt;alert(&#x27;A01&#x27;)&lt;/script&gt;`). Those verdicts are false positives. Adjudicating by real survivor flags (`live-script-tag`, `javascript-href`, `javascript-src`, `event-handler-attr`, `data-text-html-url`) yields exactly **3 confirmed findings** out of 54 total probes (52 + S1 + S2).

## Confirmed bypasses (real, with evidence)

### BYPASS-1 / BYPASS-2: /o object-page website capability emits raw javascript: href (A35, A36)

`src/fyd/object/view.ts` `buildCapabilities` interpolates the raw contact value into the href with **no safe-link gate** (confirmed at committed source, lines 190-192):

```ts
if (contact.phone) caps.push({ kind: "call", href: "tel:" + contact.phone.replace(/\s/g, ""), label: "Call" });
if (contact.email) caps.push({ kind: "email", href: "mailto:" + contact.email, label: "Email" });
if (contact.website) caps.push({ kind: "website", href: contact.website, label: "Website" });
```

- A35: `buildCapabilities` with `website: "javascript:alert('A35')"` produced caps `["ask","follow",{"kind":"website","href":"javascript:alert('A35')"}]`, rendered as `<a href="javascript:alert('A35')">Website</a>`. Clicking that anchor executes JavaScript. **Executable content crossed the seam.**
- A36: end-to-end through `composeObjectView` with the raw `website` graph field set to `"javascript:alert('A36')"` produced the same: `<a href="tel:+15412865190">Website</a><a href="javascript:alert('A36')">Website</a>`. The website capability gateNote shows `{"kind":"website","href":"javascript:alert('A36')"}`.

Root cause: the main site renderer routes links through `resolveSafeLink` (scheme allowlist, control-char rejection), but the /o object-page lane was built without it. This is a genuine XSS-class seam hole on the object page.

### BYPASS-3: media src accepts javascript: scheme, no URL gate (A44)

`<img src="javascript:alert('A44')" alt="alt A44" ...>` rendered on the hero. The renderer interpolates `DisplayMedia.src` raw; the seam comment in the test itself notes "no URL gate on media src". Modern browsers do not execute `javascript:` in `img src`, so this is latent rather than live, but the invariant is violated in substance: an executable-scheme URL crossed the seam, and protection relies on browser behavior rather than a gate.

## Gate weaknesses (accepted by gate; neutralized only by React SSR escaping)

- **W1 (A32/A33):** `contactMethodFor(email)` accepted `"><script>alert('A32')</script>@x.com` and `a33b@bar.com"><svg/onload=alert('A33')>` (EMAIL_SHAPE `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` permits quotes/brackets/script text) and emitted `actionUri=mailto:"><script>alert('A32')</script>@x.com` raw. React's attribute escaping neutralized it in the rendered output, but any non-React consumer of the actionUri would not be protected. The gate is too lax for an email address.
- **W2 (A37):** `buildCapabilities` call capability does not gate either: phone `+1" onmouseover="alert('A37')` survived into `href="tel:+1\"onmouseover=\"alert('A37')"`. Neutralized in output only by React escaping.
- **W3 (A49):** `exportCustomerData` emits literal `<script>` substrings in the JSON blob (`live-script-in-json=true`, no `\u003c` escaping). Safe as JSON; hazardous if the export is ever naively inlined into an HTML `<script>` block.

## Neutralized properly (49 probes)

- **Link gate (A15-A29):** `resolveSafeLink` ("navigate") rejected `javascript:`, mixed-case `JaVaScRiPt:`, tab/control smuggling, leading whitespace, `data:text/html`, `vbscript:`, `file:///etc/passwd`, null-byte, fullwidth unicode, relative and protocol-relative URLs (all `non_navigable`). A24/A27 safe https URLs were percent-encoded (`%22onmouseover=%22...`), inert.
- **Text interpolation (A01-A14, A52):** all rendered as escaped inert text. Includes pre-escaped entities (A04 double-escaped, correct), template-literal syntax (A05), bidi override U+202E (A06), zero-width chars (A07), null byte (A52), nested malformed tags (A10), fake JSON-LD block (A14), hostile object ids via `encodeURIComponent` detailHref (A12/A13: `/o/x%22%3E%3Cscript%3E...` percent-encoded, no breakout). Note: bidi/zero-width/null pass through as inert text (display-spoofing class, not executable; unsanitized).
- **Contact lane (A30/A31/A34/A38):** hostile phones rejected (control-char pre-check, TEL_ALLOWED + digit rule); valid `tel:` accepted; valid email accepted. S1 (supp, run this session): phone `+1\n(970)\n555-0100` rejected (null method), control-char pre-check confirmed.
- **Object-page locality (A39, S2):** business-role locality dropped (no caps emitted); location-role locality percent-encoded into `https://www.google.com/maps/search/?api=1&query=%22%3E%3Cscript%3E...` (S2, run this session), rendered escaped, no live script / event handler / javascript: href.
- **Theme tokens (A40-A43):** escaped into style attributes (`style="background:&lt;/style&gt;..."`); `expression()` token landed in a CSS custom property (dead in modern browsers). Tokens are unvalidated before style props; inert under React SSR only.
- **Boundary (A47/A48):** malformed JSON rejected with diagnostic; `__proto__` in package did not pollute (`({}).polluted === undefined`).
- **Integrity (A50/A51):** hostile duplicate id and conflicting location rendered escaped. Notable: the duplicate-id object's hostile title was the one rendered in the hero (no dedup-conflict gate), so hostile data can replace displayed content, though inert.

## Residual risks (not fixed; for the convergence wave's follow-up)

1. The /o capability lane bypasses safe-link for **all three** of call/email/website; only website was probed live. Phone/email are one non-React consumer away from the same class of issue.
2. Theme tokens flow unvalidated into style props; inert only because React escapes attributes.
3. `description` has no length cap (A09: 100KB rendered, renderMs 8, inert but uncapped).
4. Exported customer-data JSON contains literal `<script>` strings (W3); must never be inlined into HTML.
5. Duplicate object ids are not conflict-gated; last/first-wins behavior lets hostile duplicates replace displayed content (inert, but an integrity gap).

## Verdict rationale

FAIL. The invariant "NO EXECUTABLE SOURCE CONTENT CROSSES THE PROJECTION SEAM" is violated: two probes (A35, A36) put a live `javascript:` href into /o object-page output, and a third (A44) put a `javascript:` scheme into an `img src`. The site-page render lane is solid (safe-link + React escaping held against 30 link/contact probes and 15 text probes). The object-page capability lane is the unsealed seam. No fix was applied per task constraints; this report is evidence only.

## Files

- This verdict: [HOSTILE-VERDICT.md](sandbox://workspace/fyd-factory/qa/hostile/HOSTILE-VERDICT.md)
- Sweep: [zz-hostile-seam.test.ts](sandbox://workspace/fyd-factory/qa/hostile/zz-hostile-seam.test.ts), [results-extract.json](sandbox://workspace/fyd-factory/qa/hostile/results-extract.json), [raw-run-output.txt](sandbox://workspace/fyd-factory/qa/hostile/raw-run-output.txt)
- Supplementary: [zz-hostile-supp.test.ts](sandbox://workspace/fyd-factory/qa/hostile/zz-hostile-supp.test.ts) (S1, S2 executed this session via run-supp-live.sh; temp harness file removed from Pig tree, git status clean of zz-hostile refs)
