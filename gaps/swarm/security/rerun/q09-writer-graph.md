# Q9 — SECURITY RE-RUN — Who can write canonical truth? — 2026-10-01 ~18:45 MDT

## PROPOSITION
Every code path that can append to the canonical journal
(`/home/nolan/projects/ping/data/fyd-journal/events.jsonl`, served by :18199)
passes through an authority/governance seam equivalent to the gateway's.
Any writer reaching canonical truth without equivalent authority = FAIL.

## EXACT SHA
- `/home/nolan/projects/ping` @ `feeed8315fab5f823f5923da745e25632664b275` (branch `fyd/builder-harvest-trackc-2026-09-28`)
- `/home/nolan/projects/ping-fyd-converged` @ `6405011d` (branch `fyd/convergence-2026-09-28`)
- Served :18199 gateway source == ping repo `tools/fyd-journal-gateway/server.mjs` at `feeed831` (cwd `/home/nolan/projects/ping/tools/fyd-journal-gateway`, pid 850, started Sep 30 07:15)

## EXACT PLANE
REPO (code forensics at the SHAs above) + SERVED (live Pig processes):
`:18199` pid 850, `:18200` (fork gateway) pid 40434, `:3100` pid 46070.

## COMMAND / REQUEST
Read-only inventory via `pigwsl-exec`: grep of all `appendFileSync`/`open(...,"a")` journal writes,
all `POST .../events` callers, all `FYD_JOURNAL_STORE` references, `/proc/<pid>/cwd` + `/proc/<pid>/environ`,
`ss -tlnp`, and file mtimes. No mutations; no writes issued.

## THE WRITER GRAPH (executable call chains)

### W1. Gateway POST /events — THE AUTHORITY SEAM
`ping/tools/fyd-journal-gateway/server.mjs:249` (route) -> `:343` (`appendFileSync(STORE, ...)`).
Authority: `FYD_JOURNAL_WRITE_TOKEN` bearer check (env-loaded from 0600 file
`~/.config/ping/fyd-journal-write-token` via `start.sh`; fail-closed 503 when unset),
`timingSafeEqual` comparison, tenant binding for `FYD_SITE_OVERLAY`
(tenant_id vs aggregate_id vs event_data.siteId, :293-312), `request_id`
idempotency (`deduped:true`, no double append), loopback-only bind.
STORE resolves to the canonical path (env `FYD_JOURNAL_STORE` unset on pid 850,
default `join(HERE,"..","..","data/fyd-journal/events.jsonl")`); gateway log confirms
`store=/home/nolan/projects/ping/data/fyd-journal/events.jsonl`.
VERDICT: PASS — this is the governed entry point.

### W2. emitOverlayEvent (owner-approved presentation intents)
`ping-fyd-converged/src/fyd/customize/server.ts:564` -> preflight journal identity
marker (`preflightJournal`, :154) -> `POST <gatewayUrl()>/events` with
`Authorization: Bearer <FYD_JOURNAL_WRITE_TOKEN>` (`gatewayWriteToken()`, :105).
Callers: `src/app/api/fyd/customize/route.ts:473,604`, reached only after the
demo-owner gate (private host + `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` +
`owner.customize-approve` capability + tenant-key assertion in
`scopedEmitOverlayEvent`, `src/fyd/tenant/scoped-stores.ts:147`).
Never touches the file directly.
VERDICT: PASS in code. **FAIL in the served plane**: the live :3100 process env
has `FYD_CUSTOMIZE_GATEWAY_URL=http://127.0.0.1:18200/events`, and :18200 is a
LIVE fork gateway (pid 40434, cwd `ping-fyd-converged/tools/fyd-journal-gateway`,
started Sep 30 11:03, store defaulting to
`ping-fyd-converged/data/fyd-journal/events.jsonl`, last write Sep 30 16:04).
The converged preflight marker (`EXPECTED_OVERLAY_JOURNAL_MARKER`) and
`FYD_JOURNAL_STORE` fail-closed fixes exist only in local commits (`6405011d`,
`feeed831`) — the served `.next` build predates them (BUILD_ID Sep 30 17:58).
So the highest-authority writer (owner approvals) currently appends to a fork
the canonical gateway cannot see. This is the Q1 truth-split, confirmed from the
writer-graph angle. file:line for the served misrouting: the live env value of
`FYD_CUSTOMIZE_GATEWAY_URL` on pid 46070 + `gatewayUrl()` at
`ping-fyd-converged/src/fyd/customize/server.ts:86`.

