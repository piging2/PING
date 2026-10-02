# AGENT B — MCP / Tool-Execution Forensics

**Target:** `/home/nolan/ping` @ `cc6856c3bc78e0535e66f168c66dc31abee2c073`, branch `refactor/runtime-authority-convergence`
**Method:** read-only source forensics via Pig bridge (`~/workspace/pig/pigwsl-run.sh`); zero repo writes, zero execution of repo code, zero infra changes.
**Headline verdict:** There is **no live tool-execution path** in the current tree. Every MCP/tool-execution artifact is dormant, archaeological, or phantom. The two tool modules (`ToolAuthority`, `ToolGateway`) have **zero callers**; the only "MCP server" is not an MCP server; `beforeMCPExecution`/`afterMCPExecution` exist nowhere; no MCP transport, no Cursor/MCP config, no Composio, no LLM function-calling loop. The sprint is therefore designing the tool plane from near-zero, and the dormant modules are **unsafe to wire up as-is** (fail-open auth, no arg validation in one, no auth at all in the other, no timeouts, no idempotency, no audit persistence, no UNKNOWN-outcome state).

---

## 1. AGENT INTENT → AUDIT path map (broken arrows marked ✗)

```
AGENT INTENT (mission/worker wants a tool)
  │
  ├─✗ BROKEN: ping-runtime/workers/worker_runtime.js contains zero "tool"
  │   references (verified by grep). Workers emit events; they never
  │   select or invoke tools.
  ├─✗ BROKEN: ping-runtime/orchestration/mission_runtime.js contains zero
  │   "tool" references. Missions carry no tool declarations in the live path.
  ▼
TOOL SELECTION
  │
  ├─ gateway/tool_authority.js :: getToolManifest(mission) — SOURCE_PRESENT
  │   but DORMANT: zero require() callers anywhere in tree (verified).
  │   Repo self-classifies: dependent_modules=0, recommendation="migrate".
  ├─ gateway/inference_authority.js :: _buildToolManifest(node) (line 301)
  │   — computes a manifest at line 58 of execute() then DISCARDS it: the
  │   local `toolManifest` is never placed in the returned contract, never
  │   passed to the infrastructure call. promptIR.tool_manifest is copied
  │   from node.tool_manifest, never from ToolAuthority. InferenceAuthority
  │   itself has zero require() callers.
  ▼
CAPABILITY CHECK
  │
  ├─✗ BROKEN: runtime/kernel/capabilities/capability-authority.ts exists
  │   (TS-only, no dist/, zero JS consumers). Nothing in the JS tool path
  │   references it.
  ├─ ToolAuthority takes a JS `permissionAuthority` ctor arg with a
  │   `.checkPermission()` method — NO SUCH MODULE EXISTS in the tree.
  │   Unresolved dependency. Effective behavior if instantiated without it:
  │   fail-OPEN (see below).
  ├─ ToolGateway.executeTool() performs NO permission/authorization check
  │   at all.
  ▼
POLICY / AUTHORIZATION
  │
  ├─✗ ToolAuthority._checkToolPermission: `if (!this._permissionAuthority)
  │   return { allowed: true }` — "No permission authority, allow all."
  │   Fail-open by design (gateway/tool_authority.js ~line 116).
  ├─✗ ToolGateway: no authorization concept present in executeTool.
  ▼
ARGUMENT VALIDATION
  │
  ├─✗ ToolAuthority.executeTool: NEVER validates `parameters` against the
  │   tool descriptor's `parameters` JSON-schema. Schema is shipped to the
  │   agent in the manifest but unenforced at execution.
  ├─△ ToolGateway._validateParameters: custom weak validator. Only honors
  │   `schema.properties` with PER-PROPERTY `required` flags; standard JSON
  │   Schema `required: [...]` at the object level (the style ToolAuthority's
  │   own default tools use) is IGNORED. No `additionalProperties`,
  │   no nested validation, no string/enum constraints. `!schema.properties`
  │   → `{valid:true}`.
  ▼
SERVER SELECTION → MCP REQUEST → TRANSPORT
  │
  ├─✗ NOTHING: no MCP servers are configured for invocation. No
  │   `.muse/mcp.json`, no `.mcp.json`, no `.cursor/`, no Cursor config
  │   anywhere in tree. No stdio/HTTP/SSE/JSON-RPC MCP transport code.
  │   Zero `tool_calls` references repo-wide → no LLM function-calling loop.
  ├─ mcp/ping_mcp_server.py is NOT an MCP server: no `mcp` SDK import, no
  │   Server object, no transport loop, no tool decorators. It is 12 plain
  │   Python functions doing `requests.get()` to `http://mission-control:8000`
  │   (a service with NO definition in the current tree — no root
  │   docker-compose; only unrelated brainos/newsletter and brainos/rss
  │   compose files). `__main__` is a manual test harness.
  ▼
