# GitHub Connector — Design (CONN-GITHUB lane, v0.1 draft)

Read-only spike: `github/spike.py` (stdlib only, zero dependencies).
Failure evidence: `github/failure_test.py` (9/9 PASS), `github/evidence/`.
Ecosystem evaluation: `HARVEST-REPORT-GITHUB.md`.

## 1. Why this connector exists

The Git connector (lane A) covers local/distributed repository state.
The GitHub connector covers the **GitHub API surface**: repository metadata,
issues, pull requests, reviews, workflow runs, release metadata, remote
branch state. A business's GitHub org is often its highest-signal operational
record (what shipped, what broke, what is open, who reviews). All of it is
OBSERVATION, never canonical PING truth.

## 2. PING repo search (done 2026-09-23, read-only, repo @ fyd-factory branch)

- **No GitHub client/connector exists in PING.** Only incidental mentions:
  `environment.ts` checks `GITHUB_TOKEN`/`GITHUB_REPO` as *deploy credentials*
  (push creds, not an API client); CI env detection (`GITHUB_ACTIONS`).
- **No octokit / @octokit dependency** in package.json.
- **Existing HTTP primitive**: `src/fyd/net/safe-fetch.ts` is the canonical
  SSRF egress gate; the production connector MUST route through it (or the
  lane-D egress boundary), never raw fetch. The spike uses stdlib urllib
  only to stay zero-dependency; production code ports to safe-fetch.
- **Do NOT build a second generic HTTP framework.** The spike is a thin
  wrapper: 4 REST endpoints + header parsing + deterministic normalizers.
  Everything else (retry budget, backoff, circuit breaking, secret custody)
  belongs to the BCQ kit ports and lane L broker.

## 3. Contract surface (BCQ kit v1.0 alignment)

| BCQ contract verb | GitHub implementation |
|---|---|
| connector id / identity | `github-connector`, semver 0.1.0; `provider=github.com`; `principal` = named authorizing party |
| declared capabilities | `read.repository`, `read.issues`, `read.pull_requests`, `read.reviews`, `read.workflow_runs`, `read.releases`, `read.branches`; `webhook-receive` optional; **`write` DENIED by default** (no mutation verbs declared) |
| auth scope | Public data: `none` (this spike). Private orgs: OAuth App token via lane-L secret broker -> AuthBroker SPI (`fetchViaConnection`); scopes `repo:read`, `read:org` minimum. Agents see capability handles, never tokens. |
| connect/discover | `check()` = GET /rate_limit (proves reachability without spending budget); `discover()` = deterministic static stream list |
| checkpoint | opaque provider watermarks: ETag strings for pollers; page cursors for pagination; webhook delivery IDs for push. Stored verbatim, never parsed. |
| read/normalize | per-stream GET -> store raw evidence FIRST (content-hash ref) -> deterministic normalize -> `NormalizedObservation` (contract.py) |
| refresh | ETag conditional refresh (`If-None-Match`); 304 = freshness clock refreshed, zero observations |
| disconnect | clears in-memory ETags/cursors; revocation = broker revokes token, evidence stays marked `source_revoked_at` |
| health | lifecycle + last error class + rate-limit state |
| failure taxonomy | lane-K list, enforced (see section 6) |
| rate-limit state | X-RateLimit-Limit/Remaining/Reset + Retry-After parsed after every call |

## 4. Object mappings: GitHub object -> observation -> evidence -> canonical authority

Rule: `GITHUB <object> -> GITHUB OBSERVATION -> EVIDENCE -> RESOLUTION -> PING <object>`.
GitHub NEVER writes canonical PING state directly. The connector emits
observations through the injected `emitObservation` port; canonical
authorities (phase0 event authority, resolution layer) decide what becomes
knowledge.

