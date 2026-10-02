# PING/FYD — RUN THE 30-PROBE TRUTH SWARM NOW

Nolan steering packet, 2026-10-01 ~18:21 MDT. Filed verbatim (plus his closing instruction).

BRUTAL CEO MODE.
DO NOT BUILD 30 FEATURES.
DO NOT LET 30 AGENTS EDIT THE SAME TREE.
USE EVERY AVAILABLE AGENT SYSTEM FOR INDEPENDENT FALSIFICATION: COPILOT, GOOSE, OPENCODE, CODEX, EXISTING PIGI/HERMES WORKERS.
BUT PING REMAINS THE AUTHORITY. THE AGENTS ARE LABOR. THEY DO NOT BECOME TRUTH.

## SWARM MODEL

Split workers into: READ-ONLY FORENSICS / HOSTILE TESTS / IMPLEMENTATION / INDEPENDENT VERIFICATION.
COPILOT / OPENCODE / GOOSE should primarily attack independent questions in clean worktrees or read-only mode.
DO NOT allow multiple autonomous agents to casually edit the same dirty working tree.
Every worker reports: PROPOSITION / EXACT SHA / EXACT PLANE / COMMAND/REQUEST / OBSERVED RESULT / PASS / FAIL / UNKNOWN / EVIDENCE LOCATION / SMALLEST FIX IF FAIL.
UNKNOWN IS VALID. GUESSING IS NOT.

## PRIORITY ZERO — CANONICAL TRUTH (Q1-5 first; every later proof is contaminated if truth placement is unknown)

1. WHICH WRITERS APPEND TO JOURNALS THE CANONICAL GATEWAY CANNOT SEE? Inventory every executable write path (gateway, UnifiedEventRuntime, emit.py, dispatch, approval, missions, workers, tests, maintenance scripts, CLI, legacy runtime). Instrument/test each writer with a unique harmless probe ID. Query canonical truth through the SAME reader the product uses. PASS: every production-capable writer either reaches canonical journal or fails closed. Any writer reaching another durable journal is a truth fork.
2. DO FORK JOURNALS CONTAIN LEGITIMATE UNIQUE EVENTS? CLASSIFY BEFORE DELETE. For every fork: event count, time range, writers, event types, IDs, digests, overlap with canonical, unique events, whether unique events caused effects. Classifications: TEST/SYNTHETIC, PROJECTION/CACHE, LEGITIMATE-CANONICAL-MISSING, UNKNOWN. If legitimate events exist only in a fork: DO NOT silently copy them; reconciliation needs provenance and duplicate analysis.
3. WHAT DOES emit.py DO FROM A MISLEADING WORKING DIRECTORY? Hostile test from repo root, /tmp, home, nested directory, clean worktree with canonical config held constant. EXPECTED: same configured canonical destination OR explicit refusal. NEVER: cwd-relative surprise journal.
4. WHAT HAPPENS WHEN CANONICAL JOURNAL CONFIG IS MISSING? EXPECTED: FAIL CLOSED. NO ./events.db, ./journal, /tmp fallback, home fallback, silent sqlite creation. Add regression test if unsafe.
5. CAN TWO WRITERS DUPLICATE ONE LOGICAL EVENT? Construct same logical proposition through two legitimate entry paths. Determine event identity rule, idempotency rule, unique constraint, semantic dedupe, replay behavior.

## PRIORITY ONE — AUTHORITY (Q6-9)

6. /tenants: issue unauthenticated mutation against the actual served route (inert/scratch tenant if risk). Expected 401/403 before mutation. Success = P0.
7. FORGED TENANT / ACTOR / CAPABILITY: submit mission proposal where caller identity disagrees with claimed tenant/actor/capability. Expected: server derives/binds authority from authenticated context; caller claims must not self-authorize.
8. FABRICATED APPROVAL: attempt approval without authentication, wrong actor, wrong tenant, without capability, wrong proposal digest, mutated proposal after approval. Approval MUST bind WHO / WHAT EXACT DIGEST / UNDER WHAT AUTHORITY / WHEN. MC must never render fabricated approval as legitimate.
9. WHO CAN WRITE CANONICAL TRUTH? Produce the writer graph as executable call graph, not prose. Every canonical writer must reach the same authority/governance seam. Gateway is not sacred. AUTHORITY IS.

