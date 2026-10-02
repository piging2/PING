# TASK G REPORT: T-06 three-way HOLD/recovery comparison

Lane: read-only falsification/observation. No product tree, worktree, or served
directory was written, committed, restarted, or deleted. Only files under
~/workspace/ping-24h/sprint/h02-06/ were created. The frozen tree
/home/nolan/projects/ping was not touched. Jev was not called. No new paid
AI/API/infra spend.

Date: 2026-09-28 ~20:00 MDT (T+0 of the 100-hour sprint).

---

## VERDICT: COMPLEMENTARY, NOT COMPETING. CONVERGE THE SEMANTICS.

The corpus does not crown a winner, because the three implementations are not
three attempts at the same job. Executed for real against the same eight
fixtures, they own three different seams of the invariant
UNKNOWN EFFECT -> HOLD -> RECONCILE -> PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION:

- **f01 owns the durable HOLD record and the scheduler seam**: narrowed
  reaper predicate, parkHold (status='hold', outcome UNKNOWN,
  retry_eligibility=FALSE, reconciliation_required=TRUE, lease cleared),
  conditional claim, evidence-gated reconcileHold with exactly the four
  decisions and no synonyms.
- **S5 owns the dispatch-path refusal**: idempotency-keyed reconcile gate
  that refuses any retry after an uncertain attempt until the caller supplies
  a validated reconciliation record; duplicate attempts refused;
  never-overwrite artifacts; honest unknown-outcome signal on every
  unknown path.
- **classifyUnknownExecution owns the reconciliation decision**: the pure,
  total function over the evidence cube {effectProven, effectAbsent,
  attemptStarted} -> {MARK_SUCCEEDED_FROM_EVIDENCE, REQUEUE_AS_PENDING,
  RETRY_ATTEMPT_WITH_LINEAGE, HOLD_NEEDS_RECONCILIATION} + reexecute flag,
  plus the fail-closed projection (expired-lease running ->
  UNKNOWN_EXECUTION, never PENDING) and the legal-transition map.

How they compose: the classifier decides WHAT the evidence means; f01
persists the HOLD and enforces it structurally at the scheduler/DB seam;
S5 refuses blind redispatch at the transport seam until the reconciler
attests. The reconciler's attestation (S5's reconciliation record,
f01's reconcileHold evidence) is exactly the output the classifier
produces. Forcing a single winner would delete a seam the other two do
not cover.

Score: 24 cells. 20 CORRECT, 1 INCORRECT, 3 INAPPLICABLE.

The one INCORRECT is real and distinguishing: **f01 x fixture-06**.
A zombie complete() landing during the SAFE_TO_RETRY re-attempt 'running'
window matches f01's status='running' conditional and journals stale data
as the truth. f01 has no fencing-token / claim-generation conditional
(grep: zero hits across f01). Zombie-vs-reconciled and zombie-vs-HOLD are
safe (status conditionals hold); the re-attempt window is not. The semantic
register assigns attempt fencing to attempt-fencing.ts, a different
implementation. This is the seam f01 does not own.

The three INAPPLICABLEs are all classifyUnknownExecution (fixtures 05, 06,
07): it is a pure decision function with no dedup API, no result-write
path, and no persistence. That is a successful result, not a gap: it names
the seam boundary. Fixture 07 additionally surfaced a named vocabulary gap:
projectMission is fail-closed on f01's 'hold' status
("projectMission: unmapped status 'hold'"), so the classifier's
NEEDS_RECONCILIATION and f01's 'hold' row status are not yet aligned at
the projection seam.

---

## The runner

