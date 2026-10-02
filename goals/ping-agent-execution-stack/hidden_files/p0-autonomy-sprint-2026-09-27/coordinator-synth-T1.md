# T+1 synthesis (2026-09-27 ~13:05 MDT) — partial (B, C, S1 pending)

## Definitive dispatch map (workers A + D, independent, agree)
Three dispatch-relevant implementations exist; exactly one is idempotent:
1. Python front door `mission-control/mission_intent.py::submit()` — CANONICAL, IDEMPOTENT. Key validation, canonical_intent_hash (sha256 of intent_version/mission_class/actor/tenant/capability/event_bind/inputs_hash), _intent_collision fails closed, tenant-scoped journal lookup, no-terminal -> MC_HOLD_RAISED never re-dispatch, terminal -> duplicate-suppressed checkpoint. Executor: SpineDryRunObserverAdapter (bounded, read-only, proven).
2. TS route `lane-p01/tree/src/app/api/mc/dispatch/route.ts` — REACHED, REAL EXECUTION (ollama proven, broker implemented), NOT IDEMPOTENT. missionId embeds nowIso(); no key accepted; no lookup. Fresh ids defeat the adapter reconcile gate (it keys on missionId).
3. `orca-adapter/adapter.js` dispatchExecution — idempotent dispatch with reconcile gate + atomic index, but NOTHING wires it to /api/mc/dispatch. Post-P0.

MC-1 lineage: 2026-09-17 mission_runtime.js idempotent by construction (mission_id = sha256(missionType:event_id), ON CONFLICT DO NOTHING). Lane D (2026-09-26) rewrote with ts=nowIso() for per-dispatch uniqueness; idempotency rebuilt only in adapter gate + Python front door. TS path never had a key.

## Harvestable (dormant branches, none on HEAD)
- mc/approval-request @ cacf7b2: ApprovalRequest primitive (request_approval, authorize_approval_transition, deny_approval, exact proposal-digest binding). P0 NEEDS THIS for WAITING_APPROVAL (P0.12).
- mc/mission-budgets @ f336c80: budget.js (budget as capability constraint).
- mc/consequence-policy-input @ db78888: consequence.js (8-dimension consequence classifier).
- mc/tenant-hostile-tests @ a65846d: 25 hostile tenant-isolation tests (P0.5 adversarial).
- No deletions of value: git log --all --diff-filter=D clean on mission/dispatch/idempotency paths.

## FIRST BROKEN BOUNDARY (confirmed by two independent workers + lineage)
B1: TS dispatch front door has no idempotency contract. missionId = sha256('mission|agent|tenant|capability|promptDigest|nowIso'). Retry/double-click/concurrent identical POST -> duplicate missions, defeating both the route (no lookup) and the adapter gate (fresh key). Blocks P0.8 and the P0 mission's safe-retry semantics.

## Decision
Dispatched writer W1 (single writer): branch p0/front-door-idempotency; step 1 commit lane-p01/tree + vendor adapter-call.js from Pig (transport stable); step 2 implement idempotency harvested from Python front door pattern (accept idempotency_key; stable missionId derivation without nowIso(); lookup-before-mint: terminal -> duplicate-suppressed, in-flight/UNKNOWN -> HOLD 409 never re-dispatch); step 3 tsc + re-run lane-D acceptance. Falsifier F1 spawns on W1 completion (2/10 concurrent identical POSTs -> ONE mission; retry-after-terminal -> suppressed; in-flight retry -> HOLD; different prompts -> distinct; UNKNOWN preserved).

## Pending maps
- B (identity/capability): due; redirected on jev namespace ownership.
- C (event spine/artifacts): due; redirected on bridge re-fire + journal/DB writer topology.
- S1 (jev-shadow loop): running.

