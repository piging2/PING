# OBS4 — Governance / Approval Traceability

**Worker:** OBS4 · **Mode:** READ-ONLY; COMMITS CREATED: NONE; PROPOSE ONLY (no patches applied) · **Date:** 2026-09-23 ~20:10 MDT
**Bases:** (b) CORE `/home/nolan/ping` @ `refactor/runtime-authority-convergence` (PRIMARY, read-only: no writes, no process touches, secrets metadata-only) · (a) ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f`
**Read first:** AUTHORITY-MAP.md, SECURITY-SWEEP.md, EVENT-FORENSICS.md, REACHABILITY.md (all read before this pass).
**Transport:** Pig via `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'` (stdin-fed); batched, polite on the shared machine.

**Method:** sampled 9 consequential decisions across both repos (approvals, capability grants, executions, witness certifications). For each, applied the minimum constitutional observability checklist (WHAT HAPPENED / WHO / WHY / WHAT AUTHORIZED / WHAT CHANGED / WHAT EVIDENCE / CAN IT REPLAY / CAN IT RECOVER) against code only. Code beats stale audit .md (per task rule). Marking: **ANSWERED** / **ANSWERED-BUT-UNVERIFIED** / **UNANSWERABLE**.

**SEC3 coordination note (not duplicated):** ApprovalAuthority's condition evaluation (`_evaluateApprovalConditions`: `testResults.passed || true`, `replayResult.matches_original || true`) and the hardcoded "automatic → approved" policy default are the SEC3 attack surface. This pass cites them only as evidence for the WHY slot of items G7/G8 (why approval conditions are vacuous); the exploit analysis belongs to SEC3.

---

## Checklist matrix

Legend: **A** = ANSWERED · **A?** = ANSWERED-BUT-UNVERIFIED · **U** = UNANSWERABLE · slot order: WHAT HAPPENED / WHO / WHY / WHAT AUTHORIZED / WHAT CHANGED / WHAT EVIDENCE / CAN IT REPLAY / CAN IT RECOVER

| # | Decision (sample item) | WHAT | WHO | WHY | WHAT AUTH | CHANGED | EVIDENCE | REPLAY | RECOVER |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Adapter: human approval of Ask PING proposal (`submitProposal`, ping-object-reader.ts:1297; `api/ping/proposal/route.ts`) | A | A | A | A | A | A | A | U |
| G2 | Adapter: customize `approve` journaling a directive (`api/fyd/customize/route.ts`; `customize/server.ts:buildDirective`) | A | A? | A | A | A | A | A | A |
| G3 | Adapter: capability grant decision (`grantsForViewer`, grants.ts:41; `planActionsPure`, action-planner.ts) | A | A | A | A | U | U | A | U |
| G4 | Adapter: claim verification CLAIMED → VERIFIED-CONTROLLED (`verifyControl`, claim/machine.ts:113; `api/fyd/claims/[resourceId]/verify/route.ts`) | A | A? | A | A | A | A | A? | A |
| G5 | Adapter: owner command application (`applyOwnerCommand`, owner-store.ts:150 → owner-events.ts) | A | A? | A | A | A | A | A | A? |
| G6 | Adapter: social write execution (`createFydPost`/`followIdentity` + attestation-gate.ts C4 gate) | A | A | A | A | A | A | A | U |
| G7 | Core: `ApprovalAuthority.requestApproval` / `approveManually` (gateway/approval_authority.js) | A | A? | A | A | A | A? | A? | U |
| G8 | Core: `MissionExecutionAuthority.executeMission` approval-gated execution (gateway/mission_execution_authority.js) | A | U | A? | A | U | A | U | U |
| G9 | Core: `ContinuousReplayAuthority` ReplayCertificate issuance (gateway/continuous_replay_authority.js:45) | A | A? | A | A? | A? | A? | U | U |

**Negative samples (recorded, not in matrix):** `CertificationAuthority.certify` (gateway/certification_authority.js) — zero code callers in the runtime (only its file + `tests/certification/certification_validation.test.js`); it is unwired, so any "certified artifact" claim in the live path is UNANSWERABLE. Certificate machinery `replay_certificate.js` / `replay_certificate_authority.js` instantiates `new ReplayCertificate()` at module scope (lines 328 / 207) — evaluation-time objects, not runtime decisions.

---

## Shared-record rows

