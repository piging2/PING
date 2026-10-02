import json
from datetime import datetime, timezone
from model_router import route, StepSpec


def build_dispatch_envelope(step) -> dict:
    """Build a deterministic dispatch envelope for a mission step."""
    decision = route(step)

    envelope = {
        "schema_version": "dispatch-envelope/v1",
        "step": {
            "task_type": step.task_type,
            "required_capabilities": step.required_capabilities,
            "data_class": step.data_class,
            "context_size": step.context_size,
            "tool_requirement": step.tool_requirement,
            "latency_class": step.latency_class,
            "verification_strategy": step.verification_strategy,
        },
        "routing": {
            "eligible_models": decision.eligible_models,
            "selected_model": decision.selected_model,
            "fallbackorder": decision.fallback_order,
            "reason": decision.reason,
        },
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }

    # Ensure the envelope is JSON-serializable
    json.dumps(envelope)

    return envelope