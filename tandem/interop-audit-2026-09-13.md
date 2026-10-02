# Interop Audit: Meta / Pig Machine Interface (2026-09-13)

Read-only audit. Nothing was changed, no Pig files written, no processes killed,
no CDP touched. Four parallel tracks: A (transport), B (worker chain),
C (gateway), D (protocols). A legitimate meta-pass.sh run was in flight
throughout; all Pig inspection was passive. Steering update from Nolan folded
in before finalizing: trace-first methodology, per-path inventory, marketing /
Tenant OS boundary, reusable-interface framing, implementation threshold.

## 0. Trace of record: run 20260913-125900-a-weak-website-hunt

The in-flight run completed during the audit: exit 3, `capture_failed` /
`validation_rejected` (6,847 chars, 0 numbered items, 3.3 min). Ledger:
`initiated_by: muse:manual-verification`, `auth_ref:
nolan-directive:live-verification-run-2026-09-13`, pack `6933baabbf`,
`ping_outcome: none`, sidecar correctly stamped `verification: failed` /
`ping_ingestion: not_attempted` (the continuity seam works live). The capture
is revealing: Meta responded conversationally to the CONTEXT PACK ("Done — your
research context pack is ready…") and never answered the appended TASK (the
task text sits at the end of the capture, unanswered). The validator correctly
rejected it.

Step-by-step classification:

| # | Step | Class |
|---|---|---|
| 1 | Muse decides to run brief `a` (rotation) | Agentic (per-run: selection only; the brief itself was authored once, earlier) |
| 2 | Cron invokes `meta-pass.sh <slug>` | Scheduling + deterministic |
| 3 | Pack builder assembles context from files; prompt = pack + brief | Deterministic (artifact handling) |
| 4 | Preflight, scp prompt + driver to Pig | Deterministic (machine interaction) |
| 5 | meta-ask.js drives meta.ai via CDP (open tab, type, submit, poll innerText) | Browser mechanics (deterministic code) |
| 6 | meta.ai generates text | Research reasoning (black box, Meta-side) |
| 7 | Driver writes answer file on Pig | Deterministic (artifact handling) |
| 8 | scp pull-back byte-exact | Deterministic (machine interaction) |
| 9 | Validator checks presence rules | Verification (deterministic rules) |
| 10 | Sidecar + exactly-one ledger line via EXIT trap | Deterministic (artifact handling) |

Trace-first findings:

- **Zero per-run agentic steps exist in the machine chain.** The only
  agentic moments are (1a) brief authoring (one-time) and (6) whatever
  reasoning happens inside meta.ai's black box. Everything else is
  scheduling, deterministic code, browser mechanics, or artifact handling.
  "Meta" is not an agent in this loop; it is a text generator behind a
  browser-automation driver.
- **Capabilities are therefore exposed for Muse, not for Meta.** Nothing in
  the trace shows Meta needing discovery, tools, files, or state. Every
  demonstrated need (transfer, browser, validation, retention, recording)
  is a Muse-side need.
- **The prompt blob is illegible to Meta.** Pack and task are concatenated;
  Meta answered the pack, not the task. The pack/task boundary must become
  explicit (task as the final delimited instruction), a prompt-structure fix
  demonstrated by this exact trace — not an interface fix.
- **Seven copies of the payload:** pack file -> /tmp fullprompt (cat) ->
  scp -> Pig prompt file -> typed into DOM in 400-char chunks -> innerText
  scrape -> Pig answer file -> scp -> /tmp .bin -> validator writes .md.
  Two copies are structural (cloud->Pig, Pig->cloud); the rest are staging.
  Target for reduction: validate/write directly from streams, drop /tmp
  staging where cheap. Not load-bearing today.

## 1. Objective

Find the smallest interface that lets Muse delegate a research job to the
Pig-side Meta worker with zero manual prompting, without creating another
orchestrator, scheduler, database, memory system, browser, watchdog, or
parallel truth system.

