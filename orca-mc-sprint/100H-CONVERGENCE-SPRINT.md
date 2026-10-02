# PING / FYD — 100-HOUR CONVERGENCE SPRINT (Nolan, 2026-09-27 ~20:10 MDT)

Status: BINDING. Standing coordinator directive. Refines the 100H Sovereign
Directive (~/workspace/orca-mc-sprint/100H-SOVEREIGN-DIRECTIVE.md) with a harder
definition of finished. THE LOCKED GRILL REMAINS AUTHORITY. DO NOT RE-ASK LOCKED
DECISIONS. DO NOT EXPAND THE PRODUCT FRONTIER.

T+0 = 2026-09-27 ~20:10 MDT. T+100 = 2026-10-02 ~00:10 MDT.

## Purpose

TURN THE LARGE AMOUNT OF PROVEN MACHINERY INTO ONE SMALL, REACHED, FAIL-CLOSED,
REPLAYABLE PRODUCT SYSTEM.

By end of sprint, ONE thing must hold: a real FYD owner can ask "Analyze my
website and make emergency services more prominent." and the system can:
OBSERVE -> BUILD/READ OBJECT GRAPH -> CREATE MISSION -> AUTHORIZE ->
EXECUTE BOUNDED WORK -> PRODUCE EXACT PROPOSAL -> RENDER PREVIEW ->
APPROVE EXACT DIGEST -> APPLY CANONICAL TRANSITION -> PROJECT -> DISPLAY ->
RESTART -> REPLAY -> RECONSTRUCT THE SAME TRUTH.
And when any effect becomes ambiguous: STOP -> HOLD -> RECONCILE ->
NEVER BLINDLY REPEAT IT. THAT IS THE OPERATING SYSTEM.

Major risk being managed: 16 lanes can produce enormous evidence while failing to
converge the reached product path. Finished = fewer authorities, fewer duplicate
implementations, fewer ambiguous execution states, one FYD journey surviving
hostile failure.

## Power management is CLOSED

The Pig is now treated as an AUTOMATION SERVER. Verified: sleep Never AC/DC,
critical battery protections retained, no standby transition in soak window, WSL /
Docker / gateway / CDP / FYD survived, real automation dispatched and collected.
DO NOT CONTINUE POWER TUNING. Reopen only on NEW evidence of execution suspension
or availability loss. Do not use synthetic keep-awake loops as the architecture.

## One reached owner per semantic unit

For every semantic unit identify exactly one reached owner: IDENTITY, MISSION,
RUN, EXECUTION, CAPABILITY, ARTIFACT, EVIDENCE, EVENT, OBJECT PROJECTION,
RELATIONSHIP PROJECTION, APPROVAL, RECONCILIATION, TENANT CONTEXT,
MISSION CONTROL VIEW.

For each, record: REACHED IMPLEMENTATION / CALLERS / CANONICAL INPUT / CANONICAL
OUTPUT / DURABLE STATE / EVENTS / FAILURE SEMANTICS / REPLAY SOURCE / DUPLICATES /
RETIREMENT STATUS.

If two implementations both claim the semantic unit: THAT IS A DEFECT UNTIL
PROVEN OTHERWISE.

## The four planes (locked model)

1. INTENT PLANE: mission, proposal, human request.
2. AUTHORITY PLANE: identity, tenant, capability, approval, policy.
3. EXECUTION PLANE: run, attempt, worker, adapter, tool, external effect.
4. TRUTH PLANE: canonical events, artifacts/evidence, replay.
Mission Control and FYD are projections over these planes. NEITHER IS TRUTH.

## The approved proposal (do not touch)

Proposal: p0prop-ac04480a6d1809fd
Approved digest: 5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa
DO NOT regenerate it. DO NOT substitute an equivalent patch. DO NOT approve
"latest." Invariant: PROPOSAL A -> DIGEST A -> APPROVAL A -> EXECUTION A.
Prove the entire reached path; capture the authority boundary at every hop.

