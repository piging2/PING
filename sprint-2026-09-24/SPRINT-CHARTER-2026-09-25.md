# SPRINT CHARTER — FYD Compiler Sprint + Bounded Privacy P0

Issued by Nolan 2026-09-25 ~19:41 MDT. Clock started immediately.
Continuation of the current product proof, not a ceremonial new sprint.

## Verdict

BOTH lanes. Privacy track must NOT hijack the compiler sprint.

## Main lane: execute the compiler fix plan

Plan: `sprint-2026-09-24/fyd-compiler-fix-plan-2026-09-26.md` — APPROVED AS SPRINT ITEM #1.

Order: BUILD INTEGRITY → RENDERED-DOM AUDIT → DETERMINISTIC CONSUMPTION MAP →
EXISTING/HARVESTED DESIGN PRIMITIVES → RESPONSIVE HEADER → CAPABILITY-DERIVED CTAs →
PROVENANCE-AWARE MEDIA SELECTION → QUIET WHY-THIS → SCREENSHOT FALSIFICATION →
HPP THROUGH SAME COMPILER.

Do not invent a new framework. Do not reopen the architecture.

Verified root causes to fix:
- `family.css` → nonexistent token CSS path → theme CSS never loaded → Tailwind-dependent
  family presentation dead → broken responsive/header/CTA presentation.
- No consumption map → components independently consume facts → phone/address/services
  repeat everywhere → template feels machine-generated.

Consumption invariant (NOT "every fact exactly once"): EVERY CONSUMPTION INTENTIONAL.
Every fact has a PRIMARY PRESENTATION OWNER plus optional INTENTIONAL SECONDARY USES,
each with a semantic job. No accidental consumption. Defaults deny repetition.

Reference mapping: PHONE → Contact CTA (primary); header CTA / contact section / footer
allowed as purposeful action surfaces. ADDRESS → Location. SERVICE LIST → Services.
BUSINESS DESCRIPTION → Story/About. SOCIAL LINKS → Footer/Connect.

Dev proof artifact per fact: FACT / SOURCE / PRIMARY OWNER / SECONDARY CONSUMERS /
WHY / VISIBILITY / MEDIA/CTA DEPENDENCY. Not exposed on the public page.

Research direction: SOURCE DESIGN IS SIGNAL, NOT AUTHORITY. Harvest logo, media,
palette tendencies, visual density, content hierarchy, navigation hierarchy, CTA
prominence from the existing site. FYD owns its presentation. Do not clone bad source
design. Do not copy arbitrary source CSS.

Media for demo businesses: public site media may be used for the PRIVATE/INTERNAL demo
ONLY when source and rights/usage basis are recorded. Prefer download → digest →
provenance record → derived optimized asset over runtime hotlinking. Media record:
SOURCE URL / OBSERVED AT / DIGEST / ORIGINAL DIMENSIONS / DERIVATIVE DIGESTS /
USAGE-RIGHTS STATUS. Rights uncertain → UNKNOWN/DEMO-ONLY. Public visibility is never
a blanket reuse license.

No fake auth in the product. Explicit DEMO OWNER MODE acceptable only if clearly
labeled, local/private, not presented as authentication, cannot be mistaken for
production security, and the event actor records demo/operator authority. Preserve the
real owner-auth seam. Before a real external owner test with consequential writes:
real ownership/authentication or a deliberately operator-mediated test.

Ask FYD: FULL EVIDENCE-BOUNDED Q&A. Answer anything supported by the allowed
graph/evidence; UNKNOWN / insufficient evidence when unsupported. No improvising
business facts. No pretending inference is direct evidence.

## Parallel safety lane: bounded privacy P0 (ONE narrow worker)

ONLY this class: PUBLIC LEAK / VISIBILITY RESOLUTION / PUBLIC-SAFE ASK OUTPUT.
Reproduce first; fix ONLY if proven. Do not mix commits with the main lane until each
has its own proof.

1. Public-projection leak: hidden phone removed from fields BUT phone survives through
   description and/or owner correction metadata. If reproduced → P0. Fix generically at
   the PUBLIC PROJECTION SEAM. Principle: PUBLIC OUTPUT MUST BE CONSTRUCTED FROM
   ALLOWED PUBLIC BINDINGS — deny by default at the public boundary. Do not merely
   allowlist description: a retained generated sentence may depend on a hidden fact
   ("Call us at PRIVATE_PHONE" still leaks when fields.phone is hidden). Public
   projection must understand factual dependencies:
   PUBLIC CLAIM → FACT DEPENDENCIES → VISIBILITY RESOLUTION → PUBLIC / WITHHELD.
   Do NOT build a general information-flow theorem prover. Solve the concrete binding
   model already present in FYD.
2. Visibility resolution: reproduce the older-HIDE / newer-SHOW inconsistency. There must
   be ONE resolved visibility decision: decision history → winning effective policy,
   ONCE. All consumers (field projection, traversal, relationship pruning,
   receipt/digest, renderer) use that result. Identical precedence/version with
   different outcomes → fail closed / surface ambiguity per the existing authority
   model, never resolve by input order. Derive the receipt from the RESOLVED result:
   same semantic decisions must not yield same digest + different public visibility.
