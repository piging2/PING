# GITHUB INTELLIGENCE PIPELINE — production design (2026-09-23)

Status: design + seed. The pipeline is production infrastructure, not a
research campaign. It runs forever (perpetual mode) with disposable workers,
bounded attempts, checkpoints, and evidence-graded records.

Binding inputs:
- `STANDING-LAW-2026-09-23.md`: 80%+ decide-and-continue; no grill routing;
  consequential-gate list; no direct worker DB writes; unauthenticated GitHub
  with conditional requests; silent when healthy; FYD wins harvest ties.
- `BASELINE-FREEZE-2026-09-23.md`: read-only posture; two planes (PIG, ORACLE);
  live mission store is `ping_missions` on the PIG plane's brain-postgres.
- Seed corpus: `github-corpus/seed-2026-09-23.jsonl` (66 repos + 1 synthetic
  record, 262 mechanism records + 23 red-team verdicts imported 2026-09-23).

Core invariant: the pipeline produces EVIDENCE and RANKED TASKS, never
mutations. External evidence never auto-authorizes a change to CRX, FYD,
memory, or any production system. Harvest authority stays human (or
human-granted mission authority) behind the consequential gate.

---

## 1. PIPELINE STAGES (entry/exit criteria)

A candidate enters at DISCOVER and can exit at any stage. Every stage writes
a record with the worker id, timestamp, inputs consumed, and evidence level
claimed. Nothing advances on assertion alone.

### DISCOVER
- Entry: a scheduled DISCOVERY mission run begins with a bounded query budget.
- Work: enumerate candidate repos from declared sources only (trending feeds,
  dependency graphs of watched repos, curated lists, prior-lane references,
  Meta AI intel after verification). No unbounded crawling.
- Exit: each candidate gets a stub record: immutable repo identity
  (forge + owner + repo, normalized lowercase; GitHub numeric node id when the
  API supplies it), discovery source, discovery date. Duplicates merge at
  DEDUPLICATE, not here.

### IDENTIFY
- Entry: stub record exists.
- Work: resolve forks to upstream, renames to current name, transfers to
  current owner. Record license from the LICENSE file (SPDX or verbatim),
  primary language, repo id. If identity cannot be resolved, the record stays
  at L0 with `identity_note` explaining the gap. Never guess an owner/repo.
- Exit: `repo` identity stable; license field populated (or explicitly
  `UNVERIFIED`); language recorded. Failure to identify is a terminal state
  with reason, not a silent drop.

### PIN SHA
- Entry: identity resolved.
- Work: resolve the default branch HEAD SHA (full 40 hex) via the API.
  That SHA is the observation anchor. Every later claim about the repo is
  qualified by this SHA. If the SHA moves mid-pipeline, restart from FETCH
  CLAIMS at the new SHA and keep the old observation as history.
- Exit: `observed_sha` (40 hex) recorded with resolution timestamp.
  No SHA, no L2+.

### FETCH CLAIMS
- Entry: SHA pinned.
- Work: collect the repo's own claims about itself: README, docs, releases,
  architecture notes, benchmarks it publishes. Record them as CLAIMS with
  provenance (file path @ SHA, or release tag). Do not treat claims as facts.
- Exit: claim inventory recorded; every claim has a source pointer.
  This stage caps at L1.

### INSPECT SOURCE
- Entry: pinned SHA; source accessible (clone, tarball, or API tree).
- Work: read the actual files that implement the claimed mechanism. Verify
  file paths, function names, config schemas. For a README-level or
  announcement-level repo where no source exists, this stage is skipped with
  reason and the record stays at L1/L2.
- Exit: file-level references (`path@SHA`, symbol names) recorded, or an
  explicit skip reason. This stage unlocks L2/L3.

### NORMALIZE
- Entry: source inspection done (or skipped with reason).
- Work: rewrite the finding into the canonical mechanism record shape
  (problem, mechanism, invariant, failure model, security model, scaling
  model, integration cost, expected value, falsification test). One record
  per mechanism, one mechanism per record. Strip marketing language; keep
  one reproducible reference per claim.
- Exit: mechanism record(s) written in canonical shape. Giant READMEs are
  never copied; references suffice.

### CLASSIFY EVIDENCE
- Entry: normalized record(s).
- Work: assign an evidence level per section 2. The level is the MINIMUM
  over all claims in the record: one unverified claim caps the whole record.