## PRIORITY TWO — EFFECT SAFETY (Q10-13)

10. IS :3100 RUNNING TESTED SOURCE? Expose build provenance in dev diagnostics: git SHA, dirty state, build timestamp, artifact digest. Prove served JS corresponds to expected source.
11. EFFECT SUCCEEDED, RESPONSE LOST: simulate request accepted → external effect succeeds → response/ack disappears → caller retries. Determine idempotency key / provider operation ID / receipt / reconciliation at the boundary. Retry duplicating a consequential effect = P0.
12. DEAD "WORKING" PATHS: runtime tracing/coverage, not grep. Map served route → handler → authority → runtime → store/effect. Classify LIVE / DORMANT / TEST-ONLY / UNWIRED / DEAD.

## PRIORITY THREE — DURABILITY / REPLAY (Q13-15)

13. REBOOT TEST: inventory accepted state in memory / local file / canonical journal / Postgres / projection / worker queue; controlled restart where safe. WHAT ACCEPTED DECISION DISAPPEARS?
14. REPLAY: canonical persisted history → build semantic state twice from clean projection → digest normalized semantic output → perturb irrelevant physical conditions. Expected same semantic digest. Ordering from explicit canonical semantics, not DB luck.
15. JOURNAL DESTINATION AFTER RESTART: restart each writer; verify destination identity before/after. A restart must not create a new truth universe.

## PRIORITY FOUR — MISSION CONTROL (Q16-18)

16. STATUS SEMANTICS: MC must distinguish PROPOSED / AUTHORIZED / RUNNING / SUCCEEDED / FAILED / UNKNOWN / UNWIRED / NOT_DEPLOYED where those exist. Do not paint UNKNOWN red as FAILED; do not paint unwired green because code exists.
17. ONE MISSION / ONE AUDIT STORY: for one real mission answer WHAT WAS WANTED / WHAT EVIDENCE WAS USED / WHO AUTHORIZED / WHAT CAPABILITY ALLOWED IT / WHAT EXECUTED / WHAT EFFECT OCCURRED / WHAT VERIFIED THE OUTCOME. May be one composed projection. Do not create another canonical store.
18. REPRODUCIBLE NUMBERS: inventory every MC number with SOURCE QUERY / FILTER / TIME WINDOW / PROJECTION VERSION. Unreproducible → label estimated/derived or remove.

## PRIORITY FIVE — ORCA (Q19-20)

19. WHAT DID ORCA ACTUALLY PROPOSE? Find persisted evidence from last 24h. If none: answer NONE. Do not reconstruct intentions from logs.
20. PROPOSAL != EXECUTION: prove ORCA cannot turn planning text directly into canonical effect. Expected chain ORCA OUTPUT → PROPOSAL → CAPABILITY/POLICY → APPROVAL → EXECUTION → RECEIPT/EVIDENCE. Generation granting authority = P0.

## PRIORITY SIX — PING/FYD PRODUCT (Q21-25, 27)

21. MARKETING COPY VS PRODUCT STATE: audit homepage sections; classify LIVE PRODUCT STATE / INTERACTIVE PROOF / EXPLANATION / MARKETING / DECORATION.
22. OBSERVE → UNDERSTAND → PROJECT: a stranger understands without PING vocabulary. Test comprehension with an external human.
23. EVIDENCE: visible claim must terminate at claim → support → observation → source.
24. ASK PING / ASK FYD REFUSAL: hostile questions where evidence doesn't establish the answer. Expected SUPPORTED ANSWER or INSUFFICIENT EVIDENCE. Never confident filler.
25. NUMBERS: audit every customer-visible quantitative claim; classify SOURCE-BACKED / DERIVED+REPRODUCIBLE / MARKETING-ESTIMATE / UNSUPPORTED. Unsupported factual numbers disappear.
27. OWNER CORRECTION: observed truth stays SOURCE SAID X; owner correction is a separate authorized proposition (OWNER SAYS PRESENT Y / OWNER DISPUTES X). Never rewrite history to match preference.

## PRIORITY SEVEN — FYD PRIVACY (Q26)

26. FYD-010: attempt public reads of PRIVATE / PING_ONLY / OWNER fields via direct object ID, search, related-object expansion, BFF, Ask FYD, generated site, projection endpoint. Privacy must hold at the data boundary, not merely hidden UI.

