# PING Decision Surface

Lane 11, 2026-09-28 ~14:45 MDT. Read-only survey of the canonical tree
(`/home/nolan/projects/ping`, HEAD 0264d517) and the ORCA adapter
(`/home/nolan/workspace/orca-adapter`). Every claim below is a HYPOTHESIS
until replayed from a clean checkout.

## Vocabulary

Classification: DETERMINISTIC (same inputs always produce the same output,
no judgment), BOUNDED DECISION CANDIDATE (typed judgment with a closed
contract; the tournament pool), DEEP REASONING (open-ended judgment, not
tournament-safe), HUMAN AUTHORITY (only a human may decide), UNKNOWN.

Carried-verdict column uses the Lane 2 donor benchmarks (T1: Talos
double-kernel mint re-runs policy.decide() at issue, never trusts a carried
verdict; T2: kernel-derived action fingerprint recomputed at redeem plus
approval TOCTOU recheck; P2: Pioneer startup execution-authority integrity
gate, quarantine never synthesize). Donor claims are hypotheses until
clean-checkout replay.

## DETERMINISTIC (16)

### D-01 mc.authorize_work_order/v1 — Decision Unit #1
- Semantic owner: PING (ping:external-agent-adapter)
- Input: {agentId, capability, namespace, constraints}
- Required evidence: AGENT_PROFILES registry facts + request fields
- Allowed outputs: GRANT | DENY with typed reason
- Implementation: /home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js:185,
  8 ordered fail-closed checks. Verified read-only.
- Callers: adapter.js dispatchExecution (line 1239) and issueWorkOrder
  (line 185 file internal, called at adapter.js:1298)
- Reachability: live in the loop proof per the seam report
- Criticality: C4. Reversibility: DENY is pure; GRANT issues a work order
  (reversible via reconciliation/HOLD). Blast radius: one work order.
- Authority required: PING executor CapabilityAuthority
- Tests: NONE dedicated (confirmed: no test file references
  authorizeWorkOrder). Selftests exist for reconcileGate and tenant
  threading but not for this function. GAP.
- Final-label source: live function output in the loop proof
- Historical samples: 6 real Jev shadow samples vs current outputs, 6/6
  agreement at 0.5, Brier 0.0076
- Carried-verdict (T1): authorize re-runs INSIDE issueWorkOrder at
  adapter.js:1298, so the issue point re-derives rather than trusting the
  line-1239 verdict. T1-ALIGNED at issue. BUT the issue→invoke boundary
  (line 1353, after the index lock is released) trusts the carried
  WorkOrder with NO redeem-time re-decide. GAP vs T1.
- Jev: SHADOW, zero authority.

### D-02 identity fence — identity_5..10 DENIED
- Input: agentId. Output: DENY with typed authorization_refusal. Pure,
  static, first check in dispatchExecution (adapter.js, step 1). Binding
  owner directive 2026-09-25. Carried-verdict: re-evaluated per dispatch.

### D-03 reconcileGate — "Is this duplicate? Should we retry?"
- Input: {evidenceDir, execution, input, tenant_id, capability, reconciliation}
- Output: {allowed, idempotency_key} | refusal with typed reason
  (duplicate_attempt, idempotency_index_corrupt, artifact_exists)
- Implementation: adapter.js:429, atomic under the cross-process index lock.
  Aligns with Pioneer P3: the durable index binding outranks any replay
  instinct; UNKNOWN stays HOLD, never auto-retries.
- Tests: reconcile-gate-selftest.js present (not executed here).

### D-04 resolveTenantId — tenant derivation
- Throws fail-closed on namespace contradiction; never dispatches on
  mismatch (adapter.js:89). Per-request re-derivation.

### D-05 mc-dispatch-identity — trusted caller context
- Maps x-mc-caller-key to {agent_id, tenant, entitled_tenants} from the
  operator-provisioned registry, read per request.
  src/app/api/mc/_lib/mc-dispatch-identity.ts. Re-resolved per request:
  no carried identity verdict.
- Sibling mirror: SLICE_AGENTS allowlist + DEADLINES in mc-dispatch.ts are
  documented as a defense-in-depth MIRROR ONLY; "the adapter is consulted
  for real on every dispatch and its verdict is final." Drift risk if the
  mirror ever widens beyond the adapter: flagged, not a current defect.

