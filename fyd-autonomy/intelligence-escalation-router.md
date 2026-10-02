# PING/FYD — Intelligence Escalation Router

Owner directive recorded 2026-09-27 (Nolan, verbatim). Standing policy.

PING / FYD — INTELLIGENCE IS A SCARCE RESOURCE

DO NOT MAKE OPENROUTER A DEPENDENCY.

DO NOT BUILD PRODUCT CORRECTNESS AROUND ANY ONE MODEL.

DO NOT SPEND THE $25 BECAUSE IT EXISTS.

USE IT TO BUY COGNITION WE CANNOT GET CHEAPER.

TIER 0 — DETERMINISTIC SOFTWARE

ALWAYS FIRST.

Use code for:

tests
builds
grep/search
AST inspection
schema validation
hashing
canonicalization
exact matching
diffing
fixtures
rendering
projection
replay
security checks
URL validation
data extraction
dedupe
rate limits.

LLM COST:

ZERO.

============================================================
TIER 1 — EXISTING COPILOT / HEADLESS AGENTS

USE THE ALREADY-ALLOCATED HEADLESS CAPACITY AGGRESSIVELY.

They do:

repo archaeology
code search
test writing
implementation
refactors
fixture generation
documentation
mechanical migrations
browser verification
debugging
reproduction
dependency inspection.

THEY ARE THE LABOR FORCE.

Do not send routine implementation to premium OpenRouter models.

============================================================
TIER 2 — FREE / NEAR-FREE MODEL

When an LLM is actually useful but the problem is not strategic:

FIRST CANDIDATE:

DeepSeek V4 Flash 0731 FREE

Current OpenRouter listing:
1M context
coding/reasoning/agent oriented
tools
structured output
FREE endpoint
rate limited.

Use for:

code review
failure classification
summaries
repo synthesis
candidate fixes
test generation
routine planning.

Fallback cheap candidates:

GLM-5.3 Flash

and

MiMo-V2.6-Flash.

Do not constitutionalize exact model names.

They are routing configuration.

THIS IS MY CURRENT DEFAULT PAID ESCALATION.

Use:

xiaomi/mimo-v2.6-pro

ONLY when cheaper/headless attempts fail or the task has enough leverage
to justify stronger cognition.

Best targets:

architecture synthesis
cross-repo reasoning
complex debugging
multi-file planning
hard code review
product/technical reconciliation
agent-plan criticism
large-context synthesis.

Current catalog characteristics:

~1M context
multimodal
tool calling
structured outputs
strong agentic positioning
cheap enough for serious use.

THIS IS WHERE MOST OF THE $25 SHOULD GO IF WE NEED IT.

Use for particularly difficult:

software architecture
long-horizon reasoning
hard debugging
adversarial review
complex planning.

NOT IMPLEMENTATION LABOR.

GLM-5.3 is explicitly positioned for complex software engineering and
long-horizon agents.

Reasoning stays on.

Use it as:

REVIEWER
ARCHITECT
CRITIC
DEBUGGER.

Not:

"write this CSS class."

Kimi K3 may be excellent.

But:

it is considerably more expensive
there is no free OpenRouter variant
its published weights use a custom non-OSI-approved license.

Therefore it does NOT currently beat MiMo/GLM for our bounded FYD
OpenRouter budget.

Keep it available for benchmark/research.

Not default.

DO NOT WRITE:

if task == hard:
model = mimo

Instead classify:

TASK TYPE
RISK
CONTEXT SIZE
REASONING NEED
TOOL NEED
MULTIMODAL NEED
EXPECTED VALUE
PRIOR FAILURES.

Then choose tier.

Every paid invocation must carry:

TASK_ID

WHY_AI_IS_NEEDED

WHY_HEADLESS_WAS_INSUFFICIENT

CHEAPER_ATTEMPTS

EXPECTED_OUTPUT

MAX_INPUT

MAX_OUTPUT

MAX_COST

MODEL_TIER

RESULT

VERIFICATION.

If those fields cannot be populated:

DO NOT ESCALATE.

Example:

Copilot/headless implements
↓
tests fail
↓
headless debugs
↓
still ambiguous
↓
free model reviews evidence
↓
still unresolved
↓
MiMo Pro receives:
code
failing tests
minimized reproduction
attempted fixes
↓
returns diagnosis/plan
↓
HEADLESS AGENT IMPLEMENTS IT.

THIS IS CRITICAL.

PREMIUM MODEL THINKS.

CHEAP AGENT TYPES.

Premium output should preferentially be:

DIAGNOSIS
PLAN
INVARIANTS
PATCH SPEC
TEST SPEC
RISKS.

Then cheaper implementation agents execute.

After implementation:

deterministic tests decide truth.

THE MODEL DOES NOT DECLARE ITS OWN WORK CORRECT.

For a hard question:

Agent A:
repo archaeology.

Agent B:
tests/reproduction.

Agent C:
existing-pattern search.

Agent D:
minimal-fix proposal.

Then synthesize their compact evidence.

Only THEN escalate the difficult unresolved question.

Do not send 800,000 tokens of repository sludge to a premium model when
four cheap workers can reduce it to 20,000 useful tokens.

Premium models receive:

