# HARVEST REPORT: git as first-class source

Lane A, 2026-09-23. No em dashes used in this document.

## PROBLEM

PING must ingest git repositories as first-class observations: commits,
trees, files, authorship, manifests, and relationships between them, with
git SHAs as source-native evidence identifiers and commit boundaries as
incremental units. Untrusted repo content is hostile input (see
~/workspace/git-ingestion/threats/GIT-INGESTION-THREATS.md).

## PING ALREADY HAS

Nothing at the git-object level. Verified: grep over the full PING tree
(fyd-factory branch, 2026-09-23) for pygit2/libgit2/isomorphic-git/
simple-git/GitPython/go-git/git-object/rev-list/revwalk/fast-import/
fast-export returned zero hits; git history search across all branches
for git-ingestion/github-connector/repo-ingestion commits returned zero
hits. (GitHub API-level connector is sibling lane CONN scope; this lane
covers git-native object ingestion only. Coordination point filed in
design section 9.)

## EXTERNAL CANDIDATES

| Candidate | What it is | License | Mechanism relevant to PING |
|---|---|---|---|
| isomorphic-git | Pure-JS git implementation | MIT | readCommit/readTree/readBlob/log/resolveRef, zero native deps |
| simple-git | Node wrapper over git CLI | MIT | fluent CLI spawning; adds a layer over plumbing PING can call directly |
| libgit2 / pygit2 | C git library + Python bindings | GPLv2 with linking exception (unmodified linking needs no source disclosure) | revwalk, diff, blame, ODB with pre-read size info |
| go-git | Pure-Go reimplementation | Apache-2.0 | plumbing without a git binary; known edge-case divergence from C git |
| nodegit | Node bindings to libgit2 | MIT | libgit2 speed in Node; heavy native prebuilds, lagging maintenance |
| git CLI plumbing | git itself | GPLv2 (shell-out, no linking) | exact fidelity; diffcore -M rename detection; cat-file -s pre-read caps |
| fast-export/import grammar | git core stream format | GPLv2 (idea unencumbered) | canonical full-history replay journal |
| commit-graph generation numbers | git core index format | GPLv2 (idea unencumbered) | recent-history queries without full walks |
| partial clone --filter=blob:none | git protocol v2 | GPLv2 (protocol) | skeleton ingest: full topology, bounded bytes, OID-keyed lazy blobs |
| push webhooks | GitHub/GitLab protocol | N/A | HMAC-signed before/after OIDs as incremental triggers |
| GitHub REST/GraphQL | API | ToS | lossy projection only (300-file diff cap, 1 MB blob refusal, 250-commit compare cap) |

Prior deep research reused: ~/workspace/git-ingestion/findings/ECOSYSTEM-HARVEST.md
(top-5: partial-clone skeleton, push webhooks, commit-graph traversal,
libgit2/pygit2, fast-export grammar) and the threat register (16-test
acceptance gauntlet).

## LICENSES

Verified on disk from the isolated harvest clones
(~/workspace/ping-build-program/harvest/): isomorphic-git LICENSE.md is
MIT (Copyright 2017-2023 the isomorphic-git authors); simple-git LICENSE
is MIT (Copyright (c) 2025 Steve King), packages/simple-git 3.36.0 MIT.
libgit2 is GPLv2 WITH a linking exception permitting unmodified linking
into any software, commercial included (per the ecosystem research record;
not re-verified on disk this pass since no libgit2 clone was needed).
No license blockers for the chosen design.

## TESTED

Cloned to the isolated harvest area: isomorphic-git (depth-1) and
simple-git (depth-1). Installed isomorphic-git 1.x from npm into the spike
and exercised readTree/readBlob/readCommit/readTag/log/resolveRef against
real fixture repos. Ran the spike's three suites against both engines:

- run-spike.mjs: 25 checks (determinism byte-identity, cross-engine
  agreement on commit SHAs / file sets / ref snapshots / repo identity,
  claimed authorship, ANSI sanitization, symlink-as-data, opaque gitlink,
  exact rename, 7 manifest detectors, tag capture, no-dangling-rels).
- redteam.mjs: G-01 hostile tree (crafted via hash-object --literally after
  proving mktree and plain hash-object refuse), G-14 symref cycle, T-09
  config/smudge/hook isolation.
- failure-test.mjs: F-01 pack bomb (5 MiB declared blob, heap delta < 8 MiB),
  F-02 corrupt loose object (typed failure, no crash), F-03 shallow clone
  (partial-history marking), F-04 exact vs inexact renames.

All suites pass: SPIKE 25/25, REDTEAM 12/12, FAILTEST 12/12.

## WINNER

Hybrid behind one GitReader interface: **git CLI plumbing as the primary
engine, isomorphic-git as the no-git-binary fallback**. simple-git rejected
as an unnecessary layer over direct plumbing. The spike is the evidence:
both engines produced identical commit SHA sets, file sets, ref snapshots,
and repo identities on the fixture, while the CLI engine alone gave
pre-read blob caps, verbatim diffcore rename semantics, and exact fidelity.

## ADOPT-ADAPT-REJECT

- ADOPT: git CLI plumbing patterns (cat-file -s pre-read caps,
  diff-tree -M --find-renames with histogram, rev-list ranges,
  parse-only config isolation); partial-clone skeleton ingest;
  push-webhook incremental triggers (with reconciliation loop);
  fast-export grammar as the replay journal shape; commit-graph
  generation-number traversal.
- ADAPT: isomorphic-git as fallback engine behind GitReader (its limits
  are proven and fenced: no pre-read caps, no diff, readTree throws on
  hostile trees which the wrapper converts to quarantine, log is
  single-ref so the wrapper walks all refs); shared readRefs enumeration
  (written for the spike; for-each-ref silently drops unresolvable
  symrefs, proven); the spike's observation schema and sanitizer.
- REJECT: go-git (silent divergence class), nodegit (native weight,
  maintenance lag), simple-git (layer without value), GitHub REST as
  canonical history (silent truncation), hand-rolled diffcore (duplicates
  git), recursive submodule ingestion (RCE history), LFS fetching,
  any checkout of untrusted repos.

## CODE WE DO NOT NEED TO WRITE

Object database parsing, packfile inflation, delta resolution, revwalk,
diff algorithms (myers/patience/histogram), rename detection, ref
parsing semantics, merge-base computation, blame. Git (or isomorphic-git)
owns all of it. We write only: the observation schema, the tree-name gate,
the sanitizer, manifest detectors, the ref enumerator, cap enforcement,
and the packet/evidence envelope.

## MINIMAL PING WRAPPER

`GitReader` interface: `snapshotRefs()`, `walkCommits(since?)`,
`readTree()`, `readBlobCapped()`, `diffRange()`, all returning the
observation schema from the spike. CLI implementation ~400 lines of
TypeScript (port of spike/engines/gitcli.mjs + lib/common.mjs); iso
implementation ~350 lines. One config module for caps. Packets enter
PING through the canonical Event Authority (phase0 owns that seam).

## FAILURE TEST

Covered by spike/failure-test.mjs and redteam.mjs (summarized under
TESTED). Remaining gauntlet items for integration time: G-02/G-03
submodule bombs (5,000 gitlinks), G-04/G-05 pack/delta bombs at production
caps, G-06 binary smuggling, G-07/G-08 author/signature semantics with a
pinned trust anchor, G-09 force-push race harness, G-10 symlink atime audit,
G-11/G-13 config/metadata injection at scale, G-15 no-execution lint,
G-16 per-cap unit tests. The fixtures in spike/fixtures/ are the seeds.

## PRODUCT CAPABILITY UNLOCKED

"Ask FYD about the codebase" with evidence: what implements identity,
duplicate event paths, what changed the renderer, which tests protect
determinism, who can write canonical events, what depends on a schema,
why an architectural decision was made. Every answer cites commit SHAs,
file blobs, and diffs. Dependency edges (Repository depends_on Package)
feed lane O's targeted regeneration: a lockfile bump invalidates exactly
the affected derived artifacts. New-business radar and review triggers
stay in the outreach engine; code intelligence becomes a first-class
PING source alongside web acquisition.

## BYTES-DEPENDENCY COST

- Primary engine: zero new dependencies (git binary on the ingestion
  host; PING's ingestion runs on hosts that already carry git).
- Fallback: isomorphic-git 4.9 MB on disk, 11 small transitive deps
  (async-lock, crc-32, pako, sha.js, etc.), MIT throughout, no native
  modules, no network calls at runtime.
- Spike (throwaway, not shipped): ~9 MB node_modules, 3 suites, ~2,000
  lines including fixtures.
- Vendor veto gate: not triggered. No recurring cost, no data custody,
  no lock-in, removable behind the interface, PING remains the authority.
