# HARVEST REPORT — Lane L: secret brokers

Companion: `lane-l/HARVEST.md` (mechanism-level harvest: macaroons,
Biscuit, Vault Agent, SPIFFE/SPIRE, AWS STS, RFC 8693, capability URLs,
k8s projected tokens — all PATTERN_ONLY or REJECT as dependency, same
winner). This report is the platform-level evaluation in the required
harvest-lane format. Both converge: hand-built PING broker, zero new
dependencies.

## PROBLEM
Connectors multiply credentials (OAuth refresh tokens, API keys, session
cookies). PING needs ONE custody pattern: agents get capability handles,
never tokens; resolution happens at call time inside a trusted seam; nothing
secret lands in objects, events, SiteSpec, agent context, logs, or snapshots.
The password incident (2026-09-21) showed manual exceptional handling is not
a system.

## PING ALREADY HAS
- Env-only intake, `.env` gitignored, never-hardcode/never-print guardrails
  (`src/lib/infrastructure/auth-manager.ts`).
- Dev-key custody precedent: `src/lib/ping/dev-signer.ts` (keys outside the
  git tree, never reach browser/logs/events).
- `~/workspace/tools/redact-secrets.py` + 22 regression tests (all passing,
  verified 2026-09-23): conservative redaction for env/JSON/header text.
- Standing inspection rule: diagnostics safe to copy (***REDACTED***); raw
  inspection only as explicit exceptional machine-local action.
- BCQ contract: `CredentialRef` opaque type, secret canary planted in
  provider responses and scanned across outputs, Nango ADOPT (bounded) for
  auth + proxy transport with `getConnection` never exposed.
- What is missing: unified issuance/resolution/revocation/audit, handle
  TTL/lease semantics, attenuation, at-rest encryption of stored tokens
  (ENCRYPTION_KEY documented but unused).

## EXTERNAL CANDIDATES
| Candidate | Shape | Role evaluated for |
|---|---|---|
| HashiCorp Vault | self-hosted secrets engine | dynamic secrets, lease/renew/revoke/audit semantics |
| OpenBao | self-hosted Vault fork | same, under an open license |
| Infisical | SaaS + self-host secret manager | centralized custody + audit |
| Doppler / Akeyless | proprietary SaaS | centralized custody |
| AWS/GCP Secret Manager | cloud-native | managed custody |
| SOPS + age | encrypted-in-git | git-native custody |
| go-macaroon/macaroon | capability-token mechanism | handle attenuation via caveats |
| Nango | auth + proxy transport | credential injection without exposure |

## LICENSES
- Vault: BSL 1.1 (source-available; internal use permitted, but ambiguous
  for a multi-tenant service-provider platform; converts to MPL 2.0 only
  after 4 years). Kill criterion: license incompatible.
- OpenBao: MPL 2.0 (Linux Foundation fork of pre-BSL Vault). License OK.
- Infisical core: MIT. License OK.
- Doppler / Akeyless: proprietary SaaS. Fail "cannot be isolated" and
  "surrenders canonical custody".
- AWS/GCP Secret Manager: proprietary cloud. Same failure.
- SOPS: MPL 2.0 / age: BSD. License OK, wrong shape (see below).
- go-macaroon/macaroon: BSD-3-Clause (Roger Peppe, 2014). License OK.
- Nango: Elastic License v2; already ADOPTED (bounded) by lane BCQ for
  auth + proxy only.

## TESTED
- `python3 ~/workspace/tools/test-redact-secrets.py` -> 22/22 pass.
- Cloned `go-macaroon/macaroon` (depth 1) to `lane-l/harvest/macaroon/`;
  verified the caveat mechanism by inspection (`AddFirstPartyCaveat`,
  `AddThirdPartyCaveat` with signature-chained attenuation: caveats can be
  added but not removed without detection; third-party caveats delegate
  discharge). No Go toolchain in this sandbox, so upstream tests were not
  run; recorded as unverified-by-execution.
- Vault/OpenBao/Infisical evaluated at documentation + license level and
  rejected on kill criteria before any clone (cloning a platform to reject
  it on license would be waste).
- SOPS+age rejected on shape: secrets live in git history forever, which
  contradicts the standing rule that git never holds secrets.

## WINNER
No external platform wins. The winner is the thin PING-owned broker SPI
(SECRET-BROKER-DESIGN.md §6) with two ADAPTED mechanisms:
- Lease lifecycle (issue / TTL / renew / revoke / audit) adapted from
  Vault/OpenBao dynamic-secret semantics.
