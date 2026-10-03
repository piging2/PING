# Harvest Proposal: Helicone — Request Lineage (Gateway Logging, Sessions, Cost/Latency Attribution)

**VERDICT: ADAPT** — Take the request-receipt schema, the client-asserted grouping/session mechanism, and the usage-to-cost attribution algebra; re-derive them clean-room into PING semantics. Do NOT vendor code, pricing tables, or infrastructure.

## 1. What I read (official docs and source only; no marketing copy)

Upstream: `https://github.com/Helicone/helicone` (public, head `067d9290acb4f1fc9320e902fc67b4b399b50363`, 2026-09-16 deploy tag era).

| # | Input | Type |
|---|-------|------|
| 1 | `https://docs.helicone.ai/features/sessions` (fetched 2026-10-02) | Official docs page |
| 2 | `https://github.com/helicone/helicone/blob/HEAD/docs/features/sessions.mdx` | Official docs source @067d9290 |
| 3 | `https://github.com/helicone/helicone/blob/HEAD/packages/cost/README.md` | Official cost-package docs @067d9290 |
| 4 | `https://github.com/Helicone/helicone` repo page | License/metadata confirmation |
| 5 | `LICENSE` | Apache-2.0 text @067d9290 |
| 6 | `docs/features/sessions.mdx` | Sessions mechanism |
| 7 | `packages/cost/README.md` | Cost registry architecture |
| 8 | `packages/cost/models/calculate-cost.ts` | `calculateModelCostBreakdown` |
| 9 | `packages/cost/usage/types.ts` | `ModelUsage` interface |
| 10 | `packages/cost/costCalc.ts` | `COST_PRECISION_MULTIPLIER` |
| 11 | `valhalla/jawn/src/lib/shared/requestResponseModel.ts` | `LlmSchema` request/response shape |
| 12 | `valhalla/jawn/src/utils/hash.ts` | `hashAuth` key hashing |
| 13 | `valhalla/jawn/src/managers/SessionManager.ts` | Session derivation queries |
| 14 | `valhalla/jawn/src/lib/handlers/HandlerContext.ts` | `Log`, `RawLog`, `ProcessedLog`, `KafkaMessageContents`, `HeliconeMeta`, `Usage` |
| 15 | `valhalla/jawn/src/lib/stores/request/RequestResponseBodyStore.ts` | S3 body storage |
| 16 | `valhalla/jawn/src/managers/apiKeys/KeyManager.ts` | Key soft-delete revocation |
| 17 | `worker/src/lib/models/HeliconeHeaders.ts` | Edge request-ID, retry, fallback, cache headers |
| 18 | `worker/src/lib/clients/ProviderClient.ts` | `callProviderWithRetry` |
| 19 | `worker/src/routers/gatewayRouter.ts` | Fallback `onCodes` routing |
| 20 | `worker/e2e_test.py` | E2E test usage (request-ID idempotency) |

SHA-256 over the concatenated bytes of inputs 5-20: `sha256:3f77d61030ef389b538a1ae3c91b8b9c29cd993bd8120d90cd7cc6040400f587` (inputs 1-4 are web pages; their URLs are recorded above).

Cross-references (third-party, used only to sanity-check interpretation, not as evidence): mayanpathak/gateway `docs/research/helicone.md`, mlopsmenacommunity Helicone guides, adamallcock/runcost `market-gap-validation.md`.

## 2. Object model

### 2.1 The canonical per-request record (`Log` in `HandlerContext.ts`)

Helicone's unit of lineage is one proxied HTTP request/response pair, shaped as:

```
Log {
  request: {
    id,                    // UUID v4 (see ID scheme)
    userId,                // from Helicone-User-Id header
    promptId?, promptVersion?,
    properties,            // Record<string,string> — Helicone-Property-* headers + session headers
    heliconeApiKeyId?, heliconeProxyKeyId?,
    targetUrl, provider, bodySize, path,
    threat?, countryCode?,
    requestCreatedAt, isStream,
    heliconeTemplate?, experimentColumnId?, experimentRowIndex?,
    cacheEnabled?, cacheSeed?, cacheBucketMaxSize?, cacheControl?, cacheReferenceId?,
    requestReferrer?
  },
  response: {
    id,                    // == request id
    status, bodySize,
    timeToFirstToken?,
    responseCreatedAt, delayMs, cachedLatency?,
    cost?,                 // USD
    // Token usage (populated from edge when bodies not stored):
    promptTokens?, completionTokens?, promptCacheReadTokens?, promptCacheWriteTokens?,
    promptAudioTokens?, completionAudioTokens?, reasoningTokens?,
    model?                 // when body isn't stored
  }
}
RawLog { rawRequestBody?, rawResponseBody? }        // full bodies, kept OUT of analytics store
ProcessedLog { request: {model?, body?, template?, properties?, scores?...},
               response: {model?, body?} }
```