problem
invariants
relevant code
test evidence
candidate hypotheses
failed attempts.

NOT:

THE ENTIRE REPOSITORY BECAUSE CONTEXT WINDOW IS LARGE.

1M context is capacity.

NOT permission to be sloppy.

Treat the existing OpenRouter balance as:

RESEARCH / COGNITION RESERVE.

Suggested logical allocation:

~60% MiMo V2.6 Pro

~25% GLM-5.3 full

~15% experimental comparison / emergency escalation.

BUT DO NOT FORCE-SPEND THESE PERCENTAGES.

If FYD closes the product loop after spending $3:

GOOD.

Do not burn $22 to satisfy accounting.

BEFORE ROUTING REAL IMPORTANT WORK:

take 3 REAL FYD problems we already solved.

Prefer:

@graph failure diagnosis
javascript: render-sink security failure
mobile overflow root-cause.

Strip the known solution.

Give identical evidence to candidate models.

Score:

correct diagnosis
minimality
invented facts
architecture churn
test quality
security awareness
token usage
latency
cost.

Candidates:

HEADLESS/COPILOT BASELINE
DEEPSEEK V4 FLASH FREE
GLM-5.3 FLASH
MIMO V2.6 FLASH
MIMO V2.6 PRO
GLM-5.3 FULL.

DO NOT ASK:

"which model is smartest?"

ASK:

WHICH MODEL PRODUCES THE MOST VERIFIED FYD PROGRESS PER DOLLAR?

Record results.

Then FYD/PING can learn:

CSS/debugging
→ headless wins

repo archaeology
→ headless wins

security diagnosis
→ MiMo wins

architecture adversarial review
→ GLM wins

etc.

The routing policy should eventually be based on OUR evidence.

Not benchmark fandom.

KEEP JEV SEPARATE.

Jev is a decision/routing primitive.

Do not turn it into a general-purpose coding model merely because we
have a key.

Potential future role:

TASK
→ Jev classification/routing decision
→ deterministic policy
→ headless/free/premium execution tier.

That is cleaner than asking an expensive generative model which expensive
generative model to call.

Architecturally:

PING IntelligenceRequest
↓
INTELLIGENCE ROUTER
↓
┌─────────────────────────────┐
│ deterministic │
│ Copilot/headless │
│ TypeSafe/Jev │
│ OpenRouter │
│ local models │
│ future providers │
└─────────────────────────────┘
↓
typed result
↓
verification
↓
evidence.

OpenRouter is NOT the intelligence authority.

A MODEL IS NOT AN AUTHORITY.

DO NOT TURN THIS INTO AN AI ROUTER PROJECT.

Spend MAXIMUM a small bounded patch establishing:

routing policy
cost ledger
model config
escalation contract.

Then RETURN TO:

URL
→ OBJECT GRAPH
→ SITE
→ ASK FYD
→ EVIDENCE
→ CORRECTION
→ CUSTOMIZATION
→ REGENERATION.

The router exists to accelerate THAT.

Ask FYD is already 5/5 PASS according to current evidence.

207/207 tests.

Claim/evidence binding works.

Owner corrections survive regeneration.

Natural-language site change reaches digest-pinned approval and
deterministic patch.

GOOD.

Do not rewrite it.

The next product work must be whatever the current product grill identifies
as the first user-visible failure.

SEPARATE OPERATIONAL CALL:

KEEP THE PIG AS A PERSONAL MACHINE.

DO NOT globally disable sleep merely for automation.

Every authorized long-running Pig job gets a JOB-SCOPED WAKE LEASE.

Acquire before execution.

Release in finally/cleanup.

Crash-safe expiry/watchdog.

Record:

job
lease start
lease end
reason.

If a critical always-on workload emerges later:

MOVE IT TO AN ALWAYS-ON NODE.

Do not accidentally turn a personal workstation into infrastructure.

FREE COMPUTE DOES LABOR.

DETERMINISTIC SOFTWARE DOES CERTAINTY.

PREMIUM MODELS DO COGNITION.

HUMANS OWN CONSEQUENTIAL DECISIONS.

PING OWNS AUTHORITY.

MODELS OWN NOTHING.

USE THE $25 LIKE A SCALPEL.

NOT A BONFIRE.

GO.

---

Owner's covering note (2026-09-27): the $25 is a bounded high-intelligence
reserve; the system must earn every escalation. Current standouts: MiMo-V2.6-Pro
(six days old, 1M context, multimodal/tool/structured-output, $0.435/$0.87 per
million). GLM-5.3 Flash ($0.075/$0.25 listed, ~1.3M context, tool/structured-output).
DeepSeek V4 Flash 0731 free (genuinely free on the listed endpoint, 1M context,
coding/reasoning/agent oriented, rate-limited). MiMo-V2.6-Flash ($0.14/$0.28).
Full GLM-5.3 is the stronger reasoning escalation tier. Kimi K3 is substantially
more expensive with a custom non-OSI-approved weights license: not the default.
Architecture to preserve: deterministic → allocated headless → free model →
cheap strong model → premium cognition → deterministic verification. This
survives whatever model wins next month. Immediate order: use up all Copilot
and headless (Goose, Hermes) capacity on real work.