### G1 — submitProposal: human approval of Ask PING proposals (ADAPTER)
- **WHAT HAPPENED:** A — route + `submitProposal(viewerId, proposal)` re-verifies `proposal.digest` via `verifyProposalDigest` (ask-composer digest law; sha256 over canonical bytes of the proposal body), enforces controller-only updates, checks grants, then journals the approved change as a governed signed envelope (`OBJECT_UPDATED`/`OBJECT_CREATED`) via `submitSignedEvent`.
- **WHO:** A — `viewerId` from `getPracticeIdentityId()` (practice session); for `site_patch` the lane signs as the FYD lane's own key material and submits "as the viewer identity" (ping-object-reader.ts:1293-1296 comment: "Agents propose; they cannot publish").
- **WHY:** A — route header states the intent explicitly ("The digest is re-verified server-side; any modification after drafting fails"); approval = human act on a drafted AskProposal.
- **WHAT AUTHORIZED:** A — digest equality + controller check + `grantsForViewer` (`site.propose`) for site patches.
- **WHAT CHANGED:** A — one journaled event carrying `proposal_digest` and `site_spec_digest` (for site_patch) in its payload (reader:1346-1347).
- **WHAT EVIDENCE:** A — the event on the gateway journal (`ping_events` per EVENT-FORENSICS); event payload rebinds the digest.
- **CAN IT REPLAY:** A — the journaled event is part of the sovereign journal; the proposal itself can be re-derived and its digest recomputed from canonical bytes.
- **CAN IT RECOVER:** U — no reversal path for a journaled approval was observed in-repo (append-only journal; no "un-approve" command).
- **Digest binding (SEC3 question): approval for X CANNOT authorize Y.** Three independent bindings: (1) `verifyProposalDigest` recomputes the digest from the exact bytes being submitted at approval time; (2) `envelope.payload_hash === proposal.digest` enforced at reader:1337-1339; (3) the route re-reads the CURRENT SiteSpec and rejects on `siteSpecDigest` drift (409-equivalent 400 "site changed since drafted"). The approval is structurally bound to the digest, not to a mutable label.

### G2 — customize `approve`: owner directive journaling (ADAPTER)
- **WHAT HAPPENED:** A — `action: "approve"` re-derives the whole parse→resolve→propose chain from the raw text against the CURRENT spec, re-verifies every digest, and only then journals the directive as an overlay event; `action: "clear"` can remove a directive from the journal (demo only).
- **WHO:** A? — approval record stamps `approvedBy: "demo-owner (seeded, unverified)"` (customize/server.ts:137). The identity is a literal string; the code labels itself honestly as non-authentication (route NOT_REAL_AUTH constant). So WHO is recorded but cryptographically UNVERIFIED.
- **WHY:** A — the re-derived intent + human review-card approval; 409 on stale digest ("the spec moved since the proposal was drafted").
- **WHAT AUTHORIZED:** A — demo-owner-mode gate: `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` AND private/localhost host (`isPrivateHost`), plus `evaluateCapability(DEMO_OWNER_ACTOR, …, "owner.customize-approve")`. Conspicuously labeled non-auth (SECURITY-SWEEP F3).
- **WHAT CHANGED:** A — a presentation-intent directive in the journal with `intentId = "pi-" + sha256(siteId|proposalDigest)[0:16]`, storing `proposalDigest`, `approvedBy`, `approvedAt`, `eventId`.
- **WHAT EVIDENCE:** A — `GET ?view=inspect` exposes the directive list with digest, approver, timestamp, and journal eventId.
- **CAN IT REPLAY:** A — directive ID is deterministic from (siteId, proposalDigest); the inspect view re-derives state from the journal.
- **CAN IT RECOVER:** A — `clear` action removes the approved directive (demo only); nothing persists beyond the journal.
- **Digest binding: approval for X CANNOT authorize Y** — intentId and the approval record are derived from the proposal digest itself; a changed proposal yields a different intentId.

### G3 — capability grant decision `grantsForViewer` (ADAPTER)
- **WHAT HAPPENED:** A — pure function returning granular grants: everyone gets `object.reference`; controller of a site-capable object gets the `maintain_site` bundle (`site.read`, `site.propose`, `object.reference`); agents NEVER get publish/message/purchase/advertise/provider/mutate.
- **WHO / WHY / WHAT AUTHORIZED:** A — derived deterministically from `(viewerId, controllerId, isSite)`; deny-list is explicit in code (grants.ts:46-53).
- **WHAT CHANGED / WHAT EVIDENCE:** U — no grant record is written anywhere; grants are recomputed per call. There is no durable artifact of "who was granted what at time T."
- **CAN IT REPLAY:** A — pure deterministic function; same inputs always yield same grants.
- **CAN IT RECOVER:** U — nothing to recover (no state), but equally nothing to audit retroactively.
- **Digest binding:** N/A — no approval step exists; the grant is a derivation, not a decision with a token that could be rebound. **Observability gap:** the grant decision leaves zero trace (next adjacent gap candidate).