EXECUTION
  │
  ├─ ToolAuthority.executeTool: `await tool.implementation(parameters,
  │   context)` — NO TIMEOUT, NO CANCELLATION. All four default tool
  │   implementations are STUBS returning placeholders
  │   (`'File content placeholder'`, `success:true` WITHOUT writing,
  │   empty results). executionId = hash(tool_id + timestamp) → unique per
  │   attempt: retries are UNDEDUPEABLE and produce distinct execution_ids.
  ├─ ToolGateway.executeTool: `await tool.handler({...})` — NO TIMEOUT, NO
  │   CANCELLATION. executionId = hash(tool_id, params_hash, replay_id,
  │   runtime_ctx_id) → DETERMINISTIC: a retry with identical inputs yields
  │   the SAME execution_id and SILENTLY OVERWRITES the prior history record
  │   (`_toolExecutionHistory.set(executionId, ...)`); the handler RE-RUNS,
  │   so non-idempotent side effects duplicate with only the latest run
  │   retained. No "already executed" guard.
  ├─✗ gateway/adapters/ollama_adapter.js (the "capability InferenceEngine"
  │   provider seam) cannot even load: requires
  │   `../infrastructure_adapter_interface` (MISSING) AND
  │   `../serializer_authority` (MISSING — verified by tree-wide find).
  ▼
RESPONSE → RESULT NORMALIZATION
  │
  ├─ ToolAuthority: returns `{success, tool_id, execution_id, result|error,
  │   timestamp}`. No output hashing, no normalization.
  ├─ ToolGateway: hashes output via CanonicalAuthority, builds a witness via
  │   WitnessAuthority — BUT the tool hash EXCLUDES the handler
  │   (`delete toolForHash.handler`), so swapping the implementation does
  │   NOT change tool identity/witness. Schema changes via re-registration
  │   silently overwrite (same tool_name → same tool_id).
  ▼
AGENT CONSUMPTION
  │
  ├─✗ BROKEN: no consumer. gateway/ollama_adapter.js (338 lines) has ZERO
  │   "tool" references — the inference path cannot receive or dispatch tool
  │   calls. (It does have a 30s inference timeout — the tool path has none.)
  ▼
EVENT / AUDIT RECORD
  │
  ├─✗ ToolAuthority: this._postgres is stored (line 18) and NEVER USED.
  │   No events emitted, no DB writes. Tool executions would leave ZERO
  │   durable trace.
  ├─✗ ToolGateway: records go to in-memory Maps only
  │   (`_toolExecutionHistory`, `_toolRuntimeMetadata`); `clear()` wipes
  │   all three maps "for testing" and is publicly callable. The
  │   "I/O operation record" (runtime_io_authority.js:20-23) is an
  │   in-memory counter: `recordHTTPRequest(url, method)` → `{url, method,
  │   id: this._nextId++}`. No persistence, no sink.
  ├─✗ ping-runtime/events/unified_event_runtime.js has ZERO "tool"
  │   references; no TOOL_* event type exists anywhere (js/ts/sql). The
  │   canonical ping_events table would record NOTHING about tool execution.