3. Address: do NOT blindly classify street address as always-private or always-public.
   Separate OBSERVED VALUE from PUBLICATION POLICY. FYD may retain the observed street
   address in protected evidence. Public projection depends on effective owner/
   publication policy. "Show my business address" must be representable; approval must
   bind precisely to ENTITY + FIELD + VALUE/REVISION + VISIBILITY DECISION. Choosing
   privacy at ingestion must not destroy optionality (later SHOW needs something to
   reveal).
4. Evidence claims: do not claim stronger evidence than exists. Four service objects
   proving four different services are not four independent corroborations of one claim.
   Bind generated answer claims to their factual dependencies. Customer responses must
   NOT dump internal object IDs; expose human-meaningful provenance
   (e.g. "Plumbing — Source: business website / Services").

Everything else from the Codex review stays PARKED until the compiler proof lands:
digest redesign, distributed locking, new conflict architecture, editor frameworks,
protocol adapters.

## Scope

FYD PRODUCT ONLY. Outreach/social operations are NOT part of this sprint. Do not mix
the website compiler with social engagement automation. Social automation schedules are
a separate operational system; do not modify them in this sprint.

## Pig / wake lock

Sprint-scoped wake lock acquired 2026-09-25 ~19:45 MDT (tag PIG-SPRINT-WAKELOCK-20260925,
holder pid 55190, visible in powercfg /requests as SYSTEM request). Holds even on
battery per Nolan's order. Battery guard: holder exits below 20% while discharging so
the machine sleeps gracefully instead of hard-powering-off at 0%. Release at sprint end:
`~/workspace/pig/pigwsl-run.sh "$(cat ~/workspace/pig/sprint-wakelock-release.sh)"`.
Do not globally disable sleep. If Windows/WSL wake-lock reliability proves inadequate,
escalate with evidence. Pig stays plugged in as much as possible.

## Done metric: BOTH

- Coppersmith passes the OWNER/VISITOR EXPERIENCE test: great public website,
  responsive, correct theme, no accidental repetition, strong services, strong contact
  path, capability-derived CTAs, grounded Ask FYD, owner can make a supported change,
  change survives refresh/regeneration.
- The two differentiated FYD capabilities work: ASK FYD + OWNER CORRECTION/
  CUSTOMIZATION LOOP.
- DONE = GOOD WEBSITE + GROUNDED INTELLIGENCE + OWNER CONTROL. Visual beauty alone
  is not done. Substrate correctness alone is not done.
- HPP through the same compiler: same design grammar, materially different result
  where evidence/presentation signals justify it, no business-specific fork. Plus
  public privacy boundary green, screenshots reviewed, canonical tests green.

## Six gates (independent, never averaged)

MOBILE UX / CONTACT DISCOVERABILITY / SERVICE DISCOVERABILITY / PERFORMANCE /
GROUNDED INTELLIGENCE (can important claims be traced to allowed evidence?) /
OWNER CHANGEABILITY (can the owner change presentation/content intent without code?).

## Nolan availability

Do NOT block on Nolan for ordinary engineering verdicts. Automate and continue through
all reversible, bounded work. Queue only genuine human gates: VISUAL PREFERENCE, REAL
EXTERNAL OWNER CONTACT, SECRET/CREDENTIAL DECISION, IRREVERSIBLE/PRODUCTION ACTION,
AMBIGUOUS CONSTITUTIONAL DECISION. Prepare evidence so each gate answers quickly.

## Standing lessons enforced this sprint

- Tests said green, product looked broken. Never again. Automated checks prove
  mechanisms; screenshots falsify presentation claims. Nolan makes final aesthetic
  judgment.
- Keep the failed screenshots as `before/` regression evidence.
- Every meaningful public-renderer change produces comparable captures at minimum
  375 / 390 / 1440 for COPPERSMITH and HAPPY PLACE.
- A COMPONENT EXISTING IN CODE IS NOT A PRODUCT FEATURE. Distinguish IMPLEMENTED /
  WIRED / RENDERED / INTERACTABLE / PROVEN IN BROWSER. Only the last relevant state
  earns product-green.

## External-owner safety blockers (before real owner consequential test)

- Misconfigured journal case: gateway pointed at journal lacking required overlay
  marker → emit/dump → typed WRONG_JOURNAL → ZERO WRITES. (Safety lane when ready;
  not a visual compiler blocker.)
- Q-P0-05 secret leakage and Q-P0-06 tenant isolation green or explicitly
  owner-deferred before expanding real external owner access.
- Monument View owner package remains PREPARED ONLY. DO NOT CONTACT.

## Operating rules

- Do not touch the 23 unrelated dirty files.
- Do not bounce the served demo (:3105) without authorized deployment/restart
  coordination.
- One clean commit per proven semantic unit. No pushes (Nolan's standing rule).
- Build. Test. Screenshot. Compare. Fix the first losing dimension. Repeat.