- Handle attenuation via first-party caveats adapted from macaroons.
Transport stays Nango-proxy (already adopted, bounded).

## ADOPT-ADAPT-REJECT
- REJECT HashiCorp Vault: BSL 1.1 license incompatible with FYD's
  multi-tenant service-provider model; plus weight dwarfs value (cluster to
  operate for a handful of OAuth providers).
- REJECT OpenBao as a platform: license is fine (MPL 2.0) but it fails
  weight-dwarfs-value and concentrates custody in an operated cluster;
  ADAPT its lease/renew/revoke/audit semantics into the broker interface.
- REJECT Infisical / Doppler / Akeyless / cloud secret managers: proprietary
  SaaS surrenders canonical custody to an external operator and cannot be
  isolated self-host; the veto gate bars them from the production hot path.
- REJECT SOPS+age: wrong shape; git becomes the custody store.
- ADAPT macaroon caveats: attenuation pattern for handle narrowing
  (BSD-3-Clause reference inspected, not vendored).
- ADOPT (already, by BCQ): Nango proxy-only transport. The broker holds the
  Nango env key as a capability; connectors call the substrate, never Nango.

## CODE WE DO NOT NEED TO WRITE
- A secrets server (no Vault/OpenBao cluster to build, operate, unseal, or
  back up).
- An OAuth token dance (Nango / provider SDKs handle it; the broker only
  takes custody at the callback).
- A redaction engine (redact-secrets.py exists and passes).
- A canary scanner (BCQ kit has it).
- A macaroon library (the pattern is 30 lines of caveat checks, not a
  vendored dependency).

## MINIMAL PING WRAPPER
The broker SPI itself (`lane-l/SECRET-BROKER-DESIGN.md` §6): `issue`,
`attenuate`, `execute`, `renew`, `revoke`, `inspect`, `audit`, `rotate`,
plus a pluggable encrypted credential-store port (env/file backend at v1;
the ENCRYPTION_KEY pattern finally implemented as designed). First consumer:
BCQ's `AuthBroker` SPI. Estimated: one small module, zero new runtime
dependencies.

## FAILURE TEST
The six red-team failure tests in SECRET-BROKER-DESIGN.md §8 are the
acceptance suite: error-body canary, cross-tenant handle rejection,
worker-compromise blast radius, leaked-handle unusability, no agent
resolution path, snapshot-without-KEK fails closed. The secret-redaction
cases for the contract kit are drafted in
`lane-bcq/INTEGRATION-REQUEST-lane-l.md`.

## PRODUCT CAPABILITY UNLOCKED
Connectors can be added (Facebook, Google Business Profile, ATProto, ...)
without each one inventing custody: the morning connect flow (CONNECT SOURCE
-> OAuth PKCE -> broker issuance -> capability inventory) becomes safe by
construction, rotation becomes a one-call broker operation, and every
credential use is audited. This is the precondition for multi-tenant
connector scale: tenant A's token can never serve tenant B.

## BYTES-DEPENDENCY COST
Zero new runtime dependencies. Research clone (~200 KB, macaroon source)
stays in the harvest area, never vendored. The broker is hand-written PING
code against the existing stack. Rejected platforms would have cost: a
Raft cluster (Vault/OpenBao: multiple services + storage), per-seat or
per-identity SaaS fees (Infisical/Doppler/Akeyless), and BSL legal exposure
(Vault).

## VENDOR VETO GATE ANSWERS (Nolan's standing decision)
- DOES IT REMOVE COMMODITY CODE? No vendor is adopted; the thin SPI removes
  scattered hand-rolled env reads instead.
- DOES IT IMPROVE THE URL -> TRUSTED FYD LOOP? Yes: safe connector custody
  is the precondition for live source connections feeding the loop.
- CAN WE REMOVE/REPLACE IT? Yes: the store backend is a port; the handle
  interface is PING-owned; Nango remains replaceable behind BCQ's SPI.
- DOES PING REMAIN THE AUTHORITY? Yes: custody, audit, policy, objects,
  events all stay PING-side.
- WHAT DATA DOES IT OWN? The broker owns credential material and nothing
  else: no business data, no objects, no events.
- WHAT FAILS IF IT DISAPPEARS? Fetches fail closed (SOURCE_UNAVAILABLE);
  already-ingested evidence and the object graph are untouched.
- COST AT 10 / 1,000 / 100,000 FYDs? Near-zero marginal: one store lookup
  per fetch run, no per-seat or per-secret fees, no cluster to scale.
  Verdict: no gate trigger; nothing to escalate to Nolan.
