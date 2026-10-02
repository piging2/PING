# MCP Tool-Execution Harvest — Lane Report

**Lane:** mcp-execution (CRX autonomous-missions campaign)
**Date:** 2026-09-23
**Mode:** Research only. No building into CRX, no FYD/Jev/Pig contact, no pushes, no deployments, no credentials in output.
**Rule applied throughout:** README CLAIM != IMPLEMENTATION. Every mechanism below was read in source at the cited commit. Claims that did not survive source inspection are listed under Falsified Claims, not as mechanisms.

## Sources inspected

| Project | Commit inspected | License | What was read |
|---|---|---|---|
| modelcontextprotocol/python-sdk (SDK v2, incl. mcp-types monorepo member) | `f1b6589088534632fef92238ee9750951e3c0185` | MIT (README states MIT) | `src/mcp/client/_probe.py`, `client.py`, `session.py`, `streamable_http.py`, `extension.py`, `src/mcp/shared/dispatcher.py`, `src/mcp/server/auth/middleware/bearer_auth.py`, `provider.py`, `elicitation.py`, `session.py`, `lowlevel/server.py`, `src/mcp-types/mcp_types/_v2026_07_28/__init__.py` |
| modelcontextprotocol/registry | `bf4e88cbe8d1a635c06144ccea1d24cb52fa6186` | LICENSE file present (SPDX not line-verified this pass) | `internal/service/registry_service.go`, `internal/auth/`, `cmd/publisher/auth/`, `docs/reference/server-json/draft/server.schema.json`, `docs/reference/server-json/official-registry-requirements.md` |
| docker/mcp-gateway | `a34df45d4ec0e941a9853ad768c4f6cd818966b3` | LICENSE file present (SPDX not line-verified this pass) | `pkg/interceptors/`, `pkg/policy/policy.go`, `pkg/gateway/capabilitites.go`, `pkg/signatures/signatures.go`, `pkg/oauth/`, `pkg/catalog/types.go`, `pkg/retry/retry.go`, `cmd/docker-mcp/commands/gateway.go` |
| PrefectHQ/fastmcp (v4) | `c6165d9193887d61a9c6ff2f7a50f1ee842ac70d` | Apache-2.0 | `fastmcp_slim/fastmcp/server/middleware/{authorization,response_limiting,rate_limiting,logging,tool_injection}.py`, `server/auth/ssrf.py`, `server/transforms/namespace.py`, `server/server.py` (`get_tool`), `client/client.py` |
| invariantlabs-ai/mcp-scan (agent_scan rewrite) | `a83ccab7ae93a277c9460d0cb06b70d94d49e88e` | Apache-2.0 (LICENSE head + pyproject verified) | `src/agent_scan/{inspect,direct_scanner,pipelines,guard,consent,redact}.py`, `models/` |

