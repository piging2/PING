# Mission Control / ORCA / TenantOS frontier survey (recon, 2026-09-27 ~12:15 MDT)

READ-ONLY survey. No code changed, no branches, no commits, no pushes, no
Pig writes, no credential access, no HPP original contact, no :3100/:3200
contact. Everything below is from on-VM reads in this sandbox.

Explicit exclusions (per task, not re-done):
- Sibling stream's staged MC->FYD wiring patch
  (`~/workspace/goals/ping-agent-execution-stack/hidden_files/mc-fyd-wiring-2026-09-27/patch/`,
  SEAM-PROPOSAL.md, APPLY.md): verified 39/39 with mocks. Referenced, not re-verified.
- Shape A site console (branch `mc/fyd-shapeA-site-console`) and Shape C
  observer: verified, serving parked. Not re-verified.
- The 100-gap list (`~/workspace/orca-mc-convergence/MC-GAPS-100.md`,
  compiled 2026-09-26): referenced by number, not duplicated. This recon
  ranks what comes NEXT, one layer above that list and the sibling's patch.
- `:3100`, `:3200`, frozen trees, Pig-side paths
  (`/home/nolan/...` reads were skipped as writes were never attempted).

## Surfaces surveyed

| Area | What it is | Status |
|---|---|---|
| `~/workspace/mission-control/` | Python MC spine: `mission_intent.py` (front door), `emit.py` (MC_* journal vocabulary), `frontdoor_adapters.py` (legacy-caller migration registry), `payload_lifecycle.py`, `pass_queries.py`, `project.py`, `backfill.py`, `tests/` | LIVE (local; journal at `~/workspace/fyd-journal-gateway/events.jsonl`, 42 events, MC_PASS_* + MC_MISSION_* present) |
| `~/workspace/lane-p01/tree/` | Lane D dispatch exemplar (TS Next.js slice): `src/app/api/mc/dispatch/route.ts`, `src/app/api/mc/missions/`, `src/app/api/mc/_lib/mc-dispatch.ts` | EXEMPLAR, UNTRACKED. Sibling proposal says byte-identity vs the Pig-side deployed checkout is UNVERIFIED-LOCAL (transport PROXY_FAILED). Never emitted a local event (no `mc-d-` event_ids in the journal). |
| `~/workspace/orca-adapter/` | Live per-call fail-closed gate: `adapter.js` (`authorizeWorkOrder`/`issueWorkOrder`), `outcomes.js`, canonicalization, evidence | LIVE (the grant authority both front doors project) |
| `~/workspace/orca/` | Effect taxonomy (`effect-classes/`, 10 classes), `port/effect_adapters/` (class_05c/d, 08, 09), `hold-verify.js`, `falsify-driver.js`, `verify-chaos.js`, `unknown-outcome-experiments/` | DOC/EXPERIMENT. `hold-verify.js:7` hardcodes `require('/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js')`: Pig-bound, cannot run in this sandbox. |
| `~/workspace/orca-mc-convergence/` | Batch 6 convergence track: SWARM-QUEUE.md, SCOREBOARD, hermes-proof, inventories; front door certified ~01:55 UTC 2026-09-27 (RE-FALSIFIER @ 537d264, 14/14 + 40/40) | LIVE (Pig-side branches), certified |
| `~/workspace/orca-dispatch-test/`, `~/workspace/orca-remediation/`, `~/workspace/orca-workstream-d/` | Witnessed hermes control loop (orca-run-mu6wmbzn 2026-09-18), adapter remediation, external-agent profiles (`AGENT_PROFILES.md`) | LIVE history / PROTOTYPE |
| `~/workspace/tenanos-wave/` | TenantOS convergence wave: STATE.json (44 proposals: 39 integrated, 2 written, 1 rejected, 1 duplicate, 1 rejected_from_wave), `diffs/` (34), `impl/P-20260923-002..009` (local TS copies: runs schema, leases, claims, budgets...), swarm dirs, WAVE-LEDGER.md | FROZEN-ISH. Integration branch `tenanos-wave/integration` is Pig-side; this VM holds diffs + 8 local impl copies only. No on-VM replay. |
| `~/workspace/tenant-os/marketing-mission-control/` | Product spec: SPEC.md (BANKED 2026-09-25) + IMPLEMENTATION-PROMPT.md | SPEC ONLY. No code. Build starts only on Nolan's explicit go (not yet given). |
| `~/workspace/fyd-journal-gateway/` | Local demo journal (server.mjs, events.jsonl) | LIVE (demo) |

## Competing authorities (SOUL section 6)

