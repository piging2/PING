# DELIVERABLE 3 — MCP MAP

**Source:** `partials/agent-b-mcp.md` (full path + evidence log). Headline: **no live tool-execution path exists.** Every arrow into, through, and out of tool execution is broken or dormant.

```
AGENT INTENT (mission/worker wants a tool)
  ├─✗ BROKEN: worker_runtime.js has ZERO "tool" references — workers emit events, never select/invoke tools
  └─✗ BROKEN: mission_runtime.js has ZERO "tool" references — missions carry no tool declarations
        ▼
TOOL SELECTION
  ├─ gateway/tool_authority.js :: getToolManifest — SOURCE_PRESENT but DORMANT (zero require() callers;
  │   repo self-classifies dependent_modules=0, "migrate")
  └─ inference_authority.js :: _buildToolManifest — computes a manifest then DISCARDS it (dead variable);
      InferenceAuthority itself has zero callers
        ▼
CAPABILITY CHECK
  ├─✗ BROKEN: capability-authority.ts exists (TS-only, no dist, zero JS consumers) — unconnected to tool path
  ├─ ToolAuthority takes a JS `permissionAuthority` ctor arg — NO SUCH MODULE EXISTS (phantom dependency)
  └─ ToolGateway.executeTool(): NO permission/authorization check at all
        ▼
POLICY / AUTHORIZATION
  ├─✗ ToolAuthority._checkToolPermission: `if (!this._permissionAuthority) return { allowed: true }`
  │   — fail-OPEN by design
  └─✗ ToolGateway: no authorization concept present
        ▼
ARGUMENT VALIDATION
  ├─✗ ToolAuthority.executeTool: NEVER validates parameters against the tool descriptor's JSON schema
  └─△ ToolGateway._validateParameters: weak custom validator — ignores JSON-Schema `required: []`
      at object level; no additionalProperties/nested/enum checks; `!schema.properties → {valid:true}`
        ▼
SERVER SELECTION → MCP REQUEST → TRANSPORT
  ├─✗ NOTHING: no MCP servers configured; no .muse/mcp.json, .mcp.json, .cursor/; no stdio/HTTP/SSE/JSON-RPC
  │   MCP transport code; zero `tool_calls` repo-wide → no LLM function-calling loop
  └─ mcp/ping_mcp_server.py is NOT an MCP server: no SDK, no transport — 12 plain functions doing
      requests.get() to http://mission-control:8000 (service has NO definition in tree); ARCHAEOLOGICAL
        ▼
EXECUTION
  ├─ ToolAuthority.executeTool: `await tool.implementation(...)` — NO TIMEOUT, NO CANCELLATION.
  │   All 4 default tools are STUBS ('File content placeholder', success:true WITHOUT writing).
  │   executionId = hash(tool_id + timestamp) → retries UNDEDUPEABLE, distinct IDs.
  ├─ ToolGateway.executeTool: `await tool.handler(...)` — NO TIMEOUT, NO CANCELLATION.
  │   executionId = hash(tool_id, params_hash, replay_id, runtime_ctx_id) → DETERMINISTIC:
  │   retry with identical inputs yields SAME id and SILENTLY OVERWRITES prior history
  │   (`_toolExecutionHistory.set(...)`); handler RE-RUNS → non-idempotent side effects duplicate.
  └─✗ ollama_adapter.js (InferenceEngine seam) cannot load: TWO dangling requires
      (infrastructure_adapter_interface, serializer_authority) — MISSING
        ▼
RESPONSE → RESULT NORMALIZATION
  ├─ ToolAuthority: returns {success, tool_id, execution_id, result|error, timestamp} — no hashing/normalization
  └─ ToolGateway: hashes output + builds witness — BUT hash EXCLUDES the handler
      (impl swaps invisible); re-registration silently overwrites tool identity
        ▼
AGENT CONSUMPTION
  └─✗ BROKEN: no consumer — ollama_adapter.js (338 lines) has ZERO "tool" references;
      the inference path cannot receive or dispatch tool calls
        ▼
EVENT / AUDIT RECORD
  ├─✗ ToolAuthority: this._postgres stored (line 18), NEVER USED — zero durable trace
  ├─✗ ToolGateway: in-memory Maps only; clear() publicly wipes all three maps "for testing"
  │   ("I/O operation record" is an in-memory counter: recordHTTPRequest → {_nextId++})
  └─✗ unified_event_runtime.js has ZERO "tool" references; no TOOL_* event type exists (js/ts/sql)
```

## Per-path verdicts
- **ToolAuthority:** permission-checked in name, fail-open in fact, no validation, stub tools, no persistence. Dead code with a dangerous default.
- **ToolGateway:** validated + witnessed in name, no auth, weak validation, history-overwriting retries, wipeable audit. Dead code with a dangerous retry semantic.
- **InferenceAuthority:** builds a manifest, discards it. Dead code.
- **MCP server:** not a server. Archaeological proxy to a dead service.
- **Capability integration:** both halves exist (TS authority, JS tool modules), unconnected — MISSING integration.

## What the sprint must decide before building (grill)
1. Which tool plane survives: ToolAuthority, ToolGateway, merge, or greenfield on capability-authority.ts? (Keeping both = two owners of "tool execution".)
2. Is MCP wanted, or is "tool" the requirement? (No MCP transport/client/server exists or ever ran.)
3. Outcome-state machine: NOT_STARTED / DISPATCHED / SUCCEEDED / FAILED / TIMED_OUT / CANCELLED / **UNKNOWN** — UNKNOWN must be first-class persisted before any side-effecting tool ships. Currently unrepresentable.
4. Dispatch journal location: `ping_events` (canonical, currently zero tool events) vs separate journal.
5. Idempotency-key format/scope and who mints it.
6. Who is the principal (user/tenant/agent/mission) and where is it minted.