**Method deviation (evidence-driven):** the brief said clone to /tmp. /tmp is a 512 MB tmpfs shared with concurrent lanes; it filled to 100% mid-pass (other lanes' clones). python-sdk, registry, and mcp-gateway were cloned to /tmp and deleted after harvest. fastmcp and mcp-scan were cloned to the lane scratch dir (`lanes/mcp-execution/.scratch/`, since removed) after /tmp became unusable. No third-party code is retained anywhere. The TypeScript SDK was deliberately skipped: SDK v2 Python covers the protocol mechanisms and the TS SDK would duplicate, not add.

## The six-link chain: what the ecosystem actually does

Chain: ACTION INTENT -> AUTHORIZATION -> TOOL RESOLUTION -> EXECUTION -> RECEIPT -> EFFECT VERIFICATION. MCP remains an adapter in every surveyed implementation: the protocol deliberately refuses to decide authorization, and every serious implementation keeps the authorization decision outside the tool layer.

### 1. ACTION INTENT

The ecosystem's intent layer is thin: a `tools/call` with a name and arguments. Two mechanisms enrich it without deciding anything:

- **M07 — Elicitation with bounded input-required rounds** (python-sdk): a server can pause a call with `InputRequiredResult`; the client dispatches to sampling/elicitation/roots callbacks and retries up to `input_required_max_rounds`. `request_state` can persist across restarts (server TTL/binding permitting). Elicitation outcomes are typed: accept / decline / cancel / URL-mode. This is the human-in-the-loop hook for destructive steps.
- **M25 — Elicitation-gated OAuth browser flow** (mcp-gateway): the gateway asks the user via elicitation whether to open a browser for OAuth; clients without elicitation capability fail closed.
- **M02 — ToolAnnotations as untrusted hints** (SDK spec types): `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`, `title` ride on `Tool`. They inform UX and heuristics only. The spec text is explicit: hints are not guaranteed faithful, and clients must never make tool-use decisions from annotations of untrusted servers.

### 2. AUTHORIZATION

The protocol itself has no per-tool authorization. Authorization is added at the edges, and in every case the tool layer enforces a decision made elsewhere:

- **M03 — Bearer edge: expiry + resource binding + per-route scopes** (python-sdk): `BearerAuthMiddleware` rejects expired tokens and tokens whose `resource` does not URL-match `resource_server_url` (audience binding); `RequireAuthMiddleware` enforces per-route `required_scopes` with 401 `invalid_token` / 403 `insufficient_scope`. Tokens are redacted in logs. Nuance (falsification-adjacent): `TokenVerifier` is a protocol and audience/issuer enforcement is explicitly "up to the verifier"; the default `ProviderTokenVerifier` only loads the token. Default deployments do not cryptographically verify audience unless the operator implements it.
- **M26 — FastMCP AuthMiddleware** (strongest per-tool authz found): callable host-supplied checks; `on_list_tools` filters unauthorized tools from discovery; `on_call_tool` re-resolves and re-checks before execution (TOCTOU protection); ambiguous "not found or not authorized" errors; fail-closed on missing context; scope-shortfall chaining across sibling middleware; STDIO explicitly skips auth (documented trust boundary: local process is trusted).
- **M20 — Gateway policy engine** (docker/mcp-gateway): external `PolicyClient.Evaluate/EvaluateBatch` over `{catalog, workingSet, server, tool, action, target}` with `Decision{Allowed, Reason, Error}` and `SubmitAudit`. Note the fail-open default: `NoopClient` always allows; it must be consciously replaced.
- **M23 — Startup tool allowlist** (docker/mcp-gateway): `--tools` filters the merged catalog; unlisted tools are unreachable, not just hidden.
- **M35 — REJECT: annotation-trusting auto-execution.** Any design that lets self-attested `ToolAnnotations` grant execution authority violates the chain (tool layer deciding authorization from attacker-controlled metadata). The spec prohibits it; no surveyed implementation does it. Recorded as REJECT with the prohibition as source.

**Chain verdict for this link:** authorization decisions live in the host (callable checks), an external policy service, or the transport edge. The tool layer never decides. Chain preserved.

### 3. TOOL RESOLUTION

- **M11 — Registry version immutability**: publishing a duplicate `(name, version)` is rejected (`ErrInvalidVersion`). A resolved ref always denotes the same metadata.
- **M12 — Exact version pinning**: server.json schema rejects version ranges and `"latest"` for packages; server versions should be semver.
- **M13 — Multi-method namespace authentication** (registry publisher): DNS TXT with ed25519 challenge signing, GitHub OIDC, GitHub device flow, Azure KeyVault / Google KMS key custody. No publish without proof of namespace control.
- **M14 — Package ownership verification + restricted base URLs**: publishers prove they control the referenced artifact (e.g., `mcp-name` tag in the PyPI README); only allowlisted public registries accepted.
- **M01 — SDK era negotiation** (denylist fallback): `server/discover` probe at the newest modern version; anything that is not positive evidence of a modern peer falls back to the legacy `initialize` handshake; `-32022` with a disjoint modern-only list raises; transport errors propagate and are never treated as era verdicts ("an outage or in-process bug is never an era verdict").
- **M16 — Gateway tool namespacing**: merged catalogs prefix tools as `server__tool`, making cross-server shadowing impossible by construction.
- **M27 — FastMCP versioned tool resolution**: `get_tool(name, VersionSpec{eq|gte|lt})`; clients request versions via `_meta`; disabled-highest falls back to next-highest enabled (documented semantic surprise to decide on explicitly).
- **M21 — Cosign/sigstore image verification** (docker/mcp-gateway): server container images verified against Sigstore signatures with Docker's embedded public key.
- **M09 — `tools/list_changed` invalidation** (python-sdk): servers notify on catalog changes; clients invalidate cached listings. No poll fallback in the SDK: a lost notification leaves a staleness window until reconnect.
- **M33 — Static tool-description scanning** (mcp-scan/agent_scan): pre-deployment scan of installed server configs and live tool definitions for poisoning, injection, cross-origin escalation, toxic flows; partially API-backed, `--local-only` available.

### 4. EXECUTION

- **M04 — Cancel-on-abandon** (python-sdk): abandoning a request (timeout or caller cancellation) sends `notifications/cancelled` unless the protocol forbids it (`initialize`). Advisory: the server may still complete the work.
- **M06 / M32 — Layered timeouts**: per-call read timeouts, init-handshake timeout, disconnect timeout (client); session idle timeout and request read timeout (server). `0` disables explicitly. Gap: no server-side bound on tool *handler execution* time was found in SDK v2; the gateway has no per-call timeout either.
- **M05 — StreamableHTTP reconnect with Last-Event-ID resume** (python-sdk): server-provided retry interval or 1000 ms default; `MAX_RECONNECTION_ATTEMPTS=2`; then the error surfaces. No server-side dedup: non-idempotent tools can double-execute.
- **M10 — Directional progress discipline**: since 2026-07-28, progress is server-to-client only; client-to-server progress is deprecated.
- **M17 — Gateway composable middleware chain**: telemetry always-on; custom before/after/around interceptors; built-in order fixed so secret-blocking always precedes diagnostic logging.
- **M24 — Per-server network isolation** (docker/mcp-gateway): `disableNetwork` / `allowHosts` per catalog entry. DNS-based allowlists remain rebinding-sensitive (see M29 for the stronger pattern).
- **M30 — Token-bucket rate limiting** (FastMCP): per-call `consume()`; `-32000` on exhaustion; in-process only.

### 5. RECEIPT

Receipts are the weakest link ecosystem-wide. Everything found is diagnostic, not durable:

- **M19 — Gateway call logging**: tool name + argument summary + duration as log lines. Lossy, no correlation IDs, no durability. Negative pattern: this is what a receipt must not be.
- **M31 — FastMCP structured logging middleware**: `request_start`/`request_complete` structured events with payload controls (`include_payloads`, `max_payload_length`, token estimation, serializer fallback). The emission discipline to copy; durability still missing.
- **M08 — ResultClaim version-gated extensions** (python-sdk): host-registered extra result shapes on `tools/call` with construction-time guards (cannot shadow core vocabulary, modern-era only). The safe-extension pattern for typed receipts.
- **M18 — BlockSecrets scans responses too** (docker/mcp-gateway): secrets detected in tool results block the response from traversing the boundary.
- **M28 — Response size limiting** (FastMCP): `ResponseLimitingMiddleware(max_size=...)` truncates to a single `TextContent`. Bounds the result-DoS channel; truncation should be typed, not silent.
- **M34 — Secret redaction in consent display** (mcp-scan): env/headers/URL-query rendered as `KEY=***`; `detect_secrets` heuristics for the rest. Approval UX that cannot leak.

CRX note: CRX already reifies worker results as canonical events in PostgreSQL. That is strictly stronger than anything in this survey. Do not regress to log-line receipts.

### 6. EFFECT VERIFICATION

**Nothing found.** No surveyed runtime, gateway, registry, or scanner verifies that a tool's claimed result corresponds to world state after execution. Tool results are self-reported by the server and trusted at face value (modulo size/secrets). This is a genuine ecosystem gap and a CRX opportunity: receipt (what the tool said) vs. effect verification (what changed) should be separate links, and today only the first exists, weakly.

## Cross-cutting findings

**Security model.** The ecosystem converges on: authenticate at the transport edge (OAuth 2.1, RFC 8707-style resource binding), authorize per tool outside the tool layer (host checks / external policy), treat all server-supplied metadata as untrusted input (annotations, descriptions, `_meta`), contain execution (network isolation, secret scanning both directions, SSRF-safe fetching with DNS pinning), and sign artifacts (Sigstore). The sharpest single idea is FastMCP's AuthMiddleware: filter at discovery, re-check at execution, fail closed, stay ambiguous.

**Version drift.** Four independent mechanisms attack it from different layers: era negotiation (wire), registry immutability + exact pinning (distribution), versioned tool resolution (runtime), `list_changed` invalidation (cache). None of them covers semantic drift of a tool's behavior under a fixed version; only mcp-scan-style description scanning gestures at that, statically.

**Failure models.** Typed and bounded almost everywhere: `-32022` disjoint, 401 vs 403, `AuthorizationError` vs ambiguous not-found, `InputRequiredRoundsExceededError`, `-32000` rate-limit, bounded reconnects, bounded rounds, cancel notifications. The notable untyped hole: server-side tool handler execution has no timeout in SDK v2, and cancellation is advisory end-to-end.

**Prompt-injection defenses (surveyed):** mcp-scan static description analysis (M33); BlockSecrets both directions (M18); annotations-must-not-decide rule (M02/M35); namespace isolation against cross-server shadowing (M16); ambiguous-error discipline against tool-existence oracles (M26). No runtime output-grounding or result-attestation anywhere.

## Falsified claims

1. **"mcp-scan pins tool definitions (hashing) to detect rug-pull drift."** Not in source at `a83ccab`. No tool-definition hashing exists in `src/agent_scan` (no hashlib/sha256 usage for tool fingerprints). Third-party comparisons describe it; the inspected rewrite does not contain it. It may live in the Snyk API or older versions; unverified either way.
2. **"mcp-scan proxy mode monitors connections in real time."** `cli.py` at this commit has no proxy subcommand; `guard.py` now installs hooks into client configs (Claude/Cursor/Codex/Copilot). The old proxy mode is gone from the inspected source.
3. **"The MCP SDK enforces OAuth audience checks by default."** Falsified as a default: `TokenVerifier` is a protocol; audience/issuer enforcement is explicitly "up to the verifier" (`provider.py:124-135`); the bundled `ProviderTokenVerifier` only loads the token. Resource binding exists in the middleware but depends on the operator's verifier doing its job.
4. **"FastMCP AuthMiddleware leaves stdio unauthorized by oversight."** Falsified as oversight: the skip is explicit and documented (local stdio process = trusted boundary).
5. **"Registry `_meta` is free-form publisher metadata."** Falsified: only `io.modelcontextprotocol.registry/publisher-provided` is preserved, capped at 4 KB; all other keys are silently dropped at publish.

## Proven gaps (ecosystem) mapped to CRX

| Gap | Evidence | CRX implication |
|---|---|---|
| No idempotency keys anywhere | Grep across SDK v2: "idempot" hits are code-level only (close/unsubscribe) | CRX MissionRuntime idempotent deterministic IDs are ahead; keep and extend to tool calls |
| No per-tool authz in the protocol | Auth lives in frameworks/gateways, never the wire | CRX ToolAuthority must be built (M26/M20 are the patterns), not adopted |
| No durable receipt journal | Diagnostic logs only (M19/M31) | CRX's PostgreSQL canonical event journal is the stronger design; tool calls should reify as canonical events |
| No effect verification | Zero implementations found | CRX opportunity: separate RECEIPT from EFFECT VERIFICATION links |
| No server-side execution timeout | Only read/idle timeouts (M06) | CRX EXECUTION link needs explicit TIMED_OUT as a terminal state |
| Server disappearance | 2 reconnect attempts then surface (M05); no gateway eviction | CRX needs typed UNKNOWN + dead-server quarantine |
| Response bounds | Only FastMCP limits (M28) | CRX receipts need enforced max size with typed TRUNCATION |

## Harvest summary

36 rows in `mechanisms.jsonl`: 10 REUSE, 16 ADAPT, 7 PATTERN, 1 WATCH, 2 REJECT, plus 5 falsified claims recorded above. Highest-value single items for CRX's proven gaps: **M26** (per-tool authz: filter at discovery, re-check at execution), **M11+M12** (immutable, exactly-pinned tool refs), **M18** (bidirectional secret blocking), **M04+M06** (typed cancel/timeout lifecycle for the missing CRX tool-call states), **M29** (SSRF-safe fetching). M35 and M36 are REJECT-class anti-patterns (annotation-trusting authorization; generic blind tool-call retry).

## Chain integrity verdict

Across all five sources, the AUTHORIZATION decision is made by the host (callable checks), an external policy service, or the transport edge, and enforced by (never originated in) the tool layer. The one candidate for tool-layer authority (self-attested annotations) is prohibited by the spec itself. **The ACTION INTENT -> AUTHORIZATION -> TOOL RESOLUTION -> EXECUTION -> RECEIPT -> EFFECT VERIFICATION chain is preserved in every harvested mechanism; M35 records the single rejected anti-pattern.** MCP stays an adapter.
