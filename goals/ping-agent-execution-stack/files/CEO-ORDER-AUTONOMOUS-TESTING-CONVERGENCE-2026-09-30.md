# CEO ORDER — PING/FYD AUTONOMOUS TESTING CONVERGENCE (2026-09-30 ~18:27 MDT, Nolan, binding, filed verbatim)

## Framing (Nolan)

I searched the recent testing ecosystem and cross-checked the uploaded testing/harvest work. The direction is right, with one correction: do not respond by creating "lots of test repos." Create lots of hostile tests around very few semantic owners. Your own testing analysis already converges on that principle and on an escalation ladder from static/unit through property, metamorphic, replay, mutation, stateful and adversarial certification.

The recent ecosystem reinforces it. fast-check 4.9 has added a shrinkable entityGraph, which is unusually relevant to FYD/PING object/relationship generation; StrykerJS 10 landed in August; Testcontainers Node 12 now requires Node ≥22.22, which matches the reported Node 22.23.2 gate; Schemathesis 4.24.x is actively improving schema-driven generated API testing; Playwright's trace viewer remains a strong failure-debugging artifact.

And Jev should absolutely be intertwined now, but as the judgment/evaluation plane, not as test truth. The prior Jev work already has the right rule: deterministic candidate generation → Jev bounded semantic judgment → executable verifier. It specifically identifies Ask FYD evidence reranking, failure/ledger triage and convergence classification as high-value shadow uses.

---

# THE DIRECTIVE (send to crew)

PING / FYD — AUTONOMOUS TESTING CONVERGENCE
GO.
BUT STAY ON THE CURRENT PRODUCT FRONTIER.
CURRENT VERIFIED FRONTIER:
URL → acquisition → evidence → objects/relationships → SiteSpec → renderer → desktop/mobile browser
IS GREEN.
195/195 was previously green at the renderer boundary.
The current canonical gate reported afterward must remain the sole test truth for its exact SHA/environment.
THE NEXT PRODUCT BOUNDARY IS:
RENDERED EXPERIENCE → ASK FYD → EVIDENCE → WHY THIS → OWNER CORRECTION → REGENERATION.
TESTING EXISTS TO ATTACK THIS PRODUCT PATH.
DO NOT TURN TESTING INTO THE NEW PRODUCT.
EVERY IMPORTANT PING/FYD CLAIM MUST BECOME MECHANICALLY FALSIFIABLE.
Not: "we tested it."
Instead:
WHAT INVARIANT?
WHO OWNS IT?
HOW CAN IT FAIL?
WHAT ATTACK DISPROVES IT?
WHAT EVIDENCE PROVES IT?
CAN IT BE REPLAYED?
DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE?
NO:
TestingAuthority
TestEventStore
TestKnowledgeGraph
second replay runtime
second fixture truth system
giant custom fuzz framework
custom mutation framework
custom browser debugger
dozens of test repositories.
HARVEST.
Use mature tools behind existing semantic owners.
Inventory existing:
property tests
fuzz tests
canonicalization tests
replay tests
concurrency tests
Postgres integration tests
browser tests
security probes
failure injection
fixtures
certification scripts
deployment tests
contract tests
mutation tests
Python Hypothesis
fast-check
Playwright
Testcontainers
OpenTelemetry
trace/correlation tooling
API schemas
OpenAPI
state-machine tests
CRX tests
Ryu tests that are legally usable only as conceptual reference where license requires.
Search history and dormant worktrees too.
DO NOT ADD A PACKAGE UNTIL WE KNOW WE DO NOT ALREADY HAVE THE CAPABILITY.
Evaluate against actual repo compatibility before install.
FAST-CHECK
Primary JS/TS property/metamorphic/state-model candidate.
Recent fast-check includes shrinkable entityGraph support.
VERY INTERESTING FOR FYD.
Use it to generate:
objects
relationships
graphs
SiteSpecs
viewer contexts
evidence sets
owner overrides
transition sequences.
Do not generate meaningless random JSON.
Generate DOMAIN objects.

HYPOTHESIS
Python equivalent where preserved Python execution semantics remain reached.
Same conceptual contracts.
Eventually differential-test overlapping JS/Python behavior.