- Exit: `evidence_level` + `evidence_basis` set. Levels only move up on new
  evidence, never on re-reading old evidence.

### TEMPORAL DIFF
- Entry: record exists from a prior observation; a new SHA is pinned.
- Work: diff old SHA against new SHA scoped to the files the mechanism
  touches. Classify the change: cosmetic, refactor, behavior change,
  security-relevant, license change, archival signal.
- Exit: incremental observation appended; unchanged repos get a
  "no material change" heartbeat, never a re-research.

### DEDUPLICATE
- Entry: any stage where a candidate may duplicate an existing record.
- Work: apply section 5 rules. Merge into the canonical record; keep the
  duplicate's provenance as an alias, never as a separate candidate.
- Exit: one canonical record per distinct mechanism; aliases recorded.

### COMPARE AGAINST CRX/FYD
- Entry: normalized, deduped mechanism record at L2+.
- Work: state the CRX analog (what exists today) and the semantic delta
  (what is genuinely new). State the FYD analog separately: FYD extraction,
  site planner, renderer, builder, agent UX, evaluation. If no analog
  exists, say so explicitly; absence of analog is information, not a gap
  to fill with speculation.
- Exit: `crx_analog`, `fyd_analog`, `semantic_delta` populated or marked
  unknown with reason.

### EXTRACT MECHANISMS
- Entry: comparison done; record judged harvest-relevant (PATTERN or better).
- Work: extract the mechanism as a self-contained, testable unit with its
  invariant and falsification test. Tag consumers (section 8).
- Exit: extraction record with consumer tags and harvest class.

### RED TEAM
- Entry: extraction record with harvest class ADAPT or REUSE.
- Work: adversarial review with a fixed method: attack trace (concrete
  exploit or failure sequence), corrected invariant, hardening required,
  scaling risk, cross-tenant risk. Verdict is one of
  SURVIVES / NEEDS-HARDENING / REJECTED.
- Exit: verdict + hardening requirements recorded. NEEDS-HARDENING is not
  a soft pass: the hardening list is binding on any later harvest task.

### HARVEST DECISION
- Entry: red-team verdict in hand.
- Work: decide REUSE / ADAPT / PATTERN / WATCH / REJECT using the
  relevance-vs-confidence axes (section 3). The decision names the consumer
  and the expected value; REJECT names the reason.
- Exit: `harvest_class` + decision rationale. REJECT is terminal for the
  mechanism (the repo stays on watch for change).

### CREATE ACTIONABLE TASK
- Entry: harvest class ADAPT or REUSE with red-team verdict SURVIVES or
  NEEDS-HARDENING (hardening folded into the task).
- Work: create a ranked task in the backlog: what to build/adapt, the
  evidence it rests on (level + SHA), the hardening requirements, the
  consumer, the suggested priority. Dedupe against the existing backlog
  before creating.
- Exit: task created with evidence links, or merged into an existing task
  with the new evidence appended. Creating the task authorizes NOTHING
  beyond the task's existence (section 9).

### REMEMBER
- Entry: any terminal or checkpoint state.
- Work: persist the record to the pipeline memory (the corpus JSONL and,
  through authorized paths only, PING). Memory writes go through the
  application/migration path; workers never write the DB directly.
- Exit: record durable and queryable; prior versions retained as history.

### WATCH FOR CHANGE
- Entry: remembered record.
- Work: this is the steady state, not a stage that ends. CHANGE_WATCH
  missions poll the repo's immutable identity for the signals in section 4
  using conditional requests. On material change, emit an incremental
  observation and re-enter at TEMPORAL DIFF. On no change, emit a
  heartbeat and stop.
- Exit: never, by design. Records leave watch only by explicit human
  decision (repo archived upstream, harvest completed, or relevance
  permanently expired).

---

## 2. EVIDENCE LEVELS AND CEILINGS

Levels are about what was VERIFIED, not what was read. The ceiling rule:
a record sits at the highest level whose requirements are ALL met. Most
external repos legitimately stop at L2/L3. Never manufacture L4/L5.

- **L0_DISCOVERED**: the repo exists and is identified. Requirement: resolved
  forge+owner+repo identity and discovery provenance. Claims: none.
- **L1_CLAIMED**: the repo's own claims are inventoried. Requirement: claims
  captured with source pointers (README/docs/release @ SHA or tag).
  Claims: "the project says X about itself." Nothing more.