Two implementations that can independently exercise the same capability.
Each pair below is a real, observed divergence in this sandbox, not a
style difference.

1. **Dispatch front door, idempotency semantics.**
   - `~/workspace/lane-p01/tree/src/app/api/mc/dispatch/route.ts:256`:
     `missionId = 'mc-m-' + sha256('mission|agent|tenant|capability|promptDigest|ts')`.
     The timestamp is IN the id, so every POST is a new mission. No
     idempotency-key field. Sibling proposal confirms: "No idempotency
     key on POST: re-POSTing creates a NEW mission."
   - `~/workspace/mission-control/mission_intent.py` (submit path, Batch 6
     certified 2026-09-27 ~01:55 UTC @ 537d264): tenant-keyed idempotency,
     `canonical_intent_hash` over capability/actor/tenant/mission_class/
     event_bind/inputs, fail-closed E2 (same key + different bytes refuses).
   - The FYD website (sibling patch) dispatches through the TS route, so
     the FYD->MC path gets the weaker semantics. Two front doors, two
     retry behaviors, same `tenant::<id>` namespace claim.

2. **Journal write path.**
   - `~/workspace/lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts:23`:
     `JOURNAL_PATH = '/home/nolan/workspace/fyd-journal-gateway/events.jsonl'`
     (hardcoded absolute Pig path; `loadJournalEvents()` returns `[]` when
     absent; `appendFileSync` throws ENOENT on machines where the dir does
     not exist).
   - `~/workspace/mission-control/emit.py`: `JOURNAL_FILE = os.environ.get(
     "MC_JOURNAL_FILE", os.path.expanduser("~/workspace/fyd-journal-gateway/events.jsonl"))`
     (env-overridable, home-relative).
   - On the Pig both resolve to the same file by accident of username. On
     this VM (user `hatch`) and any future checkout they fork. The "single
     journal is the store" claim holds only where the operator is nolan.

3. **Tenant registry.**
   - `~/workspace/lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts:33`:
     `SLICE_TENANTS = ['happy-place', 'coppersmith-plumbing']`.
   - FYD website: per-page `SITE_ID` constants + `tenant-context.ts`
     (Pig-side). The namespace regex `^(core|tenant)::[a-z0-9_.-]+$` is
     duplicated in TS (`route.ts:262` mints `tenant::<id>`) and python
     (`mission_intent.py` `_RE_NAMESPACE` pre-check).
   - Vocabulary shared, registry not. A third tenant added to the FYD
     surface gets `400 bad_tenant` from the dispatch plane with no
     operator signal.

4. **Mission runtime (Pig-side, recorded from swarm-08 audit, not re-audited).**
   - Canonical: `ping_missions` via MissionRuntime (`/mc/missions/*`,
     `/missions/*`) — PROVEN in swarm-08 MC-AUDIT.md.
   - Shadow: `engine._missions` in-memory (`/orchestration/missions*`,
     `engine.js` Pig-side) — FAKE, non-deterministic IDs, no durability.
   - Proposal P-20260923-083 deprecates the shadow reads (410 + canonical
     pointer); resolution state is in the wave ledger (Pig-side).

Deliberately NOT gaps (checked, single owner confirmed):
- `mission_intent.py` vs orca-adapter `authorizeWorkOrder`: the module
  projects authority, makes none (Batch 6 adjudication). Not competing.
- `emit.py` MC_EVENT_TYPES vs lane-D MC surface vocabulary: the docstring
  (`emit.py:9-16`) declares they must be merged not forked, and the
  front-door types (MC_LANE_UNKNOWN, MC_REVOKED, REVOKED_AFTER_DISPATCH)
  are registered in both (`emit.py:72-77`). Registration is complete;
  only the cross-file merge discipline remains (prose note, not a bug).
- `orca/port/effect_adapters/` vs MC event emission: adapters emit
  EFFECT_* domain events through the same journal envelope; no second
  store.
- Batch 6 lanes (front-door, consequence, budget, audit, approval,
  pass-migration): certified by independent re-falsifiers 2026-09-27
  ~01:53-01:55 UTC. Not re-run here.

## RANKED GAPS

Ordered by leverage. Every gap is the NEXT layer above the sibling's
verified wiring patch. No speculative frameworks.

### Gap 1. The FYD website dispatches through the front door with the weaker idempotency semantics

Harvest source: Batch 6 certified `mission-control/mission_intent.py`
(tenant-keyed idempotency, canonical_intent_hash, fail-closed E2 same-key
different-bytes refusal; RE-FALSIFIER certified @ 537d264).

