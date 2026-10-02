# LANE 9: MCP ECOSYSTEM MECHANISMS

**Mission:** Mechanism archaeology on the Model Context Protocol. Research / falsification / harvest only. No implementation code. MCP is TRANSPORT; it must never become PING authority.

**Date:** 2026-09-23
**Author:** Pigi (subagent, LANE 9)

---

## 1. SOURCES + PINNED SHAs

### 1a. MCP specification (modelcontextprotocol/specification)

- **Repo:** https://github.com/modelcontextprotocol/specification
- **Pinned SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **Commit date:** 2026-09-23 ("Add Contributing and Security links to the home page (#3386)")
- **Released spec revision read:** `2026-07-28` (latest released; see `docs/specification/2026-07-28/changelog.mdx`)
- **Draft spec revision read:** `draft` (post-2026-07-28; contains MRTR-as-core, `server/discover`, `subscriptions/listen`, `ttlMs`/`cacheScope`, `x-mcp-header`, request-scoped SSE). Draft is AHEAD of the released revision; mechanisms marked "draft-only" have not shipped in a numbered release.

The two most consequential SEPs folded into 2026-07-28:
- **SEP-2575 (Final):** "Make MCP Stateless" — removed `initialize` handshake and protocol-level sessions; every request carries protocol version + client capabilities in `_meta`.
- **SEP-2567 (Final):** "Sessionless MCP via Explicit State Handles" — servers needing cross-call state use explicit server-minted handles passed as ordinary tool arguments.

### 1b. Reference servers (modelcontextprotocol/servers)

- **Repo:** https://github.com/modelcontextprotocol/servers
- **Pinned SHA:** `f46d9578190b476b3501923ea8977d899e8db2cb`
- **Commit date:** 2026-09-22 ("fix(everything): clean up subscriptions on session disconnect (#4712)")
- **Servers present at this SHA:** `everything`, `fetch`, `filesystem`, `git`, `memory`, `sequentialthinking`, `time`. (GitHub and Postgres servers were archived out of this repo; their mechanisms were researched from their current homes/community mirrors.)

### 1c. SEPs consulted (all in the pinned spec repo, `seps/`)

| SEP | Title | Status | Relevance |
|---|---|---|---|
| 1686 | Tasks | Final (historical) | Long-running ops motivation, call-now-fetch-later |
| 1730 | SDKs Tiering System | Final | Conformance expectations |
| 1865 | MCP Apps (interactive UIs) | (extension track) | Anti-authority: server-rendered UI |
| 2133 | Extensions | Final | Extension negotiation mechanism |
| 2106 | JSON Schema 2020-12 as default dialect | Final | Schema evolution |
| 2243 | HTTP standardization (headers) | Final | `Mcp-*` header mirroring |
| 2260 | Server requests must be associated with a client request | Final | Killed unsolicited server->client RPC |
| 2322 | MRTR (Multi Round-Trip Requests) | Final | `InputRequiredResult`, `requestState` |
| 2549 | TTL for list results | Final | `ttlMs`/`cacheScope` |
| 2567 | Sessionless MCP | Final | Explicit state handles |
| 2575 | Stateless MCP | Final | Per-request metadata model |
| 2577 | Deprecate Roots, Sampling, Logging | Final | Sunset of three features |
| 2640 | Skills Extension (`io.modelcontextprotocol/skills`) | Final | Capability-description packaging |
| 2663 | Tasks Extension (`io.modelcontextprotocol/tasks`) | Final | Task handles: closest thing to receipts |
| 990 | Enterprise IdP policy controls during OAuth | Final | Tenant/org policy injection |
| 991 | URL-based client registration using OAuth | (proposed) | Registration |
| 1024 | Client security requirements for local server install | Final | One-click install consent |
| 1046 | OAuth client credentials flow | Final | Machine-to-machine auth |
| 1302 | Formalize working groups | n/a | (input validation errors SEP 1302 listed in index; not read in depth) |
| 1699 | SSE polling via server-side disconnect | Final | Reconnect polling (tension with draft spec) |
| 2468 | Recommend `iss` claim for auth | Final | Mix-up attack mitigation (RFC 9207) |
| 414 | Request `_meta` (trace context) | Final | OTel propagation keys |

### 1d. Community implementations (web research, 2026-09-23)