## 2. Existing communication mechanisms

### Transport

| Mechanism | Detail |
|---|---|
| SSH | `muse-ssh@100.79.154.43` via `nc -X connect -x hatch-egress-proxy:3130` (HTTP CONNECT). Ed25519 key, `BatchMode=yes` (key-only, fail-fast, zero interactivity), host key pinned to `~/workspace/pig/known_hosts` (fail-closed on rotation), `ConnectTimeout` 25s default (`PIG_TIMEOUT` overridable). Single choke point: `~/workspace/pig-fb/pig-ssh.sh` (`pig_ssh`, `pig_scp`). |
| Remote shell | cmd.exe. Single quotes break; payloads go as base64 UTF-16LE `-EncodedCommand` or double-quoted strings. Stdin-piped reads hang; payloads travel as arguments, never stdin. |
| Gateway HTTPS | `ping-gateway` container on the Pig, port 8080, bespoke REST. Live image `curious-squid-gateway:phase4-eventauth6` built from the curious-squid worktree, NOT canonical main (which lacks the auth files). |

### Capability

| Mechanism | What it exposes |
|---|---|
| Raw SSH exec | Unbounded command execution as `pig\muse-ssh` (can read nolan's pigi tree, query scheduler; cannot touch nolan's interactive session except via CDP :9223). |
| `POST /capabilities` (auth) | `fs.list/read/write`, `fs.patch`, `repo.inspect`, `git.status/diff/log` (+`branch/checkout/commit` for L2), `process.list`, `service.inspect`, `knowledge.search`, `event.search`. `command.run`/`test.run`/`build.run` hard-disabled; `git.push` blocked; `fs.delete`/`fs.move` unimplemented. 10MB cap, 30s timeout, 5 concurrent, path containment, audited to `capability_requests`. `GET /discover` (auth) for discovery. |
| Gateway REST (auth) | `/events`, `/canonical-events`, `/ingest`, `/missions`, `/ai`, `/connectors`. |
| Gateway REST (public) | `/ops`, `/governance`, `/constitution`, `/mc/*` (dashboard incl. queues/scheduler/workers reads), legacy HPP families. |
| Gateway REST (auth gaps, live) | `/orchestration/*` has NO auth middleware (missions create/dispatch, engine compile/loop). `/capabilities/stats` and `/health` public. `/health` returned 503. |
| meta-ask.js | The actual browser capability: CDP to 127.0.0.1:9223, new meta.ai tab (Nolan's logged-in session), types prompt in 400-char chunks into the contenteditable, polls `main.innerText` every 15s x36 (~9 min), measures growth beyond the prompt echo. Exit 0 ok / 2 no-input / 3 ANSWER_INCOMPLETE / 1 fatal. Raw capture always written. |
| meta-pass.sh | 8-stage worker: pack build -> prompt assembly -> CDP preflight -> scp -> remote node -> scp pull-back -> validation -> sidecar + JSONL ledger (EXIT trap, every exit path incl. signals) -> retention sweep. Exit 0/2/3 with stable classifications. |

### Authority

| Principal | Granted |
|---|---|
| `muse` Bearer (L1 "Observe") | Gateway caps above incl. **fs.write + fs.patch (live over-grant on an "Observe" profile)**. Workspace-scoped to `/app/workspace/muse`. |
| `muse-level-2` Bearer (L2 "Workspace Write") | L1 + git.branch/checkout/commit. |
| `pig\muse-ssh` (SSH account) | Raw exec; reads pigi tree; distinct from `nolan` (owns the interactive Chrome session). |
| Key custody | Bearer keys resolvable only via `docker exec` over SSH; never leave the Pig. `emit-observation.py` POSTs to the Pig loopback through SSH for exactly this reason. |

### Scheduling

Crons are cloud-side (cron docs). The gateway has NO schedule-creation endpoint (`/mc/scheduler` is status-read only; no `/schedule`, `/cron`, `/jobs`, `/tasks` routes). Mission submission/dispatch exists (`POST /missions` auth'd; `/orchestration/missions` unauth'd). Recurrence lives outside PING.

### What exists vs what is missing

- Present: transport, raw exec, a bounded audited capability contract (gateway), event/evidence substrate with replay, run ledger (runs.jsonl), versioned context packs, validation with fail-closed semantics, retention lifecycle, watchdog + CDP preflight.
- Absent: any job/task/queue API, any MCP/A2A/JSON-RPC surface (gateway speaks bespoke REST only; the one `mcp/` dir is a dead proxy to a non-running service), any long-running-job primitive on the gateway (30s cap), any machine-readable description of Pig-side worker capabilities, any structured job envelope (delegation = "run this script with a slug").

## 3. Delegation flow today (verified)

Cron worker reads `rotation.txt` -> `meta-pass.sh <slug>` (+ env initiator/auth) ->
`build-context-pack.py` -> prompt assembly -> `ensure-cdp.sh` preflight ->
`pig_scp` prompt + meta-ask.js to `C:/Users/nolan/.local/share/pigi/fb-engage/` ->
remote `node meta-ask.js` drives meta.ai via CDP (~10 min) ->
scp answer back byte-exact -> `validate-meta-answer.py` (>=3 numbered items,
>1200 chars, BOM/strict-UTF-8 decode) -> sidecar + exactly one `runs.jsonl`
line via EXIT trap -> `pig-retention.sh --apply` -> (later, manually) outreach
engine verifies businesses and emits PING observations.

## 3b. Per-path inventory

Columns: initiator -> recipient | transport / protocol | capability | payload
/ serialization | state identity | result identity | failure semantics |
durability | observability | resume. COPY/POLL/SCRAPE/RECONSTRUCT flags inline.

**P1 Muse -> Pig (delegation + transfer).** Muse -> `pig\muse-ssh` | SSH exec /
SCP over Tailscale+proxy | raw exec, file copy (to become named capabilities)
| meta-ask.js, prompt text, remote command string; cmd.exe quoting (fragile),
base64 UTF-16LE escape hatch | per-SLUG Pig files (`meta-answer-<slug>.txt`),
overwritten per run — NO run identity at the execution site (FLAG) | remote
answer path (slug-keyed) | SSH error/timeout 25s -> infra | persists until
overwritten / 7d retention | none Pig-side (FLAG: no Pig-side run log) |
re-run overwrites; idempotent by accident, not design.

**P2 Muse -> Meta (the "delegation").** Muse -> meta.ai | no direct transport;
mediated entirely through P8 | research reasoning (black box) | full prompt
blob (~7KB), typed into contenteditable in 400-char chunks (COPY) | none —
fresh tab per run, stateless | none from Meta's side; worker assigns local
filename | ANSWER_INCOMPLETE (growth detection), NO-INPUT, FATAL | none |
worker polls innerText every 15s (POLL) | n/a, retry = new tab. FLAG: prompt
blob's pack/task boundary illegible to Meta (trace §0: it answered the pack).

**P3 Meta -> Pig.** Does not exist. The model never touches the Pig; the
Pig-side driver (meta-ask.js) is a separate component (see P8/P9).

**P4 meta.ai internals.** Meta IS meta.ai; reasoning is a black box. We
observe text out only. No path to inventory.

**P5 Pig -> PING (observation emission).** emit-observation.py (invoked by
Muse over SSH) -> gateway loopback 127.0.0.1:8080 | SSH-tunneled PowerShell,
HTTP POST /events | event emission | JSON
{event_type: OBSERVATION_CREATED, aggregate_id, event_data{research_agent,
brief_id, verification_status, observation}} | aggregate_id
(`meta-ai-<brief>`) | event_id returned | exit 1 if no event_id | Postgres
ping_events, provenance stamped api:muse | gateway audit | re-emission would
double-emit — dedupe lives in the engine's judgment, not the protocol (FLAG).
Bearer key resolved via `docker exec` on the Pig and never leaves it.

**P6 Meta -> PING.** Does not exist BY DESIGN (PING boundary). Must stay that
way; see §9b.

**P7 scheduler -> worker.** cron -> meta-pass.sh | local exec | run research
pass | slug (rotation.txt) + env (META_RUN_INITIATOR/AUTH_REF) | argv/env |
run_id generated INSIDE script (TS-slug) | exit code + ledger line | worker
blocks ~15 min ("do not background and abandon") | ledger line, sidecar |
ledger | rotation advance is a SEPARATE worker step after script return —
stall risk if it dies between (FLAG; observed: rotation stuck on `a`).

**P8 worker -> headed Chrome.** meta-ask.js -> CDP 127.0.0.1:9223 (nolan's
session) | loopback HTTP, CDP via playwright-core | open tab, type, submit,
read innerText | prompt text / page text; CDP JSON; innerText SCRAPE | none
(fresh tab) | none from Chrome; worker writes file | NO-INPUT /
ANSWER_INCOMPLETE / FATAL; CDP down -> watchdog recovery (bounded) | none |
worker stdout lines; watchdog log | fresh tab, idempotent. FLAG: DOM scraping
is the least-contracted boundary; no locking — concurrent runs would collide.

**P9 worker -> filesystem (cloud + Pig).** meta-pass.sh <-> cloud files;
meta-ask.js -> Pig files | local fs / SCP | read/write | packs, prompts,
answers, sidecars, ledger | filenames (TS-slug) | same | write failure ->
infra/unknown | durable (ledger append-only; evidence preserved) | ledger |
timestamped files, safe re-run.

**Copies/polls/scrapes census:** 7 payload copies (§0), 1 poll loop
(innerText 15s x36), 1 scrape (innerText), 1 reconstruction (validator
re-parses text the worker already measured). Structural minimum is 2 copies
(cloud->Pig, Pig->cloud).

Hand-fed points remaining: briefs are static authored files; rotation advance is
a separate cron-worker step (stall risk if skipped); the verification/PING gate
is fully manual; `META_RUN_INITIATOR` is unenforced (ledger already shows
`unknown` initiators); if the Chrome window dies, only Nolan can re-login.

## 4. Protocol evaluation

### MCP — skip for now
Current spec (verified live): tools/resources/prompts split, `tools/list` +
JSON Schema + safety annotations (`readOnlyHint`, `destructiveHint`,
`idempotentHint`), structured `outputSchema`, transports stdio and Streamable
HTTP (old HTTP+SSE deprecated 2025-03-26; 2026-07-28 revision removed the
initialize handshake; official Tasks extension for long-running ops;
`traceparent` propagation in `_meta`). Genuine value: a model-discoverable
tool contract replacing hand-written prompt wrappers — but only once the Pig
exposes a multi-tool surface worth discovering. Today that surface is four
shell scripts; MCP's stdio transport is literally a subprocess protocol, so
adoption would be ceremony. Revisit if Pig-side tools need runtime discovery.
Sources: https://modelcontextprotocol.io/specification

### A2A — skip
v1.0.0 (Linux Foundation): Task = id, contextId, status state machine
(SUBMITTED/WORKING/INPUT_REQUIRED/AUTH_REQUIRED/COMPLETED/FAILED/CANCELED/REJECTED),
artifacts[], history[], `message/send`, `message/stream` (SSE), `tasks/get`,
AgentCard at `/.well-known/agent-card.json`, JSON-RPC/gRPC/REST bindings.
Genuine value: standardized delegation with negotiation (input-required
resume), streaming progress, opaque heterogeneous workers. We have one
orchestrator, one worker, one fixed schema, trusted parties — the JSONL ledger
already records state. Pure overhead today. This matches the standing decision
to defer `RESEARCH_TASK_ASSIGNED` until a second genuinely different worker
exists. Sources: https://a2a-protocol.org/latest/specification/

### OTel GenAI conventions — adopt the names now
Status: Development (repo moved to `open-telemetry/semantic-conventions-genai`).
Verified names: span `invoke_agent {gen_ai.agent.name}` (`gen_ai.operation.name=invoke_agent`,
kind CLIENT; attrs `gen_ai.agent.name/id`, `gen_ai.provider.name`,
`gen_ai.request.model`, `gen_ai.conversation.id`, `gen_ai.usage.input_tokens/output_tokens`);
span `execute_tool {gen_ai.tool.name}` (`gen_ai.operation.name=execute_tool`;
attrs `gen_ai.tool.name`, `gen_ai.tool.call.id`); payloads opt-in only, never by
default. Zero overlap with anything we have, zero cost, reversible: adopt the
naming in the ledger and any future telemetry; do NOT build a collector until a
consumer exists. Sources: opentelemetry.io GenAI docs + semantic-conventions-genai repo.

## 5. Candidate machine interfaces, evaluated

**Existing gateway capability contract.** Has discovery, typed execution,
audit, authority scoping — the closest thing to a real capability plane. But:
workspace-scoped to `/app/workspace/muse` (cannot reach pigi paths or CDP),
30s timeout (a 10-min research job does not fit), no job submit/status/result,
and it would drag research execution into PING's authority plane (PING should
stay the knowledge authority, not the execution plane). Extending it = gateway
surgery on a live auth boundary. Not the smallest seam.

