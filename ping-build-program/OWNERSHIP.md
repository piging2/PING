# PING HIGH-THROUGHPUT BUILD PROGRAM — OWNERSHIP MATRIX (20× MODE)

Established 2026-09-23, revised per Nolan's 20× MODE directive. Supersedes the A–H structure.
ONE OWNER PER MUTABLE SEMANTIC UNIT. No two lanes modify the same file concurrently.
Shared files get ONE owner; others file integration requests: INTEGRATION-REQUEST-<from>.md.

## Governing
- 20× MEANS: 20× harvest, 20× experiments, 20× reuse, 20× failure testing, 20× product optionality. NOT 20× authorities, databases, frameworks, duplicate abstractions, random agents.
- SACRED: the FYD core loop (URL → OBSERVATIONS → EVIDENCE → OBJECT GRAPH → SITE SPEC → RENDERER → BROWSER → ASK FYD → OWNER ACTION). Lanes feed it; never replace or disrupt it.
- Per-lane operating model: SEARCH PING → SEARCH GIT HISTORY → SEARCH ECOSYSTEM → CLONE TO ISOLATED HARVEST AREA → READ LICENSE → RUN TESTS → IDENTIFY MECHANISM → BUILD MINIMAL SPIKE → RED-TEAM → ADOPT/ADAPT/REJECT → INTEGRATE ONLY THE WINNER. A clone is research; an import requires a decision. Do NOT vendor random repos into PING.
- Connector data is OBSERVATION (constitutional): SHOPIFY PRODUCT → SHOPIFY OBSERVATION → EVIDENCE → RESOLUTION → PING PRODUCT. Never provider-shaped truth in canonical objects.
- Kill criteria (reject dependency if): license incompatible, requires surrendering canonical authority, unsafe secret model, cannot preserve provenance, cannot be isolated, weight dwarfs value, PING already solves it, or only benefit is novelty.
- Optionality test for every decision: can we replace this provider/model/UI/connector library/protocol, add a new protocol, rebuild the projection, trace the result to evidence? If NO to any, infrastructure became canonical — fix it.
- 20× agent rule: no more agents than independent problems. One writer, many readers, coordinator owns convergence.

## Active PING repo
Recorded: /home/nolan/projects/ping (verify dynamically before every write).

## Phase 0 (first, blocks nothing but feeds everything)
| LANE | SCOPE | STATE DIR |
|------|-------|-----------|
| phase0 | Event Authority forensic closure. READ-ONLY. Trace AcquisitionManager.collectEvidence/batchCollectEvidence → event construction → EventAuthority.computeEventIdFromEvent → IdentityAuthority → HashAuthority → persistence → sequencing → stream → replay. Classify ConstitutionalEventStore, EventRepository, IEventAuthority, AcquisitionManager, every direct ping_events writer as CANONICAL_AUTHORITY/ADAPTER/INTERFACE/LEGACY/DUPLICATE/DORMANT/UNWIRED/UNKNOWN. Answer WHO CREATES EVENT ID / HASHES / SEQUENCES / PERSISTS / READS / STREAMS / REPLAYS / MAY WRITE. If IEventAuthority has zero implementations, record it. If AcquisitionManager produces observations/events without persistence, record the seam. Do NOT invent a second event authority. | ~/workspace/ping-build-program/phase0 |

## P0 INFRA
| LANE | SCOPE | STATE DIR |
|------|-------|-----------|
| A | Git as first-class source. Model git observations with relationships; keep Git SHAs as native identifiers; incremental OLD HEAD → NEW HEAD ingestion; dogfood on PING itself: answers about the repo must be evidence-cited. Consumes (read-only): ~/workspace/git-ingestion/findings, threats. | ~/workspace/ping-build-program/lane-a |
| BCQ | Connector substrate = B + C + Q. Evaluate NANGO seriously for auth + connection management ONLY (PING retains canonical objects, evidence, capabilities, policy, events; Nango must never become authority). Harvest Airbyte for source/stream/checkpoint/incremental concepts only. Build the connector CONTRACT TEST KIT ONCE so every future adapter inherits it. Consumes (read-only): ~/workspace/business-connectors/hidden_files/. | ~/workspace/ping-build-program/lane-bcq |
| L | Secret broker. ONE custody pattern: agents get capability handles, never tokens. Nothing secret in objects/journal/SiteSpec/context/logs. The password incident already taught this. | ~/workspace/ping-build-program/lane-l |
| N | Data lineage: SOURCE → OBSERVATION → EVIDENCE → OBJECT → SITE SECTION → ANSWER → ACTION, queryable end to end. | ~/workspace/ping-build-program/lane-n |

