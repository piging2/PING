# Harvest proposal: HumanLayer — human/agent execution control

Worker: leaf harvest worker. No repo touched, nothing committed (coordinator commits).

## What I read (exactly)

1. **Official spec, read directly**: `humanlayer/12-factor-agents`, `drafts/a2h-spec.md` (A2H Agent-to-Human protocol draft)
   - URL: https://github.com/humanlayer/12-factor-agents/blob/HEAD/drafts/a2h-spec.md
   - Rendered at commit `d20c728368bf9c189d6d7aab704744decb6ec0cc`.
   - License of this file: **CC BY-SA 4.0** (repo: Apache-2.0 for code, CC BY-SA 4.0 for content). FLAG for Nolan: prose/spec text is share-alike; mechanism extracted clean-room below, no prose copied.

2. **Primary source code, quoted verbatim inside a third-party research document** (provenance stated per item; research doc states its quotes were taken via authenticated GitHub API):
   - `humanlayer/humanlayer` — `humanlayer/core/models.py` at ref `760e769f` (2025-05-29): FunctionCallSpec/FunctionCallStatus shapes.
   - `humanlayer/humanlayer` — `hld/approval/types.go`: daemon Manager interface.
   - `humanlayer/humanlayer` — `hld/store/store.go`: Approval record.
   - `humanlayer/humanlayer` — `hld/mcp/server.go`: `request_approval` MCP tool.
   - `humanlayer/humanlayer` — `hld/PROTOCOL.md`: JSON-RPC 2.0 socket protocol.
   - `humanlayer/humanlayer` — `humanlayer/core/approval.py`: `as_completed()` behavior; poll loop (via interlock competitor note on 0.7.9).
   - `humanlayer/agentcontrolplane` at `eaa2a7ed1d9cb4e13dc53defaf420e36f481dcad`: ToolCall phase enum, ExternalCallID, verdict-as-prose, hard-coded hosted endpoint.
   - Research doc URL: https://github.com/flotilla-org/flotilla/blob/HEAD/docs/research/2026-08-21-humanlayer-openness-and-hitl-patterns.md at commit `0783446c431a7849738b6b3b7bdecaad5a52f754`.

3. Corroboration only (not relied on for model claims): hld PR https://github.com/humanlayer/humanlayer/commit/4a59d70ce8793077dcebabada83e2685a1c34157 (tests), fork docs mirrors, fork CHANGELOG (0.7.1 ResponseOption `interactive` flag), competitor note https://github.com/az-said/interlock/blob/HEAD/results/competitors/closed_and_protocols.md.

4. **LICENSE findings** (stated as verified against actual LICENSE files in the research doc; README in fork mirrors states "licensed under the Apache 2 License"):
   - `humanlayer/humanlayer`: **Apache-2.0** — repo deprecated (README replaced 2026-06-19, commit `99abe673`: "the code here is pretty much all deprecated"), hosted API it called (`api.humanlayer.dev`) is NXDOMAIN as of 2026-08-21.
   - `humanlayer/agentcontrolplane`: **Apache-2.0** — dormant since 2025-07-02, "ACP is in alpha".
   - `humanlayer/12-factor-agents`: **Apache-2.0 (code) / CC BY-SA 4.0 (content)** — the a2h-spec.md is content, hence the FLAG above.
   - No GPL, LGPL, SSPL, or BSL found anywhere in the harvested material.

Hash inputs: full URL list + commit SHAs + verbatim excerpts, saved at `inputs.txt` in this directory. `SOURCE_SHA = sha256:e6ab1081c001697911bf8ebcf02e57d28b0c65e24ea745daf15c748ad631cc55`.

## Object model

Two generations, same core shape:

**Gen-1 (hosted approval API, dead)** — two object kinds, both `run_id` + `call_id` keyed, spec/status split:

- `FunctionCall { run_id, call_id, spec: FunctionCallSpec, status?: FunctionCallStatus }` — "a request for human approval of a function execution."
- `FunctionCallSpec { fn: str, kwargs: dict, channel?: ContactChannel, reject_options?: ResponseOption[], state?: dict }`. `state` is opaque continuation context round-tripped untouched through the human interaction.
- `FunctionCallStatus { requested_at?, responded_at?, approved: bool|None, comment?, user_info?, slack_context?, reject_option_name?, slack_message_ts?, failed_validation_details? }`.
- `HumanContact { run_id, call_id, spec: HumanContactSpec, status? }` — the ask-a-question variant: `HumanContactSpec { msg, subject?, channel?, response_options?: ResponseOption[], state? }`; `HumanContactStatus { requested_at?, responded_at?, response?, response_option_name?, ... }`.
- `ResponseOption { name, title, description, prompt_fill, interactive }`. Requester-enumerated: the ways a human may say no / answer, and `prompt_fill` is pre-written text handed back to the agent so a rejection carries a **machine-actionable instruction**, not prose to interpret.
- `ContactChannel` = tagged union over `slack | email | sms | whatsapp`. Slack adds `allowed_responder_ids` (authorization list: who may answer), `thread_ts`, optional per-channel `bot_token`. Email adds `additional_recipients`, RFC-822 `in_reply_to_message_id`/`references_message_id`, Jinja2 `template`.
- Endpoints: `POST /function_calls`, `GET /function_calls/:call_id`, `POST /human_contacts`, `GET /human_contacts/:call_id`; admin side `POST/GET /humans`, `GET /humans/search?q=`, `GET /channels`; escalation verb `POST /function_calls/{call_id}/escalate_email`.
- A2H authority separation: **agent side sees a human as {name, description} only**; admin side holds name/description/prioritized contact channels. "The agent addresses a person, never an address. Delivery route is administrative data the agent cannot see."

**Gen-3 (hld local daemon, the most relevant generation)** — local approval store behind a unix socket:

- `Approval { id, run_id, session_id, tool_use_id?, status ∈ pending|approved|denied, created_at, responded_at?, tool_name, tool_input, comment? }`.
- Manager interface: `CreateApproval(runID, toolName, toolInput) → id`; `CreateApprovalWithToolUseID(sessionID, ...)`; `GetPendingApprovals(sessionID)`; `GetApproval(id)`; `ApproveToolCall(id, comment)`; `DenyToolCall(id, reason)`.
- Agent-side capture: an MCP tool `request_approval(tool_name, input, tool_use_id)`; the handler creates the record and blocks on a channel woken by an event-bus subscriber.
- Socket: JSON-RPC 2.0 on `~/.humanlayer/daemon.sock` (mode 0600), line-delimited JSON: `fetchApprovals`, `sendDecision` (`decision: approve|deny`; **deny requires comment**), subscription stream with `new_approval` / `approval_resolved` events. `MCP_AUTO_DENY_ALL` env escape hatch for testing the blocked path.
- **No expiry/deadline/TTL in any generation.** Pending waits forever. Explicitly documented gap.

