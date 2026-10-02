"""
ORCA Model Router: DATA CLASS -> MODEL ELIGIBILITY -> ROUTING

FROZEN 2026-10-02. See ROUTER_FREEZE.md. Do not extend.

Not: TASK -> CHEAPEST MODEL.

Each mission step declares:
  task_type, required_capabilities, data_class, context_size,
  tool_requirement, latency_class, verification_strategy.

Router returns:
  eligible_models[], selected_model, reason, fallback_order.

Free endpoints WILL be unreliable. 429, provider unavailable, timeout,
model removed, tool-call incompatibility are ordinary routing events.
Do not fail the Mission because one free model disappears.

DO NOT send secrets, credentials, private keys, provider tokens,
private customer context, or confidential source code to a free endpoint
unless its data-use terms explicitly permit the workload and PING policy
authorizes it.
"""

from dataclasses import dataclass, field
from typing import List, Optional


# Data classification. Determines which models are eligible.
DATA_CLASS_PUBLIC = "PUBLIC"              # Safe for any free endpoint.
DATA_CLASS_INTERNAL = "INTERNAL"          # PING-internal, no customer PII.
DATA_CLASS_SENSITIVE = "SENSITIVE"        # Approved private/local model only.
DATA_CLASS_RESTRICTED_LOGGING = "RESTRICTED_LOGGING"  # Free endpoints that log sessions.

# Models that explicitly log free-endpoint sessions for model improvement.
LOGGING_MODELS = {
    "thinkingmachines/inkling:free",      # Explicitly logs for model improvement.
    "poolside/laguna-s-2.1:free",         # Listing warns free usage may train models.
}


@dataclass
class ModelProfile:
    model_id: str
    role: str
    context_tokens: int
    strengths: List[str]
    logs_sessions: bool = False
    notes: str = ""


# Role-based free-model pool. NOT a ranking. Roles, not winners.
MODEL_POOL = [
    ModelProfile(
        model_id="nvidia/nemotron-3-ultra-550b-a55b:free",
        role="ORCHESTRATOR / HARD REASONING",
        context_tokens=1_000_000,
        strengths=["orchestration", "coding", "hard_reasoning", "planning", "decomposition", "long_context"],
        notes="$0/M input/output, 1M context, positioned for orchestration/coding agents",
    ),
    ModelProfile(
        model_id="poolside/laguna-s-2.1:free",
        role="CODING SPECIALIST",
        context_tokens=262_000,
        strengths=["coding", "implementation", "refactoring"],
        logs_sessions=True,
        notes="Coding-agent specialized; free usage may be used for model improvement",
    ),
    ModelProfile(
        model_id="thinkingmachines/inkling:free",
        role="LONG-CONTEXT / ALTERNATE REASONER",
        context_tokens=1_000_000,
        strengths=["long_context", "reasoning", "alternate_perspective", "tool_calling"],
        logs_sessions=True,
        notes="1M context, tool calling; explicitly logs free-endpoint sessions",
    ),
    ModelProfile(
        model_id="cohere/north-mini-code:free",
        role="FAST CODING WORKER",
        context_tokens=256_000,
        strengths=["fast_coding", "small_tasks", "agent_harness", "tool_use"],
        notes="Trained for agent harnesses (OpenCode/SWE-Agent), interleaved tool use",
    ),
]


@dataclass
class StepSpec:
    """What a mission step declares. Router decides from this."""
    task_type: str                        # e.g. "code_implementation", "architecture_planning"
    required_capabilities: List[str]      # e.g. ["coding", "tool_use"]
    data_class: str                       # PUBLIC / INTERNAL / SENSITIVE / RESTRICTED_LOGGING
    context_size: int = 0                 # Estimated tokens needed
    tool_requirement: bool = False
    latency_class: str = "normal"         # "fast" / "normal" / "patient"
    verification_strategy: str = ""       # How Mission Control verifies (not the worker)


