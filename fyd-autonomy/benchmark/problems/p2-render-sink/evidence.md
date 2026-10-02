# BENCHMARK PROBLEM P2 — javascript: URLs render verbatim into href (render-sink)

## Problem statement

FYD hostile-content probe at the renderer boundary (failure id
FL-20260921-032). The renderer neutralizes hostile HTML *text* (React escapes
`<script>` and `<img onerror>` payloads; no `dangerouslySetInnerHTML` in the
renderer), but it does NOT neutralize hostile *URLs*:

- `fields.website = "javascript:alert(1)"` was rendered verbatim as
  `href="javascript:alert(1)"`.
- `fields.socials = ["javascript:alert(2)"]` was rendered verbatim as
  `href="javascript:alert(2)"`.

Current React only warns on `javascript:` URLs; it does not block them.

## Invariants

1. Harvested website content is external input and is treated as hostile by
   default.
2. The renderer must never interpolate a raw observed string into `href`
   or `src`. An observed URL string is data; a rendered link is an
   executable capability (navigation, phone dialer, mail client).
3. Text escaping does not cover URL sinks: JSX escaping and `javascript:`
   scheme neutralization are different mechanisms.

## Relevant code excerpts (the renderer as it ran when probed)

Excerpt 1 — website link in the contact/hero section (`renderer.tsx`):

```tsx
<a href={website} className="underline">
  {website}
</a>
```

where `website` is `fields.website` from the object graph, passed through
without transformation.

Excerpt 2 — socials list (`renderer.tsx`):

```tsx
{socials.map((url) => (
  <a key={url} href={url}>
    {hostOf(url)}
  </a>
))}
```

where `url` items are the raw `fields.socials` strings.

Excerpt 3 — probe path (`step5-hostile.ts`): hostile field values flow through
the REAL path — synthetic ObjectGraph -> generateSiteSpec -> renderToStaticMarkup
with SitePageView (the same component the demo pages render). The probe
inspects the rendered `href` attributes.

## Test evidence (probe observations)

- `website = "javascript:alert(1)"` -> rendered `href="javascript:alert(1)"`
  (verbatim, executable). FAIL.
- `socials = ["javascript:alert(2)"]` -> rendered `href="javascript:alert(2)"`
  (verbatim, executable). FAIL.
- `description = "<script>alert(3)</script>"` -> rendered escaped, inert. PASS.
- `description = "<img src=x onerror=alert(4)>"` -> rendered escaped, inert. PASS.
- No `dangerouslySetInnerHTML` found in the renderer or the site client. No
  `src={` interpolations of observed data found.
- Internal anchors (`href="#ask"`) and internal routes (`"/o/" +
  encodeURIComponent(id)`) carry no observed data.

## Candidate hypotheses (analyst-drafted; NOT exhaustive)

- H1: The renderer uses `dangerouslySetInnerHTML` somewhere, injecting raw
  hostile markup.
- H2: The site client renders raw field text without escaping (a text sink,
  not a URL sink).
- H3: The URLs come from a trusted internal route table, not from observed
  data, so the sink is benign.
- H4: React's JSX escaping already neutralizes `javascript:` URLs, so the
  probe finding is a false positive.
- H5: The probe double-encodes its inputs, so the rendered output does not
  reflect what a real browser would execute.

## Your task

Output exactly four sections:

1. **Diagnosis** — the single root cause, with the mechanism (which sink,
   what data reaches it, why text-escaping does not save it).
2. **Patch spec** — the minimal change (files, functions, lines). Prefer a
   diff-shaped description. Do not redesign the renderer.
3. **Test spec** — one falsifiable test: the hostile inputs, the exact
   assertions that FAIL on the current code and PASS after your patch.
   Cover at least: plain `javascript:`, mixed-case scheme, whitespace /
   control-character smuggling, and `data:` / `vbscript:` schemes.
4. **Risks** — what could your patch break (legitimate links that must keep
   working), and what you would check.

Rules: reason only from the evidence above. Do not invent functions, files,
test results, or library behaviors not shown. If you are unsure, say what
evidence would settle it.
