# PING CORE INTERROGATION: ANSWERS

Date: 2026-09-30, synthesized ~14:30 MDT.
Charter: `~/workspace/goals/ping-agent-execution-stack/files/PING-CORE-INTERROGATION-2026-09-30.md` (Nolan's binding directive, ~14:07 MDT).
Method: QUESTION → CURRENT CLAIM → REACHED PATH → EVIDENCE → COUNTEREVIDENCE → VERDICT → SMALLEST CONSEQUENCE, with a falsifying observation after every answer.
Verdicts allowed: PROVEN / FALSIFIED / PARTIAL / UNKNOWN / NOT-REACHED.

## Program structure and provenance

Six reader/falsifier investigators ran in parallel. Nothing was built, launched, patched, or committed. No new authorities, stores, writers, coordinators, or registries were proposed or created. Aspirational docs were treated as counterevidence, never as proof. Ownership was decided only from reached runtime behavior (who writes, who can bypass, what breaks when removed).

- Investigator A (structural: Q1, Q2, Q21, Q22, Q24, Q25-spine): served-plane tracing. Pig docker plane: `ping-gateway:repair-cert-20260924`, `brain-postgres/ping_runtime` (journal, 2580 rows), `ping-qdrant`, Mission Control :3100. Reads were `docker exec` (read-only), SQL SELECT, and curl. Findings: `hidden_files/core-interrogation/investigator-A-structural.md`.
- Investigator B (truth/record/replay/authority-entry: Q3, Q4, Q5, Q6): journal + deployed-vs-checkout code. Findings: `hidden_files/core-interrogation/investigator-B-truth-record.md`.
- Investigator C (executors: Q7, Q8, Q9): ORCA, Mission Control, hostile authority tests. Findings: `hidden_files/core-interrogation/investigator-C-executors.md`.
- Investigator D (deployment/autonomy/acquisition: Q10, Q11, Q20): live probes of image, /health, scheduler, /ingest. Findings: `hidden_files/core-interrogation/investigator-D-deployment-autonomy.md`.
- Investigator E (intelligence/learning: Q12, Q13, Q14): workers, promoter, engagement ledger. Findings: `hidden_files/core-interrogation/investigator-E-intelligence.md`.
- Investigator F (MarketingOS: Q15, Q16, Q17, Q18, Q19): directives vs live code, mission 78c88729ceb51f38, live journal. Findings: `hidden_files/core-interrogation/investigator-F-marketingos.md`.

## Verdict tally

24 questions carry verdicts (Q25 is the synthesis below, not a verdict).

- PROVEN: 7 (Q1, Q8, Q15, Q21, Q22, Q23, Q24)
- PARTIAL: 14 (Q2, Q3, Q4, Q5, Q6, Q7, Q9, Q10, Q11, Q12, Q13, Q16, Q19, Q20)
- FALSIFIED: 1 (Q14)
- UNKNOWN: 1 (Q17)
- NOT-REACHED: 1 (Q18)

## Material corrections to the forensic starting point (found this pass)

1. The "zero live production callers" claim for `/ingest` is stale. Live journal shows callers today: `api:muse` (41), `api` (18), `observation` (18), `metric-ingest-producer` (11), `mission-worker` (3). The seam is manned.
2. "Centralized spine identity" is behaviorally true (one minting site, inline in the UER) but authoritatively false: 7 shipped IdentityAuthority modules have zero non-test callers in the served image. The AUTH-CONV-06 delegation fix lives only in an undeployed lane branch.
3. "Live mission machinery" is narrower than claimed: only observation→claim→CLAIM_GENERATE closes today (+2 INTELLIGENCE_RESEARCH in 48h). The 7-mission constitutional pipeline (witness/classification/lineage/recommendation/projection/replay) went stale 2026-09-23 to 09-25.
4. The repo checkout contains genuine scheduler repairs (structured dispatch receipt, timeout→HOLD) that are absent from the deployed image `repair-cert-20260924`. SOURCE TRUTH and DEPLOYED TRUTH must be distinguished on every claim below.

## Q1. What is PING, if every UI, agent name, and aspirational document is deleted from consideration?

CURRENT CLAIM (forensic starting point): one canonical `ping_events` writer, centralized spine identity, live mission machinery, ClaimWorker, KnowledgePromoter.

REACHED PATH: served image of `ping-gateway` (`/app` = `gateway/` + `ping-runtime/` + `runtime/` + `database/`; bootstrap `gateway/bootstrap/gateway_runtime.js`); journal `brain-postgres/ping_runtime.ping_events`, live (2580 rows, latest write 2026-09-30 18:14:51 UTC / 12:14:51 MDT today).

EVIDENCE:
- Single production `INSERT INTO ping_events` in the served image: `ping-runtime/events/unified_event_runtime.js:246`, with `ON CONFLICT (event_id) DO NOTHING` plus a semantic-collision fail-closed check. Zero other production writers found in the image (test files excluded).
- Live event flow today: OBSERVATION_CREATED → CLAIM_CREATED → MISSION_CREATED → MISSION_ASSIGNED → MISSION_STARTED → MISSION_COMPLETED, all within the same second at 18:14:50 to 51 UTC.
- Single `INSERT INTO ping_missions`: `ping-runtime/orchestration/mission_runtime.js:79`. 515 missions total; 484 completed, 28 created, 3 retry_pending.
- `MissionScheduler` polls `ping_missions` → `WorkerRuntime.dispatch(event)` → registered in-process workers. `ClaimWorker` at `ping-runtime/workers/canonical_workers.js:138`. 71 CLAIM_CREATED events, live today.
- `knowledge_promoter.js` present; `knowledge_nodes` = 241 rows, all `node_type='event'`, every `source_event_id` verified to reference a real `ping_events` row, latest write today 17:46:33 UTC. It is a live journal mirror.
- `/ingest` route (`gateway/routes/ingest.js`) → `CanonicalizationService.canonicalizeAndEmit` → UER → journal. Live callers in the journal today: `api:muse` (41), `api` (18), `observation` (18), `metric-ingest-producer` (11), `mission-worker` (3).
- Identity bytes: UER mints `event_id = sha256(JSON({eventType, source, [namespace], [logical_id|payload]}))` inline at `unified_event_runtime.js:167`. Deterministic, content-based, no clock. (Pre-AUTH-CONV-06 scheme; the lane-branch delegation to `IdentityAuthority.generateSpineEventId()` is NOT in the served image.)

COUNTEREVIDENCE:
- "Centralized spine identity" as an *authority* is false on the served path: the image ships 7 identity modules (`gateway/runtime_identity_authority.js`, `runtime/authorities/identity_authority.py`, `runtime/kernel/authorities/{identity,runtime_identity,replay_identity}_authority.js`, `ping-runtime/authorities/{identity,workflow_identity}_authority.js`) and zero non-test files in the image require any of them. Behavior is centralized; authority is not.
- "Live mission machinery" is narrower than claimed: the full constitutional pipeline missions (WITNESS_CREATE 68, PROJECTION_CREATE 68, REPLAY_VERIFY 68, CLASSIFICATION_CREATE 67, LINEAGE_CREATE 66, RECOMMENDATION_CREATE 66) last completed 2026-09-23 to 25 and are now stale. The live loop is observation→claim→CLAIM_GENERATE missions (+2 INTELLIGENCE_RESEARCH in 48h).
- REPLAY_COMPLETED: 68 events, all `source='replay'`, latest 2026-09-25 07:30 UTC. No live emitter exists in the image outside test files.

VERDICT: PROVEN (for the spine as re-scoped here; the forensic claim needs the corrections above).

SMALLEST CONSEQUENCE: any future convergence work must treat the 7-item kernel below (see Q25-spine) as the untouchable kernel and everything else as negotiable. The 7 dead identity modules are the clearest evidence that declared authority and served truth diverge.

FALSIFYING OBSERVATION: a served PING behavior (a mission completion, a claim, a knowledge node) whose bytes cannot be derived from {`ping_events` rows + UER emit code + `ping_missions` rows + scheduler/worker code}, for example a decision that required Qdrant state or an in-memory registry with no journal residue. One such row falsifies the spine boundary.

---

## Q2. What owns truth?

CURRENT CLAIM: each of the 18 concepts has exactly one semantic owner; class/table/event names are not ownership.

REACHED PATH: served image + journal (same anchor as Q1). Only served-path ownership counted; repo-only modules and dead copies do not count.

EVIDENCE (per concept, owner = served behavior):
- observation: UnifiedEventRuntime, PROVEN. Single INSERT at UER:246; 93 OBSERVATION_CREATED, live callers today.
- claim: ClaimWorker (behavior) + journal (record), PARTIAL. 71 CLAIM_CREATED, live today; no separate claim store.
- mission: MissionRuntime → `ping_missions`, PROVEN. Single INSERT at mission_runtime.js:79; the competing `missions`-table writer (`mission_repository.js`) is dead: the `missions` table does not exist in the served DB.
- tenant identity: `tenants` table, PROVEN. One row: `hpp` / Happy Place Platform / active. Trivially single-owner today.
- attempt: MissionScheduler/MissionRuntime, PARTIAL. `retries` column + lease/re-dispatch logic; attempt identity not separately recorded.
- result: emitting worker + MissionRuntime, PARTIAL. WORKER_COMPLETED/WORKER_FAILED in journal vocabulary; `mission.result` column; no single result-authority module reached.
- outcome: MissionRuntime (terminal states) / semantics unresolved, PARTIAL. MISSION_COMPLETED/FAILED owned; the honest-execution `unknown`-outcome vocabulary is undeployed.
- evidence: UNRESOLVED. `evidence_authority.js` exists in the image; whether the served claim path calls it was not traced to a live emission.
- fact: UNRESOLVED. No FACT_* event type in the journal; no fact table; the word appears only in docs.
- knowledge: UNRESOLVED, competing. Three live stores with no precedence: `knowledge_nodes` PG mirror (241, live), Qdrant `knowledge` (401 points), Qdrant `constitutional_memory` (0 points).
- authorization: UNRESOLVED, fragmented. Four checks, no single owner: `exteriorAuthMiddleware` (/events routes), `authorizeNamespace` (/ingest), `authorizeWorkOrder` (repo adapter, NOT in image), AGENT_PROFILES.
- approval: UNRESOLVED. Zero APPROVAL_* types in the journal; `mc-approval/` exists only in the :3100 FYD app, not the PING path.
- work order: UNRESOLVED on served path. `work_order_id = sha256('workorder:'+taskId)[0:16]` exists only in the undeployed repo adapter; no work-order concept in image or journal.
- effect: UNRESOLVED. Zero EFFECT_* types in the journal; `orca/effect_ledger.js` and effect classes are repo-only.
- verification: UNRESOLVED. `verifyResultEnvelope` lives in the undeployed adapter; served path has scattered checks (event validator, constitutional_dispatcher), no single verifier.
- learning: UNRESOLVED. Storage exists (`knowledge_nodes` live), `knowledge_edges` = 0 rows, and no served path reads learnings back into a different next decision.
- projection: UNRESOLVED, fragmented. MC SELECT-projection (proven read-only), 9 direct-Qdrant-client modules (no enforced ProjectionAuthority; audit finding 7 still true in image), `knowledge_nodes` mirror, `projection_executor.js`; declared `runtime/authorities/projection_authority.py` is Python, not on the Node path.
- deployment state: UNRESOLVED. `deployment_registry` table = 0 rows; ORACLE-STATUS-2026-09-22 admits an undocumented image promotion (3c5d280dd) with no journal record.

COUNTEREVIDENCE: the repo tree contains dozens more identity/canonical/authority copies (convergence-lane3, lane-b, tenanos-wave, constitutional-sprint, ping-build-program/fleet), but those are lane artifacts and vendored copies, not live competitors. Counting them would be name-matching, not ownership tracing. On the served path the truth is starker: most authorities are declarations with zero callers.

VERDICT: PARTIAL. 3 of 18 concepts have a proven single served owner (observation, mission, tenant identity); claim, attempt, result, outcome are partially owned; the remaining 11 are unresolved or fragmented. The honest map: the journal owns records; the UER owns acceptance; MissionRuntime owns mission lifecycle; everything else is either a worker behavior or unresolved.

SMALLEST CONSEQUENCE: stop treating the 11 unresolved concepts as owned. Any lane needing approval, effect, verification, work-order, learning, or deployment-state semantics must first prove the owner on the served path, not cite a module name.

FALSIFYING OBSERVATION: a served code path that (a) writes APPROVAL_*/EFFECT_*/FACT_* rows to the journal, (b) shows one of the 7 identity modules actually required by a live non-test module in the running container, or (c) shows `knowledge_edges` gaining rows from a live promoter. Any of those re-opens the ownership map.

---

## Q3. Can PING distinguish "we recorded something" from "the world changed"?

CURRENT CLAIM: the ledger's INTENT → execution → effect pipeline separates recording from world-change with distinct stages.

REACHED PATH: the engagement intent/action ledger and its terminal states; one traced intent.

EVIDENCE:
- The ledger is designed with hard INTENT → ... → EFFECT stages and terminal-aware guards (NOT_ATTEMPTED stays eligible; EXECUTED/FAILED/UNKNOWN_EXECUTION and open intents block).
- One traced intent (`8cfeddea8fee41e598630b2c36330f22`) proves independent-channel verification works.
- The at-dispatch guard's intent machinery fail-closes: pass-156's 11 already-engaged posts were caught fail-closed by the guard's prefixed post-ID comparison plus fuzzy name match.

COUNTEREVIDENCE:
- Only 1 of 3064 EXECUTED terminals has an effect_verification record. Terminal EXECUTED is defined as worker-claimed-ok, not as independently observed effect.
- AUTHORIZATION is pipeline-position-derived, not per-action-receipted: the Facebook pass authorization (AUTHORITY.json, see Q6) authorizes the pass, not each action receipt.
- Collapsed pairs: WORKER RETURNED SUCCESS and EFFECT MAY HAVE OCCURRED are the same terminal (EXECUTED); OUTCOME OBSERVED and CAUSAL ATTRIBUTION SUPPORTED have no machinery for most actions.

VERDICT: PARTIAL. The stages exist as vocabulary and one independent-channel verification is proven; in practice the machinery runs one collapse step short: recorded ≈ worker-claimed.

SMALLEST CONSEQUENCE: treat EXECUTED as "worker claims success, no independent observation" in every surface that reads it (reports, feeds, projections). Do not render EXECUTED as "it happened."

FALSIFYING OBSERVATION: a ledger export where a majority of EXECUTED terminals carry effect_verification records from an observer channel independent of the worker.

---

## Q4. Can PING tell the truth when absolutely nothing is known?

CURRENT CLAIM: PING preserves UNKNOWN across all surfaces and never converts absence into falsehood.

REACHED PATH: gateway code in the checkout vs the deployed image `repair-cert-20260924` (read from inside the live container); orca-adapter docstrings; Mission Control rendering.

EVIDENCE (honest-unknown machinery is real, in places):
- Owner DEFAULT-UNKNOWN policy; fail-closed ledger terminals; the orca-adapter's evidence-gated effect_unknown → FAILED; Mission Control renders UNCLEAR in amber with reasons (e.g., mission 78c88729ceb51f38's UNCLEAR claim).
- The checkout contains repairs: DISPATCH_TIMEOUT / `_reconcileUnknown` / HOLD branches and structured-receipt dispatch.

