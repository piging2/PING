# Existing Execution Limits in /home/nolan/projects/ping

SWARM 17 inventory. All paths repo-relative, verified read-only 2026-09-23 against
base `e48ef710` (tag `tenanos-wave-base-20260923`). Line numbers from the worktree
at inspection time; the FYD exclusion zone (`src/fyd/**`) is cited for precedent
only, never modified.

Conventions below: LIMIT = hard cap with fail-closed behavior; QUOTA = windowed
allowance; CAP = truncation/presentation bound (not an execution budget).

## 1. Canonical budget primitives (harvest these)

### 1a. CrawlBudget / CrawlLedger / OriginSemaphore / DedupCache
`src/fyd/net/budgets.ts`
- 21-22: `ANONYMOUS_CRAWL_BUDGET = { maxPages: 6, maxTotalBytes: 8 * 1024 * 1024 }`
- 30-48: `CrawlLedger` — reserve-before-spend (`takePage(): boolean`,
  `addBytes(n): boolean`), fail-closed, no throw on exhaustion.
- 58-59: `OriginSemaphore` defaults `perOriginMax = 2`, `globalMax = 6`;
  64-94: FIFO waiters, double-release is a no-op, `inFlight()` introspection.
- 148-150: `DedupCache` defaults `ttlMs = 10 * 60 * 1000`, `maxEntries = 200`;
  failures never cached.

### 1b. AnonymousGate (token bucket + generation quota)
`src/fyd/net/rate-limit.ts`
- 102: `new TokenBucket(3, 3 / 3_600_000, clock)` — burst 3, refill 3/hour.
- 103: `new GenerationQuota(10, 3_600_000, clock)` — 10 generations/hour/client.
- 107-123: `AnonymousGate.check()` — gate BEFORE work, `record()` after;
  typed result `{ ok: false; reason; retryAfterMs? }`. Quota exhaustion is
  retryable with `retryAfterMs`, never terminal.

### 1c. Anonymous preview (typed budget-exhausted outcome)
`src/fyd/onboarding/anonymous-preview.ts`
- 65: `sharedCache = new DedupCache({ ttlMs: 600_000, maxEntries: 500 })`
- 66: `sharedLedger = new CrawlLedger(ANONYMOUS_CRAWL_BUDGET)`
- 67: `sharedSemaphore = new OriginSemaphore(2, 6)`
- 101-107: `PreviewFailureCode` includes `"budget-exhausted"` (typed code).
- 123: `PAGE_FETCH_MAX_BYTES = 1024 * 1024` (1 MiB per page).
- 176: throws `PreviewFailure("budget-exhausted", ...)` when the ledger is spent.
- 189: `maxBytes: Math.min(PAGE_FETCH_MAX_BYTES, remaining)` — child draw from
  parent remainder (composition precedent).

### 1d. AcquisitionAdapter (budget-as-request-parameter contract)
`src/fyd/acquisition/acquisition-adapter.ts` (types only, no implementation)
- 32, 34: `AcquisitionRequest.pageBudget`, `maxDepth`
- 38-51: `AcquisitionPolicy`: `maxBodyBytes`, `timeoutMs`,
  `acquisitionTimeoutMs` (whole-acquisition wall clock vs per-call timeout),
  `maxRedirects`, `blockPrivateNetworks`, `requireRobotsTxt`, `userAgent`,
  `rateLimitPerDomainMs`, `allowedContentTypes`, `browserWallClockMs`
  (L2 per-page wall-clock budget).
- Acquired observations carry `truncated: boolean` and a typed `escalation[]`
  record; `PolicyDecision` is `{ allowed, reason }` (typed denial).

## 2. Fetch timeouts (all fail-closed, per-call)

| File:line | Limit |
|---|---|
| `src/fyd/net/safe-fetch.ts:63` | `DEFAULT_MAX_BYTES = 15 * 1024 * 1024` |
| `src/fyd/net/safe-fetch.ts:64` | `DEFAULT_TIMEOUT_MS = 20000` |
| `src/fyd/net/safe-fetch.ts:65` | `DEFAULT_MAX_REDIRECTS = 5` |
| `src/fyd/net/safe-fetch.ts:174` | per-hop `AbortSignal.timeout(timeoutMs)` |
| `src/fyd/net/safe-fetch.ts:208-230` | content-length pre-check + streaming abort at maxBytes |
| `src/fyd/net/safe-fetch.ts:44-57` | `SafeFetchResult = SafeFetchOk \| SafeFetchFail` with `reason: string` |
| `src/fyd/preview/capture.ts:30-31` | `NAV_TIMEOUT_MS = 25000`, `SETTLE_MS = 1500` |
| `src/fyd/preview/capture.ts:46` | `page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS })` |
| `src/fyd/adapters/activitypub/webfinger.ts:47` | `timeoutMs ?? 15000` |
| `src/fyd/adapters/activitypub/endpoints.ts:38` | `timeoutMs ?? 20000` |
| `src/lib/ping/ping-object-reader.ts:251` | `AbortSignal.timeout(10000)` |
| `src/lib/ping/ping-object-reader.ts:271` | `AbortSignal.timeout(10000)` |

