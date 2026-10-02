# ping-ui-contract

The PING UI boundary and projection contract, implemented as a bounded slice.

**Governing rule: ONE AUTHORITY MODEL, ONE CONTRACT LANGUAGE, MULTIPLE PROJECTIONS, MULTIPLE EXECUTORS.**

The UI is a projection system. It owns no authority. Screens are projections over the same constitutional PING authorities, reached only through the gateway.

## Layout

```text
packages/schemas/          canonical shared projection contracts
  src/schemas/*.json       17 projection schemas, all carrying the envelope
  src/index.mjs            envelope helpers, maturity enforcement, validation
packages/api-client/       typed gateway clients
  src/public-client.mjs     PublicPingClient: read-only by construction
  src/authenticated-client.mjs  authenticated reads only, token never logged
  src/operator-client.mjs   human-gated action constructors, gap-labeled
apps/mission-control/      the bounded Mission Control slice
  src/automation-health.mjs   A-01 field model over proven file evidence
  src/mission-list.mjs        mission list/detail over gateway reads
  src/mission-window.mjs      drill-down; Run layer gap-labeled (no run_id)
  src/approval-queue.mjs      PENDING_HUMAN with dispatch gap labeled
  src/intent-ledger.mjs       terminal dispositions, unresolved explicit
tests/contract.test.mjs    required contract tests (node --test)
tests/projection-validator.test.mjs  mechanical proof enforcement tests
```

## Trust surfaces

PUBLIC / AUTHENTICATED / OPERATOR. The gateway is the security enforcement point. UI visibility is UX, never authorization. The public client is incapable of expressing mutations: no mutation request types exist in its type surface, and its only request path hard-rejects non-GET.

## Maturity contract

Every projection carries in-band: `maturity`, `proof_status`, `verified_at`, `evidence_ref`, `source`, plus implementation `stage`. Binding invariant: **UI CLAIM <= BACKEND PROOF**. Missing proof metadata fails closed to UNKNOWN. Implementation stage (HARVESTED / CONTRACT_DEFINED / IMPLEMENTED / WIRED / RUNTIME_VERIFIED / DEPLOYED) is tracked separately from maturity and never collapsed into it.

## Hard boundaries honored here

- run_id does not exist: the Run layer is gap-labeled, never fabricated. No timestamp inference, no correlation_id overloading.
- No tenant identity authoring: tenant.ping.v1.json does not exist; status DIRECTION.
- Capability names in the contract are PROPOSED until mapped to real gateway enforcement.
- Cron definition files are intent, not live scheduler state; scheduler execution history does not exist.
- No second backend of any kind.
- ORCA synthetic metrics can never satisfy the operational metric contract.

## Run the tests

```sh
node --test tests/contract.test.mjs tests/projection-validator.test.mjs
```

The projection validator (`packages/schemas/src/projection-validator.mjs`)
mechanically enforces UI CLAIM <= BACKEND PROOF on every projection:
missing evidence, missing source, illegal maturity promotion, future or
unparseable verified_at, fabricated identifiers (including ungrounded run
identity), unknown schemas, and unknown fields all fail closed or surface
as findings. UNKNOWN maturity is preserved, never erased.
