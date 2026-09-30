# BLOCK 80–100 — ADVERSARIAL FALSIFIER REPORT (independent certification pass)

Falsifier: independent subagent pass, 2026-09-30. Not the coordinator. Every block
report treated as a claim to verify, never as truth. Read-only against the journal:
no writes to ping_missions/ping_events/knowledge_nodes, no drivers run, no missions
created. Methods below.

## Method

1. Read every block report (0-20, 20-40, 40-60, 60-80, 80-100), the research brief,
   attack plan, script, VideoSpec, learnings docs, claim ledger, and both intake
   fixtures.
2. Queried the live Pig journal directly (read-only SQL): all 5 mission rows
   (status, mission_type, result verdict); correlated event counts per mission via
   metadata->>'correlation_id'; knowledge node/edge counts per namespace and per
   mission_id; schema verification (\d equivalent: column lists, index list);
   approval/distribution event scan journal-wide.
3. Verified all 13 cited commit SHAs exist in ~/workspace.
4. Ran forbidden-vocabulary grep across the sprint tree.
5. Re-validated the claim ledger (23 claims, 13 fields, ID sequence, verdicts).
6. Re-ran validate-intake.cjs against both fixtures myself.
7. Re-ran editorial/rank_20_40.py; checked fixture SHA256 and ranking against the
   committed values.
8. Checked headline parameterization in ledger, script, VideoSpec, render-frames.py,
   and narration.
9. Probed the compiled mp4 with ffprobe (duration, streams) and checked narration
   segment inventory.

## Verification checklist results

### 1. Missions — PASS
All five mission rows exist in ping_missions, all status='completed':
- 93a79e48accd23e3 — INTELLIGENCE_RESEARCH (existing vocabulary), completed
  2026-09-30T20:29:07Z. No result verdict (INTELLIGENCE_RESEARCH is a findings
  mission; claim verdicts live on the CLAIM_CREATED events).
- 0a04c41899fefb2a — EXPERIMENT_RUN, result verdict SUPPORTED, completed 20:37:44Z.
- f73a98dcc6bae44c — EXPERIMENT_RUN, result verdict SUPPORTED, completed 20:47:50Z.
- e492bfb9ea7981cd — EXPERIMENT_RUN, result verdict SUPPORTED, completed 21:05:38Z.
- 2d530e04dfab7f1a — EXPERIMENT_RUN, result verdict SUPPORTED, completed 21:08:59Z.
Mission types are existing vocabulary only; tenant_id ping-ops throughout.

### 2. Correlated event counts — PASS (exact match per mission)
Via metadata->>'correlation_id' (there is genuinely NO correlation_id column on
ping_events — verified: column list lacks it; idx_ping_events_correlation exists on
(metadata->>'correlation_id')). Counts:
- 93a79e48accd23e3: 3 OBSERVATION_CREATED + 8 CLAIM_CREATED (report claimed 3/8).
- 0a04c41899fefb2a: 2 OBSERVATION_CREATED + 6 CLAIM_CREATED (report claimed 2/6).
- f73a98dcc6bae44c: 3 OBSERVATION_CREATED + 5 CLAIM_CREATED (report claimed 3/5).
- e492bfb9ea7981cd: 3 OBSERVATION_CREATED + 4 CLAIM_CREATED (report claimed 3/4).
- 2d530e04dfab7f1a: 2 OBSERVATION_CREATED + 3 CLAIM_CREATED (report claimed 2/3).
Spot check: first correlated claim events carry C1/C2/C3 trial text verbatim.

