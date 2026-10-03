# Harvest Proposal: browser-use (browser-agent abstraction)

**VERDICT: ADAPT** (take the mechanism, rewrite to PING semantics)

## What was read (official docs and source only)

Repo: https://github.com/browser-use/browser-use
Pinned HEAD: `7be96ed8bafa8dfe1eef228b59cf5c884b8b2431` (2026-10-02 17:06 -0700, main branch)
License: MIT, verified from `LICENSE` in repo (Copyright (c) 2024 Gregor Zunic). No copyleft/SSPL/BSL flags anywhere.

Docs read (official):
- https://docs.browser-use.com/llms.txt (full documentation index, both halves)
- https://docs.browser-use.com/open-source/customize/tools/available.md (built-in action list)
- https://docs.browser-use.com/open-source/customize/agent/output-format.md (AgentHistoryList evidence API)
- https://github.com/browser-use/browser-use (repo metadata page)
- https://browser-use.com/posts/bitter-lesson-browser-agents (official architecture-direction post)

Source read at pinned SHA (shallow clone, depth 1, no modifications):
- `browser_use/tools/views.py` (full) - action param models
- `browser_use/browser/views.py` (full) - browser state models
- `browser_use/tools/extraction/views.py` (full) - ExtractionResult model
- `browser_use/tools/registry/views.py` (partial, ~100 lines) - RegisteredAction, ActionModel, ActionRegistry
- `browser_use/tools/service.py` (partial, extract tool ~200 lines) - extraction loop implementation
- `browser_use/tools/extraction/schema_utils.py` (skimmed) - JSON Schema dict to pydantic model conversion
- `browser_use/dom/views.py` (partial) - SerializedDOMState, DOMInteractedElement
- `browser_use/agent/views.py` (partial) - AgentOutput, ActionResult, AgentState, AgentBrain, StepMetadata
- `browser_use/agent/service.py` (partial) - step/take_step/run/multi_act, error handling
- `browser_use/browser/watchdogs/security_watchdog.py` (partial) - URL policy enforcement
- `browser_use/browser/profile.py` (partial) - allowed_domains/prohibited_domains/block_ip_addresses
- `pyproject.toml` (partial) - dependency pins

Hash inputs for SOURCE_SHA (files read in full, concatenated): `browser_use/tools/views.py`, `browser_use/browser/views.py`, `browser_use/tools/extraction/views.py`.

## Object model

**Action representation (the mechanism to harvest).**
- Each browser action is a pydantic BaseModel param class (`browser_use/tools/views.py`): `NavigateAction{url, new_tab}`, `ClickElementAction{index, coordinate_x, coordinate_y}`, `InputTextAction{index, text, clear}`, `ScrollAction{down, pages, index}`, `ExtractAction{query, extract_links, extract_images, start_from_char, output_schema, already_collected}`, `DoneAction{text, success, files_to_display}`, plus tab/search/keyboard/file/screenshot/pdf/dropdown actions.
- `RegisteredAction{name, description, function, param_model, terminates_sequence, domains}` in `browser_use/tools/registry/views.py`. Registration via `@registry.action(description, param_model=...)` decorator; the registry dynamically builds an `ActionModel` with one optional field per registered action name.
- The LLM emits `AgentOutput{thinking, evaluation_previous_goal, memory, next_goal, current_plan_item, plan_update, action: list[ActionModel]}` (validated, at least one action). `ActionModel.get_index()`/`set_index()` expose the element index for stale-index repair.
- `ActionResult` (`browser_use/agent/views.py`): `is_done`, `success`, `error`, `extracted_content`, `include_extracted_content_only_once`, `long_term_memory`, `attachments`, `images`, `metadata`. Validator invariant: `success=True` is only legal when `is_done=True`.
- Browser actions dispatch through `Tools.act(...)` into an event-driven browser session; `multi_act()` executes the model's action list with page-change guards.