Concrete failure: the sibling's FYD dispatch panel POSTs to
`POST /api/mc/dispatch` (`route.ts:214`), whose mission id embeds the
timestamp (`route.ts:256`). A retried POST (network retry, double-click,
a bug in the 5s mission poller) creates a DUPLICATE mission with a real
work order behind it, while the spine-lane front door would have returned
the original dispatch record. "The UI must never blind-retry" is UI
convention in the proposal; it is not a contract.

Smallest delta: port the certified idempotency contract into the TS
dispatch route: accept `idempotency_key` in the POST body, dedupe on
tenant-keyed canonical intent bytes, fail closed (409) on same-key
different-bytes. Reuse `mission_intent.py`'s canonical_intent_hash field
list so the two front doors converge on one semantic.

Falsification test: submit identical intent twice -> same missionId,
one MC_MISSION_CREATED; submit same key with different prompt bytes ->
409 refuse, no second work order. Today: two distinct missionIds, zero
refusal. (Pig-side apply; cannot run in this sandbox.)

### Gap 2. Journal path has two authorities; the exemplar's is a hardcoded absolute Pig path

Harvest source: `mission-control/emit.py` `MC_JOURNAL_FILE` env pattern
(env-overridable, home-relative default).

Concrete failure: `mc-dispatch.ts:23` hardcodes
`/home/nolan/workspace/fyd-journal-gateway/events.jsonl`. On this VM the
path does not exist; `loadJournalEvents()` silently returns `[]` (the
banned absence-of-evidence) while `appendFileSync` would throw ENOENT the
moment it tries to write. The python front door writes to
`/home/hatch/workspace/fyd-journal-gateway/events.jsonl`. Two emitters,
two path authorities, one shared claim ("the journal is the store") that
is true only on the Pig.

Smallest delta: one journal-path authority: TS reads
`process.env.MC_JOURNAL_FILE` with a home-relative fallback (same
derivation as `emit.py`); fail closed (throw with a named error) when the
journal directory does not exist instead of returning `[]` and later
writing a shadow file.

Falsification test: with `HOME=/tmp/probe-home` and identical
`MC_JOURNAL_FILE`, emit one event from the TS emitter and one from
`emit.py`; assert exactly one file grows and each reader sees both
events. Today the TS path is a hard constant, so the test fails at setup.

### Gap 3. Tenant registry is hardcoded twice; no single tenant authority

Harvest source: the shared namespace vocabulary
`tenant::<id>` (TS `route.ts:262`, python `_RE_NAMESPACE`).

Concrete failure: `SLICE_TENANTS` (`mc-dispatch.ts:33`) is a compile-time
array. When the FYD product adds a third tenant (the sibling proposal's
Case B already contemplates config drift), dispatch 400s `bad_tenant`
while the FYD page happily renders: a silent capability loss visible only
to the operator trying to dispatch. The FYD side's tenant list
(`tenant-context.ts`, per-page `SITE_ID`) and the MC side's allowlist can
only drift apart.

Smallest delta: one tenant-registry module (list + tenant-key regex)
imported by the TS dispatch route AND the FYD site pages; both derive
their allowlists from it; `SITE_ID` constants stay the page-side source of
truth for tenant binding (sibling design preserved).

Falsification test: add a tenant to the registry; the dispatch catalog
GET must list it and POST must accept it with no other code change. Today
it requires editing the const array.

### Gap 4. The bypass detector's registry holds exactly one class: the read-only one

Harvest source: `mission-control/frontdoor_adapters.py` (`MIGRATED_CLASSES`,
`is_bypass_illegal()`, `detect_bypass()`).

