# WRITER CANDIDATES - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY. NO writer is activated. The 100-hour clock has NOT started.
Writer slots activate ONLY at "GO - START 100H", 2-4 maximum, one writer per semantic unit.

## PRE-GO CORRECTIONS (Nolan, 2026-09-28 ~19:28 MDT, binding)

**Correction 1: U4 identity contract is a PROMOTION GATE for Candidate 1.**
The dependency graph orders U4 identity before U1 entitlement, but Candidate 1 groups
U1/U2 and could activate from a Wave A repro. That must not accidentally create an
entitlement implementation before the identity contract is settled. Rule: Candidate 1
may activate on a Wave A repro, but it must NOT implement entitlement boundaries until
U4 contract work is sufficient to make U1 coherent. U4 convergence is a promotion gate,
not necessarily a coding project: enumerate the identity handoffs (ENTITY ID, ACTOR ID,
CRYPTOGRAPHIC IDENTITY, TENANT/OWNER BINDING, AGENT ID), record per handoff CONCEPT /
MINTING AUTHORITY / VERIFYING AUTHORITY / TRUST BASIS / SOURCE / DESTINATION, converge
the CONTRACT first, then determine which existing implementations satisfy it. No
IdentityAuthority #5 under any circumstance.

**Correction 2: Candidate 4 is SPLIT into U5 (writable) and U10 (read-only).**
U10 decision records and U5 projection invalidation are related through freshness
evidence but are different semantic units. One writer may own both ONLY if the search
proves the implementation seam is actually shared. Default posture: keep one writer
active on U5 first (activate only after the T-17 forest-wide projection search), and
leave U10 READ-ONLY (schema convergence via round-trip of all 15 existing records)
until its round-trip chooses the record shape. No new decision store either way;
journal typed decisions through existing history.

## Candidate 1: Tenant authority / namespace propagation

- SEMANTIC UNIT: U1 entitlement + U2 namespace propagation (T-01, T-02, T-13, T-14 family)
- ELIGIBILITY: this unit is the Wave A safety gate; it needs a writer only if repros confirm the gap needs a fix (fail-closed boundaries). If repros falsify, no writer activates.
- COLLISION CHECK: no overlap with Candidates 2-4 (HOLD/recovery, ContextPack/evidence, decision records/projection). Overlaps the MC dispatch lane owner question (Q29) - resolved by this writer OWNING the dispatch tenant-binding surface exclusively.
- OWNER QUESTION INPUTS: Q1 (who can touch MC dispatch), Q29 (tenant binding on live requests), Q21 (tenant kit vs custom auth), Q30 (live-then-lock vs lock-then-live)
- FROZEN COMPETING WRITERS: none currently active; freeze Ask FYD, Ask Composer, social readers, object source, customize, identity writers against this surface per the directive.
- ACTIVATION PRECONDITION: at least one Wave A repro (T-01..T-04) confirms a live gap AND Nolan authorizes the fail-closed boundary fix AND the U4 identity-contract promotion gate is satisfied (Correction 1: U4 contract work sufficient to make U1 coherent; no entitlement implementation before the identity contract is settled).
- DO NOT: do not touch HOLD/recovery, ContextPack, decision records, projection, or identity contract.

## Candidate 2: HOLD / reconciliation / recovery

- SEMANTIC UNIT: U3 HOLD/reconciliation (T-05, T-06, T-07 family)
- ELIGIBILITY: the winner is unknown (f01 vs S5 vs classifyUnknownExecution). The writer activates only AFTER T-06 names the winner or a complementary convergence, and owns the single winner.
- COLLISION CHECK: no overlap with Candidates 1, 3, 4. The reaper gap (T-07) belongs to this writer exclusively. The stuck-running watchdog stays out of this writer's hands until the reaper gap is closed.
- OWNER QUESTION INPUTS: Q24 (competing runs, single owner), Q13 (work-item uniqueness during recovery)
- FROZEN COMPETING WRITERS: all other HOLD/UNKNOWN/reconciliation writers frozen until convergence (per directive: do not build another reconciliation system first).
- ACTIVATION PRECONDITION: T-06 scorecard complete AND (winner selected OR complementary-convergence design ratified).
- DO NOT: do not wire the watchdog; do not touch tenant authority, ContextPack, decision records, or projection.

