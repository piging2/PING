# Fixture Drift Detection — Strategy

A fixture is a recording of provider reality at a point in time. Providers
change. Drift = the recorded response no longer matches what the provider
actually returns. Undetected drift turns the lab from a regression suite
into a museum: fixtures pass, production breaks.

## Detection strategy (three layers)

### Layer 1 — Contract-hash revalidation (cheap, always on)
Every fixture with a `recordSchema` gets a contract hash:
`sha256(canonical(recordSchema))`. On the provider-contract revalidation
cadence (weekly per source, or on provider changelog/deprecation notice),
the lab fetches a small fresh sample through the authorized path and runs
`redteam/drift-check.mjs <fixture> <live-sample>`:

- added / removed / retyped fields -> drift DETECTED
- classification: SCHEMA_CHANGED (lane K 2.7), automatically
- action: quarantine new-shape records, halt the stream, mint a NEW fixture
  version from a fresh sanitized capture, flag the contract update.
  Never auto-accept the new shape. Never edit the old fixture version.

### Layer 2 — Deprecation-header watch (cheap, opportunistic)
Fixtures record provider deprecation signals when seen in the wild
(`Sunset` header, `Deprecation: true`, `Sunset-Link`, API changelog entries).
The `api-sunset-410-source-changed` fixture locks the expected behavior:
410-with-Sunset -> SOURCE_CHANGED, no retry, flag connector maintenance.
A revalidation sample carrying a Sunset header on a previously-clean
endpoint is drift even if the body shape is unchanged.

### Layer 3 — Live-sample diffing (expensive, on suspicion)
When Layer 1 flags drift or an incident suggests it, capture a fresh
sanitized recording and diff step-by-step against the fixture: status
codes, header sets, pagination scheme, cursor format. This is the full
"production failure -> fixture" path in FIXTURE-WORKFLOW.md.

## What runs tonight vs later

TONIGHT (no live credentials, standing decision): Layer 1 is implemented
and proven against a synthetic drifted sample
(`redteam/live-sample-drifted.json` vs `schema-drift-quarantine`:
added `new_field`, removed `reviewer`, retyped `rating` string->number ->
DRIFT-DETECTED, SCHEMA_CHANGED). The detection MECHANISM is proven;
the live-sample INPUT is queued.

MORNING QUEUE (after the connect flow is authorized): wire Layer 1 into
the per-source revalidation cadence. The lab never fetches live samples
itself; lane CONN provides sanitized samples through the fixture capture
path, and drift-check runs as a gate before any fixture is re-pinned.

## Anti-patterns (rejected)

- Auto-updating fixtures from live samples: destroys the regression value.
  Drift mints a new fixture VERSION; the old version stays to prove the
  regression stayed fixed.
- Treating drift as TRANSIENT and retrying: a reshaped provider does not
  reshape itself back. Lane K: SCHEMA_CHANGED is not retryable.
- Silent coercion of the new shape into the old schema: how drift becomes
  canonical corruption. Quarantine, then a human updates the contract.
