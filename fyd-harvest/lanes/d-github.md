# Lane D — GitHub / Repository Ingestion Audit

**Date:** 2026-09-22 (MDT) · **Scope:** read-only · `/home/nolan/ping` @ `cc6856c3` (branch `refactor/runtime-authority-convergence`), `/home/nolan/projects/ping` @ `0dec40f5` (branch `fyd/builder-composition`) · DB evidence from live `brain-postgres` (`ping_runtime`, `crx_runtime`) and `ping-postgres` (`crx_runtime`)

## 0. The terminology trap (read first)

`repository_events` / `repository_objects` / `repository_snapshots` / `repository_dead_letters` are **NOT git-repo ingestion tables**. They are the internal constitutional event-sourcing object store — the DDD "repository" pattern (persistence of PING's own canonical objects/events). Proof:

- Writers: `runtime/kernel/event_repository.js:117` and `gateway/append_orchestrator.js:91` (`INSERT INTO repository_events`), `ping-runtime/events/repository_store.js` (`INSERT INTO repository_objects`), `gateway/snapshot_repository.js` + `gateway/migration_engine.js` (`repository_snapshots`).
- Live row counts: **0 rows in all four tables** in `ping_runtime` (brain-postgres), `crx_runtime` (brain-postgres), and `crx_runtime` (ping-postgres). The tables were migrated but never populated.
- Live `ping_events` (2321 rows): **zero** event types matching GITHUB/REPOSITORY/COMMIT. Existing types are business events (LEAD_CREATED, ESTIMATE_CREATED, OBSERVATION_CREATED, …).

So the 2026-09-22 inventory line "repository_* (code-observation mirrors)" was misleading: those tables are empty plumbing for PING's own object store, not a mirror of anyone's code.

## 1. What exists today: two parallel GitHub acquisition stacks, both dormant

There is **no git protocol anywhere** in the acquisition path: no `git clone`, no libgit2, no codeload tarball download (only `tarball_url` recorded as a string in release data at `gateway/github_snapshot.js:296`). All acquisition = **GitHub REST API polling**. The only code touching a real local git repo is `ping-runtime/orchestration/intelligence_graph.js:294`, which runs `git log --name-only` on **PING's own checkout** for self-code-intelligence weighting — not customer ingestion.

### Stack A — Python worker (`runtime/workers/github_worker.py`, 144 lines, built 2026-07-05)

- `GitHubWorker` polls `api.github.com` every 5 min: repo meta, commits (10), PRs (5), branches (10), contributors (5), languages. Emits `REPOSITORY_DISCOVERED`, `COMMIT_CREATED` (new SHAs only), `FILE_INDEXED` (per branch) into the legacy `events` table via `RepositoryAuthority`.
- Requires `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_TOKEN` env (`runtime/config/configuration_authority.py:104-106`). Unset → worker idles forever with a warning.
- Imported in `runtime/workers/__init__.py`, but the live system is the JS gateway, not the Python worker pool — this stack is dead code in practice.

### Stack B — JS connector + Milestone-2 constitutional pipeline (built 2026-07-05 → 2026-07-29)

| File | Role |
|---|---|
| `ping-runtime/connectors/github_adapter.js` (121 lines) | REST fetch: meta, commits(10), PRs(5), branches(10), contributors(5), languages. **No auth support** — anonymous calls only. |
| `ping-runtime/connectors/github_connector.js` | Standardized Connector interface: `authenticate()` / `discover()` / `health()` / `sync(service)`. |
| `gateway/github_ingestion.js` | `emitEvent` bridge: `REPOSITORY_DISCOVERED` + up to 10 `COMMIT_CREATED` + up to 5 PRs emitted as `FILE_INDEXED` with `type: 'pull_request'` (semantic collision with the worker's branch-as-FILE_INDEXED). |
| `gateway/github_snapshot.js` (436 lines) | Full snapshot: repo, branches, commits, PRs (all), issues (all), releases, tags, contributors + per-commit (cap 50) recursive tree (`/git/trees/{sha}?recursive=1`) + commit metadata. |
| `gateway/github_normalizer.js` → `gateway/github_constitutional_objects.js` | Normalizes into `GitHubRepositoryObject` / `GitHubCommitObject` / `GitHubTreeObject` / `GitHubDirectoryObject` / `GitHubBlobObject`. |
| `gateway/github_constitutional_pipeline.js` | Snapshot → Normalizer → CanonicalBytes → CanonicalHash → Identity → `RepositoryStore` (`repository_objects`). |
| `gateway/github_release_watcher.js` | Hourly release polling, dedup via in-memory set + `github_scan_metadata` table — **that table does not exist in any live DB** (would crash on `initialize()`). |

### Wire-up state (the live gateway, `gateway/bootstrap/gateway_runtime.js:261`)

- `GitHubConnector` **is registered** in the `ConnectorRegistry` and `sync()` is callable on demand via connector routes.
- Nothing schedules it: **no cron, no interval, no webhook, no event subscription.** `ping-gateway` container has **no `GITHUB_*` env vars**; the adapter falls back to `repositoryDiscoveryAuthority.discoverRepositoryIdentity()` (PING's self-identity).
- The Python worker pool is not the live runtime; Stack A can never fire.
- Conclusion: **three implementations of "poll GitHub API → emit events", zero of them connected end-to-end, zero rows/events ever produced.**

## 2. What breaks (evidence-graded)

1. **Unconfigured by design.** Env vars never set on any live container; Python worker idles, JS adapter falls back to self-identity. (CONFIRMED: `docker exec ping-gateway printenv | grep -i github` → empty.)
2. **Anonymous API calls + unbounded snapshot = guaranteed rate limit.** Adapter has no token support (60 req/hr). A single `fetchSnapshot()` issues ~8 paginated endpoints plus 2 calls × up to 50 commits = 100+ requests per run. One snapshot = one hour of budget, then 403 → `null` → `status: 'unavailable'`. (CONFIRMED by code reading.)
3. **Release watcher references a nonexistent table** (`github_scan_metadata`); `initialize()` would throw on the first `_loadLastScanTimestamp()`. (CONFIRMED: table absent from all live DBs.)
4. **No temporal cursor.** The worker's `new_commits` diff is an in-memory `set`; a restart re-emits the last 10 commits as "new". Snapshot pagination has no `since`/`etag`; every run re-fetches everything. Refresh today = re-understand latest N, not diff-based. (CONFIRMED by code reading.)
5. **Semantic collision.** `FILE_INDEXED` means "branch" in the Python worker and "pull request" in the JS ingestion bridge. (CONFIRMED.)
6. **Ceremony without substance.** The Milestone-2 pipeline demands `canonical_bytes` + `VerificationAuthority` pass + canonical hash for what is, at the end of the day, a REST poll — the constitutional machinery was built for a feed that was never turned on. `RepositoryStore.append()` upserts on `object_id` with version bump, which at least makes re-ingest idempotent, but the tables are empty so this was never exercised.

## 3. Git history: built once, refactored twice, never run

- **2026-07-05** — `8004ff307` "Milestone 2 — GitHub Constitutional Pipeline" and `d596aa596` "freeze constitutional replay kernel": snapshot/normalizer/objects/pipeline + Python worker created in a single-day constitutional sprint.
- **2026-07-29** — `1effdc8ad` "PING Core v1 build-out": `github_connector.js` wraps `github_adapter.js` in the standardized Connector interface.
- **~2026-08** — `e6f8e4bef` "M3 migration": files relocated gateway → ping-runtime families; `1fb7594d2`/`93bcaecd6` tighten authority layering (transport isolation: snapshot no longer creates constitutional objects).
- **2026-09**: nothing. No commits touching any GitHub ingestion file in ~2.5 months.

Pattern: built as ceremony during the July constitutional sprint, duplicated (Python vs JS vs connector), then frozen by refactors. Classic architectural amnesia risk: the duplication was never consolidated because nothing ever ran.

## 4. FYD app side (`/home/nolan/projects/ping`): zero repo ingestion

`src/fyd/harvest/` contains only `IDENTITY-PROOF-EVIDENCE.json` and `PUBLIC-SOCIAL-DATA-FABRIC.md`. The GitHub mentions there are **owner-identity anchoring** (public `users/<login>` reads; the connected `custom.github` credential 401s per FL-20260921-012) — not repository code ingestion. `src/fyd/proceduralize/ACQUISITION-STACK.md` mentions GitHub only for release-note research. **FYD has no repo-ingestion machinery at all.**

## 5. The ideal pipeline (Git-first, deterministic)

> Never dump a repo into one giant document. Never treat GitHub as HTML. Git protocol / GitHub API / archives / raw files first; GitHub HTML only as last resort.

```
REPOSITORY ──► TREE INVENTORY ──► MANIFEST EXTRACTION ──► LANGUAGE/SUBSYSTEM CLASSIFICATION
     │                  │                    │                        │
     │                  ▼                    ▼                        ▼
     │           (git ls-tree -r,      (package.json,           (linguist-style
     │            sizes, modes,         lockfiles, workspaces,    byte-counts +
     │            paths only —          Dockerfiles, compose,     manifest-declared
     │            NO file bytes)        CI workflows)             languages +
     │                                                         entry-point heuristics)
     ▼
SYMBOL/IMPORT GRAPH (only where useful: entry points + public exports, tree-sitter, per-file AST cached by blob SHA)
     │
     ▼
DOCS (README, docs/ tree, changelogs — bounded, per-file, blob-SHA addressed)
     │
     ▼
SELECTED SOURCE (only files the use case needs: e.g. src/ for a product page, never node_modules/dist/.git)
     │
     ▼
EVIDENCE (every fact carries: repo, SHA, path, blob SHA, extraction rule version — claims labeled CLAIM, never TRUTH)
     │
     ▼
OBJECTS / RELATIONSHIPS (minimum set below)
```

**Acquisition transport (in order of preference):**

1. `git clone --bare` (or `--filter=blob:none` partial clone) of the repo → local git object store. Full protocol fidelity, no API rate limits for tree/blob reads.
2. `git ls-tree -r <sha>` for inventory; `git cat-file -p <blob>` for selected files only; `git diff --name-status A B` for refresh (the temporal model).
3. Codeload tarball (`/repos/{o}/{r}/tarball/{sha}`) as a fallback when git protocol is blocked — single HTTP fetch, still byte-exact.
4. GitHub REST API **only for what git cannot provide**: stars/forks/watchers, issues, PRs, releases metadata, topics, license API. Never for tree/blob content (rate-limited, paginated, lossy).

**Deterministic repository facts to extract** (no model needed): identity (owner/name), default branch, HEAD SHA, license (SPDX from LICENSE file bytes, not the API's guess), languages (byte counts), README (raw bytes + SHA), manifests (package.json, go.mod, Cargo.toml, requirements.txt, …), lockfiles (names + package count + top deps), workspaces/monorepo map, entry points (bin/main/exports fields), exports (public API surface), dependencies (name@version, direct vs transitive where lockfile allows), scripts, Dockerfiles + compose services, CI workflows (jobs, triggers), tags/releases (name, date, notes pointer), docs tree, source tree (paths, sizes, modes).

**Intelligence-needed facts** (model allowed, labeled as derived): subsystem classification ("this is a checkout flow"), what a module *does*, README claim extraction, which docs matter for Ask FYD.

### Grill: stage-by-stage exists-vs-missing

| Stage | Exists today | Missing |
|---|---|---|
| REPOSITORY | Adapter fetches API meta (name, stars, license SPDX, topics) | Git-protocol acquisition; default-branch/HEAD SHA pinning (adapter truncates SHAs to 7 chars — **lossy identity**) |
| TREE INVENTORY | Snapshot fetches recursive tree via API (rate-limit suicide) | `git ls-tree` from a bare clone; size-capped inventory; blob-SHA addressing |
| MANIFEST EXTRACTION | Nothing | package.json/lockfile/Dockerfile/CI parsers (all deterministic) |
| LANGUAGE/SUBSYSTEM CLASSIFICATION | API `language` single string + languages byte map (unused) | Linguist-style classification; subsystem map |
| SYMBOL/IMPORT GRAPH | Nothing | tree-sitter per-file, cached by blob SHA |
| DOCS | Nothing (README never fetched!) | Bounded README/docs-tree harvest |
| SELECTED SOURCE | `fetchFile` exists but unused by any pipeline | Use-case-driven file selection |
| EVIDENCE | Canonical hash machinery exists but fed nothing | Per-fact provenance (repo, SHA, path, rule version) |
| OBJECTS/RELATIONSHIPS | 5 constitutional object classes, empty tables | Minimum object set below, populated |

## 6. Temporal model (the critical design)

**Cursor = one row: `(repo_id, last_seen_sha, tree_sha, seen_at)`.**

- Refresh: `git ls-remote` (or compare stored HEAD) → if HEAD unchanged, **do nothing**. If HEAD moved A → B: `git diff --name-status A B` (+ `--find-renames`) → added / modified / deleted / renamed paths.
- Reprocess **only** affected paths: re-extract manifests/docs/symbols for added+modified, tombstone deleted, follow renames as identity-preserving moves (not delete+add).
- Blob-SHA content cache: if a modified file's blob SHA was seen before (revert, cherry-pick), reuse the prior extraction — never re-understand identical bytes.
- Commit walk for Commit objects: `git log A..B` only; each commit is an immutable fact (SHA-addressed), emitted once.
- Events stay append-only and idempotent: deterministic event IDs from `(repo, sha)` preimage (PING's existing SHA-256 identity scheme already supports this; the inventory confirms idempotent re-ingest is structural).
- **What current code does on refresh:** re-polls latest 10 commits with an in-memory "seen" set (lost on restart → re-emits), re-fetches the whole snapshot with no `since`, no cursor, no diff. It re-understands everything every run — the exact anti-pattern the temporal model forbids.

## 7. Minimum object set

FYD's actual customers are home-service trades — **most have no GitHub presence at all**. The GitHub-derived surface serves two real use cases: (a) software/product businesses as FYD customers (project object → product page), (b) Ask FYD knowledge over a customer's docs/releases. Minimum viable set:

| Object | Serves | Deterministic? |
|---|---|---|
| **Repository** | Identity anchor for any code-derived presence; project object → product page | Yes (API meta + HEAD SHA) |
| **Document** | README/docs harvested as Ask FYD knowledge; evidence-graded claims | Bytes deterministic; claim extraction is intelligence |
| **Release** | Changelog/release feed → Ask FYD "what's new"; product-page freshness signal | Yes (tag SHA, date, notes pointer) |

**Deliberately excluded for now** (add only when a real customer needs them): Commit (needed only for contributor/churn analytics — no current use case), Package/Module (needed only for dependency-aware customers), Dependency (no FYD use case yet), Contributor (no use case; also PII-adjacent), Issue/PullRequest (support-ticket mirroring — not a current FYD motion), Workflow (CI facts fold into Repository manifest extraction as plain fields), License as separate object (a SPDX string field on Repository suffices until license-risk analysis is a product).

**Do NOT create schemas for all candidates.** Three objects. Everything else is a field.

## 8. Hard questions (answered)

- **Why ingest GitHub at all?** Only for customers whose business *is* software or whose product presence lives in code: project object → product page, docs → Ask FYD, releases → freshness/changelog. For the current home-service trade base, the answer is *don't* — there is nothing to ingest.
- **Minimum useful GitHub-derived presence:** Repository (identity + HEAD SHA + license + languages) + README as a Document + releases list. Anything less is a dead link; anything more is speculative.
- **Deterministic vs intelligence:** Section 5's table. Rule: if `git cat-file` + a parser can produce it, it is deterministic and must never go through a model. Models only classify, summarize, and extract claims — always labeled derived.
- **Can README claims be trusted?** As **claims, not truth**: store as `CLAIM` evidence with provenance (repo, SHA, path, extracted-at), never as canonical business facts. A README saying "SOC2 compliant" is an observation about what the README says.
- **License implications of harvested source:** Harvest *facts about* code (manifests, dependency names, doc text), not code bodies, by default. Storing third-party source blobs creates license-contamination risk (copyleft) and secret risk. If source bodies are ever stored: only with explicit customer authorization, only their own repos, license recorded per repo from LICENSE bytes, and proprietary code never leaves the local trust boundary.
- **How to avoid sending proprietary repos to external models:** Hard rule — proprietary/customer code is processed by **deterministic extractors + local models only** (the Pig already runs `ollama`; keep it on-host). External model calls, if ever used, receive *derived summaries and file paths*, never source bytes. Enforce at the transport layer: the harvest worker's model client allowlists only local endpoints for `source_bytes` inputs.

## 9. Top 3 GitHub backlog candidates (with evidence)

1. **Consolidate-or-delete the three dead acquisition stacks.** `runtime/workers/github_worker.py`, `ping-runtime/connectors/github_*`, and `gateway/github_{snapshot,normalizer,constitutional_pipeline,ingestion,release_watcher}.js` are parallel implementations of the same un-run idea (built 2026-07-05/29, untouched ~2.5 months, 0 rows/0 events). Pick ONE (recommend the connector interface — it is the only one wired into the live gateway at `gateway_runtime.js:261`) and archive the rest per the anti-amnesia rule. Evidence: §1–§3 above.
2. **Build the Git-first harvest worker with the SHA-diff temporal model** (§5–§6) — but *only* behind a real customer need. The worker: bare/partial clone → `ls-tree` inventory → manifest/doc extraction → cursor table → idempotent PING events. Replaces API polling (fixes rate-limit suicide and the missing cursor in one move). This is the actual P0 when the first software-product FYD customer appears.
3. **Fix the semantic collisions and schema lies before anything runs.** `FILE_INDEXED` means two different things (§2.5); `github_release_watcher.js` references a nonexistent `github_scan_metadata` table (§2.3); the adapter truncates SHAs to 7 chars (§5 grill). Any one of these corrupts the event log the moment the pipeline is switched on. Small, surgical, prerequisite to candidate 2.
