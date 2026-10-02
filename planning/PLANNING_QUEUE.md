# Muse Planning Queue

Standing rule: PING-unavailable planning mode (2026-09-18, Nolan's directive).
Social side in planning mode: intelligence gathering only, no engagement changes.
Ranking criteria: (1) constitutional/authority risk, (2) data-loss or false-certification risk,
(3) falsifiability of current assumptions, (4) downstream decisions unblocked,
(5) reproducibility, (6) implementation leverage. Never novelty.

## INV-1 — Scheduler delivery-gap audit (cron file body vs registered body)
- OBSERVATION: 2026-09-18, meta-ai-intel-pass ran a stale pre-09-17 body for ~1 day because a file
  rewrite never propagated to the scheduler's registered body. Quarantined brief c ran twice more.
- EVIDENCE: Full audit 2026-09-18 ~16:30 MDT: all 16 user-owned cron jobs checked
  (head/tail/distinctive-mid-body canaries vs cron.view registered bodies). 16/16 SYNCED.
  meta-ai-intel-pass was re-synced via cron.update at ~16:00 MDT the same day.
- UNCERTAINTY: Method was canary-based, not byte-exact; mid-body drift cannot be 100% excluded,
  but distinctive mid-body phrases verified present in the largest bodies.
- WHY IT MATTERS: Answers the systemic question empirically.
- AUTHORITY INVOLVED: scheduler registration vs file authorship.
- PROPOSED EXPERIMENT: Build the byte-exact sentinel (INV-9); re-run to confirm.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: No.
- EXPECTED INFORMATION GAIN: Confirms whether the incident class is isolated (yes, currently).
- DEPENDENCIES: None. STATUS: COMPLETE (finding below).

### INV-1 FINDING
The incident was ISOLATED, not systemic in the empirical sense: no other job is currently drifted.
But the gap class is SYSTEMIC by construction: there is no drift detector, and file-edit ->
scheduler-registration is an uncoupled two-step manual process. Any future hand-edit reopens it.
This is exactly the AUTHORED != REGISTERED != DELIVERED != EXECUTED pattern. Generalize via INV-9.

## INV-2 — Command vs interlock mapping (LIVE RISK)
- OBSERVATION: The F7+MC-1 commit freeze was delivered as an async interrupt message to a running
  coordinator. A message saying DO NOT COMMIT is not an interlock preventing git commit.
- EVIDENCE: Interrupt sent 2026-09-18; no acknowledgment observed yet. If the coordinator committed
  before reading it, the freeze lost the race.
- UNCERTAINTY: Whether the freeze won the race (unconfirmed).
- WHY IT MATTERS: Every governance "freeze" in the system may be a message believed to be enforcement.
- AUTHORITY INVOLVED: commit freeze, promotion freeze, allowlists, quarantine, namespace/capability
  restrictions, destructive Git ops, deployment gates.
- PROPOSED EXPERIMENT: Map each governance rule to ADVISORY / DELIVERED COMMAND /
  CHECKED PRECONDITION / ENFORCED INTERLOCK. Produce smallest enforcement designs; do NOT implement
  interlocks in planning mode.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Only to implement interlocks later.
- EXPECTED INFORMATION GAIN: Inventory of believed-enforcement that is actually advisory.
- DEPENDENCIES: None. STATUS: MAPPING COMPLETE (enforcement designs PROPOSED, not implemented).

### INV-2 MAPPING (2026-09-18)
Classification key: ADVISORY (prose rule, compliance depends on the reader) /
DELIVERED COMMAND (instruction delivered to a running agent, no mechanical force) /
CHECKED PRECONDITION (deterministic script on the execution path gates the next step) /
ENFORCED INTERLOCK (the action is structurally impossible without satisfying the condition).

| Governance rule | Classification | Evidence |
|---|---|---|
| F7+MC-1 commit freeze (live) | DELIVERED COMMAND | Async interrupt to coordinator; no ack observed; nothing prevents git commit |
| Pre-commit manifest requirement | ADVISORY (aspiring to CHECKED PRECONDITION) | Nolan's prose rule; compliance depends on the committing agent |
| Five-file commit allowlist | ADVISORY | Prose in checkpoint summary; no mechanical check |
| Brief quarantine (c, d) | CHECKED PRECONDITION (derivation layer) | next-brief.py mechanically excludes quarantined briefs; verified live 2026-09-18 (stderr skips, exit 0, h selected) |
| Meta AI route restriction (prospect prompts only) | ADVISORY | Job-body prose; nothing mechanical prevents other prompts |
| Engagement never-re-engage guard | CHECKED PRECONDITION (worker layer) | engagement-guard.py filters mechanically; but the worker can skip run_pass.sh (the MUST is prose) |
| Intent ledger write-before-action | CHECKED PRECONDITION within flow / ADVISORY at entry | Ledger gates action inside the job, but entering the flow is prose-driven |
| "No pushes / no main commits / no destructive git" | ADVISORY | Standing directives; nothing mechanical stops a push |
| Promotion/certification gates (O1-O20) | ADVISORY | Prose prerequisites; Nolan wants machine-checkable gates (future) |
| Do-not-disable-schedule rules | ADVISORY | Body prose |

FINDING: The system has almost no ENFORCED INTERLOCKS. Nearly everything believed to be
enforcement is ADVISORY or DELIVERED COMMAND. The few CHECKED PRECONDITIONs (quarantine skip,
engagement guard) are enforced at one layer and bypassable at another: the agent can always
skip calling the script. This is the same class as the freeze race: a message believed to be
a wall. The honest statement: in this architecture the agent IS the runtime, so an interlock
against the agent needs a separate trust root (a second principal, or a tool-level guard the
agent cannot route around). Smallest enforcement designs (PROPOSED, not implemented):
1. Move critical rules from prose into deterministic scripts that sit ON the execution path
   (the engagement-guard pattern), so compliance is "the worker cannot get X without the gate".
2. Freeze state as a machine-readable file (freeze.json) that the commit procedure must read;
   the pre-commit manifest check fails closed when the freeze file says frozen.
3. Promotion gates as machine-checkable prerequisites (required evidence IDs, harness results,
   contradiction status) evaluated by a script, not by the producing agent's prose claim.
None of these are true interlocks against a non-cooperative agent; they raise the cost of
bypass and make bypass auditable. True interlocks need PING or a second principal as the
enforcing trust root. That is an operator decision.

## INV-4 — h-marketing-intelligence provenance (TIME-SENSITIVE: 21:04 MDT run)
- OBSERVATION: 2026-09-18, next-brief.py returned h-marketing-intelligence, a slug outside the
  documented a/b/c/d cycle, while the job body says non-cycle brief_ids are ignored.
- EVIDENCE: Direct script output observed same day.
- UNCERTAINTY: Where h came from, who created it, whether it is legitimate, whether the documented
  cycle is stale, whether next-brief.py intentionally supports arbitrary slugs, whether quarantine
  changes exposed a latent fallback.
- WHY IT MATTERS: With c and d quarantined, rotation is down to a, b, and a mystery slug.
  The 21:04 run needs the answer first.
- AUTHORITY INVOLVED: brief rotation authority (script vs documented cycle vs scheduler).
- PROPOSED EXPERIMENT: Read next-brief.py derivation logic; grep runs.jsonl and prompts dir for h-*;
  check git/file history of the script; determine if h- is a real prompt with a contract.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: No (do NOT remove h or force it into the cycle;
  establish provenance first).
- EXPECTED INFORMATION GAIN: Whether rotation authority lives in the script, the docs, or neither.
- DEPENDENCIES: None. STATUS: COMPLETE (finding below).

### INV-4 FINDING (2026-09-18 ~16:40 MDT)
Not a mystery. h-marketing-intelligence is a legitimate cycle member:
- Real prompt created 2026-09-14 13:48 (substantive marketing-intel sweep, Western Colorado focus).
- Deliberately in next-brief.py CYCLE = [a, b, c, d, h]; build-context-pack.py maps it.
- Derivation just now: effective cycle after lifecycle skips = [a, b, h] (c, d quarantined);
  anchor = b (most recent ok); nothing owed; normal advance b -> h. Correct by the script's own logic.
- runs.jsonl shows 0 h- runs: this is its debut, which is why it looked unexpected.
- The only staleness is the cron body's PROSE describing a 4-brief a/b/c/d cycle. The script is
  authoritative for behavior; the prose is incomplete (not contradictory: the body says to derive
  via next-brief.py, which is what happens). This is the delivery-gap class inverted: SCRIPT ahead
  of PROSE, whereas INV-1 was PROSE ahead of REGISTRATION.
- Verdict for the 21:04 run: running h- is legitimate. No action needed.
- Follow-up (ready execution unit, needs operator/PING approval, NOT done silently in planning mode):
  sync the meta-ai-intel-pass body prose to name the 5-cycle [a, b, c, d, h].

## INV-3 — Ledger-ok vs sidecar-rejected authority disagreement
- OBSERVATION: Quarantine record notes run 20260915-210425 has ledger outcome=ok but
  sidecar=contract_rejected.
- EVIDENCE: Quarantine record text, 2026-09-18.
- UNCERTAINTY: Who writes ledger vs sidecar, when each is written, what each field means, which
  consumers read each, which drives rotation, whether partial execution can produce disagreement.
- WHY IT MATTERS: next-brief.py anchors rotation on the ledger's "most recent ok". If the ledger can
  say ok while the sidecar says rejected, the anchor may be false. This may matter more than repairing c.
- AUTHORITY INVOLVED: rotation authority (ledger vs sidecar = dual authority?).
- PROPOSED EXPERIMENT: Trace write paths and timestamps for both; enumerate consumers of each;
  classify as semantic difference / eventual consistency / write-order failure / stale projection /
  dual authority / bug / unknown. Then prepare a decision packet.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: No for investigation; yes for any resolution.
- EXPECTED INFORMATION GAIN: Single authoritative rotation source, or an explicit dual-source contract.
- DEPENDENCIES: None. STATUS: COMPLETE (finding below).

### INV-3 FINDING (2026-09-18)
The "contradiction" dissolves into a stage distinction plus a since-partially-fixed dual-write gap.
- TIMELINE (from the sidecar's own transitions array): 21:06:22Z meta-pass.sh finalize wrote the
  ledger entry (outcome=ok, classification=answer_captured: capture pipeline succeeded, 11138 chars,
  5 numbered items, shape valid). 21:09:40Z a report-claims check confirmed file bytes/items match.
  23:19:00Z outreach-engine ingest ran validate-research-contract.py (exit 3: 0/10 VALID) and amended
  the SIDECAR to contract_rejected. The old pipeline did NOT write the verdict back to the ledger.
- MEANINGS: ledger outcome=ok answers "did the capture pipeline succeed?" (yes). Sidecar
  contract_rejected answers "did the content pass the research contract?" (no). Different stages,
  different questions. Not a logical contradiction.
- CONSUMERS: next-brief.py anchors rotation on ledger outcome (capture-level). brief-lifecycle.py
  counts contract failures from ledger classification==contract_rejected. The sidecar's verdict is
  read by humans (quarantine records); no mechanical consumer was found.
- EVOLUTION: the pipeline was later repaired: 7 subsequent ledger entries carry
  classification=contract_rejected directly. The historical 20260915-210425 entry was never backfilled.
- RESIDUAL AUTHORITY QUESTION (decision packet): a capture-ok/contract-rejected run ADVANCES the
  rotation (it is not "owed"). Two readings: (a) rotation is about coverage, contract quality belongs
  to the lifecycle/quarantine path [current behavior]; (b) contract rejection should make the brief
  owed. The design leans (a) but it is nowhere stated. Recommend: confirm (a) explicitly in the
  next-brief.py docstring and the cron body prose, or change the anchor. Operator/PING decision.

## INV-10 — caller_depth / envelope_depth spec
- OBSERVATION: "Depth 64 accepted" was ruled not certified; empirical is caller-depth 63 accepted /
  envelope depth 64 rejected. Definitions live in prose, code, and test vector, possibly diverging.
- EVIDENCE: Nolan's 2026-09-18 depth ruling; F7-C test vector.
- UNCERTAINTY: Every definition and consumer of depth across spec/code/test/runtime.
- WHY IT MATTERS: Blocks the F7+MC-1 commit; the commit message must describe what was proven.
- AUTHORITY INVOLVED: identity boundary spec authority.
- PROPOSED EXPERIMENT: Produce SPEC VALUE / CODE VALUE / TEST VALUE / RUNTIME OBSERVATION table.
  Target: one authoritative spec from which tests derive. Do NOT modify behavior in planning mode.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: No.
- EXPECTED INFORMATION GAIN: Single depth definition; corrected F7-C vector ready for re-run.
- DEPENDENCIES: None. STATUS: QUEUED.

## INV-8 — Pre-commit manifest design
- OBSERVATION: Nolan requires a visible pre-commit manifest (HEAD + staged paths + diff/stat) before
  any convergence commit; "the agent checked it" is insufficient. Allowlist drift = stop.
- EVIDENCE: 2026-09-18 commit-order ruling.
- UNCERTAINTY: Safest mechanism that answers: what HEAD/paths were authorized, what is actually staged,
  what changed since authorization, who authorized, is the manifest still valid? Interaction with
  repos containing unrelated staged work (the curious-squid mixed-index case is the adversarial fixture).
- WHY IT MATTERS: Blocks the F7+MC-1 commit; prevents index-risk commits.
- AUTHORITY INVOLVED: commit authorization.
- PROPOSED EXPERIMENT: Design (not implement) the manifest flow; study mixed-index interaction.
  Do not assume clearing the index is acceptable.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, to adopt the mechanism.
- EXPECTED INFORMATION GAIN: A commit gate design Nolan can approve.
- DEPENDENCIES: INV-10 (depth must settle first per commit order). STATUS: DESIGN COMPLETE (awaiting operator approval).

### INV-8 DESIGN (2026-09-18, PROPOSED)
The manifest is a document, not a feeling. Minimum viable manifest, generated mechanically:
1. repo + HEAD sha + HEAD message + `git status --porcelain` (full, not just staged).
2. Exact staged paths (`git diff --cached --name-only`), each checked against the authorized allowlist;
   any staged path NOT on the allowlist = STOP, no exceptions, no "it's probably fine".
3. `git diff --cached --stat` plus the full `git diff --cached` for small units (the F7+MC-1 unit is
   bounded; a full diff is readable).
4. Authorization record: who authorized this exact unit, when, in which message/turn (a pointer, not
   "Nolan said so once").
5. Freshness: the manifest is generated immediately before the commit command, in the same session;
   a manifest older than the last index mutation is void. Re-run `git status` after generating.
Adversarial fixture (curious-squid case): unrelated work already staged in the index. The manifest
must SURFACE it, never silently include or silently drop it. Policy options: (a) abort the commit
until the index is clean or the unrelated work is explicitly added to the authorization; (b) commit
with `git commit -- <exact paths>` so only allowlisted paths commit, leaving other staged changes
staged (safe but confusing); (c) require a clean index. Recommend (a): abort is the only option that
cannot silently misattribute work. Never `git stash` someone else's WIP as a "cleanup" step.
Open question for the operator: should the manifest live as a file in the repo (auditable, but then
it is itself a change) or as a sidecar in the goal's hidden_files (no repo pollution, but detached)?
Recommend sidecar + sha256 of the staged diff recorded in the commit message trailer.
- OBSERVATION: Nolan requires a visible pre-commit manifest (HEAD + staged paths + diff/stat) before
  any convergence commit; "the agent checked it" is insufficient. Allowlist drift = stop.
- EVIDENCE: 2026-09-18 commit-order ruling.
- UNCERTAINTY: Safest mechanism that answers: what HEAD/paths were authorized, what is actually staged,
  what changed since authorization, who authorized, is the manifest still valid? Interaction with
  repos containing unrelated staged work (the curious-squid mixed-index case is the adversarial fixture).
- WHY IT MATTERS: Blocks the F7+MC-1 commit; prevents index-risk commits.
- AUTHORITY INVOLVED: commit authorization.
- PROPOSED EXPERIMENT: Design (not implement) the manifest flow; study mixed-index interaction.
  Do not assume clearing the index is acceptable.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, to adopt the mechanism.
- EXPECTED INFORMATION GAIN: A commit gate design Nolan can approve.
- DEPENDENCIES: INV-10 (depth must settle first per commit order). STATUS: QUEUED.

## INV-6 — Contradiction system audit
- OBSERVATION: CONTRADICTIONS.md entries lack owner/closure_condition; the net-closed metric is
  gameable if producer and verifier are the same principal.
- EVIDENCE: 2026-09-18 grill; Nolan's minimum-fields ruling.
- UNCERTAINTY: How many open/closed, how many lack owner/closure_condition, oldest open,
  blocking vs non-blocking, evidence attached, who opened/closed each, producer-vs-verifier identity.
- WHY IT MATTERS: The headline checkpoint metric is meaningless until the ledger is typed.
- AUTHORITY INVOLVED: contradiction authority (currently none).
- PROPOSED EXPERIMENT: Audit the current file read-only; do NOT game the metric; design typed
  representation only after understanding current semantics. Invariant: closed = replayable evidence
  satisfies explicit closure condition, never label change.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, to adopt typed ledger.
- EXPECTED INFORMATION GAIN: True open/closed/net/oldest-open counts.
- DEPENDENCIES: None. STATUS: QUEUED.

## INV-5 — Clean-context verifier protocol
- OBSERVATION: Current subagents inherit the full transcript, which contaminates independence.
  "Independent verification" requires a separate principal from a clean state without the producer's
  runtime state.
- EVIDENCE: 2026-09-18 reproducibility ruling; subagent transcript inheritance is by design.
- UNCERTAINTY: Exactly what a verifier receives today (execution context, claim, source evidence,
  repo state, history, rulings, prior conclusions). What can be achieved with existing tooling.
- WHY IT MATTERS: MC-1's 85/85 is agent-attested until a clean verifier reproduces it.
- AUTHORITY INVOLVED: verification authority.
- PROPOSED EXPERIMENT: Separate the received context into layers; design minimum CLAIM + REPRO BUNDLE
  + KNOWN REPO STATE + SPECIFICATION -> CLEAN VERIFIER -> INDEPENDENT RESULT protocol.
  Determine what existing tooling supports before proposing runtime changes.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, for runtime changes.
- EXPECTED INFORMATION GAIN: A workable independent-verification discipline.
- DEPENDENCIES: INV-7 (needs the repro bundle shape). STATUS: PROTOCOL PROPOSED (awaiting operator/PING confirmation).

### INV-5 PROTOCOL (2026-09-18, PROPOSED)
Contamination layers a spawned verifier receives today: (1) full conversation transcript, including the
producer's claims, reasoning, and conclusions; (2) prior tool outputs, some embedding the producer's
interpretation; (3) the user's own endorsements; (4) standing files. Telling a transcript-inheriting
subagent "ignore the transcript" is a discipline, not a boundary: the contamination is present.
Key tooling observation: side chats have their own separate transcript and context. A verifier run in
a side chat starts without the main transcript. That is the existing-tooling clean room.
Proposed CLEAN-CONTEXT CROSS-AGENT VERIFICATION protocol:
1. Producer writes the repro bundle (INV-7 shape) to files; bundle contains the claim, the harness,
   fixtures, setup/teardown, assertions, expected-result hash, env assumptions. Nothing else.
2. Verifier is briefed in a side chat with ONLY: the claim, the bundle path, the repo state (commit
   sha), the specification. Explicitly: no summary of the producer's reasoning, no "we proved X".
3. Verifier re-runs from a clean state and reports an independent result with its session identity.
4. Result recorded as: CLAIM + BUNDLE_SHA + REPO_SHA + VERIFIER_IDENTITY -> RESULT.
Honest labeling: this is clean-context cross-agent verification, NOT independent verification in
Nolan's strong sense (same model family, same tooling). "Independent verification" stays reserved
for a genuinely separate principal (Nolan, a different system, a different organization). The protocol
also needs a non-collusion note: the verifier must not have access to the producer's session, and the
producer must not "help" mid-verification. Two unknowns for PING/operator: whether side-chat
transcript isolation is a guaranteed boundary or an implementation detail, and whether verifier
identity is attributable after the fact.
- OBSERVATION: Current subagents inherit the full transcript, which contaminates independence.
  "Independent verification" requires a separate principal from a clean state without the producer's
  runtime state.
- EVIDENCE: 2026-09-18 reproducibility ruling; subagent transcript inheritance is by design.
- UNCERTAINTY: Exactly what a verifier receives today (execution context, claim, source evidence,
  repo state, history, rulings, prior conclusions). What can be achieved with existing tooling.
- WHY IT MATTERS: MC-1's 85/85 is agent-attested until a clean verifier reproduces it.
- AUTHORITY INVOLVED: verification authority.
- PROPOSED EXPERIMENT: Separate the received context into layers; design minimum CLAIM + REPRO BUNDLE
  + KNOWN REPO STATE + SPECIFICATION -> CLEAN VERIFIER -> INDEPENDENT RESULT protocol.
  Determine what existing tooling supports before proposing runtime changes.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, for runtime changes.
- EXPECTED INFORMATION GAIN: A workable independent-verification discipline.
- DEPENDENCIES: INV-7 (needs the repro bundle shape). STATUS: QUEUED.

## INV-9 — Scheduler delivery sentinel (generalizes INV-1)
- OBSERVATION: INV-1 found the gap class systemic by construction; no drift detector exists.
- EVIDENCE: INV-1 finding.
- UNCERTAINTY: Whether byte-hash equality is sufficient, or scheduler systems normalize/wrap/template
  bodies (need semantic delivery verification where byte equality is inappropriate).
- WHY IT MATTERS: Prevents the next stale-body incident across all schedules.
- AUTHORITY INVOLVED: scheduler delivery.
- PROPOSED EXPERIMENT: Explore invariant AUTHORED BODY HASH = REGISTERED BODY HASH =
  EXPECTED RUNTIME BODY HASH; test whether the scheduler transforms bodies; identify every scheduled
  automation lacking delivery proof. Design only; implementation needs operator approval.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, to deploy the sentinel.
- EXPECTED INFORMATION GAIN: A deployable drift-detection design.
- DEPENDENCIES: INV-1 (complete). STATUS: DESIGN COMPLETE (awaiting operator approval).

### INV-9 DESIGN (2026-09-18, PROPOSED)
Invariant: sha256(authored .md body) == sha256(registered body) == sha256(body the worker received).
Evidence from INV-1 (16/16 canary match) suggests the scheduler does not mangle content, but
byte-exactness is unverified. The sentinel's first run ESTABLISHES the baseline rather than assuming it:
1. Canonicalize: compare on exact bytes first. If bytes differ, compare on normalized form (trailing
   whitespace stripped, line endings normalized). If normalized matches, record the scheduler's transform
   and compare on canonicalized form thereafter. If neither matches: DRIFT, loud alert.
2. Coverage: every user-owned schedule, including disabled ones (a disabled job with a drifted body is
   a loaded gun: the drift detonates on re-enable). facebook-session-watch is the current example.
3. Cadence: piggyback on an existing frequent job (pig-health-heartbeat, every 30m) round-robin, one or
   two schedules checked per run. Avoids a new schedule and the who-watches-the-watcher recursion for
   the common case. Long-term home: PING-side schedule integrity when PING returns (the gateway as
   authority over what the runtime believes is registered).
4. Alert contract: drift → surface to Nolan immediately (this is failure/blocker class, not routine).
   No drift → silence.
Honest limit: perfect self-monitoring is impossible (the checker can drift too). The goal is to shrink
the detection window from "~1 day, found by accident" to "<1 hour, found by machine" and make every
future drift LOUD. Deployment needs operator approval; the experiment to run first is a single
round-trip byte comparison on one job to settle the transform question.
- OBSERVATION: INV-1 found the gap class systemic by construction; no drift detector exists.
- EVIDENCE: INV-1 finding.
- UNCERTAINTY: Whether byte-hash equality is sufficient, or scheduler systems normalize/wrap/template
  bodies (need semantic delivery verification where byte equality is inappropriate).
- WHY IT MATTERS: Prevents the next stale-body incident across all schedules.
- AUTHORITY INVOLVED: scheduler delivery.
- PROPOSED EXPERIMENT: Explore invariant AUTHORED BODY HASH = REGISTERED BODY HASH =
  EXPECTED RUNTIME BODY HASH; test whether the scheduler transforms bodies; identify every scheduled
  automation lacking delivery proof. Design only; implementation needs operator approval.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, to deploy the sentinel.
- EXPECTED INFORMATION GAIN: A deployable drift-detection design.
- DEPENDENCIES: INV-1 (complete). STATUS: QUEUED.

## INV-7 — Reproducibility bundle (MC-1 reference case)
- OBSERVATION: MC-1's 85/85 needs a sanitized harness + setup/teardown + assertions + fixtures
  (no credentials) that another principal can run from a clean state.
- EVIDENCE: 2026-09-18 MC-1 reproducibility ruling.
- UNCERTAINTY: What a reusable certification bundle actually needs; compare several existing
  certification/evidence units for the common denominator before standardizing filenames.
- WHY IT MATTERS: "Certification should be re-runnable, not merely believable."
- AUTHORITY INVOLVED: certification authority.
- PROPOSED EXPERIMENT: Survey existing units; derive minimum bundle shape
  (manifest/harness/fixtures/setup/teardown/assertions/expected-result hash/env assumptions/
  verifier identity). Do not prematurely standardize filenames.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, to adopt the standard.
- EXPECTED INFORMATION GAIN: The bundle spec MC-1's preserved harness instantiates.
- DEPENDENCIES: None (feeds INV-5). STATUS: QUEUED.

## INV-11 — Chaos harness prep (O3/O15)
- OBSERVATION: O3 cannot be certified on an idle system; in-flight failure testing required.
- EVIDENCE: 2026-09-18 O3 durability ruling.
- UNCERTAINTY: Exact PASS/FAIL/INCONCLUSIVE criteria; whether the real contract is at-least-once
  with idempotent handling rather than exactly-once.
- WHY IT MATTERS: Durability claims need a reusable harness, not bespoke theater per unit.
- AUTHORITY INVOLVED: durability/claim authority.
- PROPOSED EXPERIMENT: Model start-mission -> confirm-accepted -> kill-worker -> restart ->
  observe-recovery -> verify-no-loss -> measure-duplicates -> verify-evidence. Specify criteria.
  Do not claim exactly-once without evidence. Prepare only; do not recklessly execute.
- DESTRUCTIVE?: The harness itself is destructive by nature; preparation is not.
  OPERATOR DECISION REQUIRED?: Yes, to execute.
- EXPECTED INFORMATION GAIN: An executable durability contract.
- DEPENDENCIES: Pig availability (execution only). STATUS: PREP COMPLETE (execution needs Pig + operator approval).

### INV-11 PREP (2026-09-18, PROPOSED)
First principle: the harness cannot test a contract that was never stated. Before any kill test,
the runtime's promised semantics must be written down. Candidate: AT-LEAST-ONCE delivery with
idempotent handling, lease-based claiming, dead-letter after N retries. Under that contract:
- Scenario A (worker death mid-mission): start mission, confirm claimed/in-flight, kill -9 the worker,
  restart, observe. PASS = mission reclaimed and completed exactly per the stated retry/dead-letter
  semantics, with evidence of the reclaim in the ledger. FAIL = mission silently lost (no terminal
  state, no dead-letter). INCONCLUSIVE = lease state ambiguous after restart (record as a finding,
  not a pass).
- Scenario B (scheduler death mid-dispatch): kill scheduler between claim and dispatch. PASS = no
  double-dispatch beyond the promised semantics, or double-dispatch with idempotent handling proven.
  FAIL = the same mission executed twice with non-idempotent effects.
- Scenario C (runtime process death): kill the mission runtime itself. PASS = recovery follows the
  documented L0-L6 ladder; each claimed level demonstrated, not asserted.
- Scenario D (duplicate measurement): run A ten times; count duplicate executions. The count is not
  a failure by itself: it is the MEASURED duplication behavior, to be written into the contract.
  Claiming exactly-once while measuring duplicates is falsification material.
Reusable harness shape: scenario script + fault injector + state prober + evidence collector, all
deterministic and re-runnable, producing a result bundle in the INV-7 shape. Execution requires the
Pig and operator approval. Until then, the open question for Nolan: is the intended contract
at-least-once-with-idempotency, and where is it written?
- OBSERVATION: O3 cannot be certified on an idle system; in-flight failure testing required.
- EVIDENCE: 2026-09-18 O3 durability ruling.
- UNCERTAINTY: Exact PASS/FAIL/INCONCLUSIVE criteria; whether the real contract is at-least-once
  with idempotent handling rather than exactly-once.
- WHY IT MATTERS: Durability claims need a reusable harness, not bespoke theater per unit.
- AUTHORITY INVOLVED: durability/claim authority.
- PROPOSED EXPERIMENT: Model start-mission -> confirm-accepted -> kill-worker -> restart ->
  observe-recovery -> verify-no-loss -> measure-duplicates -> verify-evidence. Specify criteria.
  Do not claim exactly-once without evidence. Prepare only; do not recklessly execute.
- DESTRUCTIVE?: The harness itself is destructive by nature; preparation is not.
  OPERATOR DECISION REQUIRED?: Yes, to execute.
- EXPECTED INFORMATION GAIN: An executable durability contract.
- DEPENDENCIES: Pig availability (execution only). STATUS: QUEUED.

## INV-12 — O18 manifest schema (PROPOSED)
- OBSERVATION: O18 needs a versioned machine-readable Oracle Runtime Evidence Manifest before
  execution begins; human report renders from the manifest.
- EVIDENCE: 2026-09-18 O18 consumer-contract ruling.
- UNCERTAINTY: Minimum schema to describe existing artifacts.
- WHY IT MATTERS: Oracle agent consumes the schema; prevents building the wrong O18.
- AUTHORITY INVOLVED: Oracle consumer contract.
- PROPOSED EXPERIMENT: Inspect existing artifacts; derive minimum schema; prepare candidate orem/v1
  labeled PROPOSED until PING/operator approval. Separate machine-readable canonical form from
  Markdown rendering.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, to adopt.
- EXPECTED INFORMATION GAIN: A schema the Oracle consumer can declare compatibility with.
- DEPENDENCIES: None. STATUS: SCHEMA PROPOSED (awaiting operator approval).

### INV-12 CANDIDATE SCHEMA orem/v1 (2026-09-18, PROPOSED)
```json
{
  "orem_version": "1",
  "generated_at": "<iso8601>",
  "runtime": { "commit": "<sha>", "branch": "<name>", "repo": "<path-or-url>" },
  "authorities": [ { "name": "<authority>", "owner_component": "<path>", "enforcement": "advisory|checked|interlock" } ],
  "services": [ { "name": "<service>", "required": true, "health_command": "<cmd>", "last_proof": "<evidence-id>" } ],
  "persistence": [ { "store": "<name>", "classification": "canonical|derived|projection|cache|audit_history", "continuity_epoch": "<id>" } ],
  "certifications": [ { "unit": "<id>", "evidence_id": "<id>", "verifier": "<identity>", "result": "pass|fail", "bundle_sha": "<sha256>" } ],
  "contradictions": { "open": 0, "closed": 0, "net": 0, "oldest_open_age_h": 0 },
  "deployment_blockers": [ "<text>" ],
  "unknowns": [ "<text>" ]
}
```
Notes: the `enforcement` field on authorities reuses the INV-2 classification (this is where the
command-vs-interlock map becomes machine-readable). The human-readable O18 report renders FROM this
manifest, never the reverse. `unknowns` is a first-class field: the manifest must be able to say what
it does not know. Adoption needs operator approval; until then this is PROPOSED.
- OBSERVATION: O18 needs a versioned machine-readable Oracle Runtime Evidence Manifest before
  execution begins; human report renders from the manifest.
- EVIDENCE: 2026-09-18 O18 consumer-contract ruling.
- UNCERTAINTY: Minimum schema to describe existing artifacts.
- WHY IT MATTERS: Oracle agent consumes the schema; prevents building the wrong O18.
- AUTHORITY INVOLVED: Oracle consumer contract.
- PROPOSED EXPERIMENT: Inspect existing artifacts; derive minimum schema; prepare candidate orem/v1
  labeled PROPOSED until PING/operator approval. Separate machine-readable canonical form from
  Markdown rendering.
- DESTRUCTIVE?: No. OPERATOR DECISION REQUIRED?: Yes, to adopt.
- EXPECTED INFORMATION GAIN: A schema the Oracle consumer can declare compatibility with.
- DEPENDENCIES: None. STATUS: QUEUED.

## Demotion log
- (none yet)
