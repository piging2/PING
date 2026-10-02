# Harvest provenance audit — ORCA + Mission Control convergence track

Audit date: 2026-09-26. Auditor: read-only provenance lane. Method: enumerated every
harvested item in the track's corpus files and lane branches; checked each for
SOURCE + LICENSE + VERSION/SHA against the harvesting law (design sprint
MISSION-ADDENDUM.md: "PIN DONOR SHAS", "OPEN SOURCE STILL REQUIRES LICENSE REVIEW",
every research lane returns PATTERN / SOURCE / LICENSE / ... / ADOPT-ADAPT-REJECT).

Scope: design-corpus.md (14 patterns), github-corpus.md (12 mechanisms),
harvest-gapfill.md (11 items), track-level concept harvests (5), lane
implementations on mc/* and spine/* branches (verified original, not harvests).

## Summary counts

| Status | Count | Meaning |
|---|---|---|
| PINNED | 1 | source + license + donor commit SHA all recorded |
| NEEDS-REVIEW | 17 | source recorded, license known or explicitly n/a, but no pinned SHA |
| MISSING | 23 | no license record, or no donor record at all |
| correctly REJECTED | 1 | item 12 (no license); the REJECT path working as designed |

## Table A — github-corpus.md (12 mechanisms; corpus states "nothing vendored")

| Item | Source URL | License | Version/SHA | Status |
|---|---|---|---|---|
| 1. Bento grid composition | https://github.com/andersoncollab/design-agent/blob/HEAD/skills/bento-layout/SKILL.md | MIT (skill frontmatter) | none (HEAD URL) | NEEDS-REVIEW |
| 2. Before/after slider (React) | https://github.com/r-senchuk/agentskills/blob/HEAD/.github/skills/before-after-slider/SKILL.md | MIT (skill frontmatter) | none (HEAD URL) | NEEDS-REVIEW |
| 3. img-comparison-slider web component | https://github.com/sneas/img-comparison-slider | MIT (repo page) | none | NEEDS-REVIEW |
| 4. STIFF scroll-reveal ladder | https://github.com/aponchikaj/stiff/blob/HEAD/.claude/skills/scroll-animation/SKILL.md | UNKNOWN (no license file/badge) | none (HEAD URL) | MISSING |
| 5. Sticky scroll-stack cards | https://github.com/sonhaicoder/web-taste-skill/blob/HEAD/skills/web-taste/references/motion-recipes.md | MIT (repo page) | none (HEAD URL) | NEEDS-REVIEW |
| 6. Parallax + count-up + hero choreography | https://github.com/sonhaicoder/web-taste-skill/blob/HEAD/skills/web-taste/references/motion-recipes.md | MIT (repo page) | none (HEAD URL) | NEEDS-REVIEW |
| 7. APG carousel state model | https://github.com/masup9/apg-patterns-examples/blob/HEAD/src/patterns/carousel/carousel.md | MIT (repo page) | none (HEAD URL) | NEEDS-REVIEW |
| 8. Utopia fluid type scale | technique writeups (repos unlicensed/unknown) | open technique, no code vendored | n/a | NEEDS-REVIEW |
| 9. Responsive image sizes patterns | standard_kit writeup + agentskills family | UNKNOWN for writeup; family MIT | none (HEAD URL) | MISSING |
| 10. Scroll-aware sticky navbar | devsnips / spell-ui / devfolio / ishan-ui writeups | UNKNOWN (no badges) | none (HEAD URLs) | MISSING |
| 11. Editorial image reveal vocabulary | writeup repos | UNKNOWN; generic CSS/GSAP recipes | none (HEAD URLs) | MISSING |
| 12. buildcraft-landing-page section system | https://github.com/galvinmariaalversa/buildcraft-landing-page | NONE DECLARED ("portfolio / demonstration purposes" only) | none | correctly REJECTED (not a gap) |

All 12 carry ADOPT/ADAPT/REJECT verdicts (law's verdict requirement: satisfied).

## Table B — design-corpus.md (14 patterns; header: "principles and mechanisms only. Nothing here is copied wholesale")

Per-pattern license field: ABSENT for all 14 (systematic MISSING, mitigated only by
the corpus-level "principles only" statement). Every GitHub URL uses /blob/HEAD/
(no pinned SHA). Source/provenance URL + read date recorded per pattern.

| Item | Primary sources | License | SHA | Status |
|---|---|---|---|---|
| P1. Emergency hero: phone as headline | colorlib.com/wp/plumbing-websites-design/ | not recorded | n/a (web article) | MISSING |
| P2. Triage form field | colorlib.com/wp/plumbing-websites-design/ | not recorded | n/a | MISSING |
| P3. Hero proof: named review + pin map | colorlib.com + squarewebsites.org article | not recorded | n/a | MISSING |
| P4. Named person + licence number | colorlib.com (plumbing study, journeyman template) | not recorded | n/a | MISSING |
| P5. Clip-path image reveal | mariusyvard/nulltohero, hipstersmoothie/standard-reader, mustbesimo/web-design-studio, deepception (GitHub, HEAD URLs) | not recorded | none pinned | MISSING |
| P6. Before/after slider | colorlib.com template descs; harinathsasikumar/interior-designer-firm-website, arsalan507/website-architect (GitHub, HEAD URLs) | not recorded | none pinned | MISSING |
| P7. Project gallery rhythm | mustbesimo/web-design-studio (HEAD), colorlib.com | not recorded | none pinned | MISSING |
| P8. Service index as hairline rows | mycelhq/mycel, betterlmy/agent-skills, wppilot-labs (GitHub, HEAD URLs) | not recorded | none pinned | MISSING |
| P9. Pinned masthead + sticky column | bthaas.github.io, saadmughal14/spreadhire-redesign, alanvaa06/award-craft (GitHub, HEAD URLs) | not recorded | none pinned | MISSING |
| P10. Sticky nav within budget | laith0003/ux-skill, kryhr/45-anti-slop-skills, aqibaslam/moves, r-senchuk/agentskills (GitHub, HEAD URLs) | not recorded | none pinned | MISSING |
| P11. Fluid type system | etr/groundwork, kaytm93/website-design-ultra, rajux75/expensec, betterlmy/agent-skills (GitHub, HEAD URLs) | not recorded | none pinned | MISSING |
| P12. Multi-step lead capture modal | arsalan507/website-architect, aqibaslam/moves (GitHub, HEAD URLs) | not recorded | none pinned | MISSING |
| P13. Service-area proof | colorlib.com, nurkamol/website-build-kit (GitHub, HEAD URL) | not recorded | none pinned | MISSING |
| P14. Count-up proof strip | bthaas.github.io, peterbamuhigire/design-system-skills, blyatiful1/ultraweb (GitHub, HEAD URLs) | not recorded | none pinned | MISSING |

REJECTED section (R1 horizontal scroll hijack, R2, ...) recorded with reasons;
rejection is compliant work, not a gap.

## Table C — harvest-gapfill.md (11 items; each states "Design inspiration, no license (n/a)")

| Item | Source | License | SHA | Status |
|---|---|---|---|---|
| G1. Hero self-segmentation tabs | Colorlib construction examples (Awwwards family) | n/a (inspiration) | none | NEEDS-REVIEW |
| G2. Lead form as hero | Framer marketplace "Contractor" template | n/a (inspiration) | none | NEEDS-REVIEW |
| G3. Photography-free typographic hero | Framer "Hartwell Builders" free template | n/a (inspiration) | none | NEEDS-REVIEW |
| G4. Tabbed service explorer | Framer "Briston" template | n/a (inspiration) | none | NEEDS-REVIEW |
| G5. Priced service index | cabstone.us (live site) | n/a (inspiration) | none | NEEDS-REVIEW |
| G6. Material-choice sub-taxonomy | cabstone.us (live site) | n/a (inspiration) | none | NEEDS-REVIEW |
| G7. Objection FAQ | cabstone.us (live site) | n/a (inspiration) | none | NEEDS-REVIEW |
| G8. Declutter caps | One Page Love article | n/a (inspiration) | none | NEEDS-REVIEW |
| G9. One-CTA discipline, ratio-locked spacing | One Page Love article | n/a (inspiration) | none | NEEDS-REVIEW |
| G10. Capability and place band | Colorlib construction examples | n/a (inspiration) | none | NEEDS-REVIEW |
| G11. Spectrum UI catalog discipline | github.com/arihantcodes/spectrum-ui | Apache-2.0 | acdc998c64829f8ae037be48e3c273ccc8d71f60 | PINNED |

G1-G10 are honestly recorded as inspiration-only; the latent gap is that if any
graduates to an adapted mechanism, no SHA exists to pin back to.

## Table D — track-level concept harvests (pattern names, no code taken)

| Item | Where referenced | Source URL | License | SHA | Status |
|---|---|---|---|---|---|
| LangGraph durable execution + HITL | orca-mc-convergence/BRIEF.md | none recorded | n/a | none | MISSING |
| OpenHands agent profiles + scoped secrets + MCP scoping | orca-mc-convergence/BRIEF.md | none recorded | n/a | none | MISSING |
| Temporal durable resumable workflows | orca-mc-convergence/BRIEF.md | none recorded | n/a | none | MISSING |
| ATProto granular progressive permissions | Batch 6 disposition | none recorded | n/a | none | MISSING |
| Agents SDK durable approval interruptions | Batch 6 disposition | none recorded | n/a | none | MISSING |

Concept-level only; no code vendored. The gap is the absence of any provenance
anchor if a future lane reaches for these.

## Table E — lane implementations (verified ORIGINAL; not harvests, informational)

| File | Branch | External donor? |
|---|---|---|
| mission-control/mission_intent.py | mc/mission-intent-frontdoor | none; support files from canonical git objects, SHAs in SUPPORT-FILES.md |
| orca-adapter/consequence/consequence.js | mc/consequence-policy-input | none; "vendored" refs are PING's own adapter/AGENT_PROFILES (internal) |
| mission-control/approval_request.py | mc/approval-request | none; "Generalized from FYD's owner proposal/approve/apply envelope" (internal) |
| orca-mc-convergence/mission-budgets/budget.js | mc/mission-budgets | none |
| mission-control/payload_lifecycle.py | mc/audit-payload-lifecycle | none |
| mission-control/emit.py, pass_queries.py, retry_policy.py | spine/x-pass-reached-path | none; retry theorem is internal (outreach/retry_policy.py) |

## Ranked gaps

1. SYSTEMATIC — no donor commit SHA pinned anywhere except G11. All github-corpus
   and design-corpus GitHub URLs use /blob/HEAD/ (a moving target). The harvesting
   law's "PIN DONOR SHAS" is unmet for 41 of 42 items. Fix: resolve each HEAD URL
   to the commit current on 2026-09-26 and record it; going forward, pin at read time.
2. github-corpus items 4 (STIFF), 9 (sizes writeup), 10 (navbar writeups),
   11 (editorial reveal): verdicts KEEP/ADAPT with license UNKNOWN. Adapting
   mechanisms from unlicensed sources is exactly what the law guards against.
   Item 12 proves the REJECT path works; these four need license resolution or
   rejection before any adaptation lands in the generator.
3. design-corpus.md has no license field per pattern (14/14 MISSING). Posture rests
   solely on the header's "principles only" statement. If any pattern graduates
   from principle to vendored mechanism, there is no license record to check.
   Fix: add a license/source-type line per pattern (article / template-desc /
   open-source-skill + license where known).
4. Track-level concept harvests (LangGraph/OpenHands/Temporal/ATProto/Agents SDK):
   zero provenance anchors (no URLs, versions, or doc SHAs). Concept-level today,
   but a future adapter lane would reach for them blind. Fix: one provenance row
   each with the doc/spec URL and version read.
5. G1-G10 are honestly "inspiration, no license (n/a)", but the n/a is declared,
   not verified (e.g., Framer marketplace templates have their own license terms;
   "free template" is not a license). If any Framer-derived layout ships in the
   generator, the template license must be checked first.

## Harvesting-law compliance check

- PATTERN / SOURCE / ... / ADOPT-ADAPT-REJECT / GENERIC RULE: satisfied in
  github-corpus (all 12 have verdicts) and design-corpus (14 verdicts + REJECTED
  section); gapfill has sources but no explicit verdicts per item.
- PIN DONOR SHAS: FAILED (1/42 pinned).
- LICENSE REVIEW: partial (github-corpus per-item; design-corpus absent;
  gapfill explicit n/a; concept harvests absent).
- "Don't import frameworks when a 30-line pattern is the actual value":
  satisfied (no framework imports; item 11 explicitly re-implements instead of
  taking the GSAP dependency).
- "Never copyrighted copy, logos, images, or whole pages": no violations found;
  corpora describe mechanisms and principles in the lanes' own words.