### G4 — claim verification (CLAIMED → VERIFIED-CONTROLLED) (ADAPTER)
- **WHAT HAPPENED:** A — `verifyControl` requires an implemented verification method (only `operator-attestation`) and a ≥10-char human-readable basis; transitions state and appends an audit event.
- **WHO:** A? — `proof.verifiedBy` = self-asserted `operatorLabel`. The verification seam is honestly labeled "a statement, not a cryptographic proof" (verification-seam.ts; seam.test.ts asserts the honest-labeling contract). Identity claimed but cryptographically unverified.
- **WHY:** A — the human-readable `basis` is mandatory and recorded in the audit event.
- **WHAT AUTHORIZED:** A — demo-owner-mode gate on the route (403 otherwise); the claim machine itself refuses invalid transitions and corrupt state (`ClaimError`, fail-closed).
- **WHAT CHANGED:** A — `data/fyd-claims/<resourceId>.json` (atomic tmp+rename) gains a history entry (`verify-attempt` events also recorded without changing state).
- **WHAT EVIDENCE:** A — the claim file's audit history; failed attempts are also audited.
- **CAN IT REPLAY:** A? — the state fold is pure and append-only, but the "verification" itself is a labeled human statement; replay reproduces the record, not the human judgment behind it.
- **CAN IT RECOVER:** A — `release()` returns CLAIMED/VERIFIED-CONTROLLED → OBSERVED, clearing identity and proof while preserving history.
- **Digest binding: approval for X CANNOT authorize Y at the machine level** — the audit event binds (resourceId, method, basis); but the authorizing layer is a config flag (demo mode), so ANY operator holding the flag can verify ANY resource — the machine binds the record, the gate does not bind the operator.