## S1 complete (2026-09-27 ~13:14 MDT): jev-shadow failure loop TRACED
- Mechanism: CLAIM_CREATED -> EventToMissionBridge mints CLASSIFICATION_CREATE -> MissionScheduler dispatches -> WorkerRuntime routes to jev-shadow (bootstrap-registered for CLAIM_CREATED) -> rules run fine -> _emit(JEV_DECISION_EVALUATED) passes validator + verdict-authority gate -> FAILS EventGovernance._validateNamespace() step 3: no owner for namespace 'jev'.
- Root cause: ping-gateway:/app/ping-runtime/events/event_governance.js:200; NAMESPACE_OWNERS (lines 14-82) has no `jev` entry despite registered event (event_registry.json:3278) + verdict-producer binding (unified_event_runtime.js:41). Earlier verification checked registration only, never the namespace gate: the gap.
- Deterministic: retries fail identically; 3 missions retry_pending (70e962a9d257c6dc, a5dc21a36107b0a5, 402152d14539171b); every new CLAIM_CREATED mints a fresh doomed mission; poisons classification missions AFTER ClassificationWorker succeeds.
- P0 IMPACT: ISOLATED. lane-p01 dispatch is a wholly separate runtime (zero ping-runtime imports). Does NOT block the P0 mission.
- Conflict resolved: worker A said WorkerRuntime dead locally; live WorkerRuntime is in the ping-gateway container on the Pig (local live-worker_runtime.js is a byte-identical DUPLICATE mirror). Both true.
- Prescribed fix (NOT implemented, deferred as off-P0-path): one line declaring jev owner in NAMESPACE_OWNERS (constitutional governance policy: treat as policy change) + gateway rebuild/redeploy; or stopgap remove registration at gateway_runtime.js:541. Jev stays non-authority shadow sensor either way.
- Full trace: spine-S1-jevshadow.md

## F1 complete (2026-09-27 ~13:16 MDT): idempotency fix SURVIVES
- 8/8 PASS, independent harness (fresh tsc compile, byte-identical to W1's dist modulo path constants; W1's "tested actual route.ts" corroborated).
- 2 concurrent -> 1 mission/1 effect; 10 concurrent -> 1 mission (5/5 deterministic); retry-after-terminal -> suppressed zero deltas; in-flight -> 409 HOLD zero side effects; different key -> distinct; keyless retry -> collides; malformed keys -> 400.
- E2 (same key + different bytes -> both execute): ACCEPTABLE for P0 with documented divergence. Safety-critical direction holds (promptDigest in missionId: different bytes can never be falsely suppressed); worst case = pre-fix duplicate execution, never dropped work. Diverges from Python fail-closed; document "retries must be byte-identical; key is a salt, not a request name"; future hardening: persist key in MC_MISSION_CREATED.
- Residual: concurrency safety rests on single-process Node run-to-completion (check-then-act synchronous through artifact publish; first await = agent fetch). Multi-process topology would race. Not a P0 blocker (matches real next start deployment).
- adapter-call.js: ABSENT everywhere, never committed (pickaxe: introduced as explicitly-untracked glue in 42f81d53); missing-since indeterminate (dir mtime consistent with never existing); RECOVERABLE: NO, RECONSTRUCTIBLE: YES (contract in LANE-D-DISPATCH.md + mc-dispatch.ts; real ExternalAgentAdapter exists).
- Served :3100 dispatch today: NONE. PID 5943 (started 08:04) serves 2026-09-26 18:47 build; any POST -> loadProfiles() ENOENT -> 503 adapter_unavailable. Gates deployment of the fix.
- EVIDENCE GAP: LANE-D-DISPATCH.md acceptance claims (mission mc-m-63d04f4517f9, artifacts, journal events) have no Pig-side traces (no artifacts dir, zero MC_ events in journal, id only in ledger text). Treat lane-D acceptance as UNPROVEN until a live dispatch is observed. Either scratch paths since cleaned, or ledger overstates.

## Decision: W2 dispatched (single writer) — reconstruct the shim, prove it against the REAL adapter in harness. Deploy + real P0 mission (W3) follows on W2 success. F2 falsifies the live deployment after.