Observations: the *analytic* row (metadata, cost, tokens, latency) is deliberately separated from the *body* row (full JSON). Bodies are big and sensitive; metadata is queryable. This separation is a sound pattern for PING: index small receipts, keep bytes behind digests.

### 2.2 Sessions are a DERIVED projection, not a stored object

There is **no session table, no session lifecycle, no start/end event**. A "session" is computed at read time:

```sql
SELECT min(request_created_at) AS created_at,
       max(request_created_at) AS latest_request_created_at,
       properties['Helicone-Session-Id'] AS session_id,
       properties['Helicone-Session-Name'] AS session_name,
       avg(latency) AS avg_latency,
       sum(cost)/1e9 AS total_cost,
       count(*) AS total_requests,
       sum(prompt_tokens), sum(completion_tokens), sum(prompt_tokens+completion_tokens) AS total_tokens,
       groupUniqArray(user_id) AS user_ids
FROM request_response_rmt
WHERE has(properties, 'Helicone-Session-Id') ...
GROUP BY properties['Helicone-Session-Id'], properties['Helicone-Session-Name']
```

Source: `SessionManager.getSessions()`. Session *paths* (`Helicone-Session-Path`, e.g. `/plan`, `/plan/search`) are only stored as a property; the trace tree is built client-side from path-prefix structure. Session *feedback* is a post-hoc property (`Helicone-Session-Feedback`) stamped onto the **first** request of the session (`updateSessionFeedback`). Session *tags* live in a `tags` ClickHouse table (`entity_type = SESSION`). Scores/feedback are separate Kafka topic records (`helicone-scores-prod`: `{requestId, organizationId, scores[{key, type, value}], createdAt}`).

**Key design insight:** grouping is *client-asserted* via three headers — `Helicone-Session-Id` (UUID, one per run), `Helicone-Session-Path` (hierarchical `/parent/child`, conceptual not chronological), `Helicone-Session-Name` (session *type*, e.g. "Customer Support", for cross-run comparison). Docs explicitly: same ID = grouped; reusing IDs across workflows mixes unrelated requests; there is no session-end.

### 2.3 Usage and cost attribution

`ModelUsage` (usage/types.ts):
```
{ input, output,
  cacheDetails?: {cachedInput, write5m?, write1h?}, cacheDurationHours?,
  thinking?,
  image?/audio?/video?/file?: {input?, cachedInput?, output?},
  web_search?,
  cost? /* provider-reported USD passthrough, overrides computation */ }
```

`calculateModelCostBreakdown(modelUsage, providerModelId, provider, requestCount)`:
- Registry lookup (provider × model → `ModelProviderConfig`): O(1) map indexes (`build-indexes.ts`), pricing tiers with thresholds, provider-specific threshold functions (vertex / google-ai-studio / anthropic / xai differ on what counts toward tier thresholds), per-modality pricing with text fallback, cache write/read multipliers, thinking tokens, web-search and per-request fees.
- **If the provider reported `usage.cost`, the computed breakdown is discarded and `totalCost = usage.cost`.** This "trust the provider's receipt when present, else compute" rule is exactly right.
- Cost stored as integer nanos: `COST_PRECISION_MULTIPLIER = 1_000_000_000` (costCalc.ts); all session sums divide by it.
- Latency attribution: `delayMs` (end-to-end at edge), `timeToFirstToken` (streaming), `cachedLatency`, per-request avg rolled up to `avg_latency` per session.

## 3. ID scheme

- **Request ID**: client MAY set `Helicone-Request-Id`. Edge validates against a UUID regex (v1-v5); invalid or missing → `crypto.randomUUID()` (`getValidUUID`, HeliconeHeaders.ts). Echoed back as the `helicone-id` response header; e2e tests use the same ID for stream and non-stream calls to assert token equivalence — i.e. request ID doubles as an **idempotency key**.
- **Session ID**: client-generated; UUID recommended, opaque string accepted.
- **Key identity**: API keys are never stored raw; `hashAuth` = SHA-256 hex of `"Bearer " + key`, with the buffer zeroed after hashing (utils/hash.ts). Rows carry `heliconeApiKeyId` (integer) / `heliconeProxyKeyId` (cuid).
- No content digests anywhere: Helicone does NOT hash request/response bodies. (This is the gap our trust-kernel fills.)

## 4. State transitions

**None on requests.** A request is an append-only observation: created once at ingest, never mutated; post-hoc data (scores, feedback, properties, tags) are overlay writes, not transitions. **Sessions have no state machine at all** — no `OPEN`/`CLOSED`, no end event; a session is whatever shares an ID, forever. Retries and fallbacks (below) are edge-internal and invisible to the log: one request ID = one log row.