## Q-P0-04 WRONG_JOURNAL (acceptance)

Misconfigure the gateway exactly as specified. Attempt EMIT and DUMP. Expected:
TYPED WRONG_JOURNAL, plus 0 canonical writes, 0 fallback writes,
0 secondary-journal writes, 0 projection changes. IMPORTANT: do not prove zero
writes through the component under test; use authoritative storage queries plus an
independent falsifier. If ANY write occurs: FREEZE DOWNSTREAM JOURNAL WORK, find
the EARLIEST boundary where journal identity became optional, patch there, not
downstream.

## Q-P0-05 SECRET LEAKAGE (class-based)

Do not search only for the known password. Build a CLASS-based leak test:
PASSWORD, TOKEN, SECRET, PRIVATE KEY, DATABASE URL, AUTHORIZATION, COOKIE,
SESSION, API KEY, CREDENTIAL, connection strings. Trace: mission input -> run ->
attempt -> executor -> environment -> Hermes -> stdout/stderr -> structured
result -> artifact -> evidence -> event -> Mission Control -> Ask FYD -> browser ->
logs -> temp files -> crash artifacts -> replay. Desired architecture:
SECRET REFERENCE -> CAPABILITY -> BROKER -> EXECUTOR, never
SECRET VALUE -> MISSION/AGENT CONTEXT. The model should not need credentials
merely because the tool does.

## Q-P0-06 TENANT (body is not identity)

25/25 deny is useful. DO NOT EXPAND TENANTOS. Fix the architectural smell: REQUEST
BODY IS NOT IDENTITY. Trusted tenant context must originate from verified
ingress/session/authority; then business payload may REQUEST a resource. Never
body.tenant_id -> authority. Tests: trusted=A body=B -> DENY; missing trusted
identity body=B -> DENY; agent says B -> DENY; Jev suggests B -> IRRELEVANT.
Explicit trusted cross-tenant capability: ONLY THEN potentially allow. THIS IS A
CORE PING MOAT. Do not weaken it.

## HOLD (correct model, locked)

NOT_STARTED -> dispatch allowed. STARTED / EFFECT IMPOSSIBLE -> retry per
idempotency contract. EFFECT_PROVEN_NOT_OCCURRED -> redispatch allowed.
EFFECT_PROVEN_OCCURRED -> reconcile durable result. EFFECT_UNKNOWN -> HOLD.
HOLD IS NOT A DELAYED RETRY QUEUE. HOLD IS A SAFETY STATE. Lease expiration,
worker death, process restart, timeout, missing ACK MUST NOT convert UNKNOWN into
safe retry.

Deterministic rendezvous test: worker (1) starts attempt, (2) crosses effect
boundary, (3) external effect occurs, (4) acknowledgement/durable completion has
NOT yet reached coordinator, (5) KILL WORKER/HOST CONNECTION. Expected:
EFFECT_UNKNOWN -> HOLD. Then lease expires -> STILL HOLD. Scheduler sweeps ->
STILL HOLD. Runtime restarts -> STILL HOLD. Worker becomes available -> STILL
HOLD. Only the reconciler may determine PROVEN_OCCURRED / PROVEN_NOT_OCCURRED /
MANUAL_RESOLUTION. Count external effects: MUST EQUAL 1. This is more valuable
than 100 happy-path tests.

## Effect classification (per action, not a boolean)

Every effectful action carries: OPERATION_ID, ATTEMPT_ID, IDEMPOTENCY_KEY,
EFFECT_BOUNDARY, RECONCILIATION_STRATEGY, RETRY_POLICY. Classes: PURE, READ,
IDEMPOTENT_WRITE, DEDUPLICATED_WRITE, NON-IDEMPOTENT_EFFECT, UNKNOWN. Retry
policy derives from this classification, not from generic worker failure. Do not
use "idempotent" as a boolean adjective.

## RESULT vs ARTIFACT vs EVIDENCE vs EVENT

