# Sandbox execution pass (fleet-ora-2, 2026-09-24) — coordinator directive 2026-09-24

Sandbox-local only. The live Oracle host was used READ-ONLY (code fetch via docker exec cat;
no container was restarted, stopped, or modified). No docker in this sandbox; engines are
stand-ins where noted, REAL code where available.

## E1. Event-ingress chaos — REAL CanonicalizationService executed
Fetched read-only from the live gateway image (ping-gateway:candidate-3c5d280dd generation):
- /app/ping-runtime/canonicalization/canonicalization_service.js (190 lines)
- /app/ping-runtime/canonicalization/canonical_object.js
- /app/ping-runtime/authorities/{canonical,identity,constitutional_time}_authority.js
- /app/runtime/kernel/authorities/{canonical,identity,constitutional_time}_authority.js + constitutional_clock.js
- /app/infrastructure/physical_clock_adapter.js
Tree recreated 1:1 in fleet/work/fleet-ora-2/sandbox/tree/; service loads and runs under node v24.
Stub UnifiedEventRuntime implements the documented idempotency contract (logical_id -> same event_id;
collision on same logical_id with different content -> typed ID_COLLISION, original preserved).

20 adversarial injections across the 5 mission classes:
- duplicate (3x, timestamps differ): 1 APPLIED + 2 DUPLICATE — volatile-field stripping derives
  identical logical identity; single application confirmed.
- malformed (10 variants): 9 REJECTED_TYPED (typed Errors, never crashes), 1 APPLIED.
- oversized (10 MB payload): APPLIED, heap delta 28.9 MB (bounded ~3x, no blowup).
- collision (same logicalId, attacker payload): original APPLIED, attack REJECTED_TYPED (ID_COLLISION),
  original preserved.
- reordered (evidence refs future event): 3 APPLIED — boundary does not order (downstream's job);
  all classified, none lost.
Result: 100% classified, 0 uncaught exceptions (0 crashes), 0 unverified envelopes,
0 poisoned applied events (every applied envelope passes verifyCanonicalObject; attacker payload
never persisted). Criterion PASS at the boundary layer.

REAL FINDINGS (followups):
- F-E1: array payloads accepted — `typeof [1,2,3] === 'object'` passes the boundary guard in both
  routes/ingest.js and canonicalizeAndEmit. Recommend `Array.isArray` rejection (400).
- F-E2: no payload size cap anywhere in the boundary code; 10 MB applied cleanly. Bounded in practice
  (28.9 MB heap), but a 1 GB payload would not be rejected. Recommend a documented max + 413.

## E2. Store-loss drill — backup -> wipe -> rebuild -> digest verify (sqlite3 stand-in engine)
5000 digest-chained events (WAL mode) -> sqlite3 .backup (sha256 recorded) -> rm data files
(wipe confirmed) -> restore to fresh path -> full chain re-verification: 5000/5000 rows,
chain_bad=0, tail digest matches pre-wipe head. RTO (wipe -> verified): 238 ms. RESULT PASS.
Mechanics proven: backup integrity, total-loss rebuild, canonical-digest verification, measured RTO.
Engine-specific followups remain: postgres WAL replay / point-in-time restore and qdrant snapshot
restore must be rehearsed against the real engines on staging (F3/F4/F18 runbooks).

## E3. Disk-pressure resume — fill -> typed failure -> free -> clean resume
PRAGMA max_page_count used to impose a hard ceiling (the engine's own ENOSPC path):
- Fill: `OperationalError: database or disk is full` — TYPED, failed inserts rolled back
  (row count unchanged: no partial-write-as-success).
- Free (ceiling lifted): writes resume immediately; PRAGMA integrity_check = ok.
RESULT PASS. Proves the resume pattern for database stores (S1/S2 analogs); per-subject live
verification (docker pull failures on S3, log-driver behavior on S5/S6) remains owner followup.

## Verdict updates applied
- ORA-1301..1350 (store-loss, v1): NEEDS-FOLLOWUP -> ADAPT (E2). Engine-specific restore = staging.
- ORA-1501..1550 (event-ingress-chaos, v1): NEEDS-FOLLOWUP -> PROVEN (E1) w/ findings F-E1/F-E2.
- ORA-2931..2940 (disk-pressure case 8, v2): NEEDS-FOLLOWUP -> ADAPT (E3).
