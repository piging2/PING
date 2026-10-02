All evidence is in. Final report.

# ONE REACHED LOOP PROOF — CONVERGENCE REPORT (2026-09-28)

Canonical tree reobserved on the pig WSL at `/home/nolan/projects/ping`, HEAD `0264d517`. The reached loop is the MC witnessed dispatch loop (`POST /api/mc/dispatch` → out-of-tree adapter → ollama/broker executor → adapter verify → journal → projection). One real business walked the loop as a traced proof: **Alpine Tree Service** (Grand Junction). T1 observation (2026-09-10, round-19 research): verified independent candidate. T2 observation (2026-09-13, round-44): own site announces it joined SavATree (national chain) → excluded per the no-franchise rule. Same identity, changed property, both evidence-linked (`research-scratch-round19.md`, `research-scratch-round100.md`, round-44 notes), projection recomputed (SUPPRESS-adjacent). The site's own announcement is an owner assertion; the exclusion is PING-side policy. Temporal law holds.

## CONVERGENCE TABLE

- OBSERVATION → PASS (dispatch parses `{prompt, agent, capability, tenant, idempotency_key}` fail-closed; BUSINESSES view reads live tenant graph + journal overlay ops)
- EVIDENCE → PASS (digest-verified overlay ops, `ping-event:<event_id>` refs, `result.json` carries `verified_at` + adapter `result_id`)
- CONTEXTPACK → FAIL (dispatch `context.json` is a params-only envelope `mc-ctx-<missionId>`; the real evidence compiler `src/fyd/ask/context-compiler.ts` exists but is NOT wired to the dispatch loop; ORCA knowledge path is declared-only)
- DECISION → PASS (adapter `authorize`/`issue`; denial → DENIED terminal; issue failure → UNKNOWN; authority owned by out-of-tree adapter at `/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js`)
- CAPABILITY → PASS (secret-broker redteam: single-use default, scope/audience/tenant gates, confused-deputy and never-broaden attenuation)
- EXECUTOR ELIGIBILITY → PASS (broker transport requires ACTIVE/DEGRADED + quota OK; ollama PROVEN, identity_5..10 denied)
- DISPATCH → PASS (deterministic `mc-m-sha256` ids from idempotency key, ordered lifecycle events, content-derived event ids)
- ATTEMPT IDENTITY → PASS (durable attempt record via idempotency-key-derived mission id; duplicate POST on terminal → original with `duplicate_suppressed:true`, zero new events)
- EFFECT CLASSIFICATION → PASS (FIXED_CONSTRAINTS read-only slice; executor block = UNKNOWN not FAILED; executor success ≠ verified)
- VERIFICATION → PASS (adapter `verifyResultEnvelope`; invalid → `MC_RUN_UNKNOWN`, non-retryable, must not reach canonical truth)
- OUTCOME → PASS (SUCCEEDED/FAILED/DENIED terminal; UNKNOWN first-class, never rendered FAILED, excluded from learning)
- CANONICAL EVENT → PASS (typed `MC_*` events to `/home/nolan/workspace/fyd-journal-gateway/events.jsonl`; `projectMissions()` re-projects deterministically per read, replay-safe)
- MC PROJECTION → PASS (TODAY/AGENTS/BUSINESSES/TECHNOLOGY/SEARCH/DISPATCH live from canonical sources; per-field claim vocabulary PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/CONFLICTING/PROTOTYPE/UNWIRED; unwired renders as UNWIRED/UNKNOWN, never green)
- COORDINATOR-DEATH RECOVERY → FAIL (409 HOLD on duplicate UNKNOWN exists in code but is UNTESTED; no dedicated reconciler exists; automated resume executor deliberately withheld; a killed coordinator's UNKNOWN missions enter HOLD and nothing ever reconciles them)
- DUPLICATE EFFECT PREVENTED → PASS (write-boundary lost-updates-zero tests, gateway dedupe survives restart, 409 never re-dispatches)
- SYNTHESIZED AUTHORITY PREVENTED → PASS (tenant re-derived server-side from `x-mc-caller-key` registry, body claims refused on mismatch, claim machine fail-honest reads, approvals digest-pinned with `VOLATILE_KEYS` excluding digest inputs)

## EDGE CLASSIFICATION (chain order)

intent→policy REACHED; policy→capability request REACHED; request→authority evaluation REACHED (out-of-tree owner); evaluation→issuance REACHED; issuance→executor eligibility REACHED; eligibility→WorkOrder REACHED; WorkOrder→dispatch REACHED; dispatch→attempt REACHED; attempt→effect REACHED (constrained); effect→result REACHED; result→verification REACHED; verification→reconciliation PARTIAL (HOLD machinery code-only, no reconciler); reconciliation→outcome PARTIAL; outcome→canonical event REACHED. The EVIDENCE→ORCA CONTEXT edge (before DECISION): the loop compiles no evidence-bound package; the model reasons from the raw prompt while `context.json` carries request params. That is the first failed edge.

## 10 ATTACKS

1. Redeem twice → PASS EXISTING (`secret-broker.redteam.test.ts` "single-use default: second execution is rejected")
2. Execute outside funnel → PASS EXISTING w/ gap (scope/audience/tenant redteam + write-boundary derive gate; customize apply server path and mc-dispatch untested)
3. Worker self-grant → PASS EXISTING (confused-deputy + never-broaden; d-worker fail-closed contextless runs)
4. Expired lease resurrection → PASS EXISTING (expired-handle/renewal-denied/max-lifetime tests)
5. Corrupt/missing authority on restart → PASS EXISTING (claim machine fail-honest reads; ledger corrupt-line skip; crash-window torn writes)
6. Stale approval on changed transition → PASS EXISTING (stale-guard H2 TOCTOU recheck: STALE_APPROVAL/PRECONDITION_CHANGED with zero writes)
7. Executor dies after possible effect → PASS EXISTING (crash-window retry-converges; lost-updates-zero ×2; gateway dedupe survives restart)
8. Tenant spoof → PASS EXISTING (g/e/a/f suites: A→B, B→A, aggregate_id, meta.siteId spoofs refused)
9. Evidence retraction after compilation → MISSING (no test; nearest is post-verification tamper detection, not retraction)
10. Coordinator death at boundaries → MISSING as tests (409 HOLD + terminal dedupe exist in `mc-dispatch.ts` code only; zero tests reference it; claim-machine transition guards are the only covered boundary)

## DONOR REOBSERVATION

Talos single-use → PASS EXISTING, write nothing. Talos TOCTOU → PASS EXISTING, write nothing. Nerve attempt-identity/CAS → PARTIAL (terminal dedupe + HOLD in code, untested, no reconciler). Nerve drain-before-drive → ABSENT (moot by design: no auto-redispatch exists). POLYROB UNKNOWN-excluded-from-learning → PASS EXISTING, write nothing. POLYROB wake-fingerprint → UNKNOWN (wake loop not surveyed). Pioneer credential fencing → PASS EXISTING per rotation evidence below. Pioneer authority-integrity gate → PASS EXISTING for surveyed paths. Hivekeep/stating-context invariants → ABSENT (no ranking exists to skew; no promotion test). MatrixClaw normalized events → PASS EXISTING; persisted external attachment → ABSENT (executors are inline; moot for the read-only slice).

## /HEALTH (truthful, not green)

1. `event_governance` NAMESPACE_VIOLATION ×963 (all `JEV_DECISION_EVALUATED`; namespace `jev` missing from `NAMESPACE_OWNERS`; cumulative zero-threshold latch) → ACTIVE degradation whose root cause is DETECTOR_DEFECT (policy-map gap in the Sep-24 image, not a genuine breach). 3 jev-shadow missions in permanent fail→retry loop. 503 is truthful that governance is rejecting events, false that they are real violations.
2. `embedding: not_initialized` (Qdrant 401, no API key at init) → ACTIVE, truthful init failure. Bonus: the `qdrant: healthy` reading is a weak detector (probes authless `GET /`).

## ROTATION AS RECOVERY EVIDENCE (incident CLOSED)

DB authority (`brain-postgres`/`ping_runtime`) and gateway env fingerprints agree exactly on both new keys; `last_used_at` post-restart proves new-key authentication; old keys 401; no-key 401; stale scan found old material only in stopped container configs (dead, nothing running consumes them); zero secret-material leaks in logs/artifacts surveyed. Long-lived consumers re-resolved to the new authority with no retry storm. MC could show the degradation (TECHNOLOGY/TODAY read gateway health live) but has no rotation-specific explainer → PARTIAL on "MC explains the degradation."

## FIRST BROKEN EDGE

- FIRST BROKEN EDGE: EVIDENCE → ORCA CONTEXT. The dispatch loop mints `context_pack_id = mc-ctx-<missionId>` from request parameters only; no evidence-bound, staleness/conflict-tagged knowledge package is compiled before decision or handed to the executor. The locked invariant "MODELS CONSUME COMPILED EVIDENCE; THEY DO NOT RETRIEVE TRUTH" is violated at the first knowledge edge.
- AUTHORITY OWNER: MC dispatch lane owns the call site (`src/app/api/mc/dispatch/route.ts:314`); the compiler owner (FYD Ask lane) owns `src/fyd/ask/context-compiler.ts`.
- EXISTING IMPLEMENTATION: `compileAskContext()` in `src/fyd/ask/context-compiler.ts` — deterministic, byte-budgeted ContextPacket from the live tenant object graph + field-level evidence registry (`obj:/field:/rel:` ids), viewer-tier visibility filtering, claim vocabulary PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/CONFLICTING. Plus the PingObjectReader seam in `src/fyd/data/fyd-tenant-graph.ts` (digest-verified live overlay).
- DONOR TEST THAT EXPOSED IT: Hivekeep/POLYROB standing-context + evidence-retraction invariants; attack #9 MISSING (no compilation-with-evidence path exists to retract against).
- SMALLEST PATCH: in `POST /api/mc/dispatch`, replace the params-only `context.json` mint with one call to `compileAskContext()` over the live tenant graph + journal evidence for the dispatch tenant/viewer; keep `mc-ctx-<missionId>` as the id and keep the params envelope as packet metadata. No new store, no new truth layer, no schema change, one call site. Patch held for owner authorization; nothing written to the tree.
- TEST: (1) `context.json` carries per-claim evidence refs and KNOWN/UNKNOWN/CONFLICTED/STALE/INFERRED/OWNER-ASSERTED/DIRECTLY OBSERVED tags drawn from the live graph; (2) regression: mission/run/execution ids + prompt digest still present; (3) attack-9 regression: retract an overlay op, recompile, assert the claim surfaces STALE/UNKNOWN instead of asserted.
- INDEPENDENT FALSIFIER: from a clean checkout, assert a pre-patch context artifact contains zero `obj:/field:/rel:` evidence ids while post-patch contains them; fail if a packet can be produced without the graph reader.

## CAVEATS (honest unknowns)

No live dispatch was run: it requires a caller key from the server-side registry and I will not mint or borrow one. No coordinator was killed: the coordinator is the production `:3100` server and killing it is forbidden infrastructure change. COORDINATOR-DEATH RECOVERY FAIL therefore rests on code+test evidence (untested HOLD machinery, missing reconciler), which is exactly the edge the donor test demands and exactly why only the first failed edge gets patched.