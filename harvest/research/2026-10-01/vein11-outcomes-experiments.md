# Vein-11: Outcomes / Experimentation
Research pass 2026-10-01. Vein researcher (no writer authority; research only).

Arrow edge: OBJECT -> ACTION -> OUTCOME -> EVIDENCE.
Nolan's protected nuance: the experimentation/outcomes vein is "especially promising":
PostHog's connected flags/exposure/analytics/replay/experiments, and GrowthBook's
mature experiment machinery plus draft -> review -> publish agent workflows, which map to
PING's propose -> authorize -> execute -> observe -> learn without creating a new
marketing authority.

Standing law: DO NOT CREATE MARKETING TRUTH. Outcome data becomes evidence only.
No whole-mechanism ports. Rejection is a successful result.
Harvest the connection pattern (flag exposure joined to outcome to evidence),
the SRM/sequential-analysis guardrails, and the draft -> review -> publish workflow
mechanics. Never port PostHog's analytics product or GrowthBook's experiment platform
into PING.

Prior state: vein-11 had not been deepened since program start (2026-09-30 report).
This pass is the first deep vein-11 archaeology.

## Donor pins (all verified live via GitHub commits API on 2026-10-01)

| Repo | Pinned SHA (examined) | Commit date (UTC) | License model |
|---|---|---|---|
| PostHog/posthog | `81858b69f20bc997cf0e6c5027821cdd99b53514` | 2026-10-01T09:23:35Z | Path-level: MIT Expat outside `ee/`, PostHog Enterprise license inside `ee/` |
| growthbook/growthbook | `4f4929cd744a09fe8fa9392f0527924d322761ab` | 2026-10-01T02:37:52Z | Path-level: MIT Expat outside `packages/{back-end/src,front-end,shared/src}/enterprise`, GrowthBook Enterprise license inside |

License evidence read from the studied clones:
- PostHog root LICENSE: "All content that resides under the `ee/` directory ... is licensed
  under the license defined in `ee/LICENSE`. Content outside ... is available under the
  MIT Expat license." `ee/LICENSE` is the PostHog Enterprise license (production use
  requires a valid enterprise subscription; dev/test modification allowed).
- GrowthBook root LICENSE: identical structure; enterprise dirs are
  `packages/back-end/src/enterprise`, `packages/front-end/enterprise`,
  `packages/shared/src/enterprise`. Everything else MIT Expat.
  `packages/stats/pyproject.toml` declares `license = "MIT"` for gbstats.

Clones (study only, disposable): `~/workspace/harvest/research/2026-10-01/posthog`
(sparse; PostHog full tree is ~50k files), `~/workspace/harvest/research/2026-10-01/growthbook`
(full, ~282 MB). No code was copied into PING. Nothing was written to the Pig.

## Current PING implementation (traced read-only at f94bba39, Pig)

Outcome/experiment machinery: NONE. `find` for `*outcome*` and `*experiment*`
across the repo returned zero files. PING has no feature-flag evaluation engine,
no exposure capture, no outcome analytics, no experiment statistics, no replay.

What exists nearby:
- `mc-approval/` (1,527 LOC across approval_request.py 572, proposal_validate.py 381,
  emit.py 257, approval_cli.py 126, proposal_record.py 109, adapters ~82): the
  proposal -> authorization workflow. State machine:
  WAITING_APPROVAL -> APPROVED / DENIED / EXPIRED / CANCELLED / SAFE_NOOP.
  Digest-bound exact proposal bytes, tenant bound at creation (P0-2, 2026-09-30),
  idempotent request, single-shot decision, "no policy maps to APPROVED; silence is
  never approval." Proposal terminal-first law (2026-09-29): APPROVED/REJECTED are
  immutable historical truth; STALE_SUPERSEDED applies only to PENDING proposals
  whose base became invalid.
- `src/config/ui-flags.ts` and `src/config/infrastructure-flags.ts`: static boolean
  config objects (compile-time constants). No evaluation, targeting, exposure, or
  outcome join. This is config, not a flagging system.
- Event journal: `mc-approval/emit.py` emits MC_APPROVAL_REQUESTED / MC_APPROVAL_APPROVED /
  MC_APPROVAL_DENIED to a journal file; expiry outcomes recorded with typed outcomes
  (EXPIRY_POLICY_OUTCOMES). Outcome-as-evidence shape exists for approvals only.