## P0 PRODUCT
| LANE | SCOPE | STATE DIR |
|------|-------|-----------|
| G | Ask FYD context compiler: question + viewer + target object → relevant objects/relationships/evidence/capabilities/visibility → model. Answers return claim bindings + evidence. This is where the graph pays rent. Coordinate with the FYD factory lane via state files; do NOT duplicate it. | ~/workspace/ping-build-program/lane-g |

## P1
| LANE | SCOPE | STATE DIR |
|------|-------|-----------|
| CONN | Business connectors via the substrate (builds on BCQ's contract + test kit). Includes the GitHub connector (repo metadata, issues, PRs, reviews, workflow runs, releases, remote branch state). GitHub never writes canonical PING state directly. One real business connector proven end to end first. | ~/workspace/ping-build-program/lane-conn |
| F | Object search. Deterministic first: ID/schema/name/relationship/source/URL/text. Then FTS/trigram/vector/hybrid on EXISTING infra. No new database. | ~/workspace/ping-build-program/lane-f |
| E | Schema→everything: prove ONE schema definition for Business/Service/Post drives validator, TS type, editor, eligibility, search fields, agent tool descriptions, normalization targets. Expand only if proven. No meta-framework. | ~/workspace/ping-build-program/lane-e |
| P | Content-addressable media: media bytes identified by content hash, deduplicated, provenance-bound. | ~/workspace/ping-build-program/lane-p |
| S | Business capability discovery: observation → resolved capability ONLY after policy check. | ~/workspace/ping-build-program/lane-s |
| O | Dependency index for targeted regeneration: which object/evidence change invalidates which derived artifact. | ~/workspace/ping-build-program/lane-o |

## P2 (must NOT steal P0 engineers)
| LANE | SCOPE | STATE DIR |
|------|-------|-----------|
| I | MCP edge: selected capabilities exposed as tools. No raw DB, no secrets, no shell, no canonical mutation. | ~/workspace/ping-build-program/lane-i |
| H | ElectricSQL/PGlite spike BEHIND an interface. No core dependency. Durability edge cases noted, not adopted without proof. | ~/workspace/ping-build-program/lane-h |
| SOC | Public-social fabric: PING's public presence as projection of canonical objects, not a second content system. | ~/workspace/ping-build-program/lane-soc |
| PROTO | Protocol projections: alternate renderings/protocols over the same canonical state; proves optionality. | ~/workspace/ping-build-program/lane-proto |

## Cross-cutting
| LANE | SCOPE | STATE DIR |
|------|-------|-----------|
| D | Web acquisition. Keep the proven pipeline; escalate HTTP → JSON-LD → HTML → browser → intelligence only where needed. | ~/workspace/ping-build-program/lane-d |
| J | Observability: every run records source/run/start/finish/checkpoint/discovered/accepted/rejected/changed/conflicts/errors/rate-limits/bytes/cost/AI-tokens so we can answer WHY DID FYD CHANGE. | ~/workspace/ping-build-program/lane-j |
| K | Standardized failure taxonomy: AUTH_REQUIRED/EXPIRED, PERMISSION_DENIED, RATE_LIMITED, SOURCE_UNAVAILABLE/CHANGED, SCHEMA_CHANGED, INVALID_PAYLOAD, CONFLICT, TIMEOUT, TRANSIENT, PERMANENT. No connector invents its own. | ~/workspace/ping-build-program/lane-k |
| M | Source registry as OPERATIONAL metadata (health, cursors, budgets), NOT a truth authority. | ~/workspace/ping-build-program/lane-m |
| R | Replayable ingestion fixtures: production failure → fixture → regression test → generic fix. Coppersmith @graph proved the model. Owns the connector lab (isolated fixtures, recorded responses, failure injection). | ~/workspace/ping-build-program/lane-r |
| T | Action planner seam: intent + object + capabilities + policy → action plan. NO campaigns yet. | ~/workspace/ping-build-program/lane-t |
| DUP | Architecture duplication detector (continuous). Hunts duplicate event stores, identity generators, hash impls, mission stores, worker registries, connector registries, retry engines, cursor stores, provenance models, config authorities. On detection: STOP the local implementation, classify AUTHORITY/ADAPTER/LEGACY/DUPLICATE/DERIVED, converge through the existing authority. This is the convergence engine: CONVERGE FASTER THAN YOU EXPAND. | ~/workspace/ping-build-program/lane-dup |

## Excluded (NOT ours — coordinate via state files, feed findings, never duplicate)
Constitutional sprint (no-commit forensics — WIP absolutely untouchable). Oracle migration worktree (separate; build components deployable there later, do not modify Oracle infra). TenantOS convergence wave. FYD factory. Website surgical-upgrade mission. ORCA wave.

## Standing mode: YOLO (Nolan, 2026-09-23 night)
Quit asking for permission on routine work. Execute on Nolan's word. Decide at 80%+ confidence, test, document the evidence, continue. Below 80%, ask one concise question with the uncertainty, recommended default, and cost of being wrong. Never gate routine implementation on approvals. Hard boundaries stand (vendor veto gate for production adoption, no credential exposure, queue don't assume). Everything else: go.

