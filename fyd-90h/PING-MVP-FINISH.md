# PING — STOP SPINNING, FINISH THE MVP
**From Nolan, 2026-09-29 ~09:05 MDT. Binding. Verbatim. This is now the primary directive.**

## PRIMARY DIRECTIVE

PING IS THE PRODUCT.
PING IS THE FIRST TENANT.
MISSION CONTROL IS THE OPERATING BACKEND FOR PING.
We are not starting another architecture exercise.
We are not opening another broad discovery phase.
We are not creating another pile of branches that demonstrate individual ideas.
FINISH ONE INTEGRATED MVP.
Keep useful existing work moving, but from this point forward judge everything by whether it closes the PING MVP.

## THERE IS ALREADY DAYS OF BACKLOG

We have already identified substantial unfinished work across:
MISSION CONTROL, TENANTOS, ORCA, JEV, GITHUB INGESTION, BUSINESS INTELLIGENCE / KNOWLEDGE PIPELINES, CONTEXTPACK / SEARCH, WORKERS, RECONCILIATION / HOLD / RECOVERY, DECISION RECORDS, SOURCE→BUILD→SERVED PROVENANCE, PROJECTION / INVALIDATION, IDENTITY / AUTHORITY, SELF-IMPROVEMENT / OUTCOME LEARNING.
Stop treating these as interesting parallel programs. They are unfinished pieces of one PING backend.
The earlier forest work already found 63 implementations across 12 focus areas, with only a very small number believed genuinely absent. That means our default hypothesis should remain:
THE NEXT WEEK IS MOSTLY CONVERGENCE + WIRING + FALSIFICATION, NOT INVENTION.
Search before writing. Reuse before rebuilding. Finish before expanding.

## THE MVP

One coherent system:
PING TENANT → GITHUB / WEB / INTERNAL SOURCES → OBSERVATIONS → EVIDENCE → BUSINESS/PRODUCT KNOWLEDGE → CONTEXTPACK → MISSION → DECISION → AUTHORITY → ELIGIBLE WORKER → WORKORDER → ATTEMPT → RESULT → INDEPENDENT VERIFICATION → OUTCOME → LEARNING → NEXT WORK
with MISSION CONTROL able to truthfully show the important state of that chain. That is the MVP.
The PING website is the first real workload proving it. HPP and Coppersmith remain useful regression fixtures, but do not let them pull the architecture away from PING. No fourth business.

### 1 — FINISH TENANTOS FOR ONE REAL TENANT
Do not build TenantOS-the-framework. Make PING a correctly enforced tenant end to end. Prove: CALLER → AUTHENTICATED IDENTITY → TENANT ENTITLEMENT → TENANT CONTEXT → MISSION → CONTEXTPACK → WORKORDER → WORKER → ARTIFACT → EVENT → SEARCH → MISSION CONTROL PROJECTION.
No request-body tenant becoming authority. No namespace laundering. No unknown tenant becoming core::system. No cross-tenant retrieval. No worker capability crossing tenants accidentally. No projection crossing tenants.
Use hostile Tenant A/Tenant B tests even though PING is the MVP tenant. We need the boundary correct before expansion. Do not invent TenantOS V2. Converge the existing tenant-kit, claims, fencing, context and entitlement work.

### 2 — FINISH MISSION CONTROL
Mission Control is not another dashboard project. It is the truthful operating surface for this MVP. It must answer: WHAT IS PING TRYING TO DO? WHAT DOES PING CURRENTLY KNOW? WHAT DOES IT NOT KNOW? WHAT DECISION WAS MADE? WHAT EVIDENCE INFORMED IT? WHY WAS THIS WORKER ELIGIBLE/CHOSEN? WHAT AUTHORITY DID IT RECEIVE? WHAT IS RUNNING? WHAT MAY HAVE HAPPENED? WHAT WAS VERIFIED? WHAT FAILED? WHAT REQUIRES ME? WHAT HAPPENS NEXT?
No fake RUNNING state. No reconciliation language without reconciliation. No inferred success. No chain-of-thought UI. Project existing typed state.
The previously identified high-leverage seam remains important: typed decision records need to become first-class journaled/projected events rather than remaining invisible decisions inside gates. Finish that through the existing journal/projection machinery rather than creating another decision database.