**Thin MCP server on the Pig.** Would give Muse `tools/list` + schemas for
Pig-side tools. But the consumer would be Muse (meta.ai is a chat box; it
cannot use MCP — it only ever sees typed prompts), and we'd be building a new
server, transport, and auth for what four scripts already do. Premature.

**Plain SSH + files, formalized (recommended).** Zero new infrastructure. The
"interface" is a job envelope file in, the run ledger out, and a
machine-readable capability descriptor as the contract; SSH stays the hidden
transport. This is the smallest seam that closes the actual gaps.

## 6. Recommended seam

Framing: the deliverable is NOT a "Meta integration." It is the smallest
reusable agent capability interface that happens to make Meta its first
consumer: discover -> submit job -> observe status -> retrieve structured
result -> inspect artifacts -> verify -> emit to PING if authorized. Tomorrow
a browser worker, outreach worker, or data worker uses the same contract
without inventing its own SSH/prompt protocol (two bespoke SSH protocols
already exist: the engage.js path and the meta-ask.js path — that
reinvention is demonstrated, not hypothetical).

### Implementation threshold (all five stated, so a build is recommended)

1. **Current actual path:** Muse -> cron -> `meta-pass.sh <slug>` -> SSH/SCP
   -> Pig `node meta-ask.js` -> CDP -> meta.ai -> text back -> SCP ->
   validator -> sidecar + ledger. Delegation = "run this script with a slug."
