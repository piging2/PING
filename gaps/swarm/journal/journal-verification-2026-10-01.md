# JOURNAL SWARM — independent verification report (2026-10-01 ~18:24-18:40 MDT)

Role: INDEPENDENT VERIFICATION ONLY. Read-only on served systems; all probe
writes confined to /tmp/jsw on the Pig (never served journals, never served trees).
Implementation worker commits verified, not duplicated.

## Repo SHAs inspected (local plane)
- /home/nolan/projects/ping @ feeed8315fab5f823f5923da745e25632664b275 (branch fyd/builder-harvest-trackc-2026-09-28)
- /home/nolan/projects/ping-fyd-converged @ 6405011d9623706c8a0b079a1d6a0da4b185e622 (branch fyd/convergence-2026-09-28)
- Implementation worker commits this turn: 4ad9a7a3 (18:24:10), 6405011d (18:25:46) on converged tree; ea497a94 (18:27:17), feeed831 (18:29:01) on ping tree.
- PLANE WARNING (verified): served :3100 = next-server PID 46070, started 1 day ago, i.e. BEFORE all fix commits. Served MC runs PRE-FIX code (old mc-dispatch JOURNAL_PATH, old approvals --journal). Fixes are REPO-plane only until the MC rebuild/restart the implementation lane owns. Never conflate.

## Q1 — writer inventory (spot-check, unique probe IDs jsw-*) — PASS with residual
Four production-capable writers exercised; each confirmed via the product's own reader:

1. Gateway :18199 (exact served server.mjs, scratch instance :18901, FYD_JOURNAL_STORE=/tmp/jsw/scratch/gw.jsonl):
   POST {request_id: jsw-q1-gw-001} -> {event_id: fyd-ovl-muq85kgd-c83fbf270ed6, deduped:false};
   GET /events/FYD_SITE_OVERLAY?tenant=jsw-tenant -> 1 event, same id. Scratch file 1 line; served J1 has 0 jsw lines.
   Live PID 850 environ: NO FYD_JOURNAL_STORE -> HERE-relative default -> J1 (canonical). Code path proven.
2. emit.py (new, ea497a94, scratch copy): FYD_JOURNAL_STORE=scratch -> appended to scratch; re-emit -> duplicate-skipped.
3. mc-dispatch.ts (new, 4ad9a7a3, real file via tsx): journalPath() unset -> THROW; set -> resolves; appendDispatchEvent x2 -> appended then duplicate-skipped (mc-d-819bc680ee38), scratch file exactly 1 line, J1 untouched.
4. Gateway :18200 (read-only GET /): self-reports store=.../ping-fyd-converged/data/fyd-journal/events.jsonl (J2); env FYD_JOURNAL_PORT=18200, no FYD_JOURNAL_STORE. Fork writer, zero consumers.

Implementation worker's claims VERIFIED: probe mc-d-e4d688f01c91 is in J1 (absent J2/J3) and visible via GET :18199/events/JOURNAL_CONVERGENCE_PROBE; their emit probe mc-bf-181888e405ec also in J1. tsc: no errors in any touched file (only pre-existing src/lib/secrets redteam test errors, unrelated lane).

Residual (dormant, not live writers): converged-tree mc-approval/emit.py still carries the OLD silent-fallback default but is unreferenced (approvals route uses /home/nolan/projects/ping/mc-approval); ~30 track-a spool copies of the old emit.py (no live processes); stale /home/nolan/workspace/fyd-journal-gateway/server.mjs (pre-tenant version, no process).

ADJACENT FINDING (reader, not writer): served /api/mc/today fetches /events/FYD_SITE_OVERLAY?limit=15 WITHOUT tenant -> gateway 400 tenant_required -> DEGRADED "journal overlays unreadable". The tenant-scoping hardening broke the product's own overlay reader. Not a truth fork; needs the route to pass tenant (or the reader contract to be updated).

## Q2 — fork classification (independent computation) — PASS (inventory's call confirmed)
J1: 66 lines, 66 unique ids, 0 parse errors, 0 dup ids. J2: 69/69. J3: 200/200.
Overlap: J2 has 4 unique vs J1 (fyd-ovl-mulye7z7-d09630ea3ee7, fyd-ovl-mulyer3l-992f4e6e6462, fyd-ovl-mumzkn87-a211ccecf0aa, fyd-ovl-muonkdeq-e8b1cc23fba7): real set/clear_presentation_intent ops + one FYD_VISITOR_INTENT estimate_request -> LEGITIMATE-CANONICAL-MISSING.
J3 has 193 unique vs J1|J2: MC operational history (approvals with approver nolan:demo-owner, mission receipts, pass pipeline, 59x MC_ARTIFACT_PUBLISHED) -> LEGITIMATE-CANONICAL-MISSING; a handful carry test-ish actors (p0-writer-w4, capability-provision-test, p0test) -> TEST/SYNTHETIC. 0 content mismatches on shared IDs across all three journals (identity stable; split is placement-only).
Classification: ARCHIVAL EVIDENCE. Preserve both fork files; no silent merge (ordering/authority vs J1 unadjudicated).

