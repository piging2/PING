# Harvest Proposal: Portkey — model gateway authority

**Date:** 2026-10-02
**Worker:** harvest worker (Portkey assignment)
**Verdict:** ADAPT
**Authority owner:** event-kernel
**Proof coverage:** 9, 10, 11, 12, 13, 14 (mission execution lane; does not touch proofs 1-8)

---

## 0. Frozen-router boundary (binding, from the assignment)

PING's model router is FROZEN by Nolan's binding order. Harvested from Portkey: **only** the gateway primitives that record what happened during execution (routing receipts, fallback records, policy/verdict checks). **Off-limits — not harvested, not proposed, do not unfreeze the router for any of:**

- Model/provider selection logic (strategy modes `single`, `loadbalance`, `fallback`, `conditional` as *choosers* of models — the ConditionalRouter `$eq/$ne/$gt/...` condition engine, weighted target selection).
- The provider adapter catalog (100+ per-provider request/response transforms) — PING has its own execution targets; duplicating the catalog adds a dependency and a second truth about providers.
- Semantic/simple caching — a latency/cost optimization, not needed for proofs 9-14.
- Credentials, virtual keys, budgets/spend, the dashboard control plane — credential custody is a security surface we do not want in piging2.

What IS in scope: the *shape of the evidence* Portkey emits while executing a strategy — the per-attempt fallback record, the retry-budget arithmetic, the guardrail verdict record, and the target position-path identity. These describe execution truth, not selection policy.

---

## 1. What was read (official docs and source only)

Repo: `https://github.com/Portkey-AI/gateway` — HEAD `669825cbe89ee51569918b8f78a9db486fd69dd4` (shallow clone, read-only, 2026-10-02). npm: `@portkey-ai/gateway` v1.15.2 (per package.json).

| # | Source | Type |
|---|--------|------|
| 1 | `src/handlers/handlerUtils.ts` — `tryTargetsRecursively` (routing engine: strategy switch, config inheritance merge, circuit-breaker seam) and `recursiveAfterRequestHookHandler` (retry-budget arithmetic, exhaustion sentinel) | Official source |
| 2 | `src/handlers/retryHandler.ts` — `retryRequest`, `fetchWithTimeout` (AbortController timeout, async-retry backoff) | Official source |
| 3 | `src/middlewares/requestValidator/schema/config.ts` — `configSchema` (zod): strategy modes, retry, cache, hooks, guardrails, targets recursion | Official source |
| 4 | `src/services/conditionalRouter.ts` — `ConditionalRouter`, operator enum `$eq/$ne/$gt/$gte/$lt/$lte/$in/$nin/$regex/$and/$or` | Official source |
| 5 | `src/middlewares/hooks/index.ts` — hook execution, `shouldDeny`, check-level `fail_on_error` semantics | Official source |
| 6 | `src/middlewares/hooks/types.ts` — `HookObject`, `HookSpanContext`, `GuardrailCheckResult`, `GuardrailResult`, `HookFeedback` | Official source |
| 7 | `plugins/types.ts` — `PluginHandler`, `PluginHandlerResponse` (`error`, `verdict`, `data`, `transformedData`) | Official source |
| 8 | `src/providers/types.ts` — `ProviderAPIConfig` (`headers`, `getBaseURL`, `getEndpoint`), `ProviderConfig` (`ParameterConfig`), `endpointStrings` | Official source |
| 9 | `src/providers/openai/chatComplete.ts`, `src/providers/openai/api.ts` — one provider adapter as exemplar of the adapter pattern | Official source |
| 10 | `src/handlers/services/logsService.ts` — log object fields (`traceId`, `lastUsedOptionIndex`, `retryAttempt`, `hookSpanId`, OTLP span shape) | Official source |
| 11 | `plugins/default/manifest.json` + `plugins/default/*` — guardrail plugin registry shape (id, type `guardrail`, `supportedHooks`, parameter schema) | Official source |
| 12 | `conf.json`, `LICENSE`, `package.json` | Official source |
| 13 | `https://github.com/portkey-ai/docs-core/blob/HEAD/guides/use-cases/enterprise-ready-unified-api.mdx` — official docs: failover strategy, retry backoff table (1/2/4/8/16s), per-target retry budgets, unified error codes (446 Guardrail Failed) | Official docs |