- **L2_SOURCE_STRUCTURE_VERIFIED**: the repo's structure supports the claim.
  Requirement: pinned SHA + file/directory layout inspected (tree, manifests,
  config schemas) confirming the claimed component exists where claimed.
  Claims: "the code is organized as claimed." Mechanism behavior NOT verified.
- **L3_SOURCE_MECHANISM_VERIFIED**: the mechanism is verified in source.
  Requirement: pinned SHA + the implementing files read + symbol-level
  references recorded (functions, schemas, state transitions) + failure and
  security models derived from the code, not the docs.
  Claims: "the mechanism works as described, at this SHA."
- **L4_TEST_OR_EXECUTION_VERIFIED**: the mechanism was executed.
  Requirement: L3 + the mechanism (or a faithful harness of it) was actually
  run: tests executed, a reproduction built, a falsification test performed
  with observed output. Claims: "it behaves as described when run."
- **L5_PRODUCTION_EVIDENCE**: the mechanism has production proof.
  Requirement: L4 + observed production deployment, incident history,
  benchmark with methodology, or sustained operational data.
  Claims: "it survives production."

What each level can NEVER claim:
- L1 can never claim the code does anything.
- L2 can never claim the mechanism behaves as described.
- L3 can never claim it works when executed, at scale, or under adversarial
  conditions. L3 is where the red team starts, not where it ends.
- L4 can never claim production survivability.
- External repos reach L4 only when a DEEP_INSPECTION mission actually runs
  the code, and L5 only with production evidence from the operator or a
  trustworthy third party. A benchmark quoted from a README is L1.

Level promotion requires new evidence of the required kind. Re-reading the
same source, paraphrasing, or citing the claim more confidently does not
promote. Vector similarity between descriptions is NEVER evidence of anything
and is not used at any stage.

---

## 3. RELEVANCE vs CONFIDENCE: INDEPENDENT AXES

Every candidate carries nine attributes, evaluated independently:

1. `relevance` — how much the mechanism matters to CRX/FYD goals (0-1 with
   a one-line reason, not just a number).
2. `evidence_level` — L0-L5 per section 2.
3. `novelty` — what is genuinely new vs the CRX/FYD analog (none / delta /
   new capability).
4. `harvestability` — REUSE / ADAPT / PATTERN / WATCH / REJECT with rationale.
5. `security_risk` — what breaks if this is wrong or hostile (data exfil,
   tenant escape, supply chain, prompt injection surface).
6. `maintenance_risk` — bus factor, release cadence, dependency weight,
   activity trend.
7. `license_compatibility` — SPDX/verbatim + flag: OK / PATTERN-ONLY
   (copyleft, SSPL/Elastic, BSL, unverified). Copyleft and source-available
   licenses never silently become REUSE.
8. `integration_cost` — Low / Medium / High with the concrete work named.
9. `expected_value` — what changes if harvested, in business/operational
   terms, not adjectives.

There is NO single magic score. Collapsing these nine into one number
destroys semantics because the axes answer different questions asked by
different consumers at different times:

- A high-relevance, L1-evidence candidate is a research lead, not a harvest
  target. A single score would either bury it or over-promote it.
- A low-relevance, L3-evidence, REUSE-class utility is a safe small win.
  A single score averages it into invisibility.
- `security_risk` and `license_compatibility` are VETO axes, not weights.
  Averaging a license veto into a score of 7.2/10 is how copyleft ends up
  in a proprietary codebase.
- `maintenance_risk` changes over time while `novelty` does not; a frozen
  score cannot represent a live watch.
- Different consumers (section 8) rank differently: FYD_EXTRACTION cares
  about harvestability, SECURITY cares about security_risk, MEMORY cares
  about novelty. One score serves none of them.

Ranking is per-consumer, per-decision, computed from the axes at query
time with the consumer's stated priority. The axes are the stable truth;
any ranking is a disposable view.

---

## 4. TEMPORAL WATCH BY IMMUTABLE REPO IDENTITY

Identity is `forge + owner + repo` normalized, plus the forge's numeric
repo id when the API provides it (immutable across renames and transfers).
The watch key is the identity; the observation anchor is the pinned SHA.
A rename or transfer updates the name fields, never creates a new record.

Change signals tracked (each with a first-seen timestamp and the SHA range):