## Candidate 3: ContextPack / evidence assembly

- SEMANTIC UNIT: U7 ContextPack (T-08 family)
- ELIGIBILITY: only after T-08 reproduces the exact loss (or falsifies it). Competing writers FROZEN per the directive (ContextPack writer freeze).
- COLLISION CHECK: no overlap with Candidates 1, 2, 4. The Ask FYD, Ask Composer, and social readers freeze under this unit (they consume ContextPack; they do not own it).
- OWNER QUESTION INPUTS: Q26 (ContextPack authority), Q2 (what counts as an answer when retrieval is degraded - retrieval reports VECTOR_UNAVAILABLE; this writer owns the pack that carries it)
- FROZEN COMPETING WRITERS: ask-loop branch work, context-compiler v2 author, tenanos-wave P-098 cache - all frozen; harvest candidates only.
- ACTIVATION PRECONDITION: T-08 repro confirms the loss AND the fix candidate (H1/H2/H3 from 03#3) is selected with byte-level proof.
- DO NOT: do not touch retrieval source (U8 is read-only audit), identity, HOLD, decision records, or projection. Retrieval failure semantics (Q28) are a separate read-only spec; this writer only carries the reported state.

## Candidate 4: Projection invalidation (U5 writable); decision records (U10 read-only)

- SEMANTIC UNIT: U5 projection invalidation is the WRITABLE unit (T-17 family). U10 decision records is READ-ONLY schema convergence (T-11) until its round-trip chooses the record shape. The two combine under one writer ONLY if the search proves the implementation seam is actually shared (Correction 2, Nolan 2026-09-28 ~19:28 MDT).
- ELIGIBILITY: this is the "make it durable and make it fresh" writer. Decision-record schema converges by round-trip (T-11); projection invalidation is spec-first (T-17) - the writer owns the generic path only if T-17 finds no existing one.
- COLLISION CHECK: no overlap with Candidates 1-3. If T-17 finds an existing generic path, this writer does NOT build (WIRE only, and only after owner review). FYD approve-to-redump is a CONSUMER, never the special case.
- OWNER QUESTION INPUTS: Q8 (decision identity), Q16 (decision records vs projection records - one object type per layer), Q22 (projection ownership)
- FROZEN COMPETING WRITERS: competing decision-record writers (jev shadow-recorder branch, shadow JSON writers) frozen until T-11 selects the schema.
- ACTIVATION PRECONDITION: T-17 forest-wide projection search complete AND (no existing generic path → BUILD the smallest generic contract; existing path → WIRE with owner review). U10 stays read-only: T-11 round-trips all 15 existing records through each candidate schema and selects the smallest lossless shape; journal typed decisions through existing history afterward. Combine U5+U10 under one writer only if the search proves a shared implementation seam.
- DO NOT: do not touch tenant authority, HOLD, ContextPack, identity, or FYD UI. No new store, no event bus.

## Why these four

1. Tenant authority/namespace: the Wave A safety gate. Everything consequential waits on it.
2. HOLD/recovery: the dispatch-safety gate. All consequential dispatch waits on it.
3. ContextPack: the first broken reached edge. Ask FYD waits on it.
4. Projection invalidation (U5): the freshness gate. Decision records (U10) converge read-only in parallel. The FYD proof workload waits on it.

One writer per semantic unit. No two candidates share a unit. No unit has two writers.
Slots 2-4 of the 4-maximum launch capacity; the directive allows fewer.

## Explicit non-writers at launch

- Identity contract (U4): read-only audit (T-12) first; converge the contract on paper; do NOT auto-build another IdentityAuthority.
- Retrieval (U8): read-only audit (T-09, T-10); quarantine if reached; no writer until the audit lands.
- WorkOrder/ResultEnvelope (U6): comparison (T-15) first; no writer until the canonical contract is named.
- Repo binding (U9): contract (T-16) first; no writer; no live ingestion.
- FYD UI/renderer: frozen proof workload; harvest candidates only; no new writer.
- Jev: frozen; shadow-only; no writer.
- MCP/Automerge: optionality preserved; no writer.
