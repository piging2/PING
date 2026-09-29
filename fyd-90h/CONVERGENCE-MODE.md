# PING / FYD — CONVERGENCE MODE
**From Nolan, 2026-09-29 ~09:29 MDT. Binding. Verbatim. This is the operating directive for the convergence loop. It does not authorize "work forever": it authorizes a persistent bounded convergence loop with explicit stop conditions, checkpoints, and recoverability.**

THE PIVOT IS CORRECT.
NOW STOP OPTIMIZING AGENT ACTIVITY.
OPTIMIZE:
VERIFIED MVP ARROWS
PER UNIT TIME
PER UNIT COMPUTE.
Everything maps to:
TENANT / OWNER
→ AUTHORITY
→ SOURCE
→ OBSERVATION
→ EVIDENCE
→ OBJECT
→ RELATIONSHIP
→ KNOWLEDGE
→ CONTEXTPACK
→ WORK ORDER
→ WORKER
→ RESULT ENVELOPE
→ INDEPENDENT VERIFICATION
→ AUTHORIZED TRANSITION
→ EVENT
→ PROJECTION
→ FYD EXPERIENCE
→ OUTCOME.
If work cannot identify which arrow it closes:
DEFER IT.
PING'S VALUE IS NOT:
MORE INFRASTRUCTURE.
PING'S VALUE IS:
A HUMAN OR AGENT CAN ACT ON AN EVIDENCE-BACKED WORLD MODEL
WHILE THE SYSTEM CAN PROVE:
WHO ACTED
WHAT THEY WERE ALLOWED TO DO
WHAT THEY INTENDED
WHAT ACTUALLY HAPPENED
WHAT EVIDENCE SUPPORTS IT
WHAT CHANGED
WHAT REMAINS UNKNOWN.
FYD is the customer-facing proof of that substrate.

LAW 1:
EVENT INTEGRITY ≠ WORLD TRUTH.
A signed event proves:
someone signed these bytes.
It does NOT prove:
the claimed external effect occurred.
Therefore external effects require independent evidence/verification.

LAW 2:
AUTHORITY ⟂ VERIFICATION.
The component allowed to perform an action must not automatically be the
component that certifies the action succeeded.
Preserve this separation everywhere.

For every live PING/FYD surface we must mechanically answer:
SOURCE SHA?
BUILD ID/DIGEST?
IMAGE/ARTIFACT DIGEST?
RUNNING INSTANCE?
SERVED VERSION?
No more:
"this commit should be running."
Make provenance inspectable.
SOURCE
→ BUILD
→ ARTIFACT
→ DEPLOYMENT
→ SERVED RESPONSE.

USE THE CHEAPEST CAPABLE WORKER.
Do not send everything to the strongest model.
TIER 0 — SOFTWARE
grep, ripgrep, AST/search, tests, hashes, diff, schema validation, dependency inspection, Git history, builds, typecheck, lint, replay, database queries, deterministic comparison.
NO MODEL.
TIER 1 — FREE / INCLUDED CODING INTELLIGENCE
Use installed GitHub Copilot CLI headlessly where the account permits.
Use OpenCode free models.
Use OpenRouter free models as available.
Tasks: repo archaeology, classification, test triage, small bounded patches, documentation comparison, dependency inventory, dead-code identification, candidate ranking.
TIER 2 — STRONGER MODEL
Use when Tier 1 cannot resolve: cross-system architectural contradiction, complex refactor, ambiguous failure, security boundary, authority convergence, hard debugging.
TIER 3 — JEV / EXPENSIVE REVIEW
Use occasionally as: JUDGE, ADVERSARIAL REVIEWER, CONVERGENCE CHECK.
NOT as the default worker.
Ask: "What assumption are the other workers missing?" "What duplicate authority remains?" "What evidence does not support the claimed conclusion?" "What is the smallest deletion/refactor that closes the MVP arrow?"
DO NOT HARDCODE A MODEL LIST FOREVER.
At worker startup: query/configure CURRENT available models.
Current OpenCode free candidates include variants such as: MiMo V2.5 Free, Ling 3.0 Flash Fin Free, Nemotron 3.5 Lightning Free, Nemotron 3 Ultra Free, Big Pickle, and currently exposed additional free models. Jev also has a free variant.
OpenRouter exposes 25+ free models and openrouter/free as a zero-cost router.
BUT OpenRouter's free account currently has a low daily request allowance.
Therefore: DO NOT make OpenRouter/free the persistent worker backbone.
Use it for: overflow, cross-model review, small research, model comparison, fallback.
Do not choose models from leaderboards alone.
Create a tiny PING task benchmark.
5-10 representative tasks:
1. locate duplicate authority
2. explain failing test correctly
3. find source→served mismatch
4. classify dead vs live subsystem
5. make tiny test-backed patch
6. identify unsafe secret handling
7. trace event writer/read/replay path
8. find stranded useful implementation
9. identify false certification claim
10. map code to MVP arrow.
Measure: SUCCESS, TOKENS, LATENCY, RETRIES, BAD EDITS, TEST PASS, COST.
Then assign workers empirically.