TESTCONTAINERS
Use real disposable Postgres when persistence semantics matter.
No mock should certify:
transactions
constraints
ON CONFLICT behavior
concurrency
leases
terminal-state races
idempotency
replay persistence.
Current Testcontainers Node 12 requires Node >=22.22.
Our reported Node 22.23.2 environment is compatible in principle.
VERIFY ACTUAL PACKAGE/DOCKER COMPATIBILITY BEFORE ADOPTING.

STRYKERJS
Mutation certification.
Do our tests notice when we deliberately break:
URL sanitizer
claim binding
owner override precedence
authorization
tenant check
signature check
UNKNOWN semantics
approval digest binding
secret redaction
projection ordering?
Do not mutate entire repository initially.
Target constitutional modules.

PLAYWRIGHT
Browser truth.
Keep traces/screenshots/console/network evidence on failure.
Test semantics, not pixel vanity.

SCHEMATHESIS
IF FYD/PING exposes a trustworthy OpenAPI/GraphQL contract:
evaluate Schemathesis for generated API attacks.
Recent releases support schema-derived generated testing and stateful workflows.
Do not adopt if our API schema is stale.
STALE OPENAPI + GENERATED TESTS = AUTOMATED CONFUSION.

OPENTELEMETRY
USE FOR OBSERVABILITY.
NOT TRUTH.
Trace:
request → object read → evidence retrieval → Jev decision if used → model → answer → proposal → authority → transition.
Canonical events/evidence remain authoritative.
Also note current OTel JS is undergoing major-version evolution.
PIN intentionally.
Do not chase latest aliases blindly.
YES.
CALL JEV MORE.
BUT CORRECTLY.
THE RULE REMAINS:
JEV JUDGES.
TESTS FALSIFY.
PING AUTHORIZES.
SOFTWARE EXECUTES.
EVIDENCE VERIFIES.
PING RECORDS.
JEV MUST NEVER TURN:
"I THINK THIS PASSES"
INTO:
PASS.
JEV IS EXCELLENT FOR BOUNDED SEMANTIC TEST WORK.
Use it in SHADOW immediately for:
FAILURE_CLASS: FAILURE_CLASS / REGRESSION / FIXTURE / ENVIRONMENT / NETWORK / AUTH / SECURITY / STALE_TEST / PRODUCT / UNKNOWN.
COUNTEREXAMPLE_CLASS: NEW FAILURE / KNOWN FAILURE / SEMANTIC DUPLICATE / EXPECTED REJECTION / FLAKY / UNKNOWN.
CLAIM_SUPPORT_CLASS: SUPPORTED / PARTIALLY_SUPPORTED / CONTRADICTED / UNSUPPORTED / AMBIGUOUS.
EVIDENCE_RELEVANCE: Given deterministic candidate evidence: which items actually answer Ask FYD?
TEST_GAP_CLASS: Which constitutional invariant lacks an executable falsifier?
MUTANT_SEVERITY: Which surviving mutation threatens: truth / privacy / authority / execution / product correctness / only presentation?
FAILURE_CLUSTER: Group 300 failures into likely common causes.
REGRESSION_PRIORITY: Which minimized failures should block PR vs nightly vs release?
Deterministic checks stay deterministic:
hash equality
signature validity
schema validity
URL safety
permission evaluation
capability enforcement
exact replay equality
database constraint success
test exit code
HTTP status assertion
canonical byte equality
deterministic ID equality.
SOFTWARE KNOWS THESE.
JEV WOULD MAKE THEM WORSE.
THIS IS ALSO OUR NEXT PRODUCT BOUNDARY.
ASK FYD:
"What services does this business offer, and how do you know?"
Build deterministic candidate retrieval first.
OBJECT GRAPH + EVIDENCE INDEX + LEXICAL/STRUCTURAL RETRIEVAL → candidate evidence.
Then run:
CURRENT BASELINE vs CURRENT + JEV RERANKING IN SHADOW.
The answer generator receives the baseline path initially.
Jev does not control production until evaluated.
Measure:
precision@k
recall of known supporting evidence
unsupported evidence admitted
relevant evidence discarded
latency
cost
context tokens saved
answer support rate.
Use BOTH real websites.
NOT 1,000 QUESTIONS.
Start 20-50.
Questions must include:
directly supported
multi-object
relationship dependent
unsupported
contradicted
ambiguous
privacy-hidden
owner-corrected.
Examples:
"What services does this business offer?"
"Where is this business located?"
"Who works here?"
"What external accounts belong to this business?"
"Does this business provide emergency plumbing?"
"What evidence supports that?"
"What do you NOT know?"
"What sources disagree?"
Each expected result specifies:
required evidence
allowed evidence
forbidden claim
expected epistemic status.
For each Jev decision persist only safe evaluation metadata:
decision definition/version
resolved model version
candidate-set digest
state/evidence digest
typed answer
score/probability
threshold
baseline result
eventual label
latency
cost.
NO SECRETS.
NO PRIVATE RAW CONTEXT UNLESS REQUIRED AND AUTHORIZED.
This is where recent fast-check entityGraph work may be especially valuable.
Generate valid small graphs:
Business
Service
Location
Person
ExternalIdentity
Post.
Generate valid relationships:
offers
located_at
works_for
links_to
references.
Then attack:
GRAPH PERMUTATION → SAME SiteSpec semantic digest.
OBJECT INSERTION THAT IS IRRELEVANT → unaffected sections remain stable.
RELEVANT Service INSERTION → appropriate service projection changes.
Person + works_for INSERTION → person-capable composition may appear according to deterministic rules.
REMOVE EVIDENCE → unsupported factual claim disappears or becomes unsupported.
OWNER HIDE → object/fact remains hidden after regeneration.
OWNER CORRECT → source remains evidence but presented value respects owner correction.
These are HIGH VALUE.
SAME SOURCE SEMANTICS
- reordered JSON-LD nodes → SAME object graph.
SAME GRAPH
- reordered persistence reads → SAME SiteSpec.
SAME SiteSpec
- same ViewerContext → SAME semantic render model.
SAME SOURCE
- owner correction
- regeneration → correction survives.
SOURCE CHANGES unrelated field → unrelated owner customization survives.
SOURCE REMOVES supported fact → fact does not silently remain as direct source truth.
PRIVATE visibility → public ViewerContext never receives value.
URL changes to javascript: → non-executable representation.
Create a small model.
States:
OBSERVED
GENERATED
CORRECTED
HIDDEN
CUSTOMIZED
SOURCE_CHANGED
REGEN_PROPOSED
REGEN_APPLIED.
Generate command sequences:
observe
generate
correct
hide
customize
reobserve
approve
reject
restart
rebuild.
Invariants:
OWNER CORRECTION IS NOT LOST.
HIDE IS NOT LOST.
REJECTED PROPOSAL DOES NOT APPLY.
APPROVED PATCH BINDS EXACT PROPOSAL.
REPLAY RECONSTRUCTS SAME EFFECTIVE PRESENTATION.
PRIVATE DATA NEVER BECOMES PUBLIC THROUGH REGENERATION.
Critical epistemic invariant:
NO SUPPORTING EVIDENCE → NO ASSERTED FACT.
Generate evidence sets.
Remove all evidence supporting proposition P.
Ask FYD must not continue asserting P as known.
Add contradictory evidence.
Result must become:
CONFLICT / UNCERTAIN
not fabricated consensus.
Add owner correction.
Answer must distinguish:
SOURCE SAYS X
OWNER SAYS Y
according to actual product semantics.
Kill these mutants:
remove URL sanitizer
remove min-w-0
bypass binding verifier
ignore owner visibility override
change private → public
drop evidence requirement
skip proposal digest comparison
accept invalid signature
remove tenant comparison
change UNKNOWN → FAILED
disable suppression check
let notes override canonical communication state.
If our tests survive any high-consequence mutant:
THE TEST SUITE IS LYING TO US.
Use disposable real Postgres.
Generate concurrent:
same semantic event appends
same relationship creation
approval races
retry after response loss
worker claims
lease expiry
projection rebuild.
Assert:
no duplicate canonical semantic effect
no stale worker wins
terminal remains terminal
idempotent retries
replay converges.
If current gateway OpenAPI is trustworthy:
use schema-generated hostile requests.
Attack:
missing fields
extra fields
wrong types
huge strings
malformed Unicode
invalid IDs
invalid signatures
cross-tenant references
unknown predicates
bad URL schemes
unexpected ordering
repeat requests.
If Schemathesis materially reduces handwritten tests:
ADOPT.
Otherwise:
REJECT.
WE DO NOT NEED ANOTHER DEBUGGER.
We need a PING CAUSAL DEBUG VIEW over existing IDs.
Input:
object/event/request/run ID.
Resolve:
SOURCE → OBSERVATION → EVIDENCE → OBJECT → RELATIONSHIP → SITE SPEC → RENDER → ASK CONTEXT → JEV DECISION → MODEL RESULT → PROPOSAL → AUTHORIZATION → EVENT → PROJECTION.
This can be CLI/text first.
No dashboard required.
Attach:
SHA
runtime version
decision version
model version
source digest
evidence digest
projection digest
trace ID.
This will save more debugging time than another visual testing product.
For every FYD browser failure retain:
trace.zip
screenshot
console errors
failed requests
viewport
route
SHA
SiteSpec digest
object-graph digest
ViewerContext class.
Do NOT persist secrets.
This gives us reproducible browser evidence.
NOW MAKE TESTING AUTONOMOUS.
CHANGE ↓ FAST STATIC/UNIT ↓ CONSTITUTIONAL PBT ↓ METAMORPHIC ↓ INTEGRATION ↓ BROWSER ↓ FAIL? ↓ MINIMIZE ↓ JEV CLASSIFY ↓ DETERMINISTIC REPRODUCER ↓ OWNER WORKER FIX ↓ RE-RUN ↓ REGRESSION FIXTURE ↓ LEDGER ↓ CONTINUE.
Nightly:
DEEP PBT
STATE MODEL
POSTGRES CONCURRENCY
MUTATION SAMPLE
REPLAY/REBUILD
API GENERATION.
Weekly/release:
FULL MUTATION
DESTRUCTIVE RECOVERY
CLEAN CHECKOUT
BUILD
DEPLOY
BLACK-BOX
REPLAY
CERTIFY.
JEV MAY ROUTE A FAILURE.
JEV MAY NOT MARK IT FIXED.
HERMES MAY IMPLEMENT A FIX.
HERMES MAY NOT MARK IT PROVEN.
THE EXECUTABLE TEST DOES THAT.
This is how autonomy stays trustworthy.
Every minimized generative failure becomes:
REGRESSION ID
invariant
seed/path
minimal counterexample
first failing SHA
fixed SHA
test owner
expected behavior.
Next run starts smarter.
KNOWLEDGE MUST COMPOUND.
DO NOT CREATE LOTS OF TEST REPOS.
CREATE LOTS OF TEST CASES.
Prefer:
PING repo → PING semantic tests.
FYD repo/worktree → FYD compiler/product tests.
Only create ONE external certification harness if destructive black-box isolation truly cannot live safely beside product code.
A separate repo is an AUTHORITY COST.
PROVE THE NEED.
READ ONLY.
Search recent GitHub/projects for:
property testing
model-based testing
mutation testing
API fuzzing
differential testing
deterministic simulation
distributed systems testing
browser tracing
fault injection
database concurrency testing
snapshot/replay testing
LLM evals
RAG evals
calibration
semantic judges.
For each:
PROBLEM
TECHNIQUE
MATURE LIBRARY
TEST SHAPE
PING/FYD INVARIANT
HARVEST VALUE
LICENSE
DEPENDENCY COST
ADOPT/ADAPT/REFERENCE/REJECT.
DO NOT INSTALL FROM THE HARVEST LANE.
Keep the living negative-capability ledger from the broader harvest.
The uploaded forensics already indicate that PING has substantial canonical event/mission/knowledge machinery and that many apparent MarketingOS gaps are bounded vocabulary/wiring/behavior gaps rather than new foundational authorities.
ENFORCE THAT DISCIPLINE HERE TOO.
Before any testing subsystem:
WHY CAN EXISTING RUNNER + LIBRARY + EXISTING PING AUTHORITY NOT EXPRESS THIS?
Possible disposition:
WILL NOT BUILD
HARVEST/WIRE
BUILD CANDIDATE.
BUILD CANDIDATE IS NOT BUILD AUTHORIZATION.
DO NOT WAIT FOR THE ENTIRE TEST PROGRAM.
Immediately open:
ASK FYD → EVIDENCE.
Implement the smallest real path for BOTH current websites.
Then hostile-test it.
Required first acceptance:
QUESTION:
"What services does this business offer, and how do you know?"
For each answer claim:
CLAIM → SUPPORTING EVIDENCE → SOURCE → OBSERVED AT → DIRECT / DERIVED / INFERRED.
Unsupported:
"I don't have evidence for that."
Not filler.
Not plausible copy.
Not model memory.
WHY THIS
then:
CONFIRM / CORRECT / HIDE
then:
REGENERATION
then:
plain-English SiteSpec patch
then:
second observation
then:
correction/customization survival.
MOVE ONE VERIFIED BOUNDARY AT A TIME.
CURRENT CANONICAL TEST:
...
FAST-CHECK:
EXISTING / ADOPTED / REJECTED
TESTCONTAINERS:
...
STRYKER:
...
SCHEMATHESIS:
...
PLAYWRIGHT TRACE BUNDLE:
...
JEV SHADOW DECISIONS:
...
ASK FYD GOLD SET:
questions / labels
ASK FYD BASELINE:
...
ASK FYD + JEV:
...
UNSUPPORTED CLAIM TEST:
PASS/FAIL
OWNER CORRECTION STATE MODEL:
PASS/FAIL
GRAPH PROPERTY TESTS:
...
REPLAY/REGEN METAMORPHIC:
...
MUTATION SURVIVORS:
...
FIRST BROKEN PRODUCT BOUNDARY:
...
FIRST BROKEN CONSTITUTIONAL INVARIANT:
...
HIGHEST-LEVERAGE FIX:
...
NEXT:
...
SOFTWARE HANDLES CERTAINTY.
JEV HANDLES BOUNDED JUDGMENT.
FRONTIER MODELS HANDLE OPEN REASONING.
HUMANS CONTROL CONSEQUENCE.
PING OWNS AUTHORITY AND HISTORY.
TESTS FALSIFY OUR CLAIMS.
OUTCOMES TEACH THE SYSTEM.
THAT IS HOW PING BECOMES AUTONOMOUS WITHOUT BECOMING UNACCOUNTABLE.
GO.