### W3. mc-dispatch.ts appendDispatchEvent (MC mission events)
`ping-fyd-converged/src/app/api/mc/_lib/mc-dispatch.ts:261` -> `:291`
(`appendFileSync(journalPath(), ...)`). DIRECT FILE APPEND — bypasses the
gateway entirely (no bearer check, no tenant validation, no request_id dedupe).
Authority seam: `journalPath()` (:33) fail-closed on unset `FYD_JOURNAL_STORE`
(config authority, prevents fork); route-level caller gates
(`x-mc-caller-key` -> 401, tenant entitlement -> 403, capability checks,
`src/app/api/mc/dispatch/route.ts:242-286`); event types hardcoded at call sites
(`MC_MISSION_CREATED`, `MC_RUN_QUEUED`, ...) — the `emit` closure at
`dispatch/route.ts:369` takes `type` only from route code, never the request body;
`journalHas(eventId)` dedupe before append.
Caveat (latent, not live): `appendDispatchEvent(eventType, ...)` takes an
unconstrained event-type string and mints envelopes with NO tenant_id; nothing
at the data boundary stops a future caller from minting an `FYD_SITE_OVERLAY`
event that skips the gateway's tenant-mismatch check.
VERDICT: PARTIAL — authority exists but is NOT equivalent to the gateway seam
(different checks, same trust domain). Not a FAIL today because the writer runs
inside the :3100 process that already holds the gateway write token — the bearer
protects against external processes, not against the trusted writer itself.

### W4. approvals/route.ts -> approval_cli.py -> emit.py (approval events)
`ping-fyd-converged/src/app/api/mc/approvals/route.ts:174`
(`--journal <journalPath()>`) -> spawn `python3 approval_cli.py`
(cwd **`/home/nolan/projects/ping/mc-approval`** — the OTHER repo, :62) ->
`approval_request.py:568 _emit` -> converged `ping/mc-approval/emit.py:230`
`emit_approval_event(journal_file=explicit)` -> `:130` direct file append.
Type-constrained to `MC_APPROVAL_*`. Authority: route gates (tenant entitlement
+ capability + 64-hex digest binding, `approvals/route.ts:144-163`) ->
`journalPath()` fail-closed -> explicit `--journal` (falls back to
`_canonical_journal_file()` fail-closed SystemExit, `emit.py:57-71`).
VERDICT: PARTIAL — same reasoning as W3 (bypasses gateway, same trust domain).

### W5. emit.py CLI direct invocation (MC_PASS_* / MC_* lane events)
`ping/mc-approval/emit.py` `_cli()` (`--type --pass-id --platform --data-json
[--journal]`), fail-closed when `FYD_JOURNAL_STORE` unset. Authority = Pig shell
(operator). No network exposure, no cron found referencing it
(only an archived lane manifest mentions it); no live scripted callers in the
served plane.
VERDICT: PASS (tool, not a network path; operator-trust only).

### W6. Tests
`f-journal-privacy.test.ts`, `h-crash-window.test.ts` reference
`FYD_JOURNAL_STORE` but use `mkdtempSync` temp stores only.
VERDICT: PASS — no canonical writes.

## DORMANT / LATENT WRITERS (not in the served plane; fork-recreation hazards)
- `ping-fyd-converged/mc-approval/emit.py` — STALE copy, `MC_JOURNAL_FILE`
  fallback -> `~/workspace/fyd-journal-gateway/events.jsonl` (a FORK path).
  Nothing in the served tree invokes it (served approvals point at the ping-repo
  copy). Manual invocation would silently write to the fork.
- `ping` repo Next routes `src/app/api/mc/_lib/mc-dispatch.ts:23` and
  `src/app/api/mc/approvals/route.ts:30` — hardcoded
  `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` fork path.
  That Next app serves nothing (no process); dormant unless ever deployed.
- `~/workspace/fyd-ask-graph-read/live-journal.js` — old stub gateway, not running.
- `apply-patch-reader.py` / `show-mystery.py` — readers / source-patchers, not
  journal writers. `technology/route.ts` — reads journal stats only.

## PASS / FAIL / UNKNOWN
**FAIL (served plane) / PARTIAL (code plane).**
The code-plane convergence (all writers fail-closed on `FYD_JOURNAL_STORE`,
single configuration authority, tenant gates at routes) is sound and locally
committed. The served plane defeats it: the served :3100 build predates the
convergence commits and its highest-authority writer (owner-approved overlays)
is live-routing to the :18200 fork gateway. W3/W4 bypass the gateway's
bearer+tenant seam with a weaker-but-present route-gate seam — acceptable only
because they share the gateway writer's trust domain; the unconstrained
event-type + tenant-less envelope in `appendDispatchEvent` is a latent bypass
waiting for a bad call site.

## SMALLEST FIX IF FAIL
1. Redeploy :3100 from the converged tree (`6405011d`) with `FYD_JOURNAL_STORE`
   set to the canonical path and `FYD_CUSTOMIZE_GATEWAY_URL` pointed at
   `:18199/events` (currently unset in the live env — the converged
   fail-closed code would 500 on journal access until it is set).
2. Retire the :18200 fork gateway after classifying its 69 events
   (journal-swarm Q2 owns the classification; do not delete first).
3. Harden W3: add an event-type allowlist + tenant-binding check at
   `appendDispatchEvent` (or route ALL writes through the gateway) so the
   direct path cannot mint overlay-class events that skip tenant validation.