## Worker C complete (2026-09-27 ~13:18 MDT): arch-C event/artifact inventory
- TWO DISCONNECTED EVENT PLANES. Plane J: JSONL journal (~/workspace/fyd-journal-gateway/events.jsonl), written by Python MC front door (+ inertly by TS tree); read by MC UI + Python projector; nothing in the execution substrate reads it. Plane P: brain-postgres/ping_runtime.ping_events (2,536 rows), written by gateway UER; read by EventToMissionBridge -> ping_missions (497) -> scheduler -> workers. NO WRITER bridges J to P. NO MC path calls UnifiedEventRuntime.emit. P0.13 chain (MC->RUNTIME->UER->GOVERNANCE->ping_events) does not exist as a chain today.
- B3 PROVEN (new defect, Python front door): MC-EVENTBIND-SHADOW. _intent_record merges event_bind over canonical fields (mission_intent.py:402); only intent_digest protected (404). Reserved bind keys (tenant, idempotency_key) shadow the packed record -> find_intent_record tenant-scoped lookup MISSES -> submit() duplicate check misses -> re-dispatch under same key; revoke() overwrites authenticated tenant. Proven by burn script (tenant shadowed: True, lookup miss reproduced). Fix: reject reserved keys in validate(). NOT on P0 TS path; schedule as canonical-front-door hygiene.
- Bridge re-fire mechanism CONFIRMED: gateway restart ran reconcileMissingMissions() at boot; deterministic mission IDs (sha256("CLASSIFICATION_CREATE:<event_id>").slice(0,16)) re-derived; ON CONFLICT DO NOTHING absorbed; completed missions kept status; scheduler only claims created. Log noise only, no duplicate execution. Dangerous form (same claim, DIFFERENT mission_id via routing change -> duplicate execution; ClassificationWorker has no dedup) is UNGUARDED. Gateway hygiene, not P0 path.
- crx_runtime: DEAD (miswired container 2026-09-16, 5-min life; 739 stale rows, synthetic test data). Stale-truth hazard; leave stopped, do not delete (forensic).
- mission_events / mission_executions / canonical_events: 0 rows, no production writers. Dead schema / abandoned ingestion.
- fyd-journal-gateway/server.mjs POST /events: UNGOVERNED append (no allowlist, random ids, no dedup, loopback-only). Injection surface; not on P0 path.
- Artifact lineage: TS writeArtifact/publishArtifact has the better lineage answer (who/run/inputs/executor/digest/event); Python front door has NO artifact store (result -> /tmp). MERGE needed; for the P0 mission (TS route on Pig) artifacts work.
- TS tree "dead HERE" (worker C) = dead on local WSL (/home/nolan paths absent); it is the Pig-served deployment that matters for P0. Worker C's Python-front-door recommendation is machine-scoped; the sprint's Pig TS path stands (real agent execution proven by W2 next).

## Sequencing decision: P0.13 (event spine) is the CANONICAL-EVENT boundary, not the mission-execution boundary
- The evidence lines separate cleanly: MISSION CREATED / RUN CREATED / EXECUTION ATTEMPT DURABLE / PROPOSAL live in the MC journal (Plane J, governed in the MC sense: allowlist, content-derived ids, dedup, tenant from auth). CANONICAL EVENT (the approved SiteSpec transition) is the one that must traverse UER -> governance -> ping_events.
- Therefore W2/W3/F2 (mission -> WAITING_APPROVAL) are NOT blocked by the J/P gap. P0.13 becomes the active boundary AFTER Nolan approves, when the exact-digest patch is applied as a canonical transition. Next writer then: the UER emission bridge for the canonical transition (design first: how MC calls UER.emit; do not build a third bus).
- ~/workspace/AGENTS.md house rules noted: :3100 restarts ONLY via /home/nolan/start-3100.sh (non-PTY, stdio on files); verify NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live after every restart + probe approve path. W3 brief must carry this. Multi-stream commit serialization noted (single writers only; explicit pathspecs).

## W2 complete (2026-09-27 ~13:24 MDT): GO for W3 deployment
- Reconstructed `/home/nolan/workspace/mission-control/lane-d/adapter-call.js` (sha256 12b3209f5c80e079585e56086a00d326a1fd1a4847e5d754458134ff2311bb23, node --check clean, live smoke tested). Repo commit f4927a9 on p0/front-door-idempotency (2 files; no push, no main).
- Canonical adapter verified by reading: `/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js` (lane-D ledger worktree copy treated as UNPROVEN). Contract: `node adapter-call.js <profiles|authorize|issue|verify> [payload-json]`; exit 0 JSON verdict, exit 2 misuse; authorize-throw -> non-zero (route -> 503 adapter_error), never fabricated DENIED.
- Proof (Pig-side, real components, no stubs): 23/23 shim tests (profiles, authorize grant/deny incl. identity_5 + email.send, issue work_order_id = sha256('workorder:'+taskId)[0:16] independently verified, real ollama qwen2.5-coder:1.5b output valid:true, tampered envelope valid:false, misuse exit 2). Full route e2e in scratch journal: 200 SUCCEEDED, mission mc-m-c08a212ca0cd, 9 causal journal events, 4 artifacts sha256, projection SUCCEEDED, byte-identical retry -> duplicate_suppressed:true zero new events.
- Caveats: E2 divergence committed in shim; WSL->docker TCP wedge cleared for ollama via one `docker restart ollama` (models safe on named volume); other containers' ports still RST (infra flag); appendDispatchEvent assumes journal dir pre-exists (latent); :3100/served tree/:3200/HPP untouched; production journal read-only.
- Full report: writer-W2-shim.md

