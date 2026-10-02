# H2 Proof Bundle — FYD wired to PING's real social backend (2026-09-21)

**Gateway:** repo-booted PING gateway, `http://127.0.0.1:18199` on the Pig,
from `/home/nolan/ping @ 4c098334c` (`gateway/server.js`), setsid+nohup persistent.
**Database:** `ping-fyd-demo`, FRESH database on the `ping-test-pg` container
(Pig `127.0.0.1:55433`). No existing database was touched, dropped, or migrated.

**DDL applied (fresh DB only):**
- `ping_events` per `ping-runtime/events/unified_event_runtime.js:44-63`, PLUS the
  gap fix: `ping_events.sequence BIGINT NOT NULL DEFAULT nextval('ping_events_sequence_seq')`
  (the projector FAILS CLOSED on null sequences and no repo DDL creates the column;
  `UnifiedEventRuntime.emit()` never assigns it, so a BIGSERIAL-equivalent default
  is the correct owner).
- Projection tables from `database/ping_objects.sql` (unchanged).

## Files

- `identities.json` — Alice Dev / Bob Dev / Carol Dev mints (dev identities only).
- `follow-response.json` — POST /api/fyd/social/follow (Alice -> Bob): attested
  success, deterministic relationship_id recomputed via IdentityAuthority (MATCH).
- `journal-follows.json` — GET /events/RELATIONSHIP_CREATED filtered
  (subject=A, predicate=follows, object=B): 1 row, status active, seq 715;
  plus Carol's revocation cycle active(747) -> inactive(748) -> active(749).
- `projection-follows.json` — real `PingProjector.rebuildAll()` output:
  both follows project to active via last-wins; an intermediate rebuild
  proved the inactive flip too.
- `state-reads.json` — GET /api/fyd/social/state for all three identities:
  Alice follows Bob; Bob has two followers; all counts journal-projected.
- `feed-proof.json` — Bob's post appears in Alice's and Carol's feeds
  (follower visibility), likeCount projected live.

## What FYD renders from PING vs what is local

From PING (live, per request): identity/profile views, following/follower
lists and counts, relationship status, feed posts, like counts.
Local to FYD (no PING duplication): the HTTP client, the bff-envelope@1
signing construction (verbatim port of the shared dev canonicalization),
dev key custody layout, deterministic action IDs (C1), the attestation gate
(C4), and route-handler plumbing. No social runtime, event store, graph DB,
or vocabulary was rebuilt.
