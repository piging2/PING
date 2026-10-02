# MCP Tool Plane Inventory (MCP1)

Branch examined: `tenanos-wave-gateway/integration` in `/home/nolan/ping` (Pig/WSL).
Method: strictly read-only (`git show` / `git grep` against the branch; no checkout, no writes).
Date: 2026-09-24. HEAD of branch at examine time: `870069ca7 Merge-P0-lease-fixes-106-107-108`.

## 1. Registry map

There is no Model Context Protocol SDK server in the branch (no `@modelcontextprotocol`
dependency, no `tools/list` / `tools/call` / `CallTool` handlers in code). The "MCP tool
plane" is the gateway's own tool registry/discovery code, in four pieces:

### Plane A: `gateway/tool_authority.js` (388 lines) — ToolAuthority
Refactor-6 registry for the Mission -> Tool Authority -> Tool Manifest -> Inference pipeline.
- `registerTool(toolDescriptor)` — tool_authority.js:41 (Map.set keyed by `tool_id`)
- `getToolManifest(mission)` — tool_authority.js:60 (per-mission discovery; the list-tools equivalent)
- `_checkToolPermission(tool, mission)` — tool_authority.js:109
- `executeTool(toolId, parameters, context)` — tool_authority.js:134
- `listTools()` — tool_authority.js:333, `listToolsByCategory`, `getTool`
- `_loadDefaultTools()` — tool_authority.js:189 registers the only 4 tools in the branch

### Plane B: `gateway/tool_gateway.js` (494 lines) — ToolGateway
Phase 4.6 constitutional tool gateway (Ollama tool-request path).
- `registerTool(toolData)` — tool_gateway.js:55 (tool_id derived as `tool_<hash(tool_name)>`)
- `executeTool(executionData)` — tool_gateway.js:102 (schema validation, canonicalization, witness)
- `_validateParameters` — tool_gateway.js:218, `_createToolWitness`, `verifyToolWitness`,
  `verifyToolReplayEquivalence`, `getAllTools()` — tool_gateway.js:422, `clear()` — tool_gateway.js:437
- Singleton `toolGateway` instantiated at tool_gateway.js:492

### Plane C: `runtime/kernel/capabilities/capability-registry.ts` — TS metadata registry
`registerCapability` / `listCapabilities` / find-by-input/output/executor. Descriptors only;
no execute path, no registered capabilities in-tree. Not a tool execution plane.

### Plane D: `capabilities/registry.yaml` — static inventory
Maps capability name -> intent/authority/status/owner file. Documentation, not runtime.

### Explicit non-findings
- `gateway/capability_authority.js` and `gateway/routes/capabilities.js` (the 21-capability
  authority with POST /capabilities and GET /discover cited by P-20260923-093) do NOT exist
  on this branch. The branch's `capabilityRegistry` (gateway_runtime.js:295) is a
  connector/OAuth provider registry, a different concept.
- No permission-authority implementation exists anywhere on the branch
  (no `permission_authority` file; zero hits).

## 2. Wiring status (all PROVEN by branch-wide grep)

- `new ToolAuthority(` — zero call sites. No file requires `tool_authority.js`.
  ToolAuthority is never instantiated in-tree.
- `toolGateway.registerTool(` / `.executeTool(` / `.getAllTools(` — zero call sites outside
  tool_gateway.js itself. The singleton exists; nothing registers tools on it and nothing
  executes through it.
- All four default tool implementations are placeholders with no real effects:
  `_fileReadImplementation` returns `{path, content: 'File content placeholder'}`;
  `_fileWriteImplementation` returns `{path, success: true}` without writing;
  `_codeSearchImplementation` returns `{query, results: []}`;
  `_artifactQueryImplementation` returns `{artifact_type, artifacts: []}`.
- `getToolManifest` — zero callers in-tree.
- Net: the entire tool execution plane is currently dead code with stub effects.
  Findings below are latent design gaps, not live vulnerabilities, with one exception
  noted in section 5 (false-confidence risk).

## 3. Registered tools (complete list on the branch)

