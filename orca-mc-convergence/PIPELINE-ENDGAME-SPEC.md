# PIPELINE ENDGAME SPEC: engagement passes as a deterministic state machine

Lane: SPEC + SAFE-IMPLEMENTATION, engagement-pipeline convergence track.
Date: 2026-09-26. Status: SPEC (v1). Implementation: `~/workspace/outreach/pass_policy_engine.py` (SAFE subset, this lane).

This spec condenses the natural-language policy sprawl in the five
engagement-pass cron bodies into a small deterministic state machine, per
Nolan's 2026-09-26 directive. It adds no new authority and no new truth
store. It wires the existing machinery: guard, intent ledger, Pig drivers,
per-pass artifacts, the PING journal.

## 1. The nine stages and their contracts

```
DISCOVERY -> EVIDENCE -> POLICY ENGINE -> ACTION MANIFEST ->
INTENT LEDGER -> EXECUTOR -> OBSERVATION -> VERIFICATION -> EVENT STORE
```

The LLM sits BESIDE this pipeline. It discovers candidates, classifies
content, and drafts comment text. It never makes policy decisions, never
dedups, never verifies. Every stage boundary below names the exact
artifact that crosses it, so an LLM that forgets the rules still cannot
move the pipeline forward incorrectly.

### Stage 1: DISCOVERY

Input: platform, pass_id, seed targets (queues, seed-handle lists).
Output: candidate list. Each candidate carries at minimum:
`{account, url, action, posted_at?, evidence...}`.
Contract: DISCOVERY is read-only. No clicks, no likes, no follows, no DMs.
The executor of this stage is either a read-only Pig probe script
(`x-probe-discover.sh`, `ig-discover.js`) or a read-only browser task.
Failure modes owned here: probe timeout, CDP down, logged-out session,
zero candidates. All are typed events, never prose (see transition table
in section 3).

### Stage 2: EVIDENCE

Input: raw candidate list. Output: candidates annotated with the evidence
the POLICY ENGINE needs: normalized account identity, post URL, post age,
media type, comments-visible flag (IG reel rule), ad flag, identity-match
evidence (FB page check fields). Contract: EVIDENCE is deterministic
parse/normalize only. Anything the LLM judged (is this a business? is this
an ad?) is recorded as LLM_CLASSIFICATION evidence with the raw text it
judged, never as a policy verdict. The policy verdict lives in stage 3.

### Stage 3: POLICY ENGINE

Input: evidence-annotated candidates. Output: per-candidate decision
`SELECTED | REJECTED(reason_code)` plus a pass-level abort flag.
Contract: the engine is PURE and DETERMINISTIC. Same candidates, same
durable history, same caps -> same decisions, always. It is the only stage
allowed to say yes or no. Sub-stages, in order:
  1. GUARD_EVAL: never-re-engage check against durable history
     (`engagement-guard.py` check semantics; fail closed on unreadable
     history).
  2. REFUSE_EVAL: unknown-execution check against the intent ledger
     (fail closed on unreadable ledger; the whole pass aborts).
  3. EVIDENCE_EVAL: action has the evidence its contract requires
     (like/comment need a post URL; follow needs an account).
  4. FORMAT_EVAL: platform format rules (X: never like+comment the same
     post in one pass; FB: one page name per post in a job).
  5. CAP_EVAL: cap accounting against the pass cap table (section 5).
The LLM is NOT in this stage. No exceptions.

### Stage 4: ACTION MANIFEST

Input: SELECTED candidates. Output: the CLOSED action set, a JSON file
with one entry per action `{account, url, action, comment_file?}`.
Contract: the manifest is the complete and final list of what the
executor may do. The executor may do a subset, never a superset. The
manifest pins the pre-pass guard snapshot path so VERIFICATION can check
eligibility at selection time. Manifests live in
`hidden_files/engagement-passes/<platform>-actions-<ts>.json` (existing
convention, unchanged).

### Stage 5: INTENT LEDGER

Input: action manifest. Output: one `ACTION_INTENT_DURABLE` intent record
per action in `action-intent-ledger.jsonl`, then `EXECUTION` records when
handed to the executor. Contract: intent is durable BEFORE any browser
action. If this stage fails, the pass aborts; no executor starts without
durable intent. (Existing `action-intent-ledger.py` write-intents /
mark-execution; unchanged.)

