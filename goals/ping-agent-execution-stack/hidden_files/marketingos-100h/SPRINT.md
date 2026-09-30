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
- 60–80: PENDING
- 80–100: PENDING
