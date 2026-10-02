## MC-01
IN_PROGRESS P1 [MISSION CONTROL] Phantom-surface fleet: per-surface contract map
WHY: 
EV: 
ACC: 

## MC-02
OPEN P1 [MISSION CONTROL] Mission Control must not become a second authority
WHY: 
EV: 
ACC: 

## MC-03
OPEN P2 [MISSION CONTROL] Event-count scope discrepancy across backends
WHY: 
EV: 
ACC: 

## MC-04
IN_PROGRESS P2 [MISSION CONTROL] NotLiveInventory: 12 preserved-but-not-live surfaces
WHY: 
EV: 
ACC: 

## MC-05
OPEN P1 [MISSION CONTROL] /system/state misleading collectors
WHY: 
EV: 
ACC: 

## MC-07
OPEN P2 [MISSION CONTROL] Honest backends with zero UI callers (cheapest truthful win)
WHY: 
EV: 
ACC: 

## MC-08
DECISION P2 [MISSION CONTROL] Define Mission Control as identity-owned operating environment (projection model)
WHY: 
EV: 
ACC: 

## MC-09
OPEN P2 [MISSION CONTROL] Mission mutation buttons stay hidden until a witnessed transition contract exists
WHY: 
EV: 
ACC: 

## MC-10
BLOCKED P1 [MISSION CONTROL] Live provenance break: baseline image replaced with no promotion record + dual-writer
WHY: 
EV: 
ACC: 

## MRE-01
OPEN P1 [MISSION/RUN/EXECUTION] Auditable unit: Mission → Run → Execution (never collapse)
WHY: 
EV: 
ACC: 

## MRE-02
OPEN P1 [MISSION/RUN/EXECUTION] Two competing mission identity schemes
WHY: 
EV: 
ACC: 

## MRE-03
OPEN P1 [MISSION/RUN/EXECUTION] Three competing WorkOrder identity schemes
WHY: 
EV: 
ACC: 

## MRE-04
OPEN P2 [MISSION/RUN/EXECUTION] Attempt identity and retry numbering
WHY: 
EV: 
ACC: 

## MRE-05
OPEN P1 [MISSION/RUN/EXECUTION] Mission state ≠ Object state
WHY: 
EV: 
ACC: 

## MRE-06
IN_PROGRESS P1 [MISSION/RUN/EXECUTION] Execution ≠ Authorization (Python/JS boundary)
WHY: 
EV: 
ACC: 

## MRE-07
IN_PROGRESS P2 [MISSION/RUN/EXECUTION] Worktree isolation for agent runs
WHY: 
EV: 
ACC: 

## MRE-08
DECISION P2 [MISSION/RUN/EXECUTION] Retry ownership: PING vs Temporal
WHY: 
EV: 
ACC: 

## MRE-09
BLOCKED P1 [MISSION/RUN/EXECUTION] A6 restart resilience: remediation unproven
WHY: 
EV: 
ACC: 

## MRE-10
OPEN P1 [MISSION/RUN/EXECUTION] Result truth: worker is not the judge of its own correctness
WHY: 
EV: 
ACC: 

## MRE-11
DECISION P1 [MISSION/RUN/EXECUTION] Durable orchestration journal: same-transaction discipline
WHY: 
EV: 
ACC: 

## MRE-12
OPEN P2 [MISSION/RUN/EXECUTION] UNKNOWN reconciliation and envelope time-field honesty
WHY: 
EV: 
ACC: 

## MRE-13
OPEN P3 [MISSION/RUN/EXECUTION] Mission taxonomy collapse (20 types → 1 worker)
WHY: 
EV: 
ACC: 

## MRE-14
OPEN P1 [MISSION/RUN/EXECUTION] Live vs certified identity divergence (the sharpest contradiction)
WHY: 
EV: 
ACC: 

## MRE-15
OPEN P3 [MISSION/RUN/EXECUTION] Empty legacy mission tables vs live mission truth
WHY: 
EV: 
ACC: 

## LL-01
OPEN P1 [LEARNING LOOP] The loop executes but does not learn (core finding)
WHY: 
EV: 
ACC: 

## LL-02
OPEN P1 [LEARNING LOOP] Mission-result consumers: dead ends inventory
WHY: 
EV: 
ACC: 

## LL-03
OPEN P1 [LEARNING LOOP] Approval event producer (highest-leverage close)
WHY: 
EV: 
ACC: 

## LL-04
IN_PROGRESS P1 [LEARNING LOOP] Test-scoped compounding proof → production wiring
WHY: 
EV: 
ACC: 

