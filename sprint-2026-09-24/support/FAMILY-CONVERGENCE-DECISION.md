# FYD Family Convergence Decision — Phase 2 (2026-09-25 night)

## Base
builder-v1 family (`fyd/builder-rebuild-v1`, writer worktree
`/home/nolan/worktrees/fyd-family-converge`). TRADESMAN and DEHPP converge
INTO it; no third family.

## ADOPT (as-is)
1. 11-component registry + surface separation (visitor/owner/trust/dev) +
   fail-closed unknown component/variant.
2. Quiet InspectAffordance ("Why this?" one per cluster → ObjectView).
   Better than TRADESMAN's tooltip-only TmWhyThis.
3. Human phone ("Call (970) 245-3869", E.164 under tel:) — shared.tsx.
4. Human hours (formatHoursDisplay) — shared.tsx.
5. DTCG token compiler + compiled-theme seam (constitutional direction;
   supersedes TRADESMAN's static WARM-CRAFT CSS).
6. Deterministic catalog-driven planner + responsive contracts.
7. Taxonomic navigation (service lines, never generic Home/About).
8. Sticky mobile call/estimate bar + AskFYD floating entry above it.
9. HPP H3 (Q-D verified): explicit-light default — OS prefers-color-scheme
   must NOT override the curated palette; dark only by explicit opt-in.
   The family has no dark mode at all, so this holds by construction
   (family.css contains no prefers-color-scheme dark branch). No change needed.
10. HPP H3 (Q-D verified): config v1.json {version, generatedAt, payload}
    envelope proven stable across 145 commits — take envelope/domain-shape
    discipline, none of the churned HPP values. (Family uses planner+graph,
    not HPP configs; noted for future config work.)

## ADAPT (concept ported to family idiom)
1. **Whole-card service → estimate link** (HPP pattern #1 + TRADESMAN
   TmServices `<Link className="group block h-full">`). Family ServiceGrid
   cards become whole-card anchors to the service's quote-start href.
   Never a dead link: no quote-start binding → non-link article.
2. **Estimate anchor target**: all family estimate CTAs point to `#estimate`
   but no element carried that id (dead anchors). ContactCTA conversion-dual
   (the estimate-entry CTA section, HPP pattern #5) gets `id="estimate"`.
3. **Per-card "Ask about this service" link removed**: it competes with the
   card's conversion job; the floating AskFYD entry covers questions.
   (HPP conversion hierarchy: estimate is the primary per-card action.)

## REJECT
1. TRADESMAN tooltip-only TmWhyThis (family's ObjectView-routed affordance wins).
2. TRADESMAN static WARM-CRAFT CSS (DTCG compiler is the direction).
3. DEHPP as a separate family (converge, don't multiply).
4. HPP 7-step wizard as a family section (app surface; family provides
   estimate ENTRY points only).
5. HPP H3's ~95% churn (workbench/gallery/Drive/OAuth/CI) — Q-D REJECT.
6. HPP H3 site-header ThemeToggle ungating — N/A (family has no theme toggle).

## DEFERRED (not for the 05:00 proof)
- Service-group rendering (TRADESMAN TmServiceGroup): Coppersmith fixture
  has 4 flat services, no group evidence. Planner/type extension recorded
  for a business with real group evidence (HPP has 6).
- Privacy-branch cherry-pick: HELD (see VISIBILITY-SEAM note below).

## VISIBILITY SEAM — finding (fix-or-HOLD resolved as HOLD with record)

**FALSIFIER CORRECTION 2026-09-25 ~20:50 MDT (supersedes earlier claims):**
The Sep-25 privacy branch (`fyd/privacy-projection-p0`, commits `ecd2ef9`/
`7e6b81c`/`f5d2de4`) was NEVER merged and its git objects are LOST. The
integration branch `fyd/sprint-integration-2026-09-24` does NOT carry its
guarantees. Verified 4/5 divergences:
1. Hidden phone scrubbed from structured fields but NOT from prose
   (title/description pass through `applyFieldVisibility` untouched).
2. Owner correction surfaces (`ownerFieldCorrections`, title, description)
   never scrubbed.
3. Equal-version HIDE/SHOW conflicts fail OPEN and order-dependently
   (later array element wins; `[hide@1, show@1]` shows).
4. Ask citations/objectRefs/evidenceRefs serve internal graph IDs publicly.
Only "source never mutated" holds. Full evidence:
`~/workspace/sprint-2026-09-24/orca/H1-VERIFY.md`.

**Consequence for the family proof:** Assume ZERO privacy guarantees from
prior lanes. The Coppersmith proof fixture contains only public website-
derived data (no hidden fields, no owner corrections), so the gaps do not
affect this proof's correctness. Any future site with hidden fields or
owner corrections MUST NOT rely on the integration branch's visibility
seam. Post-05:00, Nolan chooses: re-implement the four behaviors in a new
writer lane, or explicitly retire the claims.

The single publication-policy seam ALREADY EXISTS in main and is wired:
`verifyPublicProjection` + `decisionsForGraph` → branded
`VerifiedPublicProjection`; site render (spec-pipeline), Ask (ask-pipeline
resolves real decisions, passes via fieldVisibilityDecisions), and object
views (composeObjectView takes the branded projection) all flow through it.
`visitor-answer.ts`'s `?? []` is correct (route-supplied decisions).
NOT integrated (orphaned privacy branch, git metadata lost):
- fail-closed equal-version conflict resolution (main uses last-write-wins
  `d.version >= best.version` in field-visibility.ts:112);
- projection-closure scrubbing (hidden values scrubbed from title/
  description prose and ownerFieldCorrections).
The orphaned visitor-answer.ts is OLDER than main's (3-class vs 5-class
contract); its citation work is superseded, not cherry-pickable.
HELD for the privacy-lane owner: needs a proper rebase, not a midnight
cherry-pick. No product-lane change tonight.

## INFRASTRUCTURE NOTES
- :3105 is a ZOMBIE: cwd `/home/nolan/worktrees/copper-v2 (deleted)`,
  root 200 (stale surface), /sites/coppersmith-plumbing/v2 → 500
  (route never deployed there). Do not touch; proof uses a fresh port.
- Dirty-file figure retired (Q-E): 1489 untracked files, ZERO modified
  tracked files across all four repos. Writer worktree clean.

## INSPECTOR 2 ALIGNMENT (TRADESMAN-DEHPP-INSPECTION.md, 2026-09-25 ~20:40 MDT)
- Confirms: one family; TRADESMAN sections become presentation variants
  behind builder-v1's registry; DTCG compiler wins as token authority;
  WARM-CRAFT survives as preset data.
- TmReviews evidence-gating (stars only with rating, honest empty state)
  ADOPTED as the discipline for when reviews exist. Family planner's
  omit-when-absent stands for the empty case.
- why-this.tsx: family's InspectAffordance (ObjectView-routed, one per
  cluster) already supersedes the tooltip-only marker; no duplication.
- TmServices grouped guard: ADOPT as canonical for hierarchy-preserving
  rendering; deferred to post-05:00 (no group evidence in Coppersmith fixture).
- DEHPP parameterization grammar (P1/P2/P12/P13 params, composition
  profile, P5 copy tables, B3 server seam, B4 media seam, B6/N14
  social-proof gate): ADOPT post-05:00 as the converged family's
  composition authority. Not in tonight's proof scope.
- TmNewsletter + hand bindings + hand fixtures: REJECT (concur).
- TRADESMAN has zero tests: family's __tests__ must cover adopted
  patterns before convergence lands (post-05:00).