Verdict on the current side: for the outcomes/experimentation edge of the arrow,
PING is at zero. There is no concrete live product failure to fix (vein-11 is
ARCHAEOLOGY ONLY per program law: "Do not implement campaign infrastructure yet").
Therefore no 12-question writer gate can pass from this pass. All harvestable
mechanisms are BACKLOG pending a live product edge (the first FYD action -> outcome
loop), and all whole-product adoptions are REJECT.

---

## Candidate 1: PostHog FOSS connected machinery

AREA: Outcome analytics / experimentation (flags + exposure + analytics + replay +
experiments connected). Arrow edge: OBJECT -> ACTION -> OUTCOME -> EVIDENCE.

CURRENT PING IMPLEMENTATION: None for outcomes/experiments (see above). The only
adjacent machinery is `mc-approval/` (proposal -> authorization workflow, 1,527 LOC,
f94bba39) and the journal event emission in `mc-approval/emit.py`. Static config flags
in `src/config/ui-flags.ts`, `src/config/infrastructure-flags.ts`.

EXTERNAL IMPLEMENTATION: PostHog monorepo at the pinned SHA, specifically the
2026 reorganization under `products/experiments/` and `products/feature_flags/`.
Examined files (3,164 LOC total read):

1. Exposure connection pattern (MIT paths):
   - `products/experiments/backend/hogql_queries/exposure_query_logic.py` (357 LOC):
     `DEFAULT_EXPOSURE_EVENT = "$feature_flag_called"`; dedicated
     `$experiment_exposure` event as ingestion-side copy of `$feature_flag_called`
     (multivariate only), with rollout cutoff 2026-09-01 and per-team flag gate;
     `resolve_default_exposure_event()` / `resolve_flag_call_source_event()` prevent
     double counting; `get_exposure_event_and_property()` resolves variant from
     `$feature_flag_response` or `$feature/<flag_key>`; test-account filter defaults;
     multiple-variant handling (EXCLUDE default); entity key = person_id or $group_N.
   - `products/experiments/backend/hogql_queries/experiment_exposure_query_builder.py`
     (562 LOC): one row per entity with variant attributed from FIRST exposure,
     first_exposure_time, last_exposure_time, exposure event UUID, session id,
     argMin-attributed breakdown columns; activation-mode (exposure + activation event);
     precomputed-exposure read path; maturity HAVING clause.
2. Stats engine (MIT paths), `products/experiments/stats/` (648 LOC core):
   - Bayesian: Gaussian priors, credible intervals, chance-to-win, relative/absolute
     difference types (`bayesian/method.py`, `bayesian/tests.py`, `bayesian/priors.py`).
   - Frequentist: two-sided t-test plus SequentialTwoSidedTTest (always-valid
     sequential inference, tuning parameter) (`frequentist/method.py`, `frequentist/utils.py`
     `sequential_rho` / `sequential_interval_halfwidth`). Uses numpy.
   - Shared: CUPED variance reduction (`shared/cuped.py`, 224 LOC), statistics
     (Proportion/Mean/Ratio, 154 LOC).
3. Guardrails (MIT paths):
   - `products/experiments/skills/debugging-experiments/scripts/srm_check.py` (688 LOC):
     stdlib-only SRM diagnostic. Recomputes deterministic flag hash byte-exact
     (sha1 of `{flag_key}.{identifier}variant` / LONG_SCALE, golden vectors from the
     Rust flag matcher), then decomposes the observed split gap into
     selection (capture-side) vs reassignment (assignment-side) components with
     chi-squared goodness-of-fit and Wilson intervals; verdicts INAPPLICABLE /
     NO SRM IN SAMPLE / CAPTURE / ASSIGNMENT / MIXED; `--selftest` with pinned
     critical values. Lives in a `products/experiments/skills/` directory: agent
     skills are a first-class citizen in this repo.
   - `products/experiments/backend/analysis_health.py` (50 LOC): pure-function bias
     evaluators (asymmetric `$multiple`-exclusion bias on uneven splits; designed to
     grow: SRM, low exposures, variant drift). Pattern: pure evaluators, no I/O.