### Stage 6: EXECUTOR

Input: action manifest + durable intents. Output: per-action results
`{account, url, action, ok, note}`. Contract: the executor performs ONLY
manifest actions, at human pacing, honoring the one-driver lock, halting
on restriction signals (driver exit 3). Executor implementations: Pig
drivers (`x-engage.sh`, `ig-engage.js`, `th-engage.js`, `run_pass.sh`,
TikTok equivalents) and closed-action-set browser tasks. The executor
never discovers, never selects, never drafts. A restriction signal is a
HARD STOP of the pass, surfaced, never retried in-pass.

### Stage 7: OBSERVATION

Input: executor results. Output: per-intent observation records
(EXECUTED / FAILED / NOT_ATTEMPTED) in the ledger, plus `record` calls
into the durable engagement log after every batch. Contract: observations
close intents. Missing observation after EXECUTION is UNKNOWN_EXECUTION,
never inferred. (Existing `record-outcomes` / guard `record`; unchanged.)

### Stage 8: VERIFICATION

Input: reported actions + pre-pass snapshot pinned in the manifest.
Output: violation list. Contract: every reported action is re-checked
against the snapshot. A VIOLATION (an action that was not ELIGIBLE at
selection time) is a real mistake and is surfaced. (Existing guard
`verify`; unchanged.)

### Stage 9: EVENT STORE

Input: stage events. Output: typed `MC_PASS_*` events appended to the
EXISTING PING journal (`fyd-journal-gateway/events.jsonl` via
`mission-control/emit.py`; no new store). Contract: the event store is
the only thing Mission Control reads. The prose pass logs in
`*-engagement.md` remain the human-readable history and the guard's
parse source; they are not the query surface. Every stage emits its
event as it runs (wiring is SEQUENCE work; the schema is
PASS-HEALTH-EVENT-SCHEMA.md).

## 2. LLM boundary: where it is allowed, where it is NOT

ALLOWED (beside the system, with contracts):
- DISCOVERY: find candidate accounts/posts; output is a candidate list,
  nothing more. Contract: read-only, returns evidence, no verdicts.
- EVIDENCE classification: is-business-account, is-ad, reel-has-comments,
  FB page identity match. Contract: returns `{verdict, evidence_text}`;
  the POLICY ENGINE decides what the verdict means.
- Drafting: comment text in the platform voice. Contract: verbatim text
  the executor posts; the engine checks length/sell/link rules only if
  encoded as deterministic checks (SEQUENCE), never by re-reading.

NOT ALLOWED (deterministic only):
- Eligibility decisions (guard), unknown-execution refusal (ledger),
  cap accounting, dedup identity normalization, within-pass dedup,
  manifest freezing, intent derivation, observation recording,
  verification, pass classification, event emission.
An LLM output that contradicts a deterministic check loses, always, and
the contradiction is logged as evidence.

## 3. The POLICY ENGINE state machine

Two machines: per-candidate decisions (section 4) and per-pass lifecycle
(this section). Both are implemented in `pass_policy_engine.py`.

### Pass states

- `PASS_CREATED`: scheduled, nothing done yet.
- `DISCOVERY`: enumeration running.
- `DISCOVERY_RECOVERY`: in-run troubleshoot of discovery (alternate
  strategy, bounded retries). NEVER defer to the next pass.
- `EVIDENCE_ASSEMBLED`: candidates with evidence, ready for policy.
- `POLICY_EVAL`: engine classifying candidates.
- `MANIFEST_FROZEN`: closed action set written.
- `INTENT_DURABLE`: intents written, not yet handed to executor.
- `EXECUTION`: executor running.
- `EXECUTION_RECOVERY`: in-run troubleshoot of execution (retry a leg,
  skip a dead leg, never hammer).
- `OBSERVATION`: results being recorded as intent observations.
- `VERIFICATION`: post-pass check against the pre-pass snapshot.
- `PASS_CLOSED`: terminal. Carries the terminal pass class.
- `PASS_HALTED`: terminal. Restriction/checkpoint stopped the pass;
  surfaced; next pass resumes at ramped caps.
- `PASS_ABORTED`: terminal. Fail-closed abort (guard or ledger
  unreadable, intent write failed). Stay-on: the schedule continues.

### Transitions (state --event--> state)