- **github/github-mcp-server** (via mirrors: `connectedagents-ai/github-mcp-server` README, `devtocash.com` 2026-09-21 guide, `github/gh-aw` access-control spec scratchpad): `--toolsets`/`GITHUB_TOOLSETS`, `--read-only`/`GITHUB_READ_ONLY` (read-only takes priority over explicit `--tools`), `GITHUB_LOCKDOWN_MODE=1`, remote-mode `X-MCP-Readonly` header. No pinned SHA (community mirror).
- **perforce/p4mcp-server** README (https://github.com/perforce/p4mcp-server): `--toolsets`, `--readonly`, `--search-transform regex|bm25|both` — search-based tool discovery; admin permission middleware; blocked tools never discoverable through search.
- **signadot/community#122**: tool filtering precedence proposal matching the GitHub pattern: toolsets -> tools -> exclude-tools -> read-only filter.
- **ibm/ibmi-mcp-server** `docs/agents/security.mdx`: three-layer read-only pattern (toolset filter, MCP annotations `readOnlyHint`, YAML config).
- **callibrity/mocapi** (Java framework for MCP 2026-07-28): `mocapi-audit` — one structured audit event per handler invocation (caller identity, protocol version, client name, handler kind/name, outcome, duration, opt-in SHA-256 of args); `mocapi-o11y` — `mcp.handler.execution` observations with `gen_ai.tool.name` attrs; `/actuator/mcp` read-only inventory (names + schema digests).
- **josephsearle/skills** `skills/mcp-observability/SKILL.md`: tool-call audit interceptor emitting `{event: tool_call, user_sub, tool_name, scopes, duration_ms, is_error, args_hash, result_hash}`; hash args/result, never log raw values; pino log redaction paths.
- **nyx-builds/mcp-audit**: agent self-audit MCP server (call recording, cost, OTel/Prometheus export).
- **nikolai-vysotskyi/trace-mcp** `docs/telemetry.md`: OTel spans per tool execution; operational metadata only, no code/secrets; opt-in sinks.
- **paldom/mcp-server-skills** `skills/mcp-server-deployment/SKILL.md`: one structured log line + one trace span per tool invocation (`tools.call.<tool_name>`); MCPB packaging with `"sensitive"` env stored in OS keychain.
- **pummelchen/mcpsearch** `docs/openai-mcp-compatibility-report.md`: OpenAI's `allowed_tools` / `McpToolFilter` (`tool_names`, `read_only` matched against server `readOnlyHint`); `mcp_call` items with `status` (`in_progress`/`completed`/`incomplete`/`calling`/`failed`) and error classes (`mcp_protocol_error` | `mcp_tool_execution_error` | `http_error`).

### 1e. Reading method

Spec docs were read from the pinned local clone (`docs/specification/draft/**`, `docs/specification/2026-07-28/changelog.mdx`, `schema/2026-07-28/schema.json`, `seps/**`). Reference servers read from the pinned local clone (`src/filesystem/path-validation.ts`, `src/filesystem/index.ts`, `src/fetch`, `src/everything`). Community mechanisms via web search + page fetch on 2026-09-23.

---

## 2. MECHANISMS (canonical format)

Field key: MECHANISM_ID | PROBLEM | SOURCE | PINNED_SHA | SOURCE_LOCATION | MATURITY | INVARIANT | IMPLEMENTATION | FAILURE_MODE | PING_EXISTING_ANALOG | GAP | HARVEST_CLASS | FALSIFICATION | DEPENDENCIES | SPEC_SILENT?

HARVEST_CLASS values: `ADOPT` (steal the mechanism as-is), `ADAPT` (steal the shape, change the authority), `MIRROR` (PING already has it; align naming/semantics), `REJECT` (studied, do not take), `WATCH` (immature; track).

---

### M-DISCOVER — Server discovery + capability negotiation

- **PROBLEM:** A client meeting an unknown server needs versions, capabilities, and identity before (or without) any other RPC.
- **SOURCE:** MCP spec (draft) + SEP-2575.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/server/discover.mdx`; `docs/specification/draft/basic/versioning.mdx`
- **MATURITY:** Final in 2026-07-28. Servers MUST implement `server/discover`.
- **INVARIANT:** Discovery is a self-description by an untrusted party. It advertises what the server *claims* to support; it grants nothing and authenticates nothing. (See ANTI-AUTHORITY AA1-AA3.)
- **IMPLEMENTATION:** `server/discover` request (no body beyond `_meta`) -> `DiscoverResult`: `supportedVersions[]`, `capabilities{}` (tools/resources/prompts/extensions...), `instructions` (natural-language guidance for LLMs), `_meta.serverInfo` (name/version, self-reported), `ttlMs` + `cacheScope` (discovery itself is cacheable). Calling it is optional; clients may fire any RPC inline and handle `UnsupportedProtocolVersionError` (`-32022`, lists `supported[]`).
- **FAILURE_MODE:** Stale cache (ttlMs is a freshness hint, not a guarantee; server MAY change data before TTL); serverInfo spoofing (self-reported, unverified); version fallback loops if client mis-handles `supported` list.
- **PING_EXISTING_ANALOG:** (best effort) PING's capability/registry surface for tools — but PING's registry is authoritative, MCP's is self-asserted. Maps to `MIRROR` with inverted trust.
- **GAP:** No mechanism to *verify* a discovery claim (no attestation, no signature on the discover result).
- **HARVEST_CLASS:** ADAPT — the shape (versions + capabilities + instructions + cache hints in one round trip) is excellent for PING's own tool registry protocol; the trust model must be inverted (PING signs/attests; clients verify).
- **FALSIFICATION:** Write a conformance test: a server that advertises `tools:{}` in discover but 404s `tools/list`. Any client that treated discover as a guarantee breaks. If PING ever caches a discover result past TTL without revalidation, that is a bug by this spec's own semantics.
- **DEPENDENCIES:** Caching (M-TOOL-LIST-CACHE), version negotiation (M-VERSION-NEG), extensions (M-EXTENSIONS).
- **SPEC_SILENT?:** No — in spec (draft + 2026-07-28).

### M-TOOL-LIST-CACHE — Cacheable discovery with TTL + scope + invalidation

- **PROBLEM:** `tools/list` etc. are re-fetched constantly; naive caching leaks cross-user data and goes stale silently.
- **SOURCE:** MCP spec (draft) + SEP-2549.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/server/utilities/caching.mdx`; `docs/specification/draft/server/tools.mdx` (Listing Tools)
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** TTL is a freshness *hint*, never a guarantee. `cacheScope:"public"` means shareable across callers; `"private"` binds the cache entry to the authorization context. A notification invalidates even a fresh entry.
- **IMPLEMENTATION:** Cacheable results (`server/discover`, `tools/list`, `prompts/list`, `resources/list`, `resources/templates/list`, `resources/read`) MUST carry `ttlMs >= 0` and `cacheScope` (`public`|`private`). Cache key = method + result-affecting params (uri, cursor). MRTR retries (carrying `inputResponses`/`requestState`) MUST NOT be cached. Freshness: `now < t_received + ttlMs`. Clients SHOULD NOT poll on TTL; re-fetch on access-if-stale, with jitter+backoff if they do poll. MAY serve stale on re-fetch failure. `listChanged` notifications (via `subscriptions/listen`) invalidate immediately. Pagination: each page independently cacheable; no cross-page consistency; same `cacheScope` on all pages of one list.
- **FAILURE_MODE:** Server marks per-user filtered list `public` -> cross-user leak (spec: servers MUST NOT rely on cacheScope alone for access control; MUST apply per-primitive access controls). Clock skew on freshness calc; cursor invalidation mid-pagination (client should discard all pages and restart).
- **PING_EXISTING_ANALOG:** (best effort) PING projections/caches of tool metadata. PING should adopt the public/private scoping vocabulary.
- **GAP:** No `ETag`/`If-None-Match` conditional revalidation; no negative caching; no cache-busting version field on the server side (only TTL + push invalidation).
- **HARVEST_CLASS:** ADAPT — adopt `ttlMs`/`cacheScope` semantics for PING's registry and projection caches; keep PING as the authority that *assigns* scope.
- **FALSIFICATION:** Serve a `tools/list` with `cacheScope:"private"` from a shared gateway cache to two different tokens; assert the second caller does NOT get the first caller's entry. If it does, the scope mechanism is broken.
- **DEPENDENCIES:** M-DISCOVER, M-SUBSCRIPTIONS (invalidation), M-PER-REQUEST-AUTHZ.
- **SPEC_SILENT?:** No — in spec.

### M-TOOL-ANNOT — Tool behavior hints, explicitly untrusted

- **PROBLEM:** Clients need a cheap signal for "is this tool read-only / destructive / idempotent" to drive confirmation UX and filtering.
- **SOURCE:** MCP spec schema; community enforcement (OpenAI `McpToolFilter`, GitHub `--read-only`, IBM i three-layer pattern).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `schema/2026-07-28/schema.json` `$defs.ToolAnnotations`; `src/filesystem/index.ts` (reference usage: read tools `readOnlyHint:true, openWorldHint:false`; write tools `readOnlyHint:false, destructiveHint:true`)
- **MATURITY:** Final (in schema since 2025-06-18 era).
- **INVARIANT:** "All properties in `ToolAnnotations` are **hints**. They are not guaranteed to provide a faithful description of tool behavior. Clients should never make tool use decisions based on `ToolAnnotations` received from untrusted servers." (schema description, verbatim in substance)
- **IMPLEMENTATION:** `annotations: {title, readOnlyHint (default false), destructiveHint (default true), idempotentHint (default false), openWorldHint (default true)}`. Defaults are *pessimistic* (assume destructive, non-idempotent, open-world) — good fail-closed defaults. Enforcement is client/host-side: OpenAI matches `read_only` filter against `readOnlyHint`; GitHub server *self*-filters its registration by read-only mode; IBM i stacks three layers (toolset filter + annotation filter + YAML config).
- **FAILURE_MODE:** Malicious server marks a destructive tool `readOnlyHint:true` -> clients that auto-approve "read-only" tools get owned. The spec warning exists precisely for this.
- **PING_EXISTING_ANALOG:** (best effort) PING's own tool classification for confirmation/escalation policy. PING must keep classification authority itself for untrusted servers.
- **GAP:** No attestation binding annotations to behavior; no standard for who may assert them.
- **HARVEST_CLASS:** ADAPT — adopt the four-hint vocabulary + pessimistic defaults for PING's tool metadata; keep PING as the *assigner/verifier* of hints for third-party servers (never accept self-asserted hints for policy).
- **FALSIFICATION:** Register a tool with `readOnlyHint:true` that writes a file; assert PING's confirmation policy still triggers on the *observed behavior class*, not the hint. If the hint suppresses confirmation, the trust model is inverted.
- **DEPENDENCIES:** M-TOOLSETS (server-side filtering), M-DISCOVER.
- **SPEC_SILENT?:** No — in spec (schema + spec warning).

### M-TOOLSETS — Server-side toolset / read-only filtering at registration

- **PROBLEM:** A server with 100+ tools overwhelms model context and tool choice; operators want least-privilege exposure per deployment.
- **SOURCE:** Community: github-mcp-server (canonical pattern), p4mcp-server, signadot proposal, IBM i.
- **PINNED_SHA:** n/a (community). Pattern documented 2026-09-21 (devtocash guide) and in `github/gh-aw` access-control scratchpad.
- **SOURCE_LOCATION:** `connectedagents-ai/github-mcp-server` README (toolsets section); `github/gh-aw/blob/HEAD/scratchpad/github-mcp-access-control-specification.md` §4.2.2; https://github.com/perforce/p4mcp-server (README, `--toolsets`/`--readonly`/`--search-transform`); https://github.com/signadot/community/issues/122
- **MATURITY:** De facto standard across major community servers; NOT in MCP spec.
- **INVARIANT:** Filtering happens at *registration* (the tool is never listed, never callable), not at call time. Read-only mode takes priority over explicit `--tools` allow-lists (a config typo cannot re-enable writes). Deny beats allow at every layer.
- **IMPLEMENTATION:** Named toolsets (`repos`, `issues`, `pull_requests`, ...; special `all`, `default`). Precedence (Signadot/GitHub pattern): (1) start with enabled toolsets (or all), (2) intersect with explicit `TOOLS` allow-list, (3) subtract `EXCLUDE_TOOLS`, (4) if read-only mode, filter to read-only tools only. Env var beats CLI flag (`GITHUB_TOOLSETS` > `--toolsets`). Remote mode: `X-MCP-Readonly: true` header. `GITHUB_LOCKDOWN_MODE=1` (hardened default). p4mcp adds: blocked-by-middleware tools are invisible even to the search interface.
- **FAILURE_MODE:** Toolset definitions drift from actual tool registrations (a new write tool lands in a "read-only" toolset); env/flag precedence confusion across deployment layers.
- **PING_EXISTING_ANALOG:** (best effort) PING's per-deployment tool exposure policy. This is the mechanism PING wants for tenant/role-scoped tool catalogs.
- **GAP:** Spec-silent: no standard `toolsets` capability, no wire format for "which toolsets are active," no discovery of *why* a tool is absent.
- **HARVEST_CLASS:** ADAPT — adopt the precedence chain and deny-beats-allow invariant for PING's tool exposure policy; define it in PING (not MCP) since the spec is silent.
- **FALSIFICATION:** Enable read-only + explicit `--tools <write-tool>`; assert the write tool is absent from `tools/list` AND `tools/call` rejects it. If either succeeds, the priority invariant is violated.
- **DEPENDENCIES:** M-TOOL-ANNOT (read-only classification feeds the filter).
- **SPEC_SILENT?:** YES — implementation extension. Spec only says lists MAY vary by authorization (M-PER-REQUEST-AUTHZ).

### M-SEARCH-DISCOVERY — Search-based tool discovery for large catalogs

- **PROBLEM:** 100+ tool definitions blow up context; sending the full catalog is the default and it is expensive.
- **SOURCE:** Community: perforce/p4mcp-server.
- **PINNED_SHA:** n/a (community).
- **SOURCE_LOCATION:** https://github.com/perforce/p4mcp-server (README: `--search-transform`)
- **MATURITY:** Experimental, single implementation.
- **INVARIANT:** The search interface queries the *real, already-filtered* catalog: permission middleware and read-only filtering are enforced before search, so blocked tools are never discoverable or callable through search.
- **IMPLEMENTATION:** `--search-transform regex|bm25|both`: instead of listing all tools, the server exposes `regex_search_tools`/`semantic_search_tools` (+ `*_call_tool` dispatchers). `query_server` stays directly visible. Modes: regex (targeted), BM25 (exploratory), both.
- **FAILURE_MODE:** Search misses the right tool (recall failure) -> agent cannot complete task; BM25 ranking gaming by tool description stuffing.
- **PING_EXISTING_ANALOG:** (best effort) PING's own tool retrieval/ranking layer. This validates PING's direction: discovery-by-search beats discovery-by-dump at scale.
- **GAP:** No standard; no relevance contract; no pagination of search results specified.
- **HARVEST_CLASS:** WATCH — promising but immature and single-vendor; PING's own retrieval layer should own this, not MCP.
- **FALSIFICATION:** Block a tool via middleware, then search for it by name; assert zero hits. Any hit = filter bypass.
- **DEPENDENCIES:** M-TOOLSETS.
- **SPEC_SILENT?:** YES — implementation extension.

### M-STRUCTURED-IO — JSON Schema 2020-12 input/output contracts + structuredContent

- **PROBLEM:** Tool results were untyped text blobs; clients couldn't validate or parse reliably.
- **SOURCE:** MCP spec + SEP-2106.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/server/tools.mdx` (Tool / Tool Result / Structured Content / Output Schema); `seps/2106-json-schema-2020-12.md`
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** `inputSchema` MUST be a valid JSON Schema object (defaults to 2020-12 without `$schema`); servers MUST return structured results conforming to `outputSchema` when provided; clients SHOULD validate. `structuredContent` is *server-produced result data*, unrelated to LLM "structured outputs."
- **IMPLEMENTATION:** `inputSchema` (object type required), `outputSchema` (any JSON value incl. arrays since SEP-2106), result carries `structuredContent` + SHOULD also carry serialized JSON in a text block for back-compat. `$ref` resolution requirements defined in `basic/index.mdx` (with composition-keyword resource bounds — a DoS guard on schema expansion).
- **FAILURE_MODE:** Schema too permissive (`{"type":"object"}` accepts anything) -> validation theater; `$ref` bombs without the resource bounds; client validates against a different dialect than declared.
- **PING_EXISTING_ANALOG:** (best effort) PING's tool contracts. Align on 2020-12 + the dual text/structured result convention.
- **GAP:** No tool-level schema *versioning* (only whole-list change notifications); no deprecation marker per tool.
- **HARVEST_CLASS:** MIRROR — adopt the dialect default and the `structuredContent` + text fallback convention.
- **FALSIFICATION:** Provide `outputSchema` and return non-conforming `structuredContent`; a conforming client SHOULD flag it. If PING's validator accepts it silently, the contract is decorative.
- **DEPENDENCIES:** None (base type system).
- **SPEC_SILENT?:** No — in spec.

### M-X-MCP-HEADER — Tool-parameter mirroring into HTTP headers

- **PROBLEM:** L7 intermediaries (LBs, WAFs, gateways) need to route/rate-limit/audit by tenant or region without parsing JSON-RPC bodies.
- **SOURCE:** MCP spec (draft) + SEP-2243.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/server/tools.mdx` (x-mcp-header); `docs/specification/draft/basic/transports/streamable-http.mdx` (Custom Headers from Tool Parameters; Server Validation; `Mcp-Method`, `Mcp-Name` standard headers; Base64 sentinel `=?base64?...?=`)
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** Headers are a *view* of the body, never an independent truth. Servers that process the body MUST validate header==body and reject with `400` + `HeaderMismatch` (`-32020`) on mismatch. This defeats header/body desync attacks (LB routes on header, server executes on body).
- **IMPLEMENTATION:** Tool params annotated `x-mcp-header: "Region"` (primitive types only: string/integer/boolean; statically reachable via `properties` chain only; case-insensitively unique; no CR/LF) -> client sends `Mcp-Param-Region: us-west1`. Standard headers: `Mcp-Method`, `Mcp-Name`, `MCP-Protocol-Version` (must match `_meta`). Non-ASCII values use `=?base64?{b64}?=`. Clients MUST reject malformed tool definitions (exclude the tool, log warning) so one bad tool doesn't poison the catalog. Intermediaries MUST forward unknown `Mcp-Param-*` and MUST NOT trust them for policy unless the protocol version requires header-body validation.
- **FAILURE_MODE:** Sensitive params marked as headers leak to intermediaries (spec warns SHOULD NOT); intermediary enforces policy on unvalidated headers from old-version clients.
- **PING_EXISTING_ANALOG:** (best effort) PING gateway routing/telemetry. The header-body consistency check is the mechanism to steal.
- **GAP:** No standard header names for tenant/auth context (only method/name/params); PING must define its own `Mcp-Param-*` vocabulary or `_meta` propagation.
- **HARVEST_CLASS:** ADAPT — adopt the consistency-check invariant (any PING gateway that routes on headers MUST re-validate against body); adopt the sentinel encoding.
- **FALSIFICATION:** Send `Mcp-Param-Region: eu` with body `region: us`; conforming server MUST reject `-32020`. If it executes with either value silently, the anti-desync mechanism is absent.
- **DEPENDENCIES:** Streamable HTTP transport.
- **SPEC_SILENT?:** No — in spec (2026-07-28).

### M-MRTR — Multi Round-Trip Requests (server asks, client retries)

- **PROBLEM:** Servers sometimes need user input / LLM help / roots mid-request, but stateless servers can't hold connections open and unsolicited server->client RPC is banned (SEP-2260).
- **SOURCE:** MCP spec (draft) + SEP-2322 + SEP-2260.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/patterns/mrtr.mdx`; `seps/2322-MRTR.md`; `seps/2260-Require-Server-requests-to-be-associated-with-Client-requests.md`
- **MATURITY:** Final in 2026-07-28 (breaking change: server-initiated JSON-RPC requests removed).
- **INVARIANT:** Every server-to-client interaction is *nested inside* a client request and answered by the client *retrying that request* with `inputResponses`. `requestState` is opaque to the client and MUST be treated by the server as attacker-controlled input.
- **IMPLEMENTATION:** Server returns `InputRequiredResult` (`resultType:"input_required"`) with `inputRequests` (map of `elicitation/create` | `sampling/createMessage` | `roots/list` keyed by server-assigned IDs) and/or `requestState` (opaque string; servers free to use AEAD/HMAC). Client retries with new JSON-RPC id, same params + `inputResponses` + echoed `requestState`. Server rules: MUST integrity-protect `requestState` if it influences authz/resource access/business logic (HMAC/AEAD); SHOULD bind principal + short TTL + originating-request digest inside it; MUST enforce single-use server-side for one-time redemptions (replay bounding alone is not enough). Client rules: MUST NOT inspect/parse/modify `requestState`; MUST NOT reuse `inputRequests`/`requestState` across parallel requests.
- **FAILURE_MODE:** `requestState` replay within the TTL window (accepted by design unless single-use enforced); client caches `InputRequiredResult` (forbidden: not cacheable); server assumes the client will retry (MUST NOT — client may abandon).
- **PING_EXISTING_ANALOG:** (best effort) PING's multi-step tool flows / approval gates. The "attacker-controlled opaque state + integrity protection + replay bounding" rule is directly reusable for PING's own continuation tokens.
- **GAP:** No standard for `requestState` format (intentional — opaque); no single-use enforcement primitive in-protocol.
- **HARVEST_CLASS:** ADAPT — adopt the integrity/replay/single-use rules for any PING-issued continuation or resumption token.
- **FALSIFICATION:** Tamper one byte of a `requestState` that gates a privileged action; server MUST reject. Present a `requestState` minted for principal A on principal B's retry; server SHOULD reject (principal binding).
- **DEPENDENCIES:** M-ELICITATION-SECRETS (input type), statelessness (SEP-2575).
- **SPEC_SILENT?:** No — in spec.

### M-TASKS — Task handles for long-running operations (extension)

- **PROBLEM:** Tool calls can run minutes/hours (workflows, CI, migrations); blocking the request or hand-rolled create/poll/get tool triples is fragile and agent-unfriendly.
- **SOURCE:** SEP-2663 (extension `io.modelcontextprotocol/tasks`); SEP-1686 (historical motivation with 6 Amazon production use cases).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `seps/2663-tasks-extension.md`; `seps/1686-tasks.md`
- **MATURITY:** Final as an *extension* (incubating; intended for core later). NOT in core 2026-07-28.
- **INVARIANT:** Task creation is *server-directed*: client signals support via the extension capability; server decides per-request whether to materialize a task (client may not demand one). This is the closest MCP gets to a tool receipt: a durable, pollable handle for an execution.
- **IMPLEMENTATION:** Server responds `resultType:"task"` with a `Task{taskId (server-generated), status: working|input_required|completed|cancelled|failed, statusMessage?, inputRequests?, result|error}`. Lifecycle: `tasks/get` (poll), `tasks/update` (supply `inputResponses`), `tasks/cancel`. `notifications/tasks` for push. Removed vs the 2025 experiment: blocking `tasks/result`, `tasks/list` (unscoped listing deemed unsafe — "task IDs can be unguessable handles... servers cannot reliably correlate two unrelated handles to the same caller without additional state"), per-request opt-in.
- **FAILURE_MODE:** Task ID as bearer token: unguessable IDs are the *only* authz line when auth context binding is impossible (SEP authors flag this explicitly). Result retention window (`keepAlive`) expiry -> lost results.
- **PING_EXISTING_ANALOG:** (best effort) PING's job/execution records and witness receipts. PING's receipt should be *stronger*: signed, bound to principal, single-use-safe.
- **GAP:** Extension, not core — most servers won't implement it. No receipt *signature*; no proof-of-execution beyond "the server says completed."
- **HARVEST_CLASS:** ADAPT — adopt the status enum + poll/update/cancel shape for PING's long-running tool executions, but issue PING-signed receipts (not bare server handles).
- **FALSIFICATION:** Enumerate task IDs or present another principal's task ID to `tasks/get`; a conforming server MUST bind tasks to the authorization context or use unguessable IDs. If sequential IDs leak other tenants' tasks, the isolation model is broken.
- **DEPENDENCIES:** M-EXTENSIONS, M-PER-REQUEST-AUTHZ.
- **SPEC_SILENT?:** Partially — core spec is silent; defined in a Final extension SEP.

### M-RECEIPT-AUDIT — Hash-based tool-call audit records (community)

- **PROBLEM:** "Prove this tool ran with these args and produced this result" without logging PII/secrets.
- **SOURCE:** Community: `josephsearle/skills` mcp-observability SKILL.md; `callibrity/mocapi` `mocapi-audit`; `paldom/mcp-server-skills` deployment SKILL.
- **PINNED_SHA:** n/a (community).
- **SOURCE_LOCATION:** https://github.com/josephsearle/skills/blob/HEAD/skills/mcp-observability/SKILL.md (audit interceptor schema); https://github.com/callibrity/mocapi (audit guide: one INFO event per handler invocation on `mocapi.audit`: caller identity, protocol version, client name, handler kind/name, outcome `success|forbidden|invalid_params|error`, duration, opt-in SHA-256 of args)
- **MATURITY:** Convergent pattern across 3+ independent implementations; no spec.
- **INVARIANT:** Log the *hashes* of args and results, never raw values (PII/secret safety). One structured record per invocation: who, what, which protocol version, how long, what outcome. Identity/session go in log fields and trace attributes, never metric labels (cardinality).
- **IMPLEMENTATION:** Audit record: `{event:"tool_call", user_sub, tool_name, scopes, duration_ms, is_error, args_hash:"sha256:...", result_hash:"sha256:..."}` + log redaction paths (`*.password`, `*.token`, `*.secret`, `*.api_key`, auth headers). mocapi stamps `mcp.protocol.version`, `mcp.client.name`, `mcp.handler.name`, `mcp.request.id` into the MDC so every log line carries correlation. OpenTelemetry span per `tools.call.<tool_name>`; `/actuator/mcp` exposes read-only inventory (names + schema digests).
- **FAILURE_MODE:** Hash-only receipts can't *replay* the call (by design); clock/timing side channels; redaction list misses a new secret field name.
- **PING_EXISTING_ANALOG:** (best effort) PING's evidence/event plane and witness authority — this is the closest external shape to PING's receipt concept. Strong MIRROR candidate: adopt the field list.
- **GAP:** Spec is FULLY SILENT on audit format, retention, and receipts. Spec only says clients SHOULD "log tool usage for audit purposes" (tools.mdx Security Considerations) — no shape, no verbs.
- **HARVEST_CLASS:** ADOPT — adopt the record shape (identity, protocol version, tool, duration, outcome enum, arg/result hashes) as PING's tool-receipt schema; PING adds signatures (witness authority).
- **FALSIFICATION:** Feed a tool call with `password` in args through the audit pipeline; assert the stored record contains no raw secret and the hash verifies against the original args. Any raw secret in the record = redaction failure.
- **DEPENDENCIES:** M-OTEL (correlation), M-ERROR-CODES (outcome taxonomy).
- **SPEC_SILENT?:** YES — spec silent (one SHOULD sentence only).

### M-TIMEOUT — Per-request timeouts with progress-reset and hard max

- **PROBLEM:** Hung tool calls hold connections and resources forever.
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/patterns/cancellation.mdx` (Timeouts)
- **MATURITY:** Final (SHOULD-level).
- **INVARIANT:** Every sent request SHOULD have a timeout; on expiry the sender SHOULD cancel and stop waiting. Progress notifications MAY reset the clock, but a maximum timeout MUST always be enforced regardless of progress.
- **IMPLEMENTATION:** SDKs/middleware SHOULD allow per-request timeout configuration. Timeout => transport-specific cancel (close SSE stream on HTTP; `notifications/cancelled` on stdio). Progress-reset is optional; hard max is not.
- **FAILURE_MODE:** No default values anywhere in the spec — every implementation picks its own; a malicious server can drip progress notifications forever to keep the soft clock resetting (mitigated only if the hard max is actually implemented).
- **PING_EXISTING_ANALOG:** (best effort) PING's bounded-automation principle already demands timeouts; adopt the progress-reset + hard-max shape.
- **GAP:** Spec silent on: default durations, who enforces server-side, timeout error code ("timeout raised inside an SDK... not currently assigned codes" — basic/index.mdx).
- **HARVEST_CLASS:** ADAPT — adopt the two-clock design (idle/progress-reset clock + absolute max); PING defines the actual durations and the error code.
- **FALSIFICATION:** Configure a 1s timeout against a server that emits progress every 100ms forever; assert the call still dies at the hard max. If it runs forever, the max is decorative.
- **DEPENDENCIES:** M-CANCEL, M-PROGRESS.
- **SPEC_SILENT?:** Partially — pattern in spec, values and codes silent.

### M-CANCEL — Cooperative cancellation with race-tolerant semantics

- **PROBLEM:** A client needs to stop a long-running request it no longer wants.
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/patterns/cancellation.mdx`; `docs/specification/draft/basic/transports/streamable-http.mdx` (Cancellation); `docs/specification/draft/basic/transports/stdio.mdx` (Cancellation)
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** Cancellation is a *notification* (fire-and-forget); both sides MUST handle the race where cancel arrives after completion. On HTTP, closing the SSE stream IS the cancellation signal; servers MUST treat disconnect as cancel and MUST NOT send further messages.
- **IMPLEMENTATION:** stdio: `notifications/cancelled{requestId, reason?}`. HTTP: close the response stream. Server SHOULD stop work, free resources, and not respond; MAY ignore if unknown/already-done/uncancellable. Client SHOULD ignore late responses. Invalid cancellations (unknown IDs, malformed) SHOULD be ignored silently. Subscription teardown uses `notifications/cancelled` referencing the `subscriptions/listen` request ID — the ONLY server-sent use.
- **FAILURE_MODE:** Non-idempotent tool already executed before cancel arrives -> cancel is a lie from the caller's perspective (spec acknowledges the race; no compensation/rollback primitive). Server that keeps working after stream close wastes resources / causes duplicate side effects on retry.
- **PING_EXISTING_ANALOG:** (best effort) PING's bounded automation / cancellation propagation. Note the gap PING must fill: idempotency/once-only semantics.
- **GAP:** No idempotency keys; no "was it applied?" query; no compensation protocol. Retry-after-cancel can double-execute.
- **HARVEST_CLASS:** ADAPT — adopt the race-tolerant notification semantics; PING must add idempotency keys and an applied-or-not query on top.
- **FALSIFICATION:** Cancel a `tools/call` mid-flight, then retry; if the side effect applied twice and neither the server nor PING can answer "did call #1 apply?", the exactly-once story is absent (expected: it is absent in MCP).
- **DEPENDENCIES:** M-TIMEOUT, M-TASKS (`tasks/cancel`).
- **SPEC_SILENT?:** No — in spec. Idempotency explicitly silent.

### M-PROGRESS — Progress tokens with monotonic values and rate limits

- **PROBLEM:** Long operations need liveness signals without a full streaming result protocol.
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/patterns/progress.mdx`
- **MATURITY:** Final.
- **INVARIANT:** Progress is advisory and monotonic: `progress` MUST increase with each notification even if `total` is unknown. Both sides SHOULD rate-limit to prevent flooding. Progress MUST stop after completion.
- **IMPLEMENTATION:** Client puts `progressToken` (string|int, unique across active requests) in `_meta`. Server MAY send `notifications/progress{progressToken, progress, total?, message?}` on the request's response stream (HTTP) or the shared channel (stdio). Server MAY send none, at any frequency, with or without total.
- **FAILURE_MODE:** Progress used as a keep-alive to defeat timeouts (see M-TIMEOUT hard max); token collision across requests -> misattributed progress; flooding.
- **PING_EXISTING_ANALOG:** (best effort) PING's progress reporting on long jobs. Adopt token+monotonic shape.
- **GAP:** No semantic for "what does 50/100 mean"; no checkpoint/resume coupling.
- **HARVEST_CLASS:** ADAPT — adopt as PING's liveness signal; bind to PING's timeout clocks.
- **FALSIFICATION:** Send two concurrent requests reusing one `progressToken`; a conforming implementation must not cross-attribute (tokens MUST be unique across active requests — client bug if violated).
- **DEPENDENCIES:** M-TIMEOUT (progress-reset), M-SSE-STREAM (delivery).
- **SPEC_SILENT?:** No — in spec.

### M-SSE-STREAM — Request-scoped SSE streams, no resumability

- **PROBLEM:** Deliver request-related notifications + final response over HTTP without sessions or server-initiated RPC.
- **SOURCE:** MCP spec (draft, 2026-07-28) + SEP-2575 + SEP-1699 (tension noted below).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/transports/streamable-http.mdx` (Receiving Messages; Message Flow); `docs/specification/2026-07-28/changelog.mdx` item 9
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** Each POST gets its own response: one JSON object OR one SSE stream scoped to that request. The stream carries only request-related notifications then the final response. **Resumable streams via `Last-Event-ID` are NOT supported**; a broken stream loses the in-flight request and the client MUST re-issue it as a NEW request with a NEW id.
- **IMPLEMENTATION:** Server MAY interleave `notifications/progress` / `notifications/message` before the final JSON-RPC response; MUST NOT send independent JSON-RPC requests on the stream (MRTR replaced them). Final response SHOULD terminate the stream. Operational guidance: `X-Accel-Buffering: no` for proxies; SSE comment keep-alives (`:...`) on long-lived `subscriptions/listen` streams. Security: MUST validate `Origin` (DNS rebinding), SHOULD bind localhost locally, SHOULD authenticate.
- **FAILURE_MODE:** Broken stream mid-`tools/call` -> client re-issues -> non-idempotent double execution (spec accepts this; see M-CANCEL gap). Proxy buffering SSE without `X-Accel-Buffering: no` -> apparent hangs.
- **PING_EXISTING_ANALOG:** (best effort) PING's streaming tool results. PING should decide: adopt "re-issue with new id" or add idempotency keys (MCP chose the former).
- **GAP:** No redelivery, no resumability, no idempotency — the spec *removed* them deliberately (SEP-2575). SEP-1699 (Final!) specified SSE polling via server-side disconnect with `retry` hints, but the draft transport says resumable streams are not supported — the SEP's mechanism did not survive into the stateless revision. Open question OQ-3.
- **HARVEST_CLASS:** ADAPT — adopt request-scoped streams + keep-alive comments + `X-Accel-Buffering`; PING must add its own exactly-once story on top (MCP explicitly declines).
- **FALSIFICATION:** Kill the TCP connection mid-stream during a `tools/call`; assert the client re-issues with a new JSON-RPC id and never attempts `Last-Event-ID` resume. Any resume attempt = non-conformant with 2026-07-28.
- **DEPENDENCIES:** M-CANCEL, M-SUBSCRIPTIONS, M-VERSION-NEG.
- **SPEC_SILENT?:** No — in spec (explicitly *removes* resumability).

### M-SUBSCRIPTIONS — Opt-in change-notification streams

- **PROBLEM:** Clients need to learn that tool/resource/prompt lists changed without polling.
- **SOURCE:** MCP spec (draft) + SEP-2575.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/patterns/subscriptions.mdx`
- **MATURITY:** Final in 2026-07-28 (replaced `resources/subscribe` + HTTP GET stream).
- **INVARIANT:** The server MUST NOT send notification types the client did not explicitly request. Every notification carries `io.modelcontextprotocol/subscriptionId` (the `subscriptions/listen` JSON-RPC id) for demultiplexing.
- **IMPLEMENTATION:** `subscriptions/listen{notifications:{toolsListChanged?, promptsListChanged?, resourcesListChanged?, resourceSubscriptions?: string[]}}` -> server MUST reply `notifications/subscriptions/acknowledged` first (echoing the honored subset), then stream `notifications/tools/list_changed`, `notifications/resources/updated`, etc. Multiple concurrent subscriptions allowed. Ends by client cancel (close stream / `notifications/cancelled`) or server teardown (server MUST send `notifications/cancelled` referencing the listen id). Request-scoped notifications (`progress`, `message`) NEVER flow on the listen stream.
- **FAILURE_MODE:** Server sends unrequested types (spec violation, client must tolerate); missed invalidation during a dropped listen stream -> stale cache until TTL (complements M-TOOL-LIST-CACHE).
- **PING_EXISTING_ANALOG:** (best effort) PING's change-notification / projection invalidation. Adopt the acknowledged-subset handshake.
- **GAP:** No replay of missed notifications after reconnect (client just re-lists); no ordering guarantees stated.
- **HARVEST_CLASS:** ADAPT — adopt for PING's registry change feed; add sequence numbers for gap detection (MCP doesn't have them).
- **FALSIFICATION:** Subscribe with only `toolsListChanged:true`; assert no `resources/updated` ever arrives on that stream. Then kill and re-establish; assert the client re-lists rather than assuming continuity.
- **DEPENDENCIES:** M-TOOL-LIST-CACHE (invalidation), M-CANCEL.
- **SPEC_SILENT?:** No — in spec.

