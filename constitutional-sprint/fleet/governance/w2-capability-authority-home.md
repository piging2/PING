# W2 — CapabilityAuthority canonical home (CP-7) — forensic diff + recommendation

Worker W2, 2026-09-24. Propose-only. No commits, no staging, no live-runtime mutations.
Read-only probes: `docker exec`/`docker cp` (container reads only), `docker inspect`,
`curl` status-code checks against :8080, greps of /home/nolan/ping. No secrets exfiltrated.

Consumed IDs (dedupe): F199 (live-but-untracked divergence), F244 (CP-7 next gap), CP-7
(Agent 20 GLOBAL-AUTHORITY-MAP §8.2), W20-F3, F101 (dormant kernel CapabilityAuthority),
F64 (ghost-table claim on exterior_agent_credentials), F201/F86 (dormant authorities),
STANDING-INVARIANTS.md #3/#6/#8/#10.

---

## F260 — [FORENSIC] Byte-exact manifest: prod-image-only CapabilityAuthority + route-auth artifacts

Image `ping-gateway:devin-boundary2` (sha256 `5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20`,
created 2026-09-16T12:54:22Z; container `ping-gateway` up 42h at probe time) bundles these
files, extracted read-only via `docker exec ping-gateway sha256sum/wc`:

| File in image | Size (bytes) | Lines | sha256 |
|---|---|---|---|
| `gateway/capability_authority.js` | 29886 | 889 | `ff0eaeb836ec221923a98c75f40eb4c60a0644e73b559f48f1ae87bff540bfd9` |
| `gateway/exterior_auth_middleware.js` | 7402 | 251 | `26e6761de0e21ef82f71c28119d586cbe07139c725b2ccb35997d9e7629be34e` |
| `gateway/workspace_registry.js` | 7414 | 226 | `18ce3a0d23b826164ebfc8afcea2dd8073b5ef3396d32bce3b07d7b27b97f458` |
| `gateway/routes/capabilities.js` | 15706 | 482 | `6501b51dd8dbcfef66d206f2c9bd20743b060a5e68e7a7782e08e5c9fc0d8b41` |

File mtimes inside the image: exterior_auth_middleware Sep 12 02:34-03:09; capabilities.js
Sep 12 13:58; workspace_registry Sep 12 14:27; capability_authority Sep 12 18:52. All four
confirmed ABSENT from /home/nolan/ping @ cc6856c3b (branch refactor/runtime-authority-convergence):
`ls` returns "No such file or directory" for each. Full `/app/gateway` vs source-tree diff found
TWO more image-only files beyond F199 (see F261).

## F261 — [FORENSIC] Two more image-only artifacts not named in F199: a history layer

Full `comm` diff of `/app/gateway` (image, 446 entries) vs `/home/nolan/ping/gateway`
(source, 447 entries) shows image-only:

| File | Size | sha256 |
|---|---|---|
| `gateway/capability_authority.js.before-phase2` | 28530 | `a428949d18038f1510653d755cbb08e221dd9bdeac8a233f0ca601f1a2e5928a` |
| `gateway/test_mvp_auth.js` | 4322 | `8d5b1eb5e898646d28035ce324029c079fb593f3e11ead88cb1b50f842a913d5` |

The `.before-phase2` file is a pre-refactor copy of the authority (28,530 bytes vs 29,886 live)
— a history layer baked into the image. `test_mvp_auth.js` is an auth test harness. Both are
CLASSIFY-don't-delete material per invariant #6; neither is required for the deploy guard.
Inverse diff: source-tree-only in `gateway/routes/` is `routes/identities.js` (see F262).

## F262 — [FORENSIC] Composition-root drift quantified: 892-line source vs 1012-line image, 342 diff lines

`docker cp ping-gateway:/app/gateway/bootstrap/gateway_runtime.js` vs
`/home/nolan/ping/gateway/bootstrap/gateway_runtime.js`: 892 vs 1012 lines, 342 unified-diff lines.
Substantive image-only additions (BOM/comment mojibake excluded):

