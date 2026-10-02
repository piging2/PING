# P4 evidence: evaluation event type registration (event_generator.js + event_registry.json)

Observed: 2026-09-22 ~20:20 MDT. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (detached, uncommitted).

## PROBLEM
The P3 shadow worker must emit JEV_DECISION_EVALUATED through UnifiedEventRuntime.emit, but the live EventValidator rejects unknown event types. Registering the type only in the generated JSON would violate the repo's own rule (generator source is the authority; "no handwritten event registries").

## SOURCE EVIDENCE
- gateway/generated/event_generator.js header pattern: production events are declared in _productionEvents() with authority_owner and event_class; the JSON is generated output.
- EventValidator loads gateway/generated/event_registry.json from repo root and rejects unknown types (verified: pre-registration validate() returned valid:false, "Unknown event_type").
- Pre-existing precedent: WITNESS_REJECTED registered the same way with a failure-honesty comment.

## LIVE REACHABILITY
Any gateway boot loading the regenerated registry accepts the type. The shadow worker's _emit path is the first producer.

## WHY THIS PATCH
Four lines in the generator source plus regeneration. The diff was verified to contain exactly one addition and zero removals before promotion.

## FILES TOUCHED
- gateway/generated/event_generator.js (+4 lines: JEV_DECISION_EVALUATED, authority_owner JevShadowWorker, event_class inference, with shadow-only comment)
- gateway/generated/event_registry.json (regenerated: count 234 -> 235, header hash/generated_at updated, one new event entry; verified added:{JEV_DECISION_EVALUATED}, removed:{})

## AUTHORITY BEFORE
EventValidator rejected JEV_DECISION_EVALUATED as unknown.

## AUTHORITY AFTER
Validator accepts it (235 types loaded). No bridge mapping added, so it stays terminal: no mission, no worker dispatch, no downstream chain. The bridge was deliberately not extended.

## PERSISTENCE EFFECT
Emissions persist to ping_events like any canonical event. No schema change needed (payload is JSON).

## REPLAY EFFECT
Type is a valid correlation-group member; replay includes it with other group events under existing created_at ASC ordering.

## SECURITY EFFECT
Registration grants no capability. The type cannot trigger missions or workers. The generator source remains the single place event types are declared.

## ROLLBACK
Remove the 4 lines from event_generator.js and regenerate the registry (or git checkout the JSON). Emissions of the type would then fail validation, which is the correct closed state.

## TEST
- Regeneration diff check: added exactly [JEV_DECISION_EVALUATED], removed [].
- test_jev_shadow.js: live EventValidator (from regenerated registry) accepts the type; bridge mapping absent (terminal).
- test_wave2_generators.js: 39/39 pass (generator change causes no regressions).
- Note: running the generator test suite regenerates sibling registries as timestamp-only churn; those were restored via git checkout (not part of this patch).

## FALSIFICATION CONDITION
If the registry ever contains an event type not declared in event_generator.js source, or if JEV_DECISION_EVALUATED gains a bridge mapping without an explicit approval-semantics design (directive section 12), the registration discipline is broken.