```
PASS_CREATED       --pass_start------------> DISCOVERY
DISCOVERY          --probe_timeout---------> DISCOVERY_RECOVERY
DISCOVERY          --suspect_enumeration---> DISCOVERY_RECOVERY
DISCOVERY          --auth_failed-----------> EVIDENCE_ASSEMBLED
DISCOVERY          --discovery_done--------> EVIDENCE_ASSEMBLED
DISCOVERY_RECOVERY --retry_discovery-------> DISCOVERY            (attempts < 3)
DISCOVERY_RECOVERY --recovery_exhausted---> EVIDENCE_ASSEMBLED
EVIDENCE_ASSEMBLED --policy_start---------> POLICY_EVAL
POLICY_EVAL        --guard_fail_closed-----> PASS_ABORTED
POLICY_EVAL        --ledger_fail_closed----> PASS_ABORTED
POLICY_EVAL        --policy_done-----------> MANIFEST_FROZEN
MANIFEST_FROZEN    --manifest_empty--------> OBSERVATION
MANIFEST_FROZEN    --manifest_ready--------> INTENT_DURABLE
INTENT_DURABLE     --intents_written-------> EXECUTION
INTENT_DURABLE     --intent_write_failed---> PASS_ABORTED
EXECUTION          --leg_done--------------> EXECUTION            (self)
EXECUTION          --leg_failed------------> EXECUTION_RECOVERY
EXECUTION          --restriction_signal----> PASS_HALTED
EXECUTION          --dependency_down-------> OBSERVATION
EXECUTION          --execution_done--------> OBSERVATION
EXECUTION_RECOVERY --execution_recovered---> EXECUTION
EXECUTION_RECOVERY --leg_skipped-----------> EXECUTION
EXECUTION_RECOVERY --execution_exhausted---> OBSERVATION
OBSERVATION        --observation_done------> VERIFICATION
VERIFICATION       --verify_done-----------> PASS_CLOSED
PASS_HALTED        --pass_close------------> PASS_CLOSED
PASS_ABORTED       --pass_close------------> PASS_CLOSED
```

Any event not listed for the current state is INVALID: the engine raises,
it never silently no-ops. In-run troubleshoot is encoded in the
`_RECOVERY` states and their bounded retries (discovery: up to 3 alternate
strategies per the recovery budgets; execution: one driver retry, then
skip the dead leg, never hammer). The only thing that stops a pass is a
hard platform block (checkpoint login) or a fail-closed abort; everything
else is diagnosed and recovered inside the run.

### Pass context flags

Carried through the run, all set by explicit events:
`discovery_attempts`, `enumeration_failed`, `auth_failed`,
`dependency_failed`, `guard_fail_closed`, `ledger_fail_closed`,
`intent_write_failed`, `restriction` (none | restriction | checkpoint),
`surface_drift`, `terminal_failure`, `candidates`, `eligible`,
`manifest_actions`, `actions_landed`, `violations`.
The terminal pass class is a pure function of these flags
(`classify_pass_terminal`).

## 4. Candidate decisions and REASON CODES

Per-candidate pipeline order (all deterministic):

1. GUARD_EVAL -> `engagement-guard.check`
2. REFUSE_EVAL -> intent ledger open unknown intents
3. EVIDENCE_EVAL -> action has required evidence
4. FORMAT_EVAL -> platform format rules
5. CAP_EVAL -> cap accounting

Decisions: `SELECTED`, `REJECTED`.

Reason codes (exhaustive; every REJECTED carries exactly one):

- `ALREADY_ENGAGED`: durable history shows prior engagement of this
  account or post.
- `BLOCKED_AMBIGUOUS`: fuzzy/identity-ambiguous match; fail closed.
- `GUARD_UNCHECKABLE`: candidate identity empty; cannot check history.
- `GUARD_FAIL_CLOSED`: guard raised or history unreadable. Aborts the pass.
- `UNKNOWN_EXECUTION_OPEN`: an open intent from a dead pass covers this
  candidate; deliberate reconciliation required, never auto-retry.
- `LEDGER_FAIL_CLOSED`: ledger unreadable. Aborts the pass.
- `NO_EVIDENCE`: like/comment without a post URL, or follow without an
  account.
- `PAIR_RULE_VIOLATION`: X only: like+comment on the same post in one
  pass (IG/FB like+comment pairs remain the standard pattern).