```

**Bottom line of the map:** every arrow into, through, and out of tool execution is broken or dormant. The system today cannot execute a tool on behalf of an agent by any path.

---

## 2. Per-path reality matrix

| # | Candidate path / artifact | Classification | Who can invoke? | Identity of caller vs tool call | Args validated? | Permissions BEFORE exec? | Bypassable? | Schema pinned/versioned? | Timeout? | Audit persisted? |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `gateway/tool_authority.js` :: ToolAuthority.executeTool | SOURCE_PRESENT / DORMANT | Nobody — zero require() callers; repo dormant_classifications: dependent_modules=0, recommendation="migrate" | Caller identity = `context.mission` (mission_id, authority_id); tool call carries no separate identity/principal | NO — `parameters` schema in descriptor never enforced at execution | YES-but-FAIL-OPEN: `_checkToolPermission` returns `{allowed:true}` when `permissionAuthority` is undefined — and no such module exists in tree | Trivially: instantiate without permissionAuthority, or call `tool.implementation` directly (public on descriptor) | NO — schemas inline in descriptors; `registerTool` overwrites silently | NO — unbounded `await` | NO — `_postgres` stored, never used; no events |
| 2 | `gateway/tool_gateway.js` :: toolGateway.executeTool | SOURCE_PRESENT / DORMANT | Nobody — zero require() callers; repo headers mark "(dormant)"; dormant_classifications: dependent_modules=0, deletion_confidence=72, "needs_review". Singleton auto-instantiated on require; `clear()` publicly wipes history | No identity concept at all — executionData has tool_id/parameters/replay_id/runtime_context, no principal/tenant | WEAK — custom validator honors only per-property `required`/type under `schema.properties`; JSON-Schema object-level `required:[]` ignored; absent schema → valid | NO — no authorization check exists in executeTool | N/A (nothing to bypass) | NO — tool_id = `tool_<hash(tool_name)>`; re-registering same name silently replaces schema+handler; witness hash EXCLUDES handler (implementation swap invisible) | NO — unbounded `await tool.handler()` | NO — in-memory Maps only; ioAuthority is a counter |
| 3 | `gateway/inference_authority.js` :: _buildToolManifest | SOURCE_PRESENT / DORMANT | Zero require() callers; dormant_classifications: dependent_modules=0, "migrate" | N/A | N/A (manifest built then discarded at line 58) | N/A | N/A | N/A | N/A | N/A |
| 4 | `mcp/ping_mcp_server.py` (the "MCP server") | ARCHAEOLOGICAL | Nobody — never imported by running code; only referenced by docs (MCP_CERTIFICATION.md, INFERENCE_AND_TOOL_AUTHORITY_AUDIT.md, FINAL_OPERATIONAL_CERTIFICATION.md) and JSON knowledge indexes | N/A — not a server; plain functions | NO — `query`, `limit`, `doc_id` passed straight into URL params | NO | N/A | N/A | 10s/30s `requests` timeouts (only real timeouts in the tool story) | NO — returns `{"error": ...}` dicts on failure |
| 5 | `beforeMCPExecution` / `afterMCPExecution` hooks; `gateway/hooks/` | PHANTOM | N/A — the directory does not exist (`ls: cannot access 'gateway/hooks'`); the hook names have ZERO hits repo-wide across all file types, case-insensitive | — | — | — | — | — | — | — |
| 6 | Cursor / `.muse/mcp.json` / `.mcp.json` MCP client config | MISSING | — (no config exists anywhere in tree) | — | — | — | — | — | — | — |
| 7 | Composio | MISSING | Zero references repo-wide | — | — | — | — | — | — | — |
| 8 | LLM function-calling / `tool_calls` loop | MISSING | Zero `tool_calls` references repo-wide; `gateway/ollama_adapter.js` has zero "tool" references | — | — | — | — | — | — | — |
| 9 | `gateway/adapters/ollama_adapter.js` (InferenceEngine provider seam) | SOURCE_PRESENT / BROKEN | Cannot be loaded by anyone: requires `../infrastructure_adapter_interface` (MISSING) and `../serializer_authority` (MISSING, tree-wide find) | — | — | — | — | — | — | — |
| 10 | `runtime/kernel/capabilities/capability-authority.ts` (+ interface/registry/resolver/validator) | SOURCE_PRESENT / UNWIRED-TO-TOOLS | TS-only; no dist/; zero JS consumers; nothing in the tool path references it | — | — | — | — | — | — | — |
| 11 | `gateway/ollama_analyst_tools.js` (repository.*/knowledge.*/etc. "tools") | SOURCE_PRESENT / DORMANT-ish | Only caller: `gateway/end_to_end_verifier.js:399` (a verification harness) | N/A — read-only HTTP snapshot client with "Never shell / Never SQL / Never Docker" constraints; hits `GATEWAY_URL` (default `http://localhost:8080`) | N/A | NO — no auth on `_fetch` | N/A | N/A | NO — unbounded `fetch` | NO |
| 12 | `search_constitution_function.py` (repo root) | ARCHAEOLOGICAL | Nobody | N/A — plain functions → `http://mission-control:8000` (no such service) | NO | NO | N/A | N/A | 10s requests timeouts | NO |
| 13 | INFERENCE_AND_TOOL_AUTHORITY_AUDIT.md "MCP insertion strategy" (Mission Control → MCP delegation; Gateway → MCP direct) | DOCUMENTED_ONLY | — | — | — | — | — | — | — | — |