### 3. Knowledge node/edge counts — PASS (exact match per mission)
Nodes (namespace, all rows have correlation_id = the mission id): 9/10/6/5/8 for
block0-20/20-40/40-60/60-80/80-100 — matches every report. Edges (data->>'mission_id'):
8/16/5/4/7 — matches every report exactly. (Note: edges have no namespace column;
the journal identity is in data->>'mission_id'. The reports' edge counts hold.)

### 4. Commit SHAs — PASS (13/13)
28c38d1, 2089879, 3c71d98, f7c27eb, 7e7e6f1, 6bccde9, 692134e, 3e46f5c,
a8adf51, 2cdfea6, ee97e49, 407eafd, ba995d3 — all resolve in ~/workspace git log.
Note: 6bccde9 is a 2026-09-29 commit-every-time sweep checkpoint (another lane),
not a marketingos artifact commit; it exists as claimed.

### 5. Forbidden vocabulary — PASS (inspected, zero violations)
Grep hits exist ONLY in: (a) SPRINT.md's own FORBIDDEN list (the prohibition
itself), (b) the directive's mission-type vocabulary line, (c) driver comments
explaining why EXPERIMENT_RUN was used instead of CONTENT_PRODUCTION. No
MarketingDB, ContentBrain, ResearchTruthStore, GrowthAuthority, AudienceAuthority,
ExperimentAuthority, DistributionAuthority, LearningAuthority, VideoAuthority, or
AcquisitionAuthority was created as a store, authority, or runtime. No new writer,
service, or subsystem was created in any block (reports' claims hold).

### 6. Claim ledger — PASS (re-run by falsifier)
claim-ledger-40-60.json: 23 claims, IDs CL-01..CL-23 sequential, all 13 fields
present and non-empty on every claim, verdict CONFIRMED on all 23 (including
caveats/non-verifications, whose confirmed content is "we did not verify X").
headline.status = "PARAMETERIZED — Nolan's pick pending". Types used match the
report's list.

### 7. Headline parameterization — PASS
Headline remains a slot in the ledger, the script ("[NOLAN'S PICK — H1 / H2 / H3]"),
the VideoSpec, and the S01 frame (render-frames.py line 72 draws
"[ HEADLINE — NOLAN'S PICK PENDING: H1 / H2 / H3 ]"). Narration s01.txt is
headline-agnostic ("What does Postgres read-only actually seal? ..."). No
H1/H2/H3 is presented as decided or selected anywhere.

### 8. Approvals — none exist; PASS (boundary holds)
Zero APPROVAL events and zero DISTRIBUTION events anywhere in ping_events; zero
DISTRIBUTION_RUN or approval mission types in ping_missions. Nolan has not picked
a headline, has not approved the video. Reports' "review artifact only" claim
holds. The accepted next-sprint compounding plan is a plan acceptance, not an
artifact approval.

### 9. Distributions — none exist; PASS (honest zero)
No distributions, no provider calls, no receipts, no real outcome observations
journaled. The mp4 exists only on local disk as review-ready material.
This is correct behavior per the binding directive (distribution stops at Nolan's
boundary), and the reports do not claim otherwise.

### 10. Intake validator — PASS (re-run by falsifier)
- fixtures/valid-synthetic.json: 1/1 VALID.
- fixtures/malformed-synthetic.json: 1/1 INVALID with exactly the 4 errors the
  report claims (bad outcome_class VIRALITY; confounders missing with
  causality=correlated; inverted window; observed_at not a date-time).
Fixtures are synthetic:true and were not journaled as real outcomes (no outcome
events correlated to any distribution mission — there are none).

### Extra independent checks (all PASS)
- rank_20_40.py re-run: SELF_TEST_OK; FIXTURE_SHA256 1b7f1e68... matches the
  committed value; ranking reproduces C2=44, C6=44, C7=42, C3=40, C5=34, C4=28,
  C1=24, C8=20 exactly. (The function is deterministic over its fixture; the
  fixture itself is admitted editorial judgment — the script says this.)
- mp4: ffprobe 322.24s (report claimed 322s), h264 1920x1080, aac audio; 12
  segments (seg/s01..s12.mp4) + 12 audio files + 12 narration txt + narration-full.
- The 0-20 mission payload contains questions, claims_to_verify, synthesis_rule,
  evidence_requirements — the brief was committed pre-research (matches commit
  28c38d1 "questions + claims-to-verify" + attack plan commit f7c27eb).
- The trial evidence itself (T1-T11) was NOT re-trials by the falsifier: the
  disposable PG 16 was destroyed per the brief. Trial truth is now journal
  residue (attributed, typed, contradiction-recorded), not live re-execution.
  The falsifier accepts the recorded verdicts as journal truth and verified the
  residue exists and is coherent — it cannot and does not claim independent
  re-trial.

## Additional falsification findings

### F1 — LEARNING-RECORD-SCHEMA.md asserts a false canonical residency (finding)
The schema doc states, as fact: "Records live in learning-records.json
(machine-readable) and are mirrored into knowledge_nodes (node_type='learning',
namespace marketingos::learnings) plus a ping_events LEARNING_RECORDED event for
the trail." Verified: 0 nodes exist in namespace marketingos::learnings; 0
LEARNING_RECORDED events exist anywhere in ping_events. The 6 learnings ARE
mirrored, but under namespace marketingos::block80-100 (with playbook + intake
findings) and correlated via OBSERVATION_CREATED/CLAIM_CREATED events — the
documented form does not exist. This is documentation-only damage (nothing claims
to consume the missing form), but it is exactly the failure class this sprint
polices: a doc asserting a canonical form that was never materialized. The doc
should describe what exists, or the residency should be built.

### F2 — Learning identity drift across representations (finding)
learning-records.json uses IDs LR-20260930-001..006; the knowledge_nodes rows'
data->>'learning_id' uses LR-20260930-01..06 (different string, no zero-pad).
Two identity strings for the same entity across representations, with titles as
the only reconciliation key. Minor but real, given the lane's own standard of
preserving identity across transformations.

### F3 — the honesty machinery worked under pressure (observed strength)
The 60-80 report's self-caught fabrication (invented RETURNING ids 7/8/12,
fixed pre-assembly) and the 20-40 report's I1-I3 incident records were both
verifiable from the journal and filesystem state. A lane that fabricates quietly
does not record its own near-misses in the residue.