| GitHub object | API source | External object id | External timestamp | Normalizer output | Maps toward (resolution-owned) |
|---|---|---|---|---|---|
| Repository | GET /repos/{o}/{r} | `repo:<github id>` (numeric node id, stable) | `pushed_at` (fallback `updated_at`) | `github_repository`: name, full_name, description, private/fork/archived/disabled, default_branch, stars, forks, open_issues, language, topics, license key | PING project/codebase link record (graded link, never canonical identity) |
| Issue | GET .../issues?state=all&sort=updated | `issue:<github id>` | `updated_at` | `github_issue`: number, title, body (sanitized plain text), state, labels, author, assignees, comments, is_pull_request flag | PING work-item/task observation; issue/PR crosswalk |
| Pull request | GET .../pulls?state=all | `pr:<github id>` | `updated_at` | `github_pull_request`: number, title, state, draft, merged_at, base/head ref, author, reviewers requested | PING change-proposal observation; links to Git commits via merge SHA (lane A seam) |
| Review | GET .../pulls/{n}/reviews | `review:<github id>` | `submitted_at` | `github_review`: state (APPROVED/CHANGES_REQUESTED/COMMENTED), author, body | evidence of human review; never auto-trusts "approved" as quality signal |
| Workflow run | GET .../actions/runs | `run:<github id>` | `updated_at` | `github_workflow_run`: name, status, conclusion, branch, run_number, actor | PING build/deploy observation; failure conclusions are demand signals |
| Release | GET .../releases | `release:<github id>` | `published_at` (fallback `created_at`) | `github_release`: tag_name, name, draft, prerelease, body | PING version/milestone observation |
| Branch (remote) | GET .../branches?per_page | `branch:<repo-id>:<name>` | commit SHA's commit date (via commit detail) | `github_branch`: name, protected, head SHA | lane-A seam: remote HEAD vs local HEAD comparison |

**Idempotency key** (kit formula): sha256(`github-connector` | stream | externalObjectId | externalRecordVersion).
externalRecordVersion = the external timestamp above. Same key twice = one
knowledge unit (kit proofs 1-6; spike proves 2, 5, 6 via fixtures).

**Provenance envelope** (every observation): connector id, connector version,
source identity (`github.com/{owner}/{repo}` + node id), external object id,
external timestamp, observed timestamp, fetch attempt id, raw evidence ref
(sha256 of the VERBATIM raw payload, stored before normalization).
Confidence: DIRECT for verbatim fields; DERIVED for computed (e.g. branch
name derived from ref path); never OWNER_ASSERTED unless the owner attests.

**GitHub is a GITHUB OBSERVATION, never PING truth.** A repo description that
says "official website" does not become a PING business URL without
resolution; a star count is a signal, not a canonical metric.

## 5. Cursor semantics

- **Pollers (repo, issues, PRs, runs, releases)**: cursor = ETag from the last
  200 response, stored verbatim. Next read sends `If-None-Match`. 304 ->
  SUCCEEDED with `not_modified:true`, zero observations, checkpoint unchanged
  (freshness clock refreshed). This is the primary mechanism: GitHub ETags
  are strong validators and conditional requests do NOT count against the
  rate limit the same way (they return 304 cheaply).
- **Pagination (lists)**: cursor = provider's page cursor. REST v3 uses
  `Link` header rel=next URLs (opaque, echoed verbatim) or page numbers.
  Prefer `since`/`updated` incremental parameters where supported
  (issues, PRs, runs all support `since` ISO-8601). Checkpoint = highest
  CONTIGUOUS success watermark (external `updated_at` of the last fully
  processed page); partial batch failure advances only past contiguous
  successes, retry resumes from the stored cursor.
- **Webhooks (alternative to polling)**: cursor = last processed delivery ID
  (`X-GitHub-Delivery`). HMAC-SHA256 over the RAW body with the webhook
  secret (resolved by lane-L broker inside the seam, never in handler code)
  verified BEFORE parse, constant-time compare, fail closed. Dedupe on
  delivery ID (redelivery absorbed; proven in failure tests). Timestamp
  tolerance 5 min bounds replay. **Push never replaces polling** as the
  completeness backstop (GitHub does not guarantee redelivery of missed
  events); pollers run at a slower cadence as reconciliation.
- **Cursor invalidation**: a 410/expired-cursor or changed `since` semantics
  is a typed FULL_RESYNC, not an error. Re-emission is absorbed by the same
  idempotency keys. Out-of-order deliveries are dropped by external-timestamp
  comparison (newer version wins; proven in failure tests).

## 6. Rate-limit handling (no hammering)

- Parse `X-RateLimit-Limit/Remaining/Reset` after EVERY response; expose via
  `rate_limit_state()`. Unauthenticated: 60/hr. Authenticated: 5000/hr +
  secondary limits (documented per-endpoint, e.g. search 30/min).
- **Pre-emptive stop**: when `remaining` <= 2, the connector stops issuing
  non-essential reads and reports RATE_LIMITED with `reset_at`; it does not
  probe the limit to confirm it.
- 403 with "rate limit" in message body -> RATE_LIMITED (distinct from
  PERMISSION_DENIED for scope gaps; the spike proves the two classify
  differently).