**Cross-cutting answers (from source):**
- **Outcome-state distinguishability: NO.** ToolAuthority yields `{success:true}|{success:false,error}` only. ToolGateway yields `constitutional_result` or throws `TOOL_NOT_FOUND` / `TOOL_VALIDATION_FAILED` / `TOOL_EXECUTION_FAILED` — and the catch block **swallows the original error** (`catch (error) { throw ... {tool_id, failure_code:'TOOL_EXECUTION_FAILED'} }` — `error.message` is discarded). Neither has timeout, cancellation, or an UNKNOWN-OUTCOME state. **UNKNOWN would silently collapse into FAILED** (or hang forever, since there is no timeout) the moment a real side-effecting tool is wired in.
- **Tool result vs authorization decision confusion:** structurally separate objects today (`{allowed}` vs `{success,result}`), but authorization is fail-open-or-absent, so the distinction is moot — there is effectively no authorization decision being made.
- **Instruction injection via tool result:** no live LLM consumes tool output, so no live injection path. Dormant ToolAuthority stubs return placeholder strings that a future agent loop would ingest unfiltered — no provenance marking, no sandboxing, no "tool output is data, not instruction" boundary anywhere in the dormant code.
- **Secrets:** tool `parameters`/`context` flow into implementations and witnesses unredacted; ToolGateway witnesses hash full parameters (`parameters_hash` over canonicalized params — a secret in args becomes a hash of the secret in the witness). The archaeological `credential_inventory` "tool" proxies `/credentials/inventory` over plain HTTP. No redaction utility observed on the tool path.
- **Cross-tenant:** neither tool module has any tenant concept. Sibling context says `core::`/`tenant::` namespace privacy exists, but the tool path never consults it. Dormant today; a P0 design constraint for the sprint.
- **Compromised-server impersonation:** no capability binding exists between a tool identity and its implementation — ToolGateway hashes exclude the handler; ToolAuthority stores raw function refs. A swapped implementation is undetectable by the witness machinery.

---

## 3. Adversarial MCP test designs (design only — NOT executed)

Reading note: the live system has no tool path, so "live behavior" for every test is *no tool executes*. The **CURRENT EXPECTED BEHAVIOR** column below evaluates the dormant modules **as if wired up as-is** — the state the sprint would inherit if it resurrected them without a rewrite. Evidence cites file + symbol.

### T1 — Duplicate invocation (same logical call issued twice)
- **TEST:** Call `executeTool('code-search', {query:'x'}, ctx)` twice with identical args; inspect audit trail.
- **FAILURE MODE:** Double side effect recorded as one, or two records for one intent.
- **EXPECTED SAFE:** Second identical call is deduplicated via idempotency key, or both executions are recorded with distinct IDs and a duplicate-suppression decision is explicit.
- **CURRENT (as-wired):** ToolAuthority: two distinct `execution_id`s (timestamp in ID) — no dedupe, no duplicate detection; the agent cannot tell they were the same intent. ToolGateway: deterministic ID → second run SILENTLY OVERWRITES the first history record; handler re-runs.
- **EVIDENCE:** `gateway/tool_authority.js` :: `executeTool` → `deterministicIdAuthority.generateIdFromObject({tool_id, timestamp})`; `gateway/tool_gateway.js` :: `_generateExecutionId` + `_toolExecutionHistory.set(executionId, ...)`.
- **SPRINT PRIORITY:** P0 (idempotency-key design before any real tool is wired).

### T2 — Retry after ambiguous timeout
- **TEST:** Tool call times out ambiguously (no response); caller retries.
- **FAILURE MODE:** Retry duplicates a side effect that actually completed.
- **EXPECTED SAFE:** Timeout produces UNKNOWN-OUTCOME (not FAILED); retry carries the original idempotency key; executor returns the prior result instead of re-executing.
- **CURRENT (as-wired):** No timeout exists, so this state is unreachable by timeout — but equally there is no UNKNOWN-OUTCOME state and no idempotency key, so the design cannot express "maybe completed."
- **EVIDENCE:** No timeout param in either `executeTool`; outcome enums are binary/ternary only (see §2).
- **SPRINT PRIORITY:** P0 (UNKNOWN-OUTCOME is the single most dangerous missing state).

### T3 — Timeout after side effect
- **TEST:** Tool performs a write, then the response is lost.
- **FAILURE MODE:** Caller marks FAILED and compensates; compensation double-applies.
- **EXPECTED SAFE:** Distinguish "response lost" from "execution failed"; reconciliation query before compensation.
- **CURRENT (as-wired):** Impossible to distinguish — no timeout, and ToolAuthority's catch-all returns `success:false` for every throw alike.
- **EVIDENCE:** `gateway/tool_authority.js` :: `executeTool` try/catch → `{success:false, error:error.message}`.
- **SPRINT PRIORITY:** P0.

