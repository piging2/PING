# FYD Vercel Recon, 2026-09-23 (Phase 1, READ ONLY)

No Vercel project, GitHub repo, env var, or remote was created. No repo file was modified.

## 1. Existing deployment machinery (found in repo, branch fyd/builder-composition, SHA e48ef710)

- `vercel.json` (TRACKED, at repo root): buildCommand `npm run build`, outputDirectory `.next`, framework `nextjs`, installCommand `npm install --include=optional`, devCommand `npm run dev`, env `SHARP_IGNORE_GLOBAL_LIBVIPS=1`. This file means the project is already Vercel-shaped; no rewrite needed.
- `.vercel/`: absent. No local Vercel link state.
- `.github/`: UNTRACKED other-lane work. Contains only agent instruction files (`agents/`, `instructions/`, `copilot-instructions.md`). There is NO `.github/workflows/` directory, so no GitHub Actions deploy pipeline exists or conflicts. Look, do not touch.
- `next.config.ts` (tracked): standard Next.js 15 config. `images.remotePatterns` allows `*.public.blob.vercel-storage.com` (Vercel Blob already anticipated as the media host). `eslint.ignoreDuringBuilds: true` (ESLint runs separately). One permanent redirect (`/services/built-ins` to `/services/finish-carpentry`). No rewrites, no custom headers, no domain config. `allowedDevOrigins` is dev-only.
- Deployment scripts: none found (no `deploy:*` script in package.json). `src/lib/deployment-transaction.ts` is unrelated business logic (deployment transaction records), not Vercel machinery.
- Monorepo: none. Single Next.js app at root.

## 2. Deploy root

Repo root. Evidence: `vercel.json`, `next.config.ts`, `package.json`, and `src/` all at `/home/nolan/projects/ping` root. No `rootDirectory` override needed at project creation.

## 3. Env var NAMES (names only; behavior with none set)

With zero env vars set, the two demo sites DO NOT render. This is the critical phase-2 finding.

- Demo sites (`/sites/happy-place`, `/sites/coppersmith-plumbing`) read via `src/fyd/data/ping-object-source.ts`, which FAILS CLOSED: it reads a projection JSON from `FYD_PROJECTION_DIR` (default `/home/nolan/ping/var/fyd-projections`, a PING-side var dir that does not exist on Vercel), verifies `meta.siteId`, validates every object carries a provenance ref, and recomputes `meta.graphDigest` (sha256 over canonical JSON). Missing or tampered projection = thrown error, no silent fixture fallback.
- `next build` statically prerenders the site pages, so a missing projection FAILS THE BUILD, not just the request.
- Valid projection fixtures already exist in the repo: `src/fyd/object/__tests__/fixtures/projections/happy-place.json` (meta.siteId `happy-place`, 3 objects, graphDigest present) and `coppersmith-plumbing.json` (meta.siteId `coppersmith-plumbing`, 4 objects, graphDigest present, dumperVersion `fyd-projection-dump@1.0.0`). Phase 2 must stage usable projections into a committed directory and set `FYD_PROJECTION_DIR` at build AND runtime. Digest revalidation against the current canonicalize is still unproven and must be smoke-tested in phase 2 (a Pig `npm run build` with `FYD_PROJECTION_DIR` pointed at a fixture copy is the proof).
- Owner overlay (`data/fyd-owner/`, also `data/fyd-claim`, `data/fyd-follows`, `data/fyd-likes`, `data/fyd-identity`) lives in the repo and reads empty when no corrections exist; safe without overrides. `FYD_OWNER_DIR`, `FYD_CLAIM_DIR`, `FYD_FOLLOWS_DIR`, `FYD_LIKES_DIR`, `FYD_IDENTITY_DIR` all have repo-relative defaults.
- Demo owner mode is build-time inlined: `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` gates the demo owner UI. Set it for the preview target if smoke should exercise that path.
- All secret-bearing vars are feature-gated and NOT required for the smoke: `KV_REST_API_URL` / `KV_REST_API_TOKEN` (plus `KV_REST_API__*` integration variants) throw only when KV-backed features are invoked; `BLOB_READ_WRITE_TOKEN`, `KIT_API_KEY` + `KIT_*_TAG_ID` + `KIT_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` / `GOOGLE_REFRESH_TOKEN` / `GOOGLE_REVIEWS_SHEET_ID`, `FYD_SESSION_SECRET`, `ENCRYPTION_KEY`, `WORKBENCH_PASSWORD`, `DIAGNOSTIC_SECRET`, `NEXT_PUBLIC_WORKBENCH_TARGET_ORIGIN` / `NEXT_PUBLIC_WORKBENCH_ALLOWED_ORIGINS`, `PING_GATEWAY_BASE_URL` / `FYD_PING_GATEWAY_BASE_URL`, `FYD_JOURNAL_GATEWAY_URL`, `FYD_CUSTOMIZE_GATEWAY_URL`, `FYD_DEV_KEY_DIR` / `PING_DEV_KEY_DIR`, `AP_PROBE_ACCT` / `AP_PROBE_ACTOR`, `GITHUB_TOKEN` / `GITHUB_REPO`, `DEV_MODE_SKIP_KV`, `TEST_NAMESPACE`. `SHARP_IGNORE_GLOBAL_LIBVIPS` is already committed in vercel.json env.
- Vercel system vars (`VERCEL_URL`, `VERCEL_ENV`, `NODE_ENV`) are auto-provided.
- Required-for-smoke env NAMES: `FYD_PROJECTION_DIR` (pointing at staged fixtures), optionally `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE`.