2. **Exact bottleneck:** (a) the delegator cannot express WHAT it wants beyond
   a static slug — no structured objective/inputs/expected-output, and
   authorization lives in chat (ledger already shows `unknown` initiators);
   (b) worker capabilities exist only as shell scripts behind raw SSH, so
   every new consumer reinvents its transport protocol. Trace-observed
   corollary: the prompt blob's pack/task boundary is illegible to Meta
   (it answered the pack, not the task).
3. **Smallest missing capability:** the REQUEST side of the contract — a
   structured job envelope (identity + objective + inputs + expected output)
   and a machine-readable Pig capability catalog. Everything on the execution
   side already exists.
4. **Single best interface:** file-based job envelope + capability descriptor
   over the existing SSH transport. No new server, protocol, scheduler,
   database, or auth layer.
5. **Why existing infra cannot provide it:** the gateway's `/capabilities`
   is workspace-scoped, 30s-capped, has no job primitive, and must not
   become the execution plane (PING stays the knowledge authority); MCP/A2A
   are ceremony for one orchestrator + one worker; raw SSH has no contract
   at all. A typed delegation request exists nowhere.

### The build (file-level only)

1. **Job envelope** (`job.json` per run, written by the delegator, read by
   `meta-pass.sh`): `mission_id`, `run_id`, `parent_run_id`, `initiated_by`,
   `delegated_to`, `capability`, `objective`, `inputs` (brief_ref,
   pack_version), `expected_output`, `status`. This closes the continuity-audit
   gap: "why did this run exist / who delegated it" stops living in chat.