---

## Ecosystem calls (Nolan)

A few ecosystem calls I would make now. fast-check is particularly interesting because 4.9's entityGraph work maps directly onto FYD's graph semantics, rather than just generating primitive garbage. Testcontainers 12 fits your current reported Node runtime, so real-Postgres concurrency certification is now a low-friction harvest candidate rather than something worth hand-building. Schemathesis deserves a trial only if the gateway contract is accurate; it can generate invalid/edge requests and stateful API workflows, but a stale OpenAPI spec would merely automate testing the wrong contract. Stryker is now at a major-version boundary, its changelog shows 10.0.0 in August, so pin and trial it on a small constitutional target rather than dropping full-repo mutation into CI immediately. And OpenTelemetry is also at a transition point: the maintainers planned SDK 3.0 for September 30, so don't casually wire an unpinned major into the runtime today. Use OTel for causal observability only after compatibility review; PING events remain truth. Most importantly, this stays consistent with the forensic conclusion you already reached: the project needs aggressive falsification and harvesting, not another foundational platform. The MarketingOS analysis likewise found that much of the apparent new functionality can sit over existing event, mission, worker and knowledge primitives rather than spawning parallel authorities.

The autonomous loop I want is therefore not "agent writes more code." It is agent proposes → executable falsifier attacks → failure shrinks → Jev cheaply classifies/routes → worker fixes → executable proof closes → minimized counterexample becomes permanent institutional memory. That is a materially stronger foundation for autonomous engineering.

---

## Filing note (Pigi)

Filed from the "Fix FYD oval rotation and shapes" side chat on 2026-09-30 ~18:27 MDT. This order corrects the earlier testing-ladder dispatch: not lots of test repos, but lots of hostile tests around very few semantic owners. The active testing coordinator has been steered with the delta (version pins, JEV judgment-plane taxonomies, Ask FYD gold set as the immediate product-boundary work, falsifiability questionnaire, causal debug view, autonomous loop discipline, report format). No push authorized; local commits only.
