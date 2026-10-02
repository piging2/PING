# LANE 7: Controlled Self-Improvement Loop  -  Design

Lane 7 (READER/DESIGNER), 24-hour convergence swarm, 2026-09-25 ~20:00 MDT.
NO-EDIT DEFAULT: design only. No code changes, no loop activation.
One file written by this lane: this document.

Design principle (per lane doctrine): PING MUST NOT BECOME A SELF-MODIFYING
BLACK BOX. The loop below is CONTROLLED: every stage reads existing PING
machinery, every transition cites evidence, and authorization is anchored
outside the loop. Reuse-before-create: the gap lifecycle
(OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED), the failure ledger, the grill, the
escalation classifier, and the capability policy are harvested, not reinvented.

---

## 1. Stage-by-stage map

Each stage: what it is, where it already exists (file pointers), or MISSING SEAM.

### Stage 1: OBSERVE FAILURE  -  EXISTS

- `~/workspace/FAILURE_LEDGER.md`: append-only schema (id FL-YYYYMMDD-NNN,
  first_seen/last_seen, system/lane, what_failed, evidence, classification,
  self_heal, replay, status OPEN/HEALING/HEALED/QUARANTINED/NEEDS_NOLAN).
  "Record first, narrate second." Never deleted; forgotten only when HEALED
  with replay proof.
- `~/workspace/goals/ping-agent-execution-stack/crons/hourly/ping-perfecting-pass__interval@6h.md`
  (ping-perfecting-pass): sweeps the ledger every run, one bounded self-heal
  step per OPEN item inside its safe scope (no live platforms, no Pig, no
  credentials, no commits).
- Pass logs as observation surface: e.g. `~/workspace/outreach/facebook-engagement.md`
  pass sections record guard audit lines, blocked counts, and slips with
  timestamps.
- Typed detection vocabulary (failure classes, not prose): reconcile.py
  `NOT_REQUIRED / NOT_RUN / SKIPPED / FAILED / BLOCKED / NO_VALUE / DEGRADED /
  UNCHECKED / GAP`; ledger classification
  `SUCCESS_EMPTY / ENUMERATION_FAILURE / ELIGIBILITY_EMPTY / DEPENDENCY_FAILURE /
  AUTH_FAILURE / SURFACE_DRIFT / RATE_LIMIT / TEMPORARY_FAILURE / TERMINAL_FAILURE`.
- Self-healing doctrine (FAILURE_LEDGER.md): classify; bounded recovery within
  budget (`~/workspace/pig-fb/recovery-budgets.json`); never auto-retry
  destructive/unknown-execution/credential actions; quarantine surfaces, never
  disable schedules; everything replayable.

### Stage 2: EVIDENCE  -  EXISTS

- Ledger entry rule: evidence = file paths, tool outputs, pass ids; "never
  narration alone." An entry without a replay section is incomplete.
- Proof-artifact convention (installed 2026-09-25 by ping-perfecting-pass):
  `~/workspace/goals/ping-agent-execution-stack/hidden_files/proof-artifact-convention-2026-09-25.md`.
  Every dated proof artifact carries Lane/owner, Claim, Evidence (tool results,
  digests, file paths), Status. Drift audit proved the convention was needed
  (2 of 4 artifacts lacked lane/owner before it was written).
- Digest discipline (`~/workspace/BACKLOG_PING.md` standing rule 16): any lane
  reporting a digest commits the exact digest algorithm/script; a bare digest
  string with no algorithm is not evidence.

### Stage 3: CLAIM  -  EXISTS (as typed gap records)

- `~/workspace/tandem/reconcile.py`: turns raw evidence into typed,
  identity-stable records. `gap_key()` = rule|step|run_id|input (stable across
  runs, no volatile fields). Distinct detection vocabulary (what one run
  observed) from lifecycle state.
