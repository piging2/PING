# Lane 11 report: decision fabric

Session: 2bda3e93-6926-431b-98e9-f2c984d03081. T+0 2026-09-28 14:26 MDT.
READ ONLY throughout. No commits, no pushes, no restarts, no canonical-tree
writes. All Pig WSL reads via pigwsl-exec.sh -s, batched and light. Every
claim below is a HYPOTHESIS until replayed from a clean checkout. No em
dashes used.

Artifacts: [PING_DECISION_SURFACE.md](PING_DECISION_SURFACE.md),
[raw/shadow-decisions-2026-09-28.json](raw/shadow-decisions-2026-09-28.json).

## DECISION SURFACES FOUND

- DETERMINISTIC: 16
- BOUNDED DECISION CANDIDATES: 10 (tournament pool)
- DEEP REASONING: 4
- HUMAN AUTHORITY: 5
- UNKNOWN: 7

Full inventory with per-surface fields (identity, owner, input, evidence,
outputs, implementation, callers, reachability, criticality, reversibility,
authority, tests, label source, samples, failure cost) is in
PING_DECISION_SURFACE.md.

## Decision Unit #1 full contract: mc.authorize_work_order/v1

- DECISION_ID: mc.authorize_work_order/v1
- OWNER: PING (ping:external-agent-adapter)
- INPUT_SCHEMA: {agentId: string, capability: string, namespace: string,
  constraints: object}
- OUTPUT_ENUM: GRANT | DENY with typed reason string
- EVIDENCE_REQUIRED: AGENT_PROFILES registry facts (status, blockedExternal,
  allowedCapabilities, maxConstraints) + the request fields
- CURRENT_IMPLEMENTATION: /home/nolan/workspace/orca-adapter/vendor/
  external_agent_adapter.js:185, function authorizeWorkOrder. Verified
  read-only. 8 ordered fail-closed checks: (1) known agent; (2)
  blockedExternal with blockedUntil expiry; (3) not PENDING_AUTH; (4)
  capability in allowedCapabilities; (5) namespace matches NAMESPACE_RE
  (core::<name> or tenant::<id>); (6) constraints is an object; (7)
  constraints tighten relative to maxConstraints; (8)
  no_canonical_events and no_mission_state_writes both true.
- CALLERS: adapter.js dispatchExecution line 1239 (pre-dispatch gate);
  issueWorkOrder (same file, line 185 of the vendor module) re-runs
  authorizeWorkOrder internally and throws on denial; called from
  dispatchExecution at adapter.js:1298. The Mission Control lane-d shim
  calls through to this adapter; the MC dispatch call site
  src/app/api/mc/dispatch/route.ts is owner-locked (read only).
- REACHABILITY: live in the loop proof per the seam report.
- CRITICALITY: C4.
- REVERSIBILITY: DENY is pure. GRANT issues a work order; reversal via
  reconciliation/HOLD (unknowns reconcile before retry; HOLD never
  auto-retries an external effect).
- BLAST_RADIUS: one work order.
- AUTHORITY_REQUIRED: PING executor CapabilityAuthority.
- CURRENT_TESTS: NONE dedicated. Confirmed read-only: no test file in
  orca-adapter references authorizeWorkOrder. reconcile-gate-selftest.js
  and tenant-threading-selftest.js exist for neighboring gates. GAP.
- FINAL_LABEL_SOURCE: live deterministic function output in the loop proof.
- SAMPLE_COUNT: 6. ERROR_COUNT: 0. ABSTENTION_COUNT: 0 (the function never
  abstains; PENDING_AUTH and unknown agents are DENY, not abstention).
- CALIBRATION_DATA: n=6 real Jev shadow samples vs current outputs, 6/6
  agreement at 0.5 threshold, Brier 0.0076, shadow latency 334-566ms
  (mean 422ms), cost UNKNOWN. Calibration NOT established. Jev SHADOW.
- STATUS: DETERMINISTIC with Jev SHADOW, zero authority, zero execution
  effect, zero policy effect.

## First calibration data (recorded, NOT readiness)

The 6 shadow samples (S1-S6) are the FIRST real samples for this decision
unit. Brier 0.0076 at n=6 with 6/6 threshold agreement is evidence of
initial alignment, not calibration. Calibration is NOT established.

What would be needed to consider ADVISORY per contract (evidence needed,
not invented readiness thresholds): a per-contract final-label source
that stays stable across runs; a sample count with representative coverage
of the input space (grants AND each deny reason, not just happy paths);
Brier decomposition showing reliability, not just a low headline number;
disagreement cases adjudicated through an independent channel (never the
shadow processor agreeing with itself); demonstrated stability (same input
-> same output across repeated calls); drift monitoring across time;
bounded and known cost per call; and explicit owner approval to promote
from SHADOW. Until then Jev remains SHADOW.

## codex blockedUntil 2026-09-17: RESOLVED read-only

It was an intended TEMPORARY block, not a stale config bug. The codex
profile (external_agent_adapter.js:88-99) records: BLOCKED_EXTERNAL as of
2026-09-16 20:18 MDT, "ChatGPT plan usage limit hit; API error says retry
at 2026-09-17 12:01 AM. Do not retry before then." with
blockedUntil: '2026-09-17T06:01:00Z'. The check at lines 190-197 treats an
expired blockedUntil as no longer blocking, so codex is grantable again
per this gate. The expiry behavior is by design. RESIDUAL UNKNOWN: no
mechanism re-checks quota before granting; current grantability rests on
the stale 2026-09-16 observation.