## W3 complete (2026-09-27 ~13:31 MDT): REAL P0 MISSION SUCCEEDED ON LIVE :3100
- Deployed branch pair (route.ts c444cbff..., mc-dispatch.ts 6595a1b7...) to /home/nolan/projects/ping; backup /home/nolan/p0-deploy-backup-20260927/; npm run build RC=0; restart via start-3100.sh (PID 39185); NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live; GET /api/mc/missions 200.
- ONE real mission POSTed once 13:27 MDT: "Analyze my website and make emergency services more prominent." + Happy Place SiteSpec context; ollama/happy-place/text.transform; key p0-happy-place-emergency-20260927.
- MISSION mc-m-c5b2c89b4ff7 SUCCEEDED (HTTP 200, ~10s). run_id ...-r1, execution_id ...-x1, work_order_id df5e40348c2af920 through the REAL adapter (sha256-verified shim -> canonical vendor adapter). Byte-identical retry -> duplicate_suppressed:true, journal 9->9.
- Evidence: production journal lines 43-51 (9 causal events); 4 artifacts, on-disk sha256 match journal byte-for-byte; GET /api/mc/missions/mc-m-c5b2c89b4ff7 projects SUCCEEDED with matching digests.
- PROPOSAL recorded (not applied): analysis/proposed_patch/rationale parse cleanly; FYDPresentation fields present. Caveats: objectOrder integer vs contract string[]; featuredIds label not object id; no new service object produced; 24/7 + "tenants" claims unverified model output; not validated against Ask FYD or SiteSpec validator.
- Evidence lines: MISSION CREATED PASS / RUN CREATED PASS / EXECUTION ATTEMPT DURABLE PASS / AGENT STRUCTURED RESULT PASS / PROPOSAL PASS (with caveats).
- T+2 MILESTONE ACHIEVED (exceeded): mission persisted + execution attempt through chosen adapter, on the live deployment, with idempotency proven live.
- Full report: writer-W3-deployment.md

## F2 dispatched: independent falsification of the live deployment (build fidelity, journal chain, live idempotency retry, live concurrency, negatives, proposal-validation gap confirmation, projection).

## F2 complete (2026-09-27 ~13:33 MDT): live deployment FALSIFIED, all 7 checks PASS
- Build fidelity PASS (deployed digests match branch; .next built 13:23; PID 39185; flag live).
- Journal chain PASS (9 events, all event_ids recomputed and match; 4 artifact digests match on disk).
- Live idempotency PASS (retry -> duplicate_suppressed, journal 51->51).
- Live concurrency PASS (2 -> 1 mission; 10 -> 1 SUCCEEDED + 9 HOLD, journal +9 exactly).
- Negatives PASS with caveat (1-char key valid per 1..128 rule -> real scratch mission mc-m-669d8c808182, marked; evil-tenant 400; identity_5 403).
- Proposal validation gap CONFIRMED (4 mismatches real; no SiteSpec validation in route).
- Projection PASS.
- Corrections to W3: branch path prefix lane-p01/tree/...; 1-char-key behavior.
- Full report: falsifier-F2-live.md

## W4 dispatched (single writer): proposal validation + approval machinery
- Branch p0/approval from p0/front-door-idempotency. Harvest ApprovalRequest from mc/approval-request @ cacf7b2.
- Validate the agent's proposal against FYDPresentation contract (expect FAIL; honest output; no silent normalization).
- Autonomous revision via live dispatch (max 2) if invalid.
- Proposal record with digest -> WAITING_APPROVAL -> journal event.
- POST /api/mc/approvals with exact-digest binding + tamper detection; deploy to :3100.
- Nolan presentation artifact (ONE DECISION / ONE SENTENCE / ONE EVIDENCE LINK / APPROVE-DENY).
- Do NOT apply the patch. Stop rules: dormant primitive missing/incompatible -> stop, do not invent.