1. New commit on the default branch (HEAD moved).
2. New release / tag published.
3. Merged PR touching watched paths (the files the mechanism lives in).
4. Dependency change (manifest diff: new deps, version jumps, removed deps).
5. Architecture change (new top-level modules, moved boundaries, config
   schema changes).
6. Benchmark change (new benchmark claims or methodology changes).
7. Security advisory published against the repo or its dependencies.
8. License change (ANY license file or header change is a P0 signal:
   stop harvest work on that repo until re-verified).
9. Archival (repo archived, README deprecation notice, "no longer
   maintained" signal).
10. Activity decline (no commits / releases / issue activity for N days,
    where N is set per watch tier; a signal, not a verdict).
11. Transfer or rename (identity update, alias retained).

Incremental-observation rule: NEVER re-research an unchanged repo. On each
watch tick, resolve HEAD with a conditional request (ETag /
If-Modified-Since). If HEAD == pinned SHA, write a heartbeat (timestamp,
`no_change`) and stop. If HEAD moved, diff ONLY the watched paths between
the pinned SHA and the new HEAD, classify the change, append an incremental
observation, and re-pin. Full re-inspection happens only when the diff
touches mechanism-relevant paths or a P0 signal fires. The corpus grows by
accretion, not by re-crawling.

---

## 5. DEDUP RULES

One canonical record per distinct mechanism. Merge aggressively; provenance
of the merged-away candidate is kept as an alias.

- **Forks**: resolve to upstream. A fork is a separate record only if it
  has diverged in mechanism-relevant code (diff proves it).
- **Mirrors**: read-only copies (e.g., GitLab/GitHub mirrors) merge into the
  canonical upstream record.
- **Renames**: same repo id, new name. Update name fields, keep alias.
- **Org transfers**: same repo id, new owner. Update owner, keep alias,
  re-verify license (transfers sometimes change it).
- **Tutorial clones**: "learn-X-by-building" repos that reimplement a
  mechanism for teaching. Merge into the original's record with
  `pedagogy_note`; they are evidence of understandability, not novelty.
- **Framework wrappers**: thin adapters over another harvested mechanism
  (e.g., "X for framework Y"). Record as a consumer note on the underlying
  mechanism, not a new mechanism, unless the wrapper adds mechanism-level
  behavior (prove with diff).
- **Thin integrations**: glue code with no mechanism of its own. Note as
  integration evidence; not a candidate.
- **Benchmark-only repos**: harnesses that measure but do not implement.
  Useful as L1 evidence for someone else's L5 claim; never a mechanism.
- **Marketing examples**: sample apps in a repo's `examples/` dir. They are
  claims (L1), not implementations.

Dedup key discipline: identity for repos, (identity + mechanism fingerprint)
for mechanisms. Mechanism fingerprint is the normalized invariant text,
not vector similarity. When in doubt, keep separate and mark
`possible_duplicate_of` for a human or a later mission to resolve; a false
merge destroys evidence, a missed merge only costs a query.

---

## 6. MISSION DESIGN: DURABLE MISSIONS, DISPOSABLE WORKERS

No immortal agents. No infinite reasoning loops. The pattern is always:
durable mission (intent + budget + stop conditions, persisted) -> bounded
attempt (one worker, one slice of work) -> checkpoint (state written) ->
release (worker ends). The next attempt resumes from the checkpoint, never
from conversation memory.

All missions obey standing law: read-only against GitHub except normal
API/conditional requests; no writes to any repo; no secrets in output;
unauthenticated with caching until rate limits actually block (then surface
as a blocker and propose a least-privilege GitHub App); workers never write
the DB directly (application/migration paths only); silent when healthy;
report in directive shape (verified checkpoints, material failures,
blockers, genuine decisions).

### MISSION: DISCOVERY
- Goal: keep the candidate funnel full without unbounded crawling.
- Authority: read GitHub API/search, read web docs. No repo writes, no
  cloning beyond shallow/tree reads unless IDENTIFY needs it.
- Budget: per run, a fixed cap (e.g., 50 candidate stubs). Query sources
  from the declared list only.
- Stop conditions: budget exhausted; source list covered; rate-limit
  remaining below reserve threshold (stop, checkpoint, resume next run).
- Cadence: daily, bounded rolling. Each run covers the next slice of
  sources; the full source list cycles on a rolling window.

### MISSION: CHANGE_WATCH
- Goal: incremental observations on watched repos; heartbeats on silence.
- Authority: conditional API requests (ETag/If-Modified-Since) against
  pinned identities; diff watched paths on HEAD movement.
- Budget: per run, all daily-tier repos + a rolling slice of the rest.
  Conditional requests make the marginal cost of a no-change tick ~zero.
- Stop conditions: watch list covered; any P0 signal (license change,
  archival, security advisory) immediately emits an observation and, for
  license changes, a harvest-hold flag.
- Cadence: high-value watchlist daily incremental diff; general corpus on
  a bounded rolling cadence (each repo touched at least every N days, N by
  tier). Full rebaseline is rare and evidence-driven: only when cumulative
  diffs or a P0 signal invalidate the standing observation.

### MISSION: DEEP_INSPECTION
- Goal: move a candidate up the evidence ladder (L1->L2->L3, or L3->L4 by
  actually running the mechanism).
- Authority: clone at pinned SHA (shallow, single commit), read source,
  run tests/harnesses in a sandbox. Never execute untrusted code on
  production hosts; sandbox or disposable environment only.
- Budget: per attempt, one repo + one mechanism; time-boxed.
- Stop conditions: evidence level assigned with basis; mechanism proven
  absent (record the negative result, it is still evidence); sandbox
  failure (report, do not retry blindly); budget exhausted.
- Cadence: TRIGGERED, not scheduled. Trigger: harvest class ADAPT/REUSE
  proposed, or relevance x novelty above threshold with L2 evidence.
  Triggered work is still bounded: one attempt, one checkpoint.

### MISSION: RED_TEAM
- Goal: adversarial verdict on extraction records (section 1, RED TEAM
  stage method).
- Authority: read the extraction record, the pinned source, and prior
  verdicts. No new harvesting, no scope expansion into new repos.
- Budget: per attempt, one mechanism; fixed attack-method checklist.
- Stop conditions: verdict SURVIVES / NEEDS-HARDENING / REJECTED with
  attack trace and hardening list; or INCONCLUSIVE with the exact missing
  evidence named (inconclusive is a result, not a failure).
- Cadence: TRIGGERED by HARVEST DECISION proposing ADAPT/REUSE.
  NEEDS-HARDENING verdicts are binding: the hardening list becomes part
  of the task, and the task is not "done" until hardening is verified.

### MISSION: CRX_COMPARISON
- Goal: maintain accurate CRX analogs and semantic deltas as CRX itself
  changes (CRX is a moving target; a delta computed in September rots).
- Authority: read CRX source at its pinned SHA (from BASELINE-FREEZE and
  later CRX pins), read the mechanism record. No CRX writes.
- Budget: per run, the set of records whose analog references a CRX
  component that changed since the comparison was made.
- Cadence: TRIGGERED by CRX change signals; plus a rolling re-verification
  slice. A stale analog is worse than no analog: mark comparisons with
  the CRX SHA they were made against.

### MISSION: FYD_COMPARISON
- Goal: same as CRX_COMPARISON, against FYD (extraction, site planner,
  renderer, builder, agent UX, evaluation).
- Authority: read FYD source at pinned SHA, read mechanism records.
- Budget/stop: as CRX_COMPARISON.
- Cadence: TRIGGERED by FYD change signals; rolling re-verification slice.
- Tiebreak: when CRX and FYD harvest priorities conflict, FYD wins
  (standing law). The comparison record states the conflict and the
  tiebreak outcome explicitly so it is auditable later.

---

## 7. RATE-LIMIT DISCIPLINE

Proceed unauthenticated. The unauthenticated GitHub API allowance is spent
only on: HEAD resolutions (conditional, cached), diffs of watched paths on
HEAD movement, and bounded discovery queries. Everything else reads from
cache or local clones.

Rules:
- Conditional requests everywhere: store ETags and Last-Modified per
  watched endpoint; a 304 is the expected common case for CHANGE_WATCH.
- Cache SHAs, trees, and file contents by (repo id, SHA, path); never
  re-fetch content for a pinned SHA.
- Reserve threshold: stop scheduling new API work when remaining quota
  drops below reserve; checkpoint and resume next run. Running into the
  limit is a planning failure, not a badge.
- Clones are shallow and single-commit at the pinned SHA; full histories
  are not fetched.
- A token becomes a surfaced blocker ONLY if rate limits actually block
  scheduled work. At that point, propose a least-privilege GitHub App
  (read-only metadata + contents, no webhook, no org access beyond watched
  repos). Do not stall pipeline design or scheduled runs waiting for
  credentials that have not been shown to be necessary.

---

## 8. CONSUMER TAGS

One pipeline, multiple consumers. Every extraction record carries the
consumers it serves; a record can serve several.

- `CRX_RUNTIME` — durable execution, mission runtime, journaling, replay.
- `AUTONOMOUS_MISSIONS` — mission design, worker lifecycle, interruption
  handling, evaluation harnesses.
- `MEMORY` — memory systems, retrieval, consolidation, provenance.
- `MCP` — MCP servers, gateways, registries, tooling, scanning.
- `OBSERVABILITY` — tracing, evals, journal checks, cost tracking.
- `FYD_EXTRACTION` — business understanding, object graph, evidence model.
- `FYD_SITE_PLANNER` — composition, component eligibility, capabilities.
- `FYD_RENDERER` — deterministic rendering, SiteSpec, projections.
- `FYD_BUILDER` — builder UX, correction loop, Ask FYD.
- `FYD_AGENT_UX` — concierge surfaces, Circle interaction model.
- `FYD_EVALUATION` — eval harnesses, failure taxonomies, judges.
- `SECURITY` — guardrails, scanning, provenance verification, red-team
  patterns.
- `GENERAL` — none of the above specifically; kept for watch value.

FYD wins ties vs CRX (standing law). When a mechanism serves both, the
record carries both tags and the harvest decision states the priority
order explicitly.

---

## 9. FINDING -> TASK: THE AUTHORITY GATE

High-confidence findings (L3+, red-team SURVIVES or NEEDS-HARDENING with
folded hardening, harvest class ADAPT/REUSE) auto-create RANKED TASKS in
the backlog. Auto-creation includes:

- Dedupe against the existing backlog first (same mechanism fingerprint,
  same consumer). New evidence appends to the existing task; it does not
  fork a duplicate.
- Priority derived per-consumer from the nine axes at creation time, with
  the derivation shown (axes in, ranking out). No hidden scores.
- Every task links its evidence: repo identity, pinned SHA, evidence
  level, red-team verdict, hardening list, license flag.

The gate, stated explicitly:

**External evidence NEVER auto-authorizes mutation.** A task created by
this pipeline authorizes exactly one thing: that the task EXISTS in the
backlog, ranked, with its evidence attached. It does not authorize code
changes, harvest implementation, dependency adoption, production deploys,
or any item on the consequential-gate list (production DB mutation outside
application/migration paths, credential changes, releases/rollbacks,
auto-merging harvested code, spending money, external publishing).

Crossing from task to implementation requires a separate authority:
human approval, or a mission whose authority explicitly includes
implementation and which was itself human-authorized. The pipeline's job
is to make that decision easy and evidence-rich, never to make it
unilaterally. A worker that implements from a pipeline task without that
authority has violated the pipeline, no matter how good the evidence.

---

## FIRST SCHEDULED MISSION RUN

The first run is CHANGE_WATCH + DISCOVERY, in that order, bounded and
quiet:

1. CHANGE_WATCH over the seed corpus (`github-corpus/seed-2026-09-23.jsonl`):
   for each of the 66 repo identities, resolve HEAD with a conditional
   request and compare against `observed_sha`. Expect most to have moved
   (the seed SHAs are from the 2026-09-23 campaign). For moved repos, diff
   only the watched paths implied by their `important_mechanisms` file
   references; append an incremental observation per repo with material
   change, heartbeat the rest. Establish `last_meaningful_change` where
   the seed says unknown. Flag any license-file change as P0 and hold
   harvest work on that repo.
2. DISCOVERY, bounded (50 stubs): one rolling slice of the declared
   sources, with DEDUPLICATE applied against the seed corpus before any
   stub is kept. No stub duplicates an existing repo identity.
3. Checkpoint everything to the corpus (append observations, never rewrite
   history), then release. Report in directive shape: counts (watched,
   moved, material, P0), material failures, blockers. Silence otherwise.

Do NOT start with DEEP_INSPECTION or RED_TEAM: the seed already carries
L2/L3 evidence and 23 red-team verdicts. New deep work is triggered by
what the first watch run finds, not by re-doing the campaign.