### 3 — FINISH ORCA'S REACHED LOOP
Stop discussing the dormant idealized ORCA engine. Work the reached path. We already found the important chain: MISSION → QUESTIONS → DECISION UNITS → EVIDENCE → PROCESSOR → AUTHORITY → CAPABILITY → WORKER → ATTEMPT → ARTIFACT → VERIFICATION → OUTCOME. Reproduce the exact first broken reached edge. The earlier evidence pointed at: EVIDENCE → PROCESSOR / CONTEXTPACK ASSEMBLY where the worker received a lossy representation and truthfully reported an incomplete chain. Fix the earliest reached defect. Then advance to the next. Do not rewrite ORCA around an imagined future architecture.

### 4 — FINISH JEV
Jev has been researched enough. Stop keeping it permanently "almost ready." But do not irresponsibly wire it everywhere either. First stabilize the exact seams its experiment depends on. Then run the already-prepared tournament. Preserve: E1 frozen corpus, verified answer key, 19/25 deterministic baseline = 0.760, pinned courier, fail-closed behavior, API smoke baseline, frozen measurement definition. Then run E1 + E2 in the same measurement wave once their retrieval/verification contracts are frozen. Jev must compete against deterministic software. If it wins materially on a bounded fuzzy judgment, wire that exact contract. If it doesn't, deterministic software wins.
Jev may: rank, judge, score, filter, propose. Jev may never: authorize, grant capability, choose tenant authority, mint identity, declare an external effect absent, bypass HOLD, publish canonical truth.
We want Jev finished and measured, not worshipped and not permanently parked.

### 5 — FINISH GITHUB INGESTION
GitHub needs to become a real observation source for the PING tenant. Do not build a giant GitHub platform. Finish: AUTHORIZED PING REPOSITORY → DELIVERY/POLL OBSERVATION → REPOSITORY IDENTITY → COMMIT/REF IDENTITY → CHANGE → IMMUTABLE OBSERVATION → EVIDENCE → KNOWLEDGE UPDATE → SEARCH/CONTEXTPACK → MISSION CANDIDATE.
We already have substantial scanner/classifier/diff machinery. USE IT. What was genuinely missing was the live ingress and normalization path. Before that path can become authoritative enough for the tenant, resolve the repo→tenant binding. GitHub data is observation. PR titles are not truth. Commit messages are not truth. Workflow success is evidence, not universal proof. A discovered change must not automatically authorize mutation.

### 6 — FINISH THE BUSINESS-INTELLIGENCE PIPELINE
PING needs to understand PING. Treat its own: repositories, website, documentation, architecture, tests, runtime state, missions, decisions, failures, product evidence, owner corrections, outcomes as the first real intelligence corpus. Build one coherent flow: SOURCE → OBSERVATION → CLAIM → EVIDENCE → VERIFIED/PROMOTED KNOWLEDGE → RETRIEVAL → CONTEXTPACK. Do not create another knowledge store. Use the existing canonical stores and rebuildable projections. Fix silent retrieval degradation. If Qdrant is unavailable, say: VECTOR RETRIEVAL DEGRADED rather than returning [] indistinguishably from "nothing exists." Quarantine/remove pseudo-vector similarity from consequential retrieval. A deterministic pseudo-random vector is not semantic search. Exact/lexical/structured/relationship/Git-history retrieval can carry the MVP while real vector retrieval is unavailable.

### 7 — FINISH THE WORKER CONTRACT
We do not need 50 named workers. We need the workers we have to be trustworthy and interchangeable. Converge around the strongest existing: WorkOrder and ResultEnvelope. Then enforce: objective binding, tenant binding, capability binding, attempt identity, artifact binding, possible-effect reporting, test evidence, independent verification. A structurally valid ResultEnvelope that lies about success must not become VERIFIED. Run the adversarial case where: worker says SUCCESS while tests fail. That should close the known structural-verification weakness. Worker selection comes afterward: DETERMINISTIC ELIGIBILITY FIRST, then optional bounded Jev ranking among eligible workers.

### 8 — FINISH HOLD / UNKNOWN / RECOVERY
This cannot remain a design artifact. Make the existing implementations converge into reached behavior. Law: UNKNOWN EFFECT → HOLD → RECONCILE → NEVER BLIND REDISPATCH. Prove: worker killed after output; ORCA killed after dispatch; receipt lost after external effect; lease expires while work continues; duplicate dispatch; restart; network loss. A lease expiring does not prove an effect did not happen. Recovery creates a new attempt with lineage. Zombie writes fail. Effect proven → reconcile success without repeating it. Effect proven absent → eligible for controlled redispatch. Effect unknown → HOLD. FINISH THIS.