## PRIORITY EIGHT — TENANTOS (Q28-29)

28. PLACEMENT: trace current (tenant, capability) → execution target path. If no real decision mechanism: status = UNWIRED. The eventual decision becomes recorded evidence.
29. SECOND TENANT TEST: synthetic second tenant in safe test plane; run object/mission/capability/projection/Ask FYD flows; hunt hardcoded Nolan, default tenant, global cache/key/namespace, implicit cwd, singleton customer config.

## PRIORITY NINE — LEARNING (Q30)

30. WHAT DID WE LEARN THAT CHANGED SOFTWARE? Only if evidence changed deterministic behavior. Per learning: OBSERVATION → EVIDENCE → DECISION → SOFTWARE/POLICY CHANGE → BEFORE/AFTER METRIC. Do not create LearningAuthority.

## THE JOURNAL FORK IS THE FIRST KILL SHOT

Dedicated journal worker has priority. Before broader implementation: HOW MANY DURABLE JOURNALS EXIST / WHO WRITES EACH / WHO READS EACH / WHICH CONTAIN UNIQUE LEGITIMATE EVENTS / WHICH ARE CANONICAL / WHAT HAPPENS WHEN CONFIG IS WRONG. Invariant: ONE CANONICAL PROPOSITION HISTORY. MANY DISPOSABLE PROJECTIONS. NO SILENT FALLBACK TRUTH.

## WHY THIS ARCHITECTURE STILL MATTERS

PING earns existence ONLY where it creates optionality. Useful separations: OBSERVATION != CLAIM; CLAIM != PRESENTATION; PROPOSAL != APPROVAL; APPROVAL != EXECUTION; EXECUTION != VERIFIED EFFECT; CANONICAL HISTORY != PROJECTION; IDENTITY != PROVIDER ACCOUNT; RELATIONSHIP != PROVIDER ACTION; AGENT != AUTHORITY. Those let FYD change AI provider, renderer, database projection, social provider, agent framework, browser, protocol, UI, campaign planner WITHOUT changing the meaning of the user's world. THAT IS THE POINT OF PING.

## RECENT ECOSYSTEM LESSON (do not build another agent orchestrator)

Use COPILOT / GOOSE / OPENCODE / CODEX where available as replaceable workers under PING's evidence/authority discipline, not new authorities. PING owns OBJECTS / IDENTITY / CAPABILITY / AUTHORITY / CANONICAL PROPOSITIONS / EVIDENCE / OUTCOMES. Agent vendors own REASONING/EXECUTION LABOR. Do not literally unleash every agent as a writer: unleash them as SKEPTICS. One discovers, one patches, one attacks the patch.

## MCP / ATPROTO / NOSTR LESSONS (harvest, don't import)

MCP: stateless core + durable Tasks as extension → compatible with PING; eventually PING CAPABILITY ↕ MCP ADAPTER ↕ TOOLS/AGENTS. Do not make MCP canonical truth. ATProto: permissions attenuated around named resources/operations → PING capabilities stay EXPLICIT, SCOPED, ATTENUATED, INSPECTABLE; never "the account." Nostr: tiny signed-event substrate → pressure: CAN PING'S CANONICAL PROPOSITION BE SMALLER? CAN EVERYTHING ELSE BE PROJECTION? Every permanent canonical field must earn permanence.

## SWARM ASSIGNMENT

COORDINATOR: own priorities and integration. NO feature coding unless necessary.
JOURNAL SWARM: 1-5, 14-15. SECURITY SWARM: 6-9, 26. EFFECT SWARM: 10-13. MISSION CONTROL SWARM: 16-18. ORCA SWARM: 19-20. PRODUCT SWARM: 21-25, 27. TENANT SWARM: 28-29. LEARNING SWARM: 30.
Assign independent verifier agents after each implementation patch. Use different agent/tool when practical.

## AGENT SAFETY

DO NOT GIVE EVERY AGENT FULL WRITE AUTHORITY. READ-ONLY stays read-only. Implementation agents get isolated worktrees. No agent may: reset --hard, clean unknown files, force push, rewrite shared history, delete unclassified journals, drop/truncate databases, rotate secrets, deploy production, send external communications, perform public social actions — without the existing explicit authorization boundary. COMMIT ONE PROPOSITION PER COMMIT.

## DIRTY TREE

