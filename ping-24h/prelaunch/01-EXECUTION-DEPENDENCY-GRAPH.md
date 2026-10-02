# EXECUTION DEPENDENCY GRAPH - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY. No writes, no clock start.

Notation: A → B means B depends on A (A must resolve before B can be trusted).
[P] = promotion dependency (ordering required). [C] = safe to proceed concurrently.
Semantic units, not branches or filenames.

## The spine (promotion order for the first 24 hours)

```
U1 caller→tenant entitlement ──[P]──→ tenant authority boundary for ALL tenant-scoped work
U4 identity contract convergence ──[P]──→ U1 (entitlement needs the identity concepts separated)
U2 event-bridge namespace preservation ──[P]──→ Wave A hostile tests (tenant safety)
U3 HOLD/reconciliation winner ──[P]──→ any consequential dispatch
U7 ContextPack evidence-loss fix selection ──[P]──→ Ask FYD evidence claims
U8 pseudo-vector reachability audit ──[P]──→ retrieval integrity claims
U10 decision-record schema convergence ──[P]──→ Mission Control truth projection
U5 projection-invalidation semantics ──[P]──→ FYD approve→serve automation
U6 WorkOrder/ResultEnvelope convergence ──[P]──→ worker autonomy wave
U9 repo→tenant binding contract ──[P]──→ GitHub ingestion reached slice
```

Read as: U4 resolves before U1 can be built on; U1 and U2 resolve before Wave A hostile tests mean anything; U3 resolves before consequential dispatch; and so on.

## Dependency edges by subsystem

### Tenant authority
- identity concepts separated (U4) ──[P]──→ caller→tenant entitlement mechanism (U1) ──[P]──→ tenant-scoped dispatch, storage, events, evidence, ContextPack, search, workers, capabilities, credentials, Mission Control projection
- namespace preservation at bridge (U2) ──[P]──→ cross-boundary tenant attribution
- FYD journal gateway 400s (REACHED) ──[C]──→ U1/U2 work (the reached FYD seam is independent evidence, not a dependency)

### Namespace integrity
- U2 ──[P]──→ Wave A RED repros (bridge laundering; A→B ContextPack contamination; A→B MC projection contamination; MC caller-to-tenant gap)
- Wave A repros ──[C]──→ Wave B corpus prep (different semantic units, no shared writer)

### Evidence / ContextPack
- U7 fix selection ──[P]──→ Ask FYD evidence-bounded claims (P6 priority)
- U8 audit ──[P]──→ any retrieval-backed claim (Ask FYD, E1 treatment arm)
- E1 baseline frozen (0.760) ──[P]──→ E1/E2 release (mechanical condition)
- retrieval seam frozen + verification seam frozen + contracts versioned + corpus unchanged + baseline rerunnable ──[P]──→ RELEASE E1/E2

### WorkOrder / dispatch
- U6 envelope convergence ──[P]──→ worker autonomy wave (Wave 6)
- U3 reconciliation winner ──[P]──→ consequential dispatch (attempt fencing, run-state classification)
- authority posture per-order ──[P]──→ worker swap safety

### Verification
- U10 schema convergence ──[P]──→ Mission Control decision/authority/verification projection
- source = build = served binding ──[P]──→ any UI certification claim (standing gate)
- 195-test floor green on served tree ──[P]──→ certification of live changes

### HOLD / reconciliation
- U3 winner ──[P]──→ stuck-running watchdog deployment (explicitly held)
- U3 winner ──[P]──→ Wave 2 (recovery) execution tasks
- proven reconciliation lifecycle (13/13) ──[C]──→ U3 comparison (it is the yardstick, not a competitor)

### Outcomes / decision records
- U10 ──[P]──→ RECONCILIATION REQUIRED / FAILED VERIFICATION / POLICY DECISION attention items
- outcomes → candidate lesson → evidence → hypothesis → replay/counterfactual → falsification → promotion (learning loop, ABSENT; wrap and evaluate first, learn later)

### Mission Control
- U10 ──[P]──→ decision/authority/verification projection (one read-only projection answers three autonomy questions)
- source/build/serve binding ──[P]──→ any MC UI claim (served :3100 build was ~21h older than inspected worktree at audit time)

### Learning
- decision records journaled (U10) ──[P]──→ outcome → lesson pipeline
- Jev shadow records ──[C]──→ learning loop design (shadow is measurement, not learning)

### Repository ingestion
- U9 binding contract ──[P]──→ smallest trustworthy reached slice (AUTHORIZED REPO → … → MISSION IMPACT)
- no live ingestion today ──[C]──→ U9 planning (nothing to break)

### Projection invalidation
- U5 semantics ──[P]──→ FYD approve→serve automation (generic path, FYD as consumer #1)
- U5 semantics ──[P]──→ any other projection consumer
- manual re-dump (honest interim) ──[C]──→ U5 work (the wrinkle is documented, the loop stays testable)

## Parallelizable semantic units (safe for concurrent readers/falsifiers)

These units share no writer and no dependency edge; readers may work them in parallel:
1. U8 pseudo-vector reachability audit (read-only grep + reachability analysis)
2. U9 repo→tenant binding contract (design + authorization shape)
3. U10 decision-record schema round-trip test (read-only replay of 15 records)
4. E1 corpus integrity re-verification (sha256 + baseline rerun, no Jev calls)
5. Wave A RED repro preparation (fixtures, no fixes)
6. Wave B hostile corpus preparation (fixtures, no fixes)
7. Wave C evidence fixtures (orca-run-mu6wmbzn replay prep, no fixes)
8. Dirty-work preservation map completion (read-only inventory)
9. Do-not-reimplement register verification (search-first checks)
10. Baseline scoreboard evidence capture (read-only)

## Promotion gates (must resolve in order; later work cannot be trusted before)

1. U4 → U1 → any tenant-scoped build/test claim
2. U2 → Wave A hostile verdicts
3. U3 → consequential dispatch + watchdog
4. U7 → Ask FYD evidence claims
5. U8 → retrieval-backed claims
6. source=build=served → any UI certification
7. U10 → Mission Control truth claims
8. U5 → approve→serve automation claims
9. U6 → worker autonomy dispatch
10. U9 → GitHub ingestion claims
11. mechanical 5-condition → E1/E2 release

## Sprint waves and their dependency posture

- Wave 0 (baseline): no dependencies; capture everything now.
- Wave 1 (tenant safety): needs U1/U2/U4 resolved to trust results; repro prep is [C] now.
- Wave 2 (recovery): needs U3 resolved before execution; corpus prep is [C] now.
- Wave 3 (evidence): needs U7/U8 resolved before claims; fixture prep is [C] now.
- Wave 4 (decision observability): needs U10 schema; read-only projection after.
- Wave 5 (Jev tournament): needs mechanical 5-condition; frozen until then.
- Wave 6 (worker autonomy): needs U6 + U3; inventory now is [C].
- Wave 7 (GitHub reached slice): needs U9; contract planning now is [C].
- Wave 8 (projection continuity): needs U5; semantics work now is [C].
- Wave 9 (learning): needs U10 + journaled outcomes; design now is [C].
- Wave 10 (convergence + proven deletion): needs all above; deletion only after deadness proven.

Waves may overlap only when semantic ownership permits. One writer per semantic unit.