### M-AUTH — OAuth 2.1 with resource indicators, step-up, and anti-passthrough

- **PROBLEM:** MCP servers need delegated, least-privilege, audience-bound authorization over HTTP.
- **SOURCE:** MCP spec (draft) + SEPs 990, 991, 1046, 2468.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/authorization/index.mdx`; `docs/specification/draft/basic/authorization/security-considerations.mdx`; `docs/specification/draft/basic/authorization/authorization-server-discovery.mdx`; `docs/specification/draft/basic/authorization/client-registration.mdx`
- **MATURITY:** Final (hardened in 2026-07-28).
- **INVARIANT:** Tokens are audience-bound (RFC 8707 `resource` indicator); **token passthrough is explicitly forbidden** (client must not forward a token it got for server A to server B); authorization is OPTIONAL in MCP and transport-scoped.
- **IMPLEMENTATION:** OAuth 2.1 subset: Protected Resource Metadata (RFC 9728) discovery; client registration via Client ID Metadata Documents (preferred), pre-registration, or Dynamic Client Registration (deprecated); PKCE S256 REQUIRED; `iss` claim validation per RFC 9207 (mix-up defense); short-lived access tokens + refresh rotation for public clients; **scope challenge**: server SHOULD return `WWW-Authenticate: Bearer resource_metadata="...", scope="files:read"` on 401; clients MUST treat challenged scopes as authoritative for the current operation; **step-up flow**: re-authorize adding challenged scopes to previously granted ones. Scope selection priority: challenged `scope` param > `scopes_supported` > omit. SEP-990: enterprise IdP profile for org-wide server allow-listing. SEP-1046: client-credentials flow for machine-to-machine (JWT assertions RFC 7523 recommended).
- **FAILURE_MODE:** `scopes_supported` vs challenged scope set has no guaranteed relationship (spec says clients MUST NOT assume); audience validation skipped -> confused-deputy token reuse; DCR phishing via malicious metadata (SSRF considerations documented).
- **PING_EXISTING_ANALOG:** (best effort) PING's own authN/Z authority. MCP's flow is the *wire* PING speaks to third-party servers; PING's policy engine stays the authority (AA9).
- **GAP:** No standard scope *vocabulary* (scopes are server-defined strings); no proof-of-possession tokens; authorization OPTIONAL means many servers have none.
- **HARVEST_CLASS:** ADAPT — speak this wire protocol to external MCP servers; define PING's scope vocabulary and keep grant decisions in PING.
- **FALSIFICATION:** Present a token issued for resource A to resource B; conforming server MUST reject (audience validation). Request with insufficient scope; assert the 401 carries a `WWW-Authenticate` scope challenge rather than a bare denial.
- **DEPENDENCIES:** None (imports OAuth 2.1).
- **SPEC_SILENT?:** No — in spec. Machine-to-machine partially silent (SEP-1046 Final but "implementors may implement other scenarios").

### M-PER-REQUEST-AUTHZ — Authorization-context-varying discovery

- **PROBLEM:** Different callers should see different tools/resources without per-connection session state.
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/server/tools.mdx` (Capabilities); `docs/specification/draft/server/resources.mdx`; `docs/specification/draft/server/prompts.mdx`; `docs/specification/draft/server/utilities/caching.mdx` (cacheScope)
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** List results MUST NOT vary per-connection or as a side effect of other requests, but MAY vary by the authorization presented *on the request* — "since credentials are per-request input, not connection state." `cacheScope:"private"` entries MUST NOT be shared across authorization contexts.
- **IMPLEMENTATION:** Server filters `tools/list` (etc.) by the caller's granted scopes from the presented token, per request. Combined with `cacheScope:"private"` so shared caches partition by authz context.
- **FAILURE_MODE:** Server keys the filter on something weaker than the token (IP, header) -> confused deputy; gateway caches `private` across tokens -> leak.
- **PING_EXISTING_ANALOG:** (best effort) PING's tenant/role-scoped tool catalogs. This is the spec's blessed hook for multi-tenancy.
- **GAP:** No standard way to *name* the authorization context for cache partitioning (token hash? sub?); no `Vary`-like declaration. Tenant isolation is emergent, not primitive.
- **HARVEST_CLASS:** ADAPT — PING defines the authz-context key (e.g., `sha256(token)` or `(iss,sub)`) and enforces partition; MCP servers just vary.
- **FALSIFICATION:** Two different tokens, one `tools/list` each, through a shared cache; assert entries never cross. If they do, the `private` scope is unenforced.
- **DEPENDENCIES:** M-AUTH, M-TOOL-LIST-CACHE.
- **SPEC_SILENT?:** No — in spec (but the context-key mechanism is silent).