### G5 — owner command application (ADAPTER)
- **WHAT HAPPENED:** A — `applyOwnerCommand` validates + translates commands (correct/hide/restore/confirm/add-service/visibility) into event drafts; `appendOwnerEvent` appends provenance-backed events with sha256 content-hash IDs (`fyd-owner@1` generator binding); `projectOwnerState` folds the log (owner-events.ts).
- **WHO:** A? — demo-owner actor (labeled unverified); owner-events tests prove fold-twice byte-identity (REACHABILITY A1).
- **WHY:** A — each event carries provenance (the command and its basis).
- **WHAT AUTHORIZED:** A — demo-owner-mode gate on the overrides route + tenant assert (#28 scoped wrappers; adoption partial).
- **WHAT CHANGED:** A — `data/fyd-owner/<objectId>.json` append-only log; overlay composed after graph verification.
- **WHAT EVIDENCE:** A — the event log itself; content-hash IDs bind each decision to its payload.
- **CAN IT REPLAY:** A — pure fold; proven by test (fold twice → byte-identical; replay digest == live digest).
- **CAN IT RECOVER:** A? — append-only revert events exist (test A1: "append-only revert keeps both events"); no true deletion was observed.
- **Digest binding: approval for X CANNOT authorize Y** — event IDs are content hashes; changing the command changes the ID.

### G6 — social write execution with C4 attestation gate (ADAPTER)
- **WHAT HAPPENED:** A — `createFydPost`/`followIdentity` (actions.ts:53-205) mint signed envelopes, submit to the gateway journal, then `attestRelationshipState`/`attestObjectCreated` (attestation-gate.ts:72,130) re-read the journal and refuse to report success unless the journal actually carries the claimed state (ATTESTATION_REJECTED with named missing evidence).
- **WHO:** A — gateway-minted `identity_<16hex>`; Ed25519 signature from FYD key custody (FYD_DEV_KEY_DIR, 0600).
- **WHY:** A — the requested social action (follow/post/unfollow) via the route.
- **WHAT AUTHORIZED:** A — dev keypair custody + deterministic action ID (`fydActionId` sha256) with C1 dedupe against net journal state.
- **WHAT CHANGED / WHAT EVIDENCE:** A — journaled events; the attestation is itself a journal re-read (the journal is the evidence).
- **CAN IT REPLAY:** A — journal-backed; idempotent via content-hash action IDs.
- **CAN IT RECOVER:** U — no unfollow-of-failure reversal path traced; attestation only gates the success report.
- **Digest binding: approval for X CANNOT authorize Y** — action IDs are content hashes; the attestation re-reads the exact claimed state.

### G7 — `ApprovalAuthority.requestApproval` / `approveManually` (CORE)
- **WHAT HAPPENED:** A — `requestApproval({patch_validation, test_results, replay_result})` computes a policy (hardcoded default: `automatic`), evaluates conditions, writes an `approvals` row (`approval_id`, `patch_id`, policy, status, conditions JSONB, witness_hash, approved_by, approved_at) and creates a witness via `witnessAuthority.createWitness`.
- **WHO:** A? — automatic policy stamps `approved_by = 'system'` (approval_authority.js:106); `approveManually` takes `approvedBy` as a free string parameter — self-asserted, unverified, no auth check on the caller.
- **WHY:** A — but vacuous: `_evaluateApprovalConditions` uses `testResults.passed || true` and `replayResult.matches_original || true` (approval_authority.js:163-167), so the test and replay conditions can never block; `_determineApprovalPolicy` hardcodes the automatic policy ("Default to automatic policy for now"); `_determineApprovalStatus` then returns `'approved'` unconditionally for automatic. The WHY is formally recorded in `approval_conditions` but is a rubber stamp (SEC3's attack surface; recorded here only).
- **WHAT AUTHORIZED:** A — the policy rules; no human or cryptographic authorization exists on the automatic path.
- **WHAT CHANGED:** A — the `approvals` table row + witness.
- **WHAT EVIDENCE:** A? — the DB row and `witness_hash` exist; but the witness certifies conditions that are tautologically true, so the evidence's *meaning* is UNVERIFIED (form over substance).
- **CAN IT REPLAY / CAN IT RECOVER:** A? / U — the row is re-queryable (`getApproval`, `getApprovalsForPatch`, `getPendingApprovals`), but replaying "approval" reproduces the rubber stamp; no revoke/un-approve path exists (`reject` sets status but there is no state machine preventing a rejected patch from being re-requested).
- **Digest binding: approval for X CAN authorize Y.** `_generateApprovalId(patchId)` hashes only `{patch_id, timestamp}` (approval_authority.js:347-351) — the approval is bound to the patch *label*, not to the patch *bytes*. A different patch under the same `patch_id` receives the same approval identity. `mission_executions` stores `patch_hash` (the real digest) but the `approvals` table and the approval object never reference it. `approveManually` approves by `approvalId` with no digest check. **This is the single clearest digest-binding failure found in the sample.**

### G8 — `MissionExecutionAuthority.executeMission` approval-gated execution (CORE)
- **WHAT HAPPENED:** A — 13-step pipeline: retrieve mission/repo/memory → context → prompt → Ollama completion → patch validation → tests → replay → `_requestApproval` (G7) → `_commit` → witness → checkpoint → `mission_executions` row + MissionCompleted event.
- **WHO:** U — `_invokeOllama` produces the patch; no operator identity is recorded for the execution decision itself (execution_id is derived from missionId + timestamp, not from an approver).
- **WHY:** A? — the mission record; the approval gate is G7's rubber stamp (so WHY inherits the vacuity).
- **WHAT AUTHORIZED:** A — `_commit` refuses unless `approval.status === 'approved'`. **However:** `requestApproval` returns `approval_status`, not `status` — so `approval.status` is always `undefined` and `_commit` ALWAYS throws "Cannot commit unapproved patch" (mission_execution_authority.js:363-372 vs approval_authority.js:101-121). The approval gate is structurally broken (fail-closed): the pipeline can never reach `_commit` successfully. Wire-reachable via `gateway/activities/mission.activity.js`, `self_improvement_loop.js`, `continuous_reflection_loop.js`, so the broken gate is not dormant — it is live-dead.
- **WHAT CHANGED:** U — because of the `_commit` mismatch, no commit can complete through this path; whether any `mission_executions` rows with status `completed` exist could not be verified from code alone (read-only code scope; DB not queried — would need the reachability/worker lane).
- **WHAT EVIDENCE:** A — the design evidence is complete (hashes of context/prompt/patch/replay recorded), but it is evidence of a pipeline that cannot finish.
- **CAN IT REPLAY / CAN IT RECOVER:** U / U — the checkpoint authority call exists in code but was not verified live; nothing downstream can execute.
- **Digest binding:** moot — the gate never passes, so no approval ever authorizes anything. The hazard is not X-authorizes-Y but *approval-theater*: G7 rows record "approved" patches that the (broken) executor can never act on, and a future fix to the `status`/`approval_status` field-name bug would instantly arm the rubber-stamp approvals without any binding review.

### G9 — `ContinuousReplayAuthority` ReplayCertificate issuance (CORE)
- **WHAT HAPPENED:** A — `replayBranch`/`replayPR` run replays, build `ReplayCertificate` (certificate_id, replay_id, branch, commit, execution_graph_hash, reducer_hash, snapshot_hash, state_hash, event_root, merkle_root, witness_hash, replay_hash) with a canonical `certificate_hash` and a witness; `verifyCertificateEquivalence` compares `certificate_hash` equality.
- **WHO:** A? — `authority: 'ContinuousReplayAuthority'` self-declared; the witness is created with `success: true` **hardcoded** (`_createWitness`, continuous_replay_authority.js:87-99) — the witness asserts success without checking any comparison outcome.
- **WHY:** A — branch/commit replay comparison; the comparison function exists (`_compareCertificates`, line 414).
- **WHAT AUTHORIZED:** A? — issuance is automatic (no authorization gate observed); the certificate is a claim, not a permission.
- **WHAT CHANGED / WHAT EVIDENCE:** A? — certificates are constructed in memory and returned; durable persistence of issued certificates was not traced (append_orchestrator.js:120 writes certificate fields somewhere — scope boundary; unverified).
- **CAN IT REPLAY:** U — `runtime/replay/` is an empty directory (REACHABILITY B5); the certification tests that import it cannot load. A certificate claims a replay happened, but the replay kernel the certificate names does not exist on disk in the audited form.
- **CAN IT RECOVER:** U — no recovery path observed.
- **Digest binding:** the certificate binds its own content via `certificate_hash` (good), but the *certification decision itself* (issue/don't issue) is not bound to any passing check — `success: true` is unconditional and `signature` defaults to null with no observed signing step in the continuous path.

---

## Cross-cutting traceability findings

1. **Adapter lane: approval↔digest binding is genuinely enforced (G1, G2, G5, G6).** The FYD adapter recomputes digests from canonical bytes at approval time, binds envelopes to payload hashes, and re-reads current state before approving. Approval-for-X-authorizes-Y does not occur in the sampled adapter paths.
2. **Core lane: approval is label-bound, not digest-bound (G7).** The one place the sampled core records approvals, the approval ID is `hash(patch_id, timestamp)` — no patch digest involved. Approval for X can authorize Y under the same patch_id.
3. **Core lane: the approval-gated executor cannot execute (G8).** `_commit` reads `approval.status`; `requestApproval` returns `approval_status`. Field-name mismatch → every commit throws. Fail-closed, but it means the live-dead pipeline's "approved" records (G7) are theater.
4. **Witness certifications are partially theater (G9).** `success: true` hardcoded in the witness constructor; `signature` defaults null; the replay kernel named by certificates is an empty directory.
5. **Unwired certification (negative sample).** `CertificationAuthority.certify` has no runtime callers — only a test. Any production claim citing it is UNANSWERABLE.
6. **Capability grants leave no trace (G3).** The most carefully designed authorization in the adapter (`grantsForViewer` deny-list) produces no durable record. Retrospective "who was allowed to do what, when" is UNANSWERABLE by construction.
7. **Claim "approvals" are config-flag authorized (G4).** The machine binds the record honestly (method + basis + history), but the authorizing fact is a demo env flag — so binding the record cannot bind the operator.

---

## Next adjacent gap (for the coordinator)

**Verify the `approvals` table in the live database.** This pass established from code that (a) `requestApproval` rubber-stamps automatic approvals bound only to `patch_id`, and (b) `_commit` can never succeed due to the `status`/`approval_status` mismatch. What code cannot show is whether the `approvals` table in the live `ping-postgres`/`brain-postgres` actually contains rows — i.e., whether mission activities (`self_improvement_loop`, `continuous_reflection_loop`, `mission.activity.js`) have been executing `executeMission` and accumulating "approved" records for patches that were never (and can never) be committed. A read-only DB query (`SELECT approval_id, patch_id, approval_status, approved_at FROM approvals ORDER BY created_at DESC LIMIT 20`) plus the same for `mission_executions` would settle: is the approval theater purely code, or is it accumulating misleading state in production? This needs the worker lane with DB read access — do not guess from code.