## The nine questions

### (1) What did MarketingOS know at the end that it did not know at the start?
At 14:18 MDT it knew the directive, the audience doctrine, and that a loop had to
be built. By 21:08 MDT it knows, from real trials on disposable PG 16 (recorded,
contradiction-tagged):
- default_transaction_read_only is a USERSET session default a role can lift
  (SET off / START TRANSACTION READ WRITE) — a default, not a privilege boundary
  (T2/T3 + docs).
- Superusers are bound by it in a fresh session but bypass it at will (T9a/T9b);
  REVOKE cannot bind a superuser (docs, not trialed — cited as docs).
- REVOKE INSERT/UPDATE/DELETE/TRUNCATE is a genuine boundary for non-superuser
  roles, holding even under explicit READ WRITE (T10).
- CREATE TEMP TABLE fails read-only; DML on existing temp tables succeeds
  (T4/T11) — this REFUTED the brief's C3-as-worded and corrected an overbroad
  secondary source (K1).
- nextval() is blocked read-only; advisory locks and LISTEN/NOTIFY are not
  (T5/T6/T7) — "read-only" is narrower than the name in both directions.
- Its own journal runs as superuser (C8, read-only inspection, 2557 rows,
  triggers present); its own retirement doc over-claimed "binds even
  superusers" (K2, fairly scoped).
- Operational: verdict vocab discipline, complete() no-op lesson, metadata
  correlation, ledger-before-accuracy, rendered-evidence-frames compiler default,
  headline parameterization (LR-001..006 / LR-20260930-001..006).
- Institutional: the lane can now compile an evidence-native script and video
  where every spoken line maps to a ledgered claim, and run an adversarial
  certification pass against its own output.

### (2) Which claims are CONFIRMED vs REFUTED vs UNCLEAR?
- 0-20 trials: C1, C2, C4, C5, C6, C7, C8 CONFIRMED. C3 REFUTED as worded,
  refined truth CONFIRMED (DDL fails / DML-on-existing works).
- Contradictions K1/K2: both recorded, resolved with the resolution attributed.
- Editorial theses (20-40): A, B, C-universal, D as standalone headlines REFUTED
  (10 of 14 attacks landed); C scoped to non-superuser roles SUPPORTED;
  surviving merged thesis (A+C, D as honesty anchor, B as beat, E as next
  mission) is a PROPOSAL for Nolan's judgment, not a verdict.
- Thesis E: INCONCLUSIVE (U2 unresolved — triggers untested). It is the next
  research mission, not a publishable claim.
- Ledger CL-01..CL-23: all CONFIRMED, where confirmation of non-verifications
  means "confirmed that we did not verify X."
- Mission verdicts: the four EXPERIMENT_RUN missions SUPPORTED.
- Nothing lands in UNCLEAR except the explicit non-claim set (N1-N7), which are
  not claims at all.

### (3) What new audience knowledge exists?
None. Zero observed audience data exists — no distributions, no audience
observations, no engagement signals. The target-audience doc (technical
builders, senior developers, infrastructure/AI engineers) is doctrine, and the
editorial 0-5 ratings are the coordinator's admitted judgment; D-F3's steelman
("nobody outside your team cares about your journal's config") LANDED and is the
only audience signal in the record — a steelman, not data. The next-sprint
plan's 15-30 SIGNAL+AUDIENCE block is the acknowledged remedy. Any claim that
the lane has validated audience fit would be a fabrication; the lane does not
make it.

### (4) Which opportunities were rejected vs advanced, and why?
Rejected (with recorded reasons):
- A standalone ("default isn't a boundary" as the whole piece): FALSIFIED —
  fear without the REVOKE fix (A-F3 landed) and unscoped alarm (A-F2).
- B standalone ("the temp-table exemption"): FALSIFIED as headline — footnote
  steelman landed; survives as a supporting beat.
- C universal ("how to actually seal a journal," unscoped): FALSIFIED — the
  superuser wrinkle (C-F2) killed the universal form; scoped form survives.
- D standalone ("our journal is unsealed"): FALSIFIED — audience steelman (D-F3)
  and untested triggers (D-F2); survives as the K2 honesty anchor.
- E as publishable claim: INCONCLUSIVE — U2 untested; demoted to next research
  mission.