## 4. GitHub integration status

- Vercel account: `piging85-8833` (email piging85@gmail.com), zero projects. The REST endpoints for listing integration installations (`/v1/installations`, `/v1/integrations/installed`, `/v4/integrations`) all 404 on this token, so installation state is UNVERIFIED. With zero projects, the Vercel-for-GitHub App is almost certainly NOT installed on either GitHub account. Git-native auto-deploys require installing it, which is a browser OAuth step Nolan must perform (Vercel dashboard -> Settings -> Git -> connect GitHub, installing the Vercel GitHub App on the repo owner account).
- GitHub identity on the connected credential is `piging2`, NOT `ngesk2`. `ngesk2` is a separate GitHub User; `piging2` has no org memberships. The connected credential cannot create `ngesk2/fyd` and likely cannot push to it unless ngesk2 grants access (unverified). `POST /user/repos` as `piging2` can only create `piging2/fyd`. The planned name `ngesk2/fyd` is blocked on auth unless Nolan supplies ngesk2 credentials or grants access.
- Fallback that avoids the GitHub integration entirely: git-less API deploys via `POST /v13/deployments` with a file tarball. Keeps full API automation but loses automatic per-push previews.

## 5. Push readiness on the Pig (no push performed)

- Repo has NO remote configured. Branch is `fyd/builder-composition`, working tree has uncommitted changes (modified package.json, several src files, plus untracked files); phase 2 must start from the candidate SHA the repo lane hands back, not the dirty tree.
- `gh` CLI is NOT installed on the Pig.
- Git credential helper is the Windows Git Credential Manager (`/mnt/c/Program Files/Git/mingw64/bin/git-credential-manager.exe`); whether it holds usable GitHub credentials is unverified.
- An SSH key pair exists on the Pig (`~/.ssh/id_rsa`), but no evidence it is registered with either GitHub account.
- Push auth path is therefore UNVERIFIED. Phase 2 must dry-run auth (e.g. `git ls-remote` against the new repo) before the real push. Do not assume HTTPS-via-GCM works.

## 6. Phase 2 API call sequence (exact, in order; read-only in this phase)

All via `~/workspace/skills/vercel/bin/vercel-api.py` (surrogate auth) and `~/workspace/skills/github/bin/gh-api.py`.

0. Prereqs (Nolan decisions, see Open questions): repo owner (`piging2/fyd` vs `ngesk2/fyd`), candidate SHA from repo lane, projection staging plan.
1. `gh-api.py POST /user/repos` body: `{"name":"fyd","private":true,"description":"FYD builder"}`. Creates under the authenticated identity only. Capture `id` and `full_name`.
2. On the Pig: `git remote add origin https://github.com/OWNER/fyd.git`, then `git ls-remote origin` (auth proof). Then `git push -u origin <candidate-SHA>:refs/heads/fyd/builder-composition`. If GCM has no creds, fall back to a PAT supplied via Secure Vault or SSH after key registration.
3. Vercel: `vercel-api.py POST /v10/projects` body:
   `{"name":"fyd","framework":"nextjs","gitRepository":{"type":"github","repo":"OWNER/fyd"},"buildCommand":"npm run build","installCommand":"npm install --include=optional","outputDirectory":".next","ssoProtection":{"deploymentType":"only_preview_deployments"}}`
   Requires the Vercel GitHub App installed on OWNER, else this returns an error and the git-less fallback (step 6b) applies. Capture project `id`.
   Preview Deployment Protection = Vercel Authentication on previews only, via `ssoProtection.deploymentType = "only_preview_deployments"` (enum also allows `all_deployments`, `standard_protection_new`, `standard_protection`, `none`; password variant is `passwordProtection` with a password secret).
4. Env: `vercel-api.py POST /v10/projects/{id}/env` per var, body `{"key":"FYD_PROJECTION_DIR","value":"<committed relative dir>","target":["production","preview"],"type":"plain"}` and `{"key":"NEXT_PUBLIC_FYD_DEMO_OWNER_MODE","value":"1","target":["preview"],"type":"plain"}` (preview-only; it inlines at build). Verify with `GET /v9/projects/{id}/env`.
5. Production branch: `vercel-api.py PATCH /v9/projects/{id}` body `{"gitRepository":{"type":"github","repo":"OWNER/fyd","productionBranch":"main"}}`. Default is the repo default branch; pushes to `fyd/builder-composition` produce Preview deployments only, never production, as long as `productionBranch` is not the feature branch. Verify in the PATCH response.
6. Deploy: (a) Git-native: push to the branch triggers the build automatically; poll `GET /v6/deployments?projectId={id}&limit=1` until `readyState` is READY (ERROR/CANCELED = stop and surface logs). (b) Git-less fallback: `POST /v13/deployments` with `{"name":"fyd","project":"{id}","gitSource":{"type":"github","ref":"fyd/builder-composition","repoId":"<id>"}}`.
7. Run the smoke checklist (below) against the preview URL. Fix-forward only on the branch; every fix is a new commit, push, preview, re-smoke.

