# Failure classes found by MCP1 (tool-plane inventory), 2026-09-24

Read-only inventory of `tenanos-wave-gateway/integration` (`/home/nolan/ping`).
Full evidence in scratch/mcp-inventory.md. Severity is about the class, not current
exploitability: the tool plane is dead code today (no instantiation, no callers,
placeholder implementations), so most classes are latent design gaps.

## F-MCP1-01: proposal evidence base divergent from integration branch
P-20260923-093's CAPABILITIES table cites `gateway/capability_authority.js` lines
438-778 from `/home/nolan/ping-gateway-src/`. That file does not exist on
`tenanos-wave-gateway/integration`; its blob (5164f242) entered via commit 43a6cd2e4,
which is NOT an ancestor of the integration branch. 093 classifies a phantom plane.
Class: evidence-mapping failure. Action: rebase 093's capability evidence onto
`gateway/tool_authority.js` + `gateway/tool_gateway.js` before integration.

## F-MCP1-02: fail-open permission default
`ToolAuthority._checkToolPermission` (gateway/tool_authority.js:109-113) returns
`{allowed: true}` when no permission authority is wired, and no permission authority
exists anywhere on the branch. Class: fail-open default on the auth boundary.

## F-MCP1-03: zero-authorization execution path
`ToolGateway.executeTool` (gateway/tool_gateway.js:102) checks no permission, mission,
caller identity, or tenant. Class: missing auth boundary on tool execution.

## F-MCP1-04: silent tool handler overwrite (tool squatting)
Both `registerTool` implementations (`tool_authority.js:45`, `tool_gateway.js:82`) do
an unauthenticated `Map.set`; ToolGateway derives tool_id from a name hash
(`tool_gateway.js:458-465`), so re-registering a name replaces the handler with no
version check, no auth, no replacement audit. Class: unguarded registry mutation.

## F-MCP1-05: discovery mutates the caller's mission object
`getToolManifest` pushes category-expanded tools into `mission.allowed_tools`
(gateway/tool_authority.js:71-77), silently widening the granted set beyond what the
mission listed. Class: side effect in a read/discovery path.

## F-MCP1-06: schema validation drift / unenforced schemas
ToolAuthority advertises JSON-schema-shaped descriptors but `executeTool` never
validates. ToolGateway validates but reads `propertySchema.required` (wrong location;
JSON Schema `required` lives at the schema level), does typeof-only checks, and treats
an absent schema as valid. Class: schema drift between advertised contract and
enforcement.

## F-MCP1-07: classified plane is dead code (false-confidence risk)
ToolAuthority is never instantiated; ToolGateway has zero registered tools and zero
`executeTool` callers; all four default implementations are placeholders. A
classification registry applied only here guards nothing while real agent effects flow
elsewhere (e.g. the unauthenticated HTTP surfaces in `gateway/bootstrap/gateway_runtime.js`).
Class: guarding the wrong perimeter.

## F-MCP1-08: no tenant concept in the tool plane
Zero "tenant" mentions in `gateway/tool_authority.js` / `gateway/tool_gateway.js`.
Descriptors (`file-read`/`file-write` arbitrary `path`, `artifact-query` free-form
`filters`) carry no tenant scoping. Class: missing tenant boundary by construction.

## F-MCP1-09: no secret redaction; witnesses persist raw parameters and outputs
No redact/sanitize/mask function in either tool file. `ToolGateway._createToolWitness`
stores full `parameters` and `output` in the constitutional result and in-memory
execution history (gateway/tool_gateway.js:172-196). Class: secret persistence without
a redaction boundary.

## F-MCP1-10: public unauthenticated registry wipe
`ToolGateway.clear()` (gateway/tool_gateway.js:437) wipes registry, execution history,
and runtime metadata with no auth, confirmation, or audit. Class: unguarded
destructive operation on shared state.
