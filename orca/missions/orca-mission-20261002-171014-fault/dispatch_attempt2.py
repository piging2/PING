from model_router import route
from datetime import datetime, timezone

def build_dispatch_envelope(step) -> dict:
    """Build a deterministic dispatch envelope for a mission step."""
    decision = route(step)
    step_dict = {
        "task_type": step.task_type,
        "required_capabilities": step.required_capabilities,
        "data_class": step.data_class,
        "context_size": step.context_size,
        "tool_requirement": step.tool_requirement,
        "latency_class": step.latency_class,
        "verification_strategy": step.verification_strategy,
    }
    routing_dict = {
        "eligible_models": decision.eligible_models,
        "selected_model": decision.selected_model,
        "fallback_order": decision.fallback_order,
        "reason": decision.reason,
    }
    envelope = {
        "schema_version": "dispatch-envelope/v1",
        "step": step_dict,
        "routing": routing_dict,
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    return envelope