COUNTEREVIDENCE (the deployed code does the opposite):
- The DEPLOYED `mission_scheduler.js` (image `repair-cert-20260924`, verified inside the live container) converts falsy handler return → FAILED with a fabricated "no worker matched" reason, any truthy return → COMPLETED, and any throw → FAILED with 3x retry of possibly-effected work. The checkout's repairs are not deployed.
- This is independently corroborated by the orca-adapter's own docstring ("the Pig chain promotes a bare post-effect throw to FAILED with no effect evidence at all - a real defect there") and the AGENTS.md note on the reaper-vs-HOLD retry gap.

VERDICT: PARTIAL. The vocabulary and intent for honest UNKNOWN exist and some surfaces honor them; the deployed dispatch loop fabricates failure reasons and retries possibly-effected work.

SMALLEST CONSEQUENCE: the smallest fix with the largest honesty gain is deploying the checkout's scheduler repairs (timeout→HOLD, structured receipts) so the live path stops converting absence into falsehood. No new machinery needed.

FALSIFYING OBSERVATION: a diff of the deployed image's `/app/ping-runtime/orchestration/mission_scheduler.js` showing the DISPATCH_TIMEOUT / `_reconcileUnknown` / HOLD branches and structured-receipt dispatch present in `/app` would prove the deployed path honest (upgrading this verdict) or keep it as-is.

---

## Q5. Is replay actually reconstruction?

CURRENT CLAIM: PING can reconstruct its truth from the canonical journal alone.

REACHED PATH: the journal (2580 rows, ordered, identity-stable), REPLAY_COMPLETED history, knowledge stores, Qdrant, config/state outside the journal.

EVIDENCE (replay as verification is proven):
- 68 REPLAY_COMPLETED rows, one event each, fingerprint match, zero violations. The journal is ordered, identity-stable, 2580 rows; Oracle journal sealed (md5 98e24e0bcebc4a9194d42148695f0e5f, 2,557 rows, max seq 91).

COUNTEREVIDENCE (replay as reconstruction is not reached):
- No deployed code path rebuilds state from the journal. The last REPLAY_COMPLETED is 2026-09-25 07:30 UTC, stale; no live emitter exists in the image outside test files.
- Qdrant vectors, `knowledge_edges` (0 rows), `mission_events`/`canonical_events`/`event_processing` (all empty), and deployment/config state live outside the journal.
- `tenant_id` is UNKNOWN on 99.5% of journal rows; Oracle sealed with only 91/2557 rows sequenced.

VERDICT: PARTIAL. Replay-as-verification is proven; replay-as-reconstruction is not implemented anywhere on the deployed path.

SMALLEST CONSEQUENCE: stop claiming reconstruction capability. Until a delete-and-restore drill is run against the journal, treat the journal as the record of what happened, not as a recovery mechanism.

FALSIFYING OBSERVATION: a code path in the deployed image that rebuilds knowledge_nodes, Qdrant vectors, or mission runtime state from ping_events alone, or a demonstrated delete-and-restore drill.

---

## Q6. Where does human authority actually enter the machine?

CURRENT CLAIM: Nolan's approval enters through a canonical approval record that binds the proposal to the effect.

REACHED PATH: ApprovalRequest primitive in code; journal scan for APPROVAL_*/WAITING_APPROVAL records and MC_APPROVAL_* events; `~/workspace/outreach/AUTHORITY.json` and its working tree; MissionScheduler._authorizeDispatch.

EVIDENCE (the machinery exists and is tested):
- A digest-bound ApprovalRequest primitive exists (sha256 proposal digest, silence-is-never-approval, tested).

COUNTEREVIDENCE (it has never been used in production):
- Zero production uses: no WAITING_APPROVAL records, no MC_APPROVAL_* events anywhere in any journal.
- Real production authority enters through `~/workspace/outreach/AUTHORITY.json`: self-attested prose `set_by` fields, no proposal digest, no tenant, `window: null` everywhere, currently with uncommitted working-tree edits.
- MC_MISSION_AUTHORIZED's recorded authorizer is a code path (`MissionScheduler._authorizeDispatch`), not Nolan.

VERDICT: PARTIAL. The honest approval primitive exists but is unused; production authority flows through human-editable prose files with no digest binding and no canonical approval events. The precise break: between Nolan's decision (chat/reconciliation prose) and any machine-verifiable approval record, there is nothing. A self-attested file takes the place of the approval record.

SMALLEST CONSEQUENCE: the smallest honest step is to run one real approval through the digest-bound primitive (produce one WAITING_APPROVAL → APPROVED record pair in the production journal) instead of relying on AUTHORITY.json prose. Until then, every "authorized" claim must be labeled as prose-attested, not machine-proven.

FALSIFYING OBSERVATION: one WAITING_APPROVAL→APPROVED record with matching proposal digest plus an MC_APPROVAL_GRANTED event in a production journal, or a per-action authorization receipt binding an AUTHORITY.json decision to the intent IDs it authorized.

## Q7. Can any executor manufacture its own authority?

CURRENT CLAIM: every handoff enforces its authority boundary; no executor can self-attest.

REACHED PATH: `~/workspace/orca-adapter` (`external_agent_adapter.js`: `authorizeWorkOrder`, `verifyResultEnvelope`), MC :3100 routes, the undeployed work-order contract, connector framework, Mission Control dispatch POST.

EVIDENCE (the adapter grant path is airtight):
- Fail-closed `authorizeWorkOrder`/`verifyResultEnvelope` in `external_agent_adapter.js`. Self-attestation impossible at worker→grant.
- Mission→work order is replay-proof via deterministic IDs + lookup-before-mint (replayed grants neutralized).
- ORCA→executor: ORCA holds no grant power; forged envelopes die in `verifyResultEnvelope`.

COUNTEREVIDENCE (the live MC path is not):
- `POST /api/mc/approvals` on live :3100 is unauthenticated with a self-asserted `approver` field. A real APPROVED decision (`p0prop-ac04480a6d1809fd`, 2026-09-28) with a real site effect is on record through this path.
- Work order→capability is dual-checked at the decision layer but prompt-governed at the execution layer (softer).
- Grant→tenant is shape-only in the adapter; real entitlement only at the MC route layer, where the caller registry file is missing so dispatch is fail-closed 503.
- Connector→effect and TenantOS→placement are NOT-REACHED: zero production callers of the connectors framework, no placement authority found.
- Mission Control→action is FALSIFIED as read-only: two live mutation paths exist (approvals POST unauthenticated; dispatch POST key-gated, currently 503 because the caller registry was never provisioned).

VERDICT: PARTIAL. The repo-only adapter boundary is genuinely hostile-tested; the live MC boundary is not. One armed, unauthenticated mutation path has a real approval on record.

SMALLEST CONSEQUENCE: this is a live security surface, not a design exercise. The :3100 approvals route needs an auth decision (gate it, remove it, or bind it to a Nolan-held secret) before any more "approved" actions enter through it. No redesign required; the fix is a gate on an existing route. Also correct the "read-only projection" description to "projection with two armed mutation paths" until the routes are gated.

FALSIFYING OBSERVATION: a live approvals POST refused without a Nolan-held secret, or adapter-level tenant entitlement checks enforced on the live path.

---

## Q8. What exactly is ORCA?

CURRENT CLAIM: ORCA is an execution authority / scheduler / runtime that owns PING semantics.

REACHED PATH: ORCA workstream code, the orca-adapter (repo-only, undeployed), the served image, the Pig process list, journal `source` fields, and the 2026-09-30 100-hour re-aim directive (binding).

EVIDENCE:
- Per-behavior decomposition maps every ORCA behavior to the semantic owner beneath it: MissionRuntime, ExternalAgentAdapter, UER, worker transports.
- The served image contains zero ORCA code; no ORCA process runs on the Pig; the only residue is a stale comment (`worker_runtime.js:10`, "Workers register as WorkerPorts in the Orca scheduler").
- ORCA never emits canonical events; no grant verdict is produced by ORCA code rather than the adapter.
- The orca-adapter family has naming collisions (`orca-cli`, ORCA-dispatcher) that are tooling, not runtime.

COUNTEREVIDENCE: essentially none on the served path. The dangerous question is answered cleanly: if ORCA disappeared, PING loses automation (the reconcile gate, idempotency behavior, effect taxonomy as vocabulary), but no served truth, no journal row, and no mission state disappears.

VERDICT: PROVEN. ORCA = delegation controller (OBSERVE → PLAN → AUTHORIZE → ACT → VERIFY → ASSESS loop over existing authorities), not planner, not policy evaluator, not reconciler, not mission generator, not execution authority, not scheduler. It is intelligence-orchestration as a concept to harvest, not a runtime. This is consistent with the 2026-09-30 re-aim: ORCA is a primitive to harvest, not a product to rebuild.

SMALLEST CONSEQUENCE: stop treating ORCA as a runtime to deploy. Harvest the behaviors worth keeping (idempotency keys, the reconcile gate, `verifyResultEnvelope`, the effect vocabulary) as behaviors on the served path, and retire the ORCA-as-runtime narrative.

FALSIFYING OBSERVATION: a canonical `ping_events` row written by an ORCA process, or a grant verdict produced by ORCA code rather than the adapter.

---

## Q9. What exactly is Mission Control?

CURRENT CLAIM: Mission Control is a skeptical read-only projection; no UI mutation can change truth.

REACHED PATH: :3100 app source (`mc-ping-journal.ts`, per-tab components, `mc-approval/`), live :3100 on all interfaces, `mc-approvals.json` side store, FYD journal JSONL.

EVIDENCE:
- Every displayed field traced to a real backend in a per-tab mapping (TODAY/AGENTS/BUSINESSES/WEBSITES/TECHNOLOGY/SEARCH/DISPATCH/MARKETING). The journal path is SELECT-only by construction (`mc-ping-journal.ts` enforces "every statement is a SELECT; no INSERT/UPDATE/DELETE/DDL exists") and reads the canonical journal read-only via a driver-level read-only guard.
- MC_* events go to the FYD journal JSONL, not the canonical postgres journal.

