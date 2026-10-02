# BENCHMARK PROBLEM P3 — mobile horizontal overflow at 320px (root-cause)

## Problem statement

Both FYD demo sites (happy-place, coppersmith-plumbing) show horizontal
overflow at a 320px viewport: `document.documentElement.scrollWidth = 331`
while `window.innerWidth = 320`. At 375px both are clean (scrollW = 360);
desktop (1280px) is clean. The defect is browser-proven with headless Chrome
via CDP, 4/4 runs.

Failure id: FL-20260921-033.

## Invariants

1. No CSS is changed without browser proof. The actual overflowing *owner*
   must be identified (smallest element whose scrollWidth exceeds its
   clientWidth), and the fix applies only to that owner.
2. Earlier 375px overflow screenshots (08:13) were a dirty-worktree artifact:
   the same pages built from committed code at 375px trace clean
   (scrollW = 360). The 375px trail is closed; the live defect is 320px only.
3. Mobile product shape: FYD objects live in normal document flow on mobile;
   no persistent floating elements.

## Relevant code excerpts

Excerpt 1 — the Ask FYD "Design tokens" proposal row, rendered in the shared
site client used by both demo sites (`site-client.tsx`):

```tsx
<div className="... proposal row ...">
  <label className="flex ...">Token name</label>
  <input className="flex-1 ..." />
  <button className="...">Propose</button>
</div>
```

Excerpt 2 — overflow-owner probe output (`owners-probe.js` finds the smallest
elements with scrollWidth > clientWidth), 320px viewport:

```json
{
  "docScrollW": 331,
  "innerW": 320,
  "owners": [
    { "tag": "button", "cls": "proposal-btn", "text": "Propose",
      "clientW": 42, "scrollW": 55, "minW": "44px" },
    { "tag": "input", "cls": "token-input",
      "clientW": 150, "scrollW": 150, "minW": "auto" },
    { "tag": "label", "cls": "token-label",
      "clientW": 80, "scrollW": 80, "minW": "auto" }
  ]
}
```

Computed-style notes from the probe: the label is `display:flex`
(`min-width:auto`), the input is `flex:1` (`min-width:auto`, does not shrink
below its intrinsic width), the "Propose" button has a 44px minimum touch
target with 55px min-content width.

## Test evidence (pre-fix observations only)

- 320px: docScrollW = 331 > 320 on BOTH demo sites (4/4 runs). FAIL.
- 375px: scrollW = 360, hero h1 right edge at 344 (visible). PASS.
- 1280px: scrollW = 1265. PASS.
- The FYD renderer section HTML renders clean in isolation at 375px; the
  overflow appears only in the composed page. (Isolation result is from the
  earlier 375px bisection; included because it rules out the hero section
  markup itself.)
- Removing `w-full`, `flex`, `overflow-x-auto`, or constraining the wrapper
  div did NOT fix the overflow (earlier bisection attempts, recorded).

## Candidate hypotheses (analyst-drafted; NOT exhaustive)

- H1: The hero h1 (text-4xl Playfair Display, "Happy Place Carpentry LLC")
  is too wide for 320px and forces the page wider.
- H2: The generated-page nav uses `overflow-x-auto`, which forces an
  intrinsic minimum width on the page.
- H3: The content column (`div.mx-auto.max-w-5xl` with `px-4` padding)
  miscalculates width at small viewports.
- H4: The viewport meta tag is missing or wrong (no `initial-scale`), so the
  browser lays out at a wider virtual viewport.
- H5: A flex-column body + `w-full` section interaction in the hero section
  gives the page a ~500px intrinsic min-content width.

## Your task

Output exactly four sections:

1. **Diagnosis** — the single root cause: the exact overflowing owner and
   the CSS mechanism (which properties on which elements combine to force
   scrollWidth > innerWidth at 320px but not at 375px).
2. **Patch spec** — the minimal change (files, classes, lines). Prefer a
   diff-shaped description. One owner, smallest possible edit.
3. **Test spec** — one falsifiable test: viewport widths, the exact
   measurements that FAIL on the current code and PASS after your patch.
4. **Risks** — what could your patch break (touch targets, layout at other
   widths), and what you would check.

Rules: reason only from the evidence above. Do not invent functions, files,
test results, or browser behaviors not shown. If you are unsure, say what
evidence would settle it.