## Standing invariant: NO STOPPING CONDITIONS (Nolan, 2026-09-23 night)
No matter what happens, at minimum read-only cognition runs always. Harvest, benchmarking, and acquisition research continue even if implementation lanes throttle. There is no state in which the program reports "waiting" with an idle queue: a finished lane discovers the next gap and continues. Recorded as a program invariant alongside the credential and vendor-veto standing decisions.

## Standing decisions (Nolan — binding on all lanes)

### 1. Connector credentials: QUEUE FOR MORNING, DO NOT ASSUME
Build the connect flow: CONNECT SOURCE → provider → requested permissions explained → OAuth authorization → callback → encrypted/token custody → source capability inventory. Ask for the SMALLEST permission set needed for the demonstrated feature. Never request write permissions speculatively. Never expose tokens to browser, agent context, events, SiteSpec, object graph, or logs. Use the provider's current recommended authorization flow; modern OAuth guidance requires PKCE for authorization-code clients. UI offers CONNECT FACEBOOK / CONNECT ATPROTO / CONNECT OTHER SOURCE but only enable connectors actually supported. NOLAN picks which real account gets connected tomorrow — queue it, do not connect anything tonight. No live credentials in any lane tonight; fixtures/recorded responses only.

### 2. Vendor veto: YES for adoption, NO for experimentation
Research lanes may freely install in isolated branch/worktree, benchmark, prototype, measure, compare, reject — anything safe and legally usable, no asking. They MAY NOT put a paid/heavy vendor into FYD's production hot path without a decision gate. VETO GATE triggers on: recurring paid dependency, customer-data custody, canonical-data dependency, hard vendor lock-in, new hosted database, new orchestration plane, new identity authority, new secret surface, large runtime dependency, material egress cost, proprietary format difficult to escape. Small mature libraries do NOT need CEO approval. Kill criteria for the gate: DOES IT REMOVE COMMODITY CODE? DOES IT IMPROVE THE URL → TRUSTED FYD LOOP? CAN WE REMOVE/REPLACE IT? DOES PING REMAIN THE AUTHORITY? WHAT DATA DOES IT OWN? WHAT FAILS IF IT DISAPPEARS? WHAT IS ITS COST AT 10 / 1,000 / 100,000 FYDs? Good answers → recommend ADOPT. Otherwise → WRAP / RESEARCH / REJECT.

## Commit policy
No lane commits to shared branches. Implementation lives in isolated worktrees or as uncommitted diffs; scoped feature branches only if announced in the lane STATE.md. Never commit unrelated staged work. Never reset/clean/force-push/rewrite history. Before every write: git worktree list --porcelain, git branch --show-current, git status --short.

## Lane status + reporting
Each lane maintains STATE.md: BUILDABLE / BLOCKED (exact blocker) / PROVEN / FALSIFIED / NEXT, plus compact ledger RESEARCHED/HARVESTED/IMPLEMENTED/WIRED/TESTED/FALSIFIED/FIXED/PROVEN/BLOCKED.
Every harvest lane returns: PROBLEM / PING ALREADY HAS / EXTERNAL CANDIDATES / LICENSES / TESTED / WINNER / ADOPT-ADAPT-REJECT / CODE WE DO NOT NEED TO WRITE / MINIMAL PING WRAPPER / FAILURE TEST / PRODUCT CAPABILITY UNLOCKED / BYTES-DEPENDENCY COST.

## First major milestone
PING MULTI-SOURCE ACQUISITION: Git repo → observation, GitHub object → observation, one real business connector → observation, all three through canonical event authority, canonical persistence, proven provenance, duplicate-delivery safety, restart/recovery, knowledge pipeline reachability. Then continue into more connectors and infrastructure.

## Proof to report (not agent counts)
EXTERNAL SYSTEMS EVALUATED / PING MODULES HARVESTED / DEPENDENCIES ADOPTED / DEPENDENCIES REJECTED / HAND-WRITTEN INFRA AVOIDED / CONNECTORS PROVEN / GIT INGESTION / SECRET BOUNDARY / LINEAGE / ASK FYD / CUSTOMER LOOP / FIRST BROKEN PRODUCT STEP / HIGHEST-LEVERAGE INFRA GAP / NEXT.