### 9 — FINISH THE LEARNING LOOP
We already record pieces of this everywhere. Connect them. DECISION → EVIDENCE → PROCESSOR → ACTION → WORKER → EXPECTED OUTCOME → ACTUAL OUTCOME → VERIFICATION → OWNER CORRECTION. Then derive: CANDIDATE LESSONS. Candidate lesson is not policy. Promotion requires replay, falsification and measured improvement. The objective is: LESS INTELLIGENCE PER CORRECT OUTCOME. Stable learned behavior should eventually move downward: DEEP REASONING → JEV JUDGMENT → MEASURED PATTERN → DETERMINISTIC CANDIDATE → REPLAY → SOFTWARE. Do not build a self-modifying autonomous system. Build a measured improvement loop.

## SUBAGENTS — YES, BUT CONCENTRATED

Keep subagents working. DO NOT SPREAD THEM ACROSS 16 UNRELATED FRONTS. Use approximately: 3–4 active writers maximum with several readers/falsifiers supporting them. One writer per semantic unit.
Suggested concentrated fronts: WRITER A — TENANT + IDENTITY ENFORCEMENT; WRITER B — ORCA EVIDENCE / CONTEXTPACK + VERIFICATION; WRITER C — MISSION CONTROL DECISION/OUTCOME PROJECTION; WRITER D — HOLD/RECONCILIATION, when collision-free.
Readers/falsifiers simultaneously prepare: GitHub ingress, Jev tournament, worker-envelope adversarial tests, business-intelligence retrieval, learning loop. As soon as a writer closes a unit, promote the next prepared unit. KEEP THE QUEUE FULL WITHOUT INCREASING WRITER COLLISIONS.

## STOP REPORTING ACTIVITY AS PROGRESS

I don't need: "six lanes dispatched." "all agents reported." "the plan was banked." "the directive was recorded." Those are operating details. Report integration progress. Every report should say:
MVP ARROWS GREEN / MVP ARROWS RED / CODE ACTUALLY IN THE INTEGRATION LINE / CODE STILL STRANDED IN WORKTREES / RUNTIME-REACHED CODE / TESTED-BUT-UNWIRED CODE / FIRST BROKEN REACHED EDGE / WHAT WAS DELETED/CONVERGED / WHAT USER-VISIBLE OR OPERATOR-VISIBLE CAPABILITY EXISTS NOW THAT DID NOT EXIST FOUR HOURS AGO / NEXT FOUR WRITERS.
If nothing became integrated/reached, say: NO SUBSTANTIATED INTEGRATION PROGRESS THIS PERIOD. Do not convert agent activity into implied accomplishment.

## PING WEBSITE IS THE MVP WORKLOAD

Now use all this machinery to make the PING website exceptional. PING's own backend should understand: what PING is, what it does, current capabilities, architecture, evidence, repositories, changes, decisions, product state, limitations, and owner intent. Then the PING website should be a projection of that understanding. That gives us one ruthless feedback loop: IF THE BACKEND DOES NOT UNDERSTAND PING, THE WEBSITE EXPOSES IT. IF THE WEBSITE IS WRONG, TRACE BACKWARD TO THE EARLIEST BAD SEMANTIC LAYER. Fix that layer. Regenerate. Repeat. HPP and Coppersmith remain regression/adversarial fixtures. PING IS THE MVP.

## NO MORE "DONE" WITHOUT REACHABILITY

A branch is not done. A test is not done. A worktree is not done. A design is not done. A subagent report is not done. A green isolated suite is not done. For this sprint: DONE = CONVERGED + INTEGRATED + REACHED + VERIFIED + OBSERVABLE. Preferably: RESTART-PROVEN.
Existing evidence already demonstrated why this distinction matters: earlier reconnaissance found substantial completed work living only on non-HEAD branches while the active tree had large dirty semantic clusters.

## IMMEDIATE COMMAND

DO NOT STOP CURRENT USEFUL WORK. Reclassify it against this MVP. Anything that closes a PING MVP arrow continues. Anything useful but noncritical becomes prepared/queued. Anything duplicative converges. Anything speculative stays out of the writer pool. Within the next reporting interval I want the first integration ledger, not another planning document. Start with the existing implementations. Harvest the strongest semantics. Wire them. Falsify them. Put them on the reached path. Show them in Mission Control. Use them to improve PING. Then take the next broken edge.
ONE TENANT. ONE MVP. ONE REACHED BACKEND. PING. FINISH IT.

## REPORTING CADENCE (Nolan)

The coordinator accounts for stranded value every four hours. If 20 agents produce 20 green branches and zero additional code becomes reached by the PING tenant, the correct progress report is zero integration progress, not "20 lanes green." That pressure should turn the backlog into one system instead of another week of increasingly sophisticated archaeology.