Concrete failure: the only migrated class is `"spine-observe-dry-run"`
(`frontdoor_adapters.py:39-47`), a read-only dry-run observer that emits
nothing: the safest possible class, with zero external-effect exposure.
Every real dispatcher (engagement crons, cron.d entries, fyd-factory
claim.sh, Hermes prompts) runs outside the front door and
`detect_bypass()` is legally blind to all of them ("bypass detection only
applies to migrated classes" -> ValueError). The MC-GAPS-100 #1 vision
("nothing dispatches except through the control plane") is true by
vacuity. SWARM-QUEUE.md item 14 (bypass discovery sweep, read-only) is
queued, not done.

Smallest delta: run the queued read-only bypass-discovery sweep, then
migrate the second class (one engagement pass, narrowest external-effect
scope) with a replay test; publish "N of M classes migrated" as the
coverage statement. No new machinery needed.

Falsification test: with a direct legacy-caller execution event for the
new class in the journal, `detect_bypass()` must flag; and the registry
must report its own coverage (today it cannot name how many mission
classes exist outside it).

### Gap 5. No persisted CANCELLED state, no cancellation API

Harvest source: MC-GAPS-100 #7 (still open); terminal vocabulary in
`sibling SEAM-PROPOSAL.md` (SUCCEEDED|FAILED|UNKNOWN|DENIED) and
`mission_intent.py:120-124`
(TERMINAL_EVENT_TYPES = {MC_LANE_COMPLETED, MC_LANE_FAILED, MC_LANE_UNKNOWN}).

Concrete failure: a mission dispatched in error (a Gap 1 duplicate, a
wrong-tenant dispatch, a bad prompt) cannot be stopped through the
control plane. Operators kill processes by hand or wait out the
ollama/identity deadlines. A control plane that cannot stop work does
not control it. Neither the python vocabulary nor the TS routes contain
the string CANCELLED (grep confirms absence in both trees).

Smallest delta: add `MC_MISSION_CANCELLED` terminal + `POST
/api/mc/missions/[id]/cancel` recording a typed event and setting an
executor-visible stop flag; executors check it at stage boundaries. If a
transport cannot be interrupted (broker/remote), the executor must report
that honestly (UNKNOWN semantics), not pretend.

Falsification test: dispatch (ollama), cancel before terminal ->
mission projects CANCELLED; the executor's next stage-boundary check
observes the flag. Today: no cancel route, no terminal state.

### Gap 6. Reaper-vs-HOLD: lease expiry auto-retries unknown-outcome missions [QUEUED DEPENDENCY: Nolan's word]

Harvest source: AGENTS.md (2026-09-24): "Reaper-vs-HOLD design gap (open,
needs Nolan): after a HOLD record, mission leaves _processing, lease
expires, reapExpiredLeases resets to created and re-dispatches ~60s
later. That is an automatic retry of an unknown-outcome mission. Do not
deploy the stuck-running watchdog until the design word lands."

Concrete failure: a mission the system deliberately parked as
OUTCOME UNKNOWN is retried automatically by the lease reaper as if it
were an ordinary timeout: the exact retry Nolan's UNKNOWN rule forbids.
The `hold-verify.js` verifier in this sandbox cannot adjudicate it: it
hardcodes `require('/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js')`
(`~/workspace/orca/hold-verify.js:7`), so it runs Pig-side only.

Smallest delta: none available to a lane. This is a design decision:
Nolan's word on whether the reaper must skip HOLD-recorded missions
(and whether REVOKED_AFTER_DISPATCH's in-flight-uncertain classification
extends to the reaper path). A lane cannot decide it; the record is the
work product.

Queued dependency: Nolan's design word. Do not implement the watchdog
workaround until it lands.

### Gap 7. The TenantOS wave's 39 integrated proposals have no on-VM replay

Harvest source: `~/workspace/tenanos-wave/` (STATE.json: 39 integrated;
`diffs/` 34 diff files; `impl/P-20260923-002..009` local TS copies with
tests, e.g. `impl/P-20260923-002/src/tenanos/runs/schema.ts` +
`__tests__/runs-schema.test.ts`).