## 7. Smoke-check list (per preview deployment)

1. `/` (home) returns 200 and renders.
2. `/sites/happy-place` returns 200, hero + services + contact sections present (proves projection load + SiteSpec compile + binding verifier passed; an invalid spec never renders).
3. `/sites/coppersmith-plumbing` returns 200 with same content expectations.
4. No fatal console errors: check preview for uncaught exceptions / hydration failures via a fetched render or browser check; 500s on any of the above are a hard fail.
5. Unsafe URL probe inert: request paths like `/sites/../..`, `/sites/%2e%2e/x`, `/api/fyd/projection?siteId=../../etc` must 404 or return safe errors, never leak files.
6. 320px and 375px viewports: no horizontal overflow on home + both demo sites (check `document.documentElement.scrollWidth <= innerWidth`).
7. Expected SiteSpec renders: validated spec markers present (site title in metadata, service cards, contact block); confirm the served spec came from the staged projection, not a stale fallback (check `/api/fyd/projection?siteId=happy-place` returns the staged `meta.siteId`).

## 8. Rollback

Previews are branch-scoped and never touch production, so the blast radius of a bad preview is zero. Rollback methods, in preference order:
- Vercel: `POST /v9/projects/{id}/rollback` with `{"deploymentId":"<last-good-deployment-id>"}`.
- Redeploy a known-good SHA via `POST /v13/deployments` with `gitSource.ref` pinned to that SHA.
- Git-level: `git revert` the bad commit on the branch, push, let the new preview build.
No production deployment exists yet, so there is nothing to roll back in production.

## 9. Open questions

1. Repo owner: `piging2/fyd` (creatable today via the connected credential) or `ngesk2/fyd` (needs Nolan's ngesk2 auth or a grant to piging2)? Nolan's call; the plan assumed ngesk2 but the credential is piging2.
2. Vercel GitHub App installation: likely missing on both accounts. Nolan must install via browser (Vercel dashboard -> Git) for Git-native previews, or phase 2 proceeds git-less via `POST /v13/deployments` tarballs.
3. Push auth on the Pig is unverified (no gh CLI; GCM state unknown; SSH key registration unknown). Phase 2 must prove auth with `git ls-remote` before pushing.
4. Projection staging: use the committed test fixtures as the phase-2 projection bundle, or have the repo lane emit fresh projections? If fixtures, digest validation must be re-proven against the current canonicalize via a Pig build with `FYD_PROJECTION_DIR` set.
5. Production branch for the new repo: default `main`. Confirm phase 2 creates it (even as a pointer) so `productionBranch` designation is meaningful.
6. Should `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` be preview-only (safer) or also production (future)? Recommend preview-only for now.
7. Hobby-plan limits on this Vercel account (bandwidth, build minutes, deployment protection availability) were not probed; confirm protection features are available on the plan before relying on `ssoProtection`.

## 10. Secret-scan plan (designed, not run; no build exists)

Pre-deploy (on the Pig, after `npm run build` with phase-2 env):
- Scan `.next/` output (server chunks, static chunks, sourcemaps) with regexes for secret shapes: `sk-[A-Za-z0-9]{16,}`, `ghp_|gho_|github_pat_`, `xox[bap]-`, `AKIA[0-9A-Z]{16}`, `postgres(ql)?://`, `redis://`, and literal names of known sensitive vars (`KV_REST_API_TOKEN`, `GOOGLE_CLIENT_SECRET`, `KIT_API_KEY`, `ENCRYPTION_KEY`, `FYD_SESSION_SECRET`, `WORKBENCH_PASSWORD`, `DIAGNOSTIC_SECRET`, `BLOB_READ_WRITE_TOKEN`).
- Audit every `NEXT_PUBLIC_*` var: list the full set from source (`grep -rhoE "NEXT_PUBLIC_[A-Z_]+" src`) and confirm each is intentionally public; build inlines them into client JS, so any accidental secret there ships to browsers.
- Check that server-only modules (`src/fyd/data/ping-object-source.ts`, `src/lib/kit.ts`, kv stores) carry the `server-only` import or live under server-component paths, so bundler never pulls secret reads into client chunks.
Post-deploy (on the preview URL):
- Fetch the served HTML for home + both demo sites and grep for token-shaped strings and any `*.vercel.app` internals; fetch one client JS chunk and repeat.
- Verify `protected_sourcemaps` posture: sourcemaps must not expose server env; if the plan supports it, enable sourcemap protection at project creation.
- Confirm no `.env*` files were committed to the repo (`git ls-files | grep -E "^\.env"` must be empty) and `.gitignore` covers them.