- `CAP_EXHAUSTED`: pass cap for this action already spent.
- `INVALID_ACTION`: action not in the platform's action set.

## 5. Cap table (snapshot 2026-09-26)

The cron bodies remain authoritative until sequenced to read this table.
Until then the table is a snapshot for the engine's cap accounting and
the panel's "actions vs caps" field.

- instagram: like 50, comment 12
- facebook: like 75, comment 20
- threads: like 45, comment 12
- tiktok: like 60, comment 20
- x: follow 5, comment 3, like 10

Weekly ramp (Nolan 2026-09-26, standing): +5 likes / +3 comments per week
per platform toward standing ceilings; X: +1 follow / +1 comment /
+5 likes per week, no ceiling. No-scale-back: a failed pass is retried,
never answered with lower caps. Caps are never halved, the ramp never
pauses. The ramp schedule itself stays a dated Nolan directive (prose
source of the numbers) until the cap table becomes the single writer.

## 6. Machinery mapping (wire, don't rewrite)

| Endgame stage   | Existing machinery | Disposition |
|---|---|---|
| DISCOVERY | `x-probe-discover.sh`, `ig-discover.js`, CDP probes, read-only browser tasks | KEEP, wire behind stage 1 contract |
| EVIDENCE | probe JSON outputs, pass candidate files | KEEP, schema pinned by this spec |
| POLICY ENGINE | `engagement-guard.py` filter/check (GUARD_EVAL), `action-intent-ledger.py` refuse (REFUSE_EVAL), cap prose | GUARD_EVAL + REFUSE_EVAL kept as the decision oracles; NEW `pass_policy_engine.py` owns ordering, caps, format rules, reason codes |
| ACTION MANIFEST | `*-actions-<ts>.json` in engagement-passes/ | KEEP, validator added (`validate_manifest`) |
| INTENT LEDGER | `action-intent-ledger.py` + `.jsonl` | KEEP, unchanged |
| EXECUTOR | Pig drivers (`x-engage.sh`, `ig-engage.js`, `th-engage.js`, `run_pass.sh`, TikTok), closed-set browser tasks | KEEP, unchanged |
| OBSERVATION | ledger `record-outcomes`, guard `record` | KEEP, unchanged |
| VERIFICATION | guard `verify` | KEEP, unchanged |
| EVENT STORE | PING journal via `mission-control/emit.py` (`MC_PASS_*` types added) | WIRE (append path; SEQUENCE to call from cron bodies) |

## 7. What gets RETIRED as prose (not as safety)

Retired (moved into the state machine or deleted):
- The per-cron PASS CLASSIFICATION paragraph -> `classify_pass_terminal`.
- The per-cron fail-closed paragraphs (guard exit 3, ledger exit 3) ->
  `GUARD_FAIL_CLOSED` / `LEDGER_FAIL_CLOSED` transitions to
  `PASS_ABORTED`.
- The per-cron "never re-engage" paragraphs -> GUARD_EVAL (unchanged
  mechanical rule, prose deleted from bodies when sequenced).
- The per-cron cap paragraphs -> cap table (section 5).
- The X pair rule ("never like+comment the same post in one pass") ->
  `PAIR_RULE_VIOLATION`.
- The FB job page-name uniqueness rule -> `validate_manifest`.
- The SCHEDULER RESILIENCE / recovery-budget paragraphs ->
  `DISCOVERY_RECOVERY` / `EXECUTION_RECOVERY` transitions with the same
  numeric budgets (3 alternates, 2 browser attempts, 2 auth attempts,
  5/10/20m backoff then 24h quarantine).

NOT retired (safety stays, in code):
- Never-re-engage guard semantics, intent ledger lifecycle,
  UNKNOWN_EXECUTION never-auto-retry, within-pass dedup, pre-pass
  snapshot verification, stay-on rule, restriction hard stop,
  one-driver lock, human pacing, per-account (not per-post) IG rule.

## 8. Acceptance

- Every transition in section 3 has a test (valid and invalid).
- Every reason code in section 4 has a test.
- Every fail-closed path has a test (guard unreadable, ledger
  unreadable, intent write failure, restriction mid-execution).
- `classify_pass_terminal` covers all ten pass classes.
- No new authority, no new truth store, no live cron behavior change.
