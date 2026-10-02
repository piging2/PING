# LANE BCQ — Connector Substrate Kit

Every future PING connector inherits this. It is a contract plus a test kit,
not a platform: no scheduler, no persistence plane, no event authority, no
secret broker. Those are other lanes' jobs (M, L, K own their semantics).

## Files

| File | What it is |
|---|---|
| `types.ts` | Connector identity, capabilities, tenant/principal, provenance, observations, failure taxonomy, cursor state, secret handles. |
| `adapter.ts` | `ConnectorAdapter` SPI (check/discover/read/webhook) + bounded `AuthBroker` SPI (the Nango seam). |
| `harness.ts` | Scripted provider, virtual clock, in-memory cursor store, observation/fetch/log sinks, secret canary scanner, knowledge ledger, manifest validator, HMAC webhook signer. |
| `sanitize.ts` | Zero-dependency reference text sanitizer + payload/redirect/SSRF boundary helpers. Fixture only: production uses the pinned sanitizer, not this. |
| `reference-adapter.ts` | Reference connector implementing the whole contract. Passes the suite; copy its patterns, not its code, into real connectors. |
| `contract-kit.ts` | Runner-agnostic suite: 32 checks across admission (A), idempotency (B), retry/circuit (C), taxonomy (D), hostile input (E), webhooks (F), provenance (G). |
| `run.ts` | `bun run.ts` executes the suite against the reference adapter. |

## Run

```sh
bun run.ts            # 32/32 expected, deterministic (no Math.random, virtual clock)
```

Inside the PING repo the suite is wired into jest (mirroring the
activitypub adapter's scoped config):

```sh
jest --config src/fyd/connectors/kit/jest.config.cjs
```

Typecheck needs node types once: `tsc --noEmit` with `@types/node` present.
Zero runtime dependencies by design.

## The contract in one page

- **check(configRef)**: provider auth proves ACCESS ONLY, never canonical business identity. Returns user_error (bad credential) vs connector_error (internal).
- **discover(configRef)**: streams in deterministic order; incremental streams declare their cursor contract.
- **read(request)**: emits OBSERVATIONS (never canonical truth). Every observation carries external object id, external timestamp, observed timestamp, raw evidence hash ref, connector/provider/fetch provenance, confidence grade.
- **Idempotency key**: `sha256(connectorId | streamId | externalObjectId | externalRecordVersion)`. Six proofs: same object twice, same webhook twice, restart, cursor rollback, network retry after unknown outcome, partial batch.
- **Cursors**: opaque, stored verbatim, checkpoint advances only past a fully processed page. Partial page: hold cursor, rely on idempotency on retry.
- **Retry**: max 3 attempts, 4xx (except 408/429) non-retryable, honor Retry-After, circuit breaker after sustained failures.
- **Webhooks**: HMAC-SHA256 over RAW bytes verified BEFORE parsing; unknown shapes preserved opaque, never dropped.
- **Secrets**: capability handles only (`SecretHandle`). No raw tokens in observations, logs, evidence, or fetch records. Secret canary test proves it.
- **Tenants**: every run carries tenantId + named principal; cross-tenant isolation is tested.
- **write.\***: denied by default. Connectors do not mutate canonical state.

## For lane CONN (writing a real connector)

1. Implement `ConnectorAdapter` from `adapter.ts` against your provider.
2. Run `runContractSuite(() => new YourAdapter(manifest), () => new Harness(manifest))` from `contract-kit.ts`. Ship nothing that fails a check.
3. Access provider credentials ONLY through `AuthBroker` (Nango proxy seam). There is deliberately no `getConnection`-style raw credential API.
4. Keep the reference sanitizer OUT of production: reuse the pinned sanitizer boundary; this one exists so the suite has no dependencies.
5. Observations flow to the canonical event authority (lane L/K/phase0 own that); this kit never invents one.

## Non-goals (refused on purpose)

Airbyte platform/runtime/scheduler/UI, Airbyte as authority, Nango syncs/functions/webhooks/MCP, any new event store or cursor registry, provider connector implementations imported blindly.
