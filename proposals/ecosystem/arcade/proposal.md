# Harvest Proposal: Arcade (tool authorization runtime)

Worker: leaf harvest worker, 2026-10-02
Target: Arcade (Arcade AI Inc.), the agent+user tool-authorization and authorized-execution platform

## 1. What I read (URLs + SHAs)

All mechanism material was read from official docs (arcade.dev, docs.arcade.dev) and the
open-source MIT-licensed worker framework repo. The Arcade Engine / Arcade Cloud (the
closed-source broker) was NOT read as code; only its public wire protocol and official
documentation were used to re-derive the mechanism clean-room. No proprietary code copied.

| # | Material | Source URL | Commit / version |
|---|----------|-----------|------------------|
| 1 | arcade-mcp repo README + CLAUDE.md (authorized tool calling mechanism, dual-protocol worker) | https://github.com/arcadeai/arcade-mcp | HEAD `78e9820938dc7f796a5c4cd0ea73d2cbe2c682d9` (read 2026-10-02) |
| 2 | Tool contract + worker wire protocol: ToolDefinition, ToolContext, ToolCallRequest/Response/Output, ToolCallRequiresAuthorization | `libs/arcade-core/arcade_core/schema.py` in repo above | same SHA |
| 3 | Error taxonomy: ErrorKind, error payload contract | `libs/arcade-core/arcade_core/errors.py` in repo above | same SHA |
| 4 | MIT license (full text read) | https://github.com/ArcadeAI/arcade-mcp/blob/main/LICENSE | same SHA |
| 5 | Worker route shape (GET /worker/tools bare array; POST /worker/tools/invoke envelope; snake_case; requires_authorization) | https://github.com/arcadeai/arcade-mcp-ts/blob/HEAD/README.md (worker-routes section mirrors Python wire format exactly) | read 2026-10-02 |
| 6 | Authorization flow: auth providers, requires_auth, token injection, re-invocation after grant | https://docs.arcade.dev/en/build/create-tools/tool-basics/create-tool-auth | read 2026-10-02 |
| 7 | Pre-action authorize flow: client.auth.start / wait_for_completion / authorize(tool_name, user_id), status pending/completed | https://docs.arcade.dev/en/guides/tool-calling/call-third-party-apis | read 2026-10-02 |
| 8 | The agent+user intersection doctrine: just-in-time authorization, least-privilege, contextual enforcement at the tool layer | https://www.arcade.dev/blog/agent-authorization-langgraph-guide/ | read 2026-10-02 |

Recorded excerpts for all of the above live in `sources/src-1..src-5-*.txt` in this directory.
SOURCE_SHA = sha256 over the concatenation of those five files (listed in manifest-entry.json).

## 2. Object model (re-derived, clean-room)

**ToolDefinition** (the tool contract, what the worker/agent is allowed to see):
- `name`, `fully_qualified_name` ("Toolkit.Name", separator configurable), `description`
- `toolkit` { name, description, version }
- `input` { parameters: [ { name, required, description, value_schema, inferrable } ] }
- `value_schema` { val_type: string|integer|number|boolean|json|array, inner_val_type, enum, properties, required_keys, nullable }
- `output` { description, available_modes: [value, error, null], value_schema }
- `requirements` { authorization: { provider_id, provider_type, id, oauth2: { scopes } }, secrets: [ { key } ], metadata: [ { key } ] }
- `deprecation_message`, `metadata`, `_meta` passthrough

**Authorization grant request** (what the owner/user produces):
- AuthorizationResponse { id, status: pending|completed|failed, url (OAuth challenge), context: { token, user_info } }
- Keyed by (user_id, provider, scopes); user_id is the app's own internal ID (email, UUID), not the provider's ID.

**ToolCallRequest** (what the Engine sends to the worker at execution):
- run_id (globally unique run), execution_id (globally unique per execution in the run), created_at
- tool: ToolReference { name, toolkit, version }
- inputs: dict
- context: ToolContext { authorization: { token, user_info }, secrets: [ { key, value } ], metadata, user_id }

