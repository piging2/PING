# Pig Convergence Work Order — Execution Plan (drafted during Phase 0 wait)

Gate: health-state.json status==UP AND SSH probe confirms /home/nolan/ping accessible.
Baseline verified 2026-09-30 ~08:10 MDT: HEAD 546b62d76881bf6b9ddd425aeac40ac7b47ccafe,
branch lane-b/tenant-dispatch-threading (matches expected). Dirty: deleted
CascadeProjects/infra/ui-next/.next/* (build artifacts removed by incident-zero
cleanup; owned by convergence/dirty-tree law, not this lane).

GATE BLOCKER (as of ~08:20 MDT): health status DEGRADED on ask.read_path_healthy.
Root cause chain (read-only probes):
- ask-probe.sh POSTs {"question":"watchdog ping"} to :3100/api/fyd/ask/happy-place
  -> {"ok":false,"kind":"projection_unavailable","error":"I could not load this
  site's data..."}.
- 3100.log: answerAskFyd: projection load failed for site "happy-place":
  fyd-tenant-graph[reader_failed]: overlay read failed: PING gateway unreachable:
  fetch failed.
- Served :3100 (PID 1112) env: FYD_JOURNAL_GATEWAY_URL=http://127.0.0.1:18200.
  Nothing listens on :18200 (curl 000). :18199 (frozen-tree gateway) is up.
- server.mjs supports FYD_JOURNAL_PORT; convergence tree has its own
  tools/fyd-journal-gateway and data/fyd-journal/events.jsonl (55KB, Sep 29).
- No start-18200.sh exists; fyd-journal-gateway.log has zero :18200 mentions.
  The :18200 convergence-tree journal gateway was never launched; the launcher
  is missing, not crashed.
Remediation (needs coordinator authorization; gate forbids state changes):
  start a :18200 gateway bound to the convergence tree (FYD_JOURNAL_PORT=18200
  node server.mjs in /home/nolan/projects/ping-fyd-converged/tools/fyd-journal-gateway),
  or coordinator decision to repoint to :18199.

## Phase 1: B. POST-EFFECT REPAIR
Orca design harvested (cloud branch orca/effect-ledger-2026-09-30 @57df2cc):
- Outcomes vocabulary: completed/failed/unknown/denied/escalated; effect states
  effect_unknown/effect_hold/effect_none. UNKNOWN never collapses to success/failure.
- effect_ledger.js: recordEffect (deterministic effect_id = effect_+sha256(dispatch_key:attempt)[0:16]),
  promoteEffect appends a promotion record on definitive failure evidence ONLY
  (typed: definitive===true, known supported effect_class, non-empty evidence refs,
  observed_by named). Bare post-effect throw -> refused, next: effect_hold.
  effect_effected can NEVER promote to FAILED. Idempotent replay.
- failedFromEffectPromotion derives the FAILED verdict through terminalOutcome;
  evidence cited, never manufactured.
Defect (Pig): worker_runtime.js:126 rethrows handler errors;
mission_scheduler.js:401-409 routes every non-timeout throw to _failMission; only
DISPATCH_TIMEOUT reconciles.
Required semantics:
- EFFECT NOT ATTEMPTED -> ordinary failure/retry policy (FAILED, no effect hold).
- EFFECT ATTEMPTED + INDEPENDENTLY CONFIRMED -> EFFECT_CONFIRMED.
- EFFECT ATTEMPTED + RESULT UNCERTAIN -> UNKNOWN/HOLD_RECONCILE.
- NEVER unknown external effect -> FAILED -> automatic retry.
Work: git worktree add for a Pig-side branch off 546b62d; smallest patch in
worker_runtime.js + mission_scheduler.js introducing effect-attempted awareness
(adapted from orca semantics, not copied); run
/home/nolan/copilot-broker/evidence-burn/post-effect-throw.test.js (currently RED)
until GREEN; replay in a clean worktree before claiming GREEN.
Adversarial tests (7): (1) effect succeeded + bookkeeping failed, (2) effect timed
out after request, (3) provider response lost, (4) verification confirms effect,
(5) verification confirms no effect, (6) verification inconclusive,
(7) duplicate scheduler pickup.
Storage: test outputs to WSL /tmp or E: only; E: errors known, verify cheap writes.

## Phase 2: C. STALE DB DEFAULT
Find every 'crx_runtime' occurrence Pig-side; classify each: historical fixture /
documentation / legacy system / test / live default. Change ONLY the live
operational authority/configuration path; missing prod DB config must FAIL CLOSED
(not silently connect to obsolete DB). Report effective runtime resolution.

## Phase 3: D. HYBRIDSEARCH WIRING
HybridSearch instantiated in served bootstrap but unreachable. Expose smallest
sanitized read surface for Ask FYD: evidence-backed FYD results only. No raw
Qdrant, no secrets, no cross-tenant namespaces, no arbitrary event payloads.
No new authority, no second search system.

## Phase 4: E. FYD STAGE-EVENT EMITTER
Use existing canonical event spine. Trace:
FYD REQUEST -> MISSION -> ACQUIRE -> EXTRACT -> RESOLVE -> OBJECT GRAPH ->
SITE SPEC -> RENDER -> VERIFY -> RESULT.

## Phase 5: F. COPPERSMITH E2E
Only after E. One real generation via the FYD proceduralizer-proven source.
Capture: mission ID, tenant, source digest, stage events, evidence IDs, object
IDs, relationships, SiteSpec digest, render/build digest, served-page
verification, result, failure/hold state.

## Phase 6: G. INDEPENDENT VERIFICATION
Independently fetch served result; compare against expected build/result identity.
PASS/FAIL/UNKNOWN. Exit-zero is not success.

## Phase 7: K. MICRODATA DECISION
Branch harvest/2026-09-28 @2532e5a (Pig-side only). Criteria: uses existing
observation/evidence pipeline? provenance preserved? deterministic? no second
canonical extraction system? hostile fixtures pass? Verdict MICRODATA: MERGE|REJECT
with evidence. Merge in worktree, no push.

## Phase 8: P. CHROME USER-DATA
4.8G->8.0G on Pig C:. Classify (live profile/cache/code cache/GPU cache/
service-worker cache/downloads/CDP artifacts/stale automation profiles).
Move/delete ONLY disposable material with evidence. Report root cause + action.
No blind profile deletes.

## Phase 9: T. APPROVAL/EFFECT DURABILITY
Harvest BusinessActionAuthority + EffectAuthority as ONE unit. Give the EXISTING
storage interface a durable implementation on the existing backend. Preserve
PROPOSAL -> PENDING_HUMAN -> APPROVAL/DENIAL -> EFFECT ID -> ATTEMPT ->
VERIFICATION -> OUTCOME. No ProposalAuthority/EffectDatabase/ApprovalEventStore.

## Phase 10: S. OAUTH TEST
Find existing piging85 OAuth test procedure; run. Note: rotation COMPLETED
2026-09-30 ~07:52 MDT (Nolan regenerated secret in Google Cloud Console;
client JSON at /home/nolan/ping/credentials/client_secret.json, 600 nolan:nolan;
proven valid via invalid_grant-not-invalid_client probe). Full Drive OAuth needs
one-time browser consent (google_drive_oauth.py). Expected verdict likely
COMPLETE-with-evidence or BLOCKED-on-browser-consent. Never print secret.

## Phase 11: R. SURGICAL HARVESTS (priority)
1. send-eligibility false-positive fixes; 2. ORCA tenant pinning;
3. FYD UI motion ONLY if a FYD UI lane owns it (else skip w/ reason);
4. media rights-basis ONLY after missing dependency understood;
5. docs/ledger lessons. DO NOT POP orchestral unit. 900-line UI motion unit does
not outrank Coppersmith.