2. **Capability descriptor** (`pig-capabilities.json`, versioned): the
   machine-readable contract of what the Pig offers and which script implements
   each capability. The stable interface; SSH is never named in it. Typed
   output classes included (e.g. `research.ask` -> `unverified-external-research`).
3. **Ledger linkage**: `runs.jsonl` is already the RUN node. Set `run_id`
   from the job envelope so job.json (request) and the ledger line
   (execution) join on one id. Status observation = sidecar (`started` =
   running) + ledger line (terminal); no async status daemon until a consumer
   needs fire-and-for-get (today the worker blocks; the trace shows no such
   need). Optionally adopt OTel names (`gen_ai.conversation.id` = run/job id)
   in future telemetry.

Contract coverage against the reusable interface: discover =
pig-capabilities.json; submit = job.json + worker invocation; observe status =
sidecar/ledger; retrieve structured result = ledger `artifact_refs` +
`validation`; inspect artifacts = sidecar + raw files; verify =
`validation.run` + the Muse verification gate (§9b); emit to PING if
authorized = `emit-observation.py` (Muse-only, post-verification).

### Explicit non-builds

No MCP server, no A2A, no gateway changes, no second scheduler, no new
database/memory/event bus, no async job daemon, no Meta-side tooling (Meta
never sees the interface). Prompt-blob fix (explicit task delimiter as the
final instruction) is a separate tiny prompt-structure change, demonstrated
necessary by the §0 trace.

