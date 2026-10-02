# BASELINE SCOREBOARD - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY. Pre-GO values.
Every value is marked OBSERVED (independent two-site verification or read-only replay),
HYPOTHESIS (lane self-report or inferred), or UNKNOWN (to be established before GO).

---

## Reached edges (OBSERVED)

| Edge | State |
|------|-------|
| EVIDENCE → PROCESSOR | BROKEN (orca-run-mu6wmbzn lost result + lifecycle events) |
| APPROVAL → PROJECTION | BROKEN (manual re-dump required; approve/clear path) |
| OBSERVATION → CLAIM | WEAK (6/10 claims tied to evidence; 4/10 weak/unknown) |
| RETRIEVAL → ASK | DEGRADED (Qdrant down; no indicator; possible pseudo-vector reach) |
| TENANT → NAMESPACE | BROKEN at bridge (launders to core::system); ASSUMED-FAILING at MC |
| DISPATCH → EXTERNAL EFFECT | HELD (no autonomous external-effect execution per sprint scope) |

## Proven assumptions (OBSERVED)

- 195-test floor: floor exists, NOT rerun after 2026-09-28 live changes (UNVERIFIED current state).
- Phase1 approval door: 17/17 + byte-identical replay, FROZEN at af7d2688.
- E1 baseline: 19/25 = 0.760 top-1, rerunnable, frozen (sha256-verified 2026-09-28).
- Source ≠ build ≠ served: skew observed 2026-09-29 00:50 UTC (served build DqZQX-gQgkpciv6rpLgG3 predates branch HEAD).
- :3100 serves /home/nolan/projects/ping, demo flag live (verified, no restart needed).

## Convergence (HYPOTHESIS unless noted)

| Decision | State |
|----------|-------|
| HOLD/UNKNOWN winner (f01 vs S5 vs classify) | UNKNOWN (T-06 pending) |
| Identity contract | UNKNOWN (T-12 pending; no new class authorized) |
| ContextPack fix (H1/H2/H3) | UNKNOWN (T-08 pending) |
| Decision-record schema | UNKNOWN (T-11 pending) |
| WorkOrder/ResultEnvelope canonical | OBSERVED-partial: E1 live; authority posture unverified (T-15) |
| Projection-invalidation generic path | UNKNOWN (T-17 search pending) |
| Tenant-kit (P-092) | HYPOTHESIS: exists unpushed, "integrated" claim unverified (T-13) |

## Dirty semantic units

- 62 registered worktrees: 306 porcelain entries total; canonical tree 144 (74 M, 70 ??).
- Other clones: constitutional-runtime 3371 M (commits durable on remote); CRX_REMOTE 1694; /home/nolan/ping 32.
- Preservation map: 04-DIRTY-WORK-PRESERVATION-MAP.md. Classification: FREEZE 8 / HARVEST 14 / CONVERGE 4 / KEEP 5 / WIRE 0 / SUPERSEDE 0 / DELETE-LATER 0 / BUILD 0.
- Zero lost implementation value is the metric, not zero dirty files.

## Hostile tests

| Test | State |
|------|-------|
| J-16 (well-formed lie) | gap PROVEN at code level (verifyResultEnvelope verifies valid); red-team execution UNVERIFIED (T-15) |
| J-19 (cross-tenant) | 9-case suite READY (prepared, not run) |
| Wave A (4 safety repros) | PREPARED (T-01..T-04) |
| Wave B (8-case corpus) | PREPARED (T-05) |
| Wave C (evidence loss) | PREPARED (T-08) |
| build-idem 13 gates | HYPOTHESIS (exists in dirty worktree, uncommitted) |
| arrow-1 hostile proofs | HYPOTHESIS (copilot branch, unverified) |
| E1 baseline rerun | OBSERVED 19/25 (2026-09-28; re-verify at T-20) |

## Authority bypasses (OBSERVED unless noted)

1. Bridge tenant laundering → core::system (code-confirmed).
2. MC dispatch tenant from body, no caller auth (code-confirmed).
3. ContextPack cross-tenant reference (contract-confirmed; exploitation unverified).
4. MC projection global reads (code-confirmed).
5. Identity: 1 untrusted-input acceptance + 1 bad reconstruction (audit-confirmed).
6. Retrieval fail-silent [] (code-confirmed).
7. Pseudo-vector reachability: UNKNOWN (T-09).
8. Reaper resets HOLD → created → redispatch: design gap OPEN (AGENTS.md); live verification pending (T-07).

## UNKNOWN risks (Top 10 short form; full text in 00-TOP-10-UNKNOWNS.md)

1. Caller-to-tenant entitlement authority - first-24h impact: BLOCKS real-owner paths.
2. Bridge tenant laundering - BLOCKS all tenant claims until fail-closed.
3. HOLD/UNKNOWN winner - BLOCKS consequential dispatch.
4. Identity winner - BLOCKS real-owner and cross-tenant paths.
5. Projection-invalidation semantics - BLOCKS approve-to-serve trust.
6. WorkOrder/ResultEnvelope canonical + authority - BLOCKS worker autonomy.
7. ORCA ContextPack loss cause - BLOCKS Ask FYD trust.
8. Pseudo-vector reachability - retrieval corrupt-by-construction risk.
9. Repo→tenant binding - BLOCKS GitHub ingestion.
10. Decision-record schema - BLOCKS observability convergence.

## Observable decisions

- 15 decision records exist (9 evaluated + 6 shadow); schema unconverged (T-11).
- TypedDecision proposal exists; search-first (03#1).
- MC projection queries must work against the converged schema (acceptance).

## Jev contracts

- E1: frozen, corpus sha f59eaf79078041b869a1825a18631a3a0900ce64c6e4e1dde64dc7039d2765ec, baseline 0.760. PARKED (no calls).
- E2: parked. Mechanical release condition unmet.
- Shadow mode only until E1/E2 release.

## Human steps

- Approval door: phase1 17/17, FROZEN, terminal-first ratified. Human-authority steps stay human (D-04c).
- WAITING_APPROVAL triage primitive: genuinely missing (inventory).
- Jev selects, never authorizes. No new claim authority.

## Net LOC / dependencies / authorities / truth stores (HYPOTHESIS - forest inventory, unverified)

- 63 implementations across 38 worktrees + second repo (inventory claim).
- 7 envelope shapes; 4 decision-record shapes; 3 identity_authority.js copies (byte-identical, sha c05060d0); duplicate retrieval worker copies (all DIFFER).
- Authorities with one semantic owner each (SOUL.md rule of one): identity, tenant, entitlement, namespace, approval, HOLD/reconciliation, ContextPack, retrieval, projection, decision records, evidence, journal, dispatch. Several have competing implementations; convergence pending.
- Truth stores: MC journal (one global JSONL, unscoped - the scoping gap); FYD projections (manual re-dump); decision records (unconverged schema).

## Runtime / restart / replay proofs

- :3100: healthy, demo flag live; restart ONLY via /home/nolan/start-3100.sh (non-PTY, stdio to files).
- Phase1 replay: byte-identical journal+projections (proven).
- E1 baseline: deterministic rerun (proven 2026-09-28).
- Full-system replay (run state → decisions → projections): NOT proven (recovery/uniqueness gaps).

---

Scoreboard rule: a HYPOTHESIS becomes OBSERVED only through independent replay from a clean checkout or two-site byte verification. Lane self-reports never promote a value.