23/66/76 unrelated dirty files are not permission to clean. DO NOT TOUCH THEM. Identify ownership. Use clean worktrees for swarm work. Cherry-pick only proven minimal commits.

## MISSION CONTROL :3100

Rebuild only from TESTED SOURCE. Before Nolan uses it expose dev provenance: HEAD, build/source relationship, server health. Then give Nolan the two manageable FYD objects/sites to test. Do not block truth work on visual polish.

## PIG POWER

ON AC: DO NOT ALLOW IDLE SLEEP TO DESTROY ACTIVE AUTOMATION. Prefer ACTIVE-JOB WAKE INHIBITOR if reliable; else set the dedicated Pig to never sleep on AC. Display sleep fine. SYSTEM SLEEP DURING ACTIVE AUTOMATION IS NOT. Do not modify battery policy unnecessarily.

## STOP CONDITIONS (stop the lane; these outrank website polish)

CANONICAL TRUTH FORK beyond the known one / UNAUTHENTICATED MUTATION / CROSS-TENANT LEAK / FABRICATED APPROVAL ACCEPTED / PRIVATE FIELD PUBLICLY READABLE / DUPLICATE CONSEQUENTIAL EFFECT / SILENT JOURNAL FALLBACK / AGENT DIRECTLY AUTHORIZING IT.

## CEO SCOREBOARD (final format)

30 PROBES → 30 STATUSES (Q01 PASS/FAIL/UNKNOWN — evidence …). Then: P0 FAILURES / FIXED / OPEN / FALSE ASSUMPTIONS KILLED / DUPLICATE SYSTEMS REMOVED / HARVESTED INSTEAD OF WRITTEN / CURRENT CANONICAL JOURNAL / CURRENT LIVE PRODUCT SHA / FYD DEMO / NEXT SINGLE BOTTLENECK.

## THE PRODUCT REASON

WE ARE NOT BUILDING ALL THIS SO WE CAN HAVE A FANCY JOURNAL. WE ARE BUILDING IT SO A PERSON CAN SAY: "UNDERSTAND MY BUSINESS." THEN: "BUILD MY PRESENCE." THEN: "KEEP IT TRUE." THEN: "CHANGE IT LIKE THIS." THEN: "FIND MY PEOPLE." THEN: "RUN THIS CAMPAIGN." THEN: "LET MY AGENTS HELP." AND THEY DO NOT HAVE TO SURRENDER THEIR IDENTITY, HISTORY, DATA MODEL, RELATIONSHIPS OR BUSINESS LOGIC TO WHATEVER WEBSITE BUILDER, AI MODEL OR SOCIAL NETWORK HAPPENS TO BE POPULAR THAT YEAR. THAT OPTIONALITY IS THE SYSTEM. NOW TRY TO BREAK IT. FIX WHAT ACTUALLY BREAKS. DELETE WHAT DOESN'T EARN ITS WEIGHT. GO.

## DEEPER ANSWERS (Nolan's architectural pushback, recorded)

- The journal is valuable only if it gives PING a stable semantic boundary between changing technologies. Q1-5 outrank almost everything else. Do not merge/delete any fork until unique events and side effects are classified.
- Authority justified only at consequential boundaries. FYD needs no permission ceremony for moving a draft section; it needs authorization for publishing, provider writes, communications, private data exposure, spending, durable agent authority. Scale friction with consequence.
- Mission Control = evidence projection, not another workflow system. The mission screen is a debugger for intent: wanted → knew → authorized → executed → observed. If it cannot derive that from existing state, fix the substrate/read model, not another store.
- ORCA earns its name through persisted proposals. If none in 24h, Q19's honest answer is "none."
- The website is not the moat; the renderer is replaceable. The durable asset is evidence → entity → owner correction → relationship → capability → action → outcome. FYD can get much better without locking PING to React/Next.js/SiteSpec v1.

## NOLAN'S CLOSING INSTRUCTION

"CAN YOU TRY TO ANSWER THEM YOURSELF YOU HAVE THE DATABASE" — the coordinator (Pigi) personally attempted all 30 in the 2026-10-01 ~18:21 turn: 2 FAIL (Q01 truth fork confirmed, Q06 /tenants unauthenticated), 1 UNWIRED (Q28 placement), 4 PARTIAL, remainder UNKNOWN. Treat those answers as claims for the swarm to falsify, not as truth.
