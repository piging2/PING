# LANE L — ECOSYSTEM HARVEST: secret brokering mechanisms

Cloned: `pymacaroons` only (mechanism extraction). Everything else from primary docs/papers.

## 1. Macaroons (NDSS 2014, Birgisson et al.)
- PROBLEM: Bearer tokens are ambient authority; delegation without re-issuance.
- SOURCE: https://research.chalmers.se/publication/539211/file/539211_Fulltext.pdf ; clone github.com/ecordell/pymacaroons @ 78c55c1d33a0b23ddc71140a9c999f957d79e9dd (2023-03-01)
- LICENSE: MIT (verified in clone)
- MECHANISM: chained HMAC; caveats are additive AND-restrictions; holder can attenuate offline (add caveat, never remove); third-party caveats for distributed checks.
- FAILURE SEMANTICS: signature mismatch -> reject; unsatisfied caveat -> reject; no revocation protocol in core spec.
- TESTED: cloned, installed deps, ran 3 runnable test modules (3 passed; 2 modules need `mock`/`hypothesis`, not installed). Wrote spike: attenuation verified True; byte-tampered macaroon rejected.
- PING ANALOG: scope binding as server-side caveats (principal/op/target/audience/time) with additive narrowing; scope mismatch = deny.
- DECISION: PATTERN_ONLY. Reject macaroon tokens as PING handles: in PING's threat model the AGENT is the untrusted holder, and a bearer credential sitting in agent context can be exfiltrated verbatim into logs/tool calls. No revocation primitive in core.

## 2. Biscuit (eclipse-biscuit, spec v2, impls biscuit-rust / biscuit-wasm)
- PROBLEM: same as macaroons + decentralized verification without sharing the minting key.
- SOURCE: https://www.biscuitsec.org (spec v2; CVE-2024-42350 fixed in spec v4)
- LICENSE: Apache-2.0 (implementations); spec CC.
- MECHANISM: public-key block chains, offline attenuation via per-block ephemeral keypairs, embedded Datalog policy language.
- FAILURE SEMANTICS: Datalog check failure -> deny; block chain break -> deny.
- PING ANALOG: attenuation-by-construction; asymmetric verification.
- DECISION: REJECT as dependency. Coupling a Datalog policy engine into the token format pre-empts PING's own policy layer; spec/implementations never formally audited; library maturity uneven in TS/Python where PING agents live; weight dwarfs value. Keep the attenuation idea, not the format.

## 3. HashiCorp Vault dynamic secrets + Agent sidecar
- PROBLEM: static credentials live for months; every consumer shares them.
- SOURCE: HashiCorp Vault docs (dynamic DB creds, leases, Agent sidecar injector)
- LICENSE: BSL 1.1 (changed from MPL-2.0 in 2023) — NOT OSI open source.
- MECHANISM: secrets engines mint per-consumer credentials with TTL; lease renewal/revocation; Agent sidecar renders secrets to the workload's filesystem.
- FAILURE SEMANTICS: lease expiry -> credential revoked at the source; `vault lease revoke` kills all outstanding; fail closed on unsealed/unreachable.
- PING ANALOG: TTL ceiling (<=15 min) + revocation kills outstanding handles + rotation story.
- DECISION: REJECT as dependency. Kill criteria: license incompatible (BSL), weight dwarfs value (cluster, unseal ceremony), would surrender custody authority to an external control plane. ADAPT the lease/revocation semantics into the broker.

## 4. SPIFFE/SPIRE (CNCF graduated; SPIRE v1.15.1, 2026-05-28)
- PROBLEM: "Secret Zero" — bootstrapping the first credential without a static secret.
- SOURCE: spiffe.io docs; github.com/spiffe/spire
- LICENSE: Apache-2.0
- MECHANISM: SPIRE Server = trust-domain CA; per-node SPIRE Agent attests workload (k8s SA, cgroup) then issues short-lived SVID (X.509 for mTLS, JWT-SVID for bearer); auto-rotation; no long-lived secret ever touches disk.
- FAILURE SEMANTICS: failed attestation -> no SVID; expired SVID -> rejected by verifier; node-root compromise can spoof attestation (Unit42 Spooffe, 2026-09).
- PING ANALOG: the broker's trusted execution seam = attested audience; "no long-lived secret touches the agent" is exactly our invariant; principal strings are attested worker identities.
- DECISION: PATTERN_ONLY. REJECT running SPIRE: weight dwarfs value for a single-host phase; adopt when PING is multi-host. The audience-binding invariant comes from here.

## 5. AWS STS / IAM Roles Anywhere
- PROBLEM: long-lived IAM user keys.
- LICENSE: proprietary cloud API (mechanism only).
- MECHANISM: AssumeRole mints session creds with TTL (15m-12h), scoped by policy; Roles Anywhere binds to X.509 identity.
- FAILURE SEMANTICS: expired session -> AccessDenied; policy eval on every call.
- PING ANALOG: TTL ceiling; per-request scoped session.
- DECISION: PATTERN_ONLY (cloud API, not vendored).

## 6. OAuth Token Exchange RFC 8693
- MECHANISM: exchange a subject token for a down-scoped token for a different audience; `act`/`may_act` claims carry delegation chains.
- FAILURE SEMANTICS: invalid subject -> invalid_grant; audience mismatch -> deny.
- PING ANALOG: handle = down-scoped delegation artifact; audience binding.
- DECISION: PATTERN_ONLY (protocol for human-consent OAuth, not the broker itself).

## 7. Capability URLs (S3 presigned URLs pattern)
- MECHANISM: URL embeds (resource, operation, expiry) + HMAC signature; anyone holding it can use it within bounds, no account needed.
- FAILURE SEMANTICS: expired/mutated URL -> SignatureDoesNotMatch.
- PING ANALOG: handle format (opaque id + scope) — but we keep authority server-side, NOT bearer, because our holder is untrusted.
- DECISION: PATTERN_ONLY.

## 8. Kubernetes projected service-account tokens
- MECHANISM: kubelet projects short-lived, audience-bound JWTs into pods; auto-rotated.
- FAILURE SEMANTICS: wrong audience -> reject; expiry -> reject.
- PING ANALOG: audience binding + rotation without agent involvement.
- DECISION: PATTERN_ONLY.

## WINNER
Hand-built PING Secret Broker, zero dependencies:
- Opaque server-side capability handles (random 256-bit), authority lives in the broker's store, never bearer.
- Server-side caveats: (principal, operation, target, audience, nbf, exp, maxUses), additive narrowing only.
- `execute(handle, scope, fn)`: secret resolved INSIDE the trusted seam, never returned to caller.
- Audit records handle-id + metadata + outcome, never values.
- Backend pluggable: env/file storage now (PING's current custody), KMS later. No second custody pattern: all connector code migrates to the broker port.

## KILL-CRITERIA CHECK (applied to every dependency)
- license incompatible: Vault (BSL) rejected as dependency.
- surrender canonical authority: Vault/SPIRE-as-control-plane rejected.
- unsafe secret model: bearer tokens in agent context rejected (macaroon-as-handle).
- weight dwarfs value: SPIRE, Vault, Biscuit-Datalog rejected.
- PING already solves it: n/a (no broker exists).
- novelty only: none adopted.
