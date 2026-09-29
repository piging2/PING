# MEMORY.md — FYD/PING Convergence Program (standing record, Interval 09)

Read this file fresh at the start of every interval. It is the standing
record of the program: what was proven, what is still open, and what the
current interval must and must not do. Verbatim orders and full evidence
live in the files named below; this file is the distilled instructions.

- Verbatim Interval 09 order: `~/workspace/fyd-90h/INTERVAL-09-ORDER.md`
- Full Interval 08 evidence: `~/workspace/fyd-90h/hidden_files/integration-ledger-20260929-08.md`
- Binding Interval 08 order: `~/workspace/fyd-90h/INTERVAL-08-ORDER.md`

## 1. The interval law

**Interval 09 is not the interval after Interval 08. Interval 09 IS
Interval 08.** The interval boundary is not a frontier boundary.

Interval 08 proved the closed loop through the OUTCOME WINDOW but left the
window open. It completed the incident-zero credential work but left two
owner decisions (purge, client-secret reset). It created the 21-file stash
by accident and left it unclassified. Interval 09 closes those open loops.
It opens nothing new: no new product frontier, no new architecture, no new
infrastructure, no new authority.

If no new reached capability enters the product this interval, the honest
ledger answer is: NO SUBSTANTIATED INTEGRATION PROGRESS THIS PERIOD.

This interval is Nolan's and the assistant's, with coordinator use at Nolan's
explicit direction. (Corrected 2026-09-29: the earlier "No coordinator" line
was wrong. Nolan explicitly instructed "send a coordinator" with the Interval
09 order; the first coordinator was mistakenly cancelled before producing
results. Interval 09 is the learning interval; Interval 07/08 remain
regression invariants, not synonyms for Interval 09.)

## 2. What Interval 08 actually established (evidence, not claims)

The composed primitive, proven across three intervals, is now:

UNDERSTAND → EXPLAIN WHY → OWNER CORRECTS → CORRECTION SURVIVES
→ AUTHORIZED ACTION → INDEPENDENTLY VERIFIED EFFECT → OUTCOME WINDOW

FYD is no longer treated as primarily a website generator. This is the
first primitive version of the closed-loop operating system for a business.

### The one action's full trace (real, reached)

FB comment `8cfeddea8fee41e598630b2c36330f22`, pass `fb-20260929-173026`,
post `https://facebook.com/groups/2646836605529865/permalink/4997700947110074/`:

- INTENT recorded 17:30:32Z
- AUTHORIZATION allowed (guard pipeline, pipeline-attested not per-action-receipted)
- ATTEMPT execution record 17:30:41Z
- RESULT: EXECUTED (worker's claim: comment text visible)
- VERIFIED EFFECT: EFFECT_CONFIRMED — independent `facebook-cli` read 18:45Z
  shows the comment present (observer channel differs from worker evidence;
  self-verification is refused by design)
- OUTCOME: NO_SIGNAL — 0 replies observed 55 min after RESULT; the window
  was honestly left open
- CANDIDATE LEARNING: none proposed — n=1 no-signal is not sample support,
  refused per the learning law

Outcome ledger code: commit `7f2dabf` on `fyd/i08-outcome-ledger`
(verify-effect / record-outcome / propose-learning / trace). 22/22 tests
pass from committed bytes. Hard distinctions enforced in code: RESULT is not
EFFECT; EFFECT is not SUCCESS; SUCCESS is not BENEFICIAL OUTCOME.

### Served line state

- Why This + regen whitelist opened narrowly for the literal tenant
  `ping-fyd` only (commits `bf760391`, `8cf1a390`, `a8957e3f` on
  `fyd/convergence-2026-09-28`). Served :3100 build `CTfvku8OQWWqrG8pKnSy7`
  @ `a8957e3f`. Deny-by-default unchanged: `acme-corp` still refused with
  typed errors, verified live.
- Interval 07 correction survival RE-PROVEN on the new build (regression
  invariant, not the frontier): SOURCE X -> OWNER CORRECTION Y ->
  REGENERATION -> SOURCE REOBSERVATION X -> PRESENTATION STILL Y.
- Event spine traced, not assumed: UnifiedEventRuntime -> `ping_events` @
  `brain-postgres`/`ping_runtime` (NOT ping-postgres). Served image differs
  from repo HEAD (exterior-auth backport present in served, absent in HEAD).
  IEventAuthority and EventRepository are UNREACHED-CANDIDATE (repo-only).
  ConstitutionalEventStore does not exist. AcquisitionManager does not exist
  as a named class; the acquisition handoff exists (79 live
  OBSERVATION_CREATED rows via POST /events). Replay chain is REACHED in
  production (68 live REPLAY_COMPLETED verdicts); mission replay and
  projection rebuild remain UNPROVEN.
- X probe/write-driver timeout fixed minimally: commit `8aed816`
  (probe-before-follow, read-only probe fails closed fast, retries name
  their dependency: lock release / probe completion; bounded backoff; no
  retry while the dependency is held or UNKNOWN; UNKNOWN -> OBSERVE ->
  RECONCILE for consequential ambiguous effects).

### Security state (incident zero)

All exposed live authority is dead or rotated, independently proven:
Google x4 dead per Google, HF x2 dead per HF, postgres superuser rotated
with the live consumer verified healthy, Qdrant key proven useless, webhook
secret empty, private key never committed. Containment commit `b0b82f6`
(local only, on `incident-zero/containment-20260929`; public
`origin/constitutional-trunk` untouched at `74fbb74`). The blobs remain in
public history — purge was not authorized in Interval 08 and remains
Nolan's separate decision.

### Holds state

- `f21ba933`: SUPERSEDED, untouched. No unique reached runtime capability.
- `fyd/builder-rebuild-v1`: corrupt ref repointed to `85faad17` under
  Interval 08's explicit authorization; zero unique commits vs HEAD.

### Convergence state

14 semantic groups classified against the served base: T1-T4 (turn-origin),
A1-A5 (acquisition), P1-P5 (portability). T1-T4 + A1-A5 approved pending
staged execution (one group at a time, tests per group) — the ledger says
"10 groups" but T1-T4 + A1-A5 is 9; reconcile before executing. P1-P5 held
pending Nolan's scaffolding-vs-capability decision. Nothing harvested yet;
no wholesale merges, ever.

## 3. Binding instructions for Interval 09

### 3a. Security completion

PUBLIC HISTORY PURGE: AUTHORIZED CONDITIONALLY. First produce the exact
rewrite set: AFFECTED REPOSITORY / AFFECTED REFS / AFFECTED COMMITS /
SECRET PATHS / RECOVERY POINT / REWRITE MAP / REMOTE+FORK CONSEQUENCES /
POST-REWRITE SCAN. No unrelated history rewriting. Credential rotation
already provides containment; the purge is exposure reduction. Execute as
an isolated security operation, never mixed into product commits.

OAUTH CLIENT SECRET RESET: AUTHORIZED. If the provider requires interactive
Cloud Console authorization, STOP at that boundary and report the exact
human action. Never expose replacement material. Update only authorized
consumers; prove old rejected and new accepted.

### 3b. Repository archaeology

Preserve the 21-file stash (`stash@{0}` in `~/workspace`, from
`fyd/builder-rebuild-v1` @ `b78c0bb`). DO NOT POP/APPLY IT WHOLESALE.
Classify every file read-only into ACTIVE-WIP / REFERENCE /
HISTORICAL/SUPERSEDED / GENERATED/DISPOSABLE / COLLISION/UNKNOWN /
SECRET-BLOCKED, determining OWNERSHIP / SEMANTIC CAPABILITY / DIFF FROM
SERVED LINE / REACHED? / ALREADY REPRESENTED? / DEPENDENCIES / SECRETS?
For each ACTIVE-WIP file ask: WHAT CAPABILITY EXISTS HERE THAT DOES NOT
EXIST ON THE SERVED LINE? None -> SUPERSEDED. Unique and valuable ->
harvest the semantic unit, not the stash. Ownership unclear ->
COLLISION/UNKNOWN, leave untouched. Target: ZERO UNCLASSIFIED FILES, not
zero files.

### 3c. Authority gate

The bare "on hold" false negative is CLOSED (commit `fff8578`): restriction
STATE, not restriction vocabulary — ON_HOLD_STATE_RE fires only when
"on hold"/"on-hold" is governed by a state verb (is/are/remains/stays/put/
placed/currently/still); meta-prose about holds (report/duration/
documentation/test/fixture/handling) and negated/lifted holds are stripped.
21-case adversarial matrix all green; `authority-check.py x` -> ALLOW.
Verify/replay, do not redo.

### 3d. P0 — outcome semantics

The starting fixture is the real Interval-08 Facebook action. Preserve
INTENT / AUTHORIZATION / ATTEMPT / WORKER RESULT / INDEPENDENT EFFECT
VERIFICATION / OUTCOME OBSERVATION. Re-observe the traced comment: has the
NO_SIGNAL_YET state moved to a supported outcome, or does the window
honestly remain open?

Required distinction: NO_SIGNAL YET != FAILURE. Determine the minimum
existing representation for PENDING_WINDOW / POSITIVE / NEUTRAL / NEGATIVE /
INCONCLUSIVE / UNOBSERVABLE only where the product genuinely needs those
distinctions. Do not invent a universal reward ontology. Search FYD and PING
first; harvest only a demonstrated missing primitive. No OutcomeAuthority
unless an existing authority cannot own the transition.

### 3e. Outcome attribution

Before learning from an outcome answer: WHAT CHANGED? WHAT WAS OBSERVED?
OVER WHAT WINDOW? WHAT BASELINE EXISTS? WHAT OTHER ACTIONS OCCURRED? IS
ATTRIBUTION SUPPORTED OR MERELY CORRELATED? The system may record ACTION
FOLLOWED BY OUTCOME. It may not silently upgrade that to ACTION CAUSED
OUTCOME.

### 3f. Learning

Learning produces candidates, not authority. Flow: VERIFIED OUTCOMES ->
PATTERN -> CANDIDATE LEARNING -> SUPPORT SET -> CONFIDENCE/APPLICABILITY ->
PROPOSAL -> EXISTING AUTHORIZATION BOUNDARY -> DETERMINISTIC POLICY. A model
may discover the pattern, explain it, propose the rule. A model may not
silently promote its own rule. At most ONE evidence-backed candidate
learning this interval; it stays CANDIDATE.

### 3g. Reverse-engineer intelligence into software

Explicit product objective: whenever an intelligent decision repeatedly
succeeds, ask CAN THIS DECISION NOW BECOME DETERMINISTIC SOFTWARE?
Direction: MODEL-REQUIRED -> MODEL-ASSISTED -> DETERMINISTIC DEFAULT +
MODEL ESCALATION, where evidence supports the transition. Never force
determinism where ambiguity remains irreducible.

### 3h. Mission Control

Begin exposing the closed loop for PING as a projection from existing
state. It must be possible to answer: WHAT DID PING ASK FOR? WHAT DID WE
DO? WHO AUTHORIZED IT? DID IT ACTUALLY HAPPEN? WHAT HAPPENED AFTERWARD?
WHAT DO WE THINK WE LEARNED? HOW CERTAIN ARE WE? HAS THAT LEARNING BECOME
POLICY? Mission Control does not become another authority.

### 3i. DO NOT BUILD

No generic reinforcement-learning system. No reward-model training. No
generic analytics platform. No autonomous policy promotion. No
vector-memory system. No new agent framework. No new infrastructure
provider. No reopening correction survival. No reopening portability merely
because it passed.

### 3j. Interval 09 ledger (answer only)

1. SECURITY: is repository exposure reduced as authorized, and is OAuth
   rotation complete or blocked at an explicit human boundary?
2. STRANDED VALUE: what is inside the 21-file stash, and how much unique
   valuable implementation remains?
3. OUTCOME: did the Interval-08 action move from NO SIGNAL YET to a
   supported outcome state, or does the observation window honestly remain
   open?
4. LEARNING: did one evidence-backed candidate learning emerge without being
   silently promoted to authority?
5. PRODUCT: can Mission Control now show one complete PING chain:
   INTENT -> AUTHORIZATION -> VERIFIED EFFECT -> OUTCOME ->
   CANDIDATE LEARNING?

## 4. Owner decisions (made)

- Public-history purge: AUTHORIZED CONDITIONALLY (see 3a). Supersedes the
  earlier purge-HOLD in the superseded "FOCUS AFTER INTERVAL 08" text.
- OAuth client secret reset: YES (see 3a).
- Stash: highest-priority repository-convergence problem; classify, do not
  apply wholesale.
- "On hold" gate blind spot: fix now (done, `fff8578`).
- Interval 09 = the learning interval. Do not construct a learning
  architecture in response to P2 going green.

Still open: P1-P5 scaffolding-vs-capability decision; Qdrant :6333 (no auth)
and :5432 firewall review; ping-vault unhealthy (pre-existing); 9-vs-10
group arithmetic reconciliation.

## 5. Standing rules (carried forward)

- Intervals 07 and 08 architectures are regression invariants. Do not
  reopen them.
- All commits local. Nothing pushed to any remote without Nolan's explicit
  authorization.
- Never `git stash`, checkout, or change branches in the shared
  `~/workspace` checkout while lanes are active; use disposable worktrees.
- Explicit-path staging only. No `git add -A`, no resets, no clean.
- Never commit or expose secrets; secret check before staging.
- Commit discipline: STATUS -> OWNERSHIP -> CLASSIFICATION -> SECRET CHECK
  -> EXPLICIT PATH STAGING -> REVIEW DIFF -> COMMIT -> REPORT SHA.
- Worker/lane reports are hypotheses until independently replayed or
  verified. Read-only means read-only.
- Verdict first, evidence attached. Routine worker chatter stays out of
  Nolan's feed; surface security incidents, user-visible progress,
  external-effect risks, real mistakes, first broken product steps, and
  owner decisions.
- PING is the sole exploratory tenant. No second tenant yet.
- Remote CRX remains `6c4b531`, remote PING remains `81b3248`,
  piging2/fyd inaccessible — Interval 08 results are Pig-local operational
  evidence, not remote-repository evidence.

## 6. Honest unknowns

- Whether the traced FB comment receives replies (the window is open; needs
  re-observation, not inference).
- Stash file ownership for several of the 21 files (COLLISION/UNKNOWN until
  proven otherwise).
- The T1-T4 + A1-A5 count (ledger says 10, arithmetic says 9).
- Mission replay and projection rebuild remain UNPROVEN (out of this
  interval's scope unless the outcome work requires them).
