# fyd-preview-staging (NIGHT-ASK-OWNER, 2026-09-23)

New files only. Nothing in the repo was touched or committed.

## Intended mount points (NIGHT-VERCEL)

Copy these two files into the Next.js app tree:

- `ask/page.tsx` -> `src/app/preview/ask/page.tsx`
- `owner-console/page.tsx` -> `src/app/preview/owner-console/page.tsx`

The pages use the `@/` alias (maps to `./src` in tsconfig), so they resolve
from anywhere under `src/app/`.

## What each file does

**ask/page.tsx**: server component running the LANE-ASK concierge
(`src/fyd/ask/concierge.ts`) against the site's public object graph.
`?site=happy-place` (default) or `?site=coppersmith-plumbing`; `?q=` carries
the question. Renders the seven canonical questions as quick buttons plus a
free-text input; per-claim grade chips (direct/derived/inferred/unknown);
evidence citations; conflicts; unknowns in the `[UNKNOWN] <fact>: unknown.
<reason>, so I will not guess` form. Non-canonical questions get an honest
note, never an invented answer.

**owner-console/page.tsx**: mounts the LANE-OWNER `DemoOwnerConsole` with the
fail-closed demo identity provider. Route-level guard: `notFound()` unless
`NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`. When enabled, the banner reads
"DEMO OWNER MODE, simulated authority, preview only".

## Preview-only guarantees

- Both pages project the graph to public objects only before use.
- No new authority, no new data access, no repo files modified.
- The demo owner console never reads real owner credentials and never binds
  a real identity provider; all simulated actions are labeled simulated.
- Known divergence, surfaced on the page itself: HIDE decisions made in the
  console apply only inside the console today (in-memory, no persistence),
  and Ask FYD does not consume them (ask pipeline calls
  applyFieldVisibility(graph, []) in src/fyd/ask/visitor-answer.ts). A fact
  hidden in the preview console can still be answered by Ask FYD.