Advanced:
- The merged surviving thesis (session default, not privilege boundary; REVOKE
  for non-superusers; superuser bypass stated; our own doc's over-claim owned)
  -> evidence-native script -> compiled review-ready video (headline pending).
- U2 (test append-only triggers on disposable PG) queued as the next research
  mission; Oracle write attempts stay out of scope.
- U1 (gateway code inspection) referred to the deployment-convergence lane.
- All 6 playbook rules remain CANDIDATE — correctly not advanced to policy;
  promotion requires a recorded human decision.
- The next-sprint compounding plan is ACCEPTED but explicitly not executing
  (current loop not interrupted).

### (5) Which artifacts have complete claim lineage?
- BLOCK-40-60-SCRIPT.md: complete — every script sentence carries a bracketed
  ledger id; the 40-60 accuracy pass checked inclusion against the 11-entry
  evidence map and exclusion against N1-N7, with 1 narrow recorded ("a lot of
  teams" cut).
- claim-ledger-40-60.json: complete — 23 atomic claims, all 13 fields (verified
  by re-run).
- video-60-80/marketingos-readonly-seal-2026-09-30.mp4 + VideoSpec: complete —
  shot-level mapping S01..S12 -> CL/N/U references (verified by transcript
  recheck, 0 cuts needed).
- learnings: support sets cite report sections, driver files, commits; journal
  residue exists for all 6 learnings + playbook + intake — minus findings F1/F2
  above.
The self-caught fabrication (invented RETURNING ids 7/8/12) was fixed before
assembly; the detection surface (render) worked.

### (6) What approvals were recorded?
NONE. No headline pick, no video approval, no distribution authorization, no
playbook-rule promotion, no approval events or records anywhere in the journal.
The boundary holds exactly as the directive requires.

### (7) What distributions were verified?
NONE. Zero distributions, zero provider calls, zero receipts, zero real outcome
observations journaled. The mp4 is review-only and was not published, posted,
or sent anywhere. The validator was proven on synthetic fixtures only.

### (8) What outcome windows are still open vs closed?
- Outcome windows: none open, none closed — none ever opened, because nothing
  was distributed. The intake seam exists and validates, but has admitted zero
  real observations.
- Question windows still open: U1 (gateway code — owned by deployment-convergence
  lane), U2 (trigger behavior — queued next research mission), U3 (PG16/17
  parity, docs-indicated), U4 (pooler/proxy uninspected), U5 (disk-write extent
  unmapped). These are unresolved research questions, not outcome windows; the
  reports state them as such.

### (9) What is the first broken loop edge — the single weakest point?
The feedback half of the loop has never carried a real signal:
DISTRIBUTION -> METRICS -> OUTCOME -> LEARNING. Everything from QUESTION to
HUMAN REVIEW is green with real evidence and recorded contradictions; then the
chain stops at Nolan's boundary and never restarts. Consequences: the five
outcome classes are untested machinery (synthetic fixtures only); the playbook
decay law has never processed a real outcome; the learning loop has been fed
only operational/self-observation learnings, never content-outcome learnings;
audience knowledge is steelman-only (question 3). The sprint's own doctrine —
"an honestly open outcome window is never turned into a success metric" — is
being honored (zero claims of success), which is exactly why this edge is the
weakest: the loop can produce review-ready videos indefinitely without ever
learning anything from reality. The first distribution, whenever Nolan
authorizes it, is the next proof gate. Findings F1/F2 are minor instances of
the same underlying instinct — documenting the machinery as more canonical
than it is — and F1 should be fixed in the schema doc.

## Certification verdict: CERTIFIED WITH FINDINGS

- All 10 verification checklist items PASS from independent evidence: missions
  complete with correct vocabulary and verdicts; correlated event counts exact;
  knowledge counts exact; all 13 commits exist; no forbidden stores/authorities;
  ledger valid (23/23, 13 fields); headline parameterized end to end; zero
  approvals and zero distributions (boundary holds); intake validator proven on
  both fixtures.
- The research is real (recorded trials, 2 contradictions kept, 1 prediction
  refuted as worded); the editorial judgment attacked its own theses (10 of 14
  attacks landed, kills recorded); the script and video preserve claim lineage
  shot by shot; the learning loop is built with decay and promotion boundaries.
- Findings (none blocking): F1 — LEARNING-RECORD-SCHEMA.md asserts a canonical
  residency (marketingos::learnings namespace + LEARNING_RECORDED events) that
  does not exist; F2 — learning-ID string drift (LR-20260930-001 vs
  LR-20260930-01) across representations.
- Structural caveat: the DISTRIBUTION -> METRICS -> OUTCOME -> LEARNING half of
  the loop is untested with real data. This does not fail certification — the
  sprint's charter was the full chain OR the first broken arrow, honestly marked —
  but it means no claim about the loop's learning efficacy is yet defensible.
  First distribution is the next proof gate.
