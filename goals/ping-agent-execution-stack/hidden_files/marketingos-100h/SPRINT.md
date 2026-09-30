# MARKETINGOS 100-HOUR SPRINT — state

Directive: ~/workspace/goals/ping-agent-execution-stack/files/MARKETINGOS-NEXT-100-HOURS-2026-09-30.md (Nolan, binding, 2026-09-30 ~14:18 MDT).
Memory: 2026-09-30 ~14:18 MDT entry in ~/MEMORY.md (NEXT 100 HOURS RE-AIM).

## Objective
PING becomes an increasingly intelligent marketing/content machine: research reality, discover worthwhile ideas, produce technically defensible content, learn from results, eventually generate a review-ready video every day.

## Product loop
QUESTION → RESEARCH → OBSERVATIONS → EVIDENCE → CLAIMS → CONTRADICTIONS → VERDICTS → AUDIENCE/OPPORTUNITY → THESIS → CONTENT BRIEF → SCRIPT → CLAIM CHECK → ASSETS → VIDEO → HUMAN APPROVAL → DISTRIBUTION → METRICS → OUTCOME → LEARNING → NEXT QUESTION

## Hour blocks
- [ ] 0–20 RESEARCH EXCELLENCE: one real INTELLIGENCE_RESEARCH mission, publishable topic, explicit questions + claims-to-verify, primary sources, contradictory evidence, CONFIRMED/REFUTED/UNCLEAR findings, unresolved-question set. Bounded wiring, not architecture.
- [ ] 20–40 EDITORIAL JUDGMENT: deterministic ranking projection (scores recommend, never authorize), 3–5 competing theses, falsifier attacks, surviving proposal for human judgment.
- [ ] 40–60 EVIDENCE-NATIVE SCRIPTS: machine-readable claim ledger per script, separate accuracy pass, technical-credibility style rules.
- [ ] 60–80 VIDEO COMPILER PATH: VideoSpec, VERIFIED RESEARCH → … → TRANSCRIPT RECHECK → HUMAN REVIEW. First target deliberately boring. No VideoAuthority. "NO DEFENSIBLE VIDEO TODAY" is legitimate output.
- [ ] 80–100 CLOSE THE LEARNING LOOP: metrics through existing /ingest seam, no metrics subsystem, CORRELATION ≠ CAUSATION, candidate playbook rules never silent policy rewrites.

## Hour-100 deliverable
Demonstration of the full chain, or the first broken arrow marked (never built around).

## Binding constraints
- Durable residue homes: ping_events (observations, claims, signals, metric observations, receipts); ping_missions (research briefs, experiments, distribution runs/results); knowledge_nodes/edges (findings, audiences, opportunities, learnings, playbook candidates); Qdrant (semantic retrieval/projection).
- FORBIDDEN: MarketingDB, ContentBrain, ResearchTruthStore, GrowthAuthority, AudienceAuthority, ExperimentAuthority, DistributionAuthority, LearningAuthority, VideoAuthority, AcquisitionAuthority.
- Mission types are routing vocabulary: INTELLIGENCE_RESEARCH, CONTENT_PRODUCTION (only if existing vocabulary cannot represent it), EXPERIMENT_RUN, DISTRIBUTION_RUN.
- Not a TenantOS sprint. ORCA/Jev are harvested concepts, not rebuilt products.
- Muse commit law on every writer. No push without Nolan's explicit authorization.
- Human approval boundary is Nolan's. Distribution decisions stop at the boundary and surface to him.
- Daily objective: best defensible next artifact; weak-evidence days produce tomorrow's research mission, not a video.

## Target audience (from MARKETINGOS-AUDIENCE-INTELLIGENCE-2026-09-30)
Technical builders, senior developers, technical founders, infrastructure/AI engineers, serious autonomous-systems audiences. Technical credibility standard: content a skeptical senior engineer can disagree with while concluding the work was done.