| # | tool_id | name | category | file:line | implementation |
|---|---------|------|----------|------------|----------------|
| 1 | `file-read` | `file_read` | filesystem | gateway/tool_authority.js:192 | placeholder |
| 2 | `file-write` | `file_write` | filesystem | gateway/tool_authority.js:209 | placeholder |
| 3 | `code-search` | `code_search` | code | gateway/tool_authority.js:230 | placeholder |
| 4 | `artifact-query` | `artifact_query` | artifact | gateway/tool_authority.js:251 | placeholder |

ToolGateway has zero registered tools in-tree (registry infrastructure only).

## 4. Per-tool matrix (10 rows; side-effecting tools first)

Cells: PROVEN = property verified in code with evidence; GAP = absent or broken.
The five columns: (S) schema exists and is strict; (A) auth boundary present;
(E) effect class declared; (R) retry semantics defined; (X) secret redaction in logging.

### Row 1: `file-write` (tool_authority.js:209) — the only advertised write tool
- S: GAP. A JSON-schema-shaped descriptor exists (`type: object`, `properties.path`,
  `properties.content`, `required: [path, content]`), but `executeTool` (tool_authority.js:134)
  never validates parameters against it. Not strict, not enforced.
- A: GAP. `_checkToolPermission` (tool_authority.js:109-113) delegates to
  `this._permissionAuthority`, which has no implementation on the branch; the fallback is
  `return { allowed: true }` ("No permission authority, allow all"). Fail-open default.
- E: GAP. Descriptor carries no effect class, no `destructiveBehavior`, nothing.
- R: GAP. No retry policy, no idempotency key, no dedup anywhere in the file.
- X: GAP (latent). Console logs carry only tool_id/mission_id (PROVEN clean today, lines
  28-135), but there is no redaction mechanism for when the placeholder becomes a real
  write; nothing strips secrets from parameters before they would be logged or witnessed.

### Row 2: `file-read` (tool_authority.js:192)
- S: GAP (same as row 1: schema advertised, never enforced by executeTool).
- A: GAP (same fail-open permission default).
- E: GAP (no effect class; descriptor does not even mark it read-only).
- R: GAP (no retry semantics).
- X: GAP (latent; same reasoning as row 1; a real read of credential files would have
  no redaction boundary).

### Row 3: `code-search` (tool_authority.js:230)
- S: GAP. A: GAP. E: GAP. R: GAP. X: GAP (latent). Same envelope as rows 1-2.

### Row 4: `artifact-query` (tool_authority.js:251)
- S: GAP. A: GAP. E: GAP. R: GAP. X: GAP (latent). Same envelope. Note: `filters`
  is typed as a free-form object with no tenant scoping field and no tenant enforcement
  anywhere in the plane (zero "tenant" mentions in either tool file, PROVEN by grep).

### Row 5: ToolGateway.executeTool envelope (tool_gateway.js:102)
- S: GAP (weak, not strict). `_validateParameters` (tool_gateway.js:218) exists but:
  (a) it checks `propertySchema.required` per property, while JSON Schema puts `required`
  as an array at the schema level, so required-fields are effectively never enforced;
  (b) only `typeof` checks, no nested/array validation; (c) no `additionalProperties`
  handling; (d) schema defaults to `{}` at registration (tool_gateway.js:62), and an
  empty schema validates everything (`if (!schema.properties) return {valid: true}`).
- A: GAP. No permission check, no mission check, no tenant check, no caller identity
  in `executeTool` at all. Anyone holding the singleton reference can execute any
  registered tool.
- E: GAP. No effect class on the tool record (fields: tool_id, tool_name, handler,
  schema, gateway_id, tool_metadata).
- R: GAP. No retry policy or dedup. `_generateExecutionId` (tool_gateway.js:446) is
  deterministic over (tool_id, parameters, replay_id, runtime_context_id), which gives
  stable IDs but there is no dedup store, so a retried call re-executes the handler.
- X: GAP. `_createToolWitness` stores full `parameters` and full `output` in the
  constitutional result and the in-memory execution history (tool_gateway.js:172-196);
  no redaction, masking, or sanitization function exists in the file (PROVEN: zero hits
  for redact/sanitize/mask).

