**1. Exact function placement**  
Create `dispatch.py` at module root. Define `build_dispatch_envelope(step) -> dict` as a top-level function (no class, no nesting).

**2. How it calls `route(step)`**  
- Import: `from model_router import route, StepSpec`  
- Accept `step` as a `StepSpec` instance (or dict-like with identical attributes).  
- Call `decision = route(step)` once.  
- Build envelope:
  - `schema_version`: constant `"dispatch-envelope/v1"`
  - `step`: dict copied from `step`’s seven declared fields (task_type, required_capabilities, data_class, context_size, tool_requirement, latency_class, verification_strategy)
  - `routing`: dict from `decision`’s four fields (eligible_models, selected_model, fallback_order, reason)
  - `issued_at`: `datetime.utcnow().isoformat() + "Z"` (ISO-8601 UTC)
- Return the assembled dict.

**3. Edge cases**  
- `step.data_class == "SENSITIVE"` → `route` returns empty `eligible_models`, empty `selected_model`, empty `fallback_order`; envelope reflects this exactly.  
- `step.required_capabilities` empty → capability filter skipped; all data-class-eligible models remain candidates.  
- `step.context_size` exceeds all candidate context windows → `eligible_models` becomes empty; `selected_model` empty; reason explains context mismatch.  
- Any `step` field missing/None → treat as default (empty list, 0, False, ""); do not raise.  
- `route` never raises; always returns a `RoutingDecision`.

**4. Deterministic verifier checks**  
- Envelope is a `dict` with **exactly** four top-level keys (no extras, no missing).  
- `schema_version == "dispatch-envelope/v1"` (string).  
- `step` is a dict with exactly the seven required keys; values match input `step`’s attributes.  
- `routing` is a dict with exactly four keys; `eligible_models` and `fallback_order` are lists of strings; `selected_model` and `reason` are strings.  
- `issued_at` matches regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`.  
- `json.dumps(envelope)` succeeds (all values JSON-serializable).  
- Function imports and calls `model_router.route` exactly once per invocation.