## Lane-2 benchmark results on PING surfaces

- T1 (Talos double-kernel mint: re-run policy.decide() at issue, never
  trust a carried verdict): PARTIAL. The authorize at adapter.js:1239 is
  re-derived inside issueWorkOrder at :1298 (T1-aligned at issue time).
  The issue->invoke boundary (adapter.js:1353, after the index lock is
  released) trusts the carried WorkOrder with NO redeem-time re-decide.
  Gap recorded in PING_DECISION_SURFACE.md.
- T2 (kernel-derived action fingerprint recomputed at redeem + approval
  TOCTOU recheck): GAP. workOrderId is sha256('workorder:'+taskId)[0:16],
  a deterministic ID, not a fingerprint over tool/identity/args/targets.
  MC approvals re-verify the digest before submitting the envelope (good)
  but carry no TTL and no target re-measurement.
- P2 (Pioneer startup execution-authority integrity gate): GAP. No
  scan-all-active + positive-validate + quarantine + abort-on-scan-failure
  observed at the ORCA/MC resume boundary. UNKNOWN U-07.
- P3 (durable external-execution binding preferred over replay): ALIGNED.
  reconcileGate + the UNKNOWN/HOLD doctrine (UNKNOWN never collapses to
  FAILED; lease expiry never resurrects dispatch) is PING-strong, stronger
  as doctrine than both donors.
- Carried-verdict positives: dispatch caller identity re-resolved per
  request from the registry; engagement never-reengage guard re-merges
  the intent ledger on every load; sentiment classifier only recommends
  (human decides); worker self-reports never promote effect state (O5);
  SLICE_AGENTS in mc-dispatch.ts is a documented advisory mirror only,
  with the adapter verdict final.

## Tournament design (Phase 4, T+5 to T+10). DESIGN ONLY, not executed.

### Contract selection: 10 high-volume closed contracts

1. mc.authorize_work_order/v1 (GRANT|DENY) — label source: live function.
2. grantsForViewer (grant sets) — label source: deterministic function.
3. planActions (available action kinds) — label source: deterministic
   function + lane-a tests.
4. classifyReview (positive|review) — label source: human moderation
   decisions.
5. reconcileGate (allowed|refused) — label source: deterministic function
   + selftests.
6. callerScope (operator|tenant|400) — label source: deterministic
   function.
7. mc-dispatch-identity (ALLOW|DENY on trusted-A + body-B rule) — label
   source: deterministic function.
8. EstimatorFlags (flag set per intake) — label source: expert review.
9. engagement never-reengage guard (eligible|drop) — label source:
   intent ledger history.
10. grill-20 verdict composition (decide|escalate given fixed check
    answers) — label source: escalation-log.jsonl.

Excluded: DEEP REASONING surfaces (R-01..R-04) and HUMAN AUTHORITY
surfaces (H-01..H-05); Jev never decides them even in shadow for
authority-bearing purposes.

### Replay methodology

For each contract: assemble N replay cases, each = (semantic inputs +
the SAME evidence set the baseline used). Run four processors on the
identical case:
  (a) deterministic baseline at the pinned HEAD (the incumbent truth),
  (b) Jev shadow via the live API (zero authority),
  (c) a local model where legitimately available (ollama slice agent),
  (d) Muse/Hermes where legitimately available.
HARD RULES: zero authority, zero execution effect, zero policy effect.
Shadow outputs are never written to any canonical record, never fed back
into any decision, never shown to an owner as a recommendation. Jev
stays SHADOW for the entire tournament. Processor identities are kept
separate from the agent identities used in live dispatch (no
identity_1..4 reuse for tournament runs).

### Per-contract measurements

- coverage: fraction of sampled inputs the processor judged vs abstained
- accuracy: agreement with the final-label source
- abstention: rate + whether abstention was typed and honest
- Brier score (and reliability decomposition when n allows)
- FP/FN cost: typed per contract (e.g. a false GRANT on authorizeWorkOrder
  vs a false DENY have different costs; cost model written down before
  measuring, not fitted after)
- latency: p50/p95 per call
- cost: per call, once the API reports it (currently UNKNOWN for Jev)
- stability: same input 10x, output variance
- drift: same case set re-run across tournament days
- evidence sensitivity: perturb or remove one evidence element, measure
  output change; a good shadow judgment should move when evidence moves
  and hold when only noise changes

### Promotion discipline

No processor is promoted from SHADOW on tournament numbers alone. The
calibration-discipline section above defines the evidence bar; promotion
is an owner decision after the bar is met, per contract, not globally.

## UNKNOWN list

- U-01 Jev cost per call (API does not report it).
- U-02 Jev model_version/commit (version endpoints 404; not published).
- U-03 Jev confidence field (null, never populated).
- U-04 Calibration (n=6; NOT established; Jev stays SHADOW).
- U-05 ORCA CONTEXTPACK absent for authorizeWorkOrder evidence
  (hand-assembled state; authorized patch in flight; call site is
  owner-locked, read only).
- U-06 codex quota state post-2026-09-17 expiry (resolved as intended
  temporary; residual: no re-check mechanism).
- U-07 No startup execution-authority integrity gate observed (P2 gap).

## Constraints honored

Read-only on the canonical tree, orca-adapter, and the locked dispatch
call site. No gateway, scheduler mission, :3100, Hermes, FYD, or Happy
Place contact. Jev treated as shadow input only, never promoted. No
secrets printed or persisted. Lane-2 claims used as benchmarks, not
gospel, and labeled hypotheses pending clean-checkout replay.