## Q3 — emit.py from misleading cwd — PASS
Old AND new emit.py resolve destination from env/home constants only, never cwd-relative. Runs from repo root, /tmp, ~, /tmp/jsw/nested/a/b with MC_JOURNAL_FILE/FYD_JOURNAL_STORE=scratch: all 4 events landed in the configured scratch file; find for stray events.jsonl in those cwds: none; served journals: 0 jsw lines.

## Q4 — canonical config missing — PASS on current code (was FAIL pre-ea497a94; superseded)
New emit.py: FYD_JOURNAL_STORE unset -> SystemExit("refusing to append..."); legacy MC_JOURNAL_FILE set + FYD_JOURNAL_STORE unset -> STILL SystemExit (no legacy rescue; second authority removed). mc-dispatch journalPath(): unset -> throw (fail closed). Gateway: default is a code constant (HERE-relative), deterministic and documented, not a silent surprise.
NOTE: my first Q4 probe hit the pre-fix emit.py (silent fallback to J3) — the implementation worker fixed it at 18:27:17; the FAIL is recorded against the old code, not current.

## Q5 — duplicate logical event across two writers — HONEST GAP (not a fork)
Per-writer dedupe all work: gateway request_id+tenant -> deduped:true, 1 line; emit.py event_id set -> duplicate-skipped; mc-dispatch content-derived mc-d-* id -> duplicate-skipped.
Cross-writer: same logical proposition with different event_ids -> BOTH appended (proven: 2 lines in scratch journal). There is NO shared identity rule and NO semantic dedupe: identity = exact event_id (file writers) or request_id+tenant (gateway); the three minting schemes differ (random fyd-ovl-*, sha-derived mc-pass-/mc-bf-/mc-apr-, sha-derived mc-d-*).
Smallest fix: document ONE event-identity contract (content-derived event_id across all writers) so file-level dedupe converges; until then, cross-writer double-append is possible and undetected.

## Q14 — replay determinism — PASS
J1 (67 lines, read-only copy) -> two clean projections with perturbed physical conditions (run B: shuffled input order, re-serialized with different key order + extra whitespace). Canonical normalization (sort_keys) + canonical order (timestamp, event_id). sha256 both runs: 70a3a955e9a3a296869592873fc3b445a3ff3b99f66dc5acabd50ff4871d7d84. MATCH.

## Q15 — journal destination across restart — PASS by code (no live restart per safety)
server.mjs: STORE resolved ONCE at module load from FYD_JOURNAL_STORE || HERE-relative default (HERE = script dir, cwd-independent); never recomputed; no rotation. start.sh sets no FYD_JOURNAL_STORE, cds to the script dir, execs node. PID 850 env has no FYD_JOURNAL_STORE -> restart via start.sh deterministically reopens J1. :18200 instance: FYD_JOURNAL_PORT=18200, own script dir -> deterministically reopens J2. Dedupe index rebuilt from store at startup (first record wins), deterministic.
Safe live test if ever needed: snapshot GET / store marker, restart via start.sh, compare marker. Not performed (served restart = owner/implementation call).

## Tripwire check — CLEAN
No new truth fork: only J1 modified in the last 120 min (two swarm probe events: JOURNAL_CONVERGENCE_PROBE mc-d-e4d688f01c91, MC_CHECKPOINT mc-bf-181888e405ec). No silent fallback in current code. Every writer accounted for (live: 850->J1, 40434->J2, MC writers->FYD_JOURNAL_STORE; dormant copies listed under Q1 residual).

## Smallest fixes still open
1. Served :3100 runs pre-fix code (PID 46070, started before the fix commits) -> MC rebuild/restart owns the served-plane convergence.
2. /api/mc/today overlay fetch needs tenant param (or reader contract update) -> currently DEGRADED "journal overlays unreadable".
3. Q5: no shared event-identity contract across writers -> document/adopt one (content-derived event_id) so cross-writer double-append is detected.

Evidence: this dir (q2-fork-classify.py, mcd-harness.ts); scratch /tmp/jsw on the Pig (ephemeral, safe to discard).