Harness (labeled HARNESS ONLY, NOT PRODUCT CODE, never wired into any
suite): [t06-runner/](sandbox://workspace/ping-24h/sprint/h02-06/t06-runner/)
with [README.md](sandbox://workspace/ping-24h/sprint/h02-06/t06-runner/README.md),
`run-corpus.js`, `harness/h-f01.js`, `harness/h-s5.js`,
`harness/h-classify.js`, `vendor-s5/` (labeled harness copies of the four
S5-branch files, extracted read-only via `git show
mc/lane-c-reconcile-gate:<path>`, comment header prepended only), and
[results.json](sandbox://workspace/ping-24h/sprint/h02-06/t06-runner/results.json)
(full per-cell observations). Run: `node run-corpus.js` in that directory.

All three implementations were executed for real, not simulated:
f01's real MissionRuntime against its real FakePool with a controllable
clock; S5's real adapter.js (branch blob) through the synthetic
transportFn seam; the real run-state-authority.ts imported via node's
native type-stripping (no transcription). Two harness-shape bugs found
during construction were fixed against the implementations' own tests,
not worked around: S5 reconciliation records require string fields
(per its self-test), and its completed envelope must carry the issued
work_order_id (per vendor.verifyResultEnvelope).

Verdict rule (uniform, deterministic): CORRECT unless a fixture-listed
hostile outcome is reachable through the implementation's own API
(then INCORRECT); INAPPLICABLE where the fixture's hostile path lives
at a seam the implementation does not operate, with the seam named.

## Verdict matrix

C = CORRECT, X = INCORRECT, - = INAPPLICABLE

| impl \ fixture | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 |
|---|---|---|---|---|---|---|---|---|
| f01 (reaper + HOLD record) | C | C | C | C | C | X | C | C |
| S5 (dispatch-path gate) | C | C | C | C | C | C | C | C |
| classifyUnknownExecution | C | C | C | C | - | - | - | C |

## Per-cell evidence (condensed; full detail in results.json)

### f01 x 01..05, 07, 08: CORRECT

- 01: ack-timeout parks HOLD (hold/UNKNOWN/retry_eligibility=FALSE/lease
  cleared); assign/reaper/getPending all refuse it; reconcileHold('succeeded')
  with evidence resolves once, effect_count exactly 1, second resolve matches
  0 rows.
- 02: narrowed reaper reclaims 0 started rows (stays 'running'),
  findOrphanedRunning surfaces it, parkHold parks it; the never-started
  expired-lease control row is still reclaimed to created (legitimate case
  preserved).
- 03: orphaned-started parks HOLD not FAILED; fail() matches 0 rows on HOLD;
  safe_to_retry without proof throws TypeError; PROVE ABSENCE corrects
  effect_count 1->0 with identity stable, re-attempt lands exactly 1.
- 04: proven-effect row parks HOLD; reconcileHold('succeeded') journals the
  recovered result exactly once with effect_count still 1 (no re-execution).
  Caveat: reconcileHold evidence content is caller-attested (non-empty
  check); structural enforcement (reconciler-only, from-hold-only,
  evidence-required) holds, and the automatic fail() path cannot touch
  HOLD (shown in 03).
- 05: duplicate submission resolves to one deterministic mission id
  (ON CONFLICT DO NOTHING); concurrent conditional claims: first wins,
  second matches 0 rows.
- 07: post-restart (fresh runtime instances, same store) neither scheduler
  claims the HOLD row; getPending hides it; reaper touches nothing;
  initialize() does not reseed; row byte-identical; no remint.
- 08: continued-HOLD note merges append-only into hold_record; after the
  crash the row is still hold/non-dispatchable/reconciliation_required;
  no dispatch path claims it; exactly one terminal transition (1 then 0
  rows). Caveat: notes held only in reconciler memory and never merged
  are lost; checkpointing is the reconciler merging via
  reconcileHold('hold', {note}).

### f01 x 06: INCORRECT (demonstrated)

Zombie complete() after SUCCEEDED reconcile matches 0 rows (safe);
zombie complete() while HOLD matches 0 rows (safe); but after
safe_to_retry -> created -> re-attempt running, the zombie complete()
matches the status='running' conditional and its stale data becomes the
journaled truth. f01 has no fencing-token / claim-generation conditional.

### S5 x 01..08: CORRECT (each with a named seam boundary)

- 01: 3x retry of an unknown intent -> exactly 1 transport invocation;
  unreconciled retry refused 'reconciliation_required'; valid record unlocks
  exactly one new attempt; attempt-1 artifact byte-identical.
- 02: the reaper-style automatic retry is refused. S5 has no reaper/lease/
  HOLD-record seam; its contribution is the dispatch-path refusal. Scope
  limit (from its own commit): the gate's memory is the evidenceDir;
  callers with separate dirs have separate gates.
- 03: retry-on-orphan refused; malformed reconciliation refused
  'reconciliation_invalid'; transport stays at 1.
- 04: re-execution-to-recompute refused without attestation; same-attempt
  resubmission refused 'duplicate_attempt'. S5 does not journal mission
  results; the reconciliation record's content is caller-attested
  (shape-validated, not truth-verified), which is the documented
  caller-owned design ("reconcile vs retry stays caller-owned").
- 05: duplicate submission refused 'duplicate_attempt'; idempotency key
  stable across attempt numbers (retry = same intent).
- 06: zombie attempt-1 write refused 'duplicate_attempt'; attempt-1
  artifact byte-identical; refusal logged in the append-only index as
  evidence. Mission-row outcome overwrite is outside the adapter seam.
- 07: post-"restart" (same evidenceDir) retry still refused; concurrent
  second caller refused; intent key stable across restart. S5 holds no
  mission rows; its HOLD-survives-restart is the refusal persisting via
  the append-only index.
- 08: mid-transport death propagates with no fake outcome; the
  dispatched-without-outcome index line (landed pre-transport) keeps the
  attempt uncertain; same-attempt retry refused; each unknown needs its
  own record; exactly one new attempt per record; index append-only
  (refusals + records preserved, nothing clobbered).

### classifyUnknownExecution x 01..04, 08: CORRECT

- 01: indeterminate evidence -> HOLD_NEEDS_RECONCILIATION, reexecute=false.
- 02: expired-lease running -> UNKNOWN_EXECUTION (never PENDING); control
  shows genuine created still -> PENDING, so the distinction the wide
  reaper destroys is preserved at the projection seam (R-C).
- 03: orphaned running and null execution row -> UNKNOWN_EXECUTION;
  HOLD directive; no legal edge UNKNOWN_EXECUTION -> FAILED (R-A).
- 04: effectProven -> MARK_SUCCEEDED_FROM_EVIDENCE, reexecute=false (R-B);
  legal edge NEEDS_RECONCILIATION -> SUCCEEDED exists.
- 08: same evidence re-run -> same directive (KB-05 crash-safe
  re-classification); UNKNOWN_EXECUTION may only enter
  NEEDS_RECONCILIATION (no limbo claimable state); no shortcut edges to
  SUCCEEDED/PENDING; NEEDS_RECONCILIATION -> RUNNING legal for the
  lineage-retry arm. Atomic commit and append-only notes are
  caller/store properties, not decision-function properties.

### classifyUnknownExecution x 05, 06, 07: INAPPLICABLE (seam named)

- 05: no intent-identity input, no dedup API, dispatches nothing; dedup
  lives at the intent-identity seam (f01 deterministic id + conditional
  claim; S5 key + duplicate_attempt).
- 06: no result-write path, no attempt state; zombie handling belongs to
  the write seam (attempt-fencing.ts per the register; f01 status
  conditionals; S5 never-overwrite artifacts).
- 07: stateless; HOLD survival is a store/index property. Gap named:
  projectMission throws fail-closed on status 'hold'; NEEDS_RECONCILIATION
  vs f01's 'hold' are unaligned vocabularies at the projection seam.

---

## Convergence semantics: who owns what

| Concern | Owner | The others |
|---|---|---|
| Narrowed reaper predicate (only never-started assigned rows reclaimed) | f01 | S5: no reaper; classifier: R-C projection equivalent |
| Durable HOLD record (hold/UNKNOWN/eligibility-FALSE/lease cleared/reconciliation_required) | f01 | S5: refusal-as-HOLD at dispatch; classifier: NEEDS_RECONCILIATION (vocabulary unaligned, see gap) |
| Evidence-gated HOLD exit (exactly 4 decisions, proof-typed) | f01 | classifier: decides which arm the evidence selects; S5: trusts the attestation |
| Blind-redispatch refusal at the transport seam | S5 | f01: structural non-dispatchability at the scheduler seam |
| Idempotency identity for retries | S5: key over intent bytes, attempt excluded; f01: deterministic mission_id, ON CONFLICT DO NOTHING | classifier: no identity dimension |
| Duplicate/zombie attempt handling | S5: duplicate_attempt + never-overwrite artifacts; f01: status conditionals (with the f06 window gap) | classifier: no write path |
| Reconciliation decision semantics (what counts as PROVE EFFECT / PROVE ABSENCE) | classifyUnknownExecution | f01/S5: caller-attested evidence |
| Attempt fencing (token/generation CAS) | NONE OF THE THREE (register: attempt-fencing.ts, other impl) | f01 x 06 INCORRECT is the proof |

Composition: classifier output -> reconciler attestation -> f01
reconcileHold evidence / S5 reconciliation record -> exactly one
re-execution or none. The three are layers, not rivals.

## What the corpus cannot distinguish, and the exact tests still missing

1. **The composition seam is untested.** f01 identifies intents by
   mission_id/logical_operation_id; S5 by sha256 over
   {missionId, runId, executionId, input_hash, tenant, capability}. No
   fixture drives one intent through f01's HOLD and then through S5's
   gate to check that a reconciler's PROVE ABSENCE in one vocabulary
   authorizes dispatch in the other. Missing: a cross-seam identity
   binding test (same intent -> f01 hold_record <-> S5 idempotency key).
2. **The fencing seam is untested against the corpus.** f01 x 06 is
   INCORRECT; the register's fencing owner (attempt-fencing.ts) was not
   in the three. Missing: run fixture 06 against attempt-fencing.ts and
   require the zombie write to match zero rows in the re-attempt window.
3. **The projection vocabulary gap is untested.** classify x 07 names it:
   projectMission throws on f01's 'hold'. Missing: a projection test
   mapping every f01 row status (created/assigned/running/hold/completed/
   failed/retry_pending) onto the canonical vocabulary without throws.
4. **S5's evidenceDir scope boundary is untested adversarially.** The
   gate is exact within one evidenceDir and best-effort across processes;
   callers with separate dirs have separate gates. Missing: a hostile
   test where the reaper-driven redispatch uses a fresh evidenceDir and
   must still be refused (it would not be, today, by S5 alone; f01's
   structural non-dispatchability is the backstop, which is exactly why
   the narrowed reaper must land in the reached runtime first per the
   Wave B T-07 verdict).

## Commands run (read-only)

- Read F-CORPUS-FLOOR.md, all eight corpus-t05 fixtures, B-WAVE-B-RECOVERY.md
- Searched 02-SEMANTIC-ASSET-REGISTER.md (sections 9-14) and
  03-DO-NOT-REIMPLEMENT-REGISTER.md before concluding locations
- Located: f01 at ~/workspace/f01-fix/; S5 at branch mc/lane-c-reconcile-gate
  commit 25e33e9; classifyUnknownExecution in tenanos-wave scratch
  run-state-authority.ts (integration-branch original unreachable from this
  sandbox; the four scratch copies are identical at the function level)
- Built t06-runner, extracted S5 via `git show` (read-only), ran
  `node run-corpus.js` -> 24/24 cells executed, results.json written

## Open items for the parent / GO

1. Convergence action per the register's own OPEN QUESTION (03#43/45):
   complementary, not competing. Wire order matters: the narrowed reaper
   must land in the reached runtime before HOLD is wired (Wave B T-07),
   S5's gate is a dispatch-path backstop with the evidenceDir scope limit,
   and the classifier is the decision function the reconciler should call
   instead of attesting blindly.
2. The f01 x 06 zombie window needs attempt fencing (attempt-fencing.ts)
   or an equivalent claim-generation conditional before f01's
   SAFE_TO_RETRY re-attempt path is trusted with consequential effects.
3. The 'hold' vs NEEDS_RECONCILIATION projection gap needs a vocabulary
   alignment decision before the classifier can project f01 rows.