RESULT: structured executor return. ARTIFACT: durable output. EVIDENCE: durable
support for a claim/transition. EVENT: record that something happened. Do not
stuff all four into one JSON blob. But DO NOT build four new services: reuse the
reached primitives.

## Mission Control truthfulness

Must answer: WHAT WAS REQUESTED? WHO AUTHORIZED IT? WHAT RAN? WHAT EFFECTS WERE
ATTEMPTED? WHAT IS KNOWN? WHAT IS UNKNOWN? WHAT EVIDENCE EXISTS? WHAT NEEDS
HUMAN ACTION? It must NEVER manufacture certainty. Example: worker disappeared
after external POST -> "EFFECT UNKNOWN — RECONCILIATION REQUIRED", not FAILED,
definitely not RETRYING.

## ORCA primitives exercised through FYD

Do not build ORCA abstractions in isolation. Every important ORCA primitive must
be exercised through FYD; the FYD owner journey is the integration test. If an
ORCA subsystem is not reachable from any real client path: mark it UNREACHED. Do
not call it production architecture.

## Q-J-01..03: ten separate claims

Prove separately: SOURCE EXISTS / TEST PASSES / MODULE IMPORTS / COMPONENT
MOUNTS / ROUTE REACHES / BROWSER RENDERS / CONTROL DISCOVERABLE / CONTROL USABLE /
SURVIVES REFRESH / SURVIVES RESTART. Do not collapse them.

## Runtime mutation lease (kept)

A worker wanting easier local development is NOT authorization to restart a
served runtime. Before: SERVICE, PID, SHA/BUILD, REASON, EXPECTED OUTAGE,
ROLLBACK, OTHER ACTIVE USERS/WORKERS, CHECKPOINT. After: PROCESS HEALTH, ROUTE
HEALTH, BROWSER HEALTH, BUILD IDENTITY, DATA/PROJECTION INTEGRITY. Track
accidental outage as a defect; a later HTTP 200 does not erase it.

## Convergence trajectory (the number must decrease)

Every 24 hours ask: HOW MANY COMPETING IMPLEMENTATIONS EXIST FOR EACH SEMANTIC
UNIT? Ideal: T0 many authorities/ambiguous callers -> T+24 reality map complete ->
T+48 reached winners proven -> T+72 callers converged -> T+96 dead duplicates
retired where safe -> T+100 one reached operating loop. NOT successful merely
because LOC increased. A successful sprint may DELETE more code than it adds.

## 15 flaw scenarios to attack continuously

1. EVENT IDENTITY WITHOUT GLOBAL ORDER: prove replay ordering under concurrency;
   do not assume timestamps solve it.
2. EFFECT COMMIT VS EVENT COMMIT GAP: attack the instant between external effect
   and durable acknowledgement — where duplicate effects are born.
3. APPROVAL TO EXECUTION TOCTOU: exact proposal digest must remain exact through
   execution.
4. TENANT CONTEXT CONFUSION: trusted context must dominate request payload.
5. SECRET TRANSIT: tool secret must not become model/mission/evidence data.
6. SERVED SHA DRIFT: source HEAD is not served build; always prove runtime
   identity.
7. WORKTREE CONTAMINATION: never certify a result from a dirty tree without
   accounting for the diff.
8. REPLAY DEPENDENCE ON CURRENT CODE: record schema/version info required to
   understand historical events; do not silently reinterpret history.
9. PROJECTION FALSE AUTHORITY: attack APIs that accidentally write projection
   state directly.
10. MISSION CONTROL OPTIMISM: make UNKNOWN visible.
11. ARTIFACT WITHOUT LINEAGE: every important artifact traceable to
    run/attempt/evidence.
12. AGENT RESULT BECOMES FACT: agent output is proposal/evidence until authority
    accepts a transition.
13. RETRY STORMS: bound retry; distinguish infrastructure retry from effect retry.
14. DUPLICATE EXECUTION AFTER RESTART: crash at every boundary.
15. OBSERVABILITY LEAKAGE: telemetry/logs are another secret-exfiltration path.

