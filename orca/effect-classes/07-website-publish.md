# Effect Class 07: Website Publish

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `~/workspace/fyd/VERCEL-RECON-2026-09-23.md`,
`DEPLOYMENT-PROVENANCE-2026-09-23.md`, `DEPLOYMENT-EXECUTION-2026-09-23.md`,
`FYD-PRODUCT-GATE-COMMIT-VERCEL-DIRECTIVE-2026-09-23.md`,
`FYD-MAIN-PROMOTION-DIRECTIVE-2026-09-23.md`, `~/workspace/skills/vercel`,
gateway `/home/nolan/ping/gateway/routes/{tenants,deployments}.js` (Pig),
live fetch of `https://happy-place-platform.vercel.app/`.

## Current state (important for priority)

- The only public production URL that exists is
  `https://happy-place-platform.vercel.app/` (fetched live, HTTP 200, renders
  Happy Place Carpentry content). Per DEPLOYMENT-PROVENANCE the Happy Place
  app is FROZEN (source archaeology only).
- The new FYD builder app (`piging2/fyd`, main = `a69bb68f`) has NO Vercel
  project yet; project creation is BLOCKED on the read-scoped token (403) and
  on a one-time operator import. **Nothing FYD publishes to public URLs
  today.**
- The multi-tenant renderer (TenantResolver / SiteSpec version publish) is a
  locked design decision only: `grep -rli tenantResolver
  /home/nolan/projects/ping/src` = zero hits.
- The gateway's `tenants.js`/`deployments.js` are a PING-internal deployment
  REGISTRY AUTHORITY (register/resolve/transition/rollback records), not
  publishing machinery — they track deployments, they don't create them.
  Actual publish = Vercel git-native deploys.

- **Q1 Identity:** the logical operation is a *deploy of a git SHA to a Vercel
  project+environment*. Natural identity: `(project name, commit SHA, target
  env)`. Vercel assigns its own deployment id (`dpl_...`) on acceptance. The
  SHA is the closest stable, provider-independent operation identity; the
  deployment id is provider-assigned post-acceptance.
- **Q2 Provider idempotency key:** NO client-supplied key in the workflow.
  Mechanism used instead: git-SHA-addressed builds (same SHA -> same immutable
  artifact; Vercel will not rebuild an identical deployment twice). Bolted-on,
  not native.
- **Q3 Queryable:** YES. `GET /v6/deployments?projectId={id}` and
  `GET /v6/deployments/{id}` return `readyState`
  (QUEUED/BUILDING/READY/ERROR/CANCELED). The recon doc prescribes polling
  `readyState` until READY.
- **Q4 Reconcile:** YES, via the probe above. Reconciliation = poll
  deployment state; check which deployment the production alias/domain points
  at.
- **Q5 Reversible:** YES. Documented rollback paths (recon section 8), in
  preference order: `POST /v9/projects/{id}/rollback` with
  `{"deploymentId": "<last-good>"}`, redeploy a known-good SHA via
  `POST /v13/deployments` with `gitSource.ref` pinned, or `git revert` +
  push. Previews are branch-scoped, zero blast radius.
- **Q6 UNKNOWN means:** a deployment may have built, succeeded, and been
  promoted while the API response was lost. Retried blindly -> two READY
  deployments for the same SHA; the alias/domain may point at either.
  Consequence class: LOW-SEVERITY CONTENT SKEW (both deploys are
  byte-identical from the same SHA — wasted builds and alias ambiguity, not
  wrong content). Distinct from classes 8/9: duplicates do not compound harm.
- **Q7 Retry safe:** (a) no deployment record exists for that SHA in the
  project (`GET /v6/deployments?projectId` shows none), AND (b) no build is
  in-flight (no QUEUED/BUILDING deployment for the SHA), AND (c) no
  alias/domain promotion has occurred for the candidate deployment.
  Re-running poll-first-then-deploy is safe.
- **Q8 HOLD:** a deployment for the SHA exists in QUEUED/BUILDING (in-flight
  build + retry = duplicate builds and ambiguous promotion), or `readyState`
  is inconclusive (BUILDING abnormally long). Poll to terminal state first.
- Confidence: HIGH on identity/query/reconcile/reverse (documented +
  code-read). MEDIUM on retry/hold conditions (derived; no chaos testing yet).

## FYD-specific publish note (preview pipeline)

The FYD demo sites are served privately over Tailscale from the Pig's `:3100`
(`next start`), NOT published anywhere public. The effect of "regeneration"
is a re-computed SiteSpec projection, which is deterministic and derived —
not an external effect. The consequential external effects in the FYD loop
are the JOURNAL WRITES (owner overlay events -> `tools/fyd-journal-gateway`),
covered in 03-database-mutation.md, not here. When the multi-tenant publish
path gets built (SiteSpec version -> Vercel project -> domain), this class's
Q1-Q8 apply directly; until then the registry has little to protect.