No marketing copy used. No third-party writeups used as evidence. No proprietary code copied — mechanisms below are re-derived in PING vocabulary.

---

## 2. Object model

Portkey's execution universe has six nouns that matter to us:

1. **Config (GatewayConfig)** — a versioned JSON policy object. Recursive: a Config contains `strategy` + `targets[]`, and each target is itself a full Config. Fields: `strategy {mode, on_status_codes, conditions[{query, then}], default}`, `targets[]`, `provider` (slug or `@slug`), credentials (`api_key`, AWS keys, ...), `retry {attempts, on_status_codes, use_retry_after_header}`, `cache {mode, max_age}`, `weight`, `override_params`, `request_timeout`, `custom_host`, `forward_headers`, `before_request_hooks[]`, `after_request_hooks[]`, `input_guardrails[]`, `output_guardrails[]`, `input_mutators[]`, `output_mutators[]`. Validated by a zod schema at the boundary.
2. **Target** — one node in the strategy tree: either a leaf (a provider + model + credentials) or a nested strategy group. Targets are addressed by **position path** (`targets[0].targets[1]`, tracked as `currentJsonPath` through recursion).
3. **Strategy** — one of `single | loadbalance | fallback | conditional`. The dispatch rule per mode (source §1.1):
   - `fallback`: sequential; stop when (a) `on_status_codes` set and status NOT in list, (b) no list and `response.ok`, or (c) gateway exception. **Everything else advances to the next target.**
   - `loadbalance`: single weighted pick (`weight` defaults 1; `Math.random() * totalWeight`), no failover on failure.
   - `conditional`: `ConditionalRouter` evaluates metadata + request params against Mongo-style operators; first match wins, else `default`, else throws `RouterError`.
   - `single`: `targets[0]`.
4. **Provider adapter** — a typed seam: `ProviderAPIConfig {headers(), getBaseURL(), getEndpoint(), transformToFormData?}` plus per-endpoint parameter configs (`ProviderConfig`: param mapping, defaults, `min`/`max`, `required`, `transform` fn). One adapter per provider, one universal OpenAI-shaped request in.
5. **Hook** — `{type: guardrail | mutator, id, checks[] {id: "<plugin>.<fn>", parameters}, async, sequential, deny, eventType: beforeRequestHook | afterRequestHook, onFail/onSuccess feedback}`. Guardrails are plugins declaring `supportedHooks`.
6. **Check result / Hook result** — `PluginHandlerResponse {error, verdict?: boolean, data, transformedData}` per check; aggregated into `GuardrailResult {verdict, id, checks[], feedback {value, weight, metadata}, async, deny, execution_time, skipped, type, created_at}`. Per-check: `GuardrailCheckResult {verdict, error, data, id, execution_time, created_at, transformed, transformedData, log, fail_on_error}`.

Notable mechanics inside the model:

- **Config inheritance merge:** `tryTargetsRecursively` merges parent → child with child winning (`overrideParams`, `retry`, `cache`, hooks, guardrails, `requestTimeout`, `forward_headers`, `customHost`). Guardrails compile to hooks at the leaf.
- **Gateway exception interrupt:** a thrown provider error is wrapped as a 500 Response with header `x-portkey-gateway-exception: true`, which interrupts the fallback loop (fail-fast on gateway-level errors, fall over on provider-level errors).
- **Circuit-breaker seam, not implementation:** OSS filters `targets.filter(t => !t.isOpen)` and calls `c.get('handleCircuitBreakerResponse')?.(...)` — both are supplied externally (enterprise/control plane). The OSS core has the seam but no breaker. This is exactly the "seam must buy replaceability" pattern: the routing core delegates health state.
- **Retry budget arithmetic:** each fallback target gets its OWN retry budget (`retry.attempts`, exp backoff 1/2/4/8/16s, `use_retry_after_header`, global `MAX_RETRY_LIMIT_MS` cap). Exhaustion is a typed sentinel: `lastAttempt = -1` when all attempts exhausted on a retriable code, else the count of attempts made. After-request hooks can also trigger a re-retry of the same target (`recursiveAfterRequestHookHandler`), and each such re-entry is logged before looping.
- **Denial:** `shouldDeny = results.some(!verdict && hook.deny && !skipped)`. A denied before-request hook blocks the provider call (HTTP **446** "Guardrail Failed" per official docs + source comment). Check errors fail the verdict unless the check sets `fail_on_error: false` (then error is tolerated — the error-tolerant-vs-fail-closed knob is explicit per check).

## 3. ID scheme

- **Config identity:** dashboard-saved configs get `pc-*` IDs referenced via `x-portkey-config`; inline configs are anonymous request-scoped JSON. Provider identity: `@provider-slug` + credential handle (virtual key) — custody lives in the control plane, never in the gateway.
- **Target identity:** the strategy-tree position path (`targets[0].targets[1]`, `currentJsonPath`). Deterministic, replayable, and human-readable — the address of *where in the policy* an attempt executed.
- **Request identity:** OTLP `traceId` + `spanId` (`crypto.randomUUID()`); the log object also carries `hookSpanId`, `lastUsedOptionIndex`, `retryAttempt`, `cacheKey`. No canonical request UUID minted by the gateway itself.
- **Plugin identity:** `<plugin>.<function>` (e.g. `default.regexMatch`), declared in each plugin's `manifest.json` with parameter JSON-schema. A plugin registry, not a class hierarchy.

## 4. State transitions

Per-request lifecycle (re-derived, no copied code):

```
CONFIG VALIDATE (zod)
  -> beforeRequestHook span opens
     guardrail checks run (parallel unless sequential)
     verdict && !deny  -> proceed
     verdict && deny   -> 446 Guardrail Failed, request NEVER sent
     error && fail_on_error=true -> verdict=false (fail closed at check level)
  -> ROUTE: tryTargetsRecursively
     FALLBACK: for each target (in order): execute target with its own retry budget;
               advance iff (status in on_status_codes) or (!ok and no code list);
               interrupt on x-portkey-gateway-exception
     LOADBALANCE: one weighted random pick, single attempt
     CONDITIONAL: evaluate metadata+params, pick target, else default, else RouterError
     SINGLE: targets[0]
     LEAF: tryPost -> retryRequest(attempts, on_status_codes, backoff, Retry-After)
  -> afterRequestHook span (can transform response, can trigger re-retry)
  -> LOG: traceId, target path, attempt counts, hook results, execution time
```

Failure taxonomy actually implemented: `AbortError` → synthetic 408 `timeout_error`; retriable HTTP codes → retry; non-retriable → advance/fail; gateway exceptions (thrown) → fail-fast interrupt; exhausted retries → sentinel `lastAttempt = -1` and the last response is returned (not thrown).

## 5. Authority boundary

The gateway **owns nothing except dispatch**: it validates the Config, transforms the request, chooses per the declared strategy, and logs evidence. It does NOT own credentials at rest (inline keys or control-plane virtual keys), budgets/spend, or audit persistence (OSS logs to stdout/log service; the managed app persists). Policy authority = whoever signs the Config; the gateway is a faithful executor of declared policy, not a policy maker. Per-request headers can carry a Config, so the deployment must decide which headers are caller-writable — callers cannot override what the schema/deploy forbids. This is a clean boundary PING can mirror: **the execution substrate records; it never selects policy.**

## 6. Persistence semantics