**Browser state capture.**
- `BrowserStateSummary` (`browser_use/browser/views.py`): `dom_state: SerializedDOMState`, `url`, `title`, `tabs: list[TabInfo]`, `screenshot` (base64), `page_info: PageInfo` (viewport + page dims + scroll), `browser_errors`, `pending_network_requests`, `pagination_buttons`, `closed_popup_messages`, `state_error`.
- DOM: tree is serialized to an LLM string where interactive elements get integer indices (`llm_representation()` via DOMTreeSerializer); `selector_map: DOMSelectorMap` maps index to the real node. `DOMInteractedElement` records `node_id, backend_node_id, frame_id, x_path, element_hash, stable_hash, ax_name` so stale indices can be re-resolved by hash/xpath/accessibility name.
- `BrowserStateHistory` (past steps): `url, title, tabs, interacted_element, screenshot_path`; screenshots lazy-load from disk via `get_screenshot()`.

**Extraction loop (the mechanism to harvest).**
- `extract` tool: page HTML -> `extract_clean_markdown` (noise filtering, optional links/images) -> `chunk_markdown_by_structure` (100k char chunks, overlap prefixes for table headers, `start_from_char` continuation cursor, `next_start_char` in stats) -> one LLM call with a schema when `output_schema` is given.
- Structured path: `schema_utils.schema_dict_to_pydantic_model` converts the caller-supplied JSON Schema dict into a pydantic model at runtime; the LLM is invoked with `output_format=structured_model`; result is validated and serialized.
- Extraction results are typed: `ExtractionResult{data: dict, schema_used: dict, is_partial: bool, source_url: str | None, content_stats: dict}` stored in `ActionResult.metadata['extraction_result']`; the human/model-facing text is wrapped as `<url>...</url><query>...</query><structured_result>...</structured_result>`.
- Pagination dedupe: `already_collected: list[str]` (names/URLs/IDs from prior pages) is injected into the extractor prompt so cross-page crawls skip duplicates.
- Large results (>10k chars) spill to `FileSystem.save_extracted_content()` with `include_extracted_content_only_once=True` so the full text enters the read-state once and only a pointer stays in long-term memory.

**Agent execution loop.**
- `run(max_steps=500)`: while `n_steps <= max_steps`: pause check -> failure budget (`consecutive_failures >= max_failures + int(final_response_after_failure)`) -> stopped check -> `_execute_step` (per-step `asyncio.wait_for(step_timeout)`) -> `take_step` returns on `history.is_done()`.
- `step()`: Phase 0 captcha wait (`wait_if_captcha_solving`) -> Phase 1 `_prepare_context` (browser state snapshot, action-model refresh per URL, state messages) -> Phase 2 `_get_next_action` (LLM) + `_execute_actions` (`multi_act`) -> Phase 3 `_post_process` (failure counter, plan update, loop detector) -> `_finalize` (append `AgentHistory` to history).
- `multi_act` guards: `done` only as a single action; `wait_between_actions` between actions; `terminates_sequence` actions (navigate/search/go_back/switch) abort the remaining queue; runtime detection compares URL and focus target before/after each action and aborts on change.
- Error handling (`_handle_step_error`): InterruptedError returns; connection-like errors wait for reconnect (`RECONNECT_WAIT_TIMEOUT`) or set `stopped`; all other errors increment `consecutive_failures` and inject `ActionResult(error=...)` for the next step. Single-action steps with errors count toward consecutive failures; the run halts at the budget.
- Completion: `is_done()` only reports the terminal `done` action; `is_successful()` is the agent's self-reported outcome (None if not done). Official docs explicitly warn: `is_done` does not imply success; verify important external outcomes against the destination system. Optional `use_judge` runs an LLM judge over the trace (`JudgementResult{verdict, failure_reason, impossible_task, reached_captcha}`).

## ID scheme

- `uuid7str()` (UUIDv7) from the `uuid7`/`uuid_extensions` package: `AgentState.agent_id`, `Agent.id` (task id), `Agent.session_id`, `BrowserSession.id`, event-bus instance names. UUIDv7 is time-ordered, so IDs sort by creation.
- Tab IDs are 4-char: last 4 chars of the CDP `TargetID` (see `TabInfo` serializer). Not globally unique; scoped to a session.

