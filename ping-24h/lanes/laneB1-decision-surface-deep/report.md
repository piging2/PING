# Lane B1 report: decision-surface deep map (Phase 3)

Session 095c07c2. T+0 2026-09-28 14:26 MDT; mapped ~14:40-15:10 MDT.
READ ONLY throughout. No commits, no pushes, no restarts, no tree writes,
no gateway / scheduler-mission / :3100 contact. Canonical baseline:
`/home/nolan/projects/ping` @ HEAD 0264d517 (branch
hardening/2026-09-28-vocab-ssrf), verified via Pig WSL at 14:40 MDT
(rev-parse returns 0264d517). orca-adapter @ 9652896 (dirty, see lane 9).

Every claim below is a HYPOTHESIS until replayed from a clean checkout.

## Method

For each of lane 11's 42 inventoried surfaces I re-verified the
implementation file, the symbol line, production callers (grep over
src/ + tools/, excluding tests), test files, and label/sample sources,
rather than reusing the lane-11 picture. New findings that change
lane 11's picture are marked [CORRECTION] or [NEW].

Criticality scale used here (lane 11's bare C-labels kept, scale defined):
C4 = authorization/safety-critical, can cause an unapproved external
effect. C3 = wrong external action with real recovery/reputation cost.
C2 = wrong internal state, wrong UX, wasted work. C1 = cosmetic.

Falsification: this map is falsified if (a) a clean checkout at 0264d517
shows a different file/symbol/call-graph for any surface, (b) a production
caller exists that my grep missed (e.g. dynamic import or a path outside
src/tools), or (c) any surface I marked declared-only is in fact executed
in a live path.

## Verdict lines (file:line evidence)

- V1 D-01 authorizeWorkOrder: REAL, orca-adapter/vendor/external_agent_adapter.js:185;
  8 deny reasons at lines 188-218; wall-clock branch Date.now() at :193;
  callers adapter.js:1239 (dispatch gate) and vendor :227 (issueWorkOrder
  internal re-run, called from adapter.js ~:1298); invoke of carried
  WorkOrder at ~:1353 after lock release; ZERO test files reference it
  (grep over test/ empty). DETERMINISTIC modulo wall clock.
- V2 D-02 identity fence: REAL, adapter.js ~:1225: identity_5..10 DENIED
  with typed authorization_refusal, first check in dispatchExecution,
  per-dispatch re-evaluation. [NEW: exact location pinned]
- V3 D-03 reconcileGate: REAL, adapter.js:429 (+ locked variant :445);
  hostile selftest test/reconcile-gate-selftest.js present. Reachability
  confirmed.
- V4 D-04 resolveTenantId: REAL, adapter.js:89; fail-closed throw on
  namespace contradiction.
- V5 D-05 mc-dispatch-identity: REACHED, not just declared:
  src/app/api/mc/_lib/mc-dispatch-identity.ts:66 resolveCaller is imported
  by src/app/api/mc/dispatch/route.ts (only importer). Per-request
  re-resolution confirmed. [NEW: reachability verified]
- V6 D-06 callerScope: REACHED: mc-tenant-gate.ts:45 imported by
  src/app/api/mc/missions/route.ts and missions/[id]/route.ts.
  [NEW: callers pinned]
- V7 D-07 grantsForViewer: REAL+REACHED: grants.ts:47 pure function;
  caller src/lib/ping/ping-object-reader.ts; tested in
  src/fyd/ask/__tests__/ask-fyd.test.ts. Body confirmed pure
  (no clock, no random).
- V8 D-08 planActions: REAL+REACHED: action-planner.ts:57; production
  callers src/app/api/ping/actions/route.ts, src/app/feed/page.tsx,
  src/lib/ping/ping-object-reader.ts; tests lane-a.test.ts (14 tests).
  Zero Date.now/Math.random hits: pure.
- V9 D-09 rankDiscoveryItems: IMPLEMENTED BUT UNWIRED. feed-rank.ts:71 is
  real and pure (nowIso pinned; the one Date.now grep hit is a doc
  comment), tested in lane-a.test.ts, but the ONLY non-test reference in
  src/ is its own file. No production caller. [CORRECTION vs lane 11:
  presented as a live ranking surface; it is declared-only in production.]
- V10 D-10 composeAnswer: REAL+REACHED: ask-composer.ts:793; production
  callers src/fyd/ask/answer.ts, src/lib/ping/ping-object-reader.ts,
  src/fyd/lineage/tracer.ts, src/fyd/lineage/spike-trace.ts; tests
  lane-a.test.ts, lane-e-battery, ask-privacy-probe.
- V11 D-11 digest: REAL+REACHED: digest.ts exports DIGEST_ALGORITHM :56,
  sha256Hex :124, canonicalize :136, digestCanonical :150, verify :159;
  tests digest.test.ts. T2 note: workOrderId minted at adapter.js:1291
  comment as sha256('workorder:'+taskId)[0:16], a deterministic ID, not a
  kernel-derived fingerprint (T2 GAP stands).
- V12 D-12 OUTCOME vocabulary: REAL: outcomes.js, 126 lines; vocabulary
  completed|failed|unknown|denied|escalated confirmed at lines 24-39;
  UNKNOWN first-class, never collapses to FAILED.
- V13 D-13 attestation gates: REAL. owner-mode gate (85 lines) is DEMO
  ONLY per its own header (:2 "for the FYD demo. No PING runtime import").
  social gate attestation-gate.ts exports attestRelationshipState :70 and
  attestObjectCreated :139; production caller src/fyd/social/actions.ts.
  [NEW: social gate reachability confirmed; owner-mode demo-only confirmed]
- V14 D-14 verifyProposalDigest: REAL+REACHED: ask-composer.ts:80;
  production callers src/lib/ping/ping-object-reader.ts,
  src/fyd/ask/site-patch.ts; proposalDigest callers across
  fyd/customize/* and fyd/data/*. The approval CHOICE remains H-01.
- V15 D-15 health-rules: REAL+REACHED: health-rules.ts:59
  defaultHealthRules (config thresholds), checkThreshold :112,
  loadHealthRules :103; production callers src/lib/validation-engine.ts,
  src/lib/metrics.ts. [NEW: reachability confirmed]
- V16 D-16 approvals projection: REAL: approvals/route.ts 130 lines;
  digest-gated (DIGEST_RE 64-hex :95), decision restricted to
  approve|deny (:98), silence never approves (:20). Deterministic wrapper
  around H-01.
- V17 B-01 classifyReview: IMPLEMENTED BUT UNWIRED. classifier.ts:273
  classifyReview (VADER rule-based, 410 lines); the ONLY non-test
  reference is classifier-provider.ts, which itself has ZERO importers
  in src/tools. No tests under any sentiment path. No production caller.
  [CORRECTION vs lane 11: implied reachable; it is declared-only.]
- V18 B-02 EstimatorFlags: REAL+REACHED (FYD demo scope):
  interview-engine-v3.ts (computeConfidence :70, shouldRequireSiteVisit
  :335, shouldRequireEstimatorReview :349); consumers
  src/types/registries.ts, src/types/index.ts,
  src/components/flag-reveal.tsx (UI). Human-facing demo flow.
- V19 B-03 grill-20: REAL as procedure. grill20-lint.py is a READ-ONLY
  validator (never modifies the log), not the classifier; the classifier
  is the agent-executed SI-03 20-check gate per the standing directive;
  25 records in escalation-log.jsonl (9 decide, 14 escalate, 1
  escalate_resolved_by_owner, 1 unparseable line). [NEW: classifier is
  agent-executed, lint is validation-only]
- V20 B-04 actorProximity: JUDGMENT PART DECLARED-ONLY. The code is only a
  clamp (feed-rank.ts:50: min/max to 0..10) on a caller-supplied value;
  no viewer-follow graph or proximity-assignment implementation observed
  anywhere in src/. The judgment "who is 0..10 close" has no code home.
  [CORRECTION vs lane 11: the bounded judgment is not implemented]
- V21 B-05 never-reengage guard: REAL+REACHED:
  ~/workspace/outreach/engagement-guard.py: engagement-guard.py:432
  _fb_ledger_engaged_post_ids merged into load_index() at :518/:557;
  verdicts incl ALREADY_ENGAGED :72. Ledger
  action-intent-ledger.jsonl: 12,673 lines back to 2026-09-14.
- V22 B-06 outreach eligibility: REAL as agent-executed procedure. Rule
  recorded in ~/AGENTS.md:14 (cold email cap 10/day UTC, highest
  confidence only, FB Page first). Statuses in pipeline-addition files
  and eligibility-reconciliations.md under ~/workspace/outreach/.
  No single code function owns the judgment; per-round agent execution.
- V23 B-07 ask claim fact-class: REAL+REACHED: classificationFromProvenance
  at ask-composer.ts:140; classes DIRECT_FACT/DERIVED_FACT/INFERENCE/
  GENERATED_COPY/USER_OVERRIDE present in ask-composer.ts. Lane-10
  duplicate-mapping note stands (two classificationFromProvenance
  functions with different mappings).
- V24 B-08 competitive-signal-pass: REAL+REACHED on demand:
  ~/workspace/skills/competitive-signal-pass/signal_pass.py:46 TERMINAL =
  (PASS, NO_VALUE, BLOCKED, FAILURE); deterministic gates at :222-237;
  57 runs recorded, cycle outputs present (2026-09-15).
- V25 B-09 worker self-report verdicts: REAL+REACHED in the adapter:
  verifyResultEnvelope at vendor/external_agent_adapter.js:306;
  invalidResult gates at :302-335 (work_order_id mismatch, executor
  mismatch, capability mismatch, missing fields). Three-way binding
  (authorized==invoked==result) is code, not policy.
  [NEW: location pinned in adapter, not in canonical src]
- V26 B-10 WAITING_APPROVAL triage: NO CODE PRIMITIVE FOUND. Zero hits for
  WAITING_APPROVAL/waiting_approval in canonical src/, in
  /home/nolan/workspace (Pig, js/ts/json, no node_modules), or the
  mission runtime. Lane 10 independently found "no WAITING_APPROVAL
  primitive in src/". The triage is operator/coordinator-executed
  (mission state read, hold|propose|escalate decided by the human loop).
  [CORRECTION vs lane 11: as a code decision surface it is declared-only.]
- V27-V30 R-01..R-04: DEEP REASONING stands. R-01 Meta AI outputs carry
  the UNVERIFIED-until-gate rule (tandem/mark-verified.sh exists);
  R-02/R-03/R-04 are agent/LLM judgments with no closed contract.
- V31-V35 H-01..H-05: HUMAN AUTHORITY stands. H-01 approvals route
  mechanics verified (V16); H-04 gateway defect HELD for Nolan confirmed
  in ledger; no code path can approve silently.
- V36-V42 U-01..U-07: UNKNOWN stands. U-04 calibration n=6 with lane-16
  corrections (mean latency 429.8ms not 422; S6 p=0.19 carries 79% of
  Brier mass; threshold 0.5 is lane-imposed). U-06 codex block: resolved
  as intended-temporary; residual no-recheck stands. U-05: at HEAD
  baseline compileAskContext has exactly one non-test reference (its own
  file) = declared-only; lane-10 (B) buildAskContext reached at
  ask-composer.ts:189.

## Per-surface deep map

Format per surface: identity | owner | input | evidence | outputs |
implementation | callers | reachability | det/uncertain | criticality |
reversibility | authority | tests | final-label source | samples |
failure cost.

### DETERMINISTIC (16)

D-01 mc.authorize_work_order/v1 | PING (ping:external-agent-adapter) |
{agentId, capability, namespace, constraints} | AGENT_PROFILES registry
facts (status, blockedExternal, allowedCapabilities, maxConstraints) +
request fields | GRANT | DENY + typed reason |
vendor/external_agent_adapter.js:185 (8 deny reasons :188-218;
Date.now() expiry branch :193) | adapter.js:1239 dispatch gate;
vendor :227 issueWorkOrder internal re-run (called adapter.js ~:1298);
invoke of carried WorkOrder ~:1353 post-lock | live in dispatch loop |
DETERMINISTIC modulo wall clock (identical inputs across the
blockedUntil boundary give different verdicts; falsifier-confirmed) |
C4 | DENY pure; GRANT reversible via reconcile/HOLD | PING executor
CapabilityAuthority | NONE dedicated (gap; reconcile-gate and tenant
selftests exist for neighbors) | live function output | n=6 shadow
samples (Jev, 6/6 agreement at 0.5, Brier 0.0076; NOT calibration) |
false GRANT = unapproved external effect (C4); false DENY = blocked
legitimate work.

D-02 identity fence identity_5..10 DENIED | PING (adapter policy, Nolan
2026-09-25 directive) | agentId | static binding directive |
DENY + typed authorization_refusal | adapter.js ~:1225 (step 1 of
dispatchExecution) | dispatchExecution | live, per-dispatch |
DETERMINISTIC | C4 | pure (nothing invoked) | owner directive |
none (inline) | the directive itself | n/a (policy constant) | false
ALLOW = unauthorized agent execution (C4).

D-03 reconcileGate | PING (adapter) | {evidenceDir, execution, input,
tenant_id, capability, reconciliation} | durable index + artifact
existence | {allowed, idempotency_key} | refusal(duplicate_attempt |
idempotency_index_corrupt | artifact_exists) |
adapter.js:429 (locked :445), atomic under cross-process index lock |
dispatchExecution | live | DETERMINISTIC | C4 | refusal pure; allowed
is pre-effect | PING executor | reconcile-gate-selftest.js (hostile,
not executed here) | selftest expectations | not counted here |
false allowed = double external effect (C4); false refusal = stuck
work (C2).

D-04 resolveTenantId | PING (adapter) | {tenantId, namespace} | namespace
string | tenant id | throw on contradiction |
adapter.js:89 | dispatchExecution | live | DETERMINISTIC | C4 |
throw is pure (dispatch never starts) | PING executor | covered by
tenant-threading-selftest.js | selftest | n/a | cross-tenant dispatch
(C4).

D-05 mc-dispatch-identity | PING (Mission Control) | x-mc-caller-key
header | operator-provisioned caller registry
(CALLER_REGISTRY_PATH) | {agent_id, tenant, entitled_tenants} |
mc-dispatch-identity.ts:66 resolveCaller | imported ONLY by
src/app/api/mc/dispatch/route.ts | live per request |
DETERMINISTIC | C3 | pure mapping | operator registry |
none dedicated | registry records | n/a (config) | mis-mapping =
wrong tenant authority (C3). Sibling mirror SLICE_AGENTS
(mc-dispatch.ts:30) is documented advisory-only.

D-06 callerScope | PING (Mission Control) | request headers |
x-mc-tenant header format | operator | tenant | 400/403 |
mc-tenant-gate.ts:45 | mc/missions/route.ts, missions/[id]/route.ts |
live | DETERMINISTIC | C3 | pure gate | PING MC | none dedicated |
HTTP semantics | n/a | cross-tenant read (C3).

D-07 grantsForViewer | PING (identity/grants lane) | {viewerId,
controllerId, isSite} | subject fields | FydGrant[] |
src/lib/ping/grants.ts:47 | ping-object-reader.ts |
live | DETERMINISTIC (pure, no clock) | C2 (viewer authority, NOT the
executor CapabilityAuthority; file says so) | pure | grant lane |
ask-fyd.test.ts | test expectations | lane-a/ask tests | over-grant =
viewer sees owner actions (C2).

D-08 planActions | PING (Ask/agent context lane) | PlannerInput
(viewer, target, capabilities) | capability registry | CapabilityPlan |
action-planner.ts:57 | api/ping/actions/route.ts, app/feed/page.tsx,
ping-object-reader.ts | live | DETERMINISTIC (0 clock/random hits) |
C2 | pure | agent-context lane | lane-a.test.ts (14) + ask tests |
tests | lane-a cases | wrong plan = confusing agent affordances (C2).

D-09 rankDiscoveryItems | PING (feed lane) | (items, nowIso) |
item fields (kind, eventTime, id, actorProximity) | ordered items |
feed-rank.ts:71 (pure; nowIso pinned) | NONE in production (only
lane-a.test.ts) | DECLARED-ONLY in production | DETERMINISTIC | C1 |
pure | feed lane | lane-a.test.ts | test cases | 0 production samples |
wrong order = feed quality (C1). Flagged declared-only.

D-10 composeAnswer | PING (Ask FYD serving lane) | (AskContext,
question) | bounded evidence context | AskAnswer with citations +
unknowns | ask-composer.ts:793 | fyd/ask/answer.ts,
ping-object-reader.ts, fyd/lineage/tracer.ts, spike-trace.ts | live |
DETERMINISTIC template (pure function of context+question) | C2 |
pure | Ask lane | lane-a, lane-e-battery, ask-privacy-probe tests |
test expectations | battery cases | unsupported claim served (C2);
mitigated by evidence-bounded template + unknowns list.

D-11 sha256-canonical-json-v1 | PING (constitutional digest) |
arbitrary value | none | 64-hex digest | digest.ts:56/124/136/150/159 |
repo-wide (lanes import, never re-implement) | live | DETERMINISTIC |
C3 (identity primitive) | pure | digest authority | digest.test.ts |
test vectors | standard vectors | digest collision/mismatch =
broken identity binding (C3). T2 gap: workOrderId (adapter.js:1291)
is a deterministic ID, not a kernel-derived fingerprint.

D-12 OUTCOME vocabulary | PING (adapter) | worker result envelope |
verified envelope fields | completed|failed|unknown|denied|escalated
(+ orthogonal EFFECT_STATE) | outcomes.js (126 lines; :24-39) |
adapter dispatch | live | DETERMINISTIC mapping | C3 |
vocabulary only | outcome lane | none dedicated | code comments +
usage | n/a | mislabel = wrong recovery path (C3); PING-strong:
UNKNOWN never collapses to FAILED.

D-13 attestation gates | PING/FYD | evidence presence per gate |
required evidence refs | ATTEST | ATTESTATION_REJECTED |
owner-mode/attestation-gate.ts (85 lines, DEMO ONLY per header) and
social/attestation-gate.ts (:70 attestRelationshipState, :139
attestObjectCreated) | owner-mode: none in runtime; social:
fyd/social/actions.ts | social: live; owner-mode: demo only |
DETERMINISTIC | C2 (social), C1 (demo) | pure gate | gate lane |
unknown | demo flows (social) | n/a | false attest = false success
claim (C2); owner-mode gate must never authorize real decisions.

D-14 verifyProposalDigest | PING (Ask/FYD customize lane) |
AskProposal | canonical body bytes | true | false |
ask-composer.ts:80 (proposalDigest :76) | ping-object-reader.ts,
fyd/ask/site-patch.ts; proposalDigest used in fyd/customize/*,
fyd/data/* | live | DETERMINISTIC | C3 (tamper detection) |
false = refusal, no state change | customize lane | ask tests |
test vectors | site-patch flows | digest bypass = tampered
proposal approved (C3).

D-15 health-rules | PING (FYD health lane) | health signals |
signal measurements | ok | warning | critical |
health-rules.ts:59 defaultHealthRules (config), :112 checkThreshold,
:103 loadHealthRules | validation-engine.ts, metrics.ts | live |
DETERMINISTIC classification; the THRESHOLDS are config judged by
humans | C1 | pure | health lane | unknown | config defaults |
n/a | mis-tuned thresholds = alert noise or silence (C1).

D-16 /api/mc/approvals projection | PING (Mission Control) |
{proposal_id, digest, decision} | recorded proposal digest |
one canonical transition (MC_APPROVAL_APPROVED|DENIED) |
approvals/route.ts (130 lines; :95 DIGEST_RE, :98 decision enum,
:20 silence never approves) | operator/CLI callers | live |
DETERMINISTIC wrapper | C3 (projection; the approve|deny CHOICE is
H-01) | refusal pure; approved transition emits event (reversible
by subsequent decision) | operator | unknown | recorded proposals |
approval records | projection bug = wrong canonical transition (C3).

### BOUNDED DECISION CANDIDATES (10, tournament pool)

B-01 classifyReview | PING (sentiment lane) | (text, rating?) |
review text | {positive|review} bucket + confidence |
src/lib/sentiment/classifier.ts:273 (VADER rule-based; provider
interface classifier-provider.ts, Stage 13 of moderation pipeline) |
NONE: provider has zero importers in src/tools; zero tests |
DECLARED-ONLY (implemented, unwired) | C2 | pure |
moderation lane | NONE | human moderation decisions (prospective) |
0 production samples | wrong bucket = review wrongly published or
wrongly held (C2). Flagged declared-only + zero samples.

B-02 EstimatorFlags | PING (FYD interview lane) | intake answers |
ProjectIntakeRecord | flags with severity |
src/lib/interview-engine-v3.ts (:70 computeConfidence, :335
shouldRequireSiteVisit, :349 shouldRequireEstimatorReview) |
flag-reveal.tsx (UI), types/registries.ts | live in FYD demo flows |
BOUNDED (rule-based flags; severity judgment) | C2 | pure |
interview lane | unknown | expert review (prospective) | demo
intake runs only (no adjudicated samples recorded) | wrong flags =
bad estimate UX / missed site visit (C2). Consumer check: any
consumer treating a flag as authorization would be a carried-verdict
defect; observed consumers are UI-only.

B-03 grill-20 (SI-03) | PING (autonomy gate) | question/decision
proposed for Nolan | 20 locked checks + per-check evidence |
decide | escalate | agent-executed procedure per standing directive;
grill20-lint.py is a READ-ONLY record validator (never modifies log);
schema escalation-record-template.md | every agent surface (the gate
runs before any Nolan-bound question) | live as procedure |
BOUNDED (verdict composition deterministic; individual check
JUDGMENTS are human/deep) | C3 | pure (record filed to
escalation-log.jsonl) | autonomy gate | lint validates schema, not
judgment | escalation-log.jsonl: 25 records (9 decide, 14 escalate,
1 escalate_resolved_by_owner, 1 unparseable) + owner overrides |
wrong decide = owner blind spot on risky item (C3); wrong escalate =
owner attention tax (C2). Partial carried-verdict alignment.

B-04 actorProximity | PING (feed lane) | actor | viewer-follow graph |
0..10 | clamp only: feed-rank.ts:50 (min/max); NO proximity-assignment
implementation exists in src/ | the judgment has no code home; the
clamp feeds rankDiscoveryItems (itself unwired) | JUDGMENT
DECLARED-ONLY; clamp deterministic | C1 | pure | feed lane |
lane-a.test.ts (clamp behavior) | viewer-follow graph (not observed) |
0 samples | mis-scored proximity = feed mis-order (C1). Flagged
declared-only judgment + no label source.

B-05 engagement never-reengage guard | PING (outreach) | post
(handle + post_id/url) | intent ledger history (durable post IDs) |
eligible | drop (ALREADY_ENGAGED etc) |
~/workspace/outreach/engagement-guard.py: load_index :518 merges
_fb_ledger_engaged_post_ids :432 at every load | every engagement
pass builder + at-dispatch guard | live | BOUNDED (exact-match rules
on durable history; deterministic given the ledger) | C2 |
pure (drop/eligible) | outreach | implicitly covered by pass logs;
guard behavior verified in code | intent ledger: 12,673 lines
(2026-09-14 to present) | 12,673 intent records | false eligible =
re-engagement policy violation, platform trust risk (C2); false drop =
lost engagement opportunity (C1). Re-derived per load: T1-ALIGNED.

B-06 outreach eligibility (highest-confidence targeting) |
PING (outreach) | prospect record | pipeline statuses, replies,
channel rules (FB Page first, no chains, corridor geography) |
send | skip (+ HOLD) | agent-executed per round; rules in
~/AGENTS.md:14 (cap 10/day UTC, highest confidence only); statuses in
pipeline-addition files + eligibility-reconciliations.md | outreach
rounds (email/DM/form passes) | live as procedure | BOUNDED
(deterministic gates on structured state + confidence judgment) |
C3 | send is EXTERNAL and hard to reverse | outreach | round logs |
pipeline statuses + replies (partially structured) | hundreds of
prospect decisions across rounds | wrong send = reputation damage,
wasted owner attention (C3); wrong skip = lost revenue (C2).
Deterministic gates on structured state.

B-07 ask claim fact-class | PING (Ask lane) | claim + provenance |
PingObject provenance | DIRECT_FACT | DERIVED_FACT | INFERENCE |
GENERATED_COPY | USER_OVERRIDE | ask-composer.ts:140
classificationFromProvenance (lane-10 note: duplicate function with
different mapping elsewhere) | composeAnswer pipeline | live |
BOUNDED (mapping rules over provenance tags) | C2 | pure |
Ask lane | ask tests | Ask context provenance (weak; no independent
adjudication) | battery/probe cases | misclassification =
over/under-claimed answer (C2). Composition deterministic.

B-08 competitive-signal-pass | PING (intelligence lane) | evidence
set | candidate records + verification ratio | PASS | NO_VALUE |
BLOCKED | FAILURE | skills/competitive-signal-pass/signal_pass.py:46
TERMINAL enum; hard gates :222-237 (deterministic machinery; LLM
generates candidates only) | on-demand runs | live on demand |
DETERMINISTIC machinery over bounded candidate space | C2 |
pure (no PING writes by design) | intelligence lane |
acceptance_test.py, test_cycle.py | hard-gate outcomes (self-labeling) |
57 runs + cycle outputs (2026-09-15) | wrong PASS = noise promoted to
intelligence (C2); wrong BLOCKED = missed signal (C1).

B-09 worker self-report verdicts (O5) | PING (adapter) | worker
result envelope | issued work order + invocation binding |
completed | failed (never the claim itself) |
vendor/external_agent_adapter.js:306 verifyResultEnvelope; :302-335
invalidResult gates (work_order_id mismatch, executor mismatch,
capability mismatch, missing fields) | dispatchExecution result path |
live | BOUNDED (strict structural verification; effect claims stay
effect_unknown) | C3 | verification pure; outcome recorded |
adapter | none dedicated | adapter verification behavior |
shadow + MC mission runs (small n) | false completed = false effect
attribution (C3); false failed = wasted retry (C2). Claim never
promotes effect state: T1-ALIGNED.

B-10 WAITING_APPROVAL triage | PING (operator procedure) | mission
state | mission records + owner context | hold | propose | escalate |
NO CODE: zero WAITING_APPROVAL/waiting_approval hits in canonical
src/, Pig /home/nolan/workspace (js/ts/json), or mission runtime;
lane 10 independently found no primitive in src/ | executed by the
operator/coordinator reading mission state | DECLARED-ONLY as code |
BOUNDED as a judgment (typed options) | C3 | hold/propose pure;
escalate consumes owner attention | owner | none | owner approval
records (the triage outcomes themselves) | 0 code-executed samples |
wrong escalate = owner burden (C2); wrong hold = stalled mission
(C3). Escalation goes to human: carried-verdict safe.
Flagged declared-only as code.

### DEEP REASONING (4)

R-01 Meta AI research delegation outputs | PING (tandem) | research
brief | web/docs evidence | open-ended research answer | Pig-side
meta-ask.js + context packs (tandem/build-context-pack.py); verifier
tandem/mark-verified.sh | PING ingestion | UNVERIFIED until the
verification gate; never promoted into canonical claims | DEEP
REASONING | C2 | n/a (advisory text) | tandem lane | redteam/adv
passes | verification gate records | research runs | hallucinated
fact entering a pitch (C2); contained by the gate.

R-02 future LLM-powered Ask PING beyond the deterministic template |
PING (Ask lane) | open question | full graph | open answer | NOT
IMPLEMENTED (current composer is the deterministic template) |
none | absent | DEEP REASONING | C2 | n/a | Ask lane | none |
n/a | 0 | unbounded claim risk (C2+). Excluded from tournament.

R-03 grill-20 judgment inputs (e.g. safe_default_80 >= 80% calls) |
agent/human | question context | owner history | pass|fail per check |
agent judgment per SI-03 checks | every grill-20 run | live |
DEEP REASONING (the check verdicts) with deterministic composition |
C3 | record only | agent | lint (schema only) | escalation log |
25 records | misjudged check = wrong decide/escalate (C3).

R-04 prospect research narratives and angle selection | PING
(outreach) | prospect public presence | web evidence | narrative +
angle | agent-executed research rounds; angle-performance.md tracks |
outreach copy | live | DEEP REASONING | C2 | copy draft |
outreach | round logs | research notes + reply rates | prospect
rounds | off-angle copy = low reply rate (C1-C2).

### HUMAN AUTHORITY (5)

H-01 /api/mc/approvals approve|deny | Nolan (owner) | proposal digest
+ summary | recorded proposal | approve | deny | approvals/route.ts
projection (D-16); choice made by the owner on the exact digest |
operator/CLI | live | HUMAN | C4 (authorizes effects) | approved
transition reversible by later decision; silence never approves |
OWNER | approval records | owner approval records | approval history |
wrong approve = authorized bad effect (C4).

H-02 FYD owner publish | Nolan (owner) | site patch proposal |
exact digest | publish | hold | site.propose never implies
site.publish; publish is the owner approving the exact digest |
customize flows | live | HUMAN | C3 | publish reversible by
revert | OWNER | proposal records | digest match required |
proposal/publish history | wrong publish = bad site live (C3).

H-03 sentiment moderation final decision | Nolan/human moderator |
review + classifier recommendation | classifier output (B-01, when
wired) | publish | hold | remove | human moderation step (Stage 13
pipeline; classifier only recommends) | moderation flow | pending
(classifier unwired) | HUMAN | C2 | reversible | OWNER | none |
moderation decisions (prospective) | 0 | wrong publish = bad review
live (C2).

H-04 gateway defect (missing jev namespace) | Nolan (owner) | fix
proposal (register jev:'PING' + rebuild, or pause missions) |
lane-13 assessment (FIX NEEDS GUARD) | authorize fix | hold |
HELD: presented as one-decision ask; coordinator and lanes must not
touch gateway or the 3 scheduler missions | parent | HELD |
HUMAN | C4 | fix reversible (config+rebuild) | OWNER | lane-13
repro | assessment records | 0 (fix not applied) | wrong fix =
in-process forgery surface change (C3-C4); held correctly.

H-05 WAITING_APPROVAL mission progression | Nolan (owner) | mission
awaiting owner | mission state | approve | deny | hold | mission
waits on the owner (no code auto-progresses) | mission runtime |
live | HUMAN | C3 | hold pure | OWNER | mission records |
owner records | mission history | auto-progress would be an
authority bypass (C4); none observed.

### UNKNOWN (7)

U-01 Jev cost per call | n/a (not a decision) | API response | none |
API does not report cost | n/a | none | UNKNOWN | n/a | n/a |
provider | none | none | 0 | unknown spend (C1-C2).

U-02 Jev model_version/commit | n/a | version endpoints | 404, not
published | n/a | none | UNKNOWN | n/a | n/a | provider | none |
none | 0 | unverifiable model identity (C2).

U-03 Jev confidence field | n/a | API response | null, never
populated | n/a | none | UNKNOWN | n/a | n/a | provider | none |
none | 6 nulls | unusable uncertainty signal (C2).

U-04 calibration | n/a | shadow runs | 6 samples | n=6, Brier
0.0076, 6/6 at lane-imposed 0.5; lane-16: mean latency 429.8ms,
S6 p=0.19 carries 79% of Brier mass; calibration NOT established |
shadow-decisions-2026-09-28.json | shadow | UNKNOWN |
n/a | n/a | lane 11/16 | records | 6 | premature promotion risk
(C4); Jev stays SHADOW.

U-05 ORCA CONTEXTPACK evidence for authorizeWorkOrder | PING | dispatch
request | hand-assembled state at HEAD | at HEAD: compileAskContext
declared-only (one non-test ref: its own file); buildAskContext
reached (ask-composer.ts:189) | patch branch
decision-fabric/contextpack-wire-2026-09-28 @ 9a555021 closes the
first broken edge (parent-verified 4/4 jest + clean-checkout replay) |
HEAD: declared-only; patch: live | UNKNOWN (evidence completeness) |
C3 | n/a | Ask/ORCA lanes | patch tests | pre/post packet diff
(0 vs 32 obj:/field:/rel: refs) | post-patch samples | thin evidence
= weaker authorization basis (C3).

U-06 codex quota post-2026-09-17 | n/a | ChatGPT plan state | stale
2026-09-16 observation | resolved: block was intended-temporary;
expiry by design (external_agent_adapter.js:98, :190-197) |
code | live | UNKNOWN (residual: no re-check mechanism) | C2 |
n/a | adapter | none | none | 0 | grant on exhausted quota =
failed execution (C2).

U-07 startup execution-authority integrity gate | n/a | active
authority records at resume | none observed at ORCA/MC resume
boundary | NOT OBSERVED (P2 benchmark gap) | none | absent |
UNKNOWN | C4 | n/a | PING | none | none | 0 | stale/quarantined
authority resuming work (C4).

## Flags

### Declared-only (no reachable runtime implementation)
- D-09 rankDiscoveryItems: implemented + tested, zero production callers.
- B-01 classifyReview: implemented (VADER), zero production callers, zero tests.
- B-04 actorProximity: the proximity judgment has no implementation; only the clamp is code.
- B-10 WAITING_APPROVAL triage: no code primitive anywhere; operator-executed procedure.
- U-05 (at HEAD): compileAskContext declared-only (patch branch closes this).

### No final-label source
- B-01 (prospective human moderation decisions; none recorded), B-02
  (prospective expert review; none recorded), B-04 (viewer-follow graph
  not observed), B-07 (Ask provenance only; no independent adjudication),
  U-01/U-02/U-03 (provider unknowns).

### Zero historical samples
- B-01 (0 invocations), B-02 (no adjudicated samples), B-04 (0),
  B-09 (small n, no dedicated sample set), B-10 (0 code-executed),
  D-09 (0 production; test cases only), U-01/U-02/U-03/U-06/U-07 (0).

## Top-10 bounded-decision candidates, ranked by volume x failure cost

Method: volume = estimated decisions/day at standing cadences (order of
magnitude, labeled estimate); cost = 1 cosmetic .. 4 safety/authorization.
Score = volume x cost. Volumes are rough; the ranking is robust to 2x
volume error except where noted.

| Rank | ID | Decision | Volume/day (est) | Cost | Score | Why |
|---|---|---|---|---|---|---|
| 1 | B-05 | never-reengage guard | ~3,900 (5 platforms, 2h cadence: ~324 checks/pass x 12) | 2 | ~7,800 | Highest volume by far; every engagement action gated; false eligible = policy violation |
| 2 | B-06 | outreach eligibility | ~75 (rounds across email/DM/form) | 3 | ~225 | External sends; wrong send = reputation damage |
| 3 | B-09 | worker self-report verdicts | ~30 (MC missions + shadow runs) | 3 | ~90 | False completed = false effect attribution |
| 4 | B-03 | grill-20 verdict composition | ~10 | 4 | ~40 | Wrong decide = owner blind spot on C4 items; 25-record label source exists |
| 5 | B-07 | ask claim fact-class | ~20 (demo Ask traffic) | 2 | ~40 | Misclassification = over/under-claimed answers |
| 6 | B-10 | WAITING_APPROVAL triage | ~5 | 4 | ~20 | Declared-only as code, but the human procedure runs; wrong hold stalls missions |
| 7 | B-02 | EstimatorFlags | ~10 (demo intakes) | 2 | ~20 | Wrong flags = bad estimate UX |
| 8 | B-08 | competitive-signal-pass | ~3 (on-demand) | 2 | ~6 | Deterministic machinery; 57 historical runs |
| 9 | B-01 | classifyReview | 0 (unwired) | 2 | 0 | Ranks on potential only; needs production wiring before tournament relevance |
| 10 | B-04 | actorProximity | 0 (unwired; judgment unimplemented) | 1 | 0 | Judgment itself is declared-only; tournament-ineligible until a proximity source exists |

Note: D-01 mc.authorize_work_order/v1 sits in lane 11's tournament
contract #1 slot but classifies DETERMINISTIC (rule engine + wall clock);
its tournament value is regression-locking the 8 checks, not judging.

## Constraints honored

Read-only on the canonical tree, orca-adapter, and the locked dispatch
call site. No gateway, scheduler mission, :3100, Hermes, FYD, or Happy
Place contact. No writes, no pushes. No em dashes used.

## Falsification statement

This map is a hypothesis until replayed from a clean checkout at
0264d517. It is falsified by: (1) any clean-checkout file/symbol/call
graph differing from the verdict lines above; (2) a production caller my
greps missed (dynamic import, or a path outside src/tools on the Pig or
workspace side), especially for D-09, B-01, B-04, B-10; (3) any
declared-only surface shown executing in a live path. UNKNOWN entries are
legitimate states, not failures.