Stateless. No durability claims: crash loses in-flight attempts; the gateway offers no idempotency. Cache (simple/semantic) is the only cross-request state, backed by Redis or in-memory. Circuit-breaker health (`isOpen`) must be supplied by an external store. Conclusion: Portkey's reliability is *in-request* reliability (retry + fallback), not *durable* reliability — it solves proofs 10/12 (result returned, fallback succeeded) but nothing about replay after death. That is precisely why the harvestable piece is the *record format*, not the engine.

## 7. Evidence / receipts

Per request the log object captures: `traceId`, `hookSpanId`, `lastUsedOptionIndex` (which target served), `retryAttempt` count, `cacheStatus`/`cacheKey`, per-hook check results (verdict, `execution_time`, `created_at`, error name/message), and `executionTime`; plus OTLP spans with `gen_ai.*` attributes; the served response names its `provider` (per official docs). **What is missing (the gap):** none of this is a *signed, canonical, append-only receipt*. It is observability output, not evidence. PING's event spine is the authority this plugs into: the FallbackAttemptRecord below is the canonicalized form.

## 8. Retries / failures

- `async-retry` with exponential backoff (1/2/4/8/16s per official docs), `on_status_codes` trigger list, optional `Retry-After` honor, `MAX_RETRY_LIMIT_MS` global cap, per-target timeout via `AbortController` (→ 408).
- Each fallback target gets an independent retry budget — retry is *per target*, failover is *across targets*.
- Exhaustion is explicit (`lastAttempt = -1`), not an exception; the last response is returned truthfully.
- Gateway-level exceptions interrupt fallback immediately (distinguishes "provider failed" from "gateway broken").

## 9. Revocation model

OSS gateway has none — correct for a stateless proxy. Credentials are inline keys or control-plane virtual keys; revocation = rotate/delete the key in the control plane. Guardrail/deny policy is per-request config, so a policy change takes effect on the next request with zero deploy. Takeaway for PING: revocation belongs at the credential/capability layer, not in the execution router.

## 10. Tests

Repo ships `tests/unit/src/handlers`, `tests/integration/src/handlers`, `src/tests/` (`common.test.ts`, `routeSpecificTestFunctions.ts`), `plugins/default/default.test.ts`, `plugins/utils.test.ts` (jest). Not executed by this worker (out of scope; coordinator decision). They cover route-specific handler behavior and the default guardrail plugin set.

## 11. License

**MIT** — `LICENSE` at repo root, "Copyright (c) 2024 Portkey, Inc". Permissive; no GPL/copyleft/SSPL/BSL concern. Clean to adapt mechanisms from. No flag needed for Nolan.

## 12. Dependency analysis

The OSS gateway's runtime deps (package.json): `hono`, `@hono/node-server`, `@hono/node-ws`, `zod`, `async-retry`, `ioredis`, `jose`, `ws`, `@smithy/signature-v4`, `@aws-crypto/sha256-js`, `@cfworker/json-schema`, `avsc`, `@portkey-ai/mustache`, `@types/mustache`, `patch-package`. **We adopt none of them.** The harvest is mechanism-only (a record shape + transition rules), rewritten in PING semantics with PING's existing primitives. `DEPENDENCIES: []`, `DEPENDENCY_COST: "zero"`. The provider-adapter catalog, caching, and control plane are explicitly rejected as dependencies (they would add hundreds of provider contracts and a second truth about providers).

## 13. Verdict: ADAPT (mechanism only, zero code, zero deps)

Adopt the *evidence shape*; reject the engine. Concretely, piging2's event-kernel gains one new canonical record type, and nothing else:

### SMALLEST MISSING PRIMITIVE: `FallbackAttemptRecord`

An ordered, evidence-bound record of one execution route — what the mission executor TRIED, in order, and what won. Re-derived from Portkey's per-target budget + position-path identity, adapted to PING's event spine (canonical bytes, digest, append-only):