- requires: `ExteriorAuthMiddleware` (img line 51), `WorkspaceRegistry` (52), `CapabilityAuthority` + `createCapabilityRoutes` (106-107)
- service locals: capabilityAuthority, exteriorAuthMiddleware, workspaceRegistry (137-138) plus prerequisite locals filesystemAuthority/commitAuthority/patchAuthority/repositoryAuthority/simpleGitAdapter (139-144)
- instantiation block (416-432): `new CapabilityAuthority(this._pool, runtimeRegistry, '/app/workspace')` + `initialize()`; `new ExteriorAuthMiddleware(this._pool)` + `initialize()`; `_initializeTenantRegistry()` (CREATE TABLE IF NOT EXISTS tenants + idempotent seed of `hpp`/`happy-place-platform`); `new WorkspaceRegistry(this._pool, '/app/workspace')` + `setWorkspaceRegistry` wiring; then FilesystemAuthority, CommitAuthority, PatchAuthority, RepositoryAuthority, SimpleGitAdapter instantiated as capability-routing prerequisites
- services map: all added (746-749)
- route mounts wrapped in `services.exteriorAuthMiddleware.middleware()`: `/events` (790), `/canonical-events` (794), `/ingest` (798), `/orchestration` (900), `/missions` (915), `/ai` (918), `/connectors` (920); `/capabilities` mounted 926-929 gated on `services.capabilityAuthority`
- CORS: wildcard `*` removed for server-to-server (img 120-121: `req.headers.origin || '*'`, `Authorization` added to allow-headers)
- REMOVED in image: `require('../routes/identities')` and the `/identities` mount (source line 20, 682-683) — the image drops the identity route the source tree serves

Three-way drift (re-verified tonight): source tree @ cc6856c3b has NONE of the four files; rc image `ping-gateway:rc-4d522a6b` carries an OLDER exterior_auth_middleware (sha256 `3d5b736d832b322709c57871fbb581b9c280902ad22481ebcd66abfe89f978b1`, required at rc gateway_runtime.js:4, instantiated line 32, used via a `requireAuth` wrapper for `/events`, `/canonical-events`, `/ingest` plus `/context`, `/api/v1/repository`, `/system`, `/tenants`, `/deployments`, `/runtime`) but LACKS capability_authority.js, workspace_registry.js, routes/capabilities.js. So the drift is three generations: source(none) / rc(old middleware, partial) / prod(new middleware + full authority).

## F263 — [BLAST RADIUS] Auth loss table: a source-tree deploy reopens 7 routes tonight

Verified live tonight: `curl http://127.0.0.1:8080/events` → `HTTP_CODE=401` (no credential).
The image's middleware (`exterior_auth_middleware.js:222-240`) denies missing/invalid API keys
401 fail-closed; unknown agents DENIED; identity comes from `exterior_agent_credentials`
(Postgres, created+indexed at gateway init), never from the request body.

A deploy built from the source tree (which mounts these bare) loses all of this:

| Route | Prod tonight | After source-tree deploy |
|---|---|---|
| `/events` | 401 fail-closed middleware | unauthenticated (F200/F52: unsigned append straight to `ping_events`) |
| `/canonical-events` | 401 fail-closed middleware | unauthenticated |
| `/ingest` | 401 fail-closed middleware | unauthenticated |
| `/orchestration` | 401 fail-closed middleware | unauthenticated |
| `/missions` | 401 fail-closed middleware | unauthenticated (W20-F2 echo loop ignitable by single unauth POST) |
| `/ai` | 401 fail-closed middleware | unauthenticated |
| `/connectors` | 401 fail-closed middleware | unauthenticated |
| `/capabilities` | mounted, auth-wrapped POST / + GET /discover; open GET /stats + /health | route does not exist (module absent) |
| `/identities` | not mounted | mounted (source-only file reappears) |

Note: the `tenants` table CREATE + `hpp` seed and the `exterior_agent_credentials` table CREATE live in
the image's startup code; rows in Postgres persist across deploys, but with no middleware code they
become an unused table with live API keys in it.

## F264 — [BLAST RADIUS] Execution-authority loss: the only authorize-first executor disappears

What drops with `capability_authority.js` + `routes/capabilities.js`:

- The `/capabilities` executor surface: POST `/capabilities` (auth-wrapped), GET `/capabilities/discover` (auth-wrapped), GET `/capabilities/stats`, GET `/capabilities/health` (both open)
- `authorize()` fail-closed: unknown agentId DENIED; allow-list agent profiles `muse` (level 1) and `muse-level-2`; workspace-registry binding (repoId + workspace_path from registry, never user-supplied); canonical-repo write denial (img capability_authority.js:230-300)
- Execution: `execute()` authorizes FIRST then routes by capability prefix to pre-existing authorities only (header non-duplication constraint, lines 10-14; 438-488); command/test/build execution throws; per-request receipts written to Postgres `capability_requests` (784-817); request IDs content-hash-derived via CanonicalAuthority (820-828)
- Filesystem sandboxing: realpath containment into the agent workspace root; denied secret paths (58-136, 526-615)
- The prerequisite-authority instantiations in the composition root (Filesystem/Commit/Patch/Repository/SimpleGit) — with F201/F86 marking ExecutionAuthority/ApprovalAuthority/PatchAuthority dormant-but-dangerous, losing the one authority that ROUTES to them also loses the only live supervised execution path

## F265 — [CORRECTION] F64's "exterior_agent_credentials has no code path (stale)" is REFUTED

F64 recorded `exterior_agent_credentials` (2 rows) as having "no code path (stale)". The code path
exists — it is the prod image's `exterior_auth_middleware.js`, read in full tonight:
`_createTables()` creates and indexes the table at gateway init; `authenticate()` looks up every
request's API key against it (is_active + expires_at checked), updates `last_used_at`; defaults
seed `muse` / `muse-level-2` from `MUSE_LEVEL_1_KEY`/`MUSE_LEVEL_2_KEY` env or random generation.
F64's "zero source references" was itself a symptom of the F199 drift (source-tree-only grep).
Re-anchor: the table is the LIVE exterior credential store; treat it as secret-bearing.
Do not delete; its custody moves with the canonical-home ruling.

## F266 — [GOVERNANCE] Name collision: TWO "CapabilityAuthority" modules for one decision

The source tree contains a DORMANT `runtime/kernel/capabilities/capability-authority.ts`
(F101: no live composition-root import; registry.yaml marks it missing). The prod image
contains the LIVE `gateway/capability_authority.js` (different module, different language
surface, different behavior). Two different modules answer to the same authority name for
the same decision ("who may execute capabilities"). Standing invariant #8: "One authority per
decision; many adapters/executors/projections. Never create EventAuthorityV2 or a second
canonical anything." The live image module is the only candidate that is actually an
authority; the dormant kernel module must be classified/archived (per invariant #6, not
deleted) once the ruling lands — never silently left as a same-named second authority.

## F267 — [MECHANISM] The drop vector is the build itself: `COPY . .` from the source tree

`gateway/Dockerfile`: `FROM node:24-alpine`, `WORKDIR /app`, `COPY . .`. The image IS the
source tree at build time. Prod image built 2026-09-16T12:54:22Z from files dated Sep 12
(none of them ever committed — see F268). The rc line (built ~3d ago) already proves the
mechanism: it lacks 3 of the 4 files (F262). Any `docker build` + redeploy from the current
source tree reproduces the drop mechanically, with no error, no warning, and no test failing
(F14: the suite cannot catch this — it references nonexistent scripts). No automatic deploy
trigger was observed in this probe's scope; the vector is a manual/ad-hoc redeploy from source.

## F268 — [GOVERNANCE] The four live files were NEVER in repo git history: provenance gap

`git log --oneline -- gateway/exterior_auth_middleware.js` and `-- gateway/capability_authority.js`
both return EMPTY in /home/nolan/ping. These files never existed in any commit of this repo's
history. They arrived in production via an image built 2026-09-16 (image tag `devin-boundary2`
suggests a Devin session workspace) and were never committed back. The mechanism is real and
load-bearing (F264: 401 live on :8080/events tonight), but its provenance is an opaque image
layer. Any canonical-home ingest must treat the image bytes as UNVERIFIED upstream input:
review-then-ingest, not blind vendoring.

## F269 — [MECHANISM] Deploy-freeze guard PROPOSED (propose-only); CP-7 stays escalation-class

Freeze mechanism designed as an unapplied proposal at
`patches/governance/w2-deploy-freeze-guard-proposal.md` (WHY → EVIDENCE → MINIMUM CHANGE →
TEST → RESULT): a standalone `deploy-guard.sh` + canonical manifest asserting (1) all four
live files exist in the source tree, (2) the composition root wires them (requires +
instantiation + middleware mounts), (3) a candidate build's image bytes match the source
bytes, failing the deploy closed otherwise. No freeze is installed tonight; the proposal is
unapplied. CP-7 remains ESCALATION-CLASS per invariant #10 (canonical corruption, P0).