NOT:
WORK FOREVER.
USE:
OBSERVE
→ SELECT HIGHEST-LEVERAGE OPEN GAP
→ SEARCH/HARVEST
→ PATCH
→ TEST
→ VERIFY INDEPENDENTLY
→ COMMIT
→ UPDATE INTEGRATION LEDGER
→ REASSESS.
Then repeat.
Every iteration must leave the repository MORE CONVERGED.
A worker stops/escalates when:
production/destructive action required,
secret exposure encountered,
constitutional authority conflict found,
migration required,
external public side effect required,
tests falsify architecture,
dirty foreign work would be overwritten,
source→served provenance cannot be established,
same failure repeats twice without new evidence.
NO infinite retry loops.

EVERY 4 HOURS:
HARVESTED: ...
INTEGRATED: ...
DELETED/RETIRED: ...
STILL STRANDED: ...
DUPLICATE AUTHORITIES REMAINING: ...
MVP ARROWS CLOSED: ...
MVP ARROWS STILL BROKEN: ...
TEST/CERTIFICATION STATE: ...
NEXT HIGHEST-LEVERAGE GAP: ...

This prevents archaeology from becoming the product.

1. PROVE WHICH TREE RUNS.
2. PROVE SOURCE → BUILD → SERVED.
3. MAP ALL AUTHORITIES.
4. MAP IDENTITY/TENANT CHAIN.
5. MAP EVENT WRITERS/READERS/REPLAY.
6. MAP OBSERVATION → EVIDENCE.
7. MAP WORK ORDER → WORKER → RESULT.
8. MAP EFFECT VERIFICATION.
9. MAP KNOWLEDGE / QDRANT / CONTEXTPACK.
10. MAP MISSION CONTROL TO ACTUAL TRUTH.
11. DELETE/MERGE DUPLICATION.
12. CONNECT FYD TO THE CONVERGED PATH.

Qdrant is: DERIVED RETRIEVAL INDEX.
Postgres/event/evidence substrate remains authoritative according to the converged model.
Qdrant may accelerate: semantic retrieval, ContextPack assembly, similarity.
It does NOT certify facts.
It must be rebuildable.

Converge worker execution around ONE contract.
WORK ORDER: identity, tenant, mission/run, requested operation, inputs, capabilities, constraints, expected outputs, verification requirements, idempotency key.
RESULT ENVELOPE: work_order_id, worker, attempt, status, artifacts, claimed effects, evidence, errors, timing.
Then: RESULT ENVELOPE ≠ VERIFIED OUTCOME.
Independent verification evaluates claimed effects.

Make ambiguity first-class.
PROPOSED → AUTHORIZED → DISPATCHED → ACKNOWLEDGED
then: SUCCEEDED / FAILED / UNKNOWN.
UNKNOWN → RECONCILIATION.
Do not retry ambiguous external effects blindly.
This prevents: duplicate emails, duplicate follows, duplicate payments, duplicate publications.

