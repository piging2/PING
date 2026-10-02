# FYD — Perfect the Product Gate, Commit, and Automate Vercel

Issued by Nolan, 2026-09-23 08:17 MDT. Verbatim. Binding on the FYD lane.

FYD — FINISH IT CLEANLY AND SET UP CONTINUOUS DEPLOYMENT

YES.

GET THE CURRENT PRODUCT SLICE PERFECT ENOUGH TO BECOME THE DEPLOYED BASELINE.

DO NOT ADD NEW ARCHITECTURE WHILE DOING THIS.

============================================================

CLOSE THE AUTHORITY/PROMOTION GATES FIRST
============================================================

Finish the current twelve-gate promotion checklist.

Replay precedence invariant:

EXECUTION CONTEXT

>

SYSTEM/AUTHORITATIVE METADATA

>

CALLER PAYLOAD.

Hostile tests MUST prove caller payload cannot spoof:

test mode
tenant
producer
trust
authorization-relevant context.

Determine actual DB write authority.

If canonical tables are writable only by the intended service writer:

DOCUMENT + TEST THAT BOUNDARY.

If ordinary application/user roles can directly mutate canonical truth:

BLOCK PROMOTION
AND FIX IT.

Dispatcher:

If it can cause consequential effects without admission/capability evaluation:

P0.

Otherwise document it as hardening work and keep moving.

Before committing the deployable FYD baseline:

CANONICAL TEST:
GREEN

URL SAFETY:
GREEN

HOSTILE CONTENT:
GREEN

BINDING VERIFIER:
GREEN

VISIBILITY OVERRIDE:
GREEN

SEMANTIC DETERMINISM:
GREEN

DESKTOP:
GREEN

320 MOBILE:
GREEN

375 MOBILE:
GREEN

SOURCE → EVIDENCE:
GREEN

EVIDENCE → OBJECTS:
GREEN

OBJECTS → SITESPEC:
GREEN

SITESPEC → RENDER:
GREEN.

Do not require future Ask FYD work to call the current renderer baseline green.

But do not call unproven features complete.

There are unrelated dirty files.

DO NOT:

git add -A
reset --hard
clean
overwrite another lane
silently absorb unrelated work.

Identify EXACT files belonging to this completed slice.

Diff them.

Test them.

Commit ONLY them.

If ownership is ambiguous:

leave the file alone and record it.

The proven min-w-0 repair should not remain an uncommitted mystery.

Commit the smallest verified change with its relevant regression evidence.

No opportunistic formatting/refactoring.

Prefer small commits such as:

fix(renderer): reject unsafe source URL schemes

fix(renderer): preserve mobile shrinkability

feat(evidence): enforce render claim bindings

feat(visibility): apply owner field visibility

test(fyd): lock semantic render determinism

Only create commits corresponding to actual current diffs.

Do not manufacture history to match these names.

After commits:

create/use a clean worktree at exact candidate SHA.

Run THE canonical gate.

Record:

SHA
Node
npm/package manager
install command
test command
build command
test counts
exit codes.

Then build production mode.

No "works because node_modules from another lane exists."

Search repo first for:

vercel.json
.vercel
existing Vercel project metadata
deployment scripts
GitHub Actions
environment assumptions
Next.js root
monorepo config
build commands
rewrites
headers
domains.

DO NOT create duplicate deployment machinery.

Determine exact FYD deploy root.

Use Vercel's Git integration.

Desired flow:

FEATURE BRANCH
↓
PUSH
↓
VERCEL PREVIEW
↓
AUTOMATED TESTS
↓
HUMAN/AGENT BROWSER PROOF
↓
MERGE
↓
PRODUCTION BRANCH
↓
VERCEL PRODUCTION DEPLOYMENT.

Every meaningful branch/PR should get a Preview deployment.

Production should deploy only from the designated production branch.

DO NOT configure arbitrary working branches as production.

FYD is still under active development.

Enable Vercel Deployment Protection for Preview deployments.

Do not expose unfinished owner controls, internal diagnostics, evidence debugging, or demo auth publicly merely because Vercel generated a URL.

Production public visibility is a separate decision.

Separate:

DEVELOPMENT
PREVIEW
PRODUCTION.

Do not reuse production credentials in Preview merely for convenience.

Scope environment variables appropriately.

Secrets remain server-side.

Never expose:

database credentials
provider tokens
signing keys
gateway secrets
internal service credentials

through NEXT_PUBLIC_* or client bundles.

Run a built-artifact secret scan.

Do not move PING canonical truth into Vercel just because FYD UI deploys there.

Architecture remains:

VERCEL FYD WEB
↓
SANITIZED BFF/API
↓
PING AUTHORITY
↓
CANONICAL EVENTS
↓
PROJECTIONS.

The browser never receives DB credentials.

The browser never talks directly to canonical tables.

The browser never receives provider secrets.

A Preview deployment must NOT casually mutate production canonical state.

Default:

PREVIEW
→ fixture/safe preview data
or
→ explicitly bounded non-production backend.

If a Preview must read real data for a specific proof:

read-only/sanitized unless separately authorized.

No feature branch should gain production write capability merely because it has a Vercel URL.

For every Preview deployment automatically verify at least:

home loads
Happy Place loads
Coppersmith loads
no fatal console errors
unsafe URL probe remains inert
320 layout does not overflow
375 layout does not overflow
expected SiteSpec renders.

As Ask FYD lands, add it to this smoke gate.

