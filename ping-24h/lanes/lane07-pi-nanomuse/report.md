# Lane 07 Donor Report: Pi and nanoMuse

Status: **this report is a hypothesis until replayed from a clean checkout.**

Lane: `lane07-pi-nanomuse` | Inspection date: 2026-09-28 | Program T+0 2026-09-28 14:26 MDT

Mission focus used as the lens: composition of bounded subagents, scheduled and
durable autonomy without LLM retry loops, grounded retrieval and compiled
evidence, prevention of worker self-grant or objective drift, and failure
semantics when scheduled work dies mid-run.

Rules followed: READ ONLY everywhere (no push, commit, or tree modification);
all writing only inside `~/workspace/ping-24h/lanes/lane07-pi-nanomuse/`;
shallow donor clones only under `~/workspace/ping-24h/donors/pi/` and
`~/workspace/ping-24h/donors/nanomuse/`; no em dashes; no secrets printed or
persisted. UNKNOWN is a legitimate verdict and was used where evidence was
incomplete.

Primary sources: repository source and commit history of the two pinned clones,
their docs, changelogs, and licenses. This lane builds on
`~/workspace/runtime-harvest/wave1-donor-reports.md` and
`~/workspace/runtime-harvest/first-pass-findings.md`; it does not redo them.

---

## Donor card: Pi (Muse)