### M-STATEFUL-HANDLES — Explicit opaque handles for cross-call state

- **PROBLEM:** Stateless protocol + stateful backends (carts, browser contexts, DB transactions).
- **SOURCE:** MCP spec (draft) + SEP-2567.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/server/tools.mdx` (Stateful Tools — non-normative guidance)
- **MATURITY:** Final guidance in 2026-07-28.
- **INVARIANT:** **"A handle is a name, not a capability."** The server MUST validate the caller's authorization against the handle on every call. For unauthenticated servers the handle is necessarily a bearer token: generate with sufficient entropy (UUIDv4) and bounded lifetime.
- **IMPLEMENTATION:** Creation tool returns an opaque string handle; later calls pass it as an ordinary argument; the model carries it forward. Design rules: opaque (no parseable structure), stated retention policy in the creation tool's description ("baskets expire after 24h"), expiry errors as *tool execution errors* (`isError:true`) so the model can recover by re-creating.
- **FAILURE_MODE:** Handle enumeration (sequential IDs) -> cross-user state access; handle as capability without authz check -> confused deputy; unbounded handle retention -> state leak.
- **PING_EXISTING_ANALOG:** (best effort) PING's session/conversation handles. Adopt the "name, not capability" invariant verbatim.
- **GAP:** Non-normative (guidance only); no standard handle format, rotation, or revocation.
- **HARVEST_CLASS:** ADOPT — the invariant sentence alone is worth adopting as PING law.
- **FALSIFICATION:** Mint handle for user A, present it as user B; server MUST reject or the "name not capability" rule is violated.
- **DEPENDENCIES:** M-PER-REQUEST-AUTHZ, M-MRTR (requestState applies the same rule).
- **SPEC_SILENT?:** Partially — normative protocol is silent; non-normative guidance exists.

### M-SECRETS — Secrets stay out of the MCP wire

- **PROBLEM:** Agents need credentials for tools without the credentials transiting the model, the client log, or the wire.
- **SOURCE:** MCP spec (draft) + SEP-1024 + community packaging.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/authorization/index.mdx` ("STDIO transport SHOULD NOT follow this [OAuth] specification, and instead retrieve credentials from the environment"); `docs/specification/draft/client/elicitation.mdx` (Warning: servers MUST NOT use form-mode elicitation for passwords/API keys/tokens/payment credentials; MUST use URL mode); `docs/specification/draft/server/tools.mdx` (x-mcp-header: SHOULD NOT mark sensitive params); `docs/specification/draft/basic/authorization/security-considerations.mdx` (secure token storage; short-lived tokens); `seps/1024-...md` (one-click install consent); community: MCPB `"sensitive"` env -> OS keychain (paldom/mcp-server-skills)
- **MATURITY:** Final (normative MUSTs on elicitation).
- **INVARIANT:** Sensitive material never crosses the MCP data plane in-band: credentials come from the *environment* (stdio) or OAuth flows (HTTP); user secrets are collected *out-of-band* (URL-mode elicitation: "Data (other than the URL itself) is not exposed to the client").
- **IMPLEMENTATION:** (1) stdio servers read secrets from env, never from tool args. (2) Elicitation URL mode: server gives the client a URL; user completes the sensitive interaction in a browser; client only learns the outcome via MRTR retry. (3) Form-mode schemas are restricted to flat primitives (not a secret channel — and secrets are banned from it anyway). (4) Install-time: clients MUST show exact command + args and get affirmative consent before one-click local server install (SEP-1024). (5) Packaging: mark env vars `"sensitive"`; OS keychain storage.
- **FAILURE_MODE:** Secret passed as a tool argument -> lands in model context, audit logs, and any `structuredContent` echo; `x-mcp-header` on a secret -> visible to intermediaries.
- **PING_EXISTING_ANALOG:** (best effort) PING's Secure Vault. MCP's rules validate PING's posture: vault-issued, env-injected, never in args.
- **GAP:** No secret *provisioning* or rotation protocol; no standard env-var schema for servers (each server invents `FOO_API_KEY`).
- **HARVEST_CLASS:** ADOPT — the three rules (env-only for stdio, URL-mode for user secrets, never-args) as PING law for MCP server integrations.
- **FALSIFICATION:** Configure a server with its API key as a tool argument default; assert PING's integration review flags it. Complete a URL-mode elicitation; assert the secret value never appears in client-side logs or the MRTR retry payload.
- **DEPENDENCIES:** M-MRTR (URL mode rides it), M-AUTH.
- **SPEC_SILENT?:** No — normative rules exist; provisioning/rotation silent.