## Harvest guidance (specific donors)

Durable-agent systems (e.g. Conductor-style durable execution with persisted
steps, retries, cancellation, human approval, recovery; newer agent runtimes
targeting crash recovery without re-firing ambiguous side effects) validate the
EFFECT_UNKNOWN -> HOLD direction. DO NOT adopt another workflow engine. Harvest
their failure matrices and tests, not their runtime.

OpenTelemetry GenAI semantic conventions (agent invocation, workflow invocation,
tool execution, MCP, agent identity, execution telemetry): HARVEST THE SEMANTIC
NAMES where useful for correlating MISSION/RUN/ATTEMPT/AGENT/TOOL/ARTIFACT/EVENT.
Do NOT make telemetry canonical truth. Telemetry can disappear without destroying
truth; canonical history still comes from PING.

Crawl4AI (v0.9.4): strong candidate for difficult acquisition (browser-backed
crawling, extraction, Docker/CLI, MCP surfaces). Lightpanda: interesting cheap JS
execution engine with WSL support, but active Playwright/CDP compatibility and OOM
concerns plus an unauthenticated CDP-endpoint concern. Therefore: create a
replaceable acquisition backend interface, conceptually acquire(request) ->
observations + evidence, with implementations behind it. Do not bind FYD semantics
to one crawler. FYD owns ACQUISITION CONTRACT, EVIDENCE, PROVENANCE,
NORMALIZATION, OBJECT RESOLUTION — not browser implementation, crawler engine,
HTML parsers, or anti-bot machinery.

Automerge: credible future answer for local-first owner editing / collaborative
SiteSpec customization. DO NOT put CRDTs into canonical PING truth now. Harvest
the seam: LOCAL OWNER EDITS -> local collaborative state -> proposed canonical
transition -> PING authorization -> canonical event. NOT the dependency yet.

MCP remains an ADAPTER. PING capabilities remain authority. Future:
MCP TOOL DISCOVERY -> PING CAPABILITY MAPPING -> AUTHORITY EVALUATION ->
EXECUTION -> EVIDENCE. Never: MCP tool exists -> agent may call it.
TOOL POSSESSION != AUTHORIZATION.

Harvest test (the deepest correction): harvest must answer — can this
external/internal implementation REMOVE CODE, REMOVE AMBIGUITY, or GIVE US A
NASTIER TEST for a currently reached PING invariant? If not, catalog it and move
on. "Harvest everything" must not become scope expansion.

## Jev (evidence, not authority)

Use Jev aggressively to reduce human interruption: classification, risk
assessment, conflict detection, recommendation, falsification. But JEV SAYS YES
must never equal AUTHORIZED. This distinction is fundamental.

## The Grill shrinks

For every question Nolan answers, ask: could this have been answered by evidence?
existing policy? safe reversible experiment? Jev classification? independent
falsifier? reconciliation? If yes: encode the reusable decision process. Do not
ask Nolan again. Long-term target: an EMPTY Grill except for genuinely
consequential human decisions.

## Lanes (16 lanes != 16 writers)

ONE WRITER PER SEMANTIC UNIT. Idle capacity -> READERS, FALSIFIERS,
ARCHAEOLOGISTS, TEST AUTHORS, REPLAYERS, SECURITY ATTACKERS, HARVESTERS. If eight
workers produce eight implementations: STOP. Parallelize EVIDENCE. Serialize
AUTHORITY CHANGES.

## Deletion (locked policy, correct)

When reachability inventoried (with Flaw C bounded consumer discovery: static
imports, runtime callers, reflection/dynamic loading, scripts, CI, build/deploy
tooling, docs commands, scheduled jobs, external wrappers, worktree refs, history;
record the search boundary), consumers inventoried, no unique semantics,
replacement proven, tests green, independent falsifier agrees, worktrees
reobserved, no active writer, Git recovery proven: DELETE without interrupting
Nolan. Otherwise "convergence" becomes new winner + six old implementations
forever. UNKNOWN = preserve and investigate.

