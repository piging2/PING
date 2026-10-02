# GITHUB INGESTION ADAPTER: current state, gaps, design

**Lane:** 5 (GitHub ingestion adapter) | **Author:** swarm subagent, READ-ONLY/reader lane
**Date:** 2026-09-25 ~20:05 MDT | **Swarm:** 24-hour convergence, clock start 19:41 MDT
**Status:** DESIGN AND INVENTORY ONLY. No code written, nothing built, nothing pushed.
**Scope respected:** no `/home/nolan/worktrees/cop*` or `fyd*` touched; no builds, no test runs, no credentials read or changed.

---

## 0. TL;DR for the parent

1. **There is no repository ingestion implementation today.** The entire git/GitHub ingestion surface is two design documents plus a thin GitHub API skill. Zero live machinery exists. This is the single most important finding.
2. **The design prior art is strong and directly reusable:** an 8-record ecosystem harvest with ADOPT/ADAPT/PATTERN_ONLY verdicts, and a 12-threat register with global boundaries, a 16-test acceptance gauntlet, and a 10-item hard gate. Any implementation starts here, not from scratch.
3. **The canonical write seams already exist:** `OBSERVATION_CREATED` events via POST `/events` (tandem/emit-observation.py, tenant_id required), and the generic connector contract (fetchState/failureMode/confidenceGrade enums in the manifest schema). The adapter must ride these, not invent new ones.
4. **The "GitHub is not truth" architecture is already the PING law:** canonical objects are minted by the journal/IdentityAuthority with `provenance.ref` and confidence grades; GitHub facts enter only as DERIVED/DIRECT evidence. The adapter design below formalizes that as an anti-corruption layer.
5. **CRX harvest is a dead end this turn:** the swarm brief's reference path `/home/nolan/crx-swarm/crx-runtime-main` does not exist on this machine. No harvest was possible.

---

## 1. Current-state inventory

Legend: LIVE = code that executes; DESIGN = spec only; DEAD = once real, now inert; VENDORED = third-party code that happens to mention git.

### 1.1 Design documents (DESIGN, no implementation)