## 5. Authority boundary

- **Client** asserts attribution (session-id/path/name, user-id, custom properties, request-id, model-override for cost). Edge validates *format*, not truth.
- **Edge (Cloudflare Worker)** is the observation authority: assigns request UUID, measures TTFT/latency, parses provider usage, enforces cache / rate-limit / retry / fallback policy, emits the Kafka message.
- **Jawn (log server)** is the storage/projection authority: consumes Kafka, writes ClickHouse (`request_response_rmt`) + Postgres (`request`) + S3 bodies.
- Bodies are *untrusted provider data*; the client can suppress logging per call (`Helicone-Omit-Request` / `Helicone-Omit-Response`).

## 6. Persistence semantics

- Ingest is async fire-and-forget: edge → Kafka topic `request-response-logs-prod` (DLQ: `request-response-logs-prod-dlq`); consumer inserts into ClickHouse `request_response_rmt` (analytics) and Postgres `request` (relational lookups). Full bodies → MinIO/S3 keyed by `(orgId, requestId)`, read back via signed URL (`RequestResponseBodyStore`). Scores → separate topic `helicone-scores-prod`.
- **Append-only logs; mutable overlays.** The log row is never rewritten. Post-hoc annotations (`addPropertyToRequest`, scores, session feedback/tags) are separate writes.
- Storage routing per request: `storageLocation: "s3" | "clickhouse" | "not_stored_exceeded_free"` — the system *degrades* (drops bodies on free-tier overflow) rather than failing the proxied call. Observability never breaks the data plane.

## 7. Evidence / receipts

Helicone's per-request receipt = `{id, timestamps (start/end), delayMs, timeToFirstToken, status, cost (nanos), full ModelUsage breakdown, model/provider, actor key IDs, properties, body sizes}` with raw bodies in object storage. What it **lacks**: no body digests, no signatures, no tamper-evidence, no canonical-bytes definition. For PING, the receipt must add `request_digest` + `response_digest` (sha256 of canonical bytes) and a signature/chain pointer; Helicone proves the *shape* of the attribution, not the *trust* of it.

## 8. Retries / failures

- Headers: `Helicone-Retry-Enabled`, `helicone-retry-num` (default 5), `helicone-retry-factor` (default 2), `helicone-retry-min-timeout` (1000ms), `helicone-retry-max-timeout` (10000ms).
- `callProviderWithRetry` (ProviderClient.ts, via `async-retry`): retries on **429 or 5xx only**, exponential backoff; after exhausting retries, the *last response is returned* (even if 500) — the failure is logged, not thrown, unless no response was received at all (→ throws "500 An error occured while retrying").
- **Crucially: retries do not create new log rows.** One request ID = one logged outcome. Failed attempts are invisible to the lineage store.
- Fallbacks: `helicone-fallbacks` JSON `[{target-url, headers, onCodes}]` — sequential fallback targets tried when the response code matches `onCodes` (gatewayRouter.ts).
- Streaming: supported; TTFT captured; body processors reconstruct usage from stream chunks per provider.

## 9. Revocation model

- API keys: **soft delete** — `KeyManager.deleteAPIKey` sets `soft_delete = true` on `api_keys`; provider keys likewise (`provider_keys.soft_delete`). Auth lookups filter `soft_delete = false`. Keys are hash-compared (SHA-256), so revocation is instant and no plaintext exists to rotate.
- Temp keys (`tempAPIKey.ts`, `tempProxyKey.ts`) for experiments/playground.
- Log data is **not revocable**: `Helicone-Omit-*` must be set at call time; there is no body-purge path in the harvested material. (A PING adaptation should add one: receipts keep digests, bodies deletable.)
- Rate limits are per-segment policies (`Helicone-RateLimit-Policy`, segments from properties/user), i.e. capability-style throttling, not revocation.

## 10. Tests

- Jawn (jest): `HandlerContext.test.ts`, `requestController.test.ts`, body-processor tests (google/anthropic stream), `sanitize.test.ts`, `subdivide.test.ts`, `sorts.test.ts`, HQL security tests, `TestClickhouseWrapper.test.ts`, `ptbAccess.test.ts`, webhook tests. Tests were inspected, **not executed** (env deps: ClickHouse, Postgres, Kafka).
- Worker: `e2e_test.py` (stream vs non-stream token equivalence keyed by `Helicone-Request-Id`; requires live stack).
- Cost package: contribution test guidance in README (sample-data calc, pattern matching, case sensitivity); no jest suite found in harvested paths.

## 11. SMALLEST MISSING PRIMITIVE