Key architectural point the audit forces: **the consumer of the machine
capability interface is Muse, not Meta AI.** Meta AI never sees SSH, MCP, or
JSON — it sees a research prompt and returns text. "Teaching Meta the machine"
means the Pig-side worker (meta-ask.js + substrate) operates behind a
`research.ask` capability that Muse invokes. Meta stays a prompt-in/text-out
research tool; Muse/Pig own the how.

## 7. Minimal capability set (derived from existing scripts, not from any example list)

- `research.ask` — brief+pack to meta.ai via CDP, return raw capture (meta-ask.js)
- `research.context` — versioned context pack from source artifacts (build-context-pack.py)
- `artifact.write` / `artifact.read` — byte-exact Pig transfer (pig_scp)
- `browser.status` — CDP preflight with watchdog recovery (ensure-cdp.sh)
- `validation.run` — answer presence validation, fail-closed (validate-meta-answer.py)
- `retention.sweep` — 7-day transfer-buffer lifecycle (pig-retention.sh)
- `job.record` — exactly-one terminal ledger line per invocation (EXIT trap)

## 8. runs.jsonl as the job/run record

Already the execution-level record: `run_id`, `initiated_by`/`auth_ref`,
`brief_id`, `research_agent`, `pack_version`, UTC start/end, `exit_code`,
`outcome`/`classification` (`ok|capture_failed|infra`, incl.
`terminated_by_signal_*`), `artifact_refs` (only files that exist),
`validation` (passed/rejected + chars/items), `ping_refs: []` +
`ping_outcome: none` explicit, `last_verified_state`, `resumable: true` with
idempotency note. With the job envelope's `run_id` joined to it, the pair
answers all twelve continuity questions with no chat history.

## 9. Transport / capability / authority, kept separate

