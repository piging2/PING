# Git Ingestion Architecture

Worker: git-ingestion implementation lane. Date: 2026-10-02.
Binding threat register: `../threats/GIT-INGESTION-THREATS.md`.
Mechanism research: `../findings/ECOSYSTEM-HARVEST.md`.

## What this is

A parse-only acquisition path that turns git repositories into PING
`/ingest` packets. Module layout under `src/git_ingest/`:

| Module | Owns |
|---|---|
| `config.py` | Every cap from the threat doc's Global Boundaries table. Single owner; no numeric duplicates elsewhere (G-16). |
| `clone.py` | Read-only repo open, hardened bare-mirror fetch. Transport allowlist: `https://` + local paths only. |
| `snapshot.py` | Atomic ref snapshots; start/end comparison for the STALE protocol. |
| `validate.py` | Tree-entry gates (fsck parity), ref-name rules, symref hop cap, text sanitization. |
| `parse.py` | Blob metadata, in-memory tree walks, commit parsing, diffs, revwalks. |
| `envelope.py` | PING source envelope; canonical identity rule ported from the TS kit. |
| `packet.py` | Packet assembly: observations, quarantines, STALE, timeouts, byte/gitlink accounting. |
| `ingest_client.py` | The ONLY network module; POSTs to the configured PING gateway only. |

## Pipeline shape

```
open_repo_readonly / fetch_mirror
  -> take_ref_snapshot (atomic, by-OID from here on)
  -> validate + resolve refs (hop cap; bad refs dropped with typed entries)
  -> ref observations (GIT_REF_OBSERVED)
  -> walk_commits (topological, capped)
  -> per commit: parse_commit + diff_commit -> GIT_COMMIT_OBSERVED
  -> take_ref_snapshot (end)
  -> refs_moved? STALE (observations discarded, GIT_PACKET_STALE)
  -> post_packet (dry_run=True default; zero network until asked)
```

## Recorded design decisions

### 1. Signature verification is DEFERRED (T-06)

Ingestion records `{present, key_id, valid=None, trusted=False}` per
commit. The key id is parsed from the ASCII-armor envelope with a
minimal OpenPGP packet walk (issuer subpacket types 16/33); it is
UNVERIFIED metadata, never trust. Real verification belongs to a future
sandboxed verifier holding a PING-pinned keyring, because ingestion
spawns zero subprocesses: shelling out to gpg inside the parse path
would violate the parse-only invariant that the whole threat model
rests on (G-06, G-11). The `claimed_author` / `claimed_committer`
fields stay claims regardless of signature state; a valid signature
from an untrusted key never upgrades attribution.

### 2. Delta-chain depth and pack-expansion ratio: honest adaptation

libgit2/pygit2 exposes neither per-object delta-chain depth nor a
pack-expansion ratio. Re-implementing pack parsing to measure them
would make PING's parser the naive re-implementation the threat doc
warns about (T-01's lesson generalized). Instead the tripwires are
enforced indirectly, and this is documented rather than papered over:

- Declared size is checked BEFORE any read (`Blob.size`); anything over
  `MAX_BLOB_BYTES` returns truncated metadata with zero content bytes
  touched. libgit2 resolves deltas internally, but a delta chain that
  would blow the budget must still produce a declared size, and the
  declared size is what we gate on.
- Cumulative per-packet byte accounting (`_ByteAccountant`) bounds the
  total materialized surface.
- The packet wall-clock timeout (`PACKET_TIMEOUT_SECONDS`) bounds CPU
  burn from pathological delta reconstruction.
- `read_blob_meta` never materializes beyond the cap; chunked
  processing keeps the sniffing window bounded.

A future hardening step could add a pack-level pre-scan (walk pack
index v2, count delta references per object without resolving) as a
separate audited primitive; it is not in v1.

### 3. Blob content is metadata-only in v1

Observations carry `{sha, size, magic, is_text}` plus LFS-pointer and
polyglot-suspect flags. No blob bytes enter observations except
through hashes. Rationale: the v1 consumer is commit/ref intelligence
(attribution claims, change summaries, ref movement); blob content
indexing is a separate feature with its own threat review (rendering
and embedding are execution-adjacent, T-04). Commit messages ARE
included, sanitized and capped at `MAX_MESSAGE_BYTES`, because they
are the primary human signal per commit and the sanitization boundary
(T-11) is enforced at parse time.

### 4. Partial-clone skeleton is a future optimization, not v1

Findings record 5 (`--filter=blob:none` promisor packs, OID-keyed lazy
backfill) is the right shape for large-repo ingestion, but v1 opens
local repositories and fully-cloned bare mirrors. Reason: promisor
fetch introduces a network dependency on the origin staying reachable
mid-ingest and a deferred-OID bookkeeping obligation ("never certify
a diff complete without them"). v1 keeps the ingestion unit
self-contained: everything walked is present locally, and the packet's
STALE protocol is the only consistency mechanism. When partial clone
lands, it must carry per-repo deferred-OID accounting and a rule that
diff summaries over promisor packs are marked incomplete.

### 5. Rejected alternatives

- **go-git (pure-Go reimplementation):** rejected on fidelity. Findings
  record 8 documents the failure class as silent divergence from C git
  on edge cases; an ingestion pipeline whose parser disagrees with git
  about object validity is exactly the T-01 vulnerable layer. libgit2
  is the audited C implementation with a Python binding.
- **GitHub/GitLab REST+GraphQL as the canonical source:** rejected on
  silent truncation. Findings record 7: commit `.files[]` truncates at
  300 files, large diffs return `patch: null` with no error, compare
  caps at 250 commits. A "confident-looking incomplete diff" is worse
  than an explicitly bounded one; git-native reads are the fidelity
  source. API access remains a candidate for discovery/enrichment only.
- **fast-import stream as the v1 journal:** deferred, not rejected.
  Findings record 2's grammar is the right long-term replay journal,
  but streams carry full blob contents with no byte bound by default,
  which collides with the T-03 caps. Packets are the v1 unit: bounded,
  typed, quarantinable. A future journal can be derived FROM packets
  rather than replacing them.

## Invariants (mechanical, not prose)

- No `subprocess`, no `os.system/popen/exec*`, no `eval(`/`exec(` in
  `src/git_ingest/` (G-15 lint test enforces).
- No network imports except in `ingest_client.py`, which only builds
  requests against the configured gateway URL (never repo-derived URLs).
- Config caps are imported, never re-literalized (G-16 lint test enforces).
- Every quarantine reason is a typed code; packet status is
  `OK | QUARANTINED:<reason> | STALE`. Silent skips do not exist.
- `claimed_*` naming is mandatory for author/committer; signature
  outcomes are the 4-tuple, never a single "verified" bit.
- Symlinks and gitlinks are terminal-opaque: recorded as data, never
  followed, never resolved, never fetched.