## 3. Retry caps and durable-execution timeouts

| File:line | Limit |
|---|---|
| `src/lib/deployment-transaction.ts:843` | `COMMITTING_TIMEOUT_MS = 5 * 60 * 1000` (stale committing recovery) |
| `src/lib/deployment-transaction.ts:863` | typed `failureReason: 'STALE_COMMITTING_TIMEOUT: ...'` |
| `src/lib/deployment-transaction.ts:888` | `MAX_RETRIES = 3` |
| `src/lib/deployment-transaction.ts:889-891` | exceeding MAX_RETRIES throws `Error("... Terminal failure.")` — NOT a typed state (gap; see section 5) |
| `src/lib/deployment-transaction.ts:970-976` | `isTransactionTerminal()`: terminal = committed/consumed, or failed with retryCount >= 3 |
| `src/lib/deployment-transaction.ts:80` | typed `TransactionState`: prepared/committing/committed/consumed/failed with legal-transition enforcement via Lua script |

Memory precedent (not in repo): research-brief lifecycle `RETRY_LIMIT = 3`
consecutive contract rejections (memory/2026-09-17.md); standing retry rule is
bounded persistence with evidence-based backoff (memory/2026-09-20.md).

## 4. Artifact / payload size caps

| File:line | Limit |
|---|---|
| `src/fyd/proceduralize/feed-parser.ts:36` | `MAX_XML_BYTES = 5 * 1024 * 1024` |
| `src/fyd/proceduralize/feed-parser.ts:37` | `MAX_ITEMS = 200` |
| `src/fyd/proceduralize/feed-parser.ts:38-39` | `MAX_TITLE_CHARS = 500`, `MAX_DESC_CHARS = 2000` |
| `src/fyd/media/derivatives.ts:56-57` | `MAX_SOURCE_DIMENSION = 8000`, `MAX_SOURCE_PIXELS = 64_000_000` |
| `src/fyd/presence/derive-presence.ts:65` | `MAX_GALLERY = 8` |
| `src/fyd/ask/visitor-answer.ts:176` | `MAX_QUESTION_CHARS = 2000` (input size cap) |
| `src/lib/ping/ask-composer.ts:184-185` | `title.slice(0, 200)`, `description.slice(0, 2000)` (context assembly caps) |
| `src/lib/ping/ask-composer.ts:209` | `relationships.slice(0, 10)` (context assembly cap) |
| `src/fyd/ask/concierge.ts:243` | `d.length >= 10 ? d.slice(0, 10) : null` |
| `src/fyd/ask/answer.ts:48` | `.slice(0, 5)` |

## 5. Gaps: limits that do NOT exist (the design must add them)

1. **No per-run / per-mission / per-tenant execution budgets.** Nothing bounds
   attempts, wall time, tool calls, context, or parallel workers for a durable
   run. A runaway agent has no coded ceiling.
2. **No route wall-time budget.** No `maxDuration` on any Next/Vercel route;
   `vercel.json` carries no function timeout config.
3. **No API body-size limit.** No `sizeLimit`/`bodyParser`/`maxBodyLength` on
   any `src/app` route.
4. **No LLM output-token cap.** No `maxTokens`/`maxOutputTokens` anywhere in
   `src`; LLM provider selection exists (`src/lib/sentiment/classifier-provider.ts:143,175,206`)
   with no call budgets.
5. **No parallelism primitive outside fetch.** No `p-limit`/chunked `Promise.all`
   with bounds; only `OriginSemaphore` (fetch domain).
6. **Unbounded durable stores.** `src/lib/editor/durable-event-store.ts` and
   `src/lib/events.ts` / `src/lib/assignment-store.ts` have no retention or
   size caps.
7. **MAX_RETRIES exhaustion throws instead of typing.** `deployment-transaction.ts:890`
   raises `Error("Terminal failure")`; there is no `BUDGET_EXHAUSTED`-style
   terminal state with the exhausted dimension named.
8. **CapabilityAuthority (executor) is referenced but unimplemented.**
   `src/lib/ping/grants.ts:9-14` names "the PING executor CapabilityAuthority
   (which worker may run X)" and explicitly does not import it; no
   implementation exists in the repo. Budget checks must gate BEFORE this
   future decision point, never duplicate it.
9. **No scheduler/cron in-repo.** No cron expressions in `src`, `scripts`,
   `vercel.json`, or `package.json` (only passing mentions in
   `src/lib/infrastructure/audit.ts`, `controller.ts`).
10. **Mission pipeline is named but not built.** `src/lib/ping-api.ts:75`
    references "PING's mission/intake pipeline"; `src/fyd/builder/owner-intent.ts`
    models owner intent. No mission/run/attempt execution loop exists yet.

## 6. UI-only timers (not execution budgets; listed to avoid confusion)

`setTimeout` debounces and visibility delays in components
(`src/components/*`, `src/fyd/ui/*`, `src/fyd/spatial/slot-manager.ts:344`
250ms debounce, `src/lib/wizard-persistence.ts:86-95` save debounce).
These bound UI behavior, not autonomous execution, and are out of scope.