**Gen-2 (agentcontrolplane, k8s CRDs)** — the anti-pattern: no `Approval` CRD; a pending human interaction is a **phase on ToolCall** (`AwaitingHumanApproval`, `ReadyToExecuteApprovedTool`, `ToolCallRejected`, `AwaitingHumanInput`, `ErrorRequestingHumanApproval`, `ErrorRequestingHumanInput`) plus an opaque `ExternalCallID` foreign key into the (dead) hosted API. The gen-1 rich verdict collapsed to `Status.Result = "Rejected: <comment>"` prose; `reject_option_name` discarded; one path recovers its own ID by string-splitting its own return value. Approval gating was per-MCP-server, all-or-nothing — per-tool/per-verb granularity was wanted (open issue #104) and never built. Everything is poll-based (`RequeueAfter: 5s`, no watches).

## ID scheme

- Gen-1/3: composite `run_id` + `call_id`; daemon approvals carry a string `id`; `session_id` scopes an approval to an agent session (Claude Code session); `tool_use_id` binds the approval to the specific tool invocation.
- Factor-7 intent model: `intent: "request_human_input"` with `question`, `context`, `options { urgency: low|medium|high, format: free_text|yes_no|multiple_choice, choices }` — the render hint so a surface draws buttons without parsing prose.
- ACP: Kubernetes resource names/UIDs, API group `acp.humanlayer.dev/v1alpha1`, label selectors for polling; child-agent delegation creates a child `Task` bound by labels, parent polls `AwaitingSubAgent`.

## State transitions

- Gen-1: requested (no status / `approved=None` — *unanswered is a first-class state, not a missing field*) → responded (`approved=true|false`, `responded_at` set, `user_info` records who answered, optional `reject_option_name` + `comment`). Terminal either way. Asymmetry enforced in the type: `as_completed()` raises `ValueError("FunctionCallStatus.Rejected with no comment")` — approval may be silent, refusal must carry a reason.
- Gen-3: `pending → approved | denied` (terminal). `sendDecision` with `decision: approve|deny`, deny requires comment. Resolution emits `approval_resolved`.
- ACP: `Pending → AwaitingHumanApproval → ReadyToExecuteApprovedTool` (then executes) or `→ ToolCallRejected`. `ErrorRequestingHumanApproval` on request failure.
- No path in any generation moves a decision back to pending or re-decides.

## Authority boundary

- Who may answer: `allowed_responder_ids` on the contact channel (gen-1); local user only for the daemon (mode-0600 unix socket). The decision record carries `user_info` (responding human).
- Approve = the proposed `fn` + `kwargs` (or `tool_name` + `tool_input`) may execute, once. Deny = do not execute; the denial's `comment`/`prompt_fill` returns to the agent as a re-plan instruction, not an abort.
- Gen-1/2: the hosted service was the authority (dead). Gen-3: the daemon owns the approval store locally. ACP's `ContactChannel` status even promoted vendor tenancy (`projectSlug`/`orgSlug`) into the CRD — anti-pattern, do not copy.

## Persistence semantics

- Gen-1: hosted backend (dead; NXDOMAIN). Gen-2: Kubernetes etcd persistence of Task/ToolCall CRDs; reconcile is poll-driven, no event watches, no webhook receiver.
- Gen-3 daemon: in-memory correlator (`sync.Map`, dual-indexed) per the implementation PR; decisions live only while the daemon lives — **no durable WAL described**.
- Factor-8 durability pattern from the essays (the only stated pattern): append the intent event → contact the human → `db.save_thread(thread)` → `break`. Persist, then break; resume by webhook. Never hold the pause in a call stack. The waiting predicate itself is derived (`awaitingHumanApproval()` checks whether the last thread event has the pending intent) — no second state machine beside the event thread.

## Evidence / receipts

- `requested_at` / `responded_at` on every status: latency and staleness computable without a separate audit trail.
- `user_info` identifies the responding human; `reject_option_name` / `response_option_name` records the chosen enumerated option for deterministic (non-LLM) consumption; `slack_message_ts` preserves the out-of-band receipt pointer.
- Gen-3: `approval_resolved` event; `responded_at` set on decision.
- ACP: OpenTelemetry spans for approval workflows (structured, but verdict-as-prose).

## Retries / failures

- SDK poll loop: no timeout and no recovery (per competitor analysis of humanlayer 0.7.9 `humanlayer/core/approval.py`). Default HTTP client timeout 30s (python clients).
- ACP: 5s poll loop; on request failure the ToolCall sits in `ErrorRequestingHumanApproval`; the ContactChannel controller cannot reach `Ready` without a live call to the dead hosted API (every ContactChannel permanently `Error` after the shutdown).
- Rejection-without-comment is rejected at the type boundary (not retried, not accepted).
- `MCP_AUTO_DENY_ALL` escape hatch exists to test the denied path without a human.

## Revocation model

**None, anywhere.** No generation supports revoking or amending an approval/denial. Denial is terminal; approval authorizes a single execution. Approval gating is pre-execution only — no post-execution complementary audit exists (the vsm assessment of ACP explicitly notes: no independent auditor actor).

## Tests

- hld implementation PR (#190, Ellipsis-generated summary): mockgen mocks for Manager/Store/APIClient interfaces; unit tests for store and poller; integration test for the approval flow; all pass with `-race`. I did not read the test files themselves.
- ACP: controller test files including a restored post-approval test (per PR #46 file list).
- I ran no tests and vendor no test code.

## Verdict: ADAPT (take the mechanism, rewrite to PING semantics)

Nothing here can be adopted as-is: the only real service is dead (NXDOMAIN); the daemon store is in-memory with no durability contract; ACP's pending-as-phase is the documented anti-pattern (never let the verdict live outside the resource as prose); no generation has expiry, revocation, or a real audit loop; the a2h-spec.md prose is CC BY-SA 4.0.

What is worth lifting is the **approval data shape** — the only part of HumanLayer that survived all three generations — mapped onto PING's proposal-kernel:
1. Spec/status split with the payload on the spec: the exact transition proposed (`fn`+`kwargs` / tool+input), contact channel, requester-enumerated response options, opaque continuation `state`.
2. Typed three-valued verdict on the status: undecided is a state, not a missing field; approved carries optional comment; rejected carries required comment + chosen option name.
3. `ResponseOption {name, title, description, prompt_fill, interactive}` so a refusal is a machine-actionable re-plan instruction.
4. `allowed_responder_ids`: who may answer is data, not code.
5. The asymmetry rule — approval may be silent, refusal must carry a reason — enforced in the type.

Plus the lesson ACP teaches negatively: the verdict must live ON the proposal resource as structured data, never reconstructed by string-parsing a prose field. And the lesson every generation failed to learn: add the expiry PING's design already contemplates — HumanLayer's lack of any deadline is its clearest "do not copy" finding.

## SMALLEST MISSING PRIMITIVE

**The typed verdict binding**: a proposal-kernel verdict record = `{ proposal_digest` (binding the decision to the exact proposed transition bytes), `verdict ∈ {undecided, approved, rejected}` (undecided first-class, not a missing field), `chosen_option_name?` (from requester-enumerated `ResponseOption`s with `prompt_fill`), `comment?` (required when rejected, enforced in the type), `responder_id` (bound to the allowed-responders set), `requested_at`, `responded_at }`.

PING's proposal-kernel already names "proposed transition → approval binding". What it lacks, and what HumanLayer proves valuable, is the **verdict half of that binding**: who decided, which enumerated option they chose, the machine-actionable reason text (prompt_fill/comment), and timestamps making staleness computable — with a verdict that is structurally distinct from the worker's own result claim. This is exactly what proof 13 needs: a mission becomes VERIFIED only when an independent verdict object referencing the proposal digest exists, and a worker's `ok: true` can never upgrade itself into one.

## Dependency analysis

Zero. Nothing adopted, nothing vendored, no packages. The harvest is a data-shape mechanism re-derived clean-room into PING semantics. `DEPENDENCIES: []`, `DEPENDENCY_COST: "zero"`.

## Mapping to proof_ids

- **proof 9** (create one mission): the proposal spec carries the ask — `fn`+`kwargs` / tool+input, enumerated response options, opaque continuation state.
- **proof 11** (injected bad result is rejected): structured rejection — required comment, chosen reject option, prompt_fill as the re-plan instruction; deny-without-reason rejected at the type level.
- **proof 13** (mission VERIFIED only after independent verification): the typed verdict binding — undecided/approved/rejected on the proposal digest, responder identity bound to allowed responders, worker claim never equal to verdict.

No proof_id → nothing else harvested. A2H human-directory/admin-side channel adapters, Slack/WhatsApp unions, and the ACP operator are OPTIONAL/REJECTED: no FYD proof needs them.
