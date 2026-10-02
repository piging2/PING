# LANE A — Git ingestion: harvest report

Date: 2026-09-24. Lane: A (Git as first-class PING source).
Artifacts: `lane-a/harvest-area/git-spike/` (src, test, slice, README.md).
Zero PING repository files were written by Lane A.

## PROBLEM

PING has no way to ingest a Git repository as a first-class source. Git
holds the ground truth of how PING itself was built (who changed what,
when, in which order, on which branch), but PING cannot see it: there is
no commit, ref, branch, tag, or file-change observation anywhere in the
system. GitHub API metadata (issues, PRs, CI) is sibling lane CONN's
scope; the missing layer is the repository itself.

## PING ALREADY HAS

Nothing at the object level. A grep of the PING tree (all branches,
all history) found zero git/repository ingestion mechanisms. What PING
does have, and what this lane now plugs into, is the proven canonical
event authority (Phase 0 verdict, 2026-09-23): `UnifiedEventRuntime.emit`
as sole non-test writer to the `ping_events` journal, reached through
`POST /ingest -> CanonicalizationService.canonicalizeAndEmit`.
The gateway's `event_registry.json` already registers
`OBJECT_CREATED`, `OBJECT_UPDATED`, `OBJECT_VERSIONED`,
`RELATIONSHIP_CREATED`, `RELATIONSHIP_DISCOVERED` (233 types total),
and the `/ingest` envelope already carries `confidence` (default 0.5,
"observations are not knowledge"), `lifecycleStage`
(observation | candidate | knowledge), `logicalId`, and `evidence[]`.
That envelope was built for exactly this lane's use case.

## EXTERNAL CANDIDATES

- isomorphic-git: MIT, verified on disk. Pure-JS reimplementation of
  Git semantics. Limits fenced in testing: readTree throws on hostile
  trees, and packfile objects inflate regardless of caps, so it cannot
  enforce pre-read size gates on untrusted input.
- simple-git: MIT, verified on disk. Thin wrapper over Git CLI; offers
  no safety semantics beyond what we build ourselves.
- Git CLI plumbing (`git` 2.43.0): GPLv2, present on every target host.
  Native object fidelity, verbatim diffcore, `cat-file -s` pre-read
  size gates. Invoked as a separate process (no linking).
- libgit2 / pygit2 / NodeGit: GPLv2 with linking exception (verified
  below). Rejected for slice 1 on zero-need grounds, kept as a
  license-cleared performance option if spawn throughput ever forces it.
- go-git, nodegit: rejected with evidence (native modules, larger
  attack surface, no fidelity gain over plumbing for a read-only
  ingestor).

## LICENSES

Verified independently from primary sources, 2026-09-24:

- libgit2: GPLv2 with linking exception (libgit2 COPYING, quoted
  verbatim in VFS for Git THIRD-PARTY-NOTICES and the libgit2 README:
  "unlimited permission to link the compiled version of this library
  into combinations with other programs ... without any restriction
  coming from the use of this file"). Modifications to libgit2 itself
  stay GPLv2.
- pygit2: GPLv2 with linking exception (libgit2/pygit2 README and
  AGENTS.md, PyPI). Same exception text.
- Git CLI: GPLv2 (git.git COPYING). The wrapper invokes it as a
  separate process via `execFile` with `shell: false`; under the
  standard FSF separate-process interpretation this creates no GPL
  obligation on PING's own code. No libgit2/pygit2 code is used.

## TESTED

`node --test test/*.test.mjs`: 20 tests, 20 passed, 0 failed (~173s).
Tested: G-01 malformed tree quarantine, G-02 opaque gitlinks with no
submodule traversal, G-04 1 GiB sparse blob pre-read size gating (~35s),
G-07 spoofed author retained only as an unverified claim, G-08 unsigned
signature semantics, G-09 consistent-or-STALE ref race behavior, G-10
symlink target treated as data, G-11 config/hook smuggling blocked, G-13
metadata sanitization, G-14 symref cycles and invalid ref names (typed
per-ref states; a hostile ref never blocks healthy refs), G-15 command
and process boundary (subcommand allowlist, no shell, no eval, isolated
config, disabled hooks, stripped SSH/askpass env, `--no-ext-diff`),
G-16 centralized caps, same-commit idempotency, incremental range
ingestion. Hostile refs discovered by direct bounded inspection of the
main ref store (packed refs, loose refs, HEAD; symlinks never followed)
after proving `for-each-ref`/`show-ref` silently drop cyclic or dangling
symrefs.

Vertical slice on a local bare mirror of the real PING repo (197 MB,
`refs/heads/fyd-factory` at `e48ef710cb889bf4d59b833ef9766067a9e2bbf0`):
107 commits walked, 1,258 file changes, observations of kinds
repository, branch (11), tag (1), commit (107), commit_parent (106),
file_change (1258). Same-commit rerun: 0 commits walked, no duplicate
packet persisted, cursor unmoved. Incremental range
`b3004bbe40a0 -> e48ef710cb88`: exactly 30 commits, 229 file changes.
A synthetic child commit on a scratch ref advanced the cursor by exactly
1 commit; the scratch ref was deleted afterward.

Dogfood query ("what changed in src/fyd between b3004bbe40a0 and
e48ef710cb88?"): 30 commits in range, 27 touched src/fyd, every change
citing native commit SHA plus packet evidence SHA-256
(`b6ce84e1...de36020658`). An unknown-SHA query returns an explicit
"unknown" answer instead of a fake empty result.

Canonical mapping (dry-run, proven): the adapter
`src/ping-submit.mjs` converts 2 packets into 2487 `/ingest` envelopes
(2380 OBJECT_CREATED, 107 RELATIONSHIP_CREATED), all `logicalId`s unique,
all event types in the registered vocabulary, all carrying the 64-char
packet evidence. One adapter bug found and fixed before any live write
(commit_parent field names).

## WINNER

A minimal hardened Git CLI plumbing wrapper: `execFile`, `shell: false`,
fixed argument construction, read-only subcommand allowlist, isolated
config, disabled hooks, stripped SSH/askpass environment,
`--no-ext-diff`, pre-read size gates, and direct bounded ref-store
inspection. Deterministic acquisition packets (JSONL) with native Git
SHA identity and SHA-256 packet evidence.

## ADOPT-ADAPT-REJECT

- ADOPT: Git CLI plumbing as the read engine (exact object fidelity,
  pre-read caps, verbatim rename detection).
- ADAPT: canonical event submission through the gateway's existing
  `/ingest` vocabulary (OBJECT_CREATED / RELATIONSHIP_CREATED), with
  `logicalId` = native Git SHA, `confidence` 0.5, `lifecycleStage`
  "observation", `evidence` = packet SHA-256. Ref/repository snapshot
  envelopes are novelty-gated (first sight or head movement only).
- REJECT: isomorphic-git as primary (no pre-read caps, hostile-tree
  crashes), simple-git (no safety semantics), libgit2/pygit2 for
  slice 1 (unneeded dependency; kept license-cleared as fallback),
  any new event store or second authority (Phase 0 forbids it).

## CODE WE DO NOT NEED TO WRITE

ODB parsing, packfile inflation, revwalk, diff algorithms, rename
detection, ref resolution semantics, blame, submodule machinery, event
persistence, event ID generation, content canonicalization, journal
replay. Git owns the first group; the gateway's CanonicalizationService
and UnifiedEventRuntime own the second.

## MINIMAL PING WRAPPER

`src/ping-submit.mjs` (7.4 KB, zero deps): packet JSONL in, `/ingest`
envelopes out. Default dry-run prints envelopes; live mode requires
`--live` plus `PING_GIT_INGEST_LIVE=1` and posts each envelope to the
gateway, expecting 201 with `{ eventId, canonicalHash }`. The TypeScript
port for the PING tree is the remaining engineering step; the contract
it must satisfy is this report's mapping table.

## FAILURE TEST

Hostile-repository behavior is the point of the red-team suite, not an
appendix: malformed trees quarantine without blocking the walk;
symref cycles and dangling refs get typed per-ref states; spoofed
authors/signatures are preserved as unverified claims rather than
trusted or dropped; 1 GiB blobs are gated before any read; config, hook,
and diff-driver smuggling is blocked by construction; ref races resolve
to consistent-or-STALE. Known honest gaps: SHA-256 repositories are
untested (slice 1 targets SHA-1), pack expansion ratio and delta depth
are not enforceable through the narrow CLI surface, annotated tags are
quarantined rather than peeled.

## PRODUCT CAPABILITY UNLOCKED

PING can answer "what changed, when, by claimed author, in which order"
about any ingested repository with evidence-cited answers: every claim
carries a native Git SHA and a packet evidence hash. Incremental
`OLD HEAD -> NEW HEAD` ingestion makes this a living source, not a
one-shot import. Through the canonical `/ingest` seam, Git history
becomes observable PING knowledge with the same idempotency and
provenance guarantees as every other source.

## BYTES-DEPENDENCY COST

- Spike source: 47,985 bytes (7 modules), zero dependencies.
- Tests + slice + docs + adapter: 86,345 bytes total.
- Slice runtime: ~139s wall for 107 commits (~4-6 git spawns per
  commit; `cat-file --batch` batching is the known optimization).
- Packets: 1.26 MB JSONL for 107 commits (1,258 file changes).
- Envelopes: 1.55 MB for 2487 `/ingest` envelopes (~623 bytes each).
- Mirror: 197 MB bare clone (source evidence, not PING data).
- Dependency delta: 0.

## LANE PROOF STATUS

- Hardened acquisition wrapper: PROVEN (20/20 tests).
- Native Git SHA identity: PROVEN (SHA-1 mirror).
- Same-commit idempotency: PROVEN.
- Incremental OLD HEAD -> NEW HEAD: PROVEN.
- Evidence-cited dogfood query: PROVEN.
- Canonical `/ingest` mapping: PROVEN in dry-run (2487 envelopes,
  registered vocabulary, unique logicalIds).
- Canonical journal persistence + readback: BLOCKED pending
  coordinator/Nolan approval to POST the 2487 observation envelopes to
  the live gateway (the exact and only external requirement).
- Full G-01..G-16 threat closure: NOT PROVEN (honest gaps listed above).
- Mission: IN PROGRESS.