- Lifecycle store `~/workspace/tandem/reconciliation/gap-lifecycle.json`:
  OPEN / KNOWN_PERMANENT / RESOLVED / REOPENED with timestamped transitions
  citing evidence; atomic writes; nothing ever deleted.
  - OPEN -> KNOWN_PERMANENT requires BOTH a valid closure disposition
    (`*-closure-*.md`: rule scope + closure authority + CLOSED + cited
    identifiers) AND independently verifiable ingestion evidence (claim alone
    does not suppress).
  - REOPEN fires when: disposition removed/invalidated, evidence disappeared
    or changed since closure, signature changed, or a RESOLVED gap recurs.
  - Resolution: gap absent from detection + rule check healthy -> RESOLVED
    ("actual remediation"). UNCHECKED probes neither suppress nor resolve
    (absence of evidence is not evidence of absence).
- Unit-test seam for the lifecycle logic: `~/workspace/tandem/test-gap-lifecycle.py`
  (temp dirs only, never touches production stores).

### Stage 4: PROPOSED IMPROVEMENT  -  MISSING SEAM

There is NO canonical improvement-record schema. Today a proposed improvement
lives as ad hoc prose: a pass-log note, a BACKLOG item, an AGENTS.md lesson.
The improvement record format is DEFINED in section 2 of this document to fill
exactly this seam. Until a shared schema exists, no loop can deterministically
advance a proposal through test, authorization, patch, verification, and
outcome. Nothing in the task scope permits inventing a parallel backlog; the
record must attach to the existing lifecycle: an improvement proposal is a
record keyed to an existing gap_key or ledger id (FL-...), carrying its own
sub-states, never a competing authority.

### Stage 5: TEST / FALSIFICATION  -  EXISTS AS PRACTICE, NOT AS A GATE

- Fail-before discipline is practiced: `~/workspace/BACKLOG_PING.md` NOW-9/FYD-037
  records a full falsification (2026-09-23 ping-perfecting-pass, local plane):
  probe `goals/ping-agent-execution-stack/hidden_files/perfecting-pass-2026-09-23/fyd037-wrong-journal-probe.py`
  reproduced the gap (emit() returned 0, attempted POST to the wrong journal,
  zero verification calls) BEFORE any patch was designed. The "minimal guard
  shape" was specified as design, explicitly NOT implemented by the pass.
- perfecting-pass step 3: "Verify every change with actual tool results."
- 22-dimension checklist, dimension 19: TEST = positive + negative +
  adversarial + concurrency + restart
  (`~/workspace/sprint-2026-09-24/grill-20-locked-answers.md` tail).
- MISSING (the gate): nothing ENFORCES fails-before evidence before a patch
  lands. A patch can be applied without a recorded fails-before test. The loop
  must require: the improvement record's TEST field (fails-before artifact +
  passes-after artifact) is populated BEFORE the PATCH stage may proceed, and
  the test must be independent of the patch author where feasible (no
  wireheading; "attack the fix" per the 22-dim FINAL LAW).

### Stage 6: AUTHORIZATION  -  EXISTS AS POLICY, MISSING AS MACHINE-READABLE RECORD

Existing authority machinery (harvest, do not duplicate):

- Escalation classifier (10 questions, `~/workspace/sprint-2026-09-24/grill-20-locked-answers.md`
  tail): locked invariant? previous Nolan decision? code/runtime evidence?
  reversible experiment? safe default at >=80% confidence? reversible? no
  consequential external effects? no uncertain destructive mutation? no new
  credential authority? safety/privacy/tenant boundaries preserved?
  All YES -> DECIDE AND EXECUTE. Do not ask.
- Escalation classes (same file, LOCKED by Nolan 2026-09-24 ~19:05 MDT):
  EXTERNAL_CONTACT_AUTHORIZATION / PUBLICATION_SPEND /
  IRREVERSIBLE_OR_UNCERTAIN_DESTRUCTION / CREDENTIAL_OWNER_ACTION /
  LEGAL_BUSINESS_COMMITMENT / UNRESOLVED_PRODUCT_INTENT /
  SUBJECTIVE_FINAL_VISUAL_JUDGMENT / P0_WHERE_SAFE_DEFAULT_DOES_NOT_EXIST.
  These route to Nolan via the ONE GRILL (`~/workspace/GRILLING-BRIEF.md`).
