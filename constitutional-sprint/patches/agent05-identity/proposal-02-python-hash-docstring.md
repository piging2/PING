# AGENT 05 PROPOSAL 02 — PROPOSE ONLY (not applied to /home/nolan/ping)

## WHY
`runtime/authorities/canonical_hash_authority.py` claims "Every SHA256 hash in
the system originates from this class. No worker or tool calls
hashlib.sha256() directly." False as written: multiple direct
`hashlib.sha256()` call sites exist, including one in a live worker. The
false claim hides real bypasses from convergence planning.

## EVIDENCE
- Docstring, `runtime/authorities/canonical_hash_authority.py:1-6`:
  "Every SHA256 hash in the system originates from this class. No worker or
  tool calls hashlib.sha256() directly."
- Direct call sites (read-only grep, 2026-09-23):
  - LIVE: `runtime/workers/retriever_worker.py:92` — `hashlib.sha256(text.encode()).hexdigest()`
    (seed for a deterministic pseudo-embedding; imported via
    `runtime/workers/__init__.py`, i.e. the live workers package)
  - DORMANT: `runtime/projection_worker/constitutional_projection_worker.py:79,209`,
    `runtime/workers/projection_worker.py:91`,
    `runtime/cognitive/projection_sovereignty.py:57`,
    `runtime/cognitive/models.py:141`, `runtime/cognitive/context_pack_cache.py:36,71`
    (no live importers found)
- None of these mint constitutional identity; they are cache keys, point ids,
  and embedding seeds. The bypass is real but scoped to non-identity hashing.

## MINIMUM CHANGE (docstring only, zero behavioral blast radius)
```diff
--- a/runtime/authorities/canonical_hash_authority.py
+++ b/runtime/authorities/canonical_hash_authority.py
@@ -1,8 +1,15 @@
-"""CanonicalHashAuthority — single authority for all hashing.
+"""CanonicalHashAuthority — authority for canonical-state hashing.
 
-Every SHA256 hash in the system originates from this class.
-No worker or tool calls hashlib.sha256() directly.
+Canonical (envelope) hashing goes through this class.
+
+Scope note: direct hashlib.sha256() call sites exist outside this class,
+including one live site (runtime/workers/retriever_worker.py, embedding
+seed) and several dormant ones (projection workers, cognitive cache).
+The "no direct hashlib" claim is aspirational, not verified. None of the
+bypass sites mint constitutional identity; they are cache keys, point ids,
+and embedding seeds.
 """
```

## TEST
- Change is docstring-only; no code paths affected.
- Syntax of the proposed file validated read-only: reconstructed the proposed
  file locally and ran `ast.parse` on the local copy (no writes to
  /home/nolan/ping). Result: PASS.

## RESULT
PROPOSED ONLY — not applied. Awaiting convergence-wave approval.
