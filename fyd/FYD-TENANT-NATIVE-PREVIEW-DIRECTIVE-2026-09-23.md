# FYD — Tenant-Native Preview Directive

Issued by Nolan, 2026-09-23 08:30 MDT. Verbatim. Binding on the FYD deployment lane.

FYD — PROCEED.

DECISIONS ARE MADE.

GITHUB OWNER:
piging2

FYD MUST OPERATE LIKE ANY OTHER TENANT.

Do not introduce:

special FYD tenant code
special Nolan rendering
special PING rendering
hardcoded tenant IDs
privileged SiteSpec paths
deployment-only product semantics.

FYD/PING dogfooding must exercise the SAME:

source ingestion
evidence
objects
relationships
SiteSpec
renderer
media pipeline
Ask FYD
customization
owner overrides
regeneration

that an ordinary tenant receives.

Proceed with the normal tenant-compatible deployment path.

Preferred:

piging2/fyd
→ Vercel project
→ protected preview
→ scoped environment
→ feature branch preview
→ smoke tests.

If the Vercel GitHub App installation is still the only blocker to native
push-triggered previews, surface the exact one-time browser action.

Do not redesign deployment around avoiding a one-minute setup step.

API-driven deployment is fallback, not preferred architecture.

Get me usable URLs as quickly as safely possible.

At minimum expose the two proven tenant sites:

/sites/happy-place

/sites/coppersmith

Then FYD/PING dogfood when its graph is ready.

I want to TEST THE PRODUCT, not inspect another report.

A tenant should conceptually be:

TENANT
↓
AUTHORIZED SOURCES
↓
OBSERVATIONS / EVIDENCE
↓
OBJECT GRAPH
↓
OWNER OVERRIDES
↓
SITE SPEC
↓
RENDERER
↓
FYD NODE
↓
ASK FYD / CAPABILITIES.

Deployment location must not change those semantics.

Local
Pig
Vercel preview
production

should render the same tenant state given the same inputs/configuration.

Use the best safe implementation already available.

For authorized/public demo media:

prefer FYD-controlled cached/derived media where rights and source policy
permit, preserving:

source URL
digest
observed_at
media provenance.

Do not make hotlinked third-party media canonical.

If local derivation isn't ready, use a safe temporary remote-media path
rather than blocking the product.

No giant media subsystem.

For an externally reachable preview:

DO NOT ship a fake owner toggle that grants real mutation authority.

If real authentication already exists and can be wired cheaply, use it.

Otherwise:

visitor preview = read-only

and keep owner mutation/customization behind the existing trusted local
or authenticated development path until real auth is wired.

Never let presentation-layer "owner mode" become authorization.

Use full evidence-backed Q&A within the evidence FYD actually possesses.

If evidence supports the answer:
ANSWER + EVIDENCE.

If evidence is incomplete:
SAY WHAT IS KNOWN AND UNKNOWN.

If unsupported:
DO NOT INVENT.

This is more valuable than a narrow canned FAQ.

Keep:

MOBILE UX
CONTACT DISCOVERABILITY
SERVICE DISCOVERABILITY
PERFORMANCE.

Add one non-negotiable fifth:

TRUST / EVIDENCE.

A beautiful generated site that confidently invents business information
is a failed FYD site.

Do not optimize twenty metrics tonight.

LEAVE THE REPLAY-PRECEDENCE CANDIDATE BOUNDED.

Do not mix it into the FYD deployment merely because it exists.

Its promotion is a separate decision/change set.

No unrelated security diff hitchhikes on the website preview.

Return the shortest useful report:

REPO:
BRANCH:
SHA:

VERCEL PROJECT:
PREVIEW PROTECTION:

HAPPY PLACE:
<preview>

COPPERSMITH:
<preview>

MOBILE:
PASS/FAIL

ASK FYD:
PASS/FAIL

EVIDENCE:
PASS/FAIL

TENANT-SPECIFIC CODE:
ZERO / explain

OWNER MUTATION EXTERNALLY EXPOSED:
NO / explain

SEVEN-POINT SMOKE:
PASS/FAIL

FIRST REAL PRODUCT FAILURE:
...

Then stop reporting and let Nolan use it.

GO.

## Cover message context (binding)

The architectural test here is unusually valuable: if piging2/fyd itself cannot live comfortably as an ordinary FYD tenant, the multi-tenant abstraction is wrong. Don't solve that with a special system tenant. Dogfooding should continuously force the product's own presence through exactly the machinery a plumber, consultant, creator, or organization gets.

Priority: get the two preview URLs into Nolan's hands over another research wave. With 1,219 tests, TypeScript, production build, and all thirteen gates green at e48ef710, another internal architecture discussion has much lower information value than Nolan actually tapping through both generated sites.

## Constraints inherited

- Jev replay-precedence candidate stays bounded (committed 5bb2d08b5 on jev/verdict-authority-hardening). It does NOT ship in the FYD deployment.
- Push of the FYD feature branch is authorized; never push main.
- No unrelated dirty work absorbed.
