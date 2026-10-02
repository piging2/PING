# DECISION BUDGET — Taxonomy, Auto-Resolution Rules, Escalation Payload, Metrics

Swarm 10 (Human Decision Budget), 2026-09-23. Companion to `ESCALATION-INVENTORY.md`.
Target: the converged TenantOS loop in `src/tenanos/**`.

## 1. Goal (binding)

**Zero UNNECESSARY human scheduling and debugging, not zero humans.** Every attempted
escalation — any point where autonomous execution pauses, defers, drops, fails, or asks —
is classified into exactly one of the ten classes below. The first four classes
**must not reach Nolan**; agents resolve them via the rules in section 3. The remaining
six classes may reach a human exactly once, carrying the minimum payload in section 4.

Anti-duplication: this taxonomy is a **pure classification function**, not a new
orchestrator, event authority, or capability system. It consumes existing sources
(source code, mission/approval/DLQ history, runtime state) and existing transports
(events, DLQ, Mission Control). It creates no new authority and no new store.

## 2. Taxonomy (10 classes)

Each class has a membership test. An escalation attempt belongs to the FIRST class whose
test passes, in the order listed (auto classes take precedence — that is the budget).

### Auto-resolve (must NOT reach a human)

**2.1 DERIVABLE_FROM_SOURCE** — The failure names its own fix.
Test: the blocking artifact carries a machine-readable cause AND a deterministic remedy
exists in the same codebase. Examples: `approval_conditions.blocked_by` (E-01/E-07:
`tests_failed` → re-run tests; `patch_validation_failed` → read validator output);
merge-gate `hint` fields (E-10); `no worker matched event_type` (E-21 → check the
capability registry for a matching worker or drop the mission type as unsupported);
`TRANSITION_BLOCKED` (E-28 → read the state machine's allowed transitions).
Resolution: apply the remedy, re-verify through the same gate, record the attempt.
Never ask.

**2.2 DERIVABLE_FROM_HISTORY** — An identical case was already decided.
Test: mission/approval/DLQ history contains ≥1 prior attempt with the same repeat key
(`mission_type + target`, `blocked_by`, `job_type + failure_reason`) AND that prior
attempt reached a terminal state with a recorded resolution.
Resolution: replay the recorded resolution (e.g., prior `failWithRetry` exhaustion for
the same `job_type` went to DLQ → route directly; prior consensus rejection for the
same mission type succeeded on re-dispatch with an extra worker → do that). If history
shows ≥3 consecutive failures with no successful resolution, stop replaying and treat
as SAFE_EXPERIMENT_AVAILABLE (2.4), not as a human question.

**2.3 DERIVABLE_FROM_RUNTIME** — Live state answers it.
Test: the answer is observable right now from scheduler, registry, queue, or table
state without human judgment. Examples: "no workers available" (E-14 → subscribe to
worker-registered and re-attempt; never silently drop); `getPendingApprovals` rows
(E-05 → the loop polls; a `pending_manual` row older than its TTL without a wired
resolver is itself reclassified — see 2.4); merge-queue `constitutional_review` entries
(E-11 → read `gate_results`; blocking violations are 2.1, the rest auto-advance).
Resolution: read state, act, re-check. The read must be fresh (no cached state older
than the attempt's own execution window).

**2.4 SAFE_EXPERIMENT_AVAILABLE** — A bounded dry-run decides it.
Test: there exists an experiment that is (a) side-effect-free or fully sandboxed,
(b) time-bounded (default ≤5 min), (c) evidence-recorded, and (d) reversible by
construction. Examples: DLQ `replayDeadLetter` with a sandbox `replayFn` (E-23);
re-running flaky tests/replay to distinguish flake from real failure (E-07).
Resolution: run the experiment, record the evidence, continue on success. On experiment
failure, escalate WITH the experiment evidence attached (class stays 2.4-derived but
routes human per section 4 — the experiment output is what makes the human decision
one-shot).

### Human-eligible (exactly-once, minimum payload)

**2.5 CREDENTIAL_REQUIRED** — A secret, token, or explicit configuration only a human
can provision. Test: progress is impossible without a value no agent may mint
(E-27: unconfigured environment; auth-context denials). Resolution path: ask once,
name the exact variable/scope, never ask twice for the same key (cache the request).

**2.6 AUTHORIZATION_REQUIRED** — A named human must say yes/no. Test: policy or design
requires a human decision (E-04 `approveManually`; E-12 review completion; E-24 DLQ
action; E-26 knowledge-promotion capture once wired). The question must be a real
judgment, not a disguised 2.1–2.4.

**2.7 DESTRUCTIVE** — The action cannot be undone. Test: effect is irreversible
(E-13 merging over a failed gate; committing to `main`; deleting data). Even when the
agent is confident, destructive actions go through the approval gate with the evidence
attached; the gate's job is to make "yes" cheap, not to add theater.

**2.8 PRODUCT_INTENT** — The question is what Nolan wants, not what is true.
Test: no amount of source/history/runtime/experiment answers it (E-17 priority
thresholds; E-25 whether a snippet deserves to become knowledge). Route to the ONE
canonical surface (`~/workspace/GRILLING-BRIEF.md`); never invent a parallel inbox.

**2.9 POLICY_CONFLICT** — Two standing rules disagree, or a rule is unwired.
Test: the escalation exists because policy is contradictory or unimplemented (E-02/E-03:
`manual`/`constitutional` statuses with no producer; the never-enumerated "8
consequential categories"). Resolution: record the conflict, apply the safer default
(fail closed), escalate the CONFLICT once — not every instance.

**2.10 OTHER** — None of the above. Test: fails 2.1–2.9. Requires a written reason why
it is not 2.1–2.4 (the burden of proof is on escalation). This class is metered
heavily (section 5): growth here means the taxonomy is incomplete.

## 3. Auto-resolution rules (binding, for classes 2.1–2.4)

**R1 — Consult the named source, not a guess.** Each auto class names its source:
2.1 → the blocking artifact itself (`approval_conditions`, gate `hint`, state machine
definition); 2.2 → mission/approval/DLQ history tables; 2.3 → live scheduler/registry/
queue/table reads; 2.4 → the sandbox experiment harness. An agent that cannot name the
source it consulted has not auto-resolved — it has guessed.

**R2 — Bounded attempts.** 2.1: one fix + one re-verification per distinct `blocked_by`.
2.2: replay at most one recorded resolution; on mismatch, stop. 2.3: re-check at most
3 times with backoff, then convert to 2.4. 2.4: one experiment per hypothesis.
Exceeding the bound without progress reclassifies to human-eligible WITH the full
attempt trace — never a bare "it didn't work."

**R3 — Record everything as evidence.** Every auto-resolution attempt appends:
`{site_id, class, source_consulted, action_taken, outcome, timestamp}` to the
mission/run evidence chain. Silent auto-resolution is forbidden — the budget is
auditable or it is theater.

**R4 — Never convert UNKNOWN into SUCCESS.** If the source is unreadable, history is
absent, runtime state is stale, or the experiment harness is unavailable, the class is
NOT satisfied. Fall through to the next class; if none fits, 2.10 with the reason.

**R5 — Repeat detection short-circuits.** Before resolving, compute the repeat key
(section 5). If the same key auto-resolved in the last 24h and the outcome was
failure, skip straight to the human-eligible path with both attempts attached. Loops
are the most expensive escalation of all.

## 4. Escalation payload spec (minimum for classes 2.5–2.10)

A human-eligible escalation MUST carry all of the following; anything missing bounces
back to the agent (a bounce counts against the agent's budget, not the human's):

1. `escalation_id` — deterministic: `esc_<hash(repeat_key + attempt_seq)>`.
2. `class` — one of 2.5–2.10, with the membership test quoted.
3. `context_ids` — mission/run/execution/capability/approval/DLQ ids; nothing else
   is needed to locate the work.
4. `attempted` — what the agent already tried, in order, with outcomes (the 2.1–2.4
   trace; may be empty only for 2.5/2.8 where asking first is correct).
5. `question` — EXACTLY ONE question, answerable yes/no or by picking an option.
6. `options` — the concrete options with tradeoffs and the agent's recommendation.
7. `default_if_silent` — what happens if the human does not answer within TTL, and the
   TTL itself (default 24h; 1h for DESTRUCTIVE-adjacent). Silence must be safe.
8. `evidence_refs` — event IDs, DLQ id, approval id, gate output — pointers, not dumps.
9. `reversibility` — what undo looks like if the human's answer proves wrong.
10. `repeat_key` — so the second occurrence is recognized as a repeat.

Delivery: 2.8 → `~/workspace/GRILLING-BRIEF.md` (the one canonical surface).
2.5/2.6/2.7/2.9/2.10 → Mission Control decision surface (the DLQ/approval views at
`gateway/routes/mission_control.js` are the existing read models; the write side —
approve/replay endpoints — is the E-04/E-23/E-24 gap this taxonomy requires closed).

## 5. Metric definitions

All metrics computed over a rolling 7-day window unless noted. Inputs are the recorded
attempts from R3 — no separate telemetry system.

- `escalation_attempts` — count of classification events (every pause/defer/drop/fail/ask).
- `escalations_per_mission` = `escalation_attempts / missions_terminal`
  (missions reaching completed OR failed). Target: trending down; absolute target < 2.0.
- `auto_resolve_rate` = `attempts_resolved_in_2.1–2.4 / escalation_attempts`.
  Target: ≥ 0.95. This is THE budget number.
- `human_escalation_rate` = `attempts_reaching_human / escalation_attempts` (= 1 − auto_resolve_rate, by construction).
- `repeat_escalation_rate` = `attempts whose repeat_key matched a prior attempt within 24h / escalation_attempts`. Target: < 0.05. Any repeat that reaches a human without a recorded decision change is a P0 process bug.
- `class_distribution` — attempts per class 2.1–2.10. Watch 2.10 (OTHER): growth means the taxonomy is incomplete; watch 2.9: growth means policy debt.
- `median_time_to_decision_auto` vs `median_time_to_decision_human` — the cost of each path, in minutes.
- `escalation_debt` — human-eligible escalations past TTL without resolution. Target: 0.
- `bounce_rate` — escalations bounced for incomplete payload (section 4) / human-eligible attempts. Target: 0 — bounces mean the agent is wasting the budget.

**Repeat-escalation detection (normative):** `repeat_key` =
`sha256(site_id | class | mission_type | target | blocked_by | failure_reason)`.
Two attempts with equal keys within 24h are repeats. The second repeat of a
human-eligible escalation must attach the first decision and state what changed;
a third repeat with no change is auto-closed as `wont_fix_pending_policy` and
counted in 2.9.

## 6. Instrumentation contract

Every site in the inventory gets a hook: `classify(attempt) → {class, rationale,
auto_action | escalation_envelope}`. The hook is a pure function call at the exact
point where execution currently pauses/drops/fails (the file:line in the inventory).
Hooks do not retry, requeue, or notify — they only classify and record. All action
stays in the existing loop; the hook only decides WHO acts next. Reference
implementation: `src/tenanos/decision-budget/` (taxonomy, auto-resolvers, envelope,
metrics, hook-points) — proposed as P-20260923-002.

## 7. Open policy questions for the coordinator (not Nolan)

1. The "8 consequential categories" (2026-09-19) were never enumerated in code or
   memory — should they be defined as the membership test for 2.6, or retired?
2. Should `merge()` from `constitutional_review` (E-13) require 2.7 approval always,
   or only when blocking gates failed?
3. DLQ `replayDeadLetter` (E-23): who is authorized to supply `replayFn` — any agent,
   or a named role?
