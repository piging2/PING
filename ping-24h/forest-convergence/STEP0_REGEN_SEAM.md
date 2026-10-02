# STEP0 REGEN SEAM — PROPOSAL → APPROVAL → PROJECTION → SERVED EXPERIENCE
Read-only archaeology lane, PING forest-convergence pass. Tree: branch
`fyd/builder-harvest-trackc-2026-09-28`, HEAD `f877c3919941978f07d5014909595df4751ec258`
(dirty working tree; nothing was modified by this lane). All paths below are
relative to `/home/nolan/projects/ping` unless stated otherwise.

## APPROVE HANDLER (what it does / doesn't do)

**File:** `src/app/api/fyd/customize/route.ts` (685 lines)
**Handler:** `handleApprove(req, siteId, text, clientProposal, requestId)` — def at
line 382; the POST dispatcher routes `{ action: "approve" }` to it at lines
654-673.

Exact post-journal behavior (lines ~505-567, the `execute` result and the
`committed`/`replayed` response branch):

1. `execute` (line ~505) calls `emitOverlayEvent(siteId, [op], { requestId,
   timeoutMs: 10_000, staleGuard: {...} })` imported from `@/fyd/customize/server`.
   The event POSTs `FYD_SITE_OVERLAY` to the demo journal gateway
   (`FYD_CUSTOMIZE_GATEWAY_URL ?? http://127.0.0.1:18199/events`).
2. On success it returns `{ eventId, deduped }`. **Nothing else happens.** No
   projection touch, no cache invalidation, no subscriber notify, no queue
   enqueue, no dump trigger.
3. The JSON response (lines ~537-567) confirms this explicitly in prose. The
   success `note` field says, verbatim: "Directive journaled as a
   presentation-intent overlay (proposal ....). **Re-run the projection dump:
   the regenerated page must show the approved section order from the review
   card.**" The `handleClear` sibling (lines ~574-640) carries the same pattern:
   "Directive removal journaled. Re-run the projection dump to render."