### D-06 callerScope — MC missions read gate
- src/app/api/mc/_lib/mc-tenant-gate.ts. operator|tenant|400 on malformed
  header, 403 cross_tenant_denied on cross-tenant [id]. Fail-closed.

### D-07 grantsForViewer — user-facing grant authority
- src/lib/ping/grants.ts. Pure: (viewerId, controllerId, isSite) -> grants.
  Explicitly NOT the executor CapabilityAuthority; confusing the two would
  be an architectural error per the file's own comment.
- Tests: exercised in src/fyd/ask/__tests__/ask-fyd.test.ts.

### D-08 planActions — "What next?"
- src/lib/ping/action-planner.ts. Pure, capability-aware: which actions are
  available for (viewer, target). Same function drives the human UI and the
  agent context builder. Tests: lane-a.test.ts (14 tests across the lane).

### D-09 rankDiscoveryItems — "Which?" ranking
- src/lib/ping/feed-rank.ts. score = kindWeight + recency + actorProximity,
  total order with id tiebreak. Pinned nowIso for replay. Tests: lane-a.test.ts.

### D-10 composeAnswer — evidence-bounded answer
- src/lib/ping/ask-composer.ts. Pure function of (bounded context,
  question). Every factual sentence cites evidence; no evidence -> says so.
  Includes AskClaimClassification (DIRECT_FACT, DERIVED_FACT, INFERENCE,
  GENERATED_COPY, USER_OVERRIDE) and unknowns list. Tests: lane-a.test.ts.

### D-11 sha256-canonical-json-v1 — "Is this canonical? Same entity?"
- src/lib/ping/digest.ts. The ONE digest definition; lanes import, never
  re-implement. workOrderId = sha256('workorder:' + taskId)[0:16] is a
  deterministic ID, NOT a T2-style fingerprint over
  tool/identity/args/targets. GAP vs T2: no kernel-derived target binding.
- Tests: digest.test.ts.

### D-12 OUTCOME vocabulary — "Did this actually succeed?"
- /home/nolan/workspace/orca-adapter/outcomes.js. Terminal states
  completed|failed|unknown|denied|escalated, orthogonal EFFECT_STATE.
  UNKNOWN is first-class and NEVER collapses into FAILED. PING's UNKNOWN
  doctrine is STRONGER than both donors here.

### D-13 attestation gates — evidence preconditions before success claims
- src/fyd/owner-mode/attestation-gate.ts and
  src/fyd/social/attestation-gate.ts. Missing evidence ->
  ATTESTATION_REJECTED, success never reported. NOTE: the owner-mode gate
  is DEMO ONLY and must never be consulted for a real authorization
  decision (file says so explicitly).

### D-14 verifyProposalDigest — proposal tamper detection
- ask-composer: a proposal's digest must match exactly before approval;
  mismatch refused with no state change.

### D-15 health-rules — threshold classification
- src/lib/health-rules.ts. warning/critical thresholds per health signal.
  Deterministic classification; the numbers are config, judged by humans.

### D-16 /api/mc/approvals projection — deterministic wrapper
- src/app/api/mc/approvals/route.ts. The route owns no approval logic; it
  projects the operator decision into one canonical transition with exact
  digest matching. The approve|deny CHOICE is H-01 (human authority).

## BOUNDED DECISION CANDIDATES (10, tournament pool)