## NO (implementation waits until the reached loop is proven)

No new social protocol implementation, mass-follow system, marketing campaign
engine, general graph database, new event bus, new authority hierarchy, new agent
runtime, new scheduler, new workflow engine, new canonical store, new TenantOS
platform, data marketplace, token economics, general CRDT integration,
visual-builder rabbit hole. Research/harvest may continue READ-ONLY.

## After the gauntlet: Happy Place, Coppersmith

Once the authority/runtime gauntlet is green, return immediately to Happy Place
and Coppersmith. Prove: same proceduralizer, same object substrate, same SiteSpec
machinery, different evidence, appropriately different experiences. Then Ask FYD,
WHY THIS, owner correction, plain-English customization, regeneration, source
refresh. Do not confuse ORCA completion with customer value.

## Future surfaces are adapters (not built now)

OBJECTS + RELATIONSHIPS + EVIDENCE + CAPABILITIES + CANONICAL TRANSITIONS +
DURABLE EXECUTION done right means future surfaces become adapters: FYD WEBSITE,
FYD SOCIAL, DESKTOP, MOBILE, MCP, ACTIVITYPUB, ATPROTO, NOSTR, FARCASTER,
LOCAL-FIRST EDITOR, BUSINESS AUTOMATION, AGENT SWARMS. We are NOT building those
now. We are making sure adding one later does not require inventing another
identity system, truth store, capability model, or execution engine.

## 24-hour report scorecard (every 24h)

REACHED FYD MISSION: PASS / FIRST BROKEN BOUNDARY
WRONG JOURNAL: PASS/FAIL
SECRET LEAK: PASS/FAIL
TENANT MATRIX: PASS/FAIL
UNKNOWN RENDEZVOUS: PASS/FAIL
DUPLICATE EXTERNAL EFFECT COUNT: EXPECTED 1 / ACTUAL ?
RESTART: PASS/FAIL
REPLAY: PASS/FAIL
CONCURRENT IDEMPOTENCY: PASS/FAIL
MISSION CONTROL UNKNOWN: TRUTHFUL/LYING
BROWSER OWNER JOURNEY: PASS/FAIL
HAPPY PLACE: PASS/FAIL
COPPERSMITH: PASS/FAIL
SEMANTIC UNITS WITH >1 REACHED IMPLEMENTATION: COUNT
DUPLICATES RETIRED: COUNT
NEW AUTHORITIES CREATED: EXPECTED 0
NEW TRUTH STORES: EXPECTED 0
NEW EVENT BUSES: EXPECTED 0
ACCIDENTAL SERVED OUTAGES: COUNT
UNRESOLVED DIRTY WORKTREES: COUNT
GRILL QUESTIONS: COUNT — SHOULD TREND DOWN
FIRST BROKEN BOUNDARY: ...
NEXT SINGLE WRITER: ...

## Measurement

DO NOT MEASURE THIS SPRINT BY ACTIVITY. MEASURE IT BY AMBIGUITY REMOVED.
ONE IDENTITY MODEL. ONE CAPABILITY PATH. ONE EVENT SPINE. ONE EXECUTION
SEMANTIC. ONE UNKNOWN-EFFECT RULE. ONE RECONCILIATION OWNER. ONE REPLAYABLE
HISTORY. ONE TRUTHFUL MISSION CONTROL. ONE FYD OWNER JOURNEY THAT ACTUALLY
USES ALL OF IT.
HARVEST EVERYTHING THAT PREVENTS CODE. FALSIFY EVERYTHING THAT CLAIMS
AUTHORITY. DELETE EVERYTHING PROVEN DEAD. DO NOT REWRITE WHAT ALREADY WORKS.
DO NOT ADD A PLATFORM TO SOLVE A BUG. KEEP OPTIONALITY AT THE EDGES.
KEEP TRUTH SMALL. KEEP GOING.