---

## Recommendation: canonical home for CapabilityAuthority (for Nolan's ruling)

Grounding law: invariant #8 (one authority per decision), "refactor authority, preserve
mechanism" (keep the authorize-first routing, the fail-closed middleware, the receipts —
the mechanism works), invariant #6 (classify history, never delete), invariant #3
(WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT on every step).

**RECOMMENDED: the source tree is the canonical home (option A).**

1. FREEZE source-tree prod deploys now (the proposed guard, F269).
2. Quarantine-review the six image files (F260+F261) in a staging area: read, attribute,
   strip nothing, record provenance as "unverified image bytes, 2026-09-16".
3. Rule the name collision (F266): the live `gateway/capability_authority.js` becomes THE
   CapabilityAuthority; the dormant kernel TS module is classified/archived, not deleted.
4. Ingest the reviewed files into the source tree; reconcile the composition-root diff
   (F262) as a reviewed patch; rebuild the image FROM the source tree; re-verify the
   401 live before any traffic moves.
5. The deploy guard becomes a standing pre-deploy gate.

Why not the alternatives:
- **Option B (image stays canonical, bytes vendored into source):** fastest, but keeps two
  truths and the provenance gap; every future drift re-creates CP-7.
- **Option C (retire the boundary; drop auth + /capabilities):** smallest code change, but
  reopens 7 live routes to unauthenticated mutation (F263) — including the `/missions`
  echo-loop vector (W20-F2). Only viable if those routes are closed by other means first.
- **Option D (indefinite freeze, no ruling):** safest tonight, but blocks every downstream
  convergence deploy (W20-F3) and leaves auth living in an opaque image.

**CP-7 question for the grilling brief** (single canonical surface: ~/workspace/GRILLING-BRIEF.md):

> **QUESTION:** Where does CapabilityAuthority live, and under what condition may source-tree
> prod deploys resume?
>
> **WHY IT MATTERS:** prod :8080 is auth-wrapped tonight (401 verified live on `/events`).
> Any source-tree rebuild silently reopens `/events`, `/canonical-events`, `/ingest`,
> `/orchestration`, `/missions`, `/ai`, `/connectors` to unauthenticated mutation and
> deletes the `/capabilities` executor endpoint. This is canonical corruption by deploy,
> and the mechanism (`COPY . .`) makes it silent.
>
> **WHAT EVIDENCE SAYS:** the live 889-line authority + 251-line middleware + 226-line
> workspace registry + 482-line capability routes exist only in image `devin-boundary2`
> (built 2026-09-16, never committed — git log empty); the mechanism is real (fail-closed
> authorize, realpath containment, per-request receipts in `capability_requests`); the rc
> line already proves the build drops 3 of 4 files.
>
> **CONTRADICTION / TRADEOFF:** one authority per decision (#8) vs two same-named modules
> (F266); preserve the working mechanism vs rebuild from scratch with clean provenance
> (expensive, high regression risk); freeze safety vs blocked deploys.
>
> **OPTIONS:** (A) source tree becomes canonical home — ingest reviewed image bytes,
> reconcile the kernel name collision, rebuild from source [recommended]; (B) image stays
> canonical, vendored bytes (fast, keeps two truths); (C) retire the exterior-agent
> boundary (accepts open routes); (D) indefinite freeze (safe, blocks everything).
>
> **DEFAULT IF NOLAN DOES NOTHING:** freeze holds; CP-7 stays open; any ad-hoc
> source-tree deploy drops live auth; all convergence deploys blocked.
>
> **RECOMMENDED NEXT EXPERIMENT:** run the proposed deploy-guard in report-only mode
> against prod image + source tree (no live change) to baseline the drift, and
> quarantine-review the six image files — so the ruling lands on reviewed bytes, not
> opaque ones.

---

Probe notes: all image reads via `docker exec ping-gateway` / `docker cp` (read-only);
`docker inspect ping-gateway:devin-boundary2`; `curl -s -o /dev/null -w %{http_code}`
against 127.0.0.1:8080. No container writes, no process touches, no secrets extracted.
Scratch copies of image files landed in /tmp only (disposable). COMMITS CREATED: NONE.