### Row 6: ToolAuthority.executeTool envelope (tool_authority.js:134)
- S: GAP (no validation call at all). A: GAP (fail-open default, section 4 row 1).
- E: GAP. R: GAP. Note the execution ID is derived from (tool_id, timestamp) only
  (tool_authority.js:150-153), so it is not even stable across retries of the same call.
- X: PROVEN clean for current console logs (tool_id/mission_id only); GAP for any
  future parameter/result logging (no redaction mechanism).

### Row 7: ToolAuthority.getToolManifest discovery (tool_authority.js:60)
- S: GAP (manifest exposes name/description/parameters/tool_id/category, lines 92-99;
  parameters schema passed through unvalidated).
- A: GAP. Scoping is `mission.allowed_tools` plus `mission.allowed_tool_categories`,
  but (a) the permission fallback is fail-open, and (b) category expansion silently
  widens the set: lines 71-77 push every tool in an allowed category into
  `mission.allowed_tools`, mutating the caller's mission object as a side effect.
- E: GAP. R: GAP (discovery is not retried/guarded; n/a but undeclared).
- X: PROVEN (manifest carries no parameter values).

### Row 8: ToolGateway.registerTool (tool_gateway.js:55)
- S: GAP (schema optional, defaults to `{}`). A: GAP. Registration is unauthenticated;
  tool_id is derived from tool_name hash (tool_gateway.js:458-465), so re-registering
  an existing tool_name silently overwrites the handler (Map.set, line 82). Tool
  squatting/hijack vector: a later registrant replaces the implementation with no
  version check, no auth, no audit of the replacement.
- E/R/X: GAP (registration records no effect class, no retry policy; no logging at all).

### Row 9: ToolAuthority.registerTool (tool_authority.js:41)
- A: GAP. Same silent-overwrite semantics (`this._tools.set`, line 45), no auth, no
  version check. Logs only the tool_id (line 42; PROVEN minimal).
- S/E/R/X: GAP (descriptor schema is caller-supplied and never validated at
  registration; no effect class; no retry; no redaction).

### Row 10: ToolGateway.clear() (tool_gateway.js:437)
- A: GAP. Public method wipes `_toolExecutionHistory`, `_registeredTools`, and
  `_toolRuntimeMetadata` with no auth, no confirmation, no audit. Comment says
  "for testing" but nothing restricts it to tests.
- S/E/R/X: GAP (n/a to schema/effect/retry/redaction, but the absence of any guard
  is itself the finding).

Scorecard: 0 of 10 rows PROVEN on all five cells. The only PROVEN-clean cells are
narrow (current log lines carry ids only; manifest carries no values).

## 5. P-20260923-093 counterpart assessment

Does the gateway tool plane lack the classification registry 093 would provide? YES,
substantively. Nothing on the branch declares effect classes, retry policies,
confirmation gates, or UNKNOWN-fail-closed semantics for tools. 093's guard concepts
(map 1:1 to real gaps): no `EffectClass` field (rows 1-4, E: GAP), no `retryPolicy`
(rows 1-6, R: GAP), no `requiresConfirmation` (rows 1, 5, A: GAP), no unclassified-tool
deny (rows 8-9 accept anything).