## State transitions

- Agent: created -> running -> (paused | stopped | done | max_steps exhausted | failure budget exhausted). `AgentState{paused, stopped, n_steps, consecutive_failures}` is kept serializable for checkpointing.
- Browser session: bubus pub/sub event bus; events include `NavigateToUrlEvent`, `NavigationCompleteEvent`, `TabCreatedEvent`, `CloseTabEvent`, `BrowserErrorEvent`; watchdogs `LISTENS_TO`/`EMITS` declared as class vars.
- Page actions: proposed -> executed -> `ActionResult` appended to history; `done` -> terminal.
- No transition ledger: history is a list of `AgentHistory{model_output, result, state, metadata}` plus `StepMetadata` timing. There is no append-only journal and no replay-from-events; "replay" in this codebase means re-running the task.

## Authority boundary

- `BrowserProfile.allowed_domains` / `prohibited_domains` (glob or exact; allowed takes precedence; large lists auto-converted to sets, losing glob support) and `block_ip_addresses=True` (blocks IPv4/IPv6 URLs including localhost and private networks: the SSRF-adjacent primitive).
- `SecurityWatchdog` enforces policy on `NavigateToUrlEvent` (blocks pre-navigation, raises), `NavigationCompleteEvent` (catches redirects, navigates to `about:blank`), and `TabCreatedEvent` (closes offending tab). Policy failures emit `BrowserErrorEvent{error_type='NavigationBlocked'|'TabCreationBlocked'}`.
- `sensitive_data: dict` maps domain-or-key to secrets; message manager redacts values before LLM calls and the tools layer injects the real value at execution (`_detect_sensitive_key_name`, `redact_sensitive_string`). Secrets are not sent to the model.
- No actor/capability model, no per-action authorization, no revocation.

## Persistence semantics

- Optional `save_conversation_path`: conversation JSON written to disk. `FileSystem` persists large extracted content. Screenshots persist to disk paths. Browser profiles via storage state / cookie sync.
- Telemetry via posthog (enabled by default in the package).
- Not append-only, not content-addressed, not replayable. Persistence is logging and file spillover, not an event spine.

## Evidence/receipts

- `AgentHistoryList` API (official docs): `urls()`, `screenshots()`, `screenshot_paths()`, `action_names()`, `extracted_content()`, `errors()`, `model_actions()`, `model_outputs()`, `model_thoughts()`, `action_results()`, `action_history()`, `number_of_steps()`, `total_duration_seconds()`, `final_result()`, `is_done()`, `is_successful()`, `has_errors()`, `structured_output`.
- `StepMetadata{step_start_time, step_end_time, step_number, step_interval, duration_seconds}` per step; token usage summary via `token_cost_service`.
- Extraction evidence: `ExtractionResult` (schema, source URL, truncation flag, content stats) in `ActionResult.metadata`. This is the closest thing in the codebase to an evidence receipt.

## Retries/failures

- Step level: `consecutive_failures` counter, `max_failures` budget, optional `final_response_after_failure` (one last LLM attempt after budget exhaustion), per-step `step_timeout` with graceful timeout handling.
- Connection level: reconnect wait with `RECONNECT_WAIT_TIMEOUT`; browser-closed detection sets `stopped`.
- Action level: failure returns `ActionResult(error=...)`; the LLM sees the error next step and decides whether to retry (no automatic action retry, no idempotency keys on actions).
- CAPTCHA: step-start wait for the solver watchdog; outcome injected into context.
- Loop detection: `ActionLoopDetector` records executed actions; replan/exploration nudges fire after `planning_replan_on_stall` consecutive failures.
- Notable gap vs PING semantics: no idempotency keys, no UNKNOWN-outcome reconciliation (a client timeout can leave a run active server-side; docs say reconcile external actions before duplicating work).

## Revocation model