## W4 complete (2026-09-27 ~13:45 MDT): WAITING_APPROVAL reached
- Proposal ID p0prop-ac04480a6d1809fd; patch digest 5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa (sha256 of exact canonical bytes).
- Harvested ApprovalRequest verbatim from mc/approval-request @ cacf7b2 (branch p0/approval, commit b96e7d2; 9 files; no push). Adaptation: harvested transition is MC_APPROVAL_APPROVED.
- Validator: original proposal FAILED all 5 semantic checks (unanchored, bare envelope, int objectOrder, label not object id, 24/7 + immediacy claims). Not silently fixed.
- Revision missions via live front door: rev1 mc-m-8f88be187ab5 (5/6), rev2 mc-m-7263b44905d7 (6/6 PASS). Budget of 2 used; no owner input needed.
- Proposal recorded via request_approval (deterministic pinned ID); MC_APPROVAL_REQUESTED in production journal. Status WAITING_APPROVAL confirmed live.
- POST /api/mc/approvals + GET ?proposal_id= deployed to :3100 (vendored Python primitive at /home/nolan/projects/ping/mc-approval/, route shells to approval_cli.py, owns no approval logic). Restart via start-3100.sh only; flag live.
- Tamper detection verified live: wrong digest -> 409 digest_mismatch zero state change; unknown proposal 404; malformed digest 400; bad decision 400; correct approve 200; double approve idempotent (already-approved, no second event); deny 200 on throwaway. Real proposal never approved/denied by W4.
- Nolan presentation: nolan-approval-presentation.md (ONE DECISION / ONE SENTENCE / ONE EVIDENCE LINK / APPROVE-DENY with exact POST bodies).
- Patch NOT applied. The decision belongs to Nolan.
- Full reports: w4-validation-report-*.json/md, w4-rev1-result.json, w4-rev2-result.json.

## SI-03 note for parent
- Subagents never escalate to Nolan directly. The approval decision is the sprint's planned human-authority boundary (consequential proposal approval: applying a site change). Parent must run the grill-20 classifier and file the escalation record before presenting. The presentation content is ready verbatim in nolan-approval-presentation.md.

## Worker B errored on infrastructure (2026-09-27 ~14:17 MDT), re-dispatched
- Original worker B (a7ddae47) errored: "restart drain in progress; rejecting new submission". No report delivered; no work product. Infrastructure failure, not a task failure.
- Re-dispatched as 1c7fa8fa with the consolidated brief (identity/capability/authority map + jev namespace-ownership registry + reaper-vs-HOLD record). Runs in background; not blocking WAITING_APPROVAL.

## Worker B complete (re-dispatched, 2026-09-27 ~14:24 MDT): arch-B identity/capability map
- (a) Server-authoritative identity: ONLY the Python front door is server-authoritative by design (resolve_tenant(auth_ctx), body-tenant disagreement refused, check_agent_entitlement). BUT its trust anchor is unimplemented in production (nothing constructs AuthenticatedContext from a verified session; only tests do). The TS route (live P0 path) is NOT server-authoritative: body tenant vs 2-entry allowlist, zero caller auth, same on the GET routes.
- (b) Capability: one canonical owner, authorizeWorkOrder() in vendored external_agent_adapter.js:185-220. Vocabulary: fixture.read, text.transform, text.summarize, orchestration.plan, orchestration.review, documentation.generate, dead_code.analyze, test.generate. Denials proven: identity_5 (unknown agent), email.send (no allowlist). Availability vs authorization properly separated on both paths.
- (c) Namespace ownership: owner = gateway image build from Pig repo ~/ping; policy change = source edit -> commit -> clean-clone rebuild -> digest pin -> Nolan-authorized promotion (jev/verdict-authority-hardening RUNBOOK 2026-09-24). Never a runtime edit. Adapter checks namespace SHAPE, gateway checks OWNERSHIP: different maps, different containers.
- (d) Top ugly-case boundary: reaper-vs-HOLD seam (UNKNOWN -> auto-re-execution, violates P0.8). Runner-up: TS body-tenant trust.
- Corrections: prior worker's BROKEN label on TS adapter wiring REJECTED (/home/nolan paths correct on Pig-WSL; resultPath + host:'pig-wsl' prove it). Namespace Pig-side specifics marked as prior-worker evidence (no local event_governance.js).
- T+1 ARCHAEOLOGY MAP COMPLETE (A, B, C, D all delivered).
- Identity caveat for the record: the P0 mission ran with allowlist-validated (not authenticated) tenant. No tenant confusion evidenced in this mission; approval binds the proposal digest. Systemic hardening (authenticated context, hostile tenant tests) belongs to the ugly-case phase, not a blocker for this approval.
