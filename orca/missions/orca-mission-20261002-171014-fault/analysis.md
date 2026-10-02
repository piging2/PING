**1. Exact function placement**
Create a new file `dispatch.py` at the same level as `model_router.py`. Place `build_dispatch_envelope` as a top-level (module-level) function in that file.

**2. How it calls `route(step)`**
- Import: `from model_router import route, StepSpec`
- Call `decision = route(step)` where `step` is the incoming `StepSpec` instance.
- Map `decision` (a `RoutingDecision` dataclass) into the `"routing"` dict: `eligible_models`, `selected_model`, `fallback_order`, `reason`.
- Map the input `step` fields into the `"step"` dict using the seven declared keys.
- Generate `"issued_at"` via `datetime.datetime.now(datetime.timezone.utc).isoformat()`.
- Hard-code `"schema_version": "dispatch-envelope/v1"`.
- Return the assembled dict.

**3. Edge cases**
- `step.data_class == "SENSITIVE"`: `route` returns empty `eligible_models`, empty `selected_model`, and a descriptive `reason`. The envelope must still include all keys; `"routing"` reflects that empty decision.
- `step.required_capabilities` empty: `route` skips capability filtering; envelope still lists the step’s empty list.
- `step.context_size` exceeds all model contexts: `route` yields empty `eligible_models`; envelope reflects that.
- Any `StepSpec` field missing (should not happen with dataclass): rely on dataclass defaults; no extra coercion needed.

**4. Deterministic verifier checks**
- Output is a `dict` with exactly four top-level keys (no extra, no missing).
- `"schema_version"` equals `"dispatch-envelope/v1"`.
- `"step"` contains exactly the seven specified keys with values matching the input `step` types (list for capabilities, int for context_size, bool for tool_requirement, strings for others).
- `"routing"` contains exactly four keys; `eligible_models` and `fallback_order` are lists of strings, `selected_model` and `reason` are strings.
- `"issued_at"` is a valid ISO-8601 UTC string (ends with `+00:00` or `Z`).
- `json.dumps(envelope)` succeeds without custom encoders.
- No secrets, credentials, or extra fields appear.