- Canonical repository: `https://github.com/earendil-works/pi`
  (formerly `badlogic/pi-mono`; moved to Earendil Works in May 2026 per the
  author's public migration post, DOCUMENTED)
- Clone: `~/workspace/ping-24h/donors/pi/pi`, shallow, `--depth 1`
- Pinned SHA: `fd889a2741891ee45116cb6131052d7fad220886`
  (commit 2026-09-28 20:59:29 +0100, "fix(coding-agent,tui): paste Finder file
  paths instead of icons (#10136)"), OBSERVED IN CODE
- Version/date: `coding-agent` package version `0.87.1`, OBSERVED IN CODE;
  release date UNKNOWN from the clone (no tags fetched). Activity: commit on
  the date of inspection, so ACTIVE as observed.
- License: MIT, copyright 2025 Mario Zechner, OBSERVED IN CODE (`LICENSE`)
- Language: TypeScript monorepo, OBSERVED IN CODE
- Deployment model: npm/pnpm CLI agent (terminal, headless/print/JSON, RPC,
  SDK entry modes), DOCUMENTED in README
- Agent composition model: a turn is composed of durable tasks
  (`pi.generation`, `pi.tool`, `pi.post_tools`, `pi.collapse`, `pi.job`,
  `pi.plugin`); tasks are resumable from persisted state, OBSERVED IN CODE
  (`packages/agent/src/harness/pico3/kinds/*`)
- Scheduling model: **no wall-clock scheduler found**. Durable task scheduler
  (`packages/agent/src/harness/pico3/scheduler.ts`) reopens persisted `running`
  tasks at their current phase; autonomy is resume-from-crash durability, not
  cron-like scheduled autonomy. OBSERVED IN CODE
- Retrieval/grounding model: context (system prompt sections and transcript
  context) is compiled deterministically from durable managed state; the model
  never assembles its own system context, OBSERVED IN CODE
  (`packages/agent/src/harness/pico3/system.ts`, `harness/context.ts`)
- Tool model: tool calls are durable tasks with a per-call `offered` set; the
  model proposes calls and a deterministic kernel validates them,
  OBSERVED IN CODE (`kinds/tool.ts`)
- Multi-agent semantics: no built-in subagent spawn found. Composition is via
  durable `createTask`, conversation forks with ownership edges, and
  bounded-delegation primitives (`handoff`, `terminate`, `addTools`),
  OBSERVED IN CODE (`kinds/post-tools.ts`, `kinds/task-api.ts`). Multiple
  conversations are not coordination.

### Pi mechanism 1: replay-safe tool contract with checkpoint-before-effect

PROBLEM: When an agent process dies mid-tool-call, reopening the session
either re-executes the effect (double side effects) or drops it silently, and
the retry decision is usually made by the model (an LLM retry loop).

INVARIANT (OBSERVED IN CODE, `packages/agent/src/harness/pico3/kinds/tool.ts`,
`packages/agent/src/harness/pico3/scheduler.ts`): an interrupted effect is
re-executed only if the tool author declared it `replay: "safe"` at BOTH the
checkpoint time and the current registration time; otherwise the interruption
surfaces as a typed synthetic error result, never silently dropped, never
blindly retried.

MECHANISM:
- A tool task checkpoints `{phase: "started", replay: "safe"|"unsafe"}` BEFORE
  invoking the effect; a validator rejects any code path that would transition
  in-flight without such a commit ("write it with rt.commit before the effect
  instead").
- On scheduler reopen, persisted `running` tool tasks resume at their current
  phase. Phase `started` re-enters the effect only when BOTH the persisted
  checkpoint and the currently registered declaration say `replay: "safe"`.
- Unsafe interruption produces a synthetic `interrupted` error result with a
  diagnostic code; the turn continues and the model sees an honest error.
- Handler invocation leases (`InvocationToken`) are revoked after every phase,
  so a resumed task cannot reuse a stale lease.
- The scheduler performs NO automatic retry: retry is an explicit handler
  return value. There is no LLM retry loop by default.
- Five terminal outcomes (success, error, blocked, aborted, faulted) with
  contract faults recorded as `faulted`, never rewritten as a declared domain
  failure.

WHY IT WORKS: the crash window between "decided" and "recorded" is closed by
committing the checkpoint before the effect. Safety of re-execution is an
author-declared property checked twice (then and now), not inferred. Capability
in time is bounded by per-phase lease revocation.

FAILURE IT PREVENTS: double execution of unsafe effects after crash; silent
drops of interrupted work; blind retry storms; orphaned in-flight tool turns;
and reclassification of harness contract faults as agent-level failures.

ASSUMPTIONS: tool authors correctly declare `replay` (default is unsafe, so
the default fails closed); the store (jsonl/sqlite) survives the crash; some
launcher or the user actually reopens the session so the scheduler can resume.

PING EQUIVALENT: ORCA restart/replay mechanics; PING's UNKNOWN external-effect
doctrine (an interrupted external effect becomes UNKNOWN, not silently retried).

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT, and Pi is mechanically STRONGER on
one axis. PING has the UNKNOWN doctrine, but Pi enforces replay safety with
code: a validator that refuses in-flight transitions without a pre-effect
commit, plus a two-time check of the safety declaration. PING's declared
lease semantics are comparable to Pi's per-phase invocation leases, but Pi's
per-phase revocation is a tighter temporal bound. PING is STRONGER on the
reconciliation axis: Pi has no observed external-effect reconciliation state
(unsafe interruption becomes an error result, not a HOLD).

TEST WE CAN STEAL: "interrupted unsafe tool does not re-execute on reopen;
surfaces interrupted error with diagnostic code"; "in-flight phase transition
without a pre-effect commit is rejected by the validator"; "handler contract
fault records faulted, not a declared failure outcome".

CODE WE ACTUALLY NEED: none (adapt the invariant and the tests; PING's store
types are its own).

Verdict: NEW INVARIANT FOUND.

### Pi mechanism 2: system prompt compiled from managed durable sections

PROBLEM: The model retrieves and mutates its own context; system instructions
drift from durable state; a handler that throws mid-preparation corrupts the
prompt the model will consume.

INVARIANT (OBSERVED IN CODE, `packages/agent/src/harness/pico3/system.ts`,
`harness/context.ts`, `packages/durable/src/harness/types.ts`): the model
never assembles its own system context. A deterministic preparation folds
durable managed entries into rendered sections; any edits made by a throwing
handler are rolled back; the prepared result is diffed against canonical
state before use.

MECHANISM:
- System sections are managed entries with stored `{value, rendered}`; the
  preparation seeds a draft from canonical state, hands the draft to registered
  `systemInstructions` handlers, and rolls back (snapshot/restore) every edit
  made by a handler that throws.
- Rendering happens after freeze; a prepared commit diffs desired vs canonical
  state; sections not registered by the current host are treated as removed
  and never rendered (unregistered code cannot inject prompt content).
- Transcript context is derived from immutable entries with `ContextEdit`
  omit/replace directives computed by preparation, not by the model.
- Missing or interrupted tool results are synthesized as honest error messages
  (never silently absent); unmatched late results are dropped; excluded stop
  reasons never enter context.
- A preparation snapshot (transcript head, settings, section-registry
  revision, tool-registry revision) is captured before scanning and compared
  after generation, fencing TOCTOU changes.

WHY IT WORKS: durable state is the only truth; rendering is deterministic host
code; failure is rollback, not corruption. The model consumes compiled
evidence, it does not author the compilation.

FAILURE IT PREVENTS: model-driven corruption of its own instructions via
context feedback; silent prompt drift across turns; hallucinated tool results;
unregistered code injecting system content.

ASSUMPTIONS: registered section render functions and `systemInstructions`
handlers are trusted host code (this is host-side, not model-side).

PING EQUIVALENT: Ask FYD evidence-bounded context; Mission Control
standing-context projection.

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT. Pi's mechanism is about system
prompt determinism and rollback; PING's is about evidence grounding and
provenance. They are complementary, not competing: PING could apply Pi's
snapshot/restore rollback to its own context preparation.

TEST WE CAN STEAL: "throwing systemInstructions handler rolls back all of its
edits"; "missing tool result is synthesized honestly and never absent from
context".

CODE WE ACTUALLY NEED: none.

Verdict: MECHANISM BENCHMARKED.

### Pi mechanism 3: offered-set kernel gating of tool calls (bounded composition)

PROBLEM: A worker that can call any registered tool can self-grant
capabilities; model-requested tool set expansion is silent authority growth;
aborting a parent leaves child conversations orphaned.

INVARIANT (OBSERVED IN CODE, `kinds/tool.ts`, `kinds/post-tools.ts`): a tool
call executes only if its name was in the `offered` set at preparation time.
Capability expansion (`addTools`) is a durable config change attributable to
host-registered tool code, never to the model's own request.

MECHANISM:
- The turn runner closes every call not in the preparation-time offered set
  with `not_offered`, before any tool code runs (kernel check).
- After-hooks cannot rename a call: an identity-mutating hook is blocked
  rather than honored.
- `beforeTool` hooks can block calls deterministically.
- Tool results may return `ToolControl`: `addTools` (durable change to
  selectedTools plus an audit event), `handoff` (new head entry and a successor
  `pi.generation` task: a bounded delegation boundary, not a raw
  continuation), `terminate` (ends the turn).
- Orphaned and aborted results are synthesized honestly; aborting a parent
  cascades to owned child conversations (`packages/durable/src/session/
  forks.ts` ownership edges).

WHY IT WORKS: the model proposes tool names; the kernel validates against the
offered list; composition primitives create new durable task boundaries with
ownership, so delegation is traceable and abortable.

FAILURE IT PREVENTS: worker self-grant of tools; hook-driven call identity
spoofing; silent capability expansion; orphaned child work on abort.

ASSUMPTIONS: the offered set is computed by trusted preparation code;
`addTools` names resolve to already-registered declarations (expansion of the
selected set, not of the registered set).

PING EQUIVALENT: ORCA executor capability eligibility; capability authority per
WorkOrder (per the first-pass baseline, PING's constitutional authority
semantics are stronger).

PING STRONGER-WEAKER-DIFFERENT: PING STRONGER on declared authority, but Pi
supplies a concrete kernel-level test: the offered-set check at execution
time. PING's authority model would benefit from this mechanical backstop.

TEST WE CAN STEAL: "call for a non-offered tool closes with not_offered and
never executes"; "hook-mutated call identity is blocked"; "abort cascades to
owned child conversations".

CODE WE ACTUALLY NEED: none.

Verdict: USEFUL TEST HARVESTED.

---

## Donor card: nanoMuse

- Canonical repository: `https://github.com/nano-muse/nanoMuse`
- Clone: `~/workspace/ping-24h/donors/nanomuse/nanoMuse`, shallow, `--depth 1`
- Pinned SHA: `d810baa04dd0f0de95e29d2b5023b8dd94a9c08e`
  (commit 2026-09-26 11:22:32 +0800, README refresh), OBSERVED IN CODE
- Version/date: CHANGELOG `0.1.16` dated 2026-09-26, OBSERVED IN CODE;
  `pyproject.toml` says `0.1.0` (packaging lag, OBSERVED IN CODE). Activity:
  created 2026-09-23, 16 releases in 3 days, commit 2 days before inspection,
  so ACTIVE and very fast-moving.
- License: GPL-3.0, OBSERVED IN CODE (`LICENSE` header)
- Language: Python backend/service, Android app, React web frontend, Docker
  files, OBSERVED IN CODE
- Deployment model: always-on local server plus Android client; server holds
  threads, background workers, goals scheduler, OBSERVED IN CODE
  (`nanomuse/server/service.py`)
- Agent composition model: `MuseAgent.run()` loops an LLM with tool calls
  until termination or max_steps; background goal passes run in their own
  thread and post a summary to the main thread, OBSERVED IN CODE
  (`nanomuse/agent/core.py`, `docs/architecture.md`). Separate threads share
  memory, goals, vault, and audit log. Multiple threads are not proven
  bounded coordination.
- Scheduling model: wall-clock background scheduler: proactivity levels,
  quiet hours, reminders with due queue, mail/event/webhook triggers,
  background goal passes with check-in cadences, OBSERVED IN CODE
  (`nanomuse/server/service.py`, `nanomuse/triggers/store.py`,
  `nanomuse/reminders/store.py`, `nanomuse/goals/store.py`)
- Retrieval/grounding model: SQLite memory with rare-word IDF ranking injected
  into the system prompt; optional embedding index fused in when configured;
  memory tidy-up where the model proposes and code disposes, OBSERVED IN CODE
  (`nanomuse/memory/store.py`, `nanomuse/memory/consolidate.py`)
- Tool model: every tool call is routed through the Sentinel gate: tool
  self-assessment (risk, target, egress, warnings) then deterministic policy
  evaluation then optional UI approval, then vault resolution, execution,
  redaction, taint, audit, OBSERVED IN CODE (`nanomuse/sentinel/gate.py`,
  `nanomuse/sentinel/policy.py`, `nanomuse/sentinel/grants.py`)
- Multi-agent semantics: app threads each have their own agent/conversation
  and workers, but they share stores; no bounded subagent spawn with authority
  delegation was observed. INFERRED: concurrent agents, not composed
  subagents.

### nanoMuse mechanism 1: Sentinel layered policy plus task-scoped capability grants

PROBLEM: Standing approvals quietly become blanket bypasses; background runs
inherit the user's full authority; dangerous calls get waved through by a
permissive mode; the model grants itself capabilities.

INVARIANT (OBSERVED IN CODE, `nanomuse/sentinel/policy.py`,
`nanomuse/sentinel/gate.py`, `nanomuse/sentinel/grants.py`): an approval is a
capability bound to (tool, target) with a lifetime; warnings can never be
waved through by mode or always-allow lists; taint can only escalate
ALLOW into ASK, never downgrade.

MECHANISM:
- `Policy.evaluate` runs a fixed order: (1) `deny_tools`, (2) explicit
  `[[sentinel.rules]]` with tool+argument globs, (3) always_allow/ask
  overrides, (4) risk x mode (ask/strict/auto), (5) taint escalation
  (ALLOW to ASK only, when private data was read and the call can egress to a
  non-allowlisted host), (6) warning override: a call with assessment warnings
  (`rm -rf`, `curl | sh`, env-reading code, file deletion) is forced to ASK
  unless an explicit rule allowed it. Mode and always_allow cannot bypass
  warnings.
- Approval creates a `Grant` bound to tool+target with scopes
  once/task/session/24h/always; task-scoped grants die at `end_task`.
- Standing grants are restricted: warnings get once-only; unknown egress
  targets with moderate or higher risk get no standing grant; `always`
  requires a target or non-SENSITIVE risk. The UI offers only legal options.
- Secrets are placeholders until execution; vault resolution happens only for
  tools that opt in (`accepts_secrets`); everything is redacted in transcripts
  and every decision is appended to a JSONL audit log.
- Grants are created only by the UI approval path or by policy
  (always_allow for non-dangerous calls). No agent tool can create a grant,
  so a worker cannot self-grant. The model proposes; code (policy + owner)
  disposes.

WHY IT WORKS: authority is a deterministic function of tool, arguments,
assessment, mode, taint, and explicit rules; the failure mode of each layer is
closed (first hit wins; only escalation afterward); blast radius is bounded in
time (task scope) and space (target binding).

FAILURE IT PREVENTS: worker self-grant of authority; permissive-mode
downgrade of dangerous calls; standing-approval creep into blanket bypasses;
secret leakage into tools that did not opt in; exfiltration after reading
private data (taint escalation).

ASSUMPTIONS: `assess()` classifies risk/egress/warnings correctly (a
mis-assessed tool is the weak link); the UI approval path is genuinely human
(`auto` mode converts ASK to ALLOW by owner choice, which is an explicit
unattended risk acceptance, not a bypass bug); tool+target binding is enough
granularity (grants bind to target, not to exact argument digests, INFERRED).

PING EQUIVALENT: CapabilityAuthority; per-mint policy recheck; secret broker
(Talos harvest: "PING has no per-mint policy recheck" is the gap this
addresses).

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT with a NEW INVARIANT PING should
steal. PING's constitutional authority semantics are stronger as declared,
but nanoMuse has a mechanical rule PING lacks: warnings are
never-waved-through, and taint can only escalate. The grant scopes
(once/task/session/24h/always) are a smaller, working implementation of
bounded capability leases.

TEST WE CAN STEAL: "warning call in auto mode still requires approval";
"taint escalation never downgrades a decision"; "task-scoped grant is dead
after end_task"; "secret placeholder unresolved for non-opted-in tool".

CODE WE ACTUALLY NEED: none (adapt the policy-order invariant and tests).

Verdict: NEW INVARIANT FOUND.

### nanoMuse mechanism 2: memory tidy-up where the model proposes and code decides

PROBLEM: Long-term memory written by the agent drifts from evidence; a
tidy-up merge can hallucinate facts into permanent memory; the agent can
silently delete what the user wrote.

INVARIANT (OBSERVED IN CODE, `nanomuse/memory/consolidate.py`): the model
proposes memory changes; code decides. A merged line may only contain words
already present in its source lines.

MECHANISM:
- A scheduled tidy-up asks the model for a JSON list of merge/drop proposals.
- `plan()` checks every proposal: known ids; no line touched twice in one
  pass; `_no_new_words` (every word longer than 2 chars and every CJK
  character must come from the sources, with a small fixed connective
  allowlist); drop is refused for lines the user wrote themselves
  (`source == "user"`); removal budget of 20% per pass (minimum 4 lines),
  with over-budget proposals deferred to the next scheduler tick.
- Every applied change is logged with before/after text and an undo path
  (`restore`).
- Memory retrieval itself is rare-word IDF ranking over SQLite with optional
  embedding fusion (`store.py`), injected into the system prompt at bounded
  count.

WHY IT WORKS: vocabulary closure makes "did the merge invent a fact"
mechanically checkable without another LLM call; the budget caps compounding
error per pass; user-written lines are a protected class; the change log makes
every mutation reviewable and reversible.

FAILURE IT PREVENTS: memory poisoning by the agent's own paraphrase; silent
deletion of user facts by tidy-up; runaway compounding rewrites across passes;
untraceable memory mutations.

ASSUMPTIONS: the connective/short-word allowlist cannot launder meaning
changes (INFERRED, not proven); `source` attribution is accurate; IDF ranking
is sufficient retrieval quality for the scale involved (SPECULATIVE at large
scale).

PING EQUIVALENT: PING's evidence model and Jev's classify-never-authorize
(journal as shadow sensor).

PING STRONGER-WEAKER-DIFFERENT: PING STRONGER on the provenance model, but
nanoMuse's no-new-words check is a SMALLER IMPLEMENTATION of evidence-bound
memory mutation that PING's journal pipeline could adopt as a cheap mechanical
gate before any model-proposed memory merge.

TEST WE CAN STEAL: "merge introducing a novel word is rejected"; "user-written
line cannot be dropped"; "over-budget proposal is deferred, not partially
applied".

CODE WE ACTUALLY NEED: none.

Verdict: SMALLER IMPLEMENTATION FOUND.

### nanoMuse mechanism 3: keyed event triggers with exactly-once firing and taint on wake

PROBLEM: Scheduled autonomy that re-fires after restart, replays history on
first connect, or becomes an LLM retry loop; a background run that read
private mail then exfiltrates it unattended.

INVARIANT (OBSERVED IN CODE, `nanomuse/triggers/store.py`,
`nanomuse/server/service.py`): each firing is recorded under a dedup key
(mail UID, event uid+start, hook delivery id); the same key never fires twice.
The first inbox look only sets the high-water mark and fires nothing.

MECHANISM:
- Triggers (mail, event, webhook) are created by the agent but fire through
  code: `fire_trigger` records the firing under its key and returns without
  effect if the key already fired.
- Mail polling uses an IMAP UID high-water mark; the first look sets the mark
  without firing (no history replay); bursts are capped at 20 per look.
- A firing becomes a background run inside the originating thread (bounded by
  the thread, visible in the app, summarized back when done).
- Firing on mail or event sets `sentinel.tainted = True` for the session: from
  then on, any network egress to a non-allowlisted host requires approval.
  Private-data wakeups are born tainted.
- Reminders keep a due queue; background passes respect quiet hours and
  proactivity levels; the agent loop itself has stuck detection (three
  identical assistant signatures) and a max_steps wrap-up. Autonomy is
  event-dispatch, not model self-scheduling: the model never wakes itself.

WHY IT WORKS: wakeups are code-driven event dispatch with a durable dedup
table, not model decisions; the dedup key is derived from the event, not from
the run; taint couples the wakeup cause to egress authority.

FAILURE IT PREVENTS: duplicate firings across restarts; inbox replay storms
on reconnect; unattended exfiltration after a private-data wakeup; the model
scheduling itself into a retry loop.

ASSUMPTIONS: the fired table is persisted before the background run is created
(order verified in `fire_trigger`: mark_fired precedes the send, OBSERVED IN
CODE); the server is alive for the watcher to run; what happens to a
background run that dies mid-turn is UNKNOWN from the source read so far (no
durable turn journal like Pi's was observed), which is the weaker point vs Pi.

PING EQUIVALENT: ORCA self-wake and tripwire economy (POLYROB wake-gate
harvest: gate self-wake on a change fingerprint).

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT. PING's wake-gate is
change-fingerprint based; nanoMuse's is event-trigger based with taint
coupling to egress authority. The taint-on-wake coupling is the part PING
lacks and should consider: a wake caused by private data should narrow egress
authority automatically.

TEST WE CAN STEAL: "a fired key never fires twice across restart";
"first inbox look fires nothing"; "mail-triggered session requires approval
for non-allowlisted egress".

CODE WE ACTUALLY NEED: none.

Verdict: MECHANISM BENCHMARKED.

---

## Cross-donor notes for the program

1. Pi solves mid-run death mechanically (checkpoint-before-effect, replay-safe
   contract, no silent drops); nanoMuse's background runs have the weaker
   point (mid-turn crash recovery UNKNOWN). For PING's 24h autonomy goal,
   Pi's replay contract is the model for tool effects, while nanoMuse's
   trigger dedup is the model for scheduled wakeups.
2. Both donors keep the model out of authority decisions by the same shape:
   the model proposes, deterministic code disposes (Pi's kernel offered-set
   check and lease revocation; nanoMuse's Sentinel policy and grant creation
   by UI only). Neither donor lets a worker self-grant.
3. nanoMuse's goal plan-rewrite path is instructive on objective drift: the
   agent may `propose` revised steps, but only an explicit accept (owner
   action) replaces pending steps, and finished steps are preserved. The
   agent can still edit goal metadata and mark steps done, which is audited
   but not mechanically prevented (OBSERVED IN CODE, `nanomuse/tools/
   goal_tools.py`, `nanomuse/goals/store.py`).
4. Neither donor has PING's constitutional authority layer; both are weaker
   there by design (they are personal agents, not constitutional systems).
   What they contribute is mechanical enforcement at the exact points where
   PING's first-pass baseline noted thinness: mint/recheck policy (Sentinel
   policy order), replay safety (Pi tool contract), and bounded memory
   mutation (consolidate no-new-words).

## What was not verified (UNKNOWN, not FAILED)

- Pi: release/tag dates (no tags in the shallow clone); the exact
  `InvocationToken` enforcement paths were read partially; generation
  snapshot-compare retry semantics were read but not exhaustively traced.
- nanoMuse: background-run crash recovery semantics; whether fired-key commit
  and background-run creation are in one transaction under process crash;
  retrieval quality of IDF ranking at scale; whether embedding index fusion is
  exercised in production configurations.

## Provenance of this report

Every mechanism above was read from the pinned shallow clones at
`~/workspace/ping-24h/donors/pi/pi` and
`~/workspace/ping-24h/donors/nanomuse/nanoMuse` on 2026-09-28, with claim
labels in the required vocabulary. No donor source was modified, no push or
commit was made, no live external action was taken, and nothing outside
`~/workspace/ping-24h/lanes/lane07-pi-nanomuse/` was written. Supporting
notes live in `raw/pins.md` in this lane directory.