- Nolan's agent write authority (2026-09-16, MEMORY.md): surgical,
  well-reasoned writes; Pigi checks agent-written work. Hard boundaries
  unchanged without Nolan's word: no pushes, no main/master commits, no
  credential exposure/rotation, no destructive Git or data actions, no
  platform-restriction bypasses, no Pig reboot, no broad IAM grants.
- Capability policy default-deny
  (`~/workspace/autonomous-missions/CAPABILITY-MATRIX-2026-09-23.md`):
  "Every role starts with NOTHING... Any effect not listed for a role is
  PROHIBITED. Silence is denial." Improvement actions are capabilities; the
  loop's roles must each carry an explicit capability row.
- MISSING: the authorization DECISION is prose (an AGENTS.md lesson, a grill
  answer, a memory entry). No machine-readable authorization token exists that
  a loop could verify ("who authorized this patch, under which classifier
  question, with what evidence of the >=80% confidence?"). The improvement
  record's AUTHORITY field (section 2) fills this: it cites the exact policy
  (classifier question numbers, grill answer, or Nolan directive) and must be
  issued by an authority DISTINCT from the proposer (anti-black-box rule 2).

### Stage 7: PATCH  -  EXISTS

- Surgical-write rule (MEMORY.md, Nolan 2026-09-16 grant): small scoped
  reversible diffs; agent-written work checked.
- Multi-stream discipline (`~/workspace/AGENTS.md`, learned from
  FL-20260924-206/207): per-stream worktrees OR strictly serialized commits;
  never bare `git commit`; always `git status` first, explicit pathspecs,
  commit only your stream's files.
- Boundaries: local commits only, never push; never commit to main/master;
  convergence worktrees untouched by other lanes.
- CRX harvest doctrine applied here (MEMORY.md, Nolan 2026-09-25):
  proposal != execution; explicit permission matrix onto existing
  CapabilityAuthority; worktree isolation; anti-shadow-system discipline.
- CRX reference harvested directly (read-only via pigwsl-run.sh,
  /home/nolan/crx-swarm/crx-runtime-main, verified reachable 2026-09-25
  ~20:10 MDT), replay + permission + audit ideas only:
  - `constitutional/REPLAY_BOUNDARY.md`: replay MAY consume immutable
    events, reconstruct deterministic state, validate lineage, emit witness
    proofs; replay MUST NOT perform network IO, mutate infrastructure, or
    depend on clocks, agents, or transport. Adopted into anti-black-box
    rules 2 and 7: the verification replay of an improvement consumes the
    immutable evidence record and reconstructs the check; it never mutates.
  - `agents/agent_permissions.md`: authority structure with
    `/authoritative/` read-only for all agents except Governance; Planner
    Agent "proposes without executing": CANNOT write to `/authoritative/`,
    CANNOT modify existing files, CANNOT execute proposals; permission
    matrix per path. Adopted into anti-black-box rules 2 and 8: the
    improvement loop's proposer role is Planner-class; execution belongs to
    a distinct authorized role, and the loop's own authority records are
    read-only to it.
  - `reports/` (AUDIT_OF_AUDITS.md, AUTHORITY_BOUNDARY_MAP_V2.md, ...):
    audit-of-audits pattern. Adopted into the outcome stage: the loop's
    verification artifacts are themselves auditable records (proof-artifact
    convention), not trusted by construction.

### Stage 8: VERIFICATION  -  EXISTS

- Proof-artifact convention (Stage 2): the verification artifact must carry
  Lane/owner, Claim, Evidence, Status. Verification = tool result, not
  narration.
- `~/workspace/BACKLOG_PING.md` standing rule: "An item is DONE_VERIFIED only
  when a tool result verifies it. Code changes alone do not close findings.
  Narrated completions are not proof."
- Deterministic terminal states exist as pattern: reconcile.py exits
  0 = no actionable gaps, 2 = actionable gaps, 3 = checks could not run.
- Gap lifecycle RESOLVED requires "condition no longer detected AND rule
  check healthy" (reconcile.py run_lifecycle): verification is re-detection,
  not a self-report.

### Stage 9: DEPLOYMENT  -  EXISTS FOR RUNTIME LOOPS, MISSING AS A PROMOTION RECORD

- The cron machinery owns deployment of recurring behavior
  (ping-perfecting-pass, engagement passes under
  `~/workspace/goals/*/crons/`); Pig-side workers deploy via
  `run_pass.sh` WMI launches.
- MISSING: no canonical PROMOTION RECORD for an improvement. An improvement
  that must land Pig-side (e.g. the FYD-037 guard, whose "implementation
  belongs to an authorized lane (Pig-side script + journal marker)") has no
  tracked HANDOFF state: WSL proposes, Pig patches, and the verification loop
  has no record connecting the two. Improvements stall silently or get
  implemented without the loop observing it. The improvement record needs a
  DEPLOYMENT field naming the exact target plane and artifact, and a missing
  handoff must read as BLOCKED, not as done.

### Stage 10: OUTCOME  -  EXISTS AS PATTERN, MISSING AS RECORD-SCOPED TRACKING

- The pattern exists: reconcile.py auto-transitions a gap to RESOLVED when
  the condition stops being detected, and to REOPENED when a RESOLVED gap
  recurs. The failure ledger records recurrences
  (e.g. FL-20260919-001 recurrence 2026-09-19 21:01 MDT).
- MISSING: outcome tracking scoped to an improvement RECORD. After the
  never-reengage fix (section 2), no automated check answers "did
  re-engagement incidents stop?" Passes 119/120 carry only narrative
  confirmation ("covered by builder pre-filter + fixed at-dispatch guard").
  The loop needs an outcome probe: re-run the fails-before test on a cadence
  against live state; recurrence of the failure signature reopens the
  improvement record (adapting the gap-lifecycle REOPENED transition, which
  already implements exactly this semantic).

### Stage 11: LEARNING  -  EXISTS

- `~/workspace/AGENTS.md`: durable operating lessons (the never-reengage fix
  was recorded there the same day, 2026-09-25).
- Daily notes `~/memory/YYYY-MM-DD.md` (perfecting-pass appends); curated
  `~/MEMORY.md`; people/groups pages.
- GRILL RETENTION RULE (`~/workspace/GRILLING-BRIEF.md`): an answered question
  is recorded in the durable system, removed from ACTIVE, and the decision is
  propagated; only CONTRARIAN/UNINTUITIVE/CONTROVERSIAL/HOT-TAKE or
  highly-reversible-but-high-consequence decisions are retained for
  re-grilling. Learning is not a graveyard.
- 22-dim checklist dimension 22 (MEMORY): "does the lesson reach future
  execution rather than becoming a dead note?"

### Adjacent machinery (do not confuse with this loop)

- `~/workspace/self_improvement/` (sirun_* runs, 6h cadence, CURRENT.md):
  the memory/bookkeeping self-improvement lifecycle. It improves MEMORY
  hygiene, not system behavior. The loop designed here must NOT write to or
  read authority from it; separate lane, separate invariants.

---

## 2. Bounded improvement record format (filled with a REAL example)

The record keys to an existing failure identity (ledger id or gap_key). All
ten fields required; a record with an empty field cannot advance past it.

```
IMPROVEMENT RECORD
failure_ref:      <ledger id FL-... or gap_key rule|step|run_id|input>
OBSERVED FAILURE: <what failed, when, in which lane/pass>
ROOT CAUSE:       <mechanism, not symptom; cites evidence>
PROPOSED CHANGE:  <exact patch shape; what files/functions>
AUTHORITY:        <classifier questions answered + distinct authorizer>
EXPECTED EFFECT:  <measurable change; what stays unaffected>
TEST:             <fails-before artifact (reproduces) / passes-after artifact (kills it)>
ARTIFACT:         <paths of probes, manifests, logs; digests where bytes matter>
RUNTIME PROOF:    <tool result on the live path, not narration>
OUTCOME:          <observed after deployment; recurrence probe result>
FOLLOW-UP:        <residual notes, stale references, watch items>
```

### Filled example: FB never-reengage guard blind spot (2026-09-25)

- **failure_ref:** FB engagement pass 118, 2026-09-25 (~05:28 MDT discovery).
  Ledger-adjacent: recorded in `~/workspace/outreach/facebook-engagement.md`
  pass-118 section (~line 3943) and `~/workspace/AGENTS.md` never-reengage
  lesson (2026-09-25). No FL- id was minted; the pass log is the record.
- **OBSERVED FAILURE:** The pass-118 provisional job initially contained 12
  already-engaged posts (pass-116 EXECUTED: CO BizNet concrete/dirt
  like+comment, Roofing A cleaning like+comment, Delta Aila Thai Kitchen
  like+comment; pass-113 open intents: Ridgway fence/gardening/mushroom,
  GJMB bakery-opening, Ridgway Basin Metal Buildings, Ridgway Aila Thai
  Kitchen). Verified pre-fix: 2 slips survived the at-dispatch guard.
- **ROOT CAUSE:** Pass-log sections 113+ record targets as prose without
  per-action URLs, so parse_facebook()'s post_ids miss them; the builder's
  ledger scan was date-scoped to today only; the at-dispatch guard shared the
  same blind spot. The intent ledger is the only complete post-ID history.
- **PROPOSED CHANGE:** engagement-guard.py merges terminal-aware ledger post
  IDs on every load_index() via _fb_ledger_engaged_post_ids() (NOT_ATTEMPTED
  terminals stay eligible as proven non-execution; EXECUTED/FAILED/
  UNKNOWN_EXECUTION and open intents block); build-fb118-job.py uses the same
  helper for its pre-filter; all future pass job builders must use the same
  helper instead of a date-scoped ledger scan.
- **AUTHORITY:** Escalation classifier: locked invariant (never-reengage,
  pre-existing) -> Q1 YES; code/runtime evidence (the tainted provisional job
  itself) -> Q3 YES; reversible (guard logic, no external effects) -> Q6/Q7
  YES; no destructive mutation, no credential authority, boundaries preserved
  -> Q8/Q9/Q10 YES. DECIDE AND EXECUTE, no Grill escalation. Authorizer:
  the pass operator under the standing never-reengage invariant; proposer and
  authorizer were the same lane, which is acceptable ONLY because the
  invariant was pre-locked (anti-black-box rule 2 allows pre-locked
  invariants as authority; novel changes require a distinct authorizer).
- **EXPECTED EFFECT:** Re-engagement attempts drop to zero on the guarded
  path; the 3 pass-115 NOT_ATTEMPTED posts (sourdough pre-orders, Cowboys and
  Aliens, El Rey) correctly stay eligible (proven non-execution is not
  engagement).
- **TEST:** fails-before: the tainted provisional job (12 already-engaged)
  built pre-fix; 2 slips survived the guard. passes-after: the fixed guard
  blocked all 9 must-drops as ALREADY_ENGAGED on the tainted job; the 3
  NOT_ATTEMPTED posts stayed eligible. Two guard-test manifests
  (facebook-pass-20260925-112941.json, -113445.json) written during
  verification were deleted before the real build (no test pollution).
- **ARTIFACT:** pass-log section (~line 3943) with the 11:29 UTC GUARD audit
  lines as factual verification records; `~/workspace/AGENTS.md`
  never-reengage lesson; Pig-side
  `/home/nolan/workspace/outreach/engagement-guard.py`
  (verified live via pigwsl-run.sh 2026-09-25 ~20:12 MDT:
  `def _fb_ledger_engaged_post_ids()` at line 429, merged into the guard
  index at line 554:
  `merged = set(payload.get("post_ids") or []) | _fb_ledger_engaged_post_ids()`);
  build-fb118-job.py pre-filter.
- **RUNTIME PROOF:** GUARD audit lines at 11:29 UTC in the pass log; all 9
  must-drops blocked as ALREADY_ENGAGED; the 3 NOT_ATTEMPTED posts stayed
  eligible; pass 119 and 120 logs confirm the same coverage holds ("builder
  pre-filter + fixed at-dispatch guard cover the same function").
- **OUTCOME:** Deployed in pass-118 dispatch; no re-engagement incidents in
  passes 119/120. (Outcome tracking is narrative today; see Missing Seam D.)
- **FOLLOW-UP:** The pass-log body still names
  ~/workspace/outreach/never_reengage.py as the standalone pre-filter, but
  that file does not exist (stale since at least pass 117; noted in passes
  118, 119, 120). Cleanup needed so a future reader does not chase a phantom
  file. Watch: future prose-only pass logs will re-create this blind spot;
  post IDs must stay machine-readable.

---

## 3. Anti-black-box rules: what the loop may NEVER do

1. **No autonomous self-rewriting.** The loop may never patch its own code,
   its own record schema, the escalation classifier, the gap lifecycle
   implementation, or AGENTS.md standing lessons. Improvements to the loop
   itself are proposed as records and authorized by Nolan, never self-applied.
2. **No agent-promotes-itself.** Authorization must come from a distinct
   authority: a Nolan directive, a locked grill answer, or the escalation
   classifier applied to a PRE-LOCKED invariant. The proposer of a change may
   not be its authorizer for any novel change. Classifier Q5 (>=80% safe
   default) confidence must be evidenced, never asserted. The loop's proposer
   role is Planner-class per the CRX permission matrix: it proposes without
   executing, cannot modify existing files outside its bounded scope, and
   cannot execute its own proposals; execution belongs to a distinct
   authorized role.
3. **No silent changes.** Every stage writes evidence to a durable, append-only
   record (failure ledger law: never delete entries). A stage with no
   evidence did not happen.
4. **No new authorities.** Improvements reuse the gap lifecycle, the failure
   ledger, the grill, the capability matrix, and the proof-artifact
   convention. A proposal that creates a parallel store, a parallel question
   file, or a parallel decision surface is rejected (see GRILLING-BRIEF.md ONE
   GRILL rule and BACKLOG_PING.md Rule of One).
5. **No bypass of hard boundaries.** No pushes; no main/master commits; no
   credential exposure or rotation; no destructive Git or data actions; no
   platform-restriction bypasses; no Pig reboot; no broad IAM grants; no
   external contact, publication, or spend without Nolan. (MEMORY.md 2026-09-16
   grant; grill-20 escalation classes.)
6. **Fail closed on ambiguity.** UNKNOWN execution, UNKNOWN effect, or
   conflicting authority -> HOLD with evidence, never manufactured completion.
   A detected restriction becomes BLOCKED, never an optimization problem.
7. **No wireheading.** The test that verifies a patch must be independent of
   the patch: fails-before reproduction first, then the patch, then
   passes-after. "Attack the fix" (22-dim FINAL LAW). Test manifests are
   deleted before the real run so verification cannot pollute production
   state (as done in pass 118). Verification replays the immutable evidence
   record; per the CRX replay boundary it MUST NOT perform network IO,
   mutate infrastructure, or depend on clocks, agents, or transport.
8. **No acting on the evaluator.** The loop improves the system under the
   existing capability policy; it does not grant itself capabilities. Every
   role in the loop carries an explicit capability row under default-deny
   (autonomous-missions/CAPABILITY-MATRIX-2026-09-23.md: "Silence is denial").
9. **No cross-plane silent writes.** A patch targeting another plane
   (WSL -> Pig, local -> Oracle) is a HANDOFF: recorded as BLOCKED until the
   target plane's authorized lane confirms receipt and applies it. The loop
   never assumes deployment.

---

## 4. Open questions and candidate gaps (with evidence)

**Q1. Who owns the improvement-record store?** No store exists today. The
record format in section 2 is a design; without an owner (PING event plane?
workspace file? goal hidden_files?) it is a schema with no home. Candidate
gap: IMPROVEMENT-RECORD-STORE  -  proposed home must survive the continuity
guardrail (MEMORY.md 2026-09-13: audit what PING already has before creating
any new store; the missing layer is instrumentation + correlation IDs +
projection, not another persistence system). Evidence: this document is the
first artifact to need the store; nothing in ~/workspace implements it.

**Q2. Cross-plane handoff has no tracked state.** Evidence: FYD-037
(BACKLOG_PING.md NOW-9) falsification proved the gap locally on
2026-09-23, specified the minimal guard shape as DESIGN, and explicitly
parked implementation on "an authorized lane (Pig-side script + journal
marker)". Two days later there is no machine-tracked record connecting the
proven design to its implementation. The improvement is in limbo: verified
as a real gap, unowned as a patch. Candidate gap: HANDOFF-STATE.

**Q3. The >=80% confidence in classifier Q5 has no evidence rule.** The
classifier asks "Can the coordinator choose a safe default at >=80%
confidence?" but no artifact defines what counts as evidence of 80%.
A loop could assert confidence to self-authorize. Missing seam: confidence
must cite the falsification test or a locked invariant, per anti-black-box
rule 2. Until then, any self-authorized patch rests on an unevidenced number.

**Q4. Outcome tracking for improvements is narrative, not probed.**
Evidence: the section-2 example's OUTCOME field is filled from pass-log
narrative ("no re-engagement incidents in passes 119/120"), not from a
re-run of the fails-before test. The gap lifecycle already implements the
right semantic (REOPENED when a RESOLVED gap recurs; reconcile.py
run_lifecycle). Candidate gap: wire improvement records to the same
recurrence probe, so OUTCOME is a test result, not a story.

**Q5. CRX checkout path  -  RESOLVED, harvest recorded.** The coordinator
confirmed /home/nolan/crx-swarm/crx-runtime-main exists (22 top-level
entries, direct listing ~20:05 MDT) and that Pig SSH works from this VM
(~20:08 MDT). This lane verified reachability via
`~/workspace/pig/pigwsl-run.sh` (~20:10 MDT): the checkout lists AGENT.md,
CRX_CONSTITUTION.md, agents/, certification/, constitutional/,
constitutional-integration-lab/, docs/, inventory/, kernel/, knowledge/,
reports/, runtime/ and more. Harvested read-only, replay + permission +
audit ideas only (see Stage 7 PATCH): REPLAY_BOUNDARY.md (replay MAY/MUST
NOT), agents/agent_permissions.md (Planner proposes without executing;
`/authoritative/` read-only), reports/ (audit-of-audits pattern). Per the
standing harvest doctrine, these are ideas adopted into the loop's
anti-black-box rules, never imported machinery. No further HOLD on CRX
input.

**Q6. Phantom-file references as a failure class.** Evidence: three
consecutive pass logs (118, 119, 120) note that the body names
~/workspace/outreach/never_reengage.py, a file that does not exist
(stale since at least pass 117). A stale reference is a latent defect: a
future lane may "fix" the phantom instead of the real guard. Candidate gap:
STALE-REFERENCE sweep  -  a periodic check that every path named in
operational prose resolves, or is marked intentionally historical.

**Q7. Ledger-id discipline.** The section-2 example has no FL- id; it lives
in a pass log and AGENTS.md. The failure ledger's own law says "a failure
mentioned only in chat or a pass report and not recorded here is a forgotten
failure." Improvement records keyed only to pass logs inherit that
forgetfulness. Candidate gap: require failure_ref to resolve to a ledger id
or gap_key before an improvement record may advance to TEST.
