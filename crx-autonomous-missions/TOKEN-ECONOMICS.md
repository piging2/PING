# CRX Autonomous Missions — Token Economics

Tracked per campaign plan: model tokens, wall time, human interruptions, task value, rework, duplicate investigation, failed experiments, useful discoveries.

## Campaign accounting (2026-09-23, through red-team dispatch)

**Wall time:** ~10:03 MDT (directive) to ~10:50 MDT (red-team dispatch). ~47 minutes of coordinator time; lane agents ran in parallel.

**Human interruptions:** 0. Nolan issued the directive; campaign runs quiet per the reporting cadence. No questions asked, no approvals needed (research only, no outward actions).

**Task value (delivered):**
- 262 validated mechanism records in the central library (16-field schema, all source-pinned), replacing 9 scattered lane files.
- 10 lane READMEs with structured findings and explicit falsification logs.
- 40+ falsified README-vs-source claims recorded (orca-cli skeleton, orca-claimed MCP/DAG/claiming absent, Temporal no-saga, Inngest SSPL, Restate BSL, OmniRoute in-memory-only "SQLite" routing table, mini-SWE-agent license unverified, etc.).
- 4 independent triangulations on the highest-value harvests (per-attempt Run identity: Orca, OpenAI SDK, Orka, Restate; one-writer invariant: Orca, Orka, bors, AIOS).

**Rework:**
- mcp-execution lane: README harvest-summary counts reconciled (draft said 12/15/6/1/1=35, file had 36) — caught by the lane's own validator before merge.
- Memory lane reported "15 required fields" vs the 16-field schema — flagged in campaign log; merge validator confirmed all 30 records carry all 16 fields, so no rework needed.
- Observability lane: OpenLLMetry zero-byte files diagnosed as clone corruption, not implementation — one dead-end investigation, recorded as falsification.

**Duplicate investigation:**
- Near-zero by design. Lane briefs carried explicit "already harvested, verify and move on" lists. One intentional overlap (orchestrator-survey vs ORCA lane) resolved: different Orca projects, distinct mechanisms, no semantic duplication at merge.
- Cross-lane duplicate ID check at merge: 0 collisions across 262 records.

**Failed experiments:**
- /tmp filled to 100% mid-campaign (lane clones). Software-factory lane cloned into shared _src/ (boundary violation), then self-corrected: extracted evidence, deleted the directory, verified gone, documented in lane README. Durable-execution lane moved scratch to ~/workspace/scratch/. Observability lane's opik clone stalled at ~197MB/17min — killed, mechanisms honestly marked pending-verification. No third-party code committed anywhere.

**Useful discoveries (highest value per unit of investigation):**
1. Durable per-attempt Run identity — 4-lane triangulation, closes CRX audit gap #3. (Highest value.)
2. ORCA-14 wakeup incident — durability without a wakeup path is a liveness bug; every durable queue needs a push signal or a poller with teeth.
3. One-writer invariant — 4-lane triangulation (Orca single-writer SQLite, Orka single control authority, bors/AIOS merge queues).
4. Own-vs-infrastructure boundary — CRX owns meaning, infrastructure owns mechanics (durable-execution lane headline).
5. OutcomeUnknown fail-closed — Orka + DBOS; maps 1:1 to CRX's typed-failure rule.
6. Negative observability as deterministic journal invariants — CRX must supply the layer the ecosystem lacks.
7. RECEIPT vs EFFECT VERIFICATION stay separate — ecosystem-wide gap confirmed.

**Token-spend posture:** concentrated on source archaeology, comparison, and falsification per the directive. No repeated repo summaries, no prose-only output, no activity-as-progress.