None. There is no credential/permission revocation, no action cancellation beyond `pause()`/`stop()`, and no mechanism to retract an already-dispatched browser action. Sensitive data handling is preventative (redaction), not revocable. Report as a gap: any adapted crawler must keep revocation/cancellation in PING's capability layer, not here.

## Tests

`tests/ci/`: `test_ai_step.py`, `test_action_timeout.py`, `test_action_loop_detection.py`, `test_action_record.py`, `test_action_save_as_pdf.py`, `test_action_blank_page.py`, `test_action_LoadStorageStateEvent.py`, `test_actor_mouse_scroll_anchor.py`, `test_agent_cloud_events.py`, `test_agent_download_paths.py`, `test_agent_planning.py`, `test_anthropic_serialized_tool_input.py`, plus `agent_tasks/`, `infrastructure/`, `integrations/`, `interactions/`, `models/`, `security/` directories and `tests/evaluate_tasks.py`. Tests were not executed in this harvest (read-only source review).

## Dependency analysis

The harvested mechanisms need only **pydantic** (already a PING dependency). Full browser-use pins include LLM vendor SDKs (openai, anthropic, google-genai, groq, ollama), `bubus` (event bus), `cdp-use`, `playwright`-level browser machinery, `browser-use-sdk`, `browser-harness`, `posthog`, `markdownify`, `pypdf`, `reportlab`: all REJECTED for harvest (none maps to a proof_id; the crawler stays a commodity worker, not an adopted runtime).
DEPENDENCY_COST: zero.

## Verdict: ADAPT, with reason

ADOPT is wrong: browser-use is a product (agent runtime), not a primitive. Its event bus (bubus pub/sub) is not append-only and not replayable; its actions carry no idempotency keys; its completion semantics are self-reported (`is_successful` is agent-claimed, and their own docs warn against trusting it). Adopting the runtime would import a second, weaker event/execution model into PING.

REJECT is wrong: the fixed action-schema design is genuinely proven at scale (117k stars, production agent fleets) and their own "bitter lesson" post documents why: typed actions + index-addressed DOM + a typed extraction envelope is what makes browser acquisition deterministic enough to be useful. The specific mechanisms below are the harvest.

ADAPT: take these mechanisms, rewrite to PING semantics (idempotency keys on actions, append-only canonical events, capability authz, PING evidence binding):
1. **Selector-index action addressing with stale recovery**: DOM serialized to an indexed element list, actions reference `index`, and `DOMInteractedElement{element_hash, stable_hash, x_path, ax_name}` provides the re-resolution ladder when indices go stale. This is the proven way to keep a commodity crawler deterministic across DOM churn.
2. **Typed extraction envelope**: `ExtractionResult{data, schema_used, is_partial, source_url, content_stats}` bound into every action result's metadata. This is the SMALLEST MISSING PRIMITIVE (below).
3. **`terminates_sequence` multi-action guards**: actions declare whether they invalidate the rest of the queued plan; runtime page-change detection (URL/focus-target diff) aborts stale queues.
4. **Fetch-boundary pattern**: allow/prohibit domain lists plus `block_ip_addresses` (no localhost/RFC1918 navigation), enforced pre-navigation AND post-redirect, mirroring the FYD trust-kernel URL boundary.
5. **ActionResult envelope discipline**: `success=True` only legal with `is_done=True`; errors always flow into the next observation. PING's worker-result contract (proofs 10-13) should keep this strictness.

## SMALLEST MISSING PRIMITIVE

A typed, provenance-carrying extraction result envelope at the crawler-to-evidence boundary: `{data, schema_used, is_partial, source_url, content_stats}`. Every acquisition output must declare which schema validated it, which URL it came from, whether content was truncated before extraction, and processing stats. Without it, downstream evidence cannot distinguish complete from truncated extraction, and schema drift is invisible. This directly feeds proofs 1-2 (ingest) and 3 (deterministic evidence-backed graphs): the envelope is what turns raw crawler output into evidence the graph can trust. AUTHORITY_OWNER: trust-kernel.
