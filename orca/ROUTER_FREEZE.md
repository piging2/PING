# ORCA Model Router: FROZEN

**Frozen 2026-10-02 by Nolan's directive. Do not extend.**

## What was proven (not assumed)

- ORCA MODEL OPTIONALITY: PROVEN AT FIRST SLICE. Nemotron completed. Laguna completed.
  Inkling failure became routing evidence. North failure became routing evidence.
- Two different workers participated in one mission. Independent verification passed.
  Removing Laguna did not kill the mission.
- Failure-injected mission (2026-10-02): WORKER SAYS SUCCESS + VERIFIER SAYS FAIL
  → MISSION DOES NOT BECOME VERIFIED SUCCESS. Evidence:
  `~/workspace/orca/missions/orca-mission-20261002-171014-fault/evidence.json`
- Recovery via fallback worker produced a clean artifact; verifier passed;
  mission became VERIFIED SUCCESS with full attempt history.

We did NOT prove "Nemotron is our best model." We proved something more valuable:
**MISSION SEMANTICS CAN SURVIVE MODEL REPLACEMENT.** That is the invariant.

## Frozen direction

```
MISSION → STEP REQUIREMENTS → DATA POLICY → ELIGIBLE WORKERS
  → EXECUTION → INDEPENDENT VERIFICATION → EVIDENCE
```

Model identity remains execution metadata. It is not mission meaning.

## Router contract (deterministic, no learning)

Input (StepSpec): task_type, required_capabilities, data_class, context_size,
tool_requirement, latency_class, verification_strategy.

Output (RoutingDecision): eligible_models[], selected_model, reason, fallback_order.

Data classes: PUBLIC, INTERNAL, SENSITIVE (plus local RESTRICTED_LOGGING for
free endpoints with logging terms). Before every dispatch: DATA CLASS →
PROVIDER ELIGIBILITY. A free endpoint being excellent does not authorize sending
it data. Provider/model eligibility is operator policy.

## Explicitly NOT earned (do not add)

AI model selection, model reputation economy, dynamic bidding, recursive
routing, agent society, self-modifying policy.

## Companion module

`dispatch.py::build_dispatch_envelope(step)` — deterministic, JSON-serializable
per-attempt envelope (schema `dispatch-envelope/v1`), added by the
failure-injected mission. The router itself is unchanged; the envelope builder
lives beside it, not inside it.
