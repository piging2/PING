from datetime import datetime, timezone
from model_router import route, DATA_CLASS_PUBLIC, DATA_CLASS_PRIVATE, DATA_CLASS_SENSITIVE

def build_dispatch_envelope(step) -> dict:
    """Build a deterministic dispatch envelope for a mission step."""
    step_dict = {
        "task_type": step.task_type,
        "required_capabilities": step.required_capabilities,
        "data_class": step.data_class,
        "context_size": step.context_size,
        "tool_requirement": step.tool_requirement,
        "latency_class": step.latency_class,
        "verification_strategy": step.verification_strategy,
    }
    routing_decision = route(step)
    routing_dict = {
        "eligible_models": routing_decision["eligible_models"],
        "selected_model": routing_decision["selected_model"],
        "fallback_order": routing_decision["fallback_order"],
        "reason": routing_decision["reason"],
    }
    envelope = {
        "schema_version": "dispatch-envelope/v1",
        "step": step_dict,
        "routing": routing_dict,
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    return envelope