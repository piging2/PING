# Git ingestion: deterministic pipeline design

Lane A. Status: design validated by spike (see `spike/`), not yet integrated.
No em dashes used in this document.

## 1. Pipeline

```
REMOTE or LOCAL REPOSITORY
  -> DISCOVERY            (clone --filter=blob:none skeleton or open local bare mirror;
                           record origin URL, shallow state, ref snapshot {ref: sha})
  -> GIT OBJECTS/METADATA (revwalk all refs; commits, trees, blobs, tags, refs;
                           SHAs stay source-native identifiers)
  -> MANIFEST DETECTORS   (deterministic file classifiers, section 4)
  -> CODE/DOC OBSERVATIONS (observations with relationships, never flat chunks)
  -> EVIDENCE              (packet: observations + ref_snapshot + caps + provenance;
                           every claim traceable to a SHA)
  -> ENTITY/RELATIONSHIP RESOLUTION (claimed identities, package ecosystems,
                           repo identity; dedupe by content-derived ids)
  -> PING OBJECT GRAPH    (Repository, Commit, File, PersonClaim, Package,
                           Workflow, Schema, Deployment, Doc, License nodes)
```

Incremental path reuses the same pipeline with a commit-range window.

## 2. Observation model (relationships, never flattened text)

Every observation: `{kind, id, props, rels: [{rel, to, weight?}]}`.
Ids are content-derived: git SHAs verbatim (`commit:<sha>`, `blob:<sha>`,
`tree:<sha>`); derived ids are `sha256(defining key)` truncated, never random.

Core relationship vocabulary:

| From | rel | To | Notes |
|---|---|---|---|
| Repository | contains (via Tree/File) | File | through `contained_in` on File |
| Commit | changes | File | via Change records (A/M/D/R/C) |
| Commit | child_of | Commit | parents |
| Commit | has_tree | Tree | root tree |
| PersonClaim | authored / committed | Commit | claimed only, `verified: false` |
| Repository | depends_on | Package | via DependencyEdge, source = manifest blob |
| Package | depended_on_by | Repository | reverse edge for queries |
| Workflow | tests_builds_deploys | Repository | declared_only (no execution) |
| Schema | defines / describes_api_of | Endpoint, Repository | OpenAPI/GraphQL |
| Deployment | deploys | Repository | compose images, manifests |
| Ref | points_to | Commit or Tag | 1:1 mapping, HEAD recorded separately |
| Tag | tags | Commit | via TagObject for annotated tags |
| Submodule | pinned_by | Repository | gitlink terminal opaque, never fetched |
| File | symlink_to (data) | target string | target never resolved |
| Doc | documents | Repository | README headings |
| License | licenses | Repository | family detection |
| Ownership | owns_paths_in | Repository | CODEOWNERS entries |

No file content is ever stored as flat searchable chunks at this layer.
Content exists only as addressed blobs (`blob:<sha>`); text extraction
happens in later deterministic stages (AST/imports) or AI stages (docs),
each citing the blob SHA as evidence.

## 3. Ingestion surface

Repo identity, remotes (URL as data, never fetched speculatively), default
branch (HEAD symref target), commits (full headers + sanitized message),
claimed authors/committers + timestamps, trees, files (mode, size, sha),
tags (annotated vs lightweight), releases (tag + notes blob; GitHub Release
objects are lane CONN's API territory), CODEOWNERS, README, package manifests
(package.json, Cargo.toml, go.mod, pyproject.toml, Gemfile, pom.xml),
lockfiles (package-lock, Cargo.lock, poetry.lock, Gemfile.lock; record
lockfileVersion + resolved versions, the actual dependency truth),
license files (family detection), JSON Schema files, OpenAPI/Swagger,
GraphQL schemas, Dockerfiles, Compose files, CI workflows (.github/workflows,
.gitlab-ci.yml, Jenkinsfile as data), deployment manifests (k8s yaml,
terraform as data), docs trees, .gitattributes/.gitmodules/.gitconfig
(parsed as data, never loaded as config), .lfsconfig (data only, never
fetched), symlinks (target as data).

Out of scope for this lane (sibling lanes): issues, PRs, reviews, CI run
results, GitHub Releases metadata (lane CONN, GitHub API); secret handling
(lane L); event emission mechanics (phase0 Event Authority); lineage
projection (lane N); dependency-index invalidation (lane O consumes our
depends_on edges).

## 4. Manifest detectors (deterministic first)

Each detector is a pure function: `(path, bytes) -> observations | null`.
Order: exact filename match, then extension, then magic bytes. Malformed
manifests emit `Manifest{unparseable: true}` (typed, never silent).

Proven in spike: package.json (+lock), openapi.yaml, docker-compose.yml,
.github/workflows/*.yml, CODEOWNERS, LICENSE, README.md.
Next detectors: Cargo.toml, go.mod, pyproject.toml, tsconfig.json (paths
aliases for import resolution), Dockerfile (FROM/ARG), k8s yaml
(kind + metadata.name), GraphQL .graphqls (type/query), AsyncAPI,
webpack/vite configs (entry points), .nvmrc/.node-version (toolchain pins).

Import/export edges (AST where justified): tree-sitter or swc parse for
js/ts, producing File ->imports-> File/Package edges. Deterministic,
no AI. AI is reserved for: architectural synthesis from the graph,
unknown manifest semantics, docs understanding, cross-repo reasoning.

## 5. Engine decision (evidence from spike)

Hybrid, behind one `GitReader` interface:

- PRIMARY: git CLI plumbing (`cat-file`, `ls-tree`, `rev-list`, `diff-tree -M`,
  `for-each-ref` avoided for enumeration). Exact fidelity by construction;
  pre-read blob caps via `cat-file -s` (proven: 5 MiB declared blob, heap
  delta < 8 MiB); diffcore rename detection reused verbatim (exact renames
  certainty 1.0, inexact scored hypotheses); config isolation via
  `GIT_CONFIG_GLOBAL=/dev/null` + `-c` flags (proven: smudge/hook payloads
  never executed).
- FALLBACK: isomorphic-git (MIT, pure JS, 4.9 MB, 11 small deps) for
  environments without a git binary. Documented limits proven in spike:
  no pre-read size caps (packfile objects inflate regardless of requested
  format), no diff/rename detection, readTree throws on hostile trees
  (must be converted to quarantine), `log` is single-ref (wrapper walks
  all refs itself).
- REJECTED: go-git (silent divergence class), nodegit (heavy native
  prebuilds, lagging maintenance), hand-rolled diffcore (duplicates git),
  GitHub REST as canonical history (silent truncation: 300-file diff cap,
  1 MB blob refusal, 250-commit compare cap; PATTERN_ONLY for pagination
  and rate-limit header discipline).

Vendor veto gate: isomorphic-git is a small mature MIT library, no recurring
cost, no data custody, removable behind the interface. It does NOT trigger
the veto gate. No paid/heavy vendor is introduced by this design.

## 6. Incrementality: OLD HEAD -> NEW HEAD

A commit is already an incremental boundary. Per repo, persist
`{ref: last_ingested_sha}` cursors (lane M owns the cursor store).

1. Fetch (skeleton mirror) or open local repo; take new ref snapshot.
2. For each tracked ref: `rev-list old..new` = exactly the new commits.
   Webhook push events (HMAC-verified, delivery-id deduped) supply the
   same `before/after` pair without polling; webhooks are lossy hints,
   so a periodic `fetch + diff tips` reconciliation loop is mandatory.
3. Ingest only new commits: their trees (dedupe by tree SHA against the
   store; unchanged subtrees are never re-walked), new blobs under caps,
   diffs for Change records.
4. Ref moves: emit `RefMoved{ref, old, new}`; force-push (non-fast-forward)
   marks affected File/Commit observations superseded, never deleted
   (history is evidence; lane N projects current state).
5. End: compare ref snapshot; any ref moved during the packet marks it
   `STALE:ref-moved-during-ingest` and re-queues.

Commit-graph generation numbers (or git's own commit-graph file on the
mirror) bound history queries; stale index degrades to slow-but-correct.

## 7. Safety contract (from ~/workspace/git-ingestion/threats)

Parse-only. Never checkout, never hooks, never smudge/clean filters, never
diff drivers, never submodule recursion, never LFS fetch, never build/test
the repo's code. Tree entry names gated like `git fsck` (empty, `.`, `..`,
`.git`, `/`, NUL, >255 bytes). Symlinks recorded as `{path, target}`,
never resolved. Authors are `claimed_*` until a pinned trust anchor verifies
a signature, recorded as `{present, valid, trusted}` never a single boolean.
All repo strings sanitized at the boundary (ANSI, C0/C1, bidi). Resource
caps in one config module; every breach a typed event; quarantine is
`QUARANTINED:<reason>`, never a silent skip. Full gauntlet in the threats
document; spike proves G-01/G-14/T-09 shapes plus F-01..F-04.

## 8. Failure taxonomy mapping (lane K)

AUTH_REQUIRED (private remote), SOURCE_UNAVAILABLE (origin unreachable),
SCHEMA_CHANGED (manifest grammar drift), INVALID_PAYLOAD (malformed tree),
TIMEOUT (packet wall-clock), TRANSIENT (fetch retry), PERMANENT
(repo-unreadable, quarantine). No new taxonomy invented here.

## 9. Integration seams

- phase0: packets enter through the canonical Event Authority as
  observations; lane A never invents an event id or a second authority.
- lane CONN: git-native owns history/refs/trees truth; GitHub API owns
  issues/PRs/reviews/CI runs/releases metadata. Tag truth: git wins.
- lane N: lineage SOURCE -> OBSERVATION -> EVIDENCE -> OBJECT uses our
  packet's evidence pointers (SHAs).
- lane O: our depends_on edges feed the dependency index for targeted
  regeneration.
- lane J: every run records source/run/start/finish/checkpoint/
  discovered/accepted/rejected/changed/conflicts/errors/bytes.
- lane M: per-repo cursors `{ref: last_ingested_sha}`, health, budgets.
- lane R: fixture repos (spike/fixtures) become replayable ingestion
  fixtures; every production failure becomes a fixture + regression test.
- lane DUP: this design must not duplicate the event store, identity
  generation, or provenance model; DUP reviews the wrapper at integration.