```
FallbackAttemptRecord {
  mission_id: PING mission identity
  route_path: deterministic position path of the execution target in the attempt tree
              (Portkey's currentJsonPath, e.g. "targets[0].targets[1]")
  strategy: the dispatch rule that was executed (recorded, not chosen by this record)
  attempts: [
    {
      started_at, ended_at,
      status: provider status code | TIMEOUT | GATEWAY_EXCEPTION,
      error_kind: retriable | non_retriable | gateway_exception,
      retry_budget_used: n of m,
      verdicts: [ { check_id, verdict, execution_ms } ]   // guardrail checks, Portkey HookResult shape
    }
  ]
  outcome: SERVED | EXHAUSTED | GATEWAY_EXCEPTION | DENIED(446-analog)
  served_by: route_path of the winning attempt (Portkey's lastUsedOptionIndex, canonicalized)
  evidence_digest: sha256 over canonical bytes of the record
}
```

Why this is the smallest valuable thing PING does not already have: PING's mission lane (proofs 9-14) records that a mission ran and that a worker returned a result, but it has no canonical **per-attempt routing receipt** — no ordered record of *which execution target was tried, why it was abandoned, and which one served*. Proof 12 ("fallback attempt succeeds") cannot be demonstrated honestly without it: today the fallback would be invisible. The record also gives proof 11 ("injected bad result is rejected") its shape: the `verdicts[]` array with `DENIED` outcome is exactly the guardrail-deny receipt. And because the record is *evidence of execution*, not *selection policy*, it does not touch the frozen model router — the router keeps choosing; the event kernel keeps the receipt.

What we deliberately do NOT take: strategy selection modes, the ConditionalRouter operator engine, weighted picking, the 100+ provider transforms, caching, virtual keys, budgets, the dashboard. The circuit-breaker seam (external `isOpen` filter + response hook) is noted as a pattern to mirror when PING needs health-gated dispatch, but it is not harvested now — no proof requires it.

### Proof mapping

- **Proof 12 (fallback attempt succeeds):** `FallbackAttemptRecord` with `attempts[] > 1` and `outcome: SERVED` — the canonical demonstration artifact.
- **Proof 10 (worker returns result):** `served_by` + final attempt's status binds the result to the target that produced it.
- **Proof 11 (injected bad result rejected):** `verdicts[]` with `verdict: false` + `outcome: DENIED` — the guardrail-deny receipt, Portkey's `shouldDeny`/446 semantics.
- **Proof 13 (VERIFIED only after independent verification):** the record is *input* to verification, never its output — verifier reads attempts/verdicts, never trusts a self-asserted success.
- **Proof 9, 14:** the record is a canonical event-spine entry; replay reconstructs which target served and why others didn't, from the same bytes.

---

## Appendix: source integrity

- SOURCE_REPO: `https://github.com/Portkey-AI/gateway`
- SOURCE_HEAD: `669825cbe89ee51569918b8f78a9db486fd69dd4`
- SOURCE_SHA (sha256 over concatenated upstream files actually read, §1 rows 1-12 except docs): `sha256:d8f51fcbf612e31caea1db2ec4683618639a7c4e8652681221f7d383e3ecf175`
  - Inputs, in order: `src/handlers/handlerUtils.ts`, `src/handlers/retryHandler.ts`, `src/middlewares/requestValidator/schema/config.ts`, `src/services/conditionalRouter.ts`, `src/middlewares/hooks/index.ts`, `src/middlewares/hooks/types.ts`, `plugins/types.ts`, `src/providers/types.ts`, `src/providers/openai/chatComplete.ts`, `src/providers/openai/api.ts`, `src/handlers/services/logsService.ts`, `plugins/default/manifest.json`, `conf.json`, `LICENSE`, `package.json`
  - Plus official docs page (§1 row 13), read 2026-10-02, not included in the hash (fetched text, recorded above).
- No proprietary code copied. All mechanisms re-derived in PING vocabulary.
