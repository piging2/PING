# AGENT 05 PROPOSAL 01 — PROPOSE ONLY (not applied to /home/nolan/ping)

## WHY
`runtime/authorities/identity_authority.py` claims in its module docstring to be
the single authority for identity generation and asserts "No worker or tool
calls uuid.uuid4() directly." The assertion is false as written: eight direct
`uuid.uuid4()` call sites exist in the production tree. The file is otherwise
correct and live (planner_worker, reasoner_worker import it). A false
"single authority" claim misleads convergence planning.

## EVIDENCE
- Docstring, `runtime/authorities/identity_authority.py:1-6`:
  "Every UUID/identity in the system originates from this class. No worker or
  tool calls uuid.uuid4() directly."
- Direct call sites (read-only grep, 2026-09-23):
  - `runtime/cognitive/supervisor.py:58` — `plan_id = str(uuid.uuid4())[:8]`
  - `runtime/adapters/google_drive/google_drive_ingestion_adapter.py:265` — `event_uuid = str(uuid.uuid4())`
  - `runtime/constitutional/event_chain.py:188,222` — `event_id = str(uuid.uuid4())`
  - `runtime/ingestion/drive_ingestor.py:136` — `event_id = str(uuid.uuid4())`
  - `runtime/kernel/workers/qdrant_projection_worker.py:308,351,390` — `id=str(uuid.uuid4())`
- Liveness: none of the eight sites is imported by any live module (no
  importers found outside worktrees); all are DORMANT. The two live consumers
  of this file (`runtime/workers/planner_worker.py:69`,
  `runtime/workers/reasoner_worker.py:86`) correctly use
  `IdentityAuthority.generate_id()`.
- This class mints time-ordered uuidv7 worker-internal ids (card_id,
  analysis_id); it does NOT mint constitutional content-derived ids
  (`identity_<16hex>`), which come from the TypeScript constitutional
  IdentityAuthority.

## MINIMUM CHANGE (docstring only, zero behavioral blast radius)
```diff
--- a/runtime/authorities/identity_authority.py
+++ b/runtime/authorities/identity_authority.py
@@ -1,8 +1,15 @@
-"""IdentityAuthority — single authority for identity generation.
+"""IdentityAuthority — authority for worker-internal identity generation.
 
-Every UUID/identity in the system originates from this class.
-No worker or tool calls uuid.uuid4() directly.
+Worker-internal UUIDs (e.g. card_id, analysis_id) originate from this class.
 Uses uuidv7 (RFC 9562) backed by PostgreSQL when available, pure-Python otherwise.
+
+Scope note: uuid.uuid4() call sites still exist in dormant modules
+(runtime/cognitive/supervisor.py, runtime/constitutional/event_chain.py,
+runtime/ingestion/drive_ingestor.py,
+runtime/adapters/google_drive/google_drive_ingestion_adapter.py,
+runtime/kernel/workers/qdrant_projection_worker.py); the "no direct uuid4"
+claim is aspirational, not verified. Constitutional content-derived IDs
+(identity_<16hex>, object_<16hex>) are minted by the TypeScript
+constitutional IdentityAuthority (runtime/constitutional/src), not here.
 """
```

## TEST
- Change is docstring-only; no code paths affected.
- Syntax of the proposed file validated read-only: reconstructed the proposed
  file locally and ran `ast.parse` on the local copy (no writes to
  /home/nolan/ping). Result: PASS.
- (Lesson 2026-09-23: `python3 -m py_compile` against the live tree writes
  `__pycache__`; artifacts were removed and `git status` verified clean.
  Future checks use `ast.parse` on local copies.)

## RESULT
PROPOSED ONLY — not applied. Awaiting convergence-wave approval.