4. Outcome -> action (MIT path):
   - `products/experiments/backend/flag_cleanup.py` (152 LOC): from an experiment
     conclusion (won/lost/inconclusive/stopped_early/invalid) plus flag variants,
     builds a CleanupPlan (keep_variant, remove_variants, rationale, confident) and
     renders the instructions handed to a CODING AGENT to remove the losing code
     path. Uncertain cases are marked for human review, never guessed silently.
     This is the observe -> learn -> action loop closed through an agent.
5. Replay connection (MIT path):
   - `products/experiments/backend/replay_linkage.py` (707 LOC): resolves an
     experiment's exposed population to one row per distinct id with first exposure
     time, so session-replay queries show sessions of exposed persons; person-scoped
     (not session-scoped) linkage keeps server-fired exposure events linkable;
     cross-device coverage via raw_person_distinct_ids; explicit memory budgets;
     refuses with ValidationError where no affordable scan exists (never times out).
6. License-blocked (ee/, NOT studied beyond paths): `ee/clickhouse/views/experiment_holdouts.py`
   (holdouts), enterprise experiment queries. Classified by path only.

EXACT REPO + SHA: `PostHog/posthog @ 81858b69f20bc997cf0e6c5027821cdd99b53514`
(verified via https://api.github.com/repos/PostHog/posthog/commits/<sha>, commit
2026-10-01T09:23:35Z, message "fix(warehouse-sources): recognize pyarrow's generic
missing-file error...").

LICENSE: Path-level. MIT Expat for every examined file (all outside `ee/`).
File-level check: no license headers inside the examined MIT files; coverage comes
from the root LICENSE's explicit path split, verified in the studied clone.
`ee/` paths (holdouts, enterprise queries) are under the PostHog Enterprise license:
production use requires a valid enterprise subscription; research reading is allowed
but code from `ee/` must never enter PING. Dependency implications of the MIT
stats engine: numpy for frequentist sequential utils; the exposure/replay machinery
is Django + ClickHouse + HogQL (not transplantable, and not wanted).
Attribution: MIT requires preserving the copyright notice
("Copyright (c) 2020-2026 PostHog Inc.") in any copied portion.
Copyleft/network-copyleft: none on MIT paths. Patent clauses: none (MIT has no
explicit patent grant; no known PostHog patent assertions found in this pass).

MECHANISM WORTH HARVESTING (patterns and small MIT mechanisms only):
- M1. Dedicated exposure event pattern: a distinct, ingestion-shaped event for
  "this entity was exposed to this variant" (`$experiment_exposure` as a copy of
  `$feature_flag_called`), separate from the flag-evaluation event, so exposure
  attribution never depends on re-running flag logic at analysis time.
- M2. First-exposure-per-entity attribution: one row per entity (person or group),
  variant from first exposure, explicit handling of multiple-variant entities
  (EXCLUDE default), activation events layered on top of exposure.
- M3. SRM decomposition into selection vs reassignment: the chi-squared gap
  identity (recorded - expected = selection + reassignment) with golden-vector
  selftest. The stdlib-only, self-testing diagnostic script shape is the reusable
  part, not the PostHog-specific hash.
- M4. Analysis-health pure evaluators: small, I/O-free bias-risk functions that a
  results reader runs before trusting numbers (multiple-exclusion bias today;
  SRM/low-exposure/variant-drift tomorrow).
- M5. Outcome -> agent-action closure: a typed conclusion (won/lost/inconclusive/
  stopped_early/invalid) rendered into agent instructions with an explicit
  uncertainty flag that routes to human review instead of guessing.
- M6. Person-scoped replay linkage: link qualitative evidence (sessions) to the
  exposed population via person + first exposure time, not via in-session event
  presence, so server-side exposures stay linkable.

WHY IT IS BETTER: PING has nothing on this edge, so "better" is not comparative
here; it is a completeness statement. The specific excellence is the CONNECTION:
exposure is captured once at decision time as a first-class event, joined to
outcomes by entity + variant + time, and every consumer (analysis, replay, health,
cleanup) reads the same exposure resolution so they cannot describe different
populations. That single-invariant-many-readers shape is exactly PING's
constitutional style (cf. canonical bytes -> digest -> many readers in mc-approval).

WHAT NOT TO COPY: the analytics product (funnels, trends, HogQL query builders,
ClickHouse schemas, precomputation jobs); session replay infrastructure; the
Django/ClickHouse deployment shape; `ee/` holdouts and enterprise queries
(license block); the `$feature_flag_called` -> `$experiment_exposure` migration
machinery (PostHog-internal rollout scar tissue); numpy/scipy-dependence of the
stats utils.

PING AUTHORITY IT MUST REMAIN UNDER: none exists yet for outcomes; when a live
product edge appears, outcome records must enter as OBSERVATION -> EVIDENCE under
the existing evidence/immutability law (EVIDENCE IS IMMUTABLE; INTERPRETATION
EVOLVES). No new authority is authorized by this pass (NEW AUTHORITIES = 0).
Exposure/assignment decisions, when they exist, stay under the same authorization
chain as every other action (IDENTITY -> AUTHENTICATION -> CAPABILITY -> PROPOSAL
-> APPROVAL -> EFFECT).

MINIMAL PATCH: none proposed. No live failure, no writer gate pass, no patch.

EXPECTED DELETION-SIMPLIFICATION: none (nothing to delete; greenfield edge).

TEST THAT PROVES IMPROVEMENT: cannot be written until a live product failure
exists. When the edge arrives: an invariant test that two readers (analysis and
evidence export) resolve the same exposed population from the same exposure
records (the "cannot describe different populations" property from
`apply_exposure_criteria_defaults`'s docstring).

BENCHMARK IF RELEVANT: not run. The relevant future benchmark is exposure-join
correctness on a synthetic skewed population (selection vs reassignment
decomposition recovers the injected cause), mirroring srm_check.py's `--selftest`
verdict cases.

SECURITY CONSEQUENCES: exposure events carry identifiers (distinct_id, device id,
group keys); M1/M2 require the same identifier-hygiene PING applies to any
observation (no PII in logs beyond the evidence store's own policy; distinct_ids
are often emails per the srm_check docstring). The `printable()` output-sanitizing
pattern in srm_check.py (untrusted variant keys cannot forge report lines or drive
terminals) is worth remembering for any future PING report rendering. No new
attack surface proposed.

MIGRATION-RISK: none (no migration proposed). Future risk to note: adopting an
exposure-event shape is a schema commitment; it must go through PING's contract
machinery (vein-5), not around it.

DECISION: BACKLOG for M1-M6 (mechanisms identified, license-clear on MIT paths,
waiting on the first live FYD action -> outcome product edge; vein-11 stays
ARCHAEOLOGY ONLY per program law). REJECT for: porting the analytics product,
replay, funnels, HogQL/ClickHouse machinery, and everything under `ee/`
(license block + product-scope violation). No writer work authorized.

Estimates: CURRENT PING LOC TOUCHED 0 / DONOR LOC EXAMINED 3,164 (files listed
above) / EXPECTED PING LOC ADDED 0 / EXPECTED PING LOC REMOVED 0 / NET LOC 0 /
NEW DEPS 0 / NEW AUTHORITIES 0.

---

## Candidate 2: GrowthBook experiment machinery + draft -> review -> publish

AREA: Experimentation (targeting, gradual rollout, CUPED, sequential/Bayesian
analysis, holdouts, bandits, SRM checks) and the draft -> review -> publish agent
workflow. Arrow edge: OBJECT -> ACTION -> OUTCOME -> EVIDENCE (experiments) and
the propose -> authorize -> execute workflow (revisions).

CURRENT PING IMPLEMENTATION: for experiments/outcomes, none (see above). For the
workflow half, PING HAS the stronger mechanism: `mc-approval/` at f94bba39
(1,527 LOC). PING's model: immutable proposal, canonical bytes + sha256 digest
bound before recording, deterministic proposal_id, tenant bound at creation,
single-shot WAITING_APPROVAL -> terminal decision, "silence is never approval",
proposal terminal-first law (APPROVED/REJECTED immutable; STALE_SUPERSEDED only for
PENDING proposals with invalid base). This is constitutionally different from
GrowthBook's mutable-draft-until-publish model, and deliberately so.

EXTERNAL IMPLEMENTATION: growthbook/growthbook at the pinned SHA. Examined
(3,179 LOC total read):
1. Stats engine `packages/stats/gbstats/` (MIT; pyproject declares MIT):
   - `gbstats.py` (1,486 LOC): Bayesian and frequentist test orchestration.
   - `utils.py` (184 LOC): `check_srm(users, weights)` = chi-squared
     goodness-of-fit of observed vs expected traffic weights (compact, ~15 LOC);
     `weighted_mean`, `gaussian_credible_interval`, `is_statistically_significant`.
   - `models/settings.py`: `sequential_testing_enabled`, `sequential_tuning_parameter`.
   - `bayesian/bandits.py`: contextual bandits; `power/midexperimentpower.py`:
     mid-experiment power. Deps: pandas, scipy, numpy, nbformat.
2. Evaluation (MIT): `packages/sdk-js/src/core.ts`: FNV-hash bucketing on
   (experiment seed + assignment attribute), hashVersion, sticky-bucket service
   (assignment persistence across sessions/devices), `onExperimentViewed` ->
   `trackingCallback` exposure emission (app logs "Experiment Viewed" with
   experiment key + variation id). Exposure = evaluation-time emission, decoupled
   from outcomes. Guides codify the discipline: deploy dormant code first (separate
   deployment risk from treatment risk), fixed relative weights for the run,
   record exact UTC publication time, commit the analysis plan BEFORE publishing.
3. Revision workflow (MIXED license; this is the critical finding):
   - MIT side: `packages/shared/src/validators/revisions.ts` (298 LOC): zod
     validators; `revisionStatus` = draft, pending-review, approved,
     changes-requested, merged, discarded; `reviewDecision` = approve,
     request-changes, comment; review records with `stale` flag (verdicts demoted
     by a later cycle are kept for attribution but no longer active);
     JSON-patch ops restricted to TOP-LEVEL paths (`/^\/[^/]+$/`) because two
     appliers disagree on nested paths (documented in the validator).
   - MIT side: `packages/shared/src/revisions/helpers.ts` (838 LOC) and
     `scheduledPublish.ts` (121 LOC): approval-flow policy combiners (required,
     blockSelfApproval, resetReviewOnChange, autopublishOnApproval,
     requiredApproverTeams; "stricter wins"); scheduled/deferred publish
     (armed + date + active draft; manual publish pre-empts with warning;
     locks); entity-agnostic revision shape.
   - PROPRIETARY side: `packages/back-end/src/revisions/` (revisionLifecycle.ts,
     revisionActions.ts, governanceGates.ts, landingSequence.ts, revertPurity.ts,
     ...): every file imports from `shared/enterprise` (reviewCycle.ts:
     REVIEW_CYCLE_STATUSES, statusFromStandingVerdicts, reviewCycleOf,
     reviewCycleSupersededMessage; plus decision-criteria, pipeline, power).
     The review-cycle state machine constants live under the GrowthBook
     Enterprise license. The full lifecycle machinery is NOT transplantable.
4. Agent guides (docs, MIT by path): `docs/guides-for-agents/` - playbooks written
   for AI coding agents: 0 -> 1 -> 100 sequence (inspect/contract -> prove one
   controlled path with tests and rollback evidence -> complete/decision/cleanup);
   `free-ab-test-javascript.mdx` walks draft revision -> review -> publish with
   version pins, failure handling, rollback, and the evidence needed to finish.
   "For an experiment, 100 means reaching a documented decision and completing
   cleanup. It does not mean assigning every user to the treatment."

EXACT REPO + SHA: `growthbook/growthbook @ 4f4929cd744a09fe8fa9392f0527924d322761ab`
(verified via https://api.github.com/repos/growthbook/growthbook/commits/<sha>,
commit 2026-10-01T02:37:52Z, "check if salt is valid first (#7196)").

LICENSE: Path-level. MIT Expat for: `packages/stats/` (gbstats, pyproject
declares MIT), `packages/sdk-js/`, `packages/shared/src/validators/`,
`packages/shared/src/revisions/`, `docs/`. PROPRIETARY (GrowthBook Enterprise
license) for: `packages/back-end/src/revisions/` (imports shared/enterprise),
`packages/shared/src/enterprise/` (reviewCycle.ts and friends),
`packages/back-end/src/enterprise`, `packages/front-end/enterprise`.
Consequence: the draft -> review -> publish PATTERN is harvestable; the
implemented lifecycle machinery is license-entangled and must not be
transplanted. Attribution: MIT portions require preserving
"Copyright (c) 2025 GrowthBook, Inc." Copyleft: none on MIT paths.
Patent clauses: none found. gbstats deps (pandas/scipy/numpy) are BSD-licensed;
adopting gbstats as a DEPENDENCY would add 4 heavy deps for zero current
consumers: rejected on the ruthless metric.

MECHANISM WORTH HARVESTING (patterns only; no code):
- M7. Exposure discipline from the agent guides: deploy dormant code first;
  fixed relative variation weights for the whole run (change overall exposure,
  not the split); record the exact UTC publication time as the analysis window
  anchor; commit the analysis plan before publishing. These are process laws,
  not code, and they are license-clean.
- M8. Review-cycle semantics worth studying against PING's proposal law: stale
  verdicts kept for attribution but demoted (compare PING's STALE_SUPERSEDED);
  "changes requested outranks approvals" (`statusFromStandingVerdicts`);
  recall/reopen transitions judged on the revision's own snapshot, not the live
  entity. NOTE: several of these live in proprietary files, so they are
  PATTERN-ONLY (re-derive, do not copy).
- M9. Approval-flow policy combiners: blockSelfApproval, resetReviewOnChange,
  autopublishOnApproval, requiredApproverTeams with "stricter wins" combination
  across project scopes. Design input for any future PING approval-policy layer.
  The combiners file is MIT but the feature-flag review settings it reads are
  entangled; treat as pattern.
- M10. Top-level-only JSON-patch op restriction with the documented reason (two
  appliers disagreeing on nested paths). Directly relevant to vein-17 (patch
  mechanics) and worth a cross-vein note: PING's BASE -> PROPOSAL -> DIFF ->
  DIGEST -> APPROVAL -> APPLY chain should decide its patch-path grammar
  explicitly, with the same "two appliers must agree" rationale.
- M11. Agent-guide shape (0 -> 1 -> 100; version pins; failure handling;
  rollback; "the evidence needed to finish"; correct result can be "gather
  missing measurement data or postpone"): a documentation pattern PING's own
  future agent playbooks can mirror. No license issue (docs, MIT by path).
- M12. `check_srm` compact chi-squared (15 LOC, MIT, scipy for chi2.sf): the
  smallest correct SRM gate seen in this pass. If PING ever needs an SRM check,
  this is the shape, reimplemented against PING's own stats (no scipy).

WHY IT IS BETTER: for the workflow half, PING's mechanism is already stronger
where it matters: digest-bound immutable proposals beat mutable drafts for
PING's evidence law (the digest IS the replay anchor; GrowthBook's mutable draft
has no equivalent). What GrowthBook has and PING lacks is the multi-round review
CYCLE (request-changes -> re-submit with stale-verdict attribution) and
composable approval policies. Those are real gaps IF PING's approval flow ever
needs human review rounds; today the single-shot owner decision is the product
law (ONE DECISION, ONE SENTENCE, ONE EVIDENCE LINK), so the gap is not a defect.
For the experiment half, gbstats is the most mature open-source experiment stats
engine found (sequential + Bayesian + CUPED + bandits + SRM + mid-experiment
power in one package), but with zero PING consumers it is a dependency, not a
harvest.

WHAT NOT TO COPY: the revision lifecycle implementation (proprietary
entanglement); the mutable-draft semantic (conflicts with PING's digest-bound
immutability; would weaken the evidence law); gbstats as a dependency (4 heavy
deps, zero consumers); the SDK/client evaluation machinery (PING has no
client-side flag evaluation surface); bandits/holdouts as products.

PING AUTHORITY IT MUST REMAIN UNDER: the proposal/authorization chain
(mc-approval) stays sovereign for the workflow half; outcome records, when they
exist, enter as evidence under the immutability law. No new authority
(NEW AUTHORITIES = 0). Explicitly: no ExperimentAuthority, no OutcomeAuthority,
no ReviewAuthority is proposed or justified by this pass.

MINIMAL PATCH: none proposed. No live failure, no writer gate pass.

EXPECTED DELETION-SIMPLIFICATION: none.

TEST THAT PROVES IMPROVEMENT: when the review-cycle gap becomes a live defect
(e.g., owner needs request-changes on a proposal): a test that a re-submitted
proposal after changes-requested carries the superseded verdict as attribution
only (never as an active approval), mirroring `stale: true` semantics, while the
digest of the new proposal differs (immutability preserved). Cannot be written
until the defect exists.

BENCHMARK IF RELEVANT: not run. Future: gbstats vs a PING-native sequential test
on a synthetic experiment corpus, only if the product edge arrives.

SECURITY CONSEQUENCES: the review-cycle introduces confused-deputy risk (a stale
approval applied to a new draft). GrowthBook answers with reviewCycleOf/snapshot
judgment; PING's digest binding already answers it more strongly (different
bytes = different proposal = old approval cannot apply). No new risk proposed.
M8's snapshot-judgment note is recorded as defense-in-depth reading.

MIGRATION-RISK: none (no migration). Future risk: grafting a review cycle onto
digest-bound proposals must not weaken "silence is never approval" or the
terminal-first law; any such change needs Nolan's explicit word (it touches
constitutional approval semantics).

DECISION: REJECT the revision model as a replacement for mc-approval (PING's
digest-bound single-shot is stronger and constitutionally chosen; GrowthBook's
lifecycle core is proprietary-entangled anyway). BACKLOG M7-M12 as
pattern references: M7/M11 (agent-guide discipline) usable the day PING writes
agent playbooks for the action -> outcome loop; M8/M9/M10 for the day approval
policy or patch grammar needs design input; M12 as the SRM gate shape.
REJECT gbstats as a dependency (ruthless metric: 4 heavy deps, zero consumers).
No writer work authorized.

Estimates: CURRENT PING LOC TOUCHED 0 / DONOR LOC EXAMINED 3,179 (files listed
above) / EXPECTED PING LOC ADDED 0 / EXPECTED PING LOC REMOVED 0 / NET LOC 0 /
NEW DEPS 0 / NEW AUTHORITIES 0.

---

## 12-gate status

No candidate passes the writer gate; no writer work is authorized from this pass.
Gate failures are structural, not informational:
- Q1 (concrete current PING/FYD failure): UNKNOWN/none. Vein-11 is ARCHAEOLOGY
  ONLY per program law; there is no live action -> outcome product path yet.
- Q2/Q3 (live product path, existing owner): none exists for outcomes/experiments.
- All downstream questions are therefore moot. Research continues; no writer.

This is the correct outcome for an archaeology-only vein: mechanisms banked,
licenses classified per path, rejections recorded with reasons.

## Cross-vein note

M10 (top-level-only JSON-patch ops; "two appliers must agree") is flagged for
vein-17 (patch mechanics): when PING's BASE -> PROPOSAL -> DIFF -> DIGEST ->
APPROVAL -> APPLY chain defines its patch grammar, the GrowthBook rationale
(validator documents WHY nested paths are rejected: authority-side footprint
vs write-side applier disagreement) is the model for documenting the constraint.

## Decisions summary

| Candidate | SHA | License | Decision |
|---|---|---|---|
| PostHog/posthog connected machinery | 81858b69 | Path-level MIT / Enterprise | BACKLOG (M1-M6, MIT paths only); REJECT product port + all `ee/` |
| growthbook/growthbook experiments + revisions | 4f4929cd | Path-level MIT / Enterprise | REJECT revision-model replacement + gbstats dependency; BACKLOG (M7-M12 patterns) |

Ruthless-metric scorecard for this pass: duplicate mechanisms deleted 0,
homegrown fragility removed 0, live defects closed 0, tests/invariants added 0,
net LOC 0, dependencies added 0, authorities added 0, product arrows improved 0.
Two license entanglements mapped (PostHog `ee/`, GrowthBook `shared/enterprise`
review cycle) so future passes do not trip them. Best available honest result
for an archaeology vein: mechanisms banked, nothing changed.

## Files

- This paper: `~/workspace/harvest/research/2026-10-01/vein11-outcomes-experiments.md`
- Study clones (disposable, not to be kept past 7 days per program law):
  `~/workspace/harvest/research/2026-10-01/posthog` (sparse),
  `~/workspace/harvest/research/2026-10-01/growthbook` (full)
- Program law: `~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md`