@dataclass
class RoutingDecision:
    eligible_models: List[str]
    selected_model: str
    reason: str
    fallback_order: List[str]


# Role preference by task type. Ordered: first match wins, rest are fallbacks.
TASK_TYPE_PREFERENCE = {
    "architecture_planning": [
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "thinkingmachines/inkling:free",
    ],
    "code_implementation": [
        "poolside/laguna-s-2.1:free",
        "cohere/north-mini-code:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
    ],
    "small_repo_task": [
        "cohere/north-mini-code:free",
        "poolside/laguna-s-2.1:free",
    ],
    "huge_context": [
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "thinkingmachines/inkling:free",
    ],
    "orchestration": [
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "thinkingmachines/inkling:free",
    ],
}


def route(step: StepSpec) -> RoutingDecision:
    """
    DATA CLASS -> MODEL ELIGIBILITY -> ROUTING.

    1. SENSITIVE data: no free model is eligible. Return empty with reason.
    2. Filter by data-use policy (logging models excluded unless data_class permits).
    3. Filter by capability match.
    4. Filter by context window.
    5. Order by task-type role preference.
    """
    # Rule 1: SENSITIVE goes to approved private/local model only. Never free.
    if step.data_class == DATA_CLASS_SENSITIVE:
        return RoutingDecision(
            eligible_models=[],
            selected_model="",
            reason="SENSITIVE data_class: no free endpoint eligible; requires approved private/local model",
            fallback_order=[],
        )

    candidates = list(MODEL_POOL)

    # Rule 2: data-use policy.
    # PUBLIC data can go to any free endpoint (logging is harmless for public data).
    # INTERNAL data (PING-internal, no customer PII) excludes logging endpoints.
    # SENSITIVE already returned above.
    if step.data_class == DATA_CLASS_INTERNAL:
        candidates = [m for m in candidates if not m.logs_sessions]

    # Rule 3: capability match. At least one required capability must be present.
    if step.required_capabilities:
        candidates = [
            m for m in candidates
            if any(c in m.strengths for c in step.required_capabilities)
        ]

    # Rule 4: context window must fit.
    if step.context_size > 0:
        candidates = [m for m in candidates if m.context_tokens >= step.context_size]

    if not candidates:
        return RoutingDecision(
            eligible_models=[],
            selected_model="",
            reason="No eligible model after data_class/capability/context filters",
            fallback_order=[],
        )

    # Rule 5: order by task-type role preference; unlisted models keep relative order.
    preference = TASK_TYPE_PREFERENCE.get(step.task_type, [])
    def sort_key(m: ModelProfile):
        try:
            return preference.index(m.model_id)
        except ValueError:
            return len(preference)
    candidates.sort(key=sort_key)

    eligible = [m.model_id for m in candidates]
    selected = eligible[0]
    fallbacks = eligible[1:]

    role = next(m.role for m in candidates if m.model_id == selected)
    reason = (
        f"task_type={step.task_type} data_class={step.data_class} "
        f"-> role={role} ({selected}); "
        f"{len(fallbacks)} fallback(s) on 429/unavailable/timeout"
    )

    return RoutingDecision(
        eligible_models=eligible,
        selected_model=selected,
        reason=reason,
        fallback_order=fallbacks,
    )


def probe_note(model_id: str) -> str:
    """Reminder: probe the endpoint before dispatch. Free availability changes."""
    return (
        f"PROBE {model_id} before dispatch: free availability can change. "
        f"Treat 429 / provider unavailable / timeout / model removed / "
        f"tool-call incompatibility as ordinary routing events, not mission failures."
    )


# Added by ORCA mission orca-mission-20261002-161857
def parse_model_id(model_id: str) -> dict:
    if "/" not in model_id:
        raise ValueError("Invalid model ID format")
    parts = model_id.split("/", 1)
    provider = parts[0]
    rest = parts[1]
    if ":" in rest:
        model, variant = rest.split(":", 1)
    else:
        model = rest
        variant = None
    return {"provider": provider, "model": model, "variant": variant}
