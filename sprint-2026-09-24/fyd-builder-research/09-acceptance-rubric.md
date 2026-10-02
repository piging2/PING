# 09 — Acceptance Rubric: Side-by-Side Quality Gates

Compare: ORIGINAL HPP vs FYD HPP and ORIGINAL COPPERSMITH vs FYD COPPERSMITH, desktop + mobile.
The question for every pair: WOULD A BUSINESS OWNER CHOOSE FYD'S VERSION OVER THEIR CURRENT WEBSITE?
If NO on any must-win: DO NOT MOVE ON. Do not declare victory from unit tests.

## MUST WINS 1-8 (lose these and nobody cares about 9-12)

1. **Mobile experience.** Thumb-reachable primary CTA (sticky call/estimate on touch), tap-to-call formatted
   numbers, no horizontal scroll at 375/390, images sized for the viewport, nav collapses cleanly, text remains
   readable. Original HPP and Coppersmith are mobile-usable; FYD must match or beat.
2. **Service discoverability.** All real services reachable within one tap/scroll from the homepage; service lines
   named in nav where the business sells by trade (Coppersmith: Plumbing/HVAC/Cooling/Heating/Ventilation);
   each service has scope + conversion hook. FAIL today: FYD lists services but flattens taxonomy.
3. **Contact/conversion discoverability.** Phone visible and formatted above the fold on every page; estimate/quote
   path reachable from nav, hero, and at least one service surface; contact block with hours + address + email.
   FAIL today: raw E.164 button, "Visit website" abdication.
4. **Visual quality/credibility.** Would this pass a stranger's 5-second credibility test? Real photography,
   coherent palette, professional type, no demo chrome, no developer badges, no empty generic stock.
   FAIL today: conduit photo on carpentry site, SITE RECORD badges, "Generated site demo".
5. **Brand preservation.** Logo/wordmark present; palette and voice echo the source (HPP warm craftsman,
   Coppersmith trade authority); headline sells identity. FAIL today: identical theme on both sites.
6. **Media quality.** Every rendered image relevant to the business and the section; hero image documentary and
   on-trade; aspect ratios consistent; no cross-contamination between businesses. FAIL today.
7. **Performance.** LCP < 2.5s on mobile, images next-gen with sizes, no render-blocking theater, Lighthouse
   green or the visual quality bar fails with it. Screenshots at 375/390/1280/1440/1920 all captured.
8. **Accessibility.** WCAG 2.2 AA: contrast on all text (both themes), focus states, 44px targets, semantic
   headings (one H1, editorial), alt text from evidence, reduced-motion honored.

## FYD-SPECIFIC MUST WINS 9-12

9. **Ask FYD.** Concierge-quality answers about the business (services, area, hours, pricing signals), citations
   on demand, explicit "I can't verify that" when evidence is missing. Feels like the business, not a database.
10. **Conversational customization.** "Customize with FYD" accepts plain-language change requests, proposes,
    previews, applies with approval — the full intent->proposal->capability->approval->transition->projection
    chain behind a simple UX.
11. **Evidence/trust when requested.** Inspect affordance per claim cluster; sources and classification on demand;
    source-vs-owner-corrections visible; nothing repeated under every sentence.
12. **Safe regeneration.** Section-granular regeneration (regenerate Hero without touching Services); owner preview
    before apply; deterministic replay of every change.

## Comparison dimensions (per site pair, desktop + mobile)

Visual quality | brand preservation | service discoverability | contact discoverability | media use |
trust | mobile | performance | intelligence (Ask FYD quality, trust affordances, customization).

## Procedure

1. Capture ORIGINAL HPP vs FYD HPP and ORIGINAL COPPERSMITH vs FYD COPPERSMITH at 375/390/1440 (desktop+mobile).
2. Score each dimension pass/fail against the original, not against an abstract ideal.
3. Any must-win FAIL -> rebuild the failing section (section-granular regeneration), re-shoot, re-score.
4. Nolan does the final visual judgment on the real rendered screenshot (his product courtroom).