- 429 -> honor `Retry-After` (seconds); absent -> exponential backoff with
  jitter, max 3 attempts per fetch across all states (BCQ bound).
- 4xx except 408/429 are non-retryable. 404 on a single object read ->
  PERMANENT (record does not exist; retrying is a defect). 5xx -> TRANSIENT.
- Conditional (304) responses and `/rate_limit` checks are the cheap paths;
  cache raw payloads aggressively (spike caches evidence on disk by
  content hash, so re-normalization costs zero API calls).

## 7. Failure behavior (typed, per lane-K taxonomy)

Every fetch attempt terminates in exactly one error class with a
`fetchAttemptId`. Proven by `github/failure_test.py` (9/9 PASS, fixtures):

| Case | Classification | Behavior |
|---|---|---|
| 404 repo/object | PERMANENT | no retry; discovery marks object absent |
| 403 "rate limit exceeded" | RATE_LIMITED | backoff to reset_at, no hammering |
| 403 "not accessible by integration" | PERMISSION_DENIED | surface scope gap; never looks like rate limit |
| 401 | AUTH_REQUIRED | re-auth via broker; connector holds no token |
| malformed JSON / non-object record | INVALID_PAYLOAD | quarantine envelope + raw payload; never silently dropped |
| field deprecated/renamed by GitHub | SCHEMA_CHANGED | coerce-then-quarantine: coerce known fields, log unknown-field set, retain raw for re-normalization |
| duplicate webhook delivery | absorbed | delivery-ID dedupe; second delivery emits zero observations |
| out-of-order event | absorbed | external-timestamp comparison; stale dropped |
| network failure mid-batch | OUTCOME_UNKNOWN | reconcile by idempotency keys on retry; partial checkpoint honored |
| partial batch (7/10 ok) | SUCCEEDED partial:true | checkpoint at contiguous success; retry completes without duplicates |

Hostile-input rules (BCQ kit section 8) apply at the ingestion boundary:
HTML/JS stripped from title/body text (plain text only); payload caps
(256 KB/record, 5 MB/response, 10 KB/text field, truncate with marker);
secret-canary scan on provider responses; no raw secrets in observations,
checkpoints, or logs (this spike is token-free by construction).

## 8. Spike results (live, 2026-09-23 ~19:41 MDT)

- `check()`: ok, rate 60/60 remaining (unauthenticated budget).
- `read_repo(octocat/Hello-World)`: SUCCEEDED; normalized repo observation
  with full provenance; raw evidence sha256:b13c6d0b... stored.
- `read_issues(..., per_page=5)`: SUCCEEDED; 5 issue observations (titles
  sanitized); rate 57/60 remaining after 4 requests.
- `read_repo` again with stored ETag: **304, not_modified=true, 0
  observations** (conditional-refresh cursor semantics proven live).
- Determinism: same input bytes -> same canonical_id and canonical bytes.
- One real bug found by a fixture: `store_evidence` crashed on mixed-type
  keys because of `sort_keys=True`; fixed (evidence is verbatim, never
  sorted) and the failure test now covers it.

## 9. Kill criteria + optionality (per OWNERSHIP.md)

- **Octokit**: NOT adopted for the spike (dependency weight vs value: the
  read paths used are 4 thin REST calls; a full SDK buys pagination helpers
  and retry plugins we do not need at v0). Revisit if write verbs or
  GraphQL are ever declared. Full verdict in HARVEST-REPORT-GITHUB.md.
- **No new authority created**: observations only, through the BCQ
  `emitObservation` port; event id/hash/sequence/persist stay with phase0.
- **No second HTTP framework**: production egress = safe-fetch (lane D);
  spike's urllib layer is research-only and must be replaced, not vendored.
- **Optionality**: GitHub API replaceable by any provider behind the same
  BCQ contract; cursors are opaque strings, not GitHub-shaped types; the
  normalizer's output schema is PING-owned (object_kind + fields), so a
  provider swap changes one module.

## 10. NEXT

1. Feed the spike through the BCQ contract test kit harness (sibling
   BCQ-TESTKIT owner): implement the `Connector` interface in
   `github/adapter.py` wrapping this spike's logic, run `runContractSuite`.
2. Wire webhook receiver skeleton (HMAC verify, delivery-ID dedupe) against
   recorded fixtures in lane R's connector lab.
3. Production port: safe-fetch egress + lane-L AuthBroker SPI for
   authenticated reads (private orgs).
4. Coordinate with lane A on the PR->commit SHA seam (remote branch state vs
   local git state).