### T4 — Server disappears mid-request
- **TEST:** MCP server process dies between request dispatch and response.
- **FAILURE MODE:** Caller blocks forever or misclassifies.
- **EXPECTED SAFE:** Transport-level deadline → UNKNOWN-OUTCOME + audit record of dispatch.
- **CURRENT (as-wired):** No MCP transport exists; in-process `await` would hang forever (no deadline). Nothing records "dispatched."
- **EVIDENCE:** unbounded `await tool.handler(...)` / `await tool.implementation(...)`.
- **SPRINT PRIORITY:** P0 (transport deadline + dispatch journal).

### T5 — Malformed response
- **TEST:** Tool returns non-JSON / wrong shape.
- **FAILURE MODE:** Crash propagates, or garbage is normalized into a "success."
- **EXPECTED SAFE:** Schema-validate tool RESULT (not just args); malformed → typed failure, original bytes preserved for forensics.
- **CURRENT (as-wired):** Neither module validates results. ToolGateway hashes whatever came back (`CanonicalAuthority.hash(toolResult)`) and witnesses it as legitimate.
- **EVIDENCE:** `gateway/tool_gateway.js` :: `executeTool` — no result validation step.
- **SPRINT PRIORITY:** P1.

### T6 — Schema version change
- **TEST:** Deploy tool v2 with a changed parameter schema; replay an old call.
- **FAILURE MODE:** Old args silently accepted under new semantics, or valid old calls rejected with no migration path.
- **EXPECTED SAFE:** Schemas pinned + versioned; execution record cites schema version; mismatch → typed failure naming expected vs actual version.
- **CURRENT (as-wired):** No versioning. ToolGateway re-registration silently overwrites; witness hash excludes the handler so even implementation swaps are invisible. ToolAuthority has no schema store at all.
- **EVIDENCE:** `gateway/tool_gateway.js` :: `registerTool` (overwrite), `_createToolWitness` (`delete toolForHash.handler`).
- **SPRINT PRIORITY:** P1.

### T7 — Tool renamed / removed
- **TEST:** Rename `code_search` → `code-search-v2`; invoke old name.
- **FAILURE MODE:** Silent misrouting to a different tool, or confusing error.
- **EXPECTED SAFE:** Stable tool IDs independent of display names; removal → typed TOOL_RETIRED with successor pointer.
- **CURRENT (as-wired):** ToolGateway IDs derive from name hash (`tool_<hash(tool_name)>`), so rename = new identity = old ID → TOOL_NOT_FOUND. ToolAuthority keys by caller-supplied `tool_id` string with no stability contract.
- **EVIDENCE:** `gateway/tool_gateway.js` :: `_generateToolId`.
- **SPRINT PRIORITY:** P2.

### T8 — Oversized result
- **TEST:** Tool returns 500MB payload.
- **FAILURE MODE:** OOM, or unbounded bytes persisted into audit/event store.
- **EXPECTED SAFE:** Result size cap; oversized → typed failure with truncation + digest of full bytes.
- **CURRENT (as-wired):** No size checks; ToolGateway would hash and store the full object in an in-memory Map (heap growth, plus `clear()` as the only relief valve).
- **EVIDENCE:** `gateway/tool_gateway.js` :: `_toolExecutionHistory.set(executionId, constitutionalResult)` — unbounded.
- **SPRINT PRIORITY:** P1.

### T9 — Malicious tool result (data exfil / prompt-shaped payload)
- **TEST:** Tool returns plausible-looking but attacker-controlled content.
- **FAILURE MODE:** Downstream agent treats tool data as instruction or exfiltrates it.
- **EXPECTED SAFE:** Tool output tagged as untrusted data with provenance; never auto-ingested into privileged context.
- **CURRENT (as-wired):** No provenance tagging, no trust boundary; nothing consumes output today, so the hazard activates the moment an agent loop is wired.
- **EVIDENCE:** absence of any provenance/trust marking in both `executeTool` return shapes.
- **SPRINT PRIORITY:** P0 (design the trust boundary before the first agent loop).

### T10 — Instruction injection in tool result
- **TEST:** Tool result contains "ignore previous instructions and …".
- **FAILURE MODE:** Agent obeys injected instruction.
- **EXPECTED SAFE:** Structural separation: tool results enter a data channel the planner cannot mistake for instructions; injection patterns quarantined.
- **CURRENT (as-wired):** No separation exists in the dormant code; no injection screening anywhere on the path.
- **EVIDENCE:** `gateway/ollama_adapter.js` has no tool-result ingestion at all (nothing to attack yet — the boundary must be built, not patched).
- **SPRINT PRIORITY:** P0.