### M-FS-SCOPING — Filesystem allow-list with symlink resolution

- **PROBLEM:** A file server must confine all operations to operator-approved directories despite `..`, symlinks, and encoding tricks.
- **SOURCE:** Reference implementation: modelcontextprotocol/servers `filesystem`.
- **PINNED_SHA:** `f46d9578190b476b3501923ea8977d899e8db2cb`
- **SOURCE_LOCATION:** `src/filesystem/path-validation.ts` (`isPathWithinAllowedDirectories`); `src/filesystem/index.ts` (startup: allowed dirs from argv, symlink resolution at startup, `validatePath` on every tool call)
- **MATURITY:** Production reference; widely deployed.
- **INVARIANT:** Every path is normalized, resolved absolute, and checked as a *prefix with separator boundary* against the allow-list on *every call*. Symlinks in allowed dirs are resolved at startup; null bytes rejected; relative-after-normalization rejected.
- **IMPLEMENTATION:** `allowedDirectories` from CLI args; `path.resolve(path.normalize(p))`; must be absolute; `normalizedPath === dir || normalizedPath.startsWith(dir + path.sep)` (with drive-letter and root edge cases on Windows). Each tool description repeats "Only works within allowed directories" (defense in depth for the model too).
- **FAILURE_MODE:** TOCTOU (symlink swapped after startup resolution — the code resolves allowed dirs at startup but validates request paths per call; a symlink *inside* an allowed dir pointing outside passes the prefix check unless the request path itself is realpath'd — read the code before assuming); case-insensitive filesystem bypasses on macOS/Windows.
- **PING_EXISTING_ANALOG:** (best effort) PING's resource scoping for file-backed tools. Adopt the per-call validation + startup canonicalization shape.
- **GAP:** Spec-silent (no resource-scoping primitive in MCP at all); each server reimplements.
- **HARVEST_CLASS:** ADAPT — adopt as PING's file-tool sandbox pattern; add realpath-per-call to close the TOCTOU window the reference leaves.
- **FALSIFICATION:** Create `allowed/` containing a symlink to `/etc`; call `read_text_file` on `allowed/link/passwd`. If it succeeds, the scoping is prefix-theater. (Verify against the actual code path before asserting — the finding is a hypothesis until tested.)
- **DEPENDENCIES:** None.
- **SPEC_SILENT?:** YES — implementation mechanism; spec has no scoping primitive.

### M-STDIO-RESURRECT — Crash recovery: restart, abandon in-flight, re-subscribe

- **PROBLEM:** The server is a child process; it can die at any time.
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/transports/stdio.mdx` (Shutdown; Unexpected Termination; Backward Compatibility)
- **MATURITY:** Final.
- **INVARIANT:** "Because the protocol is stateless, any in-flight requests are simply lost and the client can retry them against the fresh process." Recovery is *restart + retry*, never *resume*.
- **IMPLEMENTATION:** Client SHOULD restart the process on unexpected exit; in-flight requests are abandoned (client retries as new requests); active `subscriptions/listen` streams MUST be re-established. Graceful shutdown: close stdin -> server should exit promptly -> escalate SIGTERM->SIGKILL (POSIX) / TerminateProcess / Job Objects (Windows). Server MAY initiate shutdown by closing stdout + exiting. Era probe: `server/discover` first; modern error -> negotiate version; anything else/timeout -> legacy `initialize` fallback (fallback MUST NOT be keyed to one error code).
- **FAILURE_MODE:** Retry of a lost in-flight non-idempotent call double-executes (accepted by the spec); restart loops on a deterministically-crashing server (no backoff specified).
- **PING_EXISTING_ANALOG:** (best effort) PING's worker supervision. Adopt restart+retry; PING adds the idempotency story MCP lacks.
- **GAP:** No backoff/jitter on restart; no crash-reporting channel; no idempotency keys (see M-CANCEL).
- **HARVEST_CLASS:** ADAPT — adopt the state machine; add bounded restart backoff and idempotency keys in PING.
- **FALSIFICATION:** Kill a stdio server mid-`tools/call`; assert the client restarts it, re-establishes subscriptions, and retries with a NEW request id. Assert no attempt to "resume" the old id.
- **DEPENDENCIES:** M-VERSION-NEG (era probe), M-SUBSCRIPTIONS.
- **SPEC_SILENT?:** No — in spec.

### M-ERROR-CODES — Reserved error-code range + two-tier error model

- **PROBLEM:** JSON-RPC `-32000..-32099` was a free-for-all; implementations collided.
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/index.mdx` (Error Codes); `docs/specification/draft/server/tools.mdx` (Error Handling); `docs/specification/2026-07-28/changelog.mdx` item 12
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** `-32000..-32019`: legacy/implementation-defined (grandfathered, MUST NOT assume meaning). `-32020..-32099`: reserved for the MCP specification; implementations MUST NOT emit undefined codes from this range. Defined: `-32020 HeaderMismatch`, `-32021 MissingRequiredClientCapability`, `-32022 UnsupportedProtocolVersion`.
- **IMPLEMENTATION:** Two-tier tool errors: **protocol errors** (unknown tool, malformed request — JSON-RPC error, model unlikely to fix) vs **tool execution errors** (`isError:true` result — actionable, SHOULD be shown to the model for self-correction). Timeouts raised inside an SDK are *not yet assigned* codes (explicitly noted as future work).
- **FAILURE_MODE:** Servers emitting `-32020..-32099` with non-spec meanings (forbidden but unenforced on the wire); clients treating `isError:true` as fatal instead of retryable.
- **PING_EXISTING_ANALOG:** (best effort) PING's typed failure taxonomy (Antifragile Directive: typed, deterministic failure semantics). Strong MIRROR: adopt the two-tier split (protocol vs execution) and the reserved-range discipline.
- **GAP:** No timeout code; no rate-limit code; no standard `data` shapes.
- **HARVEST_CLASS:** MIRROR — align PING's error taxonomy with the two tiers; reserve a PING range the same way.
- **FALSIFICATION:** Emit `-32050` with a custom meaning from a test server; a strict client SHOULD NOT interpret it. Return `isError:true` with a fixable message; assert the model-facing path surfaces it as retryable, not fatal.
- **DEPENDENCIES:** None.
- **SPEC_SILENT?:** No — in spec.

### M-VERSION-NEG — Per-request version declaration with error-driven fallback

- **PROBLEM:** No handshake anymore (SEP-2575 killed `initialize`); client and server must still agree on a wire version.
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/versioning.mdx`; `docs/specification/draft/basic/transports/streamable-http.mdx` (Protocol Version Header; Backward Compatibility)
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** There is no negotiation handshake. Every request declares its version; the server accepts or rejects each request independently.
- **IMPLEMENTATION:** `_meta.io.modelcontextprotocol/protocolVersion` on every request (+ `MCP-Protocol-Version` HTTP header, must match `_meta` or `400`+`HeaderMismatch`). Unknown/unsupported version -> `UnsupportedProtocolVersionError` (`-32022`) listing `supported[]`; client SHOULD retry with a mutually supported version. `server/discover` as optional up-front probe and as stdio era-probe (modern result -> negotiate; modern error -> use advertised versions, do NOT fall back; anything else -> legacy `initialize`).
- **FAILURE_MODE:** Version-downgrade attacks (server claims only old versions); `MCP-Protocol-Version` omitted by pre-2025-06-18 clients (servers MAY assume `2025-03-26`).
- **PING_EXISTING_ANALOG:** (best effort) PING's protocol versioning. The per-request declaration (no handshake) fits PING's stateless direction.
- **GAP:** No authenticated version advertisement (downgrade risk accepted); era matrix is documentation, not wire.
- **HARVEST_CLASS:** ADAPT — adopt per-request version + error-driven fallback for PING's own wire protocols.
- **FALSIFICATION:** Send a request declaring `1900-01-01`; assert `-32022` with a `supported` list, not a silent fallback or a hang.
- **DEPENDENCIES:** M-DISCOVER.
- **SPEC_SILENT?:** No — in spec.

### M-EXTENSIONS — Capability-advertised extensions with prefixed identifiers

- **PROBLEM:** The core must stay small while the ecosystem experiments (tasks, skills, apps UI).
- **SOURCE:** MCP spec (draft) + SEP-2133.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/basic/versioning.mdx` (Extension Negotiation); `seps/2133-extensions.md`; `seps/2663-tasks-extension.md` (`io.modelcontextprotocol/tasks`); `seps/2640-skills-extension.md` (`io.modelcontextprotocol/skills`)
- **MATURITY:** Final in 2026-07-28.
- **INVARIANT:** Extension identifiers MUST follow the `_meta` key naming rules with a mandatory prefix (e.g., `io.modelcontextprotocol/tasks`). Extensions ride in `capabilities.extensions` as id -> settings-object; empty object = supported with no settings.
- **IMPLEMENTATION:** Client and server each advertise supported extensions per-request (client) / per-discover (server). Each extension defines its own settings schema. Tasks and Skills are the first two official extensions; MCP Apps (`io.modelcontextprotocol/ui`) is another.
- **FAILURE_MODE:** Extension id squatting without the prefix rules; settings schema drift between implementations.
- **PING_EXISTING_ANALOG:** (best effort) PING's own modular capability surface. The prefix rule is worth copying to avoid collisions.
- **GAP:** No extension registry/discovery beyond bilateral advertisement; no versioning *within* an extension id.
- **HARVEST_CLASS:** ADAPT — adopt the prefixed-id + settings-object shape for PING's plugin/capability surface.
- **FALSIFICATION:** Advertise `tasks` (no prefix); a strict implementation MUST NOT treat it as the official tasks extension.
- **DEPENDENCIES:** M-DISCOVER, M-VERSION-NEG.
- **SPEC_SILENT?:** No — in spec.

### M-OTEL — Trace context propagation in `_meta`

- **PROBLEM:** A tool call fans out across client, server, and downstream APIs; correlating the trace requires context propagation.
- **SOURCE:** MCP spec (2026-07-28) + SEP-414.
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/2026-07-28/changelog.mdx` (minor change 2); `seps/414-request-meta.md`; community: mocapi `mocapi-o11y`/`mocapi-otel` (W3C trace context joined from the `_meta` envelope; `mcp.handler.execution` observations with `gen_ai.tool.name`), trace-mcp (OTel spans per tool execution)
- **MATURITY:** Conventions documented in 2026-07-28; community adoption growing.
- **INVARIANT:** `_meta` is the propagation carrier: `traceparent`, `tracestate`, `baggage` keys ride alongside protocol fields. Observability is *additive and derived* — local records stay the source of truth.
- **IMPLEMENTATION:** Client injects W3C `traceparent` into request `_meta`; server joins it, emits `jsonrpc.server` + `mcp.handler.execution` spans; attributes: `mcp.method.name`, `mcp.protocol.version`, `mcp.client.name`, `mcp.handler.name`, `mcp.request.id`, `gen_ai.tool.name`. Telemetry exports operational metadata only (names, durations, error types, payload sizes) — never code, file contents, or credentials; sinks default to noop/opt-in.
- **FAILURE_MODE:** Trace context treated as authz (it's not); baggage bloating headers; PII in span attributes.
- **PING_EXISTING_ANALOG:** (best effort) PING's correlation IDs + evidence plane. Strong MIRROR: `_meta` propagation is exactly PING's "instrumentation plus correlation IDs" layer.
- **GAP:** Conventions, not conformance-tested requirements.
- **HARVEST_CLASS:** MIRROR — align PING's correlation-ID propagation with the W3C-in-`_meta` convention so PING traces join MCP server traces.
- **FALSIFICATION:** Inject a `traceparent` in `_meta`; assert it appears (joined, not restarted) in the server's exported spans. If the server starts a new trace, propagation is broken.
- **DEPENDENCIES:** M-RECEIPT-AUDIT.
- **SPEC_SILENT?:** Partially — conventions documented in changelog; SEP-414 Final.

### M-PAGINATION — Opaque cursor pagination, no snapshot guarantee

- **PROBLEM:** `tools/list` / `resources/list` can be large.
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/server/utilities/pagination.mdx`
- **MATURITY:** Final.
- **INVARIANT:** Cursors are opaque; page size is server-determined; clients MUST NOT assume fixed page sizes. There is NO cross-page consistency guarantee.
- **IMPLEMENTATION:** Response carries `nextCursor`; client re-issues with `cursor`. Invalid cursor -> discard all cached pages, re-fetch from start. Clients needing a consistent snapshot SHOULD re-fetch from the beginning (still not guaranteed atomic).
- **FAILURE_MODE:** Duplicates/gaps across pages when the underlying set changes mid-pagination; cursor replay attacks if cursors encode privileged offsets (server's problem).
- **PING_EXISTING_ANALOG:** (best effort) PING's list pagination. Adopt the opaque-cursor + discard-on-invalid rules.
- **GAP:** No total counts, no snapshot isolation, no "list changed during pagination" signal.
- **HARVEST_CLASS:** ADAPT — adopt; PING adds change tokens where snapshot consistency matters.
- **FALSIFICATION:** Change the tool set mid-pagination; assert the client can observe duplicates/gaps without crashing (the spec permits it — the test is that PING handles it explicitly).
- **DEPENDENCIES:** M-TOOL-LIST-CACHE.
- **SPEC_SILENT?:** No — in spec.

### M-COMPLETION — Argument autocompletion as a protocol primitive

- **PROBLEM:** Prompt arguments and resource-template variables need contextual suggestions (IDs, branch names, filenames).
- **SOURCE:** MCP spec (draft).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `docs/specification/draft/server/utilities/completion.mdx`
- **MATURITY:** Final (long-standing).
- **INVARIANT:** Completion is assistive only: the server suggests values for *already-identified* argument slots; it never defines new parameters.
- **IMPLEMENTATION:** `completion/complete{ref: {type: "ref/prompt"|"ref/resource", name|uri}, argument: {name, value}}` -> `{completion: {values[], total?, hasMore?}}`. Capability `completions:{}`.
- **FAILURE_MODE:** Suggestion injection (server suggests a malicious value the user accepts blindly — a prompt-injection-adjacent risk; the UI should show provenance).
- **PING_EXISTING_ANALOG:** (best effort) PING's own parameter assistance. Small, clean mechanism.
- **GAP:** No ranking contract; no `hasMore` pagination semantics beyond the flag.
- **HARVEST_CLASS:** ADAPT — adopt the ref+argument shape for PING's parameter completion.
- **FALSIFICATION:** Request completion for an argument the server doesn't know; assert empty values, not an error that breaks the flow.
- **DEPENDENCIES:** Prompts/resources.
- **SPEC_SILENT?:** No — in spec.

### M-SKILLS — Capability packaging as versioned skill directories over resources

- **PROBLEM:** Tools need long-form workflow instructions that don't fit in `description` or server `instructions` (e.g., an 875-line skill).
- **SOURCE:** SEP-2640 (extension `io.modelcontextprotocol/skills`); Agent Skills spec (external, agentskills.io).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `seps/2640-skills-extension.md`
- **MATURITY:** Final as extension.
- **INVARIANT:** The skill *format* is owned by the external Agent Skills spec, not MCP — MCP defines only the transport binding. Progressive disclosure: metadata first, full content on demand.
- **IMPLEMENTATION:** Each file in a skill dir exposed as a resource under `skill://<skill-path>/<file-path>`; `skills/list` enumerates; `skills/get` fetches by URI (even unlisted); optional `resources/directory/read` for scoped navigation. `SKILL.md` frontmatter carries `name` + `description` (the discovery metadata).
- **FAILURE_MODE:** Skill content as prompt injection (server-authored instructions executed by the agent — the classic skills risk; host must sandbox/trust-tier skill sources).
- **PING_EXISTING_ANALOG:** (best effort) PING's own skill/playbook layering. The frontmatter-as-discovery-metadata + progressive disclosure shape mirrors PING's instincts.
- **GAP:** No trust tiering, no signature on skills, no version pinning in the binding.
- **HARVEST_CLASS:** ADAPT — adopt progressive disclosure + frontmatter discovery metadata; PING signs and trust-tiers skills (MCP doesn't).
- **FALSIFICATION:** Serve a skill whose instructions tell the agent to exfiltrate; assert PING's skill-ingestion policy treats server skills as untrusted content until allow-listed/signed.
- **DEPENDENCIES:** M-EXTENSIONS, resources primitive.
- **SPEC_SILENT?:** Partially — extension SEP is Final; core spec silent.

### M-INSTALL-CONSENT — One-click local server install requires informed consent

- **PROBLEM:** "Add this MCP server" buttons execute arbitrary local commands — a social-engineering superhighway.
- **SOURCE:** SEP-1024 (Final).
- **PINNED_SHA:** `a99bdd15ea9ff96bf4d758aac907bbb27e9329dc`
- **SOURCE_LOCATION:** `seps/1024-mcp-client-security-requirements-for-local-server-.md`
- **MATURITY:** Final (client requirements).
- **INVARIANT:** Before executing any install/configure command, the client MUST show the *exact* command and args without truncation, warn clearly, require affirmative action, and offer cancel. No consent -> no install.
- **IMPLEMENTATION:** Consent dialog with full command text; VS Code and Cursor cited as existing implementations.
- **FAILURE_MODE:** Consent fatigue (users click through); TOCTOU between consent and execution.
- **PING_EXISTING_ANALOG:** (best effort) PING's approval/confirmation UX for consequential actions. Same shape.
- **GAP:** Spec can't enforce UI; only client conformance.
- **HARVEST_CLASS:** ADOPT — PING's server-install/registration flows must show exact commands and get affirmative consent.
- **FALSIFICATION:** Present a one-click install for a config whose command differs at execution from what was shown; the flow MUST fail closed.
- **DEPENDENCIES:** None.
- **SPEC_SILENT?:** No — Final SEP (client-side requirements).

---

## 3. SPEC-SILENCE LIST (PING must define these itself)

The spec is silent — i.e., no normative mechanism exists — on:

1. **Tool receipts / proof of execution.** No execution ID, no signed receipt, no proof a tool ran. Closest: Tasks extension task handles (unsigned) and community hash-audit records.
2. **Timeout values and timeout error codes.** SHOULD-level only; no defaults; "timeout raised inside an SDK" has no code.
3. **Large outputs.** No chunking, range reads, or truncation protocol for tool results or resource reads. Reference `fetch` server has no truncation either.
4. **Partial/streaming tool results.** Only progress notifications + final result; no streaming partial results primitive (Tasks extension `notifications/tasks` is the incubating answer).
5. **Idempotency / dedup keys.** Retry-after-disconnect and retry-after-cancel can double-execute; no key, no "was it applied?" query, no compensation protocol.
6. **Per-tool versioning / deprecation.** Only whole-list change notifications; no per-tool version, no sunset marker, no rename mapping.
7. **Server-side rate limiting mechanics.** Servers MUST "rate limit tool invocations" (tools.mdx) but there is no 429-style signal, no quota discovery, no backoff contract.
8. **Tenant isolation primitive.** Only emergent via per-request authz filtering + `cacheScope:"private"`; no tenant identifier, no context-key standard, no cross-tenant task binding (SEP-2663 calls `tasks/list` unsafe for exactly this reason).
9. **Tool-name registry / cross-server identity.** Names unique per server only; aggregation collisions handled by client-side prefixing guidance; `serverInfo.name` explicitly NOT to be trusted for disambiguation.
10. **Audit format and retention.** One SHOULD sentence ("log tool usage for audit purposes"); everything else is community convention.
11. **Secret provisioning and rotation.** Env injection (stdio) and OAuth (HTTP) are the only blessed paths; no provisioning, rotation, or schema standard.
12. **Resource range/partial reads.** `resources/read` is all-or-nothing.
13. **Cache revalidation.** TTL + push invalidation only; no ETags / conditional requests / negative caching.
14. **Single-use enforcement for `requestState`.** Spec *requires* servers to enforce it server-side for one-time redemptions but provides no primitive — every server hand-rolls.
15. **Scope vocabulary.** Scopes are opaque server-defined strings; no standard vocabulary, no scope-to-tool mapping discovery.
16. **Extension versioning.** Extension ids have no version component; settings-schema evolution is bilateral.
17. **Deterministic `tools/list` across servers.** Deterministic *ordering* per server is SHOULD-level; no content hash/digest of the catalog (community `/actuator/mcp` exposes schema digests — spec doesn't).
18. **Server disappearance on HTTP.** No heartbeat, no health endpoint, no "server is going away" signal; broken stream = re-issue as new request.
19. **Input validation error taxonomy.** SEP-1302 exists in the index (formalize working groups) re: input validation errors as tool execution errors — the spec funnels them to `isError:true` with no codes.
20. **Resumability.** Deliberately removed (SEP-2575); SEP-1699's SSE-polling mechanism (Final!) did not survive into the stateless revision — see OQ-3.

---

## 4. ANTI-AUTHORITY SECTION — where MCP tempts to become source of truth

**Standing invariant: MCP is transport. PING authority owns policy; MCP carries bytes.** Every item below is a place where treating an MCP-supplied value as authoritative would invert the trust model.

- **AA1 — Tool annotations are hints, servers are untrusted.** Spec (schema `$defs.ToolAnnotations`): "all properties are **hints**... Clients should never make tool use decisions based on `ToolAnnotations` received from untrusted servers." PING MUST NOT let `readOnlyHint:true` suppress confirmations, skip audit, or widen exposure for any server PING did not itself classify. PING assigns/verifies annotations; MCP transports them.
- **AA2 — `serverInfo` is self-reported.** Spec (discover.mdx Note): "self-reported by the server and is not verified by the protocol... Clients SHOULD NOT use it to change their behavior, and SHOULD NOT rely on it for security decisions." PING MUST NOT key policy, routing, or trust on `serverInfo.name/version`.
- **AA3 — Capabilities are advertisements, not grants.** `server/discover` capabilities describe what the server *claims*. Exposure decisions (which tools a tenant/role may see or call) are PING policy, computed from PING's registry + toolsets + authz — never "the server said it has it, so it's allowed."
- **AA4 — Prompts are server-authored content, never PING policy.** Prompts are "user-controlled" for *selection* but "defined by the server" for *content* (prompts.mdx). Server prompt text is untrusted content fed to the model, not instructions PING obeys. (Also: deprecated by SEP-2577 — do not build PING policy flows on prompts.)
- **AA5 — Per-authorization list filtering is input, not the grant.** The server MAY filter `tools/list` by presented authz; that filtering *informs* PING's view but PING's own policy engine decides what the principal may invoke. A server that over-exposes does not over-grant in PING.
- **AA6 — Elicitation: the server asks, the host owns the interaction.** The server requests information; the *client/host* owns the UI, the consent, the decline path, and — in URL mode — keeps the secret entirely out of MCP. PING MUST NOT treat an elicitation request as an instruction to collect-and-forward; it is a request PING's policy may deny.
- **AA7 — Sampling: the server asks, the host owns the model.** (Deprecated by SEP-2577, but the shape persists via MRTR.) A `sampling/createMessage` input request is the server asking PING's host for an LLM completion. Model selection, system prompt, and output policy are the host's — the server's `systemPrompt`/`modelPreferences` are *preferences*, not orders.
- **AA8 — `requestState` is opaque and attacker-controlled.** Spec (mrtr.mdx): "If a client request contains a `requestState` field, servers MUST treat `requestState` as an attacker-controlled input." Symmetric rule for PING: any opaque token PING mints and a server echoes (or vice versa) is untrusted until integrity-verified (HMAC/AEAD), principal-bound, TTL-bounded, and single-use-enforced where redemption matters.
- **AA9 — Server-supplied scopes are hints for least-privilege requests.** `WWW-Authenticate` scope challenges and `scopes_supported` are the server telling the client what *it* wants. PING's authorization authority decides which scopes PING will actually request and hold; a server demanding broad scopes does not obligate PING to grant them. (Also: the spec admits the challenged set and `scopes_supported` have no guaranteed relationship — PING must not assume one.)
- **AA10 — MCP Apps (`io.modelcontextprotocol/ui`): server-rendered UI is content, not chrome.** An extension that lets servers ship interactive HTML UIs. PING MUST sandbox it as untrusted content; it must never carry PING authority actions without PING-mediated confirmation.
- **AA11 — `x-mcp-header`: servers designate, intermediaries distrust by default.** Header mirroring exists so *dumb* intermediaries can route — but policy-enforcing intermediaries MUST validate header-vs-body (spec) and SHOULD reject requests from versions without mandatory validation. PING's gateway MUST NOT route-or-allow on `Mcp-Param-*` alone.
- **AA12 — Resource annotations (`priority`, `audience`) are context-selection hints.** They help a client rank context, not decide access. `priority: 1.0` ("effectively required") from a server does not make a resource required in PING.
- **AA13 — Extension advertisements are not capability grants.** A server advertising `io.modelcontextprotocol/tasks` means it *speaks* tasks; whether PING lets a tenant use task-augmented calls is PING policy.
- **AA14 — The `instructions` field is server-authored model guidance.** Useful for UX, untrusted for policy. PING treats it as documentation content, never as standing orders.

**The one-line version:** everything MCP hands PING that originated at the server — annotations, capabilities, prompts, instructions, scopes, handles, headers, skills, UI — is *data about the server's claims*. Policy (who may do what, what is true, what is proven) lives in PING's authorities (registry, authz, witness/evidence) and is never delegated to the wire.

---

## 5. OPEN QUESTIONS

- **OQ-1 — Receipt standard:** Should PING define a signed tool-receipt format (tool, arg-hash, result-hash, principal, timestamps, server identity, PING witness signature) and require it at the PING gateway for all MCP tool calls, given the spec will likely never standardize one? (Recommendation: yes — M-RECEIPT-AUDIT gives the field list; PING adds the signature.)
- **OQ-2 — Idempotency keys:** Should PING inject an idempotency key into every `tools/call` (e.g., in `_meta` under a PING-prefixed key) and maintain an applied-or-not ledger, since MCP has no dedup story? This is the only clean fix for retry-after-disconnect double execution.
- **OQ-3 — SEP-1699 vs the stateless revision:** SEP-1699 (Final) specified SSE polling via server-side disconnect with `retry` hints, but draft `streamable-http.mdx` says "Resumable SSE streams via `Last-Event-ID` are not supported" and the 2026-07-28 changelog says resumability was *removed*. Is SEP-1699 superseded, partially implemented, or awaiting a new revision? PING should not build on server-side-disconnect polling until this is resolved.
- **OQ-4 — Task handle authz:** SEP-2663 is explicit that unguessable task IDs may be the *only* authz line. For PING's long-running executions, should task handles be bearer tokens (MCP-style) or should PING bind every handle to (principal, authz-context) and reject cross-principal presentation? (Recommendation: bind — bearer handles are a cross-tenant incident waiting to happen.)
- **OQ-5 — Scope vocabulary:** MCP scopes are server-defined strings with no registry. Should PING define a canonical scope vocabulary (`ping:tools:call:<name>`, `ping:resources:read:<uri-pattern>`, ...) and map foreign scopes onto it at the gateway?
- **OQ-6 — Catalog digests:** Should PING require/maintain a content digest of each MCP server's tool catalog (names + schema hashes, à la community `/actuator/mcp`) so prompt-cache stability and change detection don't depend on the server's `ttlMs` honesty?
- **OQ-7 — Skills trust tiering:** SEP-2640 punts trust entirely. What is PING's policy for ingesting server-provided skills (signature required? allow-list? sandbox execution of skill scripts?)? The prompt-injection surface here is the largest unaddressed one in the ecosystem.
- **OQ-8 — `requestState` single-use:** The spec demands single-use enforcement for one-time redemptions but provides no primitive. Does PING need a general single-use-token service (nonce ledger) for its own MRTR-style flows?
- **OQ-9 — Toolset standardization:** Should PING propose (or just define internally) a standard `toolsets`/`readOnly` discovery mechanism, given every major community server reinvented it and the spec is silent? PING defining it internally is sufficient unless interop is needed.
- **OQ-10 — Timeout defaults:** What are PING's actual timeout values (per-tool default, per-request override ceiling, progress-reset idle clock, absolute max)? The spec gives the two-clock shape; PING must pick numbers and an error code.

---

## 6. HARVEST SUMMARY (by class)

- **ADOPT as PING law:** M-RECEIPT-AUDIT (hash-based audit record shape), M-SECRETS (env-only stdio creds / URL-mode user secrets / never-in-args), M-STATEFUL-HANDLES ("a handle is a name, not a capability"), M-INSTALL-CONSENT (exact-command affirmative consent).
- **ADAPT (steal shape, keep PING authority):** M-DISCOVER, M-TOOL-LIST-CACHE, M-TOOL-ANNOT, M-TOOLSETS, M-X-MCP-HEADER, M-MRTR, M-TASKS, M-TIMEOUT, M-CANCEL, M-PROGRESS, M-SSE-STREAM, M-SUBSCRIPTIONS, M-AUTH (wire), M-PER-REQUEST-AUTHZ, M-FS-SCOPING, M-STDIO-RESURRECT, M-VERSION-NEG, M-EXTENSIONS, M-PAGINATION, M-COMPLETION, M-SKILLS.
- **MIRROR (align with PING's existing):** M-STRUCTURED-IO, M-ERROR-CODES, M-OTEL.
- **WATCH:** M-SEARCH-DISCOVERY (single-vendor, immature).
- **REJECT:** Resumable SSE (spec removed it — do not build); server-defined capabilities as permission grants (AA3); self-asserted annotations for policy (AA1); bearer task handles without principal binding (OQ-4).

---

*End of LANE-9 report. All spec claims verified against the pinned local clones; community claims verified against live web sources on 2026-09-23. No implementation code written.*