| ID | Decision | Contract | Final-label source | Carried-verdict check |
|---|---|---|---|---|
| B-01 | classifyReview (src/lib/sentiment/classifier.ts) | text -> {positive, review} bucket + confidence | human moderation decisions | Recommends only; human decides. ALIGNED |
| B-02 | EstimatorFlags (interview-engine-v3) | intake -> flags with severity | expert review | Flags are signals; any consumer treating a flag as authorization would be a carried-verdict defect. CHECK consumers |
| B-03 | grill-20 checks (SI-03) | question -> decide|escalate + evidence per check | escalation-log.jsonl + owner overrides | Verdict composition deterministic; check JUDGMENTS are human/deep. Partial |
| B-04 | actorProximity (feed-rank input) | actor -> 0..10 | viewer-follow graph (deterministic mapping) | Deterministic once supplied |
| B-05 | engagement never-reengage guard | post -> eligible|drop | intent ledger history | Re-derived from the ledger at every load_index. ALIGNED |
| B-06 | outreach eligibility (highest-confidence targeting) | prospect -> send|skip | pipeline statuses + replies | Deterministic gates on structured state |
| B-07 | ask claim fact-class | claim -> DIRECT_FACT|DERIVED_FACT|INFERENCE|GENERATED_COPY|USER_OVERRIDE | extraction pipeline | Composition deterministic |
| B-08 | competitive-signal-pass | evidence -> PASS|NO_VALUE|BLOCKED|FAILURE | hard gates | Deterministic machinery decides; LLM generates candidates only |
| B-09 | worker self-report verdicts (O5) | worker output -> completed|failed | adapter verification, never the claim itself | Claim never promotes effect state. ALIGNED |
| B-10 | WAITING_APPROVAL triage ("should we escalate?") | mission state -> hold|propose|escalate | owner approval records | Escalation goes to human |

## DEEP REASONING (4)

- R-01 Meta AI research delegation outputs: UNVERIFIED until the
  verification gate; never promoted into canonical claims.
- R-02 Any future LLM-powered Ask PING beyond the deterministic template
  composer.
- R-03 grill-20 judgment inputs (e.g. safe_default_80 >= 80% calls).
- R-04 Prospect research narratives and angle selection.

## HUMAN AUTHORITY (5)

- H-01 /api/mc/approvals: approve|deny by the owner on the exact digest.
  Silence never approves.
- H-02 FYD owner publish: agents draft site patches; the owner publishes by
  approving the exact digest (site.propose never implies site.publish).
- H-03 Sentiment moderation final decision: the classifier only recommends.
- H-04 Gateway defect (missing jev namespace): HELD for owner authorization.
- H-05 WAITING_APPROVAL mission progression: the mission waits on the owner.

## UNKNOWN (7)

- U-01 Jev cost per call: not reported by the API.
- U-02 Jev model_version/commit: NOT PUBLISHED (404s).
- U-03 Jev confidence field: null, never populated.
- U-04 Calibration: n=6, Brier 0.0076, 6/6 agreement. Calibration NOT
  established. Jev stays SHADOW.
- U-05 ORCA CONTEXTPACK absent for authorizeWorkOrder evidence
  (hand-assembled; authorized patch in flight on the locked branch;
  call site src/app/api/mc/dispatch/route.ts is owner-locked: read only).
- U-06 codex blockedUntil 2026-09-17T06:01:00Z: RESOLVED. It was an
  intended TEMPORARY block from a ChatGPT plan usage exhaustion observed
  2026-09-16 20:18 MDT ("API error says retry at 2026-09-17 12:01 AM. Do
  not retry before then." — external_agent_adapter.js:94-98). The code
  treats it as expired, so codex is grantable again per this gate.
  RESIDUAL UNKNOWN: no mechanism re-checks quota before granting; current
  grantability rests on the stale 2026-09-16 observation.
- U-07 No startup execution-authority integrity gate observed (P2
  benchmark gap): no scan-all-active + positive-validate + quarantine +
  abort-on-scan-failure at the ORCA/Mission Control resume boundary.

## Lane-2 benchmark verdicts on PING surfaces

- T1 (re-decide at issue, never trust carried verdict): PARTIAL. authorize
  re-runs inside issueWorkOrder (T1-aligned at issue); the issue->invoke
  boundary trusts the carried WorkOrder with no redeem-time re-decide (gap).
- T2 (action fingerprint + approval TOCTOU recheck): GAP. workOrderId is a
  deterministic ID, not a fingerprint over tool/identity/args/targets; no
  kernel-derived targets; MC approvals re-verify the digest before
  submitting (good) but carry no TTL and no target re-measurement.
- P2 (startup authority integrity gate): GAP. Not observed; U-07.
- P3 (durable binding preferred over replay): ALIGNED. reconcileGate +
  UNKNOWN/HOLD doctrine is PING-strong.
- Carried-verdict positives: dispatch identity re-resolved per request;
  engagement guard re-merges the ledger per load; sentiment classifier only
  recommends; worker self-reports never promote effect state.