Automatic BUILD/DEPLOY is good.

Automatic UNSAFE PROMOTION is not.

For now:

branches
→ automatic Preview.

designated production branch
→ automatic Production ONLY after required repository gates/merge policy.

If current repository controls cannot guarantee that:

use staged/manual production promotion temporarily.

Do not weaken the authority model just to say "continuous deployment."

Do not block on branding/domain perfection.

Get stable FYD Preview URLs working first.

Then production domain mapping.

We need a URL Nolan can open on:

desktop
phone

without Tailscale/WSL forwarding gymnastics.

Document the minimum:

VERCEL PROJECT
GIT REPOSITORY
ROOT DIRECTORY
FRAMEWORK
INSTALL COMMAND
BUILD COMMAND
PRODUCTION BRANCH
REQUIRED ENV NAMES — NAMES ONLY, NEVER VALUES
HEALTH/SMOKE ROUTES
ROLLBACK METHOD.

No 40-page deployment manual.

Once Vercel Preview is green:

STOP INFRASTRUCTURE POLISH.

Immediately continue:

RENDERED EXPERIENCE
→ ASK FYD
→ EVIDENCE.

First required Ask FYD question:

"What services does this business offer, and how do you know?"

The answer MUST:

use current graph/evidence
cite its evidence
refuse unsupported claims
distinguish direct evidence from generated synthesis.

Next proof:

"Move emergency plumbing to the top."

REQUEST
↓
TYPED SITE PATCH
↓
BEFORE/AFTER
↓
OWNER APPROVAL
↓
APPLY
↓
RENDER
↓
PERSIST
↓
RELOAD.

That is where FYD begins separating from commodity website generation.

I WANT:

git push feature branch
↓
tests
↓
Vercel Preview URL
↓
browser smoke
↓
review

then:

merge approved branch
↓
production build
↓
production deployment
↓
smoke
↓
known rollback.

No SSH deployment ritual.

No WSL port forwarding for ordinary FYD review.

No mystery build running on the Pig as the only way to see the product.

AUTHORITY GATES:
PASS/FAIL

DB WRITE BOUNDARY:
...

DISPATCHER:
...

CLEAN SHA:
...

CANONICAL TEST:
...

PRODUCTION BUILD:
...

DIRTY FILES LEFT UNTOUCHED:
...

VERCEL PROJECT:
...

GIT CONNECTED:
YES/NO

PREVIEW AUTO-DEPLOY:
PASS/FAIL

PREVIEW PROTECTED:
YES/NO

PRODUCTION BRANCH:
...

PRODUCTION AUTO-DEPLOY:
CONFIGURED/HELD

ENVIRONMENT SEPARATION:
PASS/FAIL

SECRET SCAN:
PASS/FAIL

HAPPY PLACE PREVIEW:
PASS/FAIL + URL

COPPERSMITH PREVIEW:
PASS/FAIL + URL

320:
PASS/FAIL

375:
PASS/FAIL

DESKTOP:
PASS/FAIL

ROLLBACK:
PROVEN/UNPROVEN

FIRST BROKEN STEP:
...

NEXT PRODUCT BUILD:
...

TEST IT.

BREAK IT.

FIX IT.

TEST AGAIN.

COMMIT ONLY OWNED CHANGES.

PROVE FROM A CLEAN SHA.

MAKE EVERY BRANCH EASY TO SEE.

MAKE PRODUCTION BORING TO DEPLOY.

THEN STOP POLISHING DEPLOYMENT AND RETURN TO THE PRODUCT.

THE TARGET IS NOT:

"WE USE VERCEL."

THE TARGET IS:

CODE
→ TEST
→ PREVIEW
→ VERIFY
→ MERGE
→ DEPLOY

WITH NO MYSTERY AND NO UNSAFE SHORTCUTS.

GO.

## Technical notes (from Nolan's cover message, binding)

- Use Git-native previews rather than inventing a deployment script: branch/PR pushes naturally create isolated Preview deployments, the configured production branch drives Production.
- Keep Preview and Production credentials genuinely separate; Vercel supports environment-scoped variables specifically for this.
- If this is a monorepo, do not guess the Vercel root/build command. Vercel supports selecting the app root and dependency-aware monorepo builds, and it can avoid unnecessary deployments with an Ignored Build Step once the actual dependency boundary is known.
- FYD is pre-launch: protect previews. Vercel supports authenticated deployment protection, including broader production protection later if a private pre-launch environment is needed.
- Priority call: do not wait for Ask FYD to perfect deployment. Get the two proven sites onto protected Preview URLs first so Nolan can touch the product from his phone. Then the next product commit is Ask FYD → evidence, not another infrastructure wave.

## Existing prior work to reuse, not redo

- Vercel token connected in vault (provider custom.vercel); working skill at ~/workspace/skills/vercel/ with bin/vercel-api.py (REST GET/POST/DELETE).
- A previous deploy lane reached: Vercel API token valid (account pinging85-8833); no Vercel projects existed; a clean deploy tree was prepared from base 0dec40f5; a full gate was re-run against it. Nolan later authorized creating a fresh Vercel project; that run was cancelled mid-flight, so no project may exist. Enumerate first.
- FYD repo work: branch fyd/builder-composition holds the builder slice; min-w-0 fix reportedly committed 2026-09-21 as 8a99742 (never pushed); consistency/UI retarget committed as e48ef710 (gate result unverified); unrelated dirty files exist.
