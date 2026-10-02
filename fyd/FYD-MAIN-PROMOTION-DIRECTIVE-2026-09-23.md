# FYD — Main Promotion Directive

Issued by Nolan, 2026-09-23 09:51 MDT. Verbatim. Binding on the FYD/main lane.

GO — PREPARE MAIN FOR AUTOMATIC FYD DEPLOYMENT.

DO NOT MERGE e48ef710 AS-IS.

DECISIONS:

VERCEL IMPORT
Operator will perform the one-time Vercel GitHub App/project connection if it
has not already been done. Do not weaken credentials or create alternate
deployment machinery to work around the read-scoped token.
/sites
RE-ENABLE IT.

The Circle-Only reset is superseded for FYD.

FYD now explicitly requires:

Circle = portable doorway
Site/Node = generated customer experience.

Make the smallest intentional middleware change restoring /sites.

Add a regression test proving:

/sites/happy-place reachable
/sites/coppersmith-plumbing reachable
unrelated disabled/reset routes remain disabled.
OWNER MUTATION
GATE IT.

Visitors are READ-ONLY.

The current unauthenticated override route MUST NOT ship to a reachable
deployment merely because responses say "DEMO OWNER CONTEXT."

For this demo:

mutation requires explicit demo-owner-mode
default = OFF
absent/false => fail closed
public visitor can read/Ask FYD but cannot mutate
do not pretend demo-owner-mode is production authentication.

Real owner authentication remains a later explicit boundary.

The repaired authority SHA fffe99f7a has the stronger evidence:

clean provenance
production bootstrap proven
permanent regression gate
independent clean-checkout verification
12/12 gates.

Promote it through the normal merge/cherry-pick path needed by main BEFORE
claiming main deployable.

Do not blindly merge an entire branch if it contains unrelated work.

Preserve only the independently verified required commits/deltas.

Bring the FYD builder changes onto the resulting main candidate.

Resolve only actual conflicts.

DO NOT:
reset dirty worktrees
copy untracked generated state
smuggle fixtures into production
disable tests
weaken middleware/security
change canonical authority semantics just to make the builder deploy.

Then prove FROM A FRESH CHECKOUT OF THE EXACT MAIN CANDIDATE SHA:

canonical suite
production bootstrap
builder routes
URL safety
binding verifier
visibility rules
semantic determinism
mobile
desktop
visitor read-only
demo owner mutation fail-closed by default
Ask FYD evidence path if currently wired.

Only merge to main when the exact candidate proves:

PRODUCTION BOOT: PASS
CANONICAL TESTS: PASS
/sites/happy-place: PASS
/sites/coppersmith-plumbing: PASS
VISITOR MUTATION: DENIED
DEMO OWNER MODE DEFAULT: OFF
URL SAFETY: PASS
MOBILE: PASS
DESKTOP: PASS
TENANT-SPECIFIC CODE: ZERO
SECRET SCAN: CLEAN

Then:

MERGE TO MAIN.

PUSH MAIN.

If Vercel Git integration is configured to deploy main, LET THAT EXISTING
PIPELINE DEPLOY IT.

Do not invent a second FYD deployment path.

Immediately smoke the ACTUAL deployed URLs:

Happy Place
Coppersmith

Test from a clean visitor session:

load
mobile
desktop
links
Ask FYD
evidence
Why This
mutation denied.

Then separately enable whatever bounded owner-demo mechanism is intended and
prove owner customization without exposing that authority to visitors.

If deployment fails:

fix the first reproducible failure.

Do not roll forward with a partially protected demo.

Do not spend another wave polishing deployment.

Once both URLs are reachable and protected enough for testing, Nolan needs
to USE THEM.

The next source of truth becomes product interaction:

What looks wrong?
What information is missing?
What feels generic?
What is hard to change?
Does Ask FYD understand the business?
Does evidence increase trust?
Can FYD make a requested change correctly?

DEPLOY THE PRODUCT SO WE CAN BREAK THE PRODUCT.

GO.

## Pig sleep decision (separate lane, recorded here)

Keep normal sleep behavior. Active automation must acquire an OS-supported wake lock and release it in finally/on crash recovery. "Never sleep on AC" is a machine-wide workaround; run-scoped wake inhibition is the future-proof execution primitive. Implement as a bounded Pig-infrastructure task.

## Cover note (binding)

Do not introduce more website-builder architecture before the two deployed nodes can be touched. Product interaction is now the source of truth.
