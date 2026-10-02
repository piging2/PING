# SEC3 — Environment Confusion Audit

**Worker:** SEC3 · **Date:** 2026-09-23 ~20:15–20:40 MDT
**Mode:** READ-ONLY STATIC ANALYSIS. No repo writes, no git mutation, no credential use, no secret values printed. COMMITS CREATED: NONE.
**Base:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (PRIMARY); (b) CORE `/home/nolan/ping` @ `refactor/runtime-authority-convergence` (consult-only; zero `NODE_ENV`-gated trust decisions found in `gateway/api_controller.js`, `gateway/simple_server.js`, `ping-runtime/` — only data JSON files mention NODE_ENV).
**Prerequisites read:** `~/workspace/constitutional-sprint/security/SECURITY-SWEEP.md`, `~/workspace/constitutional-sprint/reachability/REACHABILITY.md`.
**Drift note:** at scan time the worktree showed one uncommitted change vs `a69bb68f`: `src/fyd/claim/identity.ts` (comment-only; docstring corrected 2026-09-23 to note the Google-ready adapter already landed in `src/fyd/identity`). No behavioral difference. All line refs below are against the working tree, which matches `a69bb68f` behaviorally.

**Question answered:** does any mechanism behave differently in dev/staging/prod in a way that creates a security or integrity hole?

**Short answer:** Yes. One new HIGH (hardcoded fallback bearer token on a live diagnostic endpoint), one known-but-escalated HIGH (demo-owner-mode = single build-time public env flag + spoofable `Host` header), and six integrity/availability findings around silent defaults and fail-open-vs-fail-closed inconsistencies. No active env-gated auth *bypass* beyond the two already flagged in SECURITY-SWEEP (F3, F4).

---

## Findings matrix

Columns: DOMAIN / MECHANISM / ENV DIFFERENCE / CODE LOCATION / EXPLOIT OR ACCIDENT CHAIN / SEVERITY / PROOF LEVEL / CLASSIFICATION / BROKEN BOUNDARY / AFFECTS AGENTS

### E1 — Hardcoded fallback diagnostic secret (NEW, highest priority)

- **DOMAIN:** debug endpoint / credential defaulting
- **MECHANISM:** `GET /api/diagnostics/sharp` authorizes via `Authorization: Bearer <secret>` where `expectedAuth = \`Bearer ${process.env.DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}\``.
- **ENV DIFFERENCE:** The env var is not declared in `.env.example` (grep shows no `DIAGNOSTIC_*` entries there; only consumer is the route). On any deployment where the var is unset — which is every deployment observed — the bearer token is the publicly source-visible string `'dev-diagnostic-secret'`.
- **CODE LOCATION:** `src/app/api/diagnostics/sharp/route.ts:141` (`const expectedAuth = \`Bearer ${process.env.DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}\``); compare also uses `!==` (non-timing-safe; SECURITY-SWEEP F6).
- **EXPLOIT OR ACCIDENT CHAIN:** Attacker (no env needed): `curl -H 'Authorization: Bearer dev-diagnostic-secret' <host>/api/diagnostics/sharp` -> 200 with internal diagnostic payload (`runSharpDiagnostics`: module import stages, error details). The string is in the public repo source; anyone who reads the repo knows the token. Accident: the route is "temporary... remove after incident" per F6 yet shipped in production builds with no env gating (live in all envs identically).
- **SEVERITY:** HIGH
- **PROOF LEVEL:** STATIC+CONFIG (source lines quoted; `.env.example` grep = zero `DIAGNOSTIC_` hits; no other consumer sets it)
- **CLASSIFICATION:** env-confusion credential default; also fail-open default
- **BROKEN BOUNDARY:** secret management / debug-surface isolation
- **AFFECTS AGENTS:** any agent run whose diagnostics or incident tooling hits this endpoint; also every production deploy of the adapter.

### E2 — Demo-owner-mode: single public build-time flag + client-controlled Host gate (escalation of SECURITY-SWEEP F3)