Concrete failure: the substrate frontier was closed "~11:15 MDT" on
evidence that lives on the Pig (`tenanos-wave/integration` branch, base
tag `tenanos-wave-base-20260923` at e48ef710 in `/home/nolan/projects/ping`).
From this VM the wave is un-replayable: no `src/tenanos/**` checkout, only
8 of 39 proposals as local code and 34 as diffs. If Pig transport stays
down (it has flapped repeatedly today: PROXY_FAILED ~11:16 MDT,
per the substrate recon's Gap 5), the entire TenantOS substrate layer is
evidence nobody can re-run. Per the 2026-09-26 lane doctrine, a lane's
green claim counts only after independent replay from a clean checkout.

Smallest delta: on transport recovery, fetch base tag + integration
branch to a local worktree, run the scoped `src/tenanos/jest.config.cjs`
suite (P-20260923-001's own enabler) from a clean checkout; record
PASS/FAIL per proposal. Partial delta available now: the 8 `impl/`
copies can be replayed standalone against their bundled tests.

Falsification test: clean-checkout replay exit codes per proposal; a
proposal whose tests fail from the clean tree is re-opened as a gap.

Queued dependency: Pig transport for the base tag and integration
branch (this VM's PING checkout is `github.com/piging2/PING`, not the
website repo, so the tag is not fetchable locally).

### Gap 8. Marketing-mission-control is spec-banked; its named substrate gaps are status-UNKNOWN from here [QUEUED DEPENDENCY: Nolan's go]

Harvest source: `~/workspace/tenant-os/marketing-mission-control/SPEC.md`
section 5 (substrate binding): G1 deploy Lane L (tenant_id on
ping_events + route gates, "already in the working tree"), G2 Qdrant
filter key aligned to namespace, G3 canonical_events revival gated on
deliberate revival; section 14 (build starts only on Nolan's explicit go
after the 2026-09-25 18:15 MDT checkpoint).

Concrete failure: none yet, by design. But G1's "already in the working
tree" is a Pig-side claim this VM cannot re-verify; if the working tree
moved on, the unblocking item for TenantOS certification may have
evaporated silently. And the spec itself cannot advance past BANKED
without Nolan's go, which memory shows has not arrived (the 19:00
adjudication freeze and the FYD-first burn order both outrank it).

Smallest delta: read-only status check on transport recovery (does Lane L
still exist in the tree? is G2's namespace filter live?); then hold for
Nolan's go. No builder work.

Queued dependency: Nolan's explicit go (SPEC section 14). Do not build.

## UNKNOWNs (fail-closed)

- Pig transport: not re-probed by this recon (the substrate recon's
  ~11:10-11:15 MDT PROXY_FAILED observations stand; no claim made here).
- Byte-identity of `lane-p01/tree` vs the deployed Pig dispatch routes:
  UNVERIFIED-LOCAL (sibling proposal; inherited, not re-checked).
- `tenant-context.ts` and the FYD website's tenant list: Pig-side,
  cited from the sibling proposal, not observed here.
- Swarm-08's FAKE findings (`/orchestration/missions*` shadow authority)
  and P-20260923-083's resolution: recorded from the wave ledger
  (2026-09-23/24), not re-audited. Marked as resolved-in-wave; re-audit
  queued on transport recovery if the parent wants confirmation.
- Whether Nolan has given the marketing-mission-control go: no go found
  in memory or in the spec's own state. Treated as not given.

## Prior art indexed (not re-done)

- `~/workspace/orca-mc-convergence/MC-GAPS-100.md` (100 gaps, 2026-09-26):
  this recon's gaps are new or narrowed vs that list. Gap 1 narrows #1
  (single front door -> idempotency divergence at the FYD dispatch path);
  Gap 5 is #7 still open; Gap 4 is the registry-side of #14; Gap 6 is the
  AGENTS.md-recorded open design question in #13's neighborhood.
- `~/workspace/orca-mc-convergence/SWARM-QUEUE.md` items 14 (bypass sweep)
  and 15 (restart/recovery falsification): queued, referenced in Gaps
  4/6, not claimed done.
- Sibling `SEAM-PROPOSAL.md` section 7 queued items (Case A/B check,
  wiring branch, byte-verify catalog): referenced, not executed.
- Wave falsifier cycle 2026-09-27 ~01:49-01:55 UTC (front-door,
  consequence, budget, audit re-certified): referenced, not re-run.
- ORCA-GAP-TABLE.md harvest verdicts (P-20260923-002..006): the
  ADAPT proposals are the 39 integrated; their on-VM replay is Gap 7.

## Method note

Read-only: `muse.read`/`muse.exec` (ls, grep, python3 counters) only. No
file contents modified, no processes started on the Pig, no credentials
read. One new file written: this recon.

## MC-1 confirmation (2026-09-27 ~13:25 MDT, backlog-burn)

CONFIRMED by direct code reading of
`~/workspace/lane-p01/tree/src/app/api/mc/dispatch/route.ts` (no test
needed; the defect is structural):
- Line ~253: `const ts = nowIso();`
- Line ~255: `const missionId = 'mc-m-' + sha256hex(['mission', agent, tenant, capability, promptDigest, ts].join('|')).slice(0, 12);`
- The POST body parser reads only `prompt/agent/capability/tenant` — no
  `idempotency_key` field is accepted.
- The string `idempotency` occurs 0 times in the file; the POST handler has
  no find-existing/dedupe lookup before minting.
- Consequence: a byte-identical retried POST (network retry, double-click,
  poller bug) mints a NEW missionId and a new real work order. The "UI must
  never blind-retry" rule is convention, not contract.
- Severity: P1 (duplicate real agent dispatches = duplicate cost/work).
- Fix ownership: the lane-p01 patch owner (this tree is another lane's
  surface; not edited here). Smallest delta per the recon: accept
  `idempotency_key` in the POST body, dedupe on it, return the original
  dispatch record on a repeat key.