| # | Artifact | Contents | What it is NOT |
|---|---|---|---|
| D1 | `~/workspace/git-ingestion/findings/ECOSYSTEM-HARVEST.md` (2026-09-23, 8 records) | Verdicts per mechanism: ADOPT libgit2/pygit2 (record 1), ADOPT partial-clone skeleton `filter=blob:none` + OID-keyed lazy blob backfill (record 5), ADOPT push-webhook HMAC/dedupe incremental ingest (record 6), ADAPT fast-import/fast-export grammar as canonical replay journal (record 2), ADAPT commit-graph generation-number DAG index (record 3), ADOPT git diff machinery with exact-vs-inexact rename split (record 4), PATTERN_ONLY GitHub REST/GraphQL (record 7, silent-truncation hazards enumerated: 300-file diff truncation, `patch: null` on large files, 1MB contents-API cap, 250-commit compare cap, 10k commits tab), PATTERN_ONLY Sourcegraph/Gitiles/go-git architecture (record 8, incl. explicit anti-recommendation of go-git for fidelity). Top-5 harvest ranking included. | No code. No scheduler, no schema, no event mapping. |
| D2 | `~/workspace/git-ingestion/threats/GIT-INGESTION-THREATS.md` (2026-09-23) | 12 threats (T-01 path traversal, T-02 submodule bombs, T-03 pack bombs, T-04 binary smuggling, T-05 author spoofing, T-06 signature forgery/stripping/malleation, T-07 force-push TOCTOU, T-08 symlink escape, T-09 .gitattributes/.gitconfig smuggling, T-10 LFS abuse, T-11 metadata injection, T-12 ref namespace confusion); global boundaries table (64 MiB/blob, 100:1 expansion ratio, 1 GiB/packet, 10k commits/packet, 120s timeout, etc.); 16-test acceptance gauntlet (G-01..G-16); 10-item hard gate (parse-only architecture, submodule terminal-opacity, in-stream caps, symlink non-resolution, config isolation, ref-snapshot STALE protocol, claimed_* identity discipline, zero repo-content-derived egress, boundary sanitization, typed quarantine). Header states verbatim: "THREAT DESIGN ONLY. No implementation here." | No test fixtures, no harness, no boundary enforcement code anywhere in the workspace. |
| D3 | `~/workspace/business-connectors/hidden_files/connector-contract.md` + `connector-manifest-schema.md` (2026-09-23) | Generic connector contract: capability verbs {read, search, subscribe, webhook-receive, write} with write DENIED by default (§1.1); confidenceGrade {DIRECT, DERIVED, INFERRED, OWNER_ASSERTED, CONFLICTING, UNKNOWN}; fetchState {NOT_STARTED, STARTED, SUCCEEDED, FAILED, OUTCOME_UNKNOWN}; failureMode {provider-down, rate-limited, malformed-response, auth-expired, partial-success, tos-change, sanitization-rejected, oversized, webhook-disabled, delta-token-invalid}; payload caps (256 KB/record, 5 MB/fetch, 10 KB text field); SSRF guard (never fetch file://, localhost, private IPs); webhook HMAC via Meta raw-body pattern + Stripe timestamp-bound signatures + event-id idempotency. | No git/GitHub-specific fields (no SHA pinning, no ref snapshot, no ref-moved semantics). |

### 1.2 Connectivity shims (LIVE but thin, no ingestion semantics)

| # | Artifact | What it does | Gap |
|---|---|---|---|
| S1 | `~/workspace/skills/github/SKILL.md` | GitHub REST via stored `custom.github` credential; authenticated requests restricted to `api.github.com`; dynamic_credentials surrogate helpers; reconnect flow. | No ingestion code. No pagination, no rate-limit header reading, no completeness flags (the exact hazards D1 record 7 warns about). No webhook receiver anywhere. |
| S2 | `~/workspace/skills/github/bin/gh-api.py` | Single generic REST helper (~1.5 KB). | Thin CLI wrapper only. |

### 1.3 Canonical seams the adapter must ride (LIVE)

| # | Seam | Source | Why it matters for the adapter |
|---|---|---|---|
| C1 | `OBSERVATION_CREATED` POST to gateway `/events`, with mandatory `tenant_id`, `aggregate_id`, `aggregate_type`, `event_data` | `~/workspace/tandem/emit-observation.py:545-561`; duplicate-emission guard (obs sha256), verification gate (UNVERIFIED never emitted), fail-closed preconditions | This is the write path for source evidence. The adapter emits observations through it; it never writes canonical objects directly. |
| C2 | `POST /ingest` namespace seam `core::<name>/tenant::<id>` (CanonicalizationService.authorizeNamespace) | `~/workspace/constitutional-sprint/capability/CAPABILITY-PROJECTION.md` (core finding, 2026-09-24) | The adapter's canonical namespace for GitHub-sourced objects. Tenant binding happens here. |
| C3 | Canonical core law: ACTOR / OBJECT / RELATIONSHIP / CAPABILITY / TRANSITION / EVIDENCE; "one authority per decision; many adapters/executors/projections" | `~/workspace/constitutional-sprint/STANDING-INVARIANTS.md:7-8` | The adapter is an adapter, not an authority. It may never mint identity or decide truth. |
| C4 | PING knowledge model: `provenance.ref` required on objects; gateway journal `ping_events` is the replayable store; signed envelopes | `~/workspace/constitutional-sprint/authority-map/AUTHORITY-MAP.md` (rows #29, #16, #1) | Every GitHub-derived fact must carry `provenance.ref` back to the pinned observation. |
| C5 | Confidence discipline already exists at the connector layer (DIRECT/DERIVED/INFERRED/OWNER_ASSERTED/CONFLICTING/UNKNOWN) and at PING boundaries (attestation-gate refuses to fabricate; OUTCOME_UNKNOWN never blind-retries) | D3 manifest schema; CAPABILITY-PROJECTION §attestation | The adapter inherits this vocabulary. No new grades needed for v1. |

### 1.4 Dead / vendored / noise

- **No agent08 code:** `~/workspace/constitutional-sprint/agent08-patch-commit-git/PATCH-COMMIT-GIT.md` audits local git *operations* (patch/commit/push of PING's own repos), not repo ingestion. Its one relevant verdict: zero signed commits in either repo, identity is a gitconfig string. That precedent reinforces T-05/T-06 design: treat all git identity fields as claims.
- **Vendored dulwich/Repo() hits** in `~/workspace/crx-autonomous-missions/repos/swe-agent/...` and `~/workspace/ping-autonomy-challenge/...` are third-party challenge fixtures (swe-agent), not PING machinery.
- **`~/workspace/skills/github/bin/__pycache__`**: build artifact of the thin CLI only.
- **CRX reference:** `/home/nolan/crx-swarm/crx-runtime-main` does not exist (verified `ls`, 2026-09-25 20:00 MDT). Per swarm doctrine (harvest ideas only), the CRX angle contributes nothing this turn. **Hold-worthy only if another lane expected it:** I did not write CRX-shaped code regardless.

**Inventory verdict: nothing runs.** The gap between "what exists" and "what is missing" is total. That is fine: it means the design below has no legacy to be compatible with, only law to conform to.

---

## 2. Gap analysis against the required capability list

Each required capability, its status, and the exact absent location or mechanism.

| # | Required capability | Status | Evidence of absence |
|---|---|---|---|
| 1 | **Pinned SHA** for every ingested repo state | MISSING | D1 record 5 specifies OID-keyed blob backfill but no repo-state record schema exists; D2 T-07 defines `ref_snapshot`/`ref_snapshot_end` packet fields but no packet struct or emitter implements them; no `Repository.ingest_sha` anywhere in workspace code. |
| 2 | **Branch/ref tracking** | MISSING | D2 T-12 defines ref validation + symref hop caps + 1:1 ref->SHA mapping as proof-test assertions; no ref registry, no default-branch resolution, no ref-change event type exists. |
| 3 | **License** (per repo, per file where derivable) | MISSING | Not mentioned in D1, D2, D3, or any workspace doc. No license-detection stage, no license object in any proposed model. GitHub's `license` API field / SPDX detection is unaddressed. |
| 4 | **File provenance** (which commit introduced which file, blame chain) | PARTIALLY SPECCED | D1 record 1 (pygit2 blame) and record 4 (diffcore exact/inexact rename -> certain vs scored lineage edges) cover the *mechanism*; but no schema binds a file's introduction commit, no `introduced_by` relationship type, no per-file confidence (exact rename = DIRECT, inexact = INFERRED with threshold recorded). |
| 5 | **Change detection** (what moved between snapshots) | SPECCED, UNIMPLEMENTED | D1 record 4 (diff machinery) + D2 T-07 (before/after OID range) describe it; D3 failureMode has no `ref-moved-during-ingest`; no `changes` relationship emitter exists. |
| 6 | **Incremental re-ingest** | SPECCED, UNIMPLEMENTED | D1 record 6 (webhook -> before/after range -> fetch -> rev-list delta) + record 3 (DAG index) are the design; but: no webhook receiver code (no route, no HMAC verify, no delivery-dedupe store), no fetch queue, no per-repo watermark (last-ingested tip per ref), no reconciliation sweep (D1 record 6 explicitly warns webhooks are lossy hints and requires one). |
| 7 | **Deletion/supersession semantics** | MISSING | Git history is append-only; PING objects need lifecycle. D2 has quarantine (`QUARANTINED:<reason>`) for malformed repos but no semantics for: file deleted at commit C (observation of absence), repo force-pushed (tips superseded), PR closed unmerged, release superseded by a newer release. No `supersedes` relationship type defined anywhere; PING's object model has no lifecycle state in the adapter surface. |
| 8 | **Tenant context** | PARTIALLY EXISTS | C1/C2: `tenant_id` is mandatory on POST /events and `core::<name>/tenant::<id>` is the canonical namespace. MISSING for the adapter: which tenant owns a GitHub repo observation (org mapping? per-business repo set?), who may register a repo for ingestion, and how tenant isolation prevents repo A's observations from being queryable by tenant B. D3's manifest has no tenant fields. |
| 9 | **Rate-limit receipts** | MISSING | D1 record 7 documents GitHub's limits (REST 5,000/hr authenticated, GraphQL 5,000 pts/hr, search 30/min, secondary limits with Retry-After) as *limits only*. D3 failureMode has `rate-limited` but no receipt schema: no recording of `X-RateLimit-Limit/Remaining/Reset`, no 403-vs-429 distinction, no per-attempt quota ledger, no backoff schedule, no per-tenant cost attribution. D1 records 1/5 (git-native reads over HTTPS git protocol) bypass REST limits entirely, which the design should prefer and state explicitly. |
| 10 | **Failure classification** | PARTIALLY EXISTS | D3 failureMode enum covers generic connector failures. MISSING the git-specific taxonomy: `ref-moved-during-ingest` (D2 T-07), `pack-bomb-suspect` (D2 T-03), `malformed-tree` (D2 T-01), `signature-malleated` (D2 T-06), `lfs-pointer-suspect` (D2 T-10), `config-smuggling-pattern` (D2 T-09), `webhook-gap` (reconciliation found missing pushes), `delta-token-invalid`-equivalent for stale ref watermarks. Quarantine semantics exist as text only. |
| 11 | **Immutable source observation/snapshot** | SPECCED, UNIMPLEMENTED | D1 record 2 (fast-import grammar as replay journal) + D2 T-07 (ref snapshot + STALE protocol) + the boundaries table (per-packet caps). No packet schema, no snapshot store, no digest law for packets (cf. FYD's payloadHash law in `ask/envelope.ts:37`, which the adapter should mirror). |
| 12 | **Canonical objects/relationships from snapshots** | MISSING | The object model (Repository, Commit, Branch, File, Module, Package, Dependency, Issue, PullRequest, Test, Build, Release, Deployment) does not exist anywhere in the workspace. D1/D2 speak only of "observations"/"packets". The projection step (observation -> canonical object) is undefined: who promotes, on what evidence bar, with what identity minting. |
| 13 | **Retrieval/context** | MISSING | Search today is namespace-filtered (hybrid_search.js) or vector (embedding_service direct subscription). No adapter-side query contract: no "give me all observations for repo R at tip T", no per-file history query, no retrieval-time completeness flags. |

**Gap verdict:** of 13 required capabilities, 0 are implemented. 6 have mechanism-level design (D1/D2), 2 partially exist at the seam layer (C1/C2/C3/C4/C5), 5 are absent from every document.

---

## 3. Adapter design

### 3.1 Architectural position (the anti-corruption layer)

```
GitHub (remote)  --->  [Ingest plane: git-native reads]  --->  [Snapshot packet]
      (source evidence only)        (libgit2 / partial clone / webhooks)
                                                              |
                                                              v
                                              [Anti-corruption boundary]
                                              - pinned SHA, ref snapshot
                                              - confidence grading
                                              - claimed_* identity discipline
                                              - sanitization, quarantine
                                                              |
                                                              v
                                              OBSERVATION_CREATED events
                                              (POST /events, tenant_id bound)
                                                              |
                                                              v
                                              PING journal -> canonical objects
                                              (promotion by PING, not by adapter)
```

**The invariant:** GitHub data is *source evidence*, never canonical truth. The adapter emits immutable observations. PING's journal and authorities mint canonical objects, resolve conflicts, and own lifecycle. The adapter may not mint identity, may not decide attribution, may not merge duplicates by content (cf. D2 T-06 malleation rule).

**Preferred read path (from D1 record 1+5, mandated):** git-native reads via libgit2/pygit2 against a bare mirror with `filter=blob:none` partial clone. This bypasses REST rate limits entirely, avoids all silent API truncations (D1 record 7), and gives content-addressed determinism. GitHub REST/GraphQL is fallback-only (PATTERN_ONLY) for hosts without git access, and every API-sourced observation carries `completeness: PARTIAL` with the truncated dimension named (never silently complete).

### 3.2 Ingest plane (runs, emits packets)

**Sync plane** (Sourcegraph shape, D1 record 8, adapted):
- One bare mirror per registered repo on disk. No checkout, ever (D2 boundary 1). Repo-local config never loaded: all git invocations with explicit minimal config (D2 T-09).
- Incremental fetch queue. Watermark per repo per ref: `last_ingested_tip` + `ref_snapshot`. Triggers: (a) signed push webhook (HMAC-SHA256 over raw body, delivery-UUID dedupe, before/after OID range, D1 record 6), (b) reconciliation sweep (fetch refs, diff tips; mandatory because webhooks are lossy hints), (c) manual/scheduled full re-walk.
- Per-repo byte budget and the D2 boundaries table enforced in-stream: 64 MiB/blob, 100:1 expansion tripwire, 1 GiB/packet cumulative, 10k commits/packet, 5k refs/packet, 120s packet timeout. Submodules and LFS are terminal-opaque metadata (D2 T-02/T-10). Symlinks recorded as {path, target} data, never resolved (D2 T-08).

**Packet** (the immutable source observation/snapshot):
```json
{
  "packet_id": "sha256(canonical_packet_bytes)",
  "repo": {"owner": "...", "name": "...", "host": "github.com",
           "clone_url": "...", "default_branch": "main"},
  "ref_snapshot": {"refs/heads/main": "<sha>", "HEAD": "ref: refs/heads/main", ...},
  "ref_snapshot_end": {"refs/heads/main": "<sha>", ...},
  "stale": false,
  "commits": [{"sha": "<oid>", "parents": ["<oid>"],
               "claimed_author": {"name": "...", "email": "..."},
               "claimed_committer": {...},
               "authored_at": "...", "committed_at": "...",
               "message": {"text": "...", "truncated": false},
               "signature": {"present": true, "valid": true, "trusted": false, "key_id": "..."},
               "tree": "<oid>"}],
  "diffs": [{"commit": "<oid>", "files": [
             {"path": "...", "status": "added|modified|deleted|renamed",
              "old_path": "...", "blob_old": "<oid>", "blob_new": "<oid>",
              "rename_confidence": {"kind": "exact|inexact", "score": 0.97, "threshold": 0.50}}]}],
  "quarantine": null,
  "caps": {"blob_deferred": ["<oid>"], "blob_truncated": [{"sha": "...", "size": N}]},
  "ingest_meta": {"ingested_at": "...", "adapter_version": "...", "tool": "pygit2/1.20.1"}
}
```
- `packet_id` is a content digest: same refs+objects always yield the same packet (mirrors the FYD payloadHash digest law, `ask/envelope.ts:37`). Dedupe and idempotency come from content addressing, not from sequence numbers.
- `ref_snapshot`/`ref_snapshot_end` implement the D2 T-07 STALE protocol: any ref movement during the walk marks `stale: true` and the packet is re-queued, never emitted mixed.
- `claimed_author`/`claimed_committer` naming is mandatory (D2 T-05). Signature outcomes are `{present, valid, trusted}` against a PING-pinned trust anchor, never a single "verified" bit (D2 T-06). Malleated duplicates are distinct objects (T-06).
- All repo-controlled strings sanitized at the boundary (D2 T-11): ANSI/control stripped, bidi isolated, length-capped with truncation markers.

### 3.3 Object model (canonical layer, emitted as observations, minted by PING)

Identity: every object carries `provenance.ref = packet_id` (+ repo owner/name, pinned tip SHA, ref snapshot). Canonical identity is minted by PING's IdentityAuthority/journal, never by the adapter. The adapter proposes `derived_id` hints (deterministic: `github:<host>/<owner>/<repo>@<sha>` style) for dedupe; PING decides.

**Objects** (confidence grades from D3: DIRECT = GitHub asserts about the repo itself; DERIVED = deterministic from content-addressed facts; INFERRED = heuristic):

| Object | Identity hint | Key fields | Confidence of existence |
|---|---|---|---|
| Repository | `github:github.com/<owner>/<repo>` | host, owner, name, default_branch, license (SPDX or UNKNOWN), visibility (public/private per token view), pinned_tip per ref | DIRECT (provider asserts), tip SHAs DERIVED (content-addressed) |
| Commit | `github:commit:<oid>` | parents, tree, claimed_author/committer, timestamps, message, signature matrix | DERIVED (hash is the identity) |
| Branch | `github:branch:<repo>:<refname>` | refname (check-ref-format validated), tip SHA at snapshot, symref target | DIRECT from ref snapshot; DERIVED tip |
| File | `github:file:<repo>:<blob_oid>@<commit>` | path (fsck-validated), blob SHA, size, sniffed type (not extension), introduced_by commit | DERIVED; `introduced_by` DERIVED from diff walk, downgraded to INFERRED when rename was inexact |
| Module | `github:module:<repo>:<path-prefix>` | language (sniffed), file set | INFERRED (heuristic grouping; record method) |
| Package | `github:package:<repo>:<manifest>` | manifest path, name, version, manager (from lockfiles/package manifests; content-sniffed) | DERIVED from manifest content |
| Dependency | `github:dep:<package>:<name>@<spec>` | name, version spec, source (manifest path) | DIRECT (manifest asserts) |
| Issue | `github:issue:<repo>#<n>` | number, title, state, claimed reporter, labels | DIRECT (provider asserts) |
| PullRequest | `github:pr:<repo>#<n>` | number, head/base SHAs (pinned), state, claimed author, merged commit | DIRECT; merged_commit DERIVED |
| Test | `github:test:<repo>:<path>::<name>` | framework (sniffed), path, last-seen commit | INFERRED (discovery heuristic; record method) |
| Build | `github:build:<repo>:<run_id>` | workflow, run id, conclusion, commit SHA | DIRECT (provider asserts) |
| Release | `github:release:<repo>:<tag>` | tag (validated ref), commit SHA, assets | DIRECT; tag->SHA DERIVED |
| Deployment | `github:deploy:<repo>:<id>` | environment, ref/SHA, status | DIRECT (provider asserts) |

**Relationships** (edges are observations too; each carries `provenance.ref` and a confidence grade):

| Relationship | From -> To | Confidence rule |
|---|---|---|
| contains | Repository -> Branch/File/Module/Package; Module -> File | DERIVED from tree walk at pinned tip |
| depends_on | Package -> Dependency | DIRECT from manifest |
| changes | Commit -> File | DERIVED from diff; exact rename = DERIVED, inexact rename = INFERRED (threshold recorded, D1 record 4) |
| fixes | PullRequest -> Issue | DIRECT when provider links it; INFERRED when mined from message text ("fixes #n" pattern; record method) |
| tests | Test -> Module/File | INFERRED (path/framework heuristic; record method) |
| generated_from | File -> File (e.g., lockfile from manifest, bundle from source) | INFERRED unless provider metadata asserts it |
| deployed_as | Release -> Deployment; Commit -> Deployment | DIRECT from provider deployment records |
| supersedes | Commit -> Commit (force-push tip replacement); Release -> Release (newer tag); File@C2 -> File@C1 (same path, newer tip) | DERIVED from ref movement / version ordering; never deletes the superseded node |

### 3.4 Deletion and supersession semantics (new, gap #7 closed)

1. Git history is append-only. Deletions are *observations of absence at a pinned tip*: `File` node persists; the `contains` edge for (Repo@tip, File) is absent at tip T2 and a `removed_at` observation (commit C, diff status=deleted) is emitted. Downstream projections decide visibility; the evidence never vanishes.
2. Force-push: old tip commit nodes remain (content-addressed, still true); a `supersedes` edge from new tip to old tip records the ref movement; the ref snapshot pair (before/after) is the evidence.
3. Repo deletion on the host: emit `Repository.lifecycle = DELETED_ON_HOST` observation with timestamp and last known tip; quarantine the mirror; keep all prior packets (history is not rewritten because the host forgot).
4. PING-side object lifecycle (projection concern, owned by PING not the adapter): canonical objects keep `superseded_by` pointers; nothing canonical is hard-deleted by adapter action.

### 3.5 Change detection and incremental re-ingest

- **Incremental trigger order:** (1) webhook push event -> verify HMAC over raw bytes, timing-safe compare, reject missing signature, dedupe on delivery UUID -> extract `before`/`after` -> enqueue ingest of `rev-list before..after`; (2) reconciliation sweep on schedule: `ls-remote`/fetch refs, compare tips to watermarks, enqueue deltas; (3) full re-walk on watermark loss or quarantine clearance.
- **Watermark:** per (repo, ref): `last_ingested_tip`, `last_packet_id`, `last_reconciled_at`. Stored by the ingest plane; the adapter emits observations about watermark state (so gaps are visible, D1 record 6's silent-gap hazard).
- **Delta emission:** each packet covers exactly the new commits; diffs are commit-pair diffs via libgit2/diffcore with the exact/inexact split. Packets are byte- and commit-bounded (D2 table); older history arrives as follow-up packets with the same schema.

### 3.6 License (new, gap #3 closed)

- Repository.license: from GitHub `license` API field when available (DIRECT), else SPDX detection over LICENSE* blobs (DERIVED, record method + tool version), else `UNKNOWN` (explicit, never null-implied). Per-file license headers: out of scope for v1 (recorded as gap, section 5).

### 3.7 Tenant context

- Every `OBSERVATION_CREATED` carries the mandatory `tenant_id` (C1). Tenant binding: `core::github-ingest/tenant::<id>` namespace (C2 pattern). Repo registration is a tenant-scoped write: a repo may be ingested only when a tenant with authority over that repo (owner assertion or verified control) registers it; the registration itself is a signed event. Cross-tenant queries are denied by the existing namespace isolation (hybrid_search.js precedent). The adapter never infers tenant from repo content.
- Unattributed/system-wide ingestion (e.g., public ecosystem repos for intelligence) uses `tenant_id: UNKNOWN` with `verification_status` gating per the tandem precedent (emit-observation.py `--require-verified`): unverified system observations never promote to canonical objects.

### 3.8 Capability bindings

Per STANDING-INVARIANTS #8, capabilities are bound, not self-asserted. The adapter declares needs; PING grants:

| Capability need | Verb (D3) | Bound by | Notes |
|---|---|---|---|
| github.read.repo | read | connector manifest, repo registration event | Bare-mirror fetch + object reads |
| github.read.metadata | read | connector manifest | REST/GraphQL fallback for issues/PRs/releases when git-native unavailable |
| github.subscribe.push | subscribe, webhook-receive | manifest + webhook secret custody | Push events only; no write |
| ping.emit.observation | (journal write) | gateway POST /events auth | OBSERVATION_CREATED only; never object-minting events |
| ping.emit.quarantine | (journal write) | gateway POST /events auth | QUARANTINED:<reason> typed events (D2 hard gate 10) |
| github.write | write | DENIED by default (D3 §1.1) | The adapter never pushes, never comments, never opens PRs. Any future write is a separate elevated grant. |

No agent or lane may call the adapter's fetch plane directly; consumption is via journal observations and projections only.

### 3.9 Failure classification (extends D3 failureMode, gap #10 closed)

Git-specific failure modes, each with a typed observation and a retry policy:

| failureMode | Meaning | Retry |
|---|---|---|
| `ref-moved-during-ingest` | T-07 race; packet marked STALE | Re-queue once with fresh snapshot; alert after 3 |
| `pack-bomb-suspect` | T-03 expansion ratio tripwire | No retry; quarantine |
| `malformed-tree` | T-01 fsck-invalid tree entries | No retry; quarantine |
| `ref-cycle-detected` | T-12 symref cycle over hop cap | No retry; quarantine |
| `signature-malleated` | T-06 non-canonical duplicate | Record both, no trust merge; no retry |
| `lfs-pointer-suspect` | T-10 absurd size / attacker URL | Metadata only; no retry |
| `config-smuggling-pattern` | T-09 filter/driver payload in attributes | Flagged observation; no retry |
| `webhook-gap` | Reconciliation found pushes the webhook never delivered | Backfill via fetch; emit gap observation |
| `ref-watermark-stale` | Watermark older than reconciliation SLA | Full re-walk of ref range |
| `rate-limited` | D3 existing; 429 or 403-with-Retry-After | Backoff per receipt; see 3.10 |
| `partial-success` | D3 existing; e.g., blob deferred set non-empty | Packet emitted with explicit `caps.blob_deferred` list; follow-up packets close it |

Every breach emits a typed event; silent skips are forbidden (D2 hard gate 10).

### 3.10 Rate-limit receipts (new, gap #9 closed)

- **Preference order:** git-native protocol reads first (no REST quota consumed; D1 record 5). REST/GraphQL only for issue/PR/release metadata or git-less hosts.
- **Receipt schema** recorded per API attempt: `{attempt_id, endpoint, limit, remaining, reset_epoch, retry_after, cost_points (GraphQL), outcome}`. Stored as observations so quota consumption is auditable per repo, per tenant, per day.
- **Policy:** on `remaining == 0` or 429/403-with-Retry-After: stop the queue for that credential, emit `rate-limited` with the receipt, resume at `reset_epoch` + jitter. Never burn search quota (30/min) on bulk work; never retry a 403 without Retry-After as if it were rate limiting (could be auth scope; check credential attachment first, per SKILL.md Auth section).
- **Secondary limits:** GitHub's abuse/secondary limits return Retry-After; treat as hard stop for the credential, not per-endpoint.

### 3.11 Retrieval contract (gap #13 closed)

The adapter owns no database. Retrieval is over PING's projections with adapter-defined query shapes:
- `observations(repo, tip_sha)` -> all packets whose ref_snapshot includes the tip (provenance-chained).
- `file_history(repo, path, tip_sha)` -> ordered `changes` edges with exact/inexact confidence and thresholds.
- `ref_state(repo, refname)` -> current watermark tip + last packet id + staleness flag.
- Every read response carries a **completeness block**: `{snapshot_tip, packet_ids, blob_deferred_count, api_sourced_fields: [...]}`. A consumer may never mistake a partial read for a full one (D1 record 7's fidelity ceiling, generalized).

---

## 4. Explicit non-goals

1. **No GitHub truth system.** The adapter never decides what is true about a repo. It reports what the host asserted and what content addressing proves. Truth (conflict resolution, promotion, lifecycle) belongs to PING's journal and authorities. Any proposal to add "repo health scores," "trust badges," or canonical "the" file list owned by the adapter is out of scope and must be refused at design review.
2. **No vector-DB dump.** Blobs are not embedded wholesale. Text extraction is bounded (D2: 64 MiB/blob cap, 10 KiB metadata fields), binary is metadata-only (sha/size/magic), and the embedding plane consumes observations through its existing subscription with its own policy, not through an adapter-owned index.
3. **No execution.** D2 boundary 1 stands: never checkout, never build, never test, never lint repo code. `Test` objects are *discovered* (names/paths/frameworks), not *run*. Build metadata (CI conclusions) is read from the provider, not reproduced.
4. **No write-back.** `github.write` is denied. No commits, no comments, no PR actions, no webhook management beyond receive.
5. **No identity minting.** The adapter proposes deterministic id hints; PING's IdentityAuthority mints. `claimed_*` discipline is non-negotiable (D2 T-05/T-06).
6. **No submodule/LFS content fetching.** Terminal-opaque metadata only (D2 T-02/T-10). A future content fetcher is a separate threat-reviewed lane, not this adapter.
7. **No new event vocabulary beyond two types.** v1 emits `OBSERVATION_CREATED` (packets, diffs, relationships as event_data) and `QUARANTINED` (typed quarantine). Everything else rides existing types.

---

## 5. Open questions and candidate gaps (evidence-attached)

**Q1. Who pins the trust anchor for commit signatures?**
D2 T-06 requires verification against a PING-pinned keyring (`allowedSignersFile`-style), never derived from the repo. No such keyring exists in the workspace, and no owner for it is named. Evidence: T-06 mitigation text; no keyring file found anywhere under ~/workspace (grep for allowedSigners/allowed_signers: zero hits). Candidate: PING core owns it; the adapter only reports `{present, valid}` and leaves `trusted` to the core. Needs a named owner before v1.

**Q2. Webhook receiver hosting and secret custody.**
D1 record 6 and D3 (M6/M7) specify HMAC + delivery-dedupe, but no route, no secret store, and no custody model for webhook secrets exists in the workspace. The Kit webhook precedent (`api/kit/webhook`) had finding F1 (unauthenticated injection) per CAPABILITY-PROJECTION.md. The GitHub receiver must not repeat F1: HMAC-verify before parse, timing-safe compare, reject missing signatures. Open: where the receiver lives and who holds secrets.

**Q3. Tenant-to-repo authority model.**
Section 3.7 assumes tenant-scoped repo registration, but no registration flow, no "who may register a repo" policy, and no org-mapping exists. The tandem lane's `tenant_id: UNKNOWN` + verification gate is the only precedent. If ecosystem-wide public-repo ingestion is desired (intelligence use case), the UNKNOWN-tenant path needs explicit Nolan authorization; otherwise every repo needs a tenant sponsor.

**Q4. Mirror storage ownership and lifecycle.**
One bare mirror per repo (D1 record 8 shape) implies disk, GC policy (`git gc` on mirrors), mirror corruption recovery, and who pays for large-repo mirrors. No storage owner is named. The storage-tiering doctrine (AGENTS.md 2026-09-24: HOT/WARM/COLD classification) should classify mirrors before any disk is committed.

**Q5. Per-file license headers.**
Section 3.6 covers repo-level license only. File-level license detection (headers, SPDX identifiers per blob) is unaddressed and would need a bounded text-scan stage with its own caps. Parked for v2.

**Q6. GraphQL vs REST for the metadata fallback.**
D1 record 7 documents both; no decision on which the fallback uses. GraphQL's point-cost accounting is more predictable for bulk issue/PR reads; REST pagination is simpler. The receipt schema (3.10) covers both. Needs a call at implementation time, low stakes.

**Q7. Promotion bar: when does an observation become a canonical object?**
Section 3.3 defines objects and relationships as canonical-layer constructs, but the promotion rule (what evidence bar, whose authority, which event type mints) is PING-core business, not adapter business. The adapter's contract ends at well-formed, provenance-bound observations. Flagged so no lane assumes the adapter "creates" Repository objects.

**Q8. CRX harvest unavailable.**
Swarm brief named `/home/nolan/crx-swarm/crx-runtime-main` as read-only reference; the path does not exist on this machine (verified 2026-09-25 20:00 MDT). If a sibling lane depended on CRX ingestion ideas (shadow-system discipline, agent-bound contracts), that input is absent. Not blocking: the design above stands on workspace-native prior art.

---

## Appendix: source index (every existing-machinery claim)

- D1 ecosystem harvest: `~/workspace/git-ingestion/findings/ECOSYSTEM-HARVEST.md` (records 1-8, top-5 ranking, license analysis)
- D2 threat register: `~/workspace/git-ingestion/threats/GIT-INGESTION-THREATS.md` (T-01..T-12, boundaries table, G-01..G-16, hard gates 1-10)
- D3 connector contract: `~/workspace/business-connectors/hidden_files/connector-contract.md`, `connector-manifest-schema.md` (fetchState, failureMode, capabilityVerb, confidenceGrade)
- S1/S2 GitHub skill: `~/workspace/skills/github/SKILL.md`, `~/workspace/skills/github/bin/gh-api.py`
- C1 event seam: `~/workspace/tandem/emit-observation.py:545-561` (OBSERVATION_CREATED body, tenant_id, duplicate guard)
- C2 namespace seam: `~/workspace/constitutional-sprint/capability/CAPABILITY-PROJECTION.md` (POST /ingest, core::<name>/tenant::<id>)
- C3/C4 core law: `~/workspace/constitutional-sprint/STANDING-INVARIANTS.md:7-8`; `~/workspace/constitutional-sprint/authority-map/AUTHORITY-MAP.md` (rows #1, #16, #29)
- Agent08 local-git audit: `~/workspace/constitutional-sprint/agent08-patch-commit-git/PATCH-COMMIT-GIT.md` (zero signed commits; identity is gitconfig string)
- Digest-law precedent: FYD `ask/envelope.ts:37` (payloadHash over canonical bytes), cited via AUTHORITY-MAP.md row #32
- Swarm constraints honored: no worktree/branch/file touched under `/home/nolan/worktrees/cop*` or `fyd*`; no builds; no test runs; no pushes/commits; no credentials read, printed, or changed.

## Coordinator correction (2026-09-25 ~20:05 MDT)

Lane 5's finding 5 states `/home/nolan/crx-swarm/crx-runtime-main` "does not exist
(verified)". That verification was wrong: the coordinator directly listed the path
at ~20:05 MDT and it exists (22 top-level entries including AGENT.md,
AUTHORITY_CONFLICT_REPORT.md, CRX_CONSTITUTION.md, CascadeProjects, Dockerfile).
The lane's design and gap analysis are unaffected; only the CRX-absence claim and
the "CRX absence" open question are retracted. CRX harvest input remains available
to other lanes at that path (read-only, ideas only per the harvest doctrine).
