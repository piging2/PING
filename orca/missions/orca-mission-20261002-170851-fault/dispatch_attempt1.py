from datetime import datetime, timezone
import json

from model_router import route


def build_dispatch_envelope(step) -> dict:
    """Build a deterministic dispatch envelope for a mission step."""
    routing = route(step)

    step_dict = {
        "task_type": step.task_type,
        "required_capabilities": step.required_capabilities,
        "data_class": step.data_class,
        "context_size": step.context_size,
        "tool_requirement": step.tool_requirement,
        "latency_class": step.latency_class,
        "verification_strategy": step.verification_strategy,
    }

    envelope = {
        "schema_version": "dispatch-envelope/v1",
        "step": step_dict,
        "routing": {
            "eligible_models": routing["eligible_models"],
            "selected_model": routing["selected_model"],
            "fallbackorder": routing["fallbackorder"],
            "reason": routing["reason"],
        },
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }

    json.dumps(envelope)
    return envelope