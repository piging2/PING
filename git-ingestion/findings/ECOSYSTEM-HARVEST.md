# ECOSYSTEM HARVEST: git ingestion mechanisms

Research date: 2026-09-23. Sources verified against current official docs.
Conventions: no framework trophy collection. Mechanisms only.
No em dashes used in this document.

License blocker summary: none. libgit2/pygit2 are GPLv2 WITH a linking
exception that permits linking (unmodified) into any kind of software,
commercial included, without source disclosure. See record 1.

---

## 1. libgit2 / pygit2 read primitives

PROBLEM: Ingest commits, trees, blobs, refs, diffs, blame at native speed
without shelling out to the git CLI for every object.

SOURCE: libgit2 (C library) + pygit2 (Python bindings).
Official README, github.com/libgit2/libgit2; pygit2 AGENTS.md (libgit2/pygit2
repo, crawled 2026-09).

VERSION-SHA: pygit2 1.20.1 on PyPI (uploaded 2026-09-12). libgit2 1.9.6
(pygit2 1.19.x AGENTS pin); 1.9.4 was the latest v1.9.x release per Microsoft
vfsforgit overlay notes 2026-05-22; v1.9.x is the last of the 1.x line, v2.0
has no ETA.

LICENSE: GPLv2 with a linking exception (README verbatim: "you can link it
(unmodified) with any kind of software without having to release its source
code"). Modification of libgit2 itself falls back to GPLv2 obligations.

MECHANISM: Re-entrant C API. Exposes: repository open/discovery; revwalk
(commit graph iteration with sort modes incl. topological); ODB (object
database read/write + custom backends); diff (tree-to-tree, commit diff,
patch generation); blame; refs/branches/tags; index/status; revspec; clone,
fetch, push over HTTP/SSH/local. pygit2 maps these to a Pythonic API plus a
low-level wrapper layer. Functions return nonzero on error with a detailed
error readable via giterr_last().

FAILURE SEMANTICS: Typed C error codes + error message stack (giterr_last).
libgit2 does not crash on corrupt repos; ODB reads return GIT_ENOTFOUND /
corrupt-object errors callers must handle. Notable supply-chain exposure:
CVE-2026-5917 (Aug 2026) shell command injection via the libssh2 SSH backend
in v0.27.0 through v1.9.0, triggered by malicious submodule URLs during
recursive clone. The failure class is: untrusted remote data reaching
transport-layer parsing. Pin patched versions; avoid recursive submodule
processing of untrusted repos.

PING ANALOG: UNKNOWN in detail. PING's event/evidence plane wants
deterministic object reads; this would be the engine under it.

VERDICT: ADOPT. Reason: canonical native-speed object reader; covers
revwalk, diff, blame, odb in one audited codebase, with a Python binding
(PING is Python-adjacent tooling). One-line risk note: stay on patched
releases and never process recursive submodules from untrusted remotes.

---

## 2. git fast-import / fast-export streams as an ingestion protocol

PROBLEM: Bulk-capture or bulk-restore a repository's full history as a
single replayable stream.

SOURCE: git fast-import / fast-export, git core. git-scm.com docs,
git-fast-import man page.

VERSION-SHA: git core feature set stable since ~1.5/1.6 era; format
unchanged through git 2.55 (2026 man pages).

LICENSE: git core is GPLv2.

MECHANISM: fast-import reads a mixed command/data stream from stdin and
writes packfiles + refs directly. Grammar: blob, commit, tag commands;
filemodify/filedelete/filerename/filecopy on trees; mark references
(:N) for forward object references; progress, checkpoint, alias, reset,
done directives. fast-export emits the same grammar: full-fidelity capture
of commits, trees, blobs, tags, marks. Used by real migration tooling:
reposurgeon (SVN/CVS/hg to git pipelines emit fast-import streams),
git-filter-repo (operates on fast-import streams internally), SubGit-style
mirrors, and large-repo chunking pipelines (imjasonh/playground git-server
docs: byte-bounded batches of want lists, content-addressed packs, CAS
ref cutover).

FAILURE SEMANTICS: Strict input validation; malformed commands, bad dates
(unless --date-format=raw-permissive), or bad marks abort the import.
Ref updates are atomic at EOF: refs only move when the whole stream is
consumed, so a truncated stream leaves refs untouched. Re-running the
same stream is idempotent in object terms (content-addressed OIDs are
stable; refs converge to the same tips). Not byte-bounded by default: a
stream carries full blob contents, so unbounded histories are a memory
and wall-time hazard.

PING ANALOG: UNKNOWN whether PING has a canonical journal format. The
stream grammar maps naturally onto PING's event plane (commands become
typed observations: blob-created, commit-created, ref-moved).

VERDICT: ADAPT. Reason: adopt the stream grammar as PING's canonical
full-history replay journal (capture with fast-export, replay deterministically),
but do not carry blobs in the stream for large repos; pair with the
partial-clone skeleton approach (record 6). One-line risk note: blob
payload size in the stream; enforce per-repo byte budgets.

---

## 3. Commit-graph traversal with generation numbers

PROBLEM: Walking history at scale must not visit every reachable commit
before answering queries about recent history.

SOURCE: git core commit-graph format (gitformat-commit-graph(5));
Microsoft Azure DevOps blog series "Supercharging the Git Commit Graph";
GitHub blog "Git's database internals II".

VERSION-SHA: Format current as of git 2.55 man pages (2026).

LICENSE: git core GPLv2 (mechanism is a file format; the algorithm is
described in public blog posts, no license encumbrance on the idea).

MECHANISM: The commit-graph file is a compact serialized commit DAG:
fanout table, OID lookup (sorted), commit data chunk (root tree OID,
parent positions, generation number v1 in the high 30 bits, commit time),
optional generation data v2 (corrected commit-date offsets), extra edge
list for octopus merges, optional Bloom filter index. Generation numbers
(child generation = max(parent generations)+1) let rev-list skip commits
that cannot be ancestors of the range of interest. Measured effect from
GitHub's blog on the linux kernel repo: rev-list --topo-order -n 100
v5.19 went from 6.88s to 0.02s. git's rev-list --topo-order uses a
two-walk algorithm (in-degree computation walk + topological output walk)
so the first pages of history appear without a full-graph pass. Large
hosts (GitHub, Microsoft) write commit-graph files server-side and also
use bitmaps + multi-pack-index; on fetch, protocol v2 negotiates against
it.

FAILURE SEMANTICS: A stale or absent commit-graph file silently degrades
to the slow full walk, never to a wrong answer. Corrupt graph files are
detected via header magic/version/checksum and ignored. Generation numbers
must be recomputed on graph extension; appending to a split-graph chain
is the designed mechanism.

PING ANALOG: PING's object graph needs the same property (recent-history
queries without full walks). UNKNOWN whether a per-repo DAG index exists.

VERDICT: ADAPT. Reason: generation-number DAG index is the proven shape
for history queries at scale; PING should maintain an equivalent
per-repo commit DAG index (it can read git's own commit-graph files when
the backing clone has them via commit-graph write). One-line risk note:
PING must own the write/recompute position for the index; stale graph
means slow but correct, so monitoring must watch index freshness, not
correctness.

---

## 4. Diff algorithms and diffcore rename detection

PROBLEM: Turn commit pairs into accurate file-level change records,
including moved files, without paying quadratic cost on every commit.

SOURCE: git core diff machinery. git-scm.com docs (gitdiffcore, diff
options); lore.kernel.org patch history; Quinjet optimization docs
(pulkitxm/quinjet, docs/optimization/diff/algorithms.md, crawled
2026-09-17).

VERSION-SHA: Diff algorithm set (myers, minimal, patience, histogram)
stable since git 1.7.9 (2012); diffcore-rename mechanics unchanged
through git 2.55.

LICENSE: git core GPLv2 (mechanism is an algorithm; description is
public documentation).

MECHANISM: Four selectable xdiff algorithms: myers (default, greedy LCS),
minimal (myers with extra passes for smallest edit script, slower),
patience (unique-line anchors; cleaner hunks for refactored code),
histogram (patience extended to low-occurrence lines; current best
default candidate for readability). Rename detection is a separate
diffcore pipeline pass AFTER raw file-pair computation:
1. Exact phase: delete/add pairs with identical blob OID join by hash.
   Free. This is the pure `git mv` case and the common case.
2. Inexact phase: remaining candidates scored by content similarity
   (proportion of shared chunk content vs the larger file). Default
   threshold 50 percent, adjustable via -M<n>/-C<n> (note grammar: -M5
   means 50 percent, a fraction not a percent). Greedy best-assignment.
   Cost is O(deletes x adds); bounded by diff.renameLimit (silently skips
   inexact detection past the ceiling and reports plain delete+add).
Copy detection (--find-copies, --find-copies-harder) extends the same
scoring; merge commits need -m or the diff is suppressed.

FAILURE SEMANTICS: The exact phase is deterministic from content
addressing; the inexact phase is heuristic and threshold-sensitive (a
79 percent name match can beat a 98 percent content match). Past the
renameLimit ceiling, renames silently degrade to delete+add pairs.
Consumers must treat exact renames as facts and inexact renames as
confidence-scored hypotheses.

PING ANALOG: PING's file-lineage edges need exactly this split.

VERDICT: ADOPT. Reason: reuse git's diff machinery verbatim (via
pygit2 diff or CLI) rather than reimplementing; mirror the exact-vs-
inexact split in PING observations: exact renames become certain
file-lineage edges, inexact renames become scored edges with the
threshold recorded. One-line risk note: silent renameLimit ceiling
means large commits need chunked or blob-aware detection to stay
deterministic.

---

## 5. Shallow / partial clone / sparse checkout

PROBLEM: Ingest history without downloading every blob (or any working
tree), especially for large monorepos.

SOURCE: git core protocol v2 + promisor pack machinery. Documented in
git clone/fetch man pages; imjasonh/playground git-server large-repo
migration docs (2026-09) give the cleanest worked architecture.

VERSION-SHA: Partial clone filters stable since git 2.19 (2018);
protocol v2 since git 2.18.

LICENSE: git core GPLv2.

MECHANISM: --depth N bounds history by commit count (does not bound
bytes: one commit can introduce a multi-GB blob). The clean lever is
partial clone: `git clone --filter=blob:none` fetches all commits and
trees but no blob contents, recording received filtered packs as
promisor packs. Trees and commits stay complete, so PING can enumerate
the entire history shape. Blobs are backfilled later by explicit
`want <oid>` lists, byte-bounded per batch, each batch a self-contained
pack. Variants: blob:limit=<n> (skip blobs over a size), tree:<depth>,
sparse checkout (checkout only matching paths; orthogonal, about the
working tree, not object transfer). Server support required: every
major host (GitHub, GitLab) supports filters.

FAILURE SEMANTICS: Blob-absent objects raise on materialization; any
read of a missing blob lazily triggers a promisor fetch (or fails
closed if offline). Skeleton fetch of pathological histories can still
be large; it can itself be split by commit range / deepen rounds. Shallow
boundaries recorded in .git/shallow can corrupt downstream replay
(entireio/cli treats shallow-boundary replay as a refusal case).

PING ANALOG: UNKNOWN. Maps to PING's evidence model (observations first,
heavy payloads on demand).

VERDICT: ADOPT. Reason: the shape-first ingestion pattern; full
commit/tree topology with bounded bytes, then deterministic lazy blob
materialization keyed by OID. One-line risk note: promisor fetch
requires the origin to stay reachable; PING must record which blob
OIDs were deferred per repo and never claim a complete diff without
them.

---

## 6. Webhook ingestion (push events as incremental triggers)

PROBLEM: Get notified of new commits cheaply and trigger incremental
ingestion without polling.

SOURCE: GitHub webhooks docs; GitLab webhooks docs. Verified via current
docs mirrors and webhook-security skill notes (crawled 2026-09).

VERSION-SHA: GitHub X-Hub-Signature-256 (HMAC-SHA256) current; legacy
X-Hub-Signature (SHA-1) must not be accepted. GitLab 16.x signing-token
mode adds webhook-id/webhook-timestamp/webhook-signature headers.

LICENSE: N/A (protocol, not code).

MECHANISM: GitHub push event payload carries: ref, before, after OIDs,
and up to 20 newest commits (with total_commits_count for the true
count). Authentication: HMAC-SHA256 over the raw request body with the
webhook secret, header `X-Hub-Signature-256: sha256=<hex>`. GitLab:
shared secret token compared against `X-Gitlab-Token` header (plain
comparison, no HMAC in default mode; signing-token mode adds HMAC with
timestamp). Replay protection: GitHub signs no timestamp, so dedupe on
`X-Gitlab-Delivery` / GitHub's `X-GitHub-Delivery` UUID with a unique
constraint; replays return 200 as idempotent no-ops. Rules: verify
signature over exact raw bytes before parsing JSON; timing-safe compare
(never ==); reject missing signatures outright; never log secrets or
raw bodies. The before/after pair defines the exact commit range to
ingest: `git rev-list before..after` gives the new commits.

FAILURE SEMANTICS: Fail closed on bad signature (401, do not enqueue).
Missed or undelivered webhooks are the silent-gap hazard: payload only
carries the newest 20 commits and GitLab caps pushes per webhook at
3 branches, so a force-push or large push can leave history unknown.
Requires a periodic reconciliation sweep (fetch refs, diff tips) or the
ingest state silently diverges.

PING ANALOG: UNKNOWN whether PING has an event-ingress point; this maps
to its external-event ingestion boundary.

VERDICT: ADOPT. Reason: cheapest incremental path: before/after OIDs
give the exact delta range, signature + delivery-dedupe give the security
and idempotency story. One-line risk note: webhooks are lossy hints, not
a log; pair with a reconciliation fetch loop or gaps are silent.

---

## 7. GitHub / GitLab REST + GraphQL commit/diff retrieval

PROBLEM: Retrieve commit and diff data for repos PING cannot or should
not clone directly.

SOURCE: GitHub REST v3 + GraphQL v4 docs; GitLab API docs. Limits
verified via docs.github.com repository-limits and multiple 2026-09
field notes (nanoclaw ci-github-instrument-limits, pr-agent ADR 0007).

VERSION-SHA: API versions current as of 2026-09 (X-GitHub-Api-Version:
2022-11-28 header scheme).

LICENSE: N/A (API terms of service; data access governed by token
scopes, not a software license).

MECHANISM: REST: GET /repos/{o}/{r}/commits/{sha} returns commit with
.files[] (patches); /compare/{base}...{head} returns commit list and
file diffs. GraphQL: commit history + file tree queries in one round
trip with point-cost accounting. Rate limits (2026-09, documented):
REST 5,000 req/hr authenticated (15,000 for GitHub Apps, 1,000 for
GITHUB_TOKEN in Actions); GraphQL 5,000 points/hr; search 30 req/min;
GitLab.com 2,000 authenticated API req/min. Pagination: Link headers
(REST), cursors (GraphQL).

Fidelity ceiling (why it cannot be the canonical source):
- Commit .files[] silently truncates at 300 files (server-computed
  .stats stay consistent, so stats cannot detect the truncation).
- Large per-file diffs return patch: null with no error.
- Contents API refuses files over 1 MB (too_large); Git Blobs API
  needed as fallback.
- Compare commit list caps at 250 commits; commits tab at 10,000.
- Merge commits suppress diffs unless -m equivalent is used.
FAILURE SEMANTICS: 403 on rate exhaustion (X-RateLimit-Remaining/Reset
headers; Retry-After on secondary limits). Truncations are silent by
design, not errors: the API is a lossy projection, and any consumer
must record coverage explicitly (what was truncated, what fell back).

PING ANALOG: UNKNOWN; candidate fallback source only.

VERDICT: PATTERN_ONLY. Reason: adopt the patterns (Link-header
pagination, rate-limit header reading, explicit coverage accounting)
but never treat API responses as canonical history; git-native reads
(records 1, 3, 5) are the fidelity source. Use the API only for
discovery/enrichment on hosts where PING has no git access. One-line
risk note: silent truncation means PING would ingest confident-looking
incomplete diffs unless every API read carries a completeness flag.

---

## 8. How large hosts ingest at scale (Sourcegraph, Gitiles, Gitea/go-git)

PROBLEM: Serve thousands of repos with incremental updates and fast
queries without re-cloning the world.

SOURCE: Sourcegraph docs (docs/admin/architecture.mdx, docs/admin/
search.mdx, crawled 2026-09); Gitiles (Google's git web UI); go-git
(v5) library docs; Gitea architecture notes.

VERSION-SHA: Sourcegraph docs current 2026-09; go-git v5 (latest);
Gitiles tracks git core.

LICENSE: Sourcegraph server is Apache-2.0 (enterprise features
proprietary); Gitiles is Apache-2.0; go-git is Apache-2.0; Gitea is
MIT. None block adoption of the patterns.

MECHANISM:
- Sourcegraph gitserver: keeps a bare mirror clone per repo on disk;
  repo-updater watches the code host and issues incremental fetches;
  search is served from a trigram index (zoekt) built over the DEFAULT
  branch only (files >1 MB, binary, non-UTF8, >20k unique trigrams
  skipped), horizontally sharded by replica. Non-indexed branches fall
  back to on-demand searcher. Key separation: sync plane (bare mirrors
  + fetch queue) vs query plane (per-branch indexes + fallback search).
- Gitiles: serves read-only directly from on-disk bare repos with
  aggressive caching; no database in front of the object store.
- Gitea: historically shells out to the git binary for most read paths
  rather than a library, accepting process-spawn cost for exact
  compatibility.
- go-git: pure-Go reimplementation of plumbing (revwalk, packfile
  parsing, transports). Known tradeoffs: performance cliffs and
  incomplete edge-case parity vs C git (documented by Grafana nanogit
  and community experience); useful where no git binary is available.

FAILURE SEMANTICS: Sourcegraph's model degrades gracefully: index lag
behind fetch lag is visible and bounded; searcher covers the unindexed
tail. go-git's failure class is silent divergence from C git behavior
on edge cases; Gitea's is process-spawn latency under load.

PING ANALOG: PING's mirror-per-repo + fetch-queue + index-on-ingest
pipeline would be the same shape. UNKNOWN whether PING has one.

VERDICT: PATTERN_ONLY. Reason: adopt the architectural split (bare
mirror per repo, incremental fetch queue, default-branch index +
on-demand fallback for the rest), not any of these codebases. One-line
risk note: go-git is the tempting shortcut and the wrong one for
fidelity; shell to git or use libgit2 instead.

---

# TOP-5 HARVEST LIST (ranked)

1. Partial-clone skeleton ingest (filter=blob:none) with OID-keyed lazy
   blob backfill.
   Strongest reason: full history topology at a fraction of the bytes,
   in resumable byte-bounded batches; never blocked by one giant blob.
   Biggest risk: promisor remotes must stay reachable; PING must track
   deferred blob OIDs per repo and refuse to certify a diff complete
   without them.

2. Push-webhook incremental ingestion (HMAC-verified, delivery-ID
   deduped, before/after OID range).
   Strongest reason: cheapest possible incremental trigger; the payload
   hands over the exact commit range to ingest.
   Biggest risk: webhooks are lossy hints, not a log (20-commit cap,
   delivery loss); silent gaps without a reconciliation fetch loop.

3. Commit-graph generation-number traversal (rev-list --topo-order over
   a per-repo commit DAG index).
   Strongest reason: recent-history queries go from full-graph walks to
   near-constant time (GitHub measured 6.88s to 0.02s on the kernel).
   Biggest risk: PING must own the index write position; staleness
   degrades to slow-but-correct, so freshness needs its own monitor.

4. libgit2/pygit2 as the ingestion engine (revwalk, diff, blame, ODB).
   Strongest reason: one audited native-speed object reader instead of
   a subprocess farm or a reimplementation.
   Biggest risk: GPLv2 with linking exception (fine unmodified; do not
   fork it) plus supply-chain exposure like CVE-2026-5917; pin patched
   releases, never recurse submodules on untrusted repos.

5. fast-export/fast-import stream grammar as the canonical replay
   journal.
   Strongest reason: full-fidelity, deterministic, idempotent capture
   of history that doubles as PING's audit trail format.
   Biggest risk: streams carry blobs; unbounded for huge repos, so pair
   with record 1's blob deferral and enforce per-repo byte budgets.

Licenses that would block adoption: none found. libgit2/pygit2 are
GPLv2 WITH the linking exception: linking unmodified libgit2 into
PING, including a commercial build, requires no source disclosure;
only modification of libgit2 itself reimposes GPLv2. git core is
GPLv2 but PING only shells out to it (no linking), and the formats
and algorithms harvested (commit-graph, fast-import grammar, diffcore,
webhook protocols) carry no license encumbrance on the ideas.