Mission Control must CONSUME truth.
It must not invent another state machine.
Show: identity, missions, runs, work orders, workers, results, evidence, verification, UNKNOWN/HOLD, objects, relationships, capabilities, events.
Mission Control is the operating surface.
NOT authority.

Do not lose the product.
FYD is where these primitives become customer value.
Eventually:
OWNER CONNECTS DIGITAL PRESENCE
→ PING OBSERVES
→ EVIDENCE
→ OBJECT GRAPH
→ FYD EXPERIENCE
→ CONCIERGE
→ OWNER REQUEST
→ WORK ORDER
→ AGENT/SOFTWARE
→ PROPOSAL/ACTION
→ VERIFICATION
→ OUTCOME
→ UPDATED EXPERIENCE.
THAT is why convergence matters.

KEEP THE CURRENT HOLD.
Do not reinterpret "new-business radar" as permission to contact prospects.
Research may identify product categories/problems anonymously or from public market evidence.
NO outreach. NO messages. NO prospect automation.
The hold remains until Nolan explicitly lifts it.

Complete the read-only token.json / .env.base inspection.
DO NOT PRINT VALUES.
Report only:
FILE:
SECRET-LIKE MATERIAL PRESENT: YES/NO
TRACKED BY GIT: YES/NO
PERMISSIONS:
REFERENCED BY:
ROTATION REQUIRED: YES/NO/UNKNOWN.
If live credentials appear in tracked/inappropriately exposed material: INCIDENT.
Do not paste them into reports.

DO NOT START ANOTHER BIG ARCHITECTURE WAVE.
HARVEST EVERYTHING RELEVANT.
BUT INTEGRATE ONLY WHAT CLOSES THE MVP.
The measure is not: HOW MUCH PING DID WE DISCOVER?
It is: HOW MUCH EXISTING PING VALUE DID WE CONNECT INTO ONE WORKING PATH?

We want:
ONE IDENTITY/TENANT CHAIN.
ONE AUTHORITY GRAPH.
ONE EVENT LANGUAGE.
ONE OBSERVATION/EVIDENCE PATH.
ONE WORK ORDER/RESULT CONTRACT.
ONE EXTERNAL-EFFECT VERIFICATION MODEL.
ONE KNOWLEDGE/CONTEXTPACK PATH.
ONE SOURCE→BUILD→SERVED PROVENANCE CHAIN.
ONE MISSION CONTROL READING THAT TRUTH.
FYD RUNNING ON TOP.
Everything else becomes: ADAPTER, PROJECTION, DERIVED INDEX, COMPATIBILITY LAYER, or DEAD CODE.

USE SOFTWARE FIRST.
USE INCLUDED/FREE COMPUTE SECOND.
USE STRONG MODELS FOR HARD AMBIGUITY.
USE JEV PERIODICALLY TO ATTACK OUR ASSUMPTIONS.
KEEP WORKERS BOUNDED.
KEEP THEM RESTARTABLE.
KEEP CHECKPOINTS.
COMMIT SMALL VERIFIED CONVERGENCE.
DO NOT CONFUSE PERSISTENCE WITH INFINITE EXECUTION.
DO NOT CONFUSE HARVESTING WITH INTEGRATION.
DO NOT CONFUSE SIGNED HISTORY WITH WORLD TRUTH.
DO NOT CONFUSE AUTHORITY WITH VERIFICATION.
KEEP MOVING UNTIL THE MVP PATH IS ONE HONEST, VERIFIED SYSTEM.

The larger architectural reason is optionality. If you converge those contracts rather than individual apps, PING can later swap the worker between Copilot, OpenCode, Jev, a local model, deterministic software, or an external MCP worker without changing what an authorized action means. Similarly FYD can project the same evidence-backed objects to a website, social surface, agent, ActivityPub, ATProto, mobile client, or future interface without changing canonical truth.
That's the architecture worth preserving: models, providers, databases, protocols, and UIs are replaceable; identity, authority, evidence, object semantics, verification, and history are durable.