COUNTEREVIDENCE:
- :3100 listens on all interfaces with no auth middleware.
- Two live mutation paths exist: `POST /api/mc/approvals` (unauthenticated, self-asserted approver; see Q7) and `POST /api/mc/dispatch` (key-gated, currently 503 because the caller registry was never provisioned).
- `mc-approvals.json` is a UI-writable side store, not the canonical journal.

VERDICT: PARTIAL. The journal-reading projection is proven read-only; Mission Control as deployed is a projection with two armed mutation paths plus a UI-writable side store.

SMALLEST CONSEQUENCE: gate or remove the two mutation routes (Q7's fix covers approvals; dispatch is already fail-closed 503), and either delete `mc-approvals.json` as an authority-looking store or move its contents into the canonical journal so it cannot masquerade as truth.

FALSIFYING OBSERVATION: both mutation routes removed or auth-gated, and the approvals store no longer UI-writable.

---

## Q10. Can we answer "what software is running right now?" without archaeology?

CURRENT CLAIM: a served request can be traced from source commit through build, artifact digest, deployment, process, configuration, registry, served bytes, to observed behavior.

REACHED PATH: live probes per plane: Pig gateway `docker inspect` (image digest `4472c543…`), /health, MC :3100 BUILD_ID + git HEAD (`e1Bc9QdeXywnDhCwZDQJa` @ `03dff1b7`), `runtime-manifest.json`, the noon deployment record.

EVIDENCE (chain closes per-plane, by live probe only):
- Pig gateway digest via `docker inspect`; MC build/commit via BUILD_ID + git HEAD.
- The noon deployment record's MC build was already superseded by 12:31 the same day, proving the record is not the deployment.

COUNTEREVIDENCE:
- `runtime-manifest.json` is 2026-09-19 @ 88c9651be and describes neither live plane.
- For the Pig gateway (the one live journal) no live surface maps image digest → source commit; that link is UNKNOWN, not proven.
- The ORACLE-STATUS record admits an undocumented image promotion; `deployment_registry` is empty (Q2 #17).

VERDICT: PARTIAL. The chain closes only by digging (docker inspect, BUILD_ID, git HEAD) per plane; no single live endpoint answers it, and digest→commit on the journal plane is UNKNOWN.

SMALLEST CONSEQUENCE: until one live endpoint per plane returns {image digest, source commit, build id, config hash}, label every "deployed version" statement with which plane and which probe produced it. This is the operational fix for the SOURCE TRUTH vs DEPLOYED TRUTH confusion.

FALSIFYING OBSERVATION: a single live endpoint per plane returning {image digest, source commit, build id, config hash} that agrees with the manifest with zero digging.

---

## Q11. What is actually autonomous today?

CURRENT CLAIM: PING has autonomous processes that observe, decide, and act without human pre-scripting.

REACHED PATH: the MissionScheduler 5s loop (deployed image), Muse cron bodies, the scheduled page-insights proof (producer 2026-10-01 08:21, observer 09:00).

EVIDENCE:
- The MissionScheduler 5s poll loop is genuinely autonomous, but pathological: 3 five-day-old CLASSIFICATION_CREATE missions cycle fail→retry forever (57,894 jev-shadow failure lines, retries stuck at 1, zero terminal 'failed' rows) while 25 CLAIM_GENERATE missions starve undispatched (getPending's LIMIT-3 + priority ordering).
- Muse crons are attended autonomy: verbatim human policy, machine-executed. The machine executes; the human decided.
- The scheduled proof (2026-10-01 08:21 cron + 09:00 read-only observer) is the next honest data point; expected first broken boundary is SKIP_PRODUCER_NOT_ON_SERVED_LINE.

COUNTEREVIDENCE: no second autonomous decision loop was found that no human pre-scripted. Every external effect traces to either a human-written cron body or the stuck scheduler loop.

VERDICT: PARTIAL. The one genuinely autonomous loop (the scheduler) is currently stuck in a pathological retry cycle and starving real missions; the rest is attended autonomy.

SMALLEST CONSEQUENCE: fix or stop the zombie-mission loop before calling the scheduler "autonomy." The smallest intervention is terminalizing the 3 stuck missions and letting the 25 CLAIM_GENERATE missions drain; then observe whether a real decision loop emerges.

FALSIFYING OBSERVATION: the 25 CLAIM_GENERATE missions reaching completed or terminal-failed, or a second autonomous decision loop no human pre-scripted.

---

## Q12. Where is intelligence currently trapped in prompts or humans?

CURRENT CLAIM: PING's "intelligence chain" (Claim/Classification/Recommendation workers) performs model-mediated judgment.

REACHED PATH: `canonical_workers.js` in the live snapshot, gateway logs, operational files (Meta AI briefs, copy drafting, AEO evals, curation notes, lane-g reviews).

EVIDENCE:
- The canonical "intelligence chain" is DETERMINISTIC-PROVEN: zero model calls, static lookup tables + if/else in `canonical_workers.js`. The intelligence is in the name only.
- The real repeated judgments live outside the machinery, in prompts and humans: Meta AI briefs, copy drafting, AEO evaluations, engagement curation, lane-g reviews.
- IntelligenceWorker is dormant with its module absent from the snapshot.

COUNTEREVIDENCE: a genuine repeated-judgment loop inside the machine was not found; the pipeline's honest state is deterministic workers plus human judgment outside.

VERDICT: PARTIAL. The inversion is established: the machinery *named* intelligent is deterministic; the intelligence that is *real* lives in prompts and humans.

SMALLEST CONSEQUENCE: label the workers honestly (deterministic classification, deterministic claim extraction) and stop spending authority language on them. The 100-hour re-aim's MODEL-REQUIRED → MODEL-ASSISTED → DETERMINISTIC pipeline is the correct next frame, and each judgment needs the evidence bar for moving one category before it is deterministicized.

FALSIFYING OBSERVATION: a model/API call in any canonical worker's `handle()` on the live code, or a classification output not derivable from the static tables.

## Q13. What has PING learned that materially changes its next action?

CURRENT CLAIM: PING learns from outcomes and changes its next decision accordingly.

REACHED PATH: the lane-g quarantine event of 2026-09-25 in the live journal; knowledge node confidence fields; the promoter's approval/rejection vocabulary; the journal for retrieval→decision traces.

EVIDENCE (one complete trace, human-driven):
- 2026-09-25 lane-g quarantine: 8 b-radar observations → 8x `SNIPPET_REJECTED` (WRONG_INGESTION_DOMAIN) → nodes down-ranked to 0.2 → tandem emission gated to learn-briefs only (learn-round118, five minutes later; zero sweep-sourced nodes since).
- This is a genuine OBSERVATION → OUTCOME → PATTERN → CANDIDATE LEARNING → SUPPORT SET → PROMOTION → RETRIEVAL → DIFFERENT NEXT DECISION trace.

COUNTEREVIDENCE:
- The learner was humans, not the machine.
- PING's autonomous machinery has zero retrieval→decision instances: 233 candidate / 8 rejected / 0 approved; no retrieval events in the journal. `knowledge_edges` = 0 rows. The promoter records rejections; no approval ever occurred; no consumer reads them.

VERDICT: PARTIAL. The one demonstrated learning loop is human-executed; the machine's learning machinery stores without using. Storing learning without using learning is the current state.

SMALLEST CONSEQUENCE: do not claim the learning loop is live until one logged retrieval after 2026-09-25 15:58 UTC produces a different decision attributable to a node's rejected status or 0.2 confidence. The 100-hour re-aim correctly schedules the learning loop at hours 80-100.

FALSIFYING OBSERVATION: one logged retrieval whose result differs attributable to a node's rejected status / 0.2 confidence, or a demonstrated machine-executed promotion→retrieval→decision chain.

---

## Q14. Can learning corrupt authority?

CURRENT CLAIM: a model output, score, or recommendation could become executable policy somewhere.

REACHED PATH: every traced path from learning-like inputs to executable policy: the promoter, business mission types, engagement guards, emit paths.

EVIDENCE (boundaries hold on every traced path):
- The promoter subscribes only to 4 human-approval event types; 8 rejections in, 0 approvals, 0 self-promotions.
- All business mission types (e.g., LEAD_FOLLOWUP, EMAIL_PROCESS, REVIEW_RESPONSE) route to the effect-less ObservationWorker: recommendations terminate in event emission, not execution.
- Engagement/outreach model judgment passes Nolan's standing authorization plus fail-closed deterministic guards (pass-156: 11 ineligible caught).
- The live log shows `jev-shadow` emit fail-closed on the unowned namespace `jev`.

COUNTEREVIDENCE / latent hazard (watch item, not a proposal):
- Mission types named LEAD_FOLLOWUP / EMAIL_PROCESS / REVIEW_RESPONSE promise effects the wiring does not deliver. If a future real-effect worker is registered under one of these names, the bridge auto-fires it with no approval gate. The mismatch should be labeled.
- Durable approval events (PROPOSED_ACTION / ACTION_APPROVED / ACTION_REJECTED, committed today) have zero instances; `authorizeWorkOrder`'s live-path status is UNKNOWN.

VERDICT: FALSIFIED (for the current system). No traced path lets learning become executable policy. Note this is substantially the safety of inaction: the machinery that would corrupt authority does not act at all yet.

SMALLEST CONSEQUENCE: keep the explicit promotion boundary (human-approval events only) and label the LEAD_FOLLOWUP-style mission names as effect-less today so a future worker registration does not inherit effect authority by name.

FALSIFYING OBSERVATION: an `approved` node with no approval event; a dispatched engagement for a ledger-engaged post or over cap; an external effect with no authorized policy; a successful emit into an unowned namespace.

---

## Q15. Does MarketingOS actually need seven engines?

CURRENT CLAIM: MarketingOS needs Signal, Audience, Opportunity, Content Memory, Experiment, Distribution, and Learning as runtime architecture.

REACHED PATH: the MarketingOS directives (audience intelligence, compounding, archaeology synthesis, projection contract), the live journal tables and event vocabulary, greps of live code for engine services/classes/tables.

EVIDENCE:
- All 7 engines reduce to the same 4 durable homes (`ping_events`, `ping_missions`, `knowledge_nodes`/`knowledge_edges`, Qdrant) under the same 5 authorities; zero engine services, classes, or tables exist in live code.
- Mission labels exist only as string literals in `claim_chaining.js`.

COUNTEREVIDENCE: the five gap classes in the forensic mapping are real behaviors to wire (chaining, contradiction detection, etc.), but none requires a new authority or store.

VERDICT: PROVEN. The seven engines are domain vocabulary over existing canonical machinery, not runtime architecture. The forensic mapping holds under adversarial re-check.

SMALLEST CONSEQUENCE: enforce the vocabulary discipline in the 100-hour sprint: every "engine" deliverable must land as rows in the four homes under the five authorities. Any deliverable that needs a sixth authority or a fifth home fails review.

FALSIFYING OBSERVATION: a MarketingOS-owned table, authority class, or running engine process outside the five authorities / four homes.

---

## Q16. Can MarketingOS discover that its own strategy is wrong?

CURRENT CLAIM: the experiment vocabulary (hypotheses, deliberate variables, verdicts) is live machinery that can detect strategy failure.

REACHED PATH: `claim_chaining.js` / `contradiction_detection.js`, mission result JSONB, the live journal, greps for `qualified_engagement` and experiment rows.

EVIDENCE:
- The experiment vocabulary is landed: SUPPORTED / FALSIFIED / INCONCLUSIVE verdicts exist in `claim_chaining.js`/`contradiction_detection.js` and mission result JSONB.
- The system is honest about empty state: Mission Control renders NOT_STARTED / UNKNOWN with reasons.

COUNTEREVIDENCE:
- Zero experiments have run. Zero metric observations. `qualified_engagement` = zero code hits. The seven-way distinction (reach / engagement / qualified engagement / audience fit / technical credibility / conversion intent / business outcome) lives only in directive prose.
- Across Q16-Q18, doctrine and vocabulary are landed but execution is at exactly one research mission, zero experiments, zero distributions.

VERDICT: PARTIAL. The language for self-correction exists in code; no correction has ever happened. The honest epistemic state (NOT_STARTED, rendered as such) is the correct current answer.

SMALLEST CONSEQUENCE: run the first real experiment through the landed vocabulary (one hypothesis, one deliberate variable, one observation window) before extending it. The 100-hour re-aim's hour blocks 20-40 (editorial judgment) and 80-100 (learning loop) are the right containers.

FALSIFYING OBSERVATION: an EXPERIMENT_RUN row with a verdict plus a `learning` node that changed the next experiment's variable (upgrading this answer), or proof that verdict payloads cannot reach the promoter (downgrading it).

---

## Q17. Can the Audience Graph survive contradictory identity evidence?

CURRENT CLAIM: the Audience Graph handles one-person-several-clusters, anonymous→known transitions, and near-duplicate identities.

REACHED PATH: live journal queries for `audience_cluster` rows; greps for stitch/merge code (`mergeIdentity`, `identity_stitch`); the audience directive.

EVIDENCE: none found for either direction. No audience graph exists (zero `audience_cluster` rows). No stitch/merge code anywhere. Nothing *can* merge on embedding closeness, but anonymous→known linking is also unhandled.

COUNTEREVIDENCE: the audience directive describes the intended behavior, which counts as counterevidence (aspiration), not evidence.

VERDICT: UNKNOWN. There is no graph and no merge code, so the question cannot be answered from evidence in either direction. The one true statement: nothing currently merges on embedding closeness, because nothing merges at all.

SMALLEST CONSEQUENCE: when the first audience graph is built (100-hour re-aim scope), the reversibility and evidence-linking requirements must be in the first implementation, not retrofitted.

FALSIFYING OBSERVATION: a landed, tested, reversible evidence-linked stitch behavior; or discovery of a merge-on-similarity code path.

---

## Q18. Can an opportunity score explain itself?

CURRENT CLAIM: every opportunity ranking decomposes into observations and counterevidence.

REACHED PATH: live journal for opportunity rows; live code for scoring; the projection contract for score-breakdown fields.

EVIDENCE: none. Zero opportunity rows, zero scoring code. Score-breakdown fields exist only in the contract.

COUNTEREVIDENCE: live claims carry evidence but no structured counterevidence field (grep-verified), so even the raw material for explanations is unstructured today.

VERDICT: NOT-REACHED. The question cannot be investigated because the capability does not exist. The contract's score-breakdown fields are the specification waiting for the first implementation.

SMALLEST CONSEQUENCE: the first opportunity implementation must cite observation + counterevidence event IDs per ranking from day one; the contract already requires it.

FALSIFYING OBSERVATION: a real Assessment row citing observation + counterevidence event IDs plus a documented reversal.

---

## Q19. Can research recursively improve its questions?

CURRENT CLAIM: INTELLIGENCE_RESEARCH missions chain: answered questions close, contradictions spawn follow-ups, UNKNOWNs get prioritized.

REACHED PATH: mission 78c88729ceb51f38 (live journal: 12 rows, 3 OBSERVATION_CREATED, 4 CLAIM_CREATED, 3 CONFIRMED, 1 UNCLEAR), the chainer, follow-up mission 3b0f430a06a41357.

EVIDENCE:
- Mission 78c88729ceb51f38: 3/3 questions CONFIRMED, 0 refuted, 1 UNCLEAR (claim `04dec8de`).
- The chainer fired: follow-up 3b0f430a06a41357 created with `causation_id` = the UNCLEAR claim. The machine's proven contribution is the chaining rule + mission machinery.

COUNTEREVIDENCE:
- The follow-up sits `created`/unclaimed; no verdict transition has ever been recorded. The Q19 research leg itself was human-executed (`writer-m-research-worker`, direct SQL readback, ~60ms mission).
- Next-question chaining is a bounded missing behavior, not missing infrastructure (forensic).

VERDICT: PARTIAL. The chaining rule and the mission machinery are proven; the loop has never closed on a machine-driven second pass.

SMALLEST CONSEQUENCE: claim follow-up mission 3b0f430a06a41357 through the existing WorkerRuntime path (unchanged from the archaeology's delta #1; the UNCLEAR rendering-half question is now potentially resolvable since the 8/8 served-route battery landed). That single claim is the cheapest possible test of the loop.

FALSIFYING OBSERVATION: the follow-up claimed and completed with a CONFIRMED/REFUTED verdict on the same claim (upgrading this answer), or proof that follow-ups can never be claimed (downgrading it).

## Q20. Can PING acquire reality without a human carrying observations into it?

CURRENT CLAIM: the `/ingest` seam is live but unmanned: zero live production callers.

REACHED PATH: the served `/ingest` route, the journal's OBSERVATION_CREATED rows with provenance, the metric_ingest_producer, the 2026-10-01 scheduled proof (producer 08:21, observer 09:00).

EVIDENCE (one path proven end-to-end):
- Facebook Page insights → daily-post cron agent (collector, `collected_at` 11:42 MDT) → `metric_ingest_producer.js` → POST /ingest → 11 OBSERVATION_CREATED rows (17:46 UTC, schema `platform_metric/v1`, embedded provenance) → 11 CLAIM_GENERATE missions.
- Live callers in the journal today: `api:muse` (41), `observation` (18), `api` (18), `metric-ingest-producer` (11), `mission-worker` (3).

COUNTEREVIDENCE:
- The trigger was a human-directed manual pass, not an unattended run; the producer is not on the served line; zero unattended callers observed.
- The forensic "zero live production callers" claim is stale (correct as of the forensic date, wrong today), but the manned callers are human-directed, not autonomous.

VERDICT: PARTIAL. The acquisition seam is proven live with real provenance; exactly one end-to-end path is proven; no unattended caller has been observed yet.

SMALLEST CONSEQUENCE: the scheduled proof (2026-10-01 08:21 producer + 09:00 read-only observer) is the next honest data point; expected first broken boundary is SKIP_PRODUCER_NOT_ON_SERVED_LINE. Do not manually rescue the experiment (standing rule).

FALSIFYING OBSERVATION: unattended OBSERVATION_CREATED admissions from metric-ingest-producer inside a cron window with no operator action behind them.

---

## Q21. What can disappear without harming PING?

CURRENT CLAIM: each component's deletion cost is knowable from reached runtime coupling, not from diagrams.

REACHED PATH: served image + journal + :3100 app + Qdrant + repo (for undeployed items). Deletion cost measured as truth loss / capability loss / convenience loss / performance loss / no meaningful loss.

EVIDENCE (per component):
- Qdrant: capability + performance loss, no truth loss. 3 collections (`knowledge` 401 points, 768-dim; `constitutional_documents`; `constitutional_memory` 0 points). Readers are direct clients. Journal + `knowledge_nodes` mirror survive; vectors re-derivable from source docs.
- Mission Control :3100: convenience loss only. No truth loss, no kernel capability loss. `mc-ping-journal.ts` is SELECT-only by construction (proven 2026-09-30); UI mutation cannot change truth through the journal path. (But see Q9: two armed mutation routes exist outside the journal path.)
- ORCA: no meaningful loss to the served path. Zero orca code in the served image; no ORCA process on the Pig; only a stale comment remains. (Counterevidence scope: ORCA/Hermes/Copilot deletion would hurt *agent operations*, not PING semantics; the distinction matters.)
- FYD: product capability loss; zero PING semantic loss. FYD has its own journal (fyd-journal-gateway, append-only JSONL) and its own gateway; nothing in the PING journal or UER depends on FYD.
- CRX: no meaningful loss. CEO order: mine, not dependency. Served residue is only the default DB name `'crx'` at `gateway_runtime.js:140-142` (history, not function).
- Hermes: no served-path loss. Not referenced by any served worker-path file. Transport family in the undeployed work-order contract only.
- Copilot: no meaningful loss to PING. Compute/token source; nothing in the served image or journal references it.
- Oracle (old cloud deployment): no meaningful loss, CONDITIONAL on the Pig being the live plane (today's writes prove it). The Oracle VM's current state was not re-verified; if it still runs writers, the single-writer claim needs re-checking.
- Cloud VM: capability loss (execution fleet); no truth loss. Deleting the fleet host kills the primary headless-execution hand; missions queue but journal and mission state survive.
- Browser worker: capability loss (acquisition hand); no truth loss. `social_ingest_adapter.js` normalizes social events toward the journal (thin; no `emit()` calls of its own).
- Knowledge projections: convenience/performance loss; regenerable. `knowledge_nodes` is provably re-derived (all `source_event_id`s resolve to journal rows); Qdrant vectors re-derivable. Nothing in the kernel reads them to decide.
- Model provider (ollama): capability loss for model-mediated judgments; deterministic machinery unaffected. UER, scheduler, journal, and mission lifecycle use no model calls.

VERDICT: PROVEN for the classification above (each row anchored to a reached artifact).

SMALLEST CONSEQUENCE: the only deletions that destroy truth are the journal DB and the UER emit path. Everything else is a hand, a projection, or a name. Backup priority follows exactly that order.

FALSIFYING OBSERVATION: for any "no truth loss" row, a journal row or mission state that cannot be reconstructed after deleting the component (e.g., a `knowledge_nodes` row with a dangling `source_event_id`); for ORCA, a live process or a journal write whose `source` traces to orca code in the running container.

---

## Q22. Where have we paid twice for the same capability?

CURRENT CLAIM: competing implementations must be found by tracing callers and reached runtime ownership, not by name-matching.

REACHED PATH: served image (ground truth for "paid and live") + repo tree including `.worktrees` (for "paid and stranded"). Repo copies that are lane artifacts or vendored snapshots were deliberately not counted as live competitors.

EVIDENCE (the live double-payment ledger):
1. Event writers: paid ONCE live (UER:246). Repo copies are stranded lane artifacts, not competitors. No live duplication.
2. Identity generators: paid ~10 times, enforced once. 7 dead modules in the served image (0 non-test callers, verified) + inline UER minting (the actual owner) + repo copies. The AUTH-CONV-06 fix (delegate to `IdentityAuthority.generateSpineEventId`) exists only in lane branch `lane/ping-core-perfection-jev`, not the served image.
3. Canonicalizers: paid 3+ times, enforced once (inline `canon` in UER, nested-blind variant). Declared CanonicalAuthority/CanonicalBytes not on the served path; the AUTH-CONV-06 deep-canonical fix is lane-branch only.
4. Approval representations: paid ZERO times live. No journal type, no served module. An absence, not a duplication.
5. Effect identities: paid ZERO times live. `orca/effect_ledger.js` + effect-class docs are repo-only. Absence, not duplication.
6. Replay implementations: paid MANY times, currently idle. 8 replay-named modules in the image and the last REPLAY_COMPLETED is 2026-09-25 (stale). Overlapping modules, no live owner.
7. Knowledge stores: paid 3+ times live with no precedence rule: `knowledge_nodes` PG mirror (241, live), Qdrant `knowledge` (401 points), Qdrant `constitutional_memory` (0 points), `constitutional_documents`.
8. Mission schedulers: paid once live (`mission_scheduler.js`). No live duplication.
9. Capability gates: paid 4 times, no single gate: `authorizeWorkOrder` (repo-only), `authorizeNamespace` (/ingest, live), `exteriorAuthMiddleware` (/events, live), AGENT_PROFILES (repo). Fragmented, not duplicated-live.
10. Worker registries: paid once live (`worker_registry.js` `register()`), plus a dead name-collision (the "WorkerPorts in the Orca scheduler" comment) and repo-only profile registries. Naming collision, not live duplication.
11. Projection systems: paid 4+ times live with no owner: MC SELECT projection, 9 direct Qdrant clients, `knowledge_nodes` mirror, `projection_executor.js`. Declared `projection_authority.py` is Python, not on the Node enforced path.
12. Evidence verifiers: paid 3 times, reached owner unknown: `evidence_authority.js` (image, use untraced), `verifyResultEnvelope` (repo-only), orca-adapter `verifyResultEnvelope`/`verify-matrix.js` (repo-only).

VERDICT: PROVEN. The six live double-payments (identity, canonicalization, knowledge stores, replay, projection, capability gates) are each anchored to reached artifacts; the rest is stranded history, not live competition.

SMALLEST CONSEQUENCE: convergence targets the six live items, in this order: knowledge-store precedence, projection ownership, capability-gate unification, replay module collapse-or-delete, canonicalization enforcement, identity module deletion. The repo-tree copies need no action (they are not live).

FALSIFYING OBSERVATION: a live (non-test) `require()` of any of the 7 identity modules in the running container; a `knowledge_edges` row written by a live process; or a journal write with `source` identifying one of the "dead" replay modules after 2026-09-25.

---

## Q23. What valuable implementation is still stranded?

CURRENT CLAIM: valuable implementation already paid for, minus implementation contributing to a reached product arrow, equals stranded value.

REACHED PATH: orca-adapter (repo, with test evidence), lane branch `lane/ping-core-perfection-jev`, KnowledgePromoter's edge machinery, the 7-mission pipeline's completion history, Mission Control's journal adapter wiring. Assembled by the coordinator from Investigator A's reached artifacts (no investigator was assigned Q23; this answer is derived from served-plane evidence, not a fresh investigation).

EVIDENCE (stranded valuable implementations, each observed, none contributing to a reached product arrow):
1. **orca-adapter**: idempotency keys (sha256 over canonical intent), the reconcile gate (refuses re-dispatch on uncertain prior outcome without explicit reconciliation), `verifyResultEnvelope`, the effect_state vocabulary, 40/40 synthetic selftest plus live smoke. The single most valuable stranded behavior: duplicate-execution prevention for the mission loop.
2. **The AUTH-CONV-06 fixes** (lane branch `lane/ping-core-perfection-jev`): `IdentityAuthority.generateSpineEventId()` delegation + deep-canonical `CanonicalBytes.serializeString` collision check, proven by 4 golden vectors + a contrast test. Stranded in a branch, not in the served image.
3. **KnowledgePromoter's edge machinery**: the promoter runs (nodes live) but emits zero edges. The relationship/pattern layer is built but idle.
4. **The 7-mission constitutional pipeline** (witness/classify/lineage/recommend/project/replay): 400+ completed missions of proven machinery, idle since 2026-09-23 to 25. Stranded by disuse, not by defect.
5. **Mission Control's read-only journal adapter** (`mc-ping-journal.ts`): proven today, but only wired to the newest MarketingOS projection routes; the general MC views still go through older paths.

VERDICT: PROVEN for the identified set (each item anchored to a reached artifact: selftest results, branch contents, row counts, completion timestamps).

SMALLEST CONSEQUENCE: these are the first things to reach for when a reached arrow is blocked, before writing anything new. Item 1 is the highest-value (it directly unblocks safe headless execution); item 2 unblocks the identity/canonicalization double-payment; items 3 and 4 are reuse options, not obligations.

FALSIFYING OBSERVATION: any item on this list observed contributing to a reached product arrow (e.g., the orca-adapter's reconcile gate deployed on the served path, or AUTH-CONV-06 fixes merged into the served image) removes it from the stranded set.

---

## Q24. What part of PING exists because of history rather than necessity?

CURRENT CLAIM: for each major subsystem, we would independently rebuild it given today's canonical spine and today's product requirements.

REACHED PATH: served image + journal liveness. Arbiter: last-write timestamps (live = needed-or-used; stale = history).

EVIDENCE:
- Rebuild YES: `ping_events` + UER + `/ingest` (2580 rows, writes today); `ping_missions` + MissionRuntime + Scheduler + WorkerRuntime (515 missions, completions today); ClaimWorker + KnowledgePromoter live subset (CLAIM_CREATED + knowledge_nodes writes today); `tenants` in principle (multi-tenancy is a standing requirement; single row today is fine); orca-adapter's idempotency/reconcile gate as *behavior* (most valuable stranded behavior; belongs in the served path, not as a separate runtime); Qdrant MAYBE (only if semantic retrieval is a product requirement; nothing in the kernel depends on it); Mission Control YES as product surface / NO as PING semantics (SELECT-only; operator visibility needed, owns no truth); FYD YES as product / NO as PING (separate JSONL journal + gateway).
- Rebuild NO: the full 7-mission constitutional pipeline (stale since 2026-09-23 to 25; the live system does not use it); ORCA as runtime (not deployed; the 2026-09-30 re-aim rules: harvest concepts, no parallel sovereign runtime); CRX (mine, not dependency; residue is a default DB name string); Hermes / Copilot / Ollama as semantics (YES as hands, NO as semantics); Oracle cloud deployment (superseded by the Pig plane); `repository_events` / `canonical_events` / EventBridge feed (both tables 0 rows; the bridge polls emptiness every 5s, a dead feed); zero-row tables (`mission_events`, `mission_executions`, `canonical_events`, `event_outbox`, `knowledge_edges`, `deployment_registry`): schema aspiration with no writer; `constitutional_*` module/doc sprawl (aspirational archaeology; the served path does not read them); 7 dead identity modules (0 callers; pure declaration); 8 replay modules (idle since 09-25; at most one would be rebuilt, only if replay becomes a product requirement again); default DB name `'crx'` at `gateway_runtime.js:140-142` (string history; harmless but telling).

COUNTEREVIDENCE: "stale = history" is not automatic. The 7-mission pipeline going quiet 09-23 to 25 could reflect a deliberate pause (the GO re-aimed effort at FYD/MarketingOS) rather than uselessness. Staleness proves non-use, not non-value. The rebuild answer is NO only in the sense that today's live product requirements do not exercise it.

VERDICT: PROVEN for the table above (each row anchored to liveness evidence or a binding directive).

SMALLEST CONSEQUENCE: the next simplification pass has a concrete keep/delete list. The zero-row tables and the dead EventBridge feed are the cheapest wins: no behavior depends on them (verified by row counts, not by reading docs).

FALSIFYING OBSERVATION: a live journal write after 2026-09-25 with `event_type` in {WITNESS_CREATED, CLASSIFICATION_CREATED, LINEAGE_CREATED, RECOMMENDATION_CREATED, PROJECTION_CREATED, REPLAY_COMPLETED} from a non-test source (resurrecting the full pipeline); or a served read path that queries `mission_events`/`event_outbox` (proving the zero-row tables have readers).

## Q25. What is the smallest complete PING?

### MINIMUM SOVEREIGN SPINE
1. `ping_events` (append-only journal; the truth). 2580 rows, live today, single writer.
2. The UER emit path: validate → deterministic ID → INSERT ... ON CONFLICT DO NOTHING → semantic-collision fail-closed. The only writer; the only door is `/ingest` → CanonicalizationService → UER.
3. The event-ID byte scheme (sha256 over `{eventType, source, namespace?, logical_id|payload}`). Load-bearing for idempotent retries and dedup.
4. `ping_missions` + MissionRuntime lifecycle (created → assigned → started → completed/failed). 515 missions, completions today.
5. MissionScheduler → WorkerRuntime.dispatch (the poll-and-route loop).
6. One closing worker proving the loop (today: ClaimWorker; the role, not the name, is the requirement).
7. The `/ingest` boundary's authorization check (`authorizeNamespace`) as the door's lock. Currently live but fragmented with the other three checks (see Q2 #7).

### REPLACEABLE HANDS
- Execution transports: cloud-subagent fleet (primary per contract), Hermes, Ollama, Copilot broker. None on the served path today; all are hands, none are truth.
- Acquisition adapters: `/ingest` HTTP boundary (live, with real callers), `social_ingest_adapter` (thin, no own emit), browser worker.
- Model provider (ollama container): needed only for model-mediated judgments. The deterministic machinery uses none.

### PROJECTIONS (all derive from the journal; none own truth)
- Mission Control :3100: proven SELECT-only on the journal path (driver-level read-only guard). Operator visibility, owns nothing.
- `knowledge_nodes` PG mirror (241 rows, live; every `source_event_id` resolves to a journal row).
- Qdrant `knowledge` (401 points) / `constitutional_documents` / `constitutional_memory` (0 points): direct clients, no enforced authority.
- `projection_executor.js`; FYD's PingObjectReader BFF (consumer product).
- Note (Q9): :3100 also carries two armed mutation routes (`/api/mc/approvals` unauthenticated, `/api/mc/dispatch` key-gated 503) and the UI-writable `mc-approvals.json` side store. These are live liabilities on the projection, not part of the projection's contract.

### DOMAIN VOCABULARIES (names, not runtimes; keep the words, do not build the systems)
- Mission types: CLAIM_GENERATE, INTELLIGENCE_RESEARCH, WITNESS_CREATE, PROJECTION_CREATE, REPLAY_VERIFY, CLASSIFICATION_CREATE, LINEAGE_CREATE, RECOMMENDATION_CREATE, EMAIL_PROCESS. Routing labels on `ping_missions`.
- ORCA effect classes 01-10 (filesystem / git / database / deployment / connector-write / external-API / website-publish / message / campaign / financial). A useful effect taxonomy, currently repo-only.
- orca-adapter outcome x effect_state vocabulary (`completed|failed|unknown|denied|escalated` x `effect_unknown|effect_hold|effect_none`). The honest-execution language; undeployed.
- MarketingOS residue homes (per the 2026-09-30 100-hour re-aim, binding): observations/claims/signals/metric observations/receipts → `ping_events`; research briefs/experiments/distribution runs+results → `ping_missions`; findings/audiences/opportunities/learnings/playbook candidates → `knowledge_nodes/edges`; semantic retrieval/projection → Qdrant. Vocabulary mapping, not new stores.

### LEGACY / COMPETING IMPLEMENTATIONS (live ones only; repo-tree copies are stranded history)
1. 7 dead identity modules in the served image (0 callers) vs inline UER minting (the real owner).
2. Inline nested-blind `canon` in served UER vs declared CanonicalAuthority/CanonicalBytes (lane-branch fix, undeployed).
3. `mission_runtime.js` → `ping_missions` (live) vs `mission_repository.js` → `missions` (dead; table absent).
4. 9 direct Qdrant clients vs declared (Python, off-path) ProjectionAuthority.
5. `worker_registry.js` `register()` vs the dead "WorkerPortRegistry/Orca scheduler" comment.
6. 8 replay modules, idle since 2026-09-25, no live owner.
7. EventBridge polling two 0-row tables (`repository_events`, `canonical_events`) every 5s.

### UNRESOLVED SEMANTIC OWNERSHIP
evidence, fact, knowledge (3 competing stores), authorization (4 fragmented checks), approval, work order, verification, effect, learning (stored, never used), projection (4 systems), deployment state (`deployment_registry` = 0 rows; admitted provenance gap). 11 of 18.

### REAL MISSING PRODUCT CAPABILITIES (observed gaps, not proposals)
1. No served execution hands for headless work. The work-order contract (authorize → issue → hermes/cloud/ollama/copilot → verify envelope → record) exists only in the repo; the served mission loop closes only for in-process workers. INTELLIGENCE_RESEARCH missions (2 in 48h) have no proven served executor: missions can be created that nothing can execute.
2. Learning is stored but never used. `knowledge_nodes` mirrors events live; `knowledge_edges` = 0; no served path reads a learning back into a different next decision. (The 100-hour re-aim schedules this as hours 80-100: future work, correctly not present.)
3. Approval / effect / verification have no canonical representation. Zero APPROVAL_*/EFFECT_*/FACT_* types in the journal; the honest-execution vocabulary (unknown-outcome, effect_state) is undeployed. Any consequential external effect today cannot be represented in PING's own truth language.
4. Deployment provenance is unwritten. `deployment_registry` is empty and an undocumented image promotion is admitted in writing (ORACLE-STATUS-2026-09-22). "What software is running" cannot be answered from canonical state.

### STRANDED VALUABLE IMPLEMENTATION
See Q23: (1) orca-adapter (idempotency keys, reconcile gate, `verifyResultEnvelope`, effect_state vocabulary; 40/40 synthetic selftest + live smoke); (2) AUTH-CONV-06 fixes in lane branch `lane/ping-core-perfection-jev` (IdentityAuthority delegation + deep-canonical collision check; 4 golden vectors + contrast test); (3) KnowledgePromoter's idle edge machinery; (4) the 7-mission constitutional pipeline (400+ completed missions, idle since 09-23 to 25); (5) Mission Control's `mc-ping-journal.ts` read-only adapter (proven, partially wired).

---

## THE FINAL QUESTION: the three things preventing PING from being dramatically more useful to Nolan today

These are observed from the served plane, not the most intellectually interesting gaps. They are the next build candidates because each one is a capability Nolan's current programs (MarketingOS 100-hour sprint, FYD, engagement) are already trying to use and finding absent.

1. **The served runtime has no hands for real-world work.** Missions can be created (`INTELLIGENCE_RESEARCH` is already in the journal, twice in 48h), but the only executor that closes the loop in production is in-process workers doing self-checks. The proven headless-execution path (authorize, issue, transport via cloud/hermes/ollama, verify the envelope, record WORKER_COMPLETED) sits in `~/workspace/orca-adapter` and the work-order contract, undeployed. Until a served executor exists, PING can observe and claim but cannot *act* through its own machinery; every real action still rides on ad-hoc agent tooling outside the journal. Corroboration: the scheduler starves 25 CLAIM_GENERATE missions behind zombie retries (Q11); the adapter boundary is airtight but repo-only (Q7). (Evidence: zero orca/authorizeWorkOrder code in the served image; today's MISSION_COMPLETED payloads are journal self-checks.)

2. **Nothing PING "learns" changes its next decision.** Knowledge is mirrored diligently (`knowledge_nodes` live, Qdrant 401 points) and edges are never written (`knowledge_edges` = 0). There is no served path from a stored learning back into a mission, a claim, or a ranking. PING is currently a write-only memory: it remembers everything and consults nothing. The one demonstrated learning loop was human-executed (Q13). Corroboration: zero experiments, zero opportunity rows, zero audience rows in the MarketingOS leg (Q16-Q18); the promoter records rejections with 0 approvals and no consumer (Q14/E). (Evidence: edges=0; no retrieval→decision trace on the served path; the 100-hour re-aim correctly places the learning loop in hours 80-100.)

3. **Authority is declared, not enforced, so every new consumer re-derives the rules.** Seven identity modules with zero callers; projection and embedding authorities bypassed by direct clients; authorization split across four checks; approval, effect, verification, and deployment state with no canonical representation at all; the real approval path (AUTHORITY.json) is self-attested prose with uncommitted edits. The practical cost: each lane re-implements the same capability (the Q22 double-payment ledger), because the "authorities" are documentation that happens to be written in JavaScript. The smallest complete PING above is the enforcement list: everything on it must be *reached*, not just *named*. Corroboration: 11-of-18 unresolved ownership (Q2); the unauthenticated approvals route with a real APPROVED decision on record (Q7/Q9); AUTHORITY.json as the real authority entry (Q6). (Evidence: AUTH-CONV-06 findings labeled-but-unfixed; zero-caller greps; the `p0prop-ac04480a6d1809fd` APPROVED decision via an unauthenticated route on 2026-09-28.)

---

## Cross-investigator notes for the coordinator

- Investigator A's "Mission Control proven SELECT-only" and Investigator C's "projection with two armed mutation paths" are consistent: the journal-read path is SELECT-only by construction; the mutation routes (`/api/mc/approvals` unauthenticated, `/api/mc/dispatch` key-gated 503) and `mc-approvals.json` are separate live surfaces. The unauthenticated approvals route with a real APPROVED decision on record is the one finding in this report that is an actionable security surface rather than an architectural observation.
- Investigator D's "scheduler is pathological" and Investigator B's "deployed scheduler fabricates failure reasons" are the same defect viewed from operations and from code: the deployed image `repair-cert-20260924` lacks the checkout's repairs (timeout→HOLD, structured receipts, `_reconcileUnknown`).
- Investigator A's "/ingest is manned" supersedes the forensic "zero live production callers" claim; Investigator D's Q20 narrows it: the one proven end-to-end path (Facebook Page insights → metric_ingest_producer → /ingest → 11 OBSERVATION_CREATED rows) was human-triggered. Manned by humans, not yet by the machine.
- Investigator F's honest-UNKNOWN finding (Mission Control renders NOT_STARTED/UNKNOWN with reasons) is corroborated by E's promoter findings and B's Q4: the honest vocabulary exists; the deployed dispatch loop does not honor it.
- Method compliance: no investigator proposed or created any authority, store, writer, coordinator, or registry. All "smallest consequences" are keep/delete/enforce/gate decisions over existing artifacts.

## Open unknowns (honest, not gaps to fill)
- Current state of the old Oracle Cloud VM (superseded per 09-22 docs; not re-verified). If it still runs writers, Q1/Q21's single-writer claims need re-checking.
- Whether `evidence_authority.js` is called by any live claim path (module present, callers untraced).
- `constitutional_documents` Qdrant collection contents (listed but not inspected).
- The 28 `created` + 3 `retry_pending` missions: drain or stuck (reaper-vs-HOLD design gap noted in AGENTS.md).
- Live-plane health observed 2026-09-30 ~16:05 MDT: gateway `/health` reports overall "unhealthy", event_governance "degraded" (15381 passed / 1533 rejected / 30717 total). Observed, not diagnosed; reader posture.

---

*End of report. 24 verdicts: 7 PROVEN, 14 PARTIAL, 1 FALSIFIED, 1 UNKNOWN, 1 NOT-REACHED. All 25 questions addressed; Q25 as the synthesis above. No architecture proposed; no code changed; no state changed.*
