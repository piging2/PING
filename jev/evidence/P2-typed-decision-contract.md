# P2 evidence: typed decision contract (ping-runtime/jev/typed_decision.js)

Observed: 2026-09-22 ~20:15 MDT. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (detached, uncommitted). Runtime revision: gateway under test is source, not the Sep-16 deployment image (deployment drift noted separately).

## PROBLEM
Jev must reason in typed, serializable decisions. No existing code defined claim accept/reject vocabulary, no DecisionRequest/TypedDecision types, and no explicit execution-authority policy. Without a contract, any Jev provider output would be untyped model text with no validation boundary.

## SOURCE EVIDENCE
- Grep across repo for ACCEPT_CLAIM, REJECT_CLAIM, NEEDS_MORE_EVIDENCE, *_EVALUATED: zero hits before this patch.
- ClassificationWorker uses category/priority (business categorization), not claim acceptance. Different domain, not equivalent.
- ClaimWorker emits thin claim: documentId, eventType, timestamp, source. No evaluation fields.
- Directive sections 42, 43, 44 require: typed provider boundary, fail-closed model output, real shadow evaluation design, probability never equals authority.

## LIVE REACHABILITY
Pure module, no live path yet. Reachability begins when the P3 shadow worker constructs providers (registered in gateway_runtime.js, this same batch).

## WHY THIS PATCH
Smallest serializable contract: frozen decision enum, request/decision value objects with toJSON, abstract provider base, one deterministic rule provider as the calibration baseline, one shadow-only execution policy. No new tables, no new event store, no model calls.

## FILES TOUCHED
- ping-runtime/jev/typed_decision.js (new, ~230 lines)

## AUTHORITY BEFORE
No decision authority existed. Model outputs, if any, would have been unvalidated text.

## AUTHORITY AFTER
- TypedDecision constructor rejects unknown decision strings, non-finite/NaN/out-of-range probability, and missing provider name. Validation owns acceptance, not the model.
- RuleClaimDecisionProvider (rule-claim-v0) encodes current policy as explicit rules R0-R4. It is the deterministic side of shadow evaluation.
- MayExecutePolicy (P12 initial): mayExecute() returns {allowed:false, mode:'shadow', reason:'JEV_SHADOW_ONLY'} for every decision class, including ACCEPT_CLAIM at 0.85. Probability is not authority. Later widening happens by replacing the policy, never by editing the provider.

## PERSISTENCE EFFECT
None directly. Decisions serialize to JSON; persistence happens only via the P3 worker emitting JEV_DECISION_EVALUATED through the canonical event mechanism (event-derived persistence, operator gate preserved).

## REPLAY EFFECT
Decisions carry decidedAt timestamps but the rule provider is deterministic given the same request (tested). Rule outcomes are reproducible from the claim + evidence refs.

## SECURITY EFFECT
Fail-closed validation: NaN/Infinity/unknown enums throw instead of flowing downstream. No credentials, no network, no execution path.

## ROLLBACK
Delete ping-runtime/jev/typed_decision.js. No other file imports it except shadow_worker.js (same batch).

## TEST
- gateway/test_jev_shadow.js: 21/21 pass, including: unknown vocabulary rejected, NaN probability rejected (this caught a real gap in the first validation draft and was fixed), null probability allowed, R1-R4 rules, determinism across runs, ACCEPT_CLAIM@0.85 still not executable, null decision not executable.

## FALSIFICATION CONDITION
If any TypedDecision with an unknown decision string, NaN probability, or missing provider can be constructed without throwing, the contract is broken. If mayExecute() ever returns allowed:true under the initial policy, P12 is violated.