Confirmed: the expectation in the task ("does it touch any projection, cache,
subscriber, or queue — expected: nothing") is **confirmed by reading the code**.
The module docstring of the callee (`src/fyd/customize/server.ts` lines 8-13)
states the boundary in one line: "The projection dump picks it up on the next
regen."

Two boundary comments in `src/fyd/customize/server.ts` pin the seam precisely:

- `verifyStaleGuard` (lines ~492-499): "the projection dump regen and the
  journal gateway are separate processes that never take the Next.js in-process
  lock, so cross-process journal movement is invisible to a projection re-read."
- `emitOverlayEvent` stale-guard comment (lines ~590-595): "Residual risk past
  the POST (state moves after the event is appended, before the next projection
  regen) belongs to the projection/reconciler layer, **which this guard does
  not own**."

Also relevant: `loadCustomizedSite` (`server.ts` line 60), used by the approve
`derive` step, reasons over the **dumped projection file** (`getPingObjectGraph`)
— so approval itself reads the stale projection, while its stale-guard reads
the **live journal** via `readJournalDirectiveRefs` (line 358, `getPingObjectReader()
.queryFydSiteOverlays`), never the cached projection. This dual-read design is
deliberate and documented.

## PROJECTION MACHINERY INVENTORY

"REACHED" = imported by a served route or request path. "DECLARED-ONLY" = exists
but unwired to the approve→serve flow.

### REACHED — the journal write path
- `src/fyd/customize/server.ts` — `emitOverlayEvent` (line 564): POSTs the
  `FYD_SITE_OVERLAY` envelope to the demo journal gateway with FYD-037 identity
  pre-flight (`preflightJournal`, line 154, typed `WRONG_JOURNAL`, zero POSTs on
  mismatch). Reached by `src/app/api/fyd/customize/route.ts` (approve + clear)
  and by `src/fyd/tenant/scoped-stores.ts:153` (`scopedEmitOverlayEvent`,
  tenant-gated wrapper).
- `tools/fyd-journal-gateway/server.mjs` — the demo journal gateway itself
  (Node, `127.0.0.1:18199`), append-only JSONL store at
  `/home/nolan/projects/ping/data/fyd-journal/events.jsonl`. Endpoints:
  `GET /` (identity marker `fyd-demo-journal@<live-derived>`), `GET
  /events/FYD_SITE_OVERLAY`, `POST /events`. Reached by both the customize
  route (write) and `dump.py` (read).
- `src/lib/ping/ping-object-reader.ts` — `PingObjectReader.queryFydSiteOverlays`
  (line 277): governed live-journal reader (sanitized op payloads only cross
  the boundary). Reached by `fyd-tenant-graph.ts`, `readJournalDirectiveRefs`
  (stale guard), and the Ask FYD pipeline.

### REACHED — the two projection read paths
- `src/fyd/data/ping-object-source.ts` — **file projection read seam**. Reads
  `/home/nolan/ping/var/fyd-projections/<siteId>.json` (`projectionDir()`,
  `FYD_PROJECTION_DIR` override for tests) on EVERY call — `readFile` in
  `getPingObjectGraph`, `readFileSync` in `getPingObjectGraphSync`. Zero
  caching, zero fetch-cache, zero `unstable_cache`. `parseAndVerify` recomputes
  `sha256(canonicalize(graph))` and `sha256(canonicalize(presentationIntent))`
  and fails closed on any mismatch; missing file is a hard throw ("refusing to
  serve stale data"). Reached by: `/sites/*` pages (via spec-pipeline),
  `/api/fyd/projection`, and the customize approve `derive` step.
- `src/fyd/data/fyd-tenant-graph.ts` — **in-process live projection**.
  Rebuilds fixture base graph + live journal overlays (`getFydTenantGraph`)
  on every call; header states "There is deliberately no cache: Ask FYD
  re-reads on every serve, so a newly journaled overlay is visible to the next
  question immediately." Contains a "faithful port of the dump.py overlay
  engine (tools/fyd-site-projection/dump.py :: apply_overlays): the same op
  kinds, the same strictness, the same fail-closed behavior" (line ~226). Base
  pinned by `FYD_TENANT_PINS` digests (baseDigest mismatch fails closed).
  Reached by: Ask FYD pipeline (`ask-pipeline.ts:85`), `/api/mc/*` routes,
  `scoped-stores.ts:47`, `site-bundle.ts:30`. **NOT reached by `/sites/*`.**
- `src/app/api/fyd/projection/route.ts` — `GET /api/fyd/projection?siteId=`
  BFF: serves the verified public projection (`getVerifiedPublicProjection`),
  `export const dynamic = "force-dynamic"`, 503 on missing/tampered
  projection. Reached (public HTTP endpoint), but nothing in the repo calls it
  as a BFF for `/sites` pages (pages compile in-process).

### REACHED — related reducer (owner corrections, not site projection)
- `src/fyd/object/owner-events.ts` line 139: "Pure reducer: fold an event log
  into the current owner-visible state." Reduces owner field-correction events.
  Reached via `src/fyd/object/owner-overlay.ts` → composed onto the verified
  graph AFTER digest verification in `parseAndVerify`. Separate authority from
  the projection dump.

### DECLARED-ONLY — exists, unwired to approve→serve
- `tools/fyd-site-projection/dump.py` (618 lines) — THE offline projector.
  Nothing in `src/` imports, shells to, or schedules it. Zero cron/workflow
  references found in the repo; it is invoked only manually. (Details below.)
- `tools/fyd-site-projection/test_dump.py` — unit tests for the dumper; not
  executed by this lane.
- `src/fyd/refresh/dependency-index.ts` (lines 5-8, 70-81) + `run-t2.ts`
  (line 61: `index.invalidateForChanges(changes)`) — a real
  register/merge/invalidate contract ("Changing one object invalidates only its
  registered sections... `pagesForSections` turns invalidated sections into the
  pages to regenerate"), but it belongs to the temporal-observation lane
  (website re-observation → snapshot diff → conflict), is driven by a manual
  `npx tsx run-t2.ts` invocation, and is never consulted by the approve path.
  DECLARED-ONLY for this task's flow.
- The words "projector" in `src/fyd/social/readers.ts:7`,
  `src/fyd/social/attestation-gate.ts:102`, `src/app/api/mc/_lib/mc-dispatch.ts:216`
  refer to the journal **event-ordering convention** ((timestamp, event_id),
  last-wins) — the ordering `dump.py` replays — not a projection service.
- "subscriber" grep hits are the unrelated email `kit-adapter.ts` subscriber
  tagging and `src/types/events.ts` subscriberId. No FYD event-subscriber
  mechanism exists.
- No `revalidate` / `unstable_cache` / `invalidate` cache machinery exists
  anywhere in `src/` or `tools/` for FYD projections. No queue, no webhook, no
  inotify/file-watch hook for the projection dir. No "regeneration executor",
  "materializer", or "onEvent" handler exists.

## DUMP.PY ANATOMY

**Path:** `tools/fyd-site-projection/dump.py` (618 lines). `DUMPER_VERSION =
"fyd-projection-dump@1.2.1"` (line 76).

**Journal resolution (lines 92-116, 125-147):**
- `OVERLAY_JOURNAL = os.environ.get("FYD_OVERLAY_JOURNAL", "main")` (line 92).
- `JOURNAL_GATEWAY_URL` default `http://127.0.0.1:18199` (demo JSONL gateway);
  `MAIN_GATEWAY_URL` default `http://127.0.0.1:8080` (main PING gateway).
- `query_overlays()` (line 376): `demo` → `query_overlays_demo` (line 357);
  otherwise the main-gateway Postgres path via `docker cp` + `docker exec`
  into the `ping-gateway` container.
- **Why default fails closed with WRONG_JOURNAL:** default mode is `main`.
  `query_overlays` first calls `_preflight_journal(MAIN_GATEWAY_URL, "/health")`
  (line ~383) and expects marker `ping-main-journal` (or
  `FYD_EXPECTED_OVERLAY_JOURNAL` override). The docstring (lines 104-110)
  states the pending-gateway-cutover HOLD: the main journal "does not accept
  FYD_SITE_OVERLAY anyway" (FAILURE_LEDGER FL-20260921-231), so the pre-flight
  cannot prove the expected identity → `sys.exit(2)` with a `WRONG_JOURNAL`
  message on stderr (lines 143-147). The honest path is
  `FYD_OVERLAY_JOURNAL=demo`, which pre-flights the demo gateway's `GET /`
  for `fyd-demo-journal@<live-derived>` — the same marker `emitOverlayEvent`'s
  `preflightJournal` checks (FYD-037, symmetric).

**Replay (lines 301-541):**
- `query_overlays_jsonl` (line 301): paginated `GET
  /events/FYD_SITE_OVERLAY?limit=&offset=&tenant=<site>` from the demo gateway,
  read-only; any fetch or shape error → exit 2 (fail closed: "a projection must
  never be built from a partially read journal"). Events sorted by
  `(timestamp, event_id)`.
- `apply_overlays` (line 417): deterministic op application. BASE graph is
  mechanically extracted from the committed machine-generated fixture TS
  (`extract_base_graph`, line 227 — strips the `export const X: ObjectGraph =`
  wrapper, parses the JSON body; byte-deterministic, `baseDigest` recorded).
  Op kinds validated strictly: `set_field`, `add_object`, `add_relationship`,
  `deactivate_object`, `set_presentation_intent` (upserted by `intentId`,
  journal-order last-wins; approval digest must equal proposal digest and the
  approval note must carry the "DEMO OWNER MODE" marker), `clear_presentation_intent`.
  Unknown op kind aborts the whole dump. No overlay without a journaled event;
  provenance refs are `ping-event:<event_id>`.

**Write path (lines 542-601):**
- `OUT_DIR = "/home/nolan/ping/var/fyd-projections"`; writes
  `<site>.json` via `tempfile.mkstemp(dir=OUT_DIR)` + `os.replace` — **atomic
  tmp+rename**, so readers never see a partial file. Exit codes: 0 ok,
  1 usage/internal, 2 overlay query failed (nothing written — the previous
  projection stays in place).
- `meta` version/status fields (lines ~566-578): `siteId`, `dumpedAt` (wall
  clock), `dumperVersion`, `baseDigest`, `fixtureFileDigest`, `fixtureHeader`,
  `overlayEventIds[]` (applied journal event ids, in order), `graphDigest`,
  `generatedAt` (pinned compile stamp, e.g. `2026-09-21T12:00:00.000Z`),
  `eventSequences`, `presentationIntentDigest`.
- Current served file `/home/nolan/ping/var/fyd-projections/happy-place.json`:
  `dumpedAt` `2026-09-29T00:15:42.247654+00:00` (2026-09-28 18:15 MDT), written
  18:15 MDT — i.e. the served projection lags every approval since 18:15 MDT
  by construction.

## SERVE-TIME PROJECTION READ (file / BFF / cache)

**Path:** `/sites/happy-place` (`src/app/sites/happy-place/page.tsx`) and
`/sites/coppersmith-plumbing/page.tsx` → `compilePublicSite(SITE_ID)` in
`src/app/sites/_shared/spec-pipeline.ts` →
`getVerifiedPublicProjection(siteId, "anonymous")` + `getPingObjectGraph(siteId)`
(`src/fyd/data/ping-object-source.ts`).

- **File, read directly, no BFF:** `getPingObjectGraph` does `readFile(join(
  projectionDir(), siteId + ".json"))` on every invocation — no in-memory
  cache, no Next.js fetch cache (`unstable_cache` absent repo-wide), no
  `revalidate` export on the pages. The sync variant `getPingObjectGraphSync`
  exists for call sites that must stay sync (Ask FYD bundle loader).
- **No page-level caching config:** the `/sites/*` pages declare neither
  `force-dynamic`, `revalidate`, nor `generateStaticParams`. They are absent
  from `.next/prerender-manifest.json` (verified: zero `sites` entries) while
  present in `app-path-routes-manifest.json` — i.e. the production build
  (`next start` via `/home/nolan/start-3100.sh`, build dated 2026-09-27 21:00
  MDT) serves them **dynamically, rendered per request**. (Caveat: the shipped
  `.next` page bundle still mounts `DemoOwnerMode`, which the current source's
  PROD-1 rule forbids on `/sites/*` — the build is stale relative to source;
  read path mechanics are unaffected.)
- **What it takes for the page to see a new projection:** nothing but the file
  being re-dumped. No restart, no revalidation endpoint, no rebuild — the next
  request re-reads `/home/nolan/ping/var/fyd-projections/<site>.json` from
  disk, re-verifies `graphDigest` / `presentationIntentDigest` fail-closed,
  recompiles the spec via `generateSiteSpec`, applies the intent layer via
  `applyPresentationIntent`, and renders. The pipeline is: journal event
  (canonical) → `dump.py` (derived) → atomic file swap → per-request file read.
  The only missing link is the trigger for step 2.

## SMALLEST SEAM

**Exact module + boundary:** the `committed`/`replayed` outcome branch of
`handleApprove` in `src/app/api/fyd/customize/route.ts` (lines ~537-567),
immediately after `emitOverlayEvent` (defined `src/fyd/customize/server.ts`
line 564) returns `{ eventId, deduped }`. This is the one place in the served
codebase where (a) the canonical event id is known, (b) the journal write is
confirmed committed, and (c) tenant/site identity is already validated
(`TENANT_ID_PATTERN`, demo-owner gate). Everything else in the chain already
exists: the dumper entrypoint (`dump.py <site>` + `FYD_OVERLAY_JOURNAL=demo`),
the atomic file swap, the per-request re-read, the version vector in `meta`.

**Minimal wiring (describe only — not implemented):** after a `committed`
outcome (and arguably `replayed` too, since a replayed event may also be
missing from the file), invoke the existing dump entrypoint for that `siteId`
with the demo-journal env, bounded timeout, capturing exit code and the
resulting `meta.overlayEventIds`; verify the returned `eventId` is present in
the new file's `overlayEventIds` before reporting success; attach the outcome
to the approval JSON (e.g. `projection: { regenerated, overlayEventIds,
error? }`). This is deliberately NOT a bare shell bolt-on: the seam is the
post-commit callback point, and the trigger should live in a small server-only
module (e.g. `src/fyd/customize/projection-trigger.ts`) that owns the
journal-selection env, the timeout, and the post-dump event-id verification,
so the approval handler keeps its current shape.

**Cleaner convergence alternative (same size, different authority):** route the
`/sites` compile seam (`spec-pipeline.ts`) through the already-REACHED
in-process live projection `getFydTenantGraph` (`src/fyd/data/fyd-tenant-graph.ts`)
instead of the dump file. It is the same overlay engine ported op-for-op,
rebuilt per request with no cache (Ask FYD already enjoys immediate
post-approval visibility), digest-pinned at both layers, and returns the same
`(graph, presentationIntent, meta)` contract the page needs. This eliminates
the dump step from the served path entirely and makes the projection a pure
function of (fixture + live journal) — one projection authority instead of
two (file dump vs in-process). Trade-off: it shifts digest-pin maintenance
(`FYD_TENANT_PINS.baseDigest`) into the serve path and needs the
`presentationIntentDigest` parity check the file seam already has.

## FAILURE SEMANTICS

- **dump.py is cheap and synchronous** in demo mode: one localhost JSONL
  pre-flight GET + paginated event GETs on `127.0.0.1:18199`, a fixture file
  parse, in-memory overlay application, one atomic file write. No network
  beyond loopback, no docker hop (that's the main-mode path only). A sync
  post-approval regeneration is therefore feasible without blocking concerns
  at demo scale; the approval already holds the per-site idempotency lock
  (`runIdempotentWrite`) and a 10s journal timeout, so the regen cost is in
  the same order of magnitude.
- **The invariant holds without blocking approval:** APPROVED is canonical the
  moment the journal gateway returns the `event_id` — the approval MUST be
  reported committed regardless of regen outcome, because the projection is
  derived truth and may honestly lag. If regeneration is async (a future
  queue/worker), the `meta.overlayEventIds` field is the convergence check:
  the file converges when it contains the approved `event_id`; until then the
  page serves the previous verified projection (never a partial one, thanks to
  atomic rename + fail-closed digest verification). A regen failure (exit 2,
  gateway down, malformed op) surfaces as an honest `projection.regenerated:
  false` with the typed reason — never as approval failure, never silent —
  and is retryable by re-running the dump or by re-POSTing approve with the
  same `request_id` (idempotent replay → trigger re-fires).
- **Atomic-swap mechanism already present:** `os.replace` tmp+rename in
  `dump_site`; serve-time `graphDigest` + `presentationIntentDigest`
  re-verification means a torn or foreign write fails closed rather than
  rendering. The version vector (`dumpedAt`, `dumperVersion`,
  `overlayEventIds[]`, `graphDigest`, `presentationIntentDigest`,
  `baseDigest`, `fixtureFileDigest`) is complete: `overlayEventIds` alone
  answers "does this file include event X?", and the two digests answer "is
  this file exactly what the dumper derived?". No new versioning machinery is
  needed — only the trigger.

## FAILURES / GAPS ENCOUNTERED

- None blocking. CMD quoting on the Pig transport required single-keyword
  greps (pipes in patterns break `wsl -- bash -c` via CMD); all queries were
  completed with that constraint.
- `test_dump.py` was not executed (read-only lane posture; it would also write
  `__pycache__` artifacts).
- Dirty working tree noted: ~20 modified files on the harvest branch vs HEAD
  `f877c391` (mostly `ask` lane tests + `customize/route.ts` itself). Findings
  above describe the working-tree code as read.
- Not verified live: whether `:3100` is currently running and which build it
  serves; the prerender-manifest analysis is from the `.next` build dated
  2026-09-27 21:00 MDT.
