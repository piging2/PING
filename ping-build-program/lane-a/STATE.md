# LANE A — GIT AS FIRST-CLASS SOURCE — STATE

## Status
PROVEN (spike + red-team + failure tests all green) -> PING wrapper TypeScript port + dogfood dry run

## Canonical boundary integration (2026-09-24, follow-up to phase0)
- phase0 EVENT-AUTHORITY-VERDICT is complete: canonical writer = UnifiedEventRuntime.emit, journal = ping_events, seam = POST /ingest -> CanonicalizationService.canonicalizeAndEmit -> UnifiedEventRuntime.emit. IEventAuthority / AcquisitionManager / ConstitutionalEventStore do not exist as implementations. Do not create a second authority.
- New: exact /ingest schema read from gateway source (ingest.js): { source (req), eventType (req, registry-validated), payload (req), namespace?, logicalId?, confidence? (default 0.5, "observations are not knowledge"), evidence?[], lifecycleStage? (observation | candidate | knowledge) }. 201 returns { eventId, objectId, canonicalHash, canonicalVersion, namespace }; 422 on unregistered eventType.
- New: registry vocabulary confirmed at gateway/generated/event_registry.json: 233 registered types including OBJECT_CREATED, OBJECT_UPDATED, OBJECT_VERSIONED, RELATIONSHIP_CREATED, RELATIONSHIP_DISCOVERED.
- New adapter: lane-a/harvest-area/git-spike/src/ping-submit.mjs. Maps packet observations to /ingest envelopes: commit/file_change/branch/tag/repository -> OBJECT_CREATED; commit_parent -> RELATIONSHIP_CREATED. logicalId = native git SHA (git:commit:<sha>, git:parent:<child>:<parent>, git:filechange:<commit>:<status>:<path>, git:ref:<refname>, git:repo:<slug>), which is exactly the timestamp-stripped logical identity the gateway builds content-deterministic event IDs on. confidence 0.5, lifecycleStage "observation", evidence = packet sha256. Snapshot-state (repo/ref) envelopes are novelty-gated: emitted only on first sight or head movement, so quiet ingests produce zero noise.
- Dry-run PROVEN: 2 packets -> 2487 envelopes (2380 OBJECT_CREATED, 107 RELATIONSHIP_CREATED), all logicalIds unique, all in registered vocabulary, all carry 64-char packet evidence. Envelopes at slice/envelopes.jsonl (1.55 MB). Fixed during adapter build: commit_parent field names (commit_sha/parent_sha, not child/parent) — one bug found and fixed before any live write.
- Live POST /ingest: BLOCKED pending coordinator/Nolan approval. The adapter's live mode requires --live AND PING_GIT_INGEST_LIVE=1 and writes to the shared canonical ping_events journal. Do NOT run without explicit authorization. The single exact external requirement for closing canonical persistence proof: permission to POST 2487 observation envelopes (source "git-ingestor:lane-a") to the Pig gateway's /ingest, then read back and diff journal rows against envelope logicalIds.
- Canonical integration request for coordinator: approve a bounded live dry-run POST of the 2487 envelopes to /ingest, verify 201s + eventId uniqueness + journal readback citing native git SHAs, confirm idempotent re-POST returns 200 with deduplicated:true and zero handler re-triggers.

## License verification (2026-09-24, independent, primary sources)
- libgit2: GPLv2 with linking exception. VERIFIED from libgit2 COPYING via VFS for Git THIRD-PARTY-NOTICES (quotes the exception text verbatim) and the libgit2 README on GitHub: unlimited permission to link the compiled library into combinations with other programs without GPL restriction on the combined program. Modifications to libgit2 itself remain GPLv2.
- pygit2: GPLv2 with linking exception. VERIFIED from libgit2/pygit2 README and AGENTS.md (same exception text), PyPI page.
- Git CLI (git 2.43.0): GPLv2 per git.git COPYING. The spike invokes git as a separate process via execFile (no linking); under the standard FSF separate-process interpretation this creates no GPL obligation on PING's own code. Neither libgit2 nor pygit2 is used or needed.
- Decision for slice 1: zero dependencies retained. Native-binding path (libgit2/pygit2/NodeGit) available if performance forces it, license-cleared by the linking exception above.

## Measurements (2026-09-24)
- Spike src: 47,985 bytes (7 modules: config, git-runner, model, packet, cursor, query, ping-submit). Zero dependencies.
- Tests + slice + docs + adapter: 86,345 bytes total.
- Test suite: 20/20 PASS, ~173s (1 GiB sparse-blob test ~35s).
- Slice runtime: ~139s wall for 107 commits (per-commit git spawns dominate, ~4-6 spawns/commit; cat-file --batch batching is the known future optimization).
- Packet bytes: 1.26 MB JSONL (2 packets, 107 commits, 1258 file changes).
- Envelopes: 1.55 MB (2487 envelopes, ~623 bytes/envelope).
- Mirror: 197 MB bare clone (source evidence, not PING data).

## Slice defect fixed this pass
- QUARANTINE constants: packet.mjs referenced QUARANTINE.MALFORMED_COMMIT, which config.mjs did not define. FIXED: added MALFORMED_COMMIT and MALFORMED_TAG to config.mjs QUARANTINE. Full suite re-run 20/20 after fix. Coverage notes observation kind carries quaratine metadata for ref-to-noncommit cases (typed states from ref discovery remain the primary mechanism).

## Ledger
- 2026-09-23: Lane initialized. Read OWNERSHIP.md, AGENTS.md, ~/workspace/AGENTS.md, MEMORY.md, ECOSYSTEM-HARVEST.md, GIT-INGESTION-THREATS.md.
- 2026-09-23: SEARCH PING complete: zero git/repository ingestion mechanisms in current tree (grep over .ts/.tsx/.py/.js/.md, excluding node_modules/.git) and zero in git history across all branches. PING ALREADY HAS = nothing at the object level. GitHub API connector is sibling lane CONN scope (coordinate, do not duplicate).
- 2026-09-23: PING stack: Next.js/TypeScript, no git libs in package.json. Implication: TS-native engines fit; Python sidecars add a service.
- 2026-09-23: Harvest clones (isolated): isomorphic-git (MIT verified on disk), simple-git (MIT verified on disk). No license blockers.
- 2026-09-23: Spike built in spike/ (node): two engines (isomorphic-git + git CLI plumbing) over a deterministic throwaway fixture repo. Observation model: relationships not flat chunks, SHAs as native ids, claimed_* authorship, sanitized metadata.
- 2026-09-23: run-spike.mjs 25/25 PASS (determinism byte-identity, cross-engine agreement on SHAs/files/refs/repo-id, manifests, tags, rename-exact, symlink-as-data, opaque gitlink, no dangling rels).
- 2026-09-23: redteam.mjs 12/12 PASS (G-01 hostile tree via hash-object --literally after proving mktree/plain hash-object refuse; G-14 symref cycle; T-09 smudge/hook isolation).
- 2026-09-23: failure-test.mjs 12/12 PASS (F-01 pack bomb: 5 MiB declared blob, heap delta < 8 MiB, pre-read cap; F-02 corrupt object: typed failure, no crash; F-03 shallow clone marked partial; F-04 exact vs inexact renames).
- 2026-09-23: Engine decision PROVEN: git CLI plumbing primary (exact fidelity, pre-read caps, verbatim diffcore), isomorphic-git fallback (limits fenced). simple-git/go-git/nodegit rejected with evidence.
- 2026-09-23: Deliverables written: GIT-INGESTION-DESIGN.md, HARVEST-REPORT.md, DOGFOOD-PLAN.md, spike/README.md.

## Key evidence (for coordinator)

- WINNER: hybrid GitReader interface, CLI primary + isomorphic-git fallback. Vendor veto gate NOT triggered (small mature MIT lib, no cost/custody/lock-in, removable).
- CODE WE DO NOT NEED TO WRITE: ODB parsing, packfile inflation, revwalk, diff algorithms, rename detection, ref semantics, blame. Git owns it.
- BYTES-DEPENDENCY COST: primary engine zero new deps; fallback 4.9 MB MIT, 11 small transitive deps, no native modules.
- Threat findings from spike: (1) `git for-each-ref` silently drops unresolvable symrefs -> shared readRefs enumerator written; (2) isomorphic-git readTree throws on hostile trees -> wrapper converts to quarantine; (3) isomorphic-git cannot do pre-read size caps (packfile objects inflate regardless) -> CLI-only for untrusted; (4) git 2.43 fsck-guards mktree AND hash-object -w, bypassable only via --literally; (5) `git add -A` prunes cacheinfo-added gitlinks (fixture lesson).
- /tmp is a 512M tmpfs: scripts clean up fixture dirs; ENOSPC hit once during testing, mitigated.

## Integration requests out

- TO LANE CONN (file when CONN has a state dir): seam on git-vs-GitHub-API truth. Proposal: git-native owns history/refs/trees/tags truth; API owns issues/PRs/reviews/CI runs/releases metadata. Tag truth: git wins. No action needed tonight.
- phase0/DUP (at wrapper integration): review the TypeScript port for duplicate event/identity/provenance machinery before it emits.

## Convergence flag (for coordinator / DUP lane)

`lane-a/harvest-area/git-spike/` contains a SECOND lane-A implementation
(src/config, cursor, git-runner, model, packet, query + lint/red-team tests;
plus `ping-mirror.git`, a mirror of /home/nolan/projects/ping at e48ef710)
that appeared during this shift (file mtimes 01:49-02:40 UTC). I did not
create it and did not modify it.

- COMPLEMENTARY (not in my spike): cursor.mjs (OLD HEAD -> NEW HEAD
  incremental ingest with seen.json idempotency, cursor advances only on
  OK packets), detectStale ref-snapshot comparison, query.mjs.
- DUPLICATE of my spike: model.mjs (sanitize/tree-gates/claimed_*), packet
  builder, red-team tests.
- Recommendation: single convergence owner merges the two; keep their
  cursor+query+stale-detection, keep my dual-engine cross-check + failure
  tests + manifest detectors. I have not touched their files.

## Blockers

- NONE.

## NEXT

1. Port spike wrapper to TypeScript GitReader (CLI engine first) as an uncommitted diff / isolated worktree, never into PING source directly.
2. Expand manifest detectors: Cargo.toml, go.mod, pyproject.toml, tsconfig paths, Dockerfile FROM, k8s manifests, GraphQL schemas.
3. Dogfood dry run on a scratch clone of PING (read-only) to validate the seven questions before any event-authority wiring.
4. Remaining gauntlet items at integration: G-02/G-03 submodule bombs, G-04/G-05 at production caps, G-06/G-07/G-08/G-10/G-11/G-13, G-15 lint, G-16 per-cap tests.
