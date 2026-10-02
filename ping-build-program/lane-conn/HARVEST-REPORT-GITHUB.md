# HARVEST REPORT — GitHub SDK / Sync Tools (CONN-GITHUB lane)

Evaluated 2026-09-23 against the 20x kill criteria and the optionality test.
Scope of the decision: the READ-ONLY GitHub connector v0 (repo metadata,
issues, PRs, reviews, workflow runs, releases, branch state) plus the
webhook alternative.

## PROBLEM
Cover the GitHub API surface as PING observations (section 4 of
GITHUB-CONNECTOR.md) with correct cursor semantics, rate-limit discipline,
and typed failures, without building a second HTTP framework and without
surrendering provenance.

## PING ALREADY HAS
- `src/fyd/net/safe-fetch.ts`: canonical SSRF egress gate (confirmed live).
  The production connector MUST use it or lane D's egress boundary.
- BCQ contract test kit (`lane-bcq/testkit/contract.py`): the harness every
  adapter inherits; the spike emits `NormalizedObservation` in its format.
- Lane L secret broker: agents get capability handles, never tokens.
- **No GitHub client exists in PING** (searched read-only 2026-09-23):
  only CI-env detection and a deploy-time GITHUB_TOKEN env mention.
- No octokit or other GitHub dependency in package.json.

## EXTERNAL CANDIDATES
| Candidate | What it is | License |
|---|---|---|
| octokit (`@octokit/rest`, octokit.js) | GitHub-authored JS/TS REST client; plugins for retry, throttling, pagination | MIT (per upstream; verify pinned release before adoption) |
| githubkit (Python) | Async Python SDK, typed REST + GraphQL, built-in retry/cache/throttle | MIT |
| PyGithub (Python) | Mature sync Python SDK, broadest REST coverage | LGPL-3.0-or-later |
| gidgethub (Python) | Async, sans-io design; no transport opinions | MIT (per upstream; verify) |
| github3.py (Python) | Mature Python REST client | BSD-3-Clause (per upstream; verify) |
| Airbyte `source-github` | Full sync pipeline (streams, incremental, state) | ELv2 (connector-level; platform ELv2 per BCQ evaluation) |

## LICENSES (verified)
- PyGithub LGPL-3.0: verified via multiple independent third-party license
  reviews (2026 crawls). Weak copyleft; ordinary unmodified dependency use is
  common practice but creates redistribution-review obligations. PING has no
  declared license posture; the conservative read is REJECT until Nolan
  sets licensing policy.
- githubkit MIT: verified via an independent migration plan (2026).
- Airbyte ELv2: established by BCQ lane (platform + connectors). Forbids
  offering as a managed service; fine for internal use, but weight dwarfs
  value at v0.
- octokit MIT, gidgethub MIT, github3.py BSD-3: per upstream claims, NOT
  independently verified by this lane; verify the pinned release before any
  adoption.

## TESTED
- **Zero-dependency spike** (`github/spike.py`, stdlib urllib): 4 live
  requests, 57/60 budget remaining; repo + 5 issues normalized to the BCQ
  observation format; ETag conditional refresh returned 304 with zero
  re-emission (cursor semantics proven live).
- **Failure suite** (`github/failure_test.py`, 9/9 PASS): 404->PERMANENT,
  403-rate-limit vs 403-permission-denied distinguished, malformed payload
  quarantined, schema drift coerced, duplicate webhook absorbed, out-of-order
  events dropped, idempotency-key determinism.
- SDKs themselves were NOT executed: the mechanism under test is 4 thin REST
  calls + header parsing + deterministic normalization, which no SDK
  simplifies at this surface. An SDK decision is deferred to the day a
  declared capability actually needs SDK-only behavior (GraphQL Projects V2,
  write verbs, webhook secret verification helpers).

## WINNER
**No SDK adopted. The hand-rolled zero-dependency thin client IS the winner**
for v0. The mechanism is ~150 lines; every candidate SDK was heavier than
the problem.

## ADOPT-ADAPT-REJECT
- octokit: **REJECT (defer)**. The connector's production home is TypeScript,
  so octokit is the natural eventual candidate, but v0 needs 4 REST calls and
  octokit's value (pagination/throttle plugins) duplicates BCQ-kit-owned
  behavior. Revisit if write verbs or GraphQL are declared.
- githubkit: **REJECT (defer)**. Best-licensed modern Python option; but the
  production connector is TS, so it would be a second-stack dependency for
  zero gain at v0.
- PyGithub: **REJECT**. LGPL-3.0 fails the license kill criterion under the
  conservative read, and it is sync-only with no retry/cache/throttle.
- gidgethub / github3.py: **REJECT (defer)**. Permissive licenses, but same
  verdict as githubkit: wrong stack, zero mechanism gain at v0.
- Airbyte `source-github`: **REJECT**. ELv2 acceptable for internal use, but
  importing a sync platform (scheduler, workers, state store) for 7 streams
  fails the weight-vs-value kill criterion; Airbyte's stream/checkpoint
  CONCEPTS are already harvested into the BCQ contract.

## CODE WE DO NOT NEED TO WRITE
- A generic HTTP retry/backoff/circuit-breaker framework (BCQ kit owns it).
- A GitHub object-model layer (normalizers emit PING-owned observation
  fields directly; provider shapes stay in the verbatim evidence blob).
- A token manager / OAuth refresher (lane L broker + AuthBroker SPI).
- A pagination library (opaque Link/since cursors, ~10 lines).

## MINIMAL PING WRAPPER
`github/` -> production port checklist: (1) replace stdlib urllib with
`safe-fetch` egress; (2) wrap in the BCQ `ConnectorAdapter` interface
(`github/adapter.ts`, NEXT step); (3) secret-free auth via AuthBroker
capability handles; (4) evidence store = lane-N lineage path; (5) webhook
receiver against lane-R recorded fixtures. Estimated < 300 lines TS,
zero new dependencies.

## FAILURE TEST
`github/failure_test.py`: 9/9 PASS (fixture-based, no network). Live
evidence: `github/evidence/spike-run-log.json` + content-hashed raw payloads.

## PRODUCT CAPABILITY UNLOCKED
Multi-source acquisition milestone step 2: **GitHub object -> observation**
proven end to end (repo metadata + issues live; PRs/reviews/runs/releases/
branches mapped, same mechanism). Feeds: demand signals (issue labels,
failing workflow runs), change context (PRs -> lane-A commit SHAs), and the
business-connector lane's cross-source resolution. GitHub never writes
canonical state; resolution stays PING-owned.

## BYTES-DEPENDENCY COST
Spike: 15 KB Python, 0 dependencies, 0 license obligations. Production port
estimated < 300 lines TS, 0 new dependencies. **Dependencies adopted: 0.
Dependencies rejected: 6 (octokit deferred, githubkit deferred, PyGithub,
gidgethub deferred, github3.py deferred, Airbyte source-github).**
Hand-written infra avoided: HTTP framework, retry engine, token manager,
pagination library, object-model layer.
