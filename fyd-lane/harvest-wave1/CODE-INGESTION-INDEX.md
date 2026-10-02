# GitHub Harvest — Code Ingestion Index (2026-09-21, route-around)

The GitHub API pipeline remains DOWN (standing record: egress-proxy fault,
`RemoteDisconnected` on `/rate_limit`; do NOT regenerate the credential).
Ingestion was completed via the Pig bridge route-around, read-only.

## Provenance

- Source repos (read-only, no git writes):
  - `/home/nolan/ping` @ `4c098334c` (branch `refactor/runtime-authority-convergence`)
    — PING runtime, home of harvest candidates C1–C9.
  - `/home/nolan/projects/ping` @ `3091ea7` (branch `fyd/sitespec-generator`)
    — PING website + FYD SiteSpec work (placement coordinator active; untouched).
- Transfer method: `~/workspace/pig/pigwsl-run.sh` + Python 2000-char base64
  chunking with per-chunk md5 + full-file md5 verification (fold -w is unsafe
  above ~2000 cols). Every file below verified OK on all three checks.
- Destination: `~/workspace/fyd-lane/harvest-wave1/code-evidence/`
- No file was modified in either repo. No commits. No credential touched.

## Ingested files

| File (local) | Bytes | md5 | Source path | Serves |
|---|---|---|---|---|
| unified_event_runtime.js | 14770 | 047521cac5dd78c7647ef7f8750ffdb8 | /home/nolan/ping/ping-runtime/events/unified_event_runtime.js | C1 |
| evidence_authority.js | 7788 | cf3a8a4749a3d29e7599439ad4283f23 | /home/nolan/ping/ping-runtime/evidence/evidence_authority.js | C3 |
| event_to_mission_bridge.js | 6086 | f5123777556dd7ad74c034e78a4c7f20 | /home/nolan/ping/ping-runtime/orchestration/event_to_mission_bridge.js | C2 (recorded) |
| capability_resolver.js | 3581 | 9f8e045031396ec78e2c563d9c6e2b0c | /home/nolan/ping/ping-runtime/runtime/capability_resolver.js | C5 (recorded) |
| canonical_workers.js | 28289 | 755abd16eba87f0f7456f91ca25a5474 | /home/nolan/ping/ping-runtime/workers/canonical_workers.js | C4, C6, C7 |
| README-ping-runtime.md | 17 | d2ba77defdd6b463cd714be6e7a72e33 | /home/nolan/ping/README.md | context |
| README-projects-ping.md | 916 | 0cdcc455e989021be3a3ea68fe98c493 | /home/nolan/projects/ping/README.md | context |
| tenant.ping.v1.json | 2180 | f5073291f30a7b49fad7804fc0154bc1 | /home/nolan/projects/ping/src/config/tenant.ping.v1.json | C9 (recorded) |
| tenant-config.ts | 3173 | e8cb8e3d7fccdf8dcc021317fb7016f2 | /home/nolan/projects/ping/src/lib/tenant-config.ts | C9 (recorded) |
| identity-authority-constitutional.ts | 4376 | fecfd92dadd10d10721730c34c1cfba7 | /home/nolan/ping/runtime/constitutional/src/identity-authority.ts | C10 |
| identity-authority-kernel.ts | 1205 | d2f86f8dbdf4bf9b95eee71550171ca2 | /home/nolan/ping/runtime/kernel/identity/identity-authority.ts | C10 |
| hash-authority.ts | 4840 | 82241ce8290c69151f4f382270cb97d3 | /home/nolan/ping/runtime/constitutional/src/hash-authority.ts | C10, C1 fix |
| ping-identity.ts | 7020 | f612309cc3e07e8bbef45f36f57fca5f | /home/nolan/ping/runtime/constitutional/src/ping-identity.ts | C10 |
| ping-canonical-envelope.ts | 7085 | f8951b732cf61e721d5fc9d59a6eb475 | /home/nolan/ping/runtime/constitutional/src/ping-canonical-envelope.ts | C10 |
| replay_identity_authority.js | 5576 | 07e9c0a7c39805104982826c1190489b | /home/nolan/ping/runtime/kernel/authorities/replay_identity_authority.js | C10 |
| canonical_authority.js | 16748 | 0b6ab4fae1eaf59e111d611c7724e00f | /home/nolan/ping/runtime/kernel/authorities/canonical_authority.js | C10 (caution) |

## Code-level verifications (new, beyond the pattern report)

- **C1 pattern confirmed**: `emit()` hashes `{eventType, source, [namespace], logical_id|payload}`
  with SHA-256 and persists via `INSERT ... ON CONFLICT (event_id) DO NOTHING`
  (rowCount>0 = persisted, else dedup). The key-order flag is REAL in this file
  (raw `JSON.stringify`); the fix lives in the constitutional subsystem.
- **C3 pattern confirmed**: `EvidenceAuthority.verify` recomputes the canonical
  hash via `canonicalObjectVerifier`, checks lineage + namespace, returns
  `{verified, reason, checks}` — never asserts. `rank` maps null confidence to
  0.5, never 1.0. Header law: "never mutates events, only reads."
- **C4 pattern confirmed**: `WitnessWorker.handle` "W7" gate — on REPLAY_COMPLETED
  with `verified !== true`, emits `WITNESS_REJECTED(reason=unverified_replay:<r>)`
  and returns `{status:'rejected'}`. Never fabricates an attestation.
- **C6 pattern confirmed**: `BaseWorker._emit` preserves namespace/correlation/
  causation, tags inherited confidence with `confidence_source='inherited'`,
  distinguishes explicit null from missing via `hasOwnProperty`.
- **C2 pattern confirmed** (recorded, not built): `EVENT_MISSION_MAP` maps
  e.g. `REPLAY_COMPLETED -> WITNESS_CREATE -> LINEAGE_CREATE` (terminal).
- **C5 pattern confirmed** (recorded, not built): `CapabilityResolver.load()`
  throws when `capability_registry.json` is missing; rejects duplicate names;
  computes a registry hash.
- **C10 identity-era answers** (from code, no longer UNANSWERED):
  - Identity era: content-hash era, TRANSITIONAL. Legacy JS spine uses raw
    `JSON.stringify` identity (insertion-order fragile); the constitutional TS
    subsystem (`IdentityAuthority` + `HashAuthority`) canonicalizes first
    (Patch 7B, blast radius verified 2026-09-21: zero persisted consumers of
    the old behavior). The kernel `IIdentityAuthority` is a dormant interface
    (UUIDv5-flavored method names) — do not harvest.
  - Canonical bytes (constitutional): `JSON.stringify(HashAuthority.
    canonicalizeObject(v))`, UTF-8. Recursive key sort (default sort order),
    arrays keep semantic order, undefined -> null. The JS kernel
    `CanonicalBytes.serialize()` is a SEPARATE domain-separated serializer for
    code analysis (hashFile/hashAST/...) — NOT the event-identity path. Do not
    confuse the two.
  - Hash domain: SHA-256 hex, everywhere.
  - Event era: `ping_events` Postgres journal, content-addressed primary key.
  - Replay contract: journal read-back exists only as an UNWIRED comment
    (D1 stands — fake replay). `ReplayIdentityAuthority` builds graphs from the
    in-memory reducer authority, not from journal read-back. Real positive
    datum: `ping-canonical-envelope.ts` recovered the exact byte construction
    of the 18 Patch-7B proof events from the live Oracle journal and
    re-verified them with the repo's own `PingIdentityGenerator`.
  - `CanonicalAuthority` (JS): required by 9 kernel files; instantiations
    observed only in archived worktree copies. Treat as UNVERIFIED for current
    runtime wiring — harvest the TS constitutional authorities, not this.

## Gaps and corrections vs the pattern report

- **Correction**: tenant config path is `src/config/tenant.ping.v1.json`, not
  `website/src/config/tenant.ping.v1.json` (report path was stale).
- **LICENSE**: no LICENSE file at either repo root (find, maxdepth 2). Recorded
  UNKNOWN — diligence gap remains, unchanged from the report.
- **ping-website / HPP**: no such directories at `/home/nolan` (2026-09-21).
  UNREACHABLE via this route; recorded, not retried.
- **/home/nolan/ping README**: 17 bytes (placeholder). No useful context.
- **/home/nolan/projects/ping HEAD**: `3091ea7` on `fyd/sitespec-generator`
  (the placement coordinator is committing; was `55c6ce6` at last check).
  This lane made zero writes there.
- GitHub API pipeline: still DOWN (standing record). This route-around is the
  ingestion completion for C1–C10 evidence; license confirmation and SHA pins
  for any future COPIED (not patterned) code still need the pipeline.