BUT 093 as diffed cannot be applied as-is; its evidence base is divergent from this
branch (this is F-MCP1-01, recorded in scratch/failures-MCP1.md):
- 093's CAPABILITIES table (21 tools: fs.*, git.*, process.*, service.*, logs.*,
  knowledge.*, event.*, command.run, test.run, build.run) cites
  `/home/nolan/ping-gateway-src/gateway/capability_authority.js` lines 438-778 and
  `routes/capabilities.js` GET /discover. That file exists in the Pig-local snapshot
  `/home/nolan/ping-gateway-src/` (blob 5164f242, added by commit 43a6cd2e4 "gateway:
  commit the live exterior-agent authorization boundary"), but 43a6cd2e4 is NOT an
  ancestor of `tenanos-wave-gateway/integration`, and neither `gateway/capability_authority.js`
  nor `routes/capabilities.js` exists anywhere on the integration branch tree.
- 093's HTTP_SURFACES table DOES map to the branch: `gateway/bootstrap/gateway_runtime.js`
  (892 lines) mounts `/tenants` (:688), `/deployments` (:689), `/runtime` (:690),
  `/reviews` (:784), `/customers` (:787), `/projects` (:790), `/ai-workspace` (:781),
  `/context` (:684), `/system` (:686), `/ops` (:763), `/governance` (:777), `/missions`
  (:803), and `/mc` Mission Control routes (:810) with no auth-middleware string
  anywhere in the file (PROVEN: zero hits for exteriorAuthMiddleware/authMiddleware).
  Line numbers differ from 093's snapshot (788-891); the finding is the same shape.
- 093's WORKER_CLI / INTERNAL tables cite workspace docs, not gateway code; not
  verifiable against this branch.

Recommendation for the coordinator: 093 needs a rebase of its CAPABILITIES evidence
onto the actual branch tool plane (`gateway/tool_authority.js` + `gateway/tool_gateway.js`)
before integration, or its classifications will guard a phantom authority while the
real branch plane (and the unauthenticated HTTP surfaces) stay unclassified. The
highest-value counterpart is small: add `effectClass` + `retryPolicy` +
`requiresConfirmation` to the two `registerTool` descriptors and enforce them in the
two `executeTool` paths, with UNKNOWN/fail-closed defaults.

## 6. Authority-bypass findings (Mission Control / tenant boundaries)

- B1 (PROVEN): `ToolGateway.executeTool` performs zero authorization. No mission check,
  no caller identity, no tenant check (tool_gateway.js:102-133). Any code holding the
  singleton can execute any registered tool, bypassing Mission Control dispatch,
  approval authority, and tenant isolation entirely.
- B2 (PROVEN): `ToolAuthority._checkToolPermission` fails open when no permission
  authority is wired (tool_authority.js:109-113), and no permission authority exists
  on the branch. If ToolAuthority is ever instantiated, every tool is allowed.
- B3 (PROVEN): the tool plane has no tenant concept. Zero "tenant" mentions in
  `tool_authority.js` / `tool_gateway.js`. Tool descriptors and `executeTool` contexts
  carry no tenant_id; `file-read`/`file-write` take an arbitrary `path` with no
  sandboxing, no tenant partition, no path validation in the descriptor contract.
  A real implementation would cross tenant boundaries by construction.
- B4 (PROVEN): `getToolManifest` mutates the caller's mission (`mission.allowed_tools.push`,
  tool_authority.js:71-77) and category expansion silently widens the granted tool set
  beyond what the mission explicitly listed.
- B5 (PROVEN): silent handler overwrite on re-registration in both registries
  (tool_authority.js:45 Map.set; tool_gateway.js:82 Map.set; tool id derived from name
  hash at tool_gateway.js:458-465). No auth, no version check, no replacement audit.
- B6 (PROVEN): `ToolGateway.clear()` (tool_gateway.js:437) is a public, unauthenticated
  registry + history wipe.
- B7 (latent): both `executeTool` paths invoke `tool.implementation` directly with no
  Mission Control record, no approval-authority involvement, no audit ledger entry
  (ToolAuthority's catch returns `{success:false}` inline; ToolGateway writes only to
  an in-memory history map).
- Mitigating fact (PROVEN): the plane is dead code today (section 2), so B1-B7 are
  latent. The live risk is false confidence: any tool-safety work (including 093)
  that classifies only the documented plane while agent effects actually flow through
  the unauthenticated HTTP surfaces (section 5) or worker CLI paths guards the wrong
  perimeter.

## 7. Environment note

One `pigwsl-run.sh` invocation during this task transiently routed to the Windows SSH
side (`/home/nolan` resolved to Windows user content and `cd /home/nolan/ping` failed);
the next invocation returned to the Pig (HOST=Pig) and all paths verified. Treated as
an environmental flake, not a repo finding. All evidence above was re-verified on the
Pig side.
