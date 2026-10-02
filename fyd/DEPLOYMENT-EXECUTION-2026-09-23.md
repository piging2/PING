# FYD Deployment Execution — 2026-09-23

## STEP 1 — FINAL PRE-DEPLOY CHECK: PASS

```
git ls-remote git@github.com:piging2/fyd.git refs/heads/main
a69bb68fc84620a5635e071030cf49a633df7394  refs/heads/main
```

Remote main == a69bb68f exactly. No merge, no push, no repair needed or performed.
(The earlier "main already pushed" claim from 10:11 MDT was itself verified
against this same remote state; the check was re-run immediately before deploy.)

## STEP 2 — VERCEL: BLOCKED ON OPERATOR

- Vercel project list (GET /v9/projects): empty — no project exists for piging2/fyd.
- Project creation attempted once (POST /v9/projects, name=fyd,
  gitRepository=piging2/fyd type=github, framework=nextjs, rootDirectory=./,
  buildCommand="npm run build", installCommand="npm install --include=optional",
  outputDirectory=.next): HTTP 403
  `{"error":{"code":"forbidden","message":"You don't have permission to create the project.","action":"create","resource":"project"}}`
- The connected Vercel credential remains read-scoped. No weakened credentials,
  no alternate deployment machinery created. Nothing else attempted against
  Vercel to avoid account risk on repeated forbidden requests.

### Exact operator action required (one-time, in a browser)

1. Open vercel.com/new (logged in as an account with Vercel project-creation rights).
2. Choose Import Git Repository.
3. Select `piging2/fyd` — NOT `piging2/PING`. This installs the Vercel GitHub App
   for the piging2 org if not already installed.
4. At import, explicitly select branch **main** as the Production Branch.
   Do NOT use the repository default `fyd/builder-composition`.
5. Build settings (already committed in vercel.json, but confirm):
   - Framework: Next.js
   - Root Directory: ./
   - Build Command: npm run build
   - Install Command: npm install --include=optional
   - Output Directory: .next
6. Environment variables, Preview scope only:
   - `FYD_PROJECTION_DIR=src/fyd/object/__tests__/fixtures/projections`
   - Do NOT set `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE`.
   - Do NOT add Postgres credentials, PING signing keys, Pig credentials,
     production gateway secrets, or unnecessary provider tokens.
7. Enable Deployment Protection for Preview deployments.
8. Deploy. Confirm the deployment resolves to commit a69bb68f.

## STEP 3 — STRANGER SMOKE: NOT RUN (no deployed URL yet)

## STEP 4 — SERVERLESS LIMITATION: accepted (no persistence work to do).

## STEP 5 — PRODUCT MODE: pending green stranger smoke.

## Report fields (filled where possible)

DEPLOYED SHA: not yet deployed
PRODUCTION/PREVIEW URL: none (no Vercel project exists)
BUILD: n/a
ROUTES: n/a
DESKTOP: n/a
375: n/a
320: n/a
ASK FYD: n/a
EVIDENCE: n/a
VISITOR MUTATION: n/a
CLAIMS VERIFY: n/a
DEMO MODE: n/a
SECRET SCAN: n/a
FIRST BROKEN EXPERIENCE: n/a
NEXT FIX: operator performs the one-time Vercel import above; deployment
agent then resumes at Step 2 (confirm a69bb68f deployment) and Step 3
(stranger smoke).

## Finisher pass (2026-09-23 ~11:40 MDT) — Vercel authority audit, no deployment

STEP 1 FACTS (read-only, Pig /home/nolan/projects/ping):
- remote origin: git@github.com:piging2/fyd.git
- git ls-remote origin refs/heads/main = a69bb68fc84620a5635e071030cf49a633df7394
- EXPECTED == ACTUAL. Remote main is the proven candidate. GitHub push is DONE. This is not a Git problem.

STEP 2 CI INVENTORY (read-only):
- No .github/workflows/ anywhere: not in the candidate tree (git ls-tree -r a69bb68f: zero workflow files), and the untracked local .github/ contains agent-instructions only (.github/agents, .github/instructions, copilot-instructions.md), not workflows.
- gh CLI not installed on Pig; no run history queryable from there.
- No deployment workflow exists. Per directive: NOT created. Recommendation: keep CI minimal (tests/typecheck/build/security) once a workflow is wanted; Vercel native Git integration should own deployment, not a second deployment authority.

STEP 3 VERCEL AUTHORITY AUDIT (via custom.vercel credential, no tokens printed):
- Vercel identity: piging85-8833 / piging85@gmail.com (authenticated, 200 on /v2/user)
- list teams: 403 forbidden (token cannot list teams)
- list projects: 200, zero projects exist
- create project: 403 forbidden (one attempt made in prior session with fyd + gitRepository piging2/fyd; not retried per no-blind-retry rule; list-projects success proves credential attachment works, so the 403 is a genuine scope limit, not a missing key)
- Vercel GitHub App: cannot be assessed independently of a project (no project exists; no integration context)

STEP 4 DEPLOYED: not deployed — no URL, no SHA, no smoke possible.
STEP 5 BORING FUTURE STATE: wired conceptually, not executed (needs the binding first):
developer -> commit -> GitHub -> CI gate (tests/typecheck/build/security, GITHUB_TOKEN minimal) -> main -> Vercel native Git integration -> deployment -> stranger smoke. One deployment authority only (Vercel Git integration).

EXACT MISSING AUTHORITY:
- VERCEL ACCOUNT: piging85-8833 (piging85@gmail.com)
- VERCEL TEAM: unknown (token 403 on team list; personal-account context assumed)
- VERCEL TOKEN CAN LIST PROJECTS: YES (empty result, 200)
- VERCEL TOKEN CAN CREATE PROJECTS: NO (403 forbidden)
- GITHUB APP INSTALLED: n/a (no project context; install happens at import)
- GITHUB REPO VISIBLE TO VERCEL: n/a until project created
- PROJECT EXISTS: NO
- EXACT 403 OPERATION: POST /v10/projects (create fyd importing piging2/fyd)

REMAINING GATE: one-time operator import at vercel.com/new: Import piging2/fyd (NOT piging2/PING) -> explicitly select branch main (NOT repo default fyd/builder-composition) -> Preview env FYD_PROJECTION_DIR=src/fyd/object/__tests__/fixtures/projections only, no NEXT_PUBLIC_FYD_DEMO_OWNER_MODE, no credentials/keys/tokens -> Deployment Protection ON for Preview -> deploy confirming a69bb68f. That single import installs the Vercel GitHub App binding and unblocks the boring path.