## LL-05
OPEN P1 [LEARNING LOOP] Self-certification seam: emitter must never mint VERIFIED
WHY: 
EV: 
ACC: 

## LL-06
OPEN P1 [LEARNING LOOP] Unauthenticated knowledge write path (POST /knowledge/nodes + /edges)
WHY: 
EV: 
ACC: 

## LL-07
OPEN P2 [LEARNING LOOP] Negative knowledge states absent as code
WHY: 
EV: 
ACC: 

## LL-08
HARVEST P2 [LEARNING LOOP] Freshness, dependency edges, targeted recompile (the moat mechanism)
WHY: 
EV: 
ACC: 

## LL-09
OPEN P2 [LEARNING LOOP] Outcome feedback: A4 observed but not wired to business events
WHY: 
EV: 
ACC: 

## LL-10
HARVEST P3 [LEARNING LOOP] Execution feedback dataset / trajectory-level evaluation
WHY: 
EV: 
ACC: 

## LL-11
OPEN P2 [LEARNING LOOP] Deterministic consumers of learnings (promotion replay)
WHY: 
EV: 
ACC: 

## LL-12
DECISION P1 [LEARNING LOOP] Emitter vocabulary: OBSERVATION/HYPOTHESIS/CANDIDATE_LEARNING only
WHY: 
EV: 
ACC: 

## HO-01
OPEN P1 [HEALTH+OBSERVABILITY] /health claims healthy with zero checks registered
WHY: 
EV: 
ACC: 

## HO-02
IN_PROGRESS P1 [HEALTH+OBSERVABILITY] No green labels for "not configured" (global rule)
WHY: 
EV: 
ACC: 

## HO-03
OPEN P1 [HEALTH+OBSERVABILITY] Recovery state classification (ladder states as evidence)
WHY: 
EV: 
ACC: 

## HO-04
OPEN P1 [HEALTH+OBSERVABILITY] Exact runtime/build provenance (deployments.log + digests)
WHY: 
EV: 
ACC: 

## HO-05
OPEN P2 [HEALTH+OBSERVABILITY] Qdrant truthfulness: projection event precedes the write; embeddings are pseudo-vectors
WHY: 
EV: 
ACC: 

## HO-06
OPEN P2 [HEALTH+OBSERVABILITY] Redis truthfulness: built, never live, zero requirers
WHY: 
EV: 
ACC: 

## HO-07
OPEN P2 [HEALTH+OBSERVABILITY] Health ≠ durability (document the boundary)
WHY: 
EV: 
ACC: 

## HO-09
OPEN P2 [HEALTH+OBSERVABILITY] Migration failure vs Postgres failure (distinct recovery states)
WHY: 
EV: 
ACC: 

## HO-10
OPEN P3 [HEALTH+OBSERVABILITY] Nothing watches the watcher; Pig/Oracle health divergence
WHY: 
EV: 
ACC: 

## HO-11
OPEN P2 [HEALTH+OBSERVABILITY] Era markers: Era 12 vs Era 13 witness leaves; identity eras
WHY: 
EV: 
ACC: 

## HO-12
OPEN P2 [HEALTH+OBSERVABILITY] Seed contamination: 8 fictional rows in canonical truth
WHY: 
EV: 
ACC: 

## AG-01
DONE_VERIFIED P1 [AGENTS] Capability-gated action: READ/REASON/PROPOSE/ACT only with capability
WHY: 
EV: 
ACC: 

## AG-02
OPEN P2 [AGENTS] Kill the phantom CapabilityAuthority claim
WHY: 
EV: 
ACC: 

## AG-03
DONE_VERIFIED P1 [AGENTS] Agent output ≠ canonical truth (envelope validates, never verifies)
WHY: 
EV: 
ACC: 

## AG-04
OPEN P1 [AGENTS] Proposals bind the exact proposed transition digest; approval approves that exact digest
WHY: 
EV: 
ACC: 

## AG-05
DECISION P1 [AGENTS] One durable human approval gate (merge the two mechanisms)
WHY: 
EV: 
ACC: 

## AG-06
HARVEST P3 [AGENTS] Capability vocabularies: do not promote to orchestration language yet
WHY: 
EV: 
ACC: 

## AG-07
OPEN P2 [AGENTS] MISSION/CAPABILITY/EXECUTOR are collapsed in the WorkOrder (name it or separate it)
WHY: 
EV: 
ACC: 

## AG-08
OPEN P2 [AGENTS] Context-pack binding: equality is not provenance
WHY: 
EV: 
ACC: 

## AG-09
OPEN P2 [AGENTS] Lineage DAG legality: no cycle detection anywhere
WHY: 
EV: 
ACC: 