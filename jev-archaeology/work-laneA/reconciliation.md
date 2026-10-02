# LANE A — Reconciliation

## Claim (a): prior convergence program established UnifiedEventRuntime → ping_events as LIVE canonical event authority

VERIFIED, with the real artifacts (not the exact names in the task brief):

1. docs/EXECUTION_EVIDENCE_LEDGER.md (2026-08-27, branch constitutional-convergence-v2 @ 828520ea) — EMPR live probes:
   - POST /ingest → canonicalization_service → unified_event_runtime; 3 real events → HTTP 201 (not mocks, not direct DB).
   - Full 9-hop causal chain (REVIEW_RECEIVED → ... → LINEAGE_CREATED), each causation_id = previous event_id, single correlation root, namespace=tenant::hpp preserved — verified via direct Postgres query.
   - ping_events count-matching: 1050 → 1091 (+41) → 1132 (+41); second window baseline 1214 → 1255 (+41) "exact ledger match".
   - Canonical truth index: "Durable event history: ping_events table (Postgres) | live queries"; "Live event persistence winner: unified_event_runtime + bridge path".
2. CERTIFICATION.md + CONTRADICTIONS.md @ commit e01ffc57c (2026-09-18, constitutional-convergence-v2): single-authority certification of UnifiedEventRuntime.emit() → ping_events (exactly one INSERT repo-wide, ON CONFLICT DO NOTHING, zero UPDATE/DELETE; 8 legacy writer stacks enumerated 6 dead / 1 dormant DDL / 1 legacy-dormant; falsification log — all claims survived).
3. docs/LIVE_ARROW_AUDIT.md (2026-08-21) + docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md (2026-08-28): live spine arrows POST /ingest → emit → ping_events → EventToMissionBridge → MissionScheduler → WorkerRuntime.dispatch → 8 canonical workers.

NOT FOUND (do not exist anywhere in repo, code, docs, or history):
- "Ledger 77" — zero matches repo-wide.
- "GOVERNANCE_AUDIT_PHASE_D_PROBE_MATRIX" — zero matches repo-wide.
- Any file literally named "Phase D probe matrix". The real Phase-D-adjacent artifacts are the ones above (EXECUTION_EVIDENCE_LEDGER, LIVE_ARROW_AUDIT, P3 ledger, CERTIFICATION).
- Verdict on (a): the SUBSTANCE is verified (live probes exist and are cited with file/commit), but the specific artifact names "Ledger 77" / "GOVERNANCE_AUDIT_PHASE_D_PROBE_MATRIX" are not real. Anyone citing them is citing something that does not exist; cite the real artifacts instead.

## Claim (b): ConstitutionalEventStore / EventRepository / IEventAuthority / AcquisitionManager findings

- ConstitutionalEventStore: PHANTOM. Zero code in all 13 worktrees; exists only as a row in the Sep-18 CONTRADICTIONS.md: "Names exist only in side-branch docs; no code." Classification from the prior program: UNKNOWN (phantom). My re-verification: still zero.
- AcquisitionManager: PHANTOM. Same as above — same contradiction row, zero code. UNKNOWN (phantom).
- EventRepository: REAL but DORMANT. Instantiated in live boot (GatewayToKernelAdapter), DDL executes (repository_events + event_processing), but appendEvent has zero live callers (executeEvent uncalled; all other caller modules dead). Readers (kernel EventReadAuthority) return empty live. Side-branch orca-autonomy added project() adapter — unmerged. Prior classification LEGACY/dormant upstream domain store — CONFIRMED on current main.
- IEventAuthority: REAL but DORMANT. TS in-memory pub/sub interface, zero importers/implementers. Prior classification DORMANT — CONFIRMED.
- EventAuthority.computeEventIdFromEvent: PHANTOM NAME. Zero matches anywhere including docs and full history. Never existed.

## Reconciliation conclusion

- LIVE CANONICAL event authority on current main (refactor/runtime-authority-convergence @ cc6856c3b): **UnifiedEventRuntime.emit() → PostgreSQL ping_events**. Verified by live boot wiring (gateway_runtime.js:433-439), exactly-one-writer sweep (no other live INSERT into ping_events), all producers routed through emit(), and the EMPR probe ledgers above.
- EventRepository = LEGACY/DORMANT adapter (boot-instantiated, writerless, upstream domain store; bridge ingress only). Not a competing live authority.
- IEventAuthority = DORMANT unrealized interface. Not an authority.
- ConstitutionalEventStore / AcquisitionManager / computeEventIdFromEvent = PHANTOMS (doc-only or nonexistent names). Not components.
- CanonicalEventEnvelope → canonical_events = live COMPATIBILITY ADAPTER (upstream ingress converging via EventBridge → emit()). Not the canonical store.
- The Sep-18 convergence branch (constitutional-convergence-v2) certified the same conclusion AND additionally mutated emit() to IdentityAuthority event_<16hex> IDs. That mutation was NEVER merged into main. Main's emit() still uses inline sha256(JSON.stringify()) 64-hex IDs with its own P0 collision law (ccfef91f3). So: same canonical authority, different identity law, on two unmerged tracks.

## Contradictions / caveats

1. The authority-law side branch (constitutional-convergence-authority-law @ 1995f0a59, "collision-safe event identity with canonical-hash witness") is a 1000+ line divergent rewrite of unified_event_runtime.js + gateway_runtime.js — unmerged. If any lane cites it as live, that is false.
2. constitutional-authorities.yaml (repo root) is partially stale: references runtime/kernel/witness/* files deleted in S.16 Epic A; treats cryptographic-authorities.ts as present ("Must eliminate") though deleted.
3. Main's live /events/stats read path first queries repository_events (dormant/empty) and only then falls back to ping_events — a stale read-order artifact, harmless but evidence the kernel read authority was built for the wrong table.
4. EventBridge's _skipGovernance:true ingress (C-008) remains the known hardening gap on the live path.
5. runtime/constitutional/ (PATCH 7A/7B, main, Sep 21) introduces a NEWER IdentityAuthority/HashAuthority stack wired into /identities routes — parallel to, not integrated with, the event emit path. Two identity laws coexist in main (emit's inline crypto for events; constitutional IdentityAuthority for identities/objects).