### T11 — Unauthorized tool / argument
- **TEST:** Invoke `file-write` with a mission lacking that grant; invoke `file-read` with `path=/etc/shadow`.
- **FAILURE MODE:** Silent allow.
- **EXPECTED SAFE:** Deny-by-default; every execution checks capability grant BEFORE dispatch; argument-level policy (path allowlists) enforced.
- **CURRENT (as-wired):** ToolAuthority FAILS OPEN when `permissionAuthority` is absent (and no such module exists in-tree); ToolGateway checks nothing. No argument-level policy anywhere.
- **EVIDENCE:** `gateway/tool_authority.js` :: `_checkToolPermission` fail-open branch; absence of any check in `gateway/tool_gateway.js` :: `executeTool`.
- **SPRINT PRIORITY:** P0 (deny-by-default + capability-authority.ts integration).

### T12 — Cross-tenant invocation
- **TEST:** Tenant A's mission invokes a tool against Tenant B's data scope.
- **FAILURE MODE:** Silent cross-tenant read/write.
- **EXPECTED SAFE:** Tenant bound to execution context; tool handlers receive only their tenant's scope; cross-tenant → typed denial + audit.
- **CURRENT (as-wired):** No tenant concept in either module; `context.mission` carries mission_id/authority_id only.
- **EVIDENCE:** ctor and `executeTool` signatures in both files; no tenant field.
- **SPRINT PRIORITY:** P0 (must precede any multi-tenant tool).

### T13 — Credential leakage (args / results / logs / traces / memory)
- **TEST:** Pass an API key as a tool argument; run; inspect witness, history, logs.
- **FAILURE MODE:** Secret lands in witness hash input (hash of secret), logs, or memory.
- **EXPECTED SAFE:** Secret-typed parameters redacted before hashing/logging/persisting; secret allowlist per tool.
- **CURRENT (as-wired):** ToolGateway hashes full canonicalized parameters into the witness; `console.log` lines emit tool IDs; no redaction utility on the path.
- **EVIDENCE:** `gateway/tool_gateway.js` :: `parameters_hash: CanonicalAuthority.hash(canonicalParameters)`; `console.log` in both modules.
- **SPRINT PRIORITY:** P1.

### T14 — Cancellation race
- **TEST:** Cancel a tool call while the handler is mid-execution.
- **FAILURE MODE:** "Cancelled" reported but side effect completed (or vice versa).
- **EXPECTED SAFE:** Cooperative cancellation tokens; outcome after cancel-request is UNKNOWN until reconciled, never "cancelled-and-therefore-not-done."
- **CURRENT (as-wired):** No cancellation mechanism exists (no AbortSignal, no token). Cancellation is unrepresentable.
- **EVIDENCE:** signatures of both `executeTool`s — no signal/token param.
- **SPRINT PRIORITY:** P1 (P0 if tools gain side effects before cancel semantics land).

### T15 — Concurrent duplicate dispatch
- **TEST:** Two identical calls dispatched concurrently.
- **FAILURE MODE:** Both execute; double side effect.
- **EXPECTED SAFE:** Single-flight keyed on idempotency key; second caller awaits/joins the first.
- **CURRENT (as-wired):** No single-flight, no idempotency key; both run. (ToolGateway would additionally collapse the two history records into one via deterministic ID overwrite — evidence of the race destroyed.)
- **EVIDENCE:** no locking/keying in either module; `Map.set` overwrite in ToolGateway.
- **SPRINT PRIORITY:** P1.

### T16 — Partial execution (multi-step tool fails halfway)
- **TEST:** Tool performs 3 writes; 2nd fails.
- **FAILURE MODE:** Reported FAILED with no record of what completed; retry redoes write #1.
- **EXPECTED SAFE:** Step journal; partial progress recorded; resume/compensate explicitly.
- **CURRENT (as-wired):** Tools are opaque single `await`s; no step model, no journal.
- **EVIDENCE:** `await tool.implementation(parameters, context)` — atomic from the caller's view.
- **SPRINT PRIORITY:** P2 (matters once composite tools exist).

### T17 — Tool succeeds but persistence of the record fails
- **TEST:** Handler returns; writing the execution record throws.
- **FAILURE MODE:** Side effect happened, audit says nothing — ghost execution.
- **EXPECTED SAFE:** Write-ahead/dispatch journal: record INTENT before execution; reconcile on recovery.
- **CURRENT (as-wired):** ToolAuthority persists nothing at all (pool unused) so the "record" can't fail — the ghost is the DEFAULT state: every execution is unrecorded. ToolGateway writes to memory after success; a throw between handler-return and `Map.set` (e.g. witness hashing failure) loses the record while the side effect stands.
- **EVIDENCE:** ordering in `gateway/tool_gateway.js` :: `executeTool` (handler → hash → witness → set); unused `_postgres` in ToolAuthority.
- **SPRINT PRIORITY:** P0 (dispatch journal in ping_events before execution — the event authority already exists).

### T18 — Persistence succeeds but response delivery fails
- **TEST:** Execution recorded; returning the result to the agent crashes.
- **FAILURE MODE:** Agent retries; duplicate execution.
- **EXPECTED SAFE:** Exactly-once-effect via idempotency key: retry replays the recorded result instead of re-executing.
- **CURRENT (as-wired):** No idempotency keys (ToolAuthority) or destructive overwrite (ToolGateway); retry always re-executes.
- **EVIDENCE:** same as T1.
- **SPRINT PRIORITY:** P0.

---

## 4. Phantom findings (hunt results)

| Phantom | Evidence | Classification |
|---|---|---|
| `beforeMCPExecution` / `afterMCPExecution` hooks | Zero hits repo-wide (all extensions, case-insensitive); `gateway/hooks/` does not exist | PHANTOM — the names appear in no artifact in the current tree. If a prior brief referenced them, the spec was never implemented. |
| "MCP server" (`mcp/ping_mcp_server.py`) | No MCP SDK, no Server, no transport; plain `requests.get` functions; target service `mission-control:8000` has no definition in tree | ARCHAEOLOGICAL — certified 2026-06-22 (MCP_CERTIFICATION.md), never an MCP server, never invoked by running code |
| ToolAuthority permission system | `_checkToolPermission` delegates to `permissionAuthority.checkPermission()`; no `permission_authority` module exists in tree; effective behavior = fail-open allow-all | PHANTOM dependency inside SOURCE_PRESENT module |
| ToolAuthority persistence | `this._postgres` stored line 18, never referenced again | Dead wiring — suggests intended DB audit that was never built |
| InferenceAuthority tool manifest | `_buildToolManifest` result computed line 58, discarded; never enters contract | Dead code path in a zero-caller module |
| MCP "insertion strategy" (INFERENCE_AND_TOOL_AUTHORITY_AUDIT.md §5) | "Step 1: Mission Control delegates tool authority to MCP…" — no code implements any step | DOCUMENTED_ONLY |
| MCP_CERTIFICATION.md "10/11 tools verified working" | Verification was HTTP 200s against a Mission Control that no longer exists in-tree; `recent_events` 500'd even then | ARCHAEOLOGICAL — certification claims do not transfer to current tree |
| `gateway/adapters/ollama_adapter.js` provider seam | Two dangling requires (`../infrastructure_adapter_interface`, `../serializer_authority`); module cannot load | SOURCE_PRESENT / BROKEN |
| Cursor/MCP client configuration | No `.muse/`, `.cursor/`, `mcp.json`, `.mcp.json` anywhere | MISSING — no MCP client is configured to invoke anything |
| capability-authority.ts ↔ tool integration | TS capability system exists; zero JS consumers; tool modules reference a different, nonexistent JS permission module | MISSING integration (both halves exist, unconnected) |
| Repo self-classification corroboration | `ping-runtime/orchestration/dormant_classifications/gateway_tool_authority.json` (dependent_modules: 0, "migrate") and `gateway_tool_gateway.json` (dependent_modules: 0, deletion_confidence: 72, "needs_review"), classified 2026-09-21 | SUPPORTED INFERENCE: the repo's own index agrees both tool modules are dead code |

---

## 5. UNRESOLVED QUESTIONS (grill candidates for ~/workspace/GRILLING-BRIEF.md)