**`RequestReceipt`** — a canonical, hashable record of one external call, owned by the **object-kernel** (it is an evidence-bound object), with digest computation delegated to the **trust-kernel**:

```
RequestReceipt {
  receipt_id,          // uuid v4, system-assigned
  request_id,          // client idempotency UUID (Helicone-Request-Id analog); edge regenerates if malformed
  target,              // canonical target (url digest or endpoint class; never raw secrets)
  request_digest,      // sha256(canonical request bytes)   <-- Helicone lacks this
  response_digest,     // sha256(canonical response bytes)   <-- Helicone lacks this
  status_code,
  started_at, ended_at, latency_ms, ttft_ms?,
  usage { input, output, cached_input, cache_write_5m/1h, thinking, image/audio/video/file?, web_search? },
  cost_usd, cost_source: "provider_reported" | "computed" | "unknown",
  model, provider,
  actor_ref,           // which key/actor made the call (hashed key id, Helicone-style)
  session_id, session_path, session_name,   // client-asserted grouping (Helicone mechanism, adapted)
  properties { ... },  // flat string map
  retry_count, fallback_used?,
  body_ref?,           // pointer to byte store, optional; bodies deletable, digests permanent
}
```

Why this is the smallest valuable primitive: Helicone proves (a) one request = one receipt with timing + usage + cost attribution, (b) retries are edge-internal and never duplicate receipts, (c) sessions are a pure projection over `GROUP BY session_id` with path-prefix trees — no session lifecycle needed. What PING must add is exactly what Helicone lacks: **digests of canonical bytes** so a receipt is evidence, plus a **body-deletion/purge path** (revocation of bytes while digests survive). Everything else — pricing tables, Kafka, ClickHouse, the retry engine — is rejected.

## 12. Verdict rationale

**ADAPT, not ADOPT**: Helicone's *shapes* are proven (6k stars, production, Apache-2.0), but its *substance* is a hosted LLM-observability product: Cloudflare Worker + Kafka + ClickHouse + Supabase + MinIO, a TypeScript LLM pricing registry, and a retry/fallback policy engine. PING already has an event spine; it needs only the receipt schema, the client-asserted grouping convention, and the usage→cost attribution algebra — re-derived clean-room, zero vendored code. **REJECT**: pricing data tables (freshness liability; PING computes from provider-reported usage or its own registry), the gateway/retry/fallback engine, evals/datasets/alerts/webhooks layers, and the session UI tree logic.

## 13. Dependency analysis

- **Dependencies: none.** The adaptation is a schema + convention + small attribution function; no Helicone package is vendored. (The `@helicone/cost` TS registry is deliberately NOT vendored: pricing data goes stale, it's TS-only, and PING's rule "provider-reported cost wins" makes a pricing DB optional.)
- **DEPENDENCY_COST: zero.**

## 14. License finding

- **Apache-2.0**, verified twice: repo `LICENSE` file (standard Apache 2.0 text, head 067d9290) and GitHub license metadata. No GPL/copyleft/SSPL/BSL anywhere in the harvested material.
- Caveat (third-party sourced, not primary): reports say Mintlify acquired Helicone (March 2026) and the project is in maintenance mode. This affects upstream velocity, not license or harvestability.

## 15. Proof mapping

- **proof 3** (deterministic evidence-backed graphs): receipts are the evidence edges every external call leaves; session rollups are deterministic projections over them.
- **proof 10** (worker returns result): the receipt is the canonical capture of a worker's external result (status, usage, cost, digests).
- **proof 13** (mission VERIFIED only after independent verification): the verifier checks the receipt (digests + provider-reported usage), not the worker's claim.
- **proof 14** (replay reconstructs relevant state): sessions/cost/latency rollups replay deterministically from append-only receipts.

## 16. Gaps / open questions

- Session-path tree building is UI-side; the exact tree-derivation code lives in `web/` (not harvested — projection concern, easily re-derived).
- ClickHouse DDL for `request_response_rmt` was not harvested (analytics schema detail; PING's projection-kernel defines its own).
- The docs FAQ "how we calculate cost" (docs.helicone.ai/faq/how-we-calculate-cost) was referenced by third parties but not read directly; the README + `calculate-cost.ts` cover the mechanism.
- Tests were inspected, not run (stack deps).

## 17. Security note for the adaptation

Helicone trusts client-asserted headers for attribution (session-id, user-id, properties, model-override). In PING, session/property headers are *claims*, not facts: the receipt records *who asserted what* (actor_ref) and the verifier treats attribution as asserted-until-corroborated. The `Helicone-Model-Override` pattern (client picks the cost model) must NOT be adopted blindly — in PING, cost-model selection is a capability decision, not a client header.