## Parallel program
PING core interrogation (25 hostile questions) runs in parallel under its own coordinator. Its verdicts are evidence when they land; the sprint does not block on them. Where ownership is unclear, the sprint uses only what the interrogation or direct tracing has proven.

## Next sprint plan (ACCEPTED, not yet executing)

Nolan's binding directive 2026-09-30 ~14:36 MDT, filed verbatim at
`~/workspace/goals/ping-agent-execution-stack/files/MARKETINGOS-PLAN-NEXT-100-HOURS-2026-09-30.md`.

Lane ruling: FYD/product thread = product; this lane = MarketingOS /
technical marketing intelligence. This lane does not implement FYD's
backlog; it consumes FYD/PING/Pig engineering reality as source material.

Sequencing decision (lane owner): the current sprint (14:18 plan) continues
to hour 100 on its own plan — block 0-20 has real journal residue and the
directive says not to steal writers from the current loop. This compounding
plan is the ACCEPTED plan for the NEXT MarketingOS 100-hour sprint and keeps
being refined in parallel without diverting current-loop writers.

Next-sprint shape: 0-15 OBSERVABILITY+BASELINE / 15-30 SIGNAL+AUDIENCE /
30-45 OPPORTUNITY+RESEARCH / 45-60 EVIDENCE PACKAGE+CONTENT COMPILER /
60-70 APPROVAL+DISTRIBUTION / 70-85 OBSERVATION+EXPERIMENT / 85-95 LEARNING /
95-100 ADVERSARIAL CERTIFICATION. Hour-100 demo: one real question through
the full chain with drill-down CLAIM -> SUPPORT SET -> EVIDENCE -> SOURCE ->
VERDICT and PROPOSAL -> AUTHORIZATION -> ATTEMPT -> RESULT -> EFFECT ->
VERIFICATION -> OUTCOME. Doctrine: novelty detector, claim ledger,
overclaim compiler, three content layers, WE WERE WRONG family,
demonstration ladder, L6 hostile review, information-gain scoring,
thesis/evidence package as canonical object, depth metrics (ATTENTION /
INTELLECTUAL ENGAGEMENT / INTENT / AUTHORITY / BUSINESS), audience by
questions, comments as sensor network, content decay, causally modest
experiments, playbook rules with decay/scope. Reporting: observations
ingested / claims verified-refuted-unclear / audience knowledge /
opportunities rejected-advanced / artifacts with claim lineage / approvals /
distributions verified / outcome windows closed / learnings promoted /
playbook changes / next questions / first broken loop edge / WHAT DID
MARKETINGOS KNOW AT THE END THAT IT DID NOT KNOW AT THE START.

Repo caveat (binding): piging2/fyd still 404, FYD remote state UNVERIFIED;
Pig forensic is fresher than GitHub for local implementation; local /
worktree / deployed truth remain separate.