- **DOMAIN:** authn/authz substitution (demo-owner-mode production-misconfiguration mode)
- **MECHANISM:** `isDemoOwnerModeEnabled()` = `process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE === "1"`. `NEXT_PUBLIC_*` is inlined at **build time** into the client bundle; server routes read it per-call (so it also works as a runtime var, but the bundle bakes it in). The private-network gate reads `req.headers.get("host")` — client-controlled.
- **ENV DIFFERENCE:** Dev with the flag on: all owner mutations (customize approve, `owner.correct-fact` overrides, claim verify) open by design. Production with the flag accidentally on (build-time or runtime): same mutations open with no second factor; on any non-Vercel/self-hosted bind the `Host` header is spoofable, so the "private host" check is bypassable. Additionally the flag's *presence is public*: it lives in the shipped JS bundle, so an attacker can learn whether the build is demo-enabled without probing the server.
- **CODE LOCATION:** `src/fyd/owner-mode/gate.ts:29-36` (flag), `:52-88` (`isPrivateHost`); `src/app/api/fyd/customize/route.ts:54-55`, `src/app/api/fyd/objects/[objectId]/overrides/route.ts:117-119`, `src/app/api/fyd/claims/[resourceId]/verify/route.ts:44-46` (all `request.headers.get("host")`).
- **EXPLOIT OR ACCIDENT CHAIN:** Accident: a production build that inherits the demo flag (copy-pasted env, build-time leakage) silently enables owner mutations to any visitor. Exploit on self-hosted bind: `curl -H 'Host: localhost' -X POST <host>/api/fyd/customize` etc. while flag is on. On Vercel the Host is routing-constrained (practical spoof resistance, per the sweep) — the residual risk is purely the flag being on in prod.
- **SEVERITY:** HIGH (conditional on misconfiguration; consequence is full owner-mutation surface)
- **PROOF LEVEL:** STATIC (source lines quoted; Vercel Host behavior not re-tested here — inherits SECURITY-SWEEP's assessment)
- **CLASSIFICATION:** env-confusion auth substitution; honest-but-load-bearing demo gate
- **BROKEN BOUNDARY:** authorization (demo verdicts must never back production decisions; the gate itself is the only thing enforcing that, and it is one env var)
- **AFFECTS AGENTS:** any agent that deploys/builds the adapter (build pipeline must assert the flag is off in prod); the tandem/outreach content agents do not consume it.

### E3 — Phantom `127.0.0.1:18199` defaults: silent fail-OPEN target vs fail-CLOSED sibling (MEDIUM)

- **DOMAIN:** service addressing / local-network confusion
- **MECHANISM:** Two separate defaults both point at `http://127.0.0.1:18199` when env is unset:
  - `fydJournalBase()` in the ping-object reader: `process.env.FYD_JOURNAL_GATEWAY_URL` unset -> `http://127.0.0.1:18199` (fetch, no explicit auth shown).
  - `fydGatewayBaseUrl()` in the social config: `FYD_PING_GATEWAY_BASE_URL || PING_GATEWAY_BASE_URL` unset -> `http://127.0.0.1:18199`.
- **ENV DIFFERENCE:** Contrast the *main* gateway base, which throws `GatewayNotConfiguredError` when unset (fail-CLOSED, reader line 240-243). The journal/social paths instead fabricate a localhost target (fail-OPEN-ish: they proceed to talk to whatever listens there). In dev the comment says "sprint demo default... on the Pig"; in prod/staging with the var unset the process still attempts unauthenticated localhost fetches.
- **CODE LOCATION:** `src/lib/ping/ping-object-reader.ts:263-266`; `src/fyd/social/config.ts:15-20`. (REACHABILITY.md §4 confirms nothing listens on 18199 on the Pig, so today this manifests as `GatewayUnreachableError` -> `FydTenantGraphError("reader_failed")` -> Ask FYD journal-overlay path down.)
- **EXPLOIT OR ACCIDENT CHAIN:** Accident: production deploy without `FYD_JOURNAL_GATEWAY_URL` sends overlay fetches and social write traffic at a phantom localhost port; if any other service ever binds 18199 on that host (another demo, a test harness, a compromised local process), the adapter would send signed-envelope traffic to an impostor (local-SSRF flavor). The default is also duplicated in two files — they can diverge silently.
- **SEVERITY:** MEDIUM (availability today; integrity escalation path via localhost impostor)
- **PROOF LEVEL:** STATIC+OBSERVED (source lines quoted; nothing-listening fact inherits REACHABILITY.md's live observation)
- **CLASSIFICATION:** env-confusion silent default; inconsistent fail-open/fail-closed contract
- **BROKEN BOUNDARY:** secure-by-default addressing; also single-source-of-truth for config (duplicated default)
- **AFFECTS AGENTS:** social write lane (`actions.ts`), Ask FYD overlay lane (`fyd-tenant-graph.ts`), any deployment agent.

### E4 — `PING_GATEWAY_BASE_URL` unset = silently dark constitutional surface (MEDIUM, integrity)

- **DOMAIN:** availability deception
- **MECHANISM:** Unset base URL -> `GatewayNotConfiguredError` thrown per-request inside the reader. 14 BFF routes (`api/ping/*`, `api/practice/*`) 500; site still renders from `var/fyd-projections/*.json` dump files, so it *looks* healthy.
- **ENV DIFFERENCE:** There is no startup/boot assertion that the gateway is configured and reachable. Dev on the Pig: same dark behavior as prod-with-missing-var; no env differentiates "gateway intentionally absent" from "gateway misconfigured". (REACHABILITY.md §4: all three live next-servers have 0 gateway env vars; healthy gateway on :8080 has zero clients.)
- **CODE LOCATION:** `src/lib/ping/ping-object-reader.ts:74-83, 240-243`.
- **EXPLOIT OR ACCIDENT CHAIN:** Accident: production deploy missing the var presents a fully-rendered site whose interactive/constitutional surface (writes, Ask FYD journal path, practice lane) is dead; operators and the user's own phone surface (Pig port 3100) see a "working" product with no honest signal that the seam is dark.
- **SEVERITY:** MEDIUM
- **PROOF LEVEL:** STATIC+OBSERVED (source; REACHABILITY.md's live topology)
- **CLASSIFICATION:** env-confusion silent degradation; failure-honesty violation
- **BROKEN BOUNDARY:** deployment readiness / honest failure signaling
- **AFFECTS AGENTS:** deployment agents; any agent running the Ask/practice/social lanes (they all assume the seam).

### E5 — Two dev-signing custodians with divergent env-unset and validation behavior (MEDIUM)

- **DOMAIN:** key custody / signing
- **MECHANISM:** Authority-map Overlap 2. Same crypto (Ed25519), same 0600/0700 file model, but:
  - `devKeyDir()` (practice BFF custodian, `src/lib/ping/dev-signer.ts:80-84`): `PING_DEV_KEY_DIR` unset -> **throws** `DevKeyDirNotConfiguredError` (fail-CLOSED). Identity-id validation **loose**: `/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/` (`dev-signer.ts:87-90`) — permits `..` as a directory name (traversal *shape*, though live callers mint ids server-side, so not currently reachable).
  - `fydDevKeyDir()` (FYD social custodian, `src/fyd/social/config.ts:22-24`): `FYD_DEV_KEY_DIR` unset -> **silently defaults to `/home/nolan/.fyd-dev-keys`** (fail-OPEN: proceeds with a hardcoded absolute user path). Identity-id validation **strict**: `/^identity_[0-9a-f]{16}$/` (`key-custody.ts:36-40`).
- **ENV DIFFERENCE:** A deployment that sets only one key dir (or neither) gets inconsistent behavior: practice lane errors loudly, FYD lane quietly writes/reads keys from a fixed home directory that can be stale or shared across deployments. The hardcoded `/home/nolan/...` path breaks on any host where the user differs (portability hole).
- **CODE LOCATION:** `src/lib/ping/dev-signer.ts:80-90`, `src/fyd/social/key-custody.ts:36-40`, `src/fyd/social/config.ts:22-24`.
- **EXPLOIT OR ACCIDENT CHAIN:** Accident: key material for the social write lane persists at a fixed path across redeploys/test runs; an operator wiping env config cannot reason about which custodian is live from config alone (no shared registry of which identity holds which key — authority-map). The loose regex is a latent traversal if a caller ever passes a user-controlled id.
- **SEVERITY:** MEDIUM
- **PROOF LEVEL:** STATIC (source lines quoted; traversal reachability NOT confirmed in live callers — callers mint `identity_<16hex>` server-side per `actions.ts:33-37, 85-86` and practice identity minting)
- **CLASSIFICATION:** env-confusion fail-open/fail-closed inconsistency; duplicate custody (Overlaps 2)
- **BROKEN BOUNDARY:** signing-custody sovereignty (two custodians, one contract)
- **AFFECTS AGENTS:** practice lane (`api/practice/*`), social write lane (`actions.ts`), any key-rotation/cleanup agent.

### E6 — `slot-registry` postMessage permissive in non-production (MEDIUM-LOW, inherits SECURITY-SWEEP F4)

- **DOMAIN:** cross-frame messaging trust
- **MECHANISM:** `isProductionMode()` = `NODE_ENV === 'production'`; when false, `isAllowedOrigin()` returns true for any origin and `getTargetOrigin()` returns `'*'`.
- **ENV DIFFERENCE:** Dev: any site can talk to the Workbench slot registry iframe channel. Prod: same-origin/allowlist enforced. The comment admits it "matches the existing NODE_ENV==='development' auth bypass". If `NODE_ENV` is misconfigured (e.g., a prod deployment where Next did not set it, or a staging var typo), the restrictive path silently never engages.
- **CODE LOCATION:** `src/lib/slot-registry.ts:29-53`.
- **EXPLOIT OR ACCIDENT CHAIN:** Attacker: cross-origin page posting crafted Workbench messages (slot selection/drag-drop state manipulation) against a production deployment whose `NODE_ENV` was not `production`. No evidence any current deployment is misconfigured.
- **SEVERITY:** MEDIUM-LOW (conditional)
- **PROOF LEVEL:** STATIC (source lines quoted)
- **CLASSIFICATION:** env-confusion trust decision on a single mutable env var
- **BROKEN BOUNDARY:** origin trust for capability-adjacent messaging
- **AFFECTS AGENTS:** Workbench/builder agents; negligible for outreach agents.

### E7 — `DEV_MODE_SKIP_KV` flips storage to static fallback (LOW-MEDIUM)

- **DOMAIN:** data-plane integrity
- **MECHANISM:** `assignment-store.ts:184`: `DEV_MODE_SKIP_KV=true` throws `KvUnavailableError`, which `brand.ts:130-132` and `brand.ts:262-264` treat as a "known safe fallback scenario" and silently serve static fallback content (`ALLOWING_STATIC_FALLBACK`).
- **ENV DIFFERENCE:** Dev (intended): lets developers work without KV credentials. Prod with the var leaked: KV writes/reads are skipped and static content is served with no visible error — assignment data silently stops being durable/isolated.
- **CODE LOCATION:** `src/lib/assignment-store.ts:182-187`; `src/lib/brand.ts:130-132, 262-264`. (`assignment-store.ts:1-8` documents it as dev-only; nothing *enforces* dev-only.)
- **EXPLOIT OR ACCIDENT CHAIN:** Accident: var copied into a prod env file -> assignments quietly stop persisting; per-environment KV isolation (`getEnvironment()`, lines 42-73) is bypassed by the skip.
- **SEVERITY:** LOW-MEDIUM
- **PROOF LEVEL:** STATIC (source lines quoted)
- **CLASSIFICATION:** env-confusion trust decision; fail-open fallback
- **BROKEN BOUNDARY:** storage durability / environment isolation
- **AFFECTS AGENTS:** gallery/assignment/brand content agents.

### E8 — FYD session cookie `Secure` defaults to dev posture when `NODE_ENV` empty (LOW)

- **DOMAIN:** session cookie hardening
- **MECHANISM:** `loadSessionConfig`: `nodeEnv = (env.NODE_ENV || "development").trim()`; `secure: nodeEnv === "production"` (`src/fyd/identity/session.ts:32-45`). Sessions are HMAC-signed (good) and length/expiry enforced (good), but the Secure flag — and the placeholder-rejection logic — hinge on `NODE_ENV`.
- **ENV DIFFERENCE:** Empty/unset `NODE_ENV` in a production runtime -> cookies issued without Secure -> session cookies transmittable over plaintext HTTP (MITM capture on the local network; note the Pig demo route is a Tailscale forward, but a prod deploy behind TLS-terminating infra that strips NODE_ENV is the scenario). Next sets `NODE_ENV=production` at build and `next start`, so this only bites custom runtimes.
- **CODE LOCATION:** `src/fyd/identity/session.ts:32-45`.
- **EXPLOIT OR ACCIDENT CHAIN:** Network-local attacker captures the HMAC-signed session cookie over HTTP and replays it as the Google-authenticated FYD identity for up to 30 days (`maxAgeSeconds: 30*24*60*60`). Signature prevents forgery but not replay.
- **SEVERITY:** LOW (conditional on non-Next runtime)
- **PROOF LEVEL:** STATIC (source lines quoted)
- **CLASSIFICATION:** env-confusion hardening default
- **BROKEN BOUNDARY:** transport-layer session protection
- **AFFECTS AGENTS:** the Google auth lane (`src/fyd/identity/*`) consumers.

### E9 — Checked-in demo fixtures shipped as production base truth (LOW, integrity labeling)

- **DOMAIN:** fixture/prod boundary
- **MECHANISM:** `fyd-tenant-graph.ts:55-56` imports `HAPPY_PLACE_GRAPH` / `COPPERSMITH_GRAPH` from `src/fyd/proceduralize/__fixtures__/`; the Ask FYD lane serves "the current graph for site X" as pinned-fixture + journal overlays, digest-pinned at `:98-101, 178-184`.
- **ENV DIFFERENCE:** There is no dev-vs-prod distinction: the same checked-in demo graphs are the base in every environment, including production builds. The fixtures ARE the live demo sites, so today this is the product, not a leak — but the *shape* is fragile: a directory named `__fixtures__` (universally read as test-only) is bundled into production and treated as authoritative base state.
- **CODE LOCATION:** `src/fyd/data/fyd-tenant-graph.ts:55-56, 98-101, 153-184`. Mitigation present: objects retain `procedural-fixture` provenance (`:28`), and the base digest pins the exact fixture served.
- **EXPLOIT OR ACCIDENT CHAIN:** Accident: an engineer edits a fixture to make a test pass and unknowingly changes the production Ask FYD base graph (digest pin catches it as a mismatch and fails closed, which is the honest outcome — the integrity concern is the fixture/prod conflation itself).
- **SEVERITY:** LOW
- **PROOF LEVEL:** STATIC (source lines quoted)
- **CLASSIFICATION:** fixture/production boundary confusion; mitigated by digest pin + honest provenance
- **BROKEN BOUNDARY:** test-vs-prod artifact separation
- **AFFECTS AGENTS:** Ask FYD agents, fixture-editing agents (any change to `__fixtures__` changes production behavior).

### Clean checks (recorded so they are not re-audited blindly)

- `NEXT_PUBLIC_*` surface: only three vars are read anywhere in src — `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE`, `NEXT_PUBLIC_WORKBENCH_ALLOWED_ORIGINS`, `NEXT_PUBLIC_WORKBENCH_TARGET_ORIGIN` (E2, E6). No other build-time public secrets.
- `next.config.ts` / `vercel.json`: no env secrets (vercel.json only sets `SHARP_IGNORE_GLOBAL_LIBVIPS: 1`).
- `.env.example`: no `DIAGNOSTIC_*`, no `DEMO_*` entries (only `PING_DEV_KEY_DIR=` at line 120, empty) — meaning the diagnostic endpoint and demo flag have no documented, unset-safe configuration contract.
- No live (non-test) route imports anything from `__tests__` (the stub journal stays test-scoped).
- Core `/home/nolan/ping`: no `NODE_ENV`-gated trust decisions in `gateway/api_controller.js`, `gateway/simple_server.js`, or `ping-runtime/` (consult-only; gateway dev/admin/debug routes: none found).
- `services/notification.ts:12`: mock logs recipient only in non-prod — trivial, no PII risk assessed.
- `src/lib/environment.ts` + `assignment-store.ts getEnvironment()`: environment classification errors are explicit throws (fail-closed), which is the correct posture and contrasts with the fail-open findings above.

---

## Proposed diffs (WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT)

**P1 — E1: require `DIAGNOSTIC_SECRET`, kill the fallback.**
- WHY: A publicly source-visible default token means the "auth" is no auth in every deployment that doesn't set the var, which is all of them.
- EVIDENCE: `route.ts:141` fallback; zero `DIAGNOSTIC_` entries in `.env.example`; SECURITY-SWEEP F6.
- MINIMUM CHANGE: `const secret = process.env.DIAGNOSTIC_SECRET; if (!secret) return 503 (DIAGNOSTIC_NOT_CONFIGURED);` then `timingSafeEqual` compare against `Bearer ${secret}`. Add `DIAGNOSTIC_SECRET=` to `.env.example` with a comment (no value). Remove the route when the incident window closes (F6's original intent).
- TEST: unset var -> 503, not 401; wrong token -> 401; correct token -> 200; confirm no timing oracle via fixed-length compare. `rg 'dev-diagnostic-secret'` across repo -> zero hits.
- RESULT (proposed, not applied — read-only scope): endpoint is unreachable without an explicit secret; misconfiguration fails closed.

**P2 — E2: prod-build assertion + Host-header hardening for demo-owner-mode.**
- WHY: The entire owner-mutation surface rests on one env var and one client-controlled header; a single misconfiguration promotes demo to prod auth.
- EVIDENCE: `gate.ts:29-36`, `:52-88`; three routes reading `host` header (`customize:54-55`, `overrides:117-119`, `verify:44-46`).
- MINIMUM CHANGE: (a) build/deploy assertion: fail the production build (or a startup health check) if `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` is set when `VERCEL_ENV=production` (or a new explicit `FYD_PRODUCTION_BUILD=1`); (b) derive the private-host check from connection/socket info or validate `x-forwarded-host` against the configured canonical host rather than the raw `Host` header.
- TEST: build with flag on + `VERCEL_ENV=production` -> build fails; request with spoofed `Host: localhost` from a non-loopback socket -> denied.
- RESULT (proposed): demo mode cannot be silently promoted to prod; Host spoofing no longer satisfies the network gate.

**P3 — E3: single sourced, fail-closed journal/social base URL.**
- WHY: Two duplicated phantom defaults disagree with the main gateway's fail-closed contract and invite localhost impostor confusion.
- EVIDENCE: `ping-object-reader.ts:263-266` and `social/config.ts:15-20` both default to `http://127.0.0.1:18199`.
- MINIMUM CHANGE: move the default into one module (e.g. `social/config.ts` owns it; reader imports it) and change unset behavior to throw a named `JournalNotConfiguredError` (mirroring `GatewayNotConfiguredError`) unless an explicit `ALLOW_LOCAL_JOURNAL_DEFAULT=1` is set for dev.
- TEST: unset env -> named 503-class error naming the missing var; dev with `ALLOW_LOCAL_JOURNAL_DEFAULT=1` -> localhost default works; divergence check: only one literal `18199` remains in src.
- RESULT (proposed): prod deployments fail honestly instead of addressing a phantom port; dev keeps its convenience explicitly.

**P4 — E5: unify custodian env contract.**
- WHY: Two signing custodians disagree on unset behavior (throw vs silent hardcoded home path) and on identity validation strictness.
- EVIDENCE: `dev-signer.ts:80-90`, `key-custody.ts:36-40`, `social/config.ts:22-24`.
- MINIMUM CHANGE: make `fydDevKeyDir()` throw a `FydKeyDirNotConfiguredError` when unset (matching `devKeyDir()`), and add an explicit documented dev-only default behind `FYD_DEV=1`; tighten the practice-lane regex to exclude `.` (no behavioral change for valid ids — `identity_<16hex>`, uuids don't need leading-dot segments).
- TEST: unset both -> both throw named errors; `FYD_DEV=1` -> dev path; identity id `..` -> rejected in both lanes.
- RESULT (proposed): one contract for key custody across lanes; no hardcoded home path in prod posture.

**P5 — E7: scope `DEV_MODE_SKIP_KV` to dev.**
- WHY: A documented-dev flag that silently swaps the storage plane to static fallback must not be honored in production.
- EVIDENCE: `assignment-store.ts:182-187`, `brand.ts:130-132, 262-264`.
- MINIMUM CHANGE: honor the flag only when `NODE_ENV !== 'production'`; in production with it set, throw at startup rather than fall back silently.
- TEST: `NODE_ENV=production DEV_MODE_SKIP_KV=true` -> startup throw; dev -> skip works as before.
- RESULT (proposed): no silent static-fallback downgrade in prod.

**P6 — E4: boot-time gateway readiness assertion.**
- WHY: A rendering site with a dark constitutional surface is a deception; the failure is currently per-request and unlabeled at deploy time.
- EVIDENCE: `ping-object-reader.ts:74-83, 240-243`; REACHABILITY.md §4 live topology.
- MINIMUM CHANGE: startup (or `/health`) check that `PING_GATEWAY_BASE_URL` is set and the gateway responds; log/serve an explicit `GATEWAY_DARK` status instead of rendering as healthy.
- TEST: unset var -> boot fails or health reports degraded; set var, gateway down -> degraded; set var, gateway up -> healthy.
- RESULT (proposed): operators (and the user's phone surface) see the true state.

---

## Severity ranking

1. **E1** — HIGH: live endpoint, token in source, unset everywhere.
2. **E2** — HIGH (conditional): one env var + spoofable header = full owner-mutation surface.
3. **E3** — MEDIUM: silent phantom-localhost addressing, duplicated default, integrity escalation path.
4. **E4** — MEDIUM: silent dark surface, failure-honesty.
5. **E5** — MEDIUM: divergent key-custody contracts, silent home-path default.
6. **E6** — MEDIUM-LOW: conditional postMessage hole.
7. **E7** — LOW-MEDIUM: silent static-fallback downgrade.
8. **E8** — LOW: conditional cookie Secure downgrade.
9. **E9** — LOW: fixture/prod conflation, mitigated by digest pin.

## Next adjacent gap I see (for the coordinator)

The natural SEC-adjacent block is **identity-namespace confusion**: authority-map Overlap 1 — three parallel identity schemes (OIDC uuidv5 in `principal.ts:57`, gateway-minted `identity_<16hex>` in `social/actions.ts:62`, demo-owner-only in `claim/identity.ts:16`) with no bridge, and the claim lane *deliberately not consuming* the real auth lane. The env-confusion work ends at "the gate is honest about being a demo"; the identity work asks "when a real user authenticates via Google (lane A) and acts via the social lane (B) or claims via lane C, which principal authorized what?" That is where an authorization hole is most likely to be *created* during convergence (any unification that treats one namespace as canonical silently orphans or merges the others). Recommend a dedicated worker: map every route handler to its identity source, then propose the single `resolvePrincipal()` contract with explicit bridge semantics.


---

# SEC3 (continued) — Environment-confusion ATTACKS: synthetic→production, test→live, stale worker→current state, approval→different digest

**Worker:** SEC3 (security, read-only) · **Date:** 2026-09-23 ~20:05–20:45 MDT
**Mode:** READ-ONLY; COMMITS CREATED: NONE. Static proof only; nothing executed against live services. No secret values printed.
**Bases:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (worktree clean);
(b) CORE `/home/nolan/ping` @ `refactor/runtime-authority-convergence` (live; no writes, no process touches, secrets metadata-only).
**Transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'` (stdin-fed), `docker inspect` (read-only) for one container env check.
**Read first:** `SECURITY-SWEEP.md`, `AUTHORITY-MAP.md`, `EVENT-FORENSICS.md`, `REACHABILITY.md` (citations below reuse their file:line groundings).

Scope: four environment-confusion classes, proven or refuted STATICALLY. For each: exact code path + file:line, verdict VULNERABLE / BLOCKED / UNVERIFIABLE, and the fail-closed requirement where consequence demands it.

## Attack matrix

| # | Attack | Verdict | One-line proof |
|---|--------|---------|----------------|
| 1 | synthetic→production: demo/dev envelopes enter the sovereign journal | **VULNERABLE** | BFF ingest path writes dev-identity events to `ping_events` under production namespace `core::system` with only client-supplied markers distinguishing them |
| 2 | test→live: test fixtures/probes write to live stores | **BLOCKED** for the live journal; **VULNERABLE** at the DB-instance level (one probe script) | `test_event_ingestion.py` INSERTs synthetic events into live `brain-postgres` (dormant-stack table); all runnable suites are tmpdir/mock-scoped |
| 3 | stale worker→current state: outdated logic processes current items | **VULNERABLE** (2 live instances) + 1 contained + 1 dormant | (a) full `EventValidator.validate()` has zero live callers — stale workers' old-schema events pass `emit`; (b) served site :3100 runs adapter HEAD 2 commits behind with strictly weaker auth on mutation routes |
| 4 | approval→different digest: approval for X authorizes execution of Y | **BLOCKED** (all 3 live approval paths re-verify) | customize approve, overrides approve, and `submitProposal` all re-derive and digest-compare before journaling; BFF signature binds exact payload |

## A1. synthetic→production — VULNERABLE

Exact code path:
1. **Mint (adapter).** `createFydIdentity` — `src/fyd/social/actions.ts:53-100` (adapter @ a69bb68f): generates an Ed25519 dev keypair server-side, mints a DEV identity via `POST <gateway>/identities` with `{displayName, handle, bio, publicKey, algorithm}`, escrows the keypair, then publishes a `ping.social.profile@1` `OBJECT_CREATED` signed envelope.
2. **Gateway mint.** `router.post('/')` — `/home/nolan/ping/gateway/routes/identities.js:97-175`: no auth middleware in this copy. Mints `identity_<16hex>` via `IdentityAuthority.generateId`, journals `OBJECT_CREATED` (`ping.identity@1`) into `ping_events`. Metadata marks `source: 'ping-gateway-identities'` regardless of dev vs real — no dev/prod labeling at mint.
3. **Envelope (adapter).** `buildSignedEnvelope` — `src/fyd/social/envelope.ts:52-72`: metadata = `{source: "fyd-social", generator: "fyd-social@1", producedAt, ...extra}` — all client-supplied. `submitEnvelope` (envelope.ts:68-90) POSTs to `<gateway>/events` (default `http://127.0.0.1:18199`, `src/fyd/social/config.ts:15-20`).
4. **Gateway ingest.** `router.post('/')` — `/home/nolan/ping/gateway/routes/events.js` (~70-110): BFF-shaped bodies (`type`+`payload`, no `event_type`) route through `social_ingest_adapter.normalizeBffEnvelope` → `eventRuntime.emit(norm.eventType, 'api', norm.eventData, {metadata: {aggregate_id, aggregate_type}})`.
5. **Normalization.** `normalizeBffEnvelope` — `/home/nolan/ping/gateway/social_ingest_adapter.js:336-386`: verifies Ed25519 proof, enforces vocabulary/schemas, never checks for or requires a synthetic/demo flag. Client metadata merged verbatim; server adds `_ingest: {adapter: 'bff-envelope@1', received_at}` (spread order defeats client forgery of that key — a reliable marker, but nothing segregates on it).
6. **Spine.** `emit` — `/home/nolan/ping/ping-runtime/events/unified_event_runtime.js:73-120`: `const namespace = options.namespace || 'core::system'` (~line 104); BFF path passes no namespace, so demo events land in `ping_events` under the production namespace. `INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING` (lines 147-153).
7. **Reads.** Same rows returned as first-class state by `GET /events/:stream` (events.js `SELECT * FROM ping_events WHERE event_type = $1`), `GatewayPingObjectReader` (`src/lib/ping/ping-object-reader.ts:279,322,370`), `src/fyd/social/readers.ts`. No reader filters on `_ingest.adapter` or `source: "fyd-social"`.

Why VULNERABLE: demo/dev identities write objects, posts, follows, likes that are indistinguishable in storage, namespace, and event type from production events; the only distinguishing fields are client-supplied (`payload.metadata.source = "fyd-social"`) plus one server-applied-but-unenforced marker. The practice lane is identical: unsigned `ping_practice_identity` cookie (`src/lib/ping/session.ts:23-33`) → `signAsIdentity` (`src/lib/ping/dev-signer.ts:132`) → same BFF ingest → same journal. Correctly NOT a vector: `syntheticFacebookObservation` (`src/fyd/refresh/facebook-source.ts:48`) — refresh lane has no live callers (DORMANT) → BLOCKED.

Fail-closed requirement: (1) BFF/dev envelopes must not be emittable into `core::system` — reject at `normalizeBffEnvelope` unless explicitly a demo deployment, or force a server-assigned demo namespace readers exclude by default; (2) require a server-side synthetic flag (not client metadata) on the emit path for BFF envelopes; (3) `POST /identities` must label dev-minted identities (`identity_class: 'dev'`) so they can never resolve as controllers of production objects.

## A2. test→live — BLOCKED for the live journal; VULNERABLE at the DB-instance level

| # | Candidate | Evidence | Verdict |
|---|-----------|----------|---------|
| 2a | Probe script writes synthetic events to a live DB | `/home/nolan/ping/test_event_ingestion.py:34-46`: builds `INSERT INTO events (...)` and runs `docker exec brain-postgres psql -U postgres -d crx_runtime -f /tmp/insert_events.sql` (line 46) | **VULNERABLE (DB-instance level).** Demonstrably writes synthetic rows to a running Postgres (`brain-postgres:5432`). Target table (`events` in `crx_runtime`) belongs to the dormant Python stack, NOT the live `ping_events` journal — sovereign journal untouched. But nothing scopes the script to a test instance; pointed at `ping-postgres:5433`/`ping_events` it would write synthetic data into the live journal. Whether `crx_runtime.events` exists on brain-postgres is UNVERIFIABLE statically (needs a live query; out of scope). |
| 2b | Adapter test suites | 24 files tmpdir-scoped (e.g. `graph-read-route.test.ts:235` sets `FYD_OWNER_DIR` to tmpdir; `anonymous-preview.test.ts:71-74` sets `FYD_CLAIM_DIR` to tmpdir); network tests use mocked fetch (`callback-flow.test.ts:38,162`); `site-bundle.ts:14` explicitly avoids `FYD_PROJECTION_DIR` writes; sweep: zero test files POST to gateway URLs or write outside tmpdir | **BLOCKED** |
| 2c | Core pytest suites | `tests/test_runtime_authority_boundaries.py:102-153`: `KnowledgeEventBus(root=Path(tmpdir))`, workspaces/mission profiles in tmpdir; execution claims via recording stubs | **BLOCKED** |
| 2d | `_test_*.py` probes | `_test_lineage2.py:20`, `_test_lineage3.py:14,29,38,47`: SELECT-only against `crx_runtime`; no INSERT/UPDATE/commit anywhere in `_test_*.py` | **BLOCKED** |
| 2e | Certification / pipeline tests | `replay_determinism.test.js` exercises pure `deterministic_id_authority` (no I/O); `test/*.test.js` dead at require time | **BLOCKED** |

Fail-closed requirement: `test_event_ingestion.py` and kin must refuse production DSNs without an explicit `--live` opt-in, plus a target-table allowlist. Current script is one hostname away from writing synthetic events into `ping_events`.

## A3. stale worker→current state — VULNERABLE (two live instances)

**A3a. Schema/version validation exists but is unwired — VULNERABLE.** `EventValidator.validate(event)` — `/home/nolan/ping/ping-runtime/events/event_validator.js:59-98` — enforces schema_version major match, payload_schema compatibility, authority_owner against `gateway/generated/event_registry.json`. **Zero live callers** (no `.validate(` hits in `unified_event_runtime.js`, `routes/events.js`, `canonicalization_service.js`). `emit` calls only `isRegistered(eventType)` — `/home/nolan/ping/ping-runtime/events/unified_event_runtime.js:82-87` — a bare map lookup (`event_validator.js:123-125`); `validateEventType` does not exist, so the first branch is dead. A stale worker emitting old-schema events with a registered type is accepted into `ping_events`. Fail-closed: wire full `validate()` into `emit` (or `canonicalizeAndEmit`); reject on schema_version major mismatch; attest the registry hash at startup.

**A3b. Served site runs stale adapter code with strictly weaker auth — VULNERABLE (proven live instance).** Served `:3100` runs `/home/nolan/projects/ping` @ `e48ef710` + 4 dirty files; sprint HEAD `a69bb68f` is 2 commits ahead. The delta touches exactly the mutation-surface gates: `src/app/api/fyd/claims/[resourceId]/verify/route.ts` adds `demoDenied()` 403 (lines 28-58); the **old deployed route has zero identity/demo/403 references** (verified via `git show e48ef710:...`) — anyone can POST operator-attestation verification and flip any already-CLAIMED resource to `VERIFIED-CONTROLLED` (`verifyControl`, `src/fyd/claim/machine.ts:113`, only requires CLAIMED state; the claim step itself was gated via `resolveClaimIdentity` at old HEAD, but the verification *write* was not). `src/app/api/fyd/objects/[objectId]/overrides/route.ts` adds route-level `demoDenied` before I/O; old code relied only on the in-route seam. Digest/grant/signing files are byte-identical between HEADs — the approval→digest chain is unaffected by the staleness. Fail-closed: pin the audited artifact on mutation routes; routes should self-assert their required gate version at startup.

**A3c. Unauthenticated worker queue protocol — VULNERABLE endpoint, BLOCKED impact.** `POST /events/processed`, `/failed`, `GET /events/unprocessed` — `gateway/routes/events.js:128-156` — no auth (`route_middleware.js` is logging-only; `gateway_runtime.js:116-124` mounts only json + wildcard CORS). Worker identity self-reported, written to `event_processing` (`runtime/kernel/event_read_authority.js:303-318`, `ON CONFLICT DO UPDATE`). Impact contained: the only consumer, `WorkerRuntime._poll()` (`ping-runtime/workers/worker_runtime.js:147-161`), is never called (dispatch-only mode, line 51); `mission_event_bus.js` uses its own table. `dispatch` (lines 73-103) matches by `eventTypes` only — no version/agent pinning. Fail-closed: authenticate the worker protocol (capability-bound worker identity, not a self-reported string) before any consumer is wired; version-attest worker registrations.

**A3d. Stale EventBridge re-emission — BLOCKED (idempotent).** 5s poll, per-source cursor, dedupe via `event_id` (`event_bridge.js:1-50`); `emit` does `INSERT ... ON CONFLICT DO NOTHING` and suppresses handlers on duplicate delivery (unified_event_runtime.js:158-164). Residual UNVERIFIABLE: a stale bridge with divergent normalization could hash the same logical event to a different event_id (`emit` identity uses key-order-sensitive `JSON.stringify`, lines 79-80) and double-apply — not provable statically. Checked and contained: `ping-rc-gateway` (`:18099`, unhealthy) is partitioned — `docker inspect` shows `POSTGRES_DB=rc_staging` on `ping-rc-postgres`; its divergent `events.js` cannot touch the production journal.

## A4. approval→different digest — BLOCKED (all three live approval paths)

| Path | Binding mechanism | File:line |
|------|-------------------|-----------|
| Practice BFF `submitProposal` | Re-verifies `verifyProposalDigest(proposal)` at approval; checks `envelope.payload_hash === proposal.digest`; journals `proposal_digest` + `site_spec_digest` into the `OBJECT_UPDATED` | `src/lib/ping/ping-object-reader.ts:1297-1353` (1299, 1337-1347) |
| FYD customize approve | `handleApprove` re-derives the proposal from text against the CURRENT spec; 409 `stale_digest` on digest mismatch (275-285); 409 `proposal_altered` on full-body `JSON.stringify` inequality | `src/app/api/fyd/customize/route.ts:233-300` |
| Owner overrides approve | Propose→approve: approve re-reads current owner state, recomputes `baseStateDigest` (409 `stale_proposal`); re-canonicalizes command through the same parser, checks `patchDigest` (400); approval journaled with base+patch+result digests | `src/app/api/fyd/objects/[objectId]/overrides/route.ts:4-20, 239+` |
| Gateway BFF signature | `verifyBffProof` verifies Ed25519 over `bffCanonicalize({type, payload, metadata})` — signature binds the exact payload bytes | `/home/nolan/ping/gateway/social_ingest_adapter.js:116-143` |

No path found where an approval token/digest replays against a different body. Owner-event content-hash IDs (`src/fyd/object/owner-events.ts`, `fyd-owner@1` generator binding) additionally make tampered owner events self-identifying.

## Fail-closed requirements (consolidated)

1. Namespace segregation for BFF/dev envelopes (A1) + server-side synthetic flag + dev labeling at `POST /identities`.
2. Probe/seed guardrails (A2): fail closed on production DSNs; target-table allowlist; `--live` opt-in.
3. Wire the validator (A3a): full `EventValidator.validate()` on the live `emit` path.
4. Pinned deployments (A3b): serve the audited artifact; mutation routes self-assert gate version at startup.
5. Authenticate the worker protocol (A3c) before any queue consumer is wired; version-attest worker registrations.

## Caveats

- All static; no live requests issued. `docker inspect` read-only.
- The EVENT-FORENSICS open question stands: which `POST /events` bytes run in the Oracle `ping-gateway` container (patched `authorizeNamespace` per the 2026-09-16/17 capture vs the two Pig-side copies, unauthenticated here). If the deployed container enforces auth, A1's mint vector and A3c's queue vector narrow; the spine-level findings (namespace default, unwired validator, client-supplied markers) are unaffected.
- `crx_runtime.events` existence on brain-postgres: UNVERIFIED (needs a live read).

## Next adjacent gap

**The identity-namespace bridge for demo traffic.** Three identity schemes coexist with no bridge table (AUTHORITY-MAP Overlap 1: uuidv5 OIDC vs `identity_<16hex>` vs demo-owner), and this pass proved demo `identity_<16hex>` principals write first-class events into `ping_events` under `core::system` with only a client-supplied `source: "fyd-social"` marker. Unanswered: when a demo identity's key material leaks or a demo handle collides with a real business name, is there any server-side mechanism — registry, revocation, namespace quarantine — to distinguish, contain, or retract demo-authored journal state? None was found in ingest, validator, governance, or reader paths. Natural next probe: define the demo→production trust boundary as an explicit server-enforced namespace + identity-class regime, or accept that the journal is a mixed-trust store and say so in the threat model.