1. **Which tool plane survives?** Two divergent designs exist: ToolAuthority (permission-checked, fail-open, no validation, stub tools) vs ToolGateway (validated, witnessed, no auth, destructive-overwrite history). They share no code and disagree on auth, identity, validation, and audit. Does the sprint pick one, merge, or greenfield on the capability-authority.ts contract? (SUPPORTED INFERENCE: keeping both is a constitutional-authority violation — two owners of "tool execution".)
2. **Where did `beforeMCPExecution`/`afterMCPExecution` come from?** The names exist in no artifact in the current tree. Was there a spec doc outside the repo, or is this a confabulated requirement? If hooks are desired, what exact interception points do they name?
3. **Is MCP actually wanted, or is "tool" the real requirement?** No MCP transport, client config, or server exists or ever ran here; the one file named "mcp server" is a plain HTTP proxy to a dead service. Should the sprint build real MCP (protocol, transport, sandboxing) or a native tool plane with capability-authority.ts as the gate?
4. **Who is the principal?** Tool calls carry mission_id/authority_id at best, nothing at worst. What identity (user, tenant, agent, mission) authorizes a tool call, and where is it minted? This blocks T11/T12.
5. **What is the outcome-state machine?** Minimum viable: NOT_STARTED / DISPATCHED / SUCCEEDED / FAILED / TIMED_OUT / CANCELLED / UNKNOWN. Is UNKNOWN-OUTCOME a first-class persisted state before any side-effecting tool ships? (OBSERVED FACT: currently unrepresentable.)
6. **Where does the dispatch journal live?** The event authority (`ping-runtime/events/unified_event_runtime.js` → `ping_events`) is the canonical choice and currently records zero tool events. Is every tool dispatch a canonical event, or does the tool plane keep its own journal?
7. **Idempotency-key format and scope:** natural key (tool_id + canonical args hash + mission/tenant) vs caller-supplied key? Who mints it — the agent, the gateway, or the authority? (Blocks T1/T2/T15/T18.)
8. **Result validation and size caps:** are tool RESULT schemas required (T5), and what is the max result size (T8)? Who enforces — authority or transport?
9. **Secret-typed parameters:** which tools may receive secrets, and what redacts them from witnesses/logs/history (T13)?
10. **What happens to `mcp/` and `search_constitution_function.py`?** Archaeological HTTP proxies to a nonexistent `mission-control:8000`. Delete, archive, or resurrect as real MCP servers?

---

## Evidence log (how each claim was verified)

- Bridge: `~/workspace/pig/pigwsl-run.sh '<script>' < /dev/null`; scripts kept <6000 chars; no repo writes.
- Commit/branch: `git rev-parse HEAD` → `cc6856c3bc78e0535e66f168c66dc31abee2c073`; `git branch --show-current` → `refactor/runtime-authority-convergence`. OBSERVED FACT.
- `gateway/hooks/` nonexistence: `ls -la gateway/hooks` → "No such file or directory". OBSERVED FACT.
- Hook-name absence: repo-wide `grep -rli "beforeexecution|afterexecution|mcpexecution"` (all files, excl. node_modules/worktrees) → zero hits. OBSERVED FACT.
- Zero callers: repo-wide `grep -rn "require(.*tool_gateway|require(.*tool_authority|new ToolAuthority|new ToolGateway|executeTool|getToolManifest|allowed_tools"` (js/ts, excl. self-files) → only hit: `gateway/inference_authority.js:235` (`allowed_tools:` field copy). OBSERVED FACT.
- Zero `tool_calls`: repo-wide grep → zero hits. OBSERVED FACT.
- Zero Composio: repo-wide grep -rli → zero hits. OBSERVED FACT.
- No MCP config: `find` for `mcp.json`/`.mcp.json`/`.cursor*` + `ls .muse .cursor` → nothing. OBSERVED FACT.
- Dangling requires: `gateway/adapters/ollama_adapter.js:2-3`; tree-wide find for `*infrastructure_adapter_interface*` and `*serializer_authority*` → no files. OBSERVED FACT.
- `mcp/ping_mcp_server.py` full read (215 lines): no MCP imports; `__main__` test harness only. OBSERVED FACT.
- `gateway/tool_authority.js` full read (388 lines); `gateway/tool_gateway.js` full read (494 lines); `gateway/inference_authority.js` lines 1–180, 300–381; `gateway/runtime_io_authority.js` lines 1–60; `gateway/ollama_adapter.js` head + tool-grep; `runtime/kernel/capabilities/capability-authority.ts` head. All OBSERVED FACT unless marked inference.
- Dormant classifications: `ping-runtime/orchestration/dormant_classifications/gateway_tool_{authority,gateway}.json` + `_summary.json` (classified 2026-09-21). OBSERVED FACT (repo-generated index, treated as corroborating signal, not ground truth).
- No `TOOL_*` events: grep `TOOL_EXECUTED|ToolExecuted|tool_executed` (js/ts/sql) → zero; `grep -in "tool" ping-runtime/events/unified_event_runtime.js` → zero. OBSERVED FACT.
- `mission_runtime.js` / `worker_runtime.js` tool-grep → zero hits each. OBSERVED FACT.
- GRILLING-BRIEF.md: not in repo tree; exists at `~/workspace/GRILLING-BRIEF.md` (workspace root) — unresolved questions above are candidates for that surface. OBSERVED FACT.

## Classification legend used
RUNTIME_PROVEN (observed in a live boot path) · SOURCE_PRESENT (code exists, may be dormant) · CONFIG_PRESENT · DOCUMENTED_ONLY · EXPERIMENTAL · ARCHAEOLOGICAL (once-live or once-certified, now dead) · MISSING · PHANTOM (referenced name with no artifact) · DORMANT (source present, zero callers — appended where verified)