## Block reports- 0–20: COMPLETE 2026-09-30 ~15:05 MDT. Mission `93a79e48accd23e3` (INTELLIGENCE_RESEARCH, completed): "What does PostgreSQL read-only actually seal?" 8 claims (7 CONFIRMED, 1 REFUTED-as-worded with refinement), 2 contradictions recorded, 5 unresolved questions. Residue in ping_missions/ping_events/knowledge_nodes/edges only. Report: `hidden_files/marketingos-100h/BLOCK-0-20-REPORT.md`. Commits: 28c38d1 (brief, pre-research), 2089879 (drivers + report).
- 20–40: COMPLETE 2026-09-30 ~14:40 MDT. Mission `0a04c41899fefb2a` (EXPERIMENT_RUN, completed, verdict SUPPORTED): editorial judgment over the 8 block 0-20 findings. Deterministic ranking projection (editorial/rank_20_40.py, fixture SHA256 1b7f1e68…; C2=44, C6=44, C7=42, C3=40, C5=34, C4=28, C1=24, C8=20; scores recommend, never authorize). 5 competing theses attacked from K1/K2/U1–U5/steelman (attack plan committed pre-attack as f7c27eb): 14 attacks, 10 landed. 4 theses killed/demoted as headlines (A merged, B→beat, C scoped to non-superusers after the superuser wrinkle landed hard, D→K2 honesty anchor); E INCONCLUSIVE → next research mission (test the append-only triggers, U2). Surviving thesis for Nolan's judgment: "default_transaction_read_only is a session default, not a privilege boundary. REVOKE is the boundary, for non-superuser roles. Superusers cannot be privilege-bound at all, and our own journal runs as one." 7 non-claims (N1–N7) + 11-entry evidence map feed the 40–60 claim ledger. Residue: ping_missions/ping_events (2 obs + 6 claims)/knowledge_nodes 10/edges 16, namespace marketingos::block20-40. Incidents I1–I3 recorded in report (verdict-vocab scope, silent complete() no-op, ping_events correlation in metadata). Report: `hidden_files/marketingos-100h/BLOCK-20-40-REPORT.md`. Commits: f7c27eb (method pre-attack), 7e7e6f1 (report + drivers).
- 40–60: COMPLETE 2026-09-30 ~14:52 MDT. Mission `f73a98dcc6bae44c` (EXPERIMENT_RUN, completed, verdict SUPPORTED): evidence-native script from the surviving thesis. Script draft BLOCK-40-60-SCRIPT.md (5 parts, headline parameterized H1/H2/H3 for Nolan's pick) + machine-readable claim ledger claim-ledger-40-60.json (23 claims CL-01..CL-23, all 13 fields). Separate accuracy pass (1 narrow: cut "a lot of teams" generalization), overclaim pass clean (zero flagged words beyond supported uses), hostile L6 review (strongest objection pre-answered, 4 narrowings confirmed). CONTENT_PRODUCTION not in mission_labels.js (grep -c = 0); EXPERIMENT_RUN used per the no-new-vocabulary rule. U2 trigger-testing NOT run (constraint); queued as next research mission. No new stores/authorities. No Oracle state touched. Report: `hidden_files/marketingos-100h/BLOCK-40-60-REPORT.md`. Commits: 692134e (script + ledger + report), 3e46f5c (driver D + report mission section + this entry).
- 60–80: COMPLETE 2026-09-30 ~15:35 MDT. Mission `e492bfb9ea7981cd` (EXPERIMENT_RUN, completed, verdict SUPPORTED): video compiler path. Artifact: `video-60-80/marketingos-readonly-seal-2026-09-30.mp4` (12 shots, 322s, 1920×1080; 12 narration segments, synthetic voice `avocado_v2:MAI_03`; 12 PIL evidence frames from recorded trial SQL + recorded outputs; provenance footer on every frame; headline parameterized H1/H2/H3 on S01). Transcript recheck: 0 cuts/narrows (40–60 narrow remains cut); 1 self-caught fabrication fixed pre-assembly (invented RETURNING ids 7/8/12 replaced with recorded outcomes). AI video generation deliberately not used (would fabricate terminal sessions). Zero distribution — review artifact only. No new stores/authorities. No Oracle state touched. Report: `hidden_files/marketingos-100h/BLOCK-60-80-REPORT.md`. Commits: 2cdfea6 (artifact + report + driver E).
- 80–100: COMPLETE 2026-09-30 ~15:15 MDT. Mission `2d530e04dfab7f1a` (EXPERIMENT_RUN, completed, verdict SUPPORTED): the learning loop closed on existing machinery. LearningRecord schema + 6 records seeded from the sprint's real learnings only (I1/I2/I3, ledger-before-accuracy-pass, rendered-evidence-frames default, headline-parameterization) + PLAYBOOK.md (6 CANDIDATE rules PR-01..PR-06, decay law, promotion requires recorded human decision) + outcome-intake seam (OUTCOME-INTAKE.md + outcome-intake-schema.json; 5 classes ATTENTION/INTELLECTUAL_ENGAGEMENT/INTENT/AUTHORITY/BUSINESS; causality-honesty contract; validator dry run: valid 1/1, malformed 1/1 rejected with 4 errors; zero real outcomes journaled). Residue: ping_missions/ping_events (2 obs + 3 claims)/knowledge_nodes 8/edges 7, namespace marketingos::block80-100. Adversarial certification: separate falsifier pass, report committed `c3c2b53`, verdict CERTIFIED WITH FINDINGS; findings F1 (schema doc claimed nonexistent namespace/events — corrected) and F2 (learning_id drift in 6 nodes — metadata UPDATE corrected). First broken loop edge: the feedback half (DISTRIBUTION → METRICS → OUTCOME → LEARNING) has never carried a real signal — zero distributions, zero approvals, intake untested on real data. Reports: `hidden_files/marketingos-100h/BLOCK-80-100-REPORT.md`, `BLOCK-80-100-FALSIFIER-REPORT.md`. Commits: c00eb12 (machinery + driver F), c3c2b53 (falsifier report).

## Hour-100 statement (2026-09-30)

PROVED: PING can run the full technical-marketing loop on existing machinery — QUESTION → RESEARCH (real trials, real contradictions, one prediction refuted) → EVIDENCE → CLAIMS → CONTRADICTIONS → VERDICTS → EDITORIAL JUDGMENT (5 theses attacked, 4 killed/demoted with reasons, 1 advanced as a proposal) → THESIS → SCRIPT (23-claim ledger, accuracy/overclaim/L6 passes) → VIDEO (12 shots, transcript recheck, provenance on every frame) → HUMAN REVIEW boundary. No new authorities, stores, or subsystems were created. The approval/distribution boundary holds: zero approvals, zero distributions. The learning loop is built with decay and promotion boundaries, and an independent falsifier certified the sprint with findings that were fixed.

OPEN: U1 (gateway code inspection — deployment-convergence lane owns it), U2 (trigger behavior — queued next research mission), U3 (PG16/17 parity), U4 (pooler), U5 (disk writes). Nolan's headline pick (H1/H2/H3). All 6 playbook rules remain CANDIDATE. No outcome windows ever opened.

FIRST BROKEN LOOP EDGE: DISTRIBUTION → METRICS → OUTCOME → LEARNING has never carried a real signal. The loop produces review-ready artifacts but has never learned from reality. The first authorized distribution is the next proof gate.

NEXT SPRINT INHERITS: the closed learning loop (records + playbook + intake, all with decay), the falsifier's nine answers, the U2 research mission, the review-ready video (headline slot pending), and the compounding plan at `files/MARKETINGOS-PLAN-NEXT-100-HOURS-2026-09-30.md`.

## Sprint 2 launched (2026-09-30 ~15:16 MDT, Nolan's order: keep going)

Sprint 1 closed certified (hour-100). Nolan: keep going, the hour blocks are
budgets; the lane keeps producing; days of backlog remain.

Nolan's video verdict (binding): he does not like the sprint-1 video. The
45–60 compiler block will plan around a real video-generator integration,
not the PIL-frame reconstruction approach. We keep content ideas, scripts,
and judgment; the integration makes it aesthetically pleasing.

Sprint 2 executes the accepted compounding plan
(files/MARKETINGOS-PLAN-NEXT-100-HOURS-2026-09-30.md) from 0–15:
observability + baseline + first INTELLIGENCE_RESEARCH mission (prime: U2
append-only triggers on disposable PG). Coordinator active.

Parallel research track: video-generator integrations survey
(research_notes/video-generator-integrations-20260930/) — APIs graded on
programmatic control, aesthetic ceiling for technical content, claim control
(verbatim narration/text, no paraphrase), cost, integration effort,
provenance. Feeds the 45–60 compiler plan.