- Transport: SSH (BatchMode, pinned host key, egress proxy) and gateway HTTPS.
  Constraints: never interactive, cmd.exe quoting discipline, 25s budget with
  fire-and-return for long jobs, proxy as single point of failure.
- Capability: gateway `/capabilities` (bounded, audited, workspace-scoped);
  `pig-ssh.sh` raw exec (unbounded — the reason the descriptor must name
  capabilities, not shell); `research.ask` (browser).
- Authority: L1/L2 Bearer profiles; `muse-ssh` account vs `nolan` interactive
  session (Chrome/CDP belongs to nolan's logon; the worker only touches it via
  CDP :9223); Bearer keys never leave the Pig.

## 9b. Marketing / Tenant OS boundary: what Meta's outputs may touch

Four distinct state classes; Meta's outputs must never cross between them
except through the named gates:

- **Research evidence** (immutable): raw capture (`.md` / `.CAPTURE_FAILED`),
  sidecar, ledger line. Written by the driver/validator/script. Never
  modified after the run. Meta contributes the text; the driver preserves it.
- **Observation** (PING substrate): a verified statement + source span +
  confidence, emitted as OBSERVATION_CREATED. Gate: Muse (outreach engine)
  independently verifies each business via web search first. Meta may never
  emit; P6 does not exist.
- **Derived intelligence** (Muse/outreach machinery): `prospect-digest.md`
  (content-hash-gated derivation), `pipeline.md` (operational prospect list).
  Not PING, not canonical; rebuilt, never hand-edited as truth.
- **Canonical business state**: the JSONL prospect record (Muse/outreach) and
  PING's canonical records (knowledge authority). Standing rule: PING is the
  common intelligence substrate, NOT a prospect/lead database; only
  high-quality, generalizable, verified intelligence enters PING (consumer
  needs, failure patterns, market signals — never per-business rows).

Guards that prevent structured research from becoming canonical tenant state
by accident (all live, all must be preserved by any future `research.ask`
capability): (1) `.CAPTURE_FAILED` suffix exclusion from extraction; (2) the
shape-only validator (never a truth check); (3) the Muse verification gate
before any pipeline/PING write; (4) the PING boundary rule (no per-business
events); (5) sidecar `verification`/`ping_ingestion` terminal states. The
capability descriptor should type the output class as
`unverified-external-research` so future consumers inherit the constraint.
TenantOS-side write permissions were not audited here; any future tenant
mutation needs its own authority check — the sanctioned flow stays: Meta
research -> evidence -> validation -> observation -> Muse/PING verification ->
authorized tenant capability.

## 10. Remaining unknowns (need live tests, not more reading)

1. meta.ai DOM stability: meta-ask.js is DOM-scraping (contenteditable,
   innerText polling). Any meta.ai UI change silently breaks the worker. This
   is the least-contracted boundary in the system; no spec protects it.
2. Concurrent meta-ask runs sharing one headed Chrome (CDP tab isolation)
   if a scheduler ever overlaps the watchdog or a second worker. Pig-side
   concurrency is unmanaged; no locks exist.
3. Whether the gateway could ever host a long `research.ask` job (30s cap,
   workspace scoping say no today) — needs a spike if ever wanted, not assumed.
4. Rotation-advance placement: keep as cron-worker step or move into
   meta-pass.sh. Either works; the split is today's stall risk.
5. Prompt-blob fix validation: after adding an explicit task delimiter,
   confirm over 2-3 live runs that Meta answers the TASK rather than
   riffing on the pack (the §0 trace shows the failure mode to watch for).

## 11. Security findings for Nolan (observed read-only, out of scope for the seam)

- L1 "Observe" profile live-grants `fs.write` + `fs.patch` (confirmed).
- `/orchestration/*` (missions create/dispatch, engine compile/loop) has no
  auth middleware — live 200.
- `/capabilities/stats` and `/health` public; `/health` returned 503.
- Live gateway image is built from the curious-squid worktree, not canonical
  main; promoting canonical main would drop the auth boundary entirely.