**ToolCallResponse** (the execution receipt):
- execution_id, finished_at, duration_ms, success (bool)
- output: exactly one of { value | error | requires_authorization | artifact }
- error: { message (agent-safe), kind (ErrorKind), developer_message (server-only), can_retry, additional_prompt_content, retry_after_ms, stacktrace, status_code, extra }
- requires_authorization: { authorization_url, authorization_id, scopes, status }
- logs: [ { message, level, subtype } ]

**ErrorKind** (who x when x what): TOOLKIT_LOAD_FAILED; TOOL_DEFINITION_BAD_DEFINITION/BAD_INPUT_SCHEMA/BAD_OUTPUT_SCHEMA;
TOOL_RUNTIME_BAD_INPUT_VALUE / BAD_OUTPUT_VALUE / RETRY / CONTEXT_REQUIRED / FATAL;
UPSTREAM_RUNTIME_{BAD_REQUEST, AUTH_ERROR, NOT_FOUND, VALIDATION_ERROR, RATE_LIMIT, SERVER_ERROR, UNMAPPED};
NETWORK_TRANSPORT_RUNTIME_{TIMEOUT, UNREACHABLE, UNMAPPED}; UNKNOWN.

## 3. ID scheme

- user_id: the application's own internal identifier for the end user (email, UUID). Arcade never invents the user identity; it binds grants to the caller's ID. This matches PING's tenant/owner identity posture: the owner identity is caller-supplied, Arcade only records the binding.
- Tool identity: FullyQualifiedName = Toolkit "." Name (+ optional toolkit version), case-insensitive equality, version-ignoring comparison available. This is a namespaced capability identifier, not a content hash: the contract is identity by (namespace, name, version).
- run_id / execution_id: engine-issued globally unique IDs per run and per tool execution in the run. These are the correlation keys for receipts, replay, and idempotency; they travel in both request and response.
- authorization_id: the ID of one OAuth challenge/grant attempt; the response receipt (requires_authorization) points back to it, so the grant lifecycle and the execution lifecycle are joinable.
- worker transport identity: HS256 JWT signed with the worker secret (audience="worker", ver="1") on /worker/*. This is a separate identity layer from end-user OAuth: Engine-to-worker trust, not user delegation.

## 4. State transitions

Authorization grant lifecycle:
- none -> pending: authorize(tool_name, user_id) finds no grant; returns authorization_url + authorization_id; the user completes the OAuth challenge in their browser.
- pending -> completed: wait_for_completion(id) polls until the provider issues the token; grant is stored; execute() may now run. authorize() is idempotent: a completed grant returns "completed" immediately.
- pending -> failed/declined: user rejects or the challenge expires; execute() must not run.

Execution lifecycle:
- execute(tool, inputs, user_id) checks the grant for (user_id, tool.requirements.authorization).
- Grant present -> worker invoked with scoped ToolContext (token + secrets injected server-side) -> receipt returned.
- Grant missing -> the output carries requires_authorization (URL + id + scopes + status), NOT an error. The tool is re-invoked after the grant lands. This is the key design: missing authorization is a resumable state, not a failure.
- Tool runs -> output.value on success; output.error with kind on failure; output.artifact when a large artifact reference replaces inline value.

Revocation lifecycle:
- completed -> revoked: user revokes at the provider or disconnects the app (Arcade_Apps in the hub); next call re-enters pending. Token refresh is transparent until revocation: "Subsequent calls reuse and refresh the token automatically."

HTTP status mapping at the worker binding (per engine PR discussion #922): 400 malformed body = caller bug (not retried); 500 = worker fault (engine may retry). This distinction is part of the receipt contract.

## 5. Authority boundary

The mechanism's core claim, stated in Arcade's own docs: the authorization question is
"Can this agent, acting for this user, perform this action on this resource?" Enforced as:

1. **Declaration at the tool layer**: each tool declares its minimum required scopes (requires_auth=GitHub(scopes=["repo"])) and secret keys. The tool author, not the agent, fixes the privilege ceiling.
2. **Per-call contextual enforcement**: at invoke time the Engine checks the (agent identity, user identity, tool reference, scopes, parameters) tuple against stored grants. The grant is per (user, provider, scopes), and the worker gets only the token for that grant, scoped to the tool's declared scopes. Effective permission = intersection of what the agent may call and what the owner actually granted, never the union. (Arcade rejects the two naive designs explicitly: shared service accounts bypass user access controls; handing the agent full user credentials gives unbounded blast radius on hallucination or prompt injection.)
3. **Credential custody**: OAuth tokens and API keys live encrypted server-side. They are injected into the worker's ToolContext at runtime. The client, the agent loop, and the LLM never see secret values. The tool reads them via context.get_auth_token_or_empty() / get_secret() inside the execution boundary only.
4. **Blast-radius channeling**: the agent sees the tool contract (name, description, input schema) and the receipt (value/error/requires_authorization); secrets travel on a separate channel the agent cannot observe. The error contract enforces this: `message` is agent-safe by construction, `developer_message` is server-only.
5. **Transport separation**: end-user delegation (OAuth via providers) is a different trust layer from Engine-to-worker invocation (HS256 JWT with a shared worker secret). Compromise of one does not imply the other; the worker never needs to understand OAuth.

Mapping to PING: PING's capability-kernel answers actor/target/action/constraints allow-or-deny. Arcade adds (a) authorization as a resumable multi-step state (pending grant -> re-invocation), (b) scoped credential injection at the execution boundary with a custody rule (agent channel never carries secrets), and (c) a receipt that records which grant authorized the call so an independent verifier can re-check it. PING does not currently have (a) or (b); that is the harvest.

## 6. Persistence semantics

- Grants persist per (user_id, provider, scopes) across process restarts and key rotations until upstream revocation. "Arcade also remembers the user's authorization tokens, so they won't have to go through the authorization process again until the token is revoked by the user."
- Refresh tokens are handled transparently by the broker; a mid-conversation expiry does not break the agent loop.
- Secrets (API keys) are stored encrypted server-side and injected per call; they are never persisted into tool definitions, logs, or receipts (the receipt carries authorization metadata, never token values).
- Worker secret (transport JWT key) is operator-managed; the historical CVE GHSA-g2jx-37x6-6438 (hardcoded default "dev") is a cautionary datum: transport keys must be rotated and must never be logged. Relevant if we re-derive a worker protocol: fail closed on missing secret, never a default.

## 7. Evidence / receipts

- Every execution returns a signed-by-protocol receipt: ToolCallResponse { execution_id, finished_at, duration_ms, success, output }. The receipt is the unit of evidence: it binds the engine-issued IDs, the tool reference, the outcome, and the timing.
- requires_authorization is a receipt, not an exception: it carries authorization_id + url + scopes + status, so the grant challenge is auditable and joinable to the later execution receipt that consumes it.
- Audit logging is listed as a first-class requirement of the agent-auth design ("Audit logging for compliance").
- The agent-safe/server-only message split (message vs developer_message) is an evidence-hygiene rule: the receipt given to the agent must be safe to store and replay; diagnostics stay server-side.

## 8. Retries / failures

- Typed taxonomy distinguishes retryable from terminal: TOOL_RUNTIME_RETRY (can_retry=True, optional retry_after_ms, optional additional_prompt_content for the retry prompt), TOOL_RUNTIME_FATAL (can_retry=False), TOOL_RUNTIME_BAD_INPUT_VALUE (400, caller bug, do not retry blindly), TOOL_RUNTIME_BAD_OUTPUT_VALUE (500).
- TOOL_RUNTIME_CONTEXT_REQUIRED: the distinguished "do not auto-retry; gather more context from the user/orchestrator first" state. This is the machine-readable equivalent of proof 12's fallback decision: the worker tells the orchestrator *what kind of* recovery is appropriate instead of the orchestrator guessing.
- Upstream failures are classified separately (UPSTREAM_RUNTIME_RATE_LIMIT vs AUTH_ERROR vs SERVER_ERROR), so the orchestrator can route: rate-limit -> backoff; auth error -> re-authorize (re-enter the grant lifecycle); server error -> retry.
- Network transport failures (timeout/unreachable) are their own family: no complete response was received, so idempotent retry is safer than for a partially-applied tool call. Note: the framework does NOT itself guarantee exactly-once across process death; the run_id/execution_id pair is the correlation key PING's event spine would use to enforce it. Do not claim more than the mechanism proves.

## 9. Revocation model

- User-initiated: revoke at the provider (standard OAuth revocation) or disconnect the app connection (Arcade_Apps "disconnect / fix connection" in the hub). Next authorize() re-enters pending.
- Scope upgrades re-trigger the challenge: new scopes = new grant.
- Refresh tokens keep grants alive silently; revocation is the only terminal transition, and it is owner-controlled.
- Worker-side: rotate the worker secret to cut off Engine-to-worker trust; the framework enforces nothing about rotation schedule (operator duty, and per the CVE note: never ship a default).

## 10. Tests (observed in the upstream repo)

From the upstream repo structure and PR file lists at the pinned SHA:
- `libs/tests/core/test_toolkit.py` and friends under `libs/tests/`: tool definition parsing, catalog, executor unit tests.
- `libs/tests/tool/test_create_tool_definition.py`, `test_create_tool_definition_errors.py`: contract-shape validation (bad schema -> definition errors).
- `libs/tests/arcade_mcp_server/integration/test_end_to_end.py`: HTTP integration including POST /worker/tools/invoke (a later PR removed three flaky concurrency tests but kept HTTP/stdio E2E coverage).
- `libs/tests/core/test_executor.py`: local executor semantics.
- The TS mirror (`arcade-mcp-ts`, `tests/integration/http-worker.test.ts`) pins the wire format across languages, which is evidence the protocol is a contract, not an accident.

I did not run the upstream test suite (out of scope for a harvest worker; the mechanism, not the code, is the deliverable).

## 11. Verdict: ADAPT

Reason: the mechanism is exactly what the WorkerAdapter direction needs for proofs 9-13, but it must be rewritten to PING semantics, not vendored.

- What PING already has: an event journal/spine, capabilities (actor/target/action allow-deny), missions with worker dispatch, evidence objects.
- What Arcade proves valuable that PING does not have:
  1. Authorization as a resumable state machine at the execution boundary (pending grant -> re-invocation), with requires_authorization as a first-class receipt instead of a failure.
  2. Scoped credential injection: secrets travel on a channel the worker/agent cannot observe, bound to (owner identity, scope set), injected only inside execution.
  3. A typed execution receipt (value | error(kind, can_retry, retry_after_ms, additional_prompt_content) | requires_authorization) that gives the orchestrator machine-readable retry/fallback/escalate decisions, and gives the independent verifier (proof 13) something to check that is not the worker's own success claim.
- Why not ADOPT as-is: the MIT license would permit it, but the framework is Python-first, carries its own identity/transport assumptions (HS256 worker secret, its own catalog), and would become a second authority over execution semantics inside PING. The harvest rule is primitives, not products. Re-derive the three pieces above as piging2-native: an AuthorizationGate in capability-kernel, a scoped ExecutionContext in trust-kernel, and a typed ExecutionReceipt that the event spine records as a canonical event.
- Why not REJECT: the WorkerAdapter direction (proofs 9-13) needs exactly this: a worker that cannot self-authorize, a grant the owner can see and revoke, and receipts a verifier can check independently. No cheaper source was found; the mechanism is proven at scale (thousands of tools, multi-provider OAuth) and the wire contract is pinned by cross-language tests.

## 12. SMALLEST MISSING PRIMITIVE

The tri-state authorization verdict with scoped context injection.

PING's capability evaluation today answers a boolean: allow or deny. The smallest primitive Arcade proves valuable is an authorization verdict that is NOT a boolean:

```
authorize(actor, owner, tool_ref, scopes) ->
  | ALLOW(context_ref)            # execution may proceed; context_ref binds scoped, opaque credential handles
  | REQUIRES_GRANT(grant_id, challenge_url, scopes)   # pause: resumable, not a failure
  | DENY(reason)                  # terminal
```

plus the custody rule: credential values are injected into the execution context inside the boundary and never cross into the worker's observable channel (the worker receives opaque handles; the receipt records the binding, never the value).

Why this is the minimal unit: without the third state, every missing grant becomes either a silent failure or an implicit escalation, and without the custody rule the verifier cannot distinguish "the worker proved its result" from "the worker saw the secret and could have faked the upstream call." Proofs 11-13 hinge on exactly that distinction: the injected bad result is rejected because the receipt carries a typed error the worker cannot forge into success, and the mission is VERIFIED only when the verifier independently confirms the grant binding in the receipt. Everything else (the full OAuth dance, the 23 providers, the catalog) is product surface we do not need.

Clean-room shape for piging2 (suggested, not copied): capability-kernel owns the gate; trust-kernel owns the credential vault and injection; the event spine records the receipt as a canonical event with run_id/execution_id; the receipt's agent-safe message vs server-only diagnostics split is kept verbatim as a rule.

## 13. Dependency analysis

- DEPENDENCIES: [] (zero). The harvest is a clean-room re-derivation of the mechanism; no Arcade code, SDK, or service is vendored or called.
- DEPENDENCY_COST: zero.
- If the coordinator later wants the upstream test corpus as reference, the only upstream artifact is the MIT repo itself; no package dependency is required to implement the primitive (needs only: a hash function, JSON serialization, an append-only store, all already in the PING substrate).
- Anti-dependency note: do NOT adopt the `arcadepy`/`arcadejs` SDKs or the Arcade Cloud API as a runtime dependency. That would make a closed-source third-party broker a live authority over PING execution. The whole point of the harvest is to own the primitive.

## 14. License finding

- arcadeai/arcade-mcp: **MIT License**, verified by reading the full LICENSE file at HEAD `78e9820938dc7f796a5c4cd0ea73d2cbe2c682d9`. Permissive, no copyleft. Attribution required if code is reused; this proposal re-derives rather than copies, but attribution to Arcade AI should be recorded in the manifest anyway.
- Official docs (arcade.dev, docs.arcade.dev): used as factual mechanism descriptions for clean-room re-derivation; no code copied.
- No GPL, LGPL, SSPL, BSL, or copyleft components involved. Nothing to flag for Nolan's license decision beyond the standard MIT attribution note.
- The Arcade Engine / Arcade Cloud broker is closed-source and was not read as code; the proposal does not depend on it.

## 15. Proof mapping

| proof_id | How this strengthens it |
|----------|------------------------|
| 9 (create one mission) | ToolReference + engine-issued run_id/execution_id give every mission execution a globally unique, receipt-addressable envelope. |
| 10 (worker returns result) | ToolCallResponse receipt { execution_id, finished_at, duration_ms, success, output.value } is the canonical "result" object; the worker's success claim arrives inside a structure the spine records, not as free text. |
| 11 (injected bad result is rejected) | Typed errors: TOOL_RUNTIME_BAD_INPUT_VALUE rejects malformed worker input at validation (400); TOOL_RUNTIME_BAD_OUTPUT_VALUE rejects malformed worker output at serialization (500). The message/developer_message split keeps rejection evidence agent-safe. |
| 12 (fallback attempt succeeds) | TOOL_RUNTIME_RETRY (can_retry, retry_after_ms, additional_prompt_content) and TOOL_RUNTIME_CONTEXT_REQUIRED give the orchestrator machine-readable fallback routing: retry, backoff, gather context, or re-authorize, instead of guessing. |
| 13 (mission VERIFIED only after independent verification) | The receipt binds execution_id + tool_ref + authorization context (which grant, which scopes, which owner) + duration. The verifier checks the grant binding independently of the worker's success bit, and requires_authorization is a receipt state the worker cannot forge into success. |
| 14 (replay reconstructs relevant state) | run_id + execution_id + created_at/finished_at + the tool input digest let the event spine reconstruct exactly which authorization context executed which tool when; replay is correlation-keyed, not log-scraped. |

## 16. Open questions / caveats for the coordinator

1. The framework does not prove exactly-once across process death; run_id/execution_id are correlation keys, and PING's event spine must supply the idempotency enforcement. Do not assume the receipt alone is sufficient.
2. The historical CVE GHSA-g2jx-37x6-6438 (hardcoded default worker secret "dev") is a design warning for any PING worker transport: fail closed on missing secret, never ship a default, never log secret values (the upstream TOO-985 fix removed secret logging on JWT validation failure).
3. The `inferrable` flag on input parameters (whether an LLM may infer a value) is a small, genuinely useful primitive for Ask FYD tool-calling later: mark which parameters the model may fill vs must be owner-supplied. Considered optional for the first slice; recorded here so it is not lost.
4. user_id is caller-supplied (email/UUID). PING must decide what its canonical owner identity is before the gate can bind grants; do not let "whatever string the caller passed" become the identity.
