# 24-HOUR DESIGN SPRINT — SCOREBOARD

Sprint: 2026-09-26 18:55 MDT -> 2026-09-27 18:55 MDT
Brief: ~/workspace/design-sprint-2026-09-26/BRIEF.md
Base: fyd/sprint-integration-2026-09-24 @ a8ed5103 (FYD-010 + P-01 merged, verified)

## The test

"If the business owner clicked Generate once and saw this, would we be proud to tell them this is their new website?"

## Lanes

| Lane | Status | Notes |
|---|---|---|
| HPP Archaeology | PENDING | |
| Design Harvest | PENDING | |
| GitHub Harvest | PENDING | |
| Typography | PENDING | |
| Media Composition | PENDING | absorbs SIDE-01 visual-identity work (worktree persists) |
| Motion | PENDING | |
| Mobile | PENDING | |
| Owner UX | PENDING | |
| Visitor Projection | PENDING | |
| Accessibility/Performance | PENDING | |
| Falsifier | PENDING | |
| Visual Identity + PING hero (ex-SIDE-01) | ABSORBED AS WORKSTREAM | worktree /home/nolan/worktrees/side-visual-identity; authorized assets public/images/ping-cosmos-hero.jpg + ping-mark.png untracked in main repo, must be ingested with provenance |
| Ask loop quality (ex-ASK-LOOP) | ABSORBED AS WORKSTREAM | worktree /home/nolan/projects/ping-ask-loop (ask-loop/fyd-ask-behavior); builds on merged FYD-010 boundary; coordinator sequences ask-file ownership |

## Loop log

(append: timestamp, what was generated, biggest defect found, generic fix, both-sites result, gates)

## Coordinator log

- 18:55 MDT: Sprint launched on Nolan's directive. SIDE-01 and ASK-LOOP closed (worktrees persist). Brief written. Coordinator dispatched.
- 19:00 MDT: Nolan enriched the mission (full spec in MISSION-ADDENDUM.md). Hard constraint: no new features on public HPP until projection separation fixed. 16-lane swarm, harvesting pools + URLs, harvesting law, visual-regression loop (existing machinery first), no design-score authority, one-click acceptance, checkpoints T+2 21:00 / T+6 01:00 / T+12 07:00 / T+18 13:00 / T+24 19:00 Sun. Steering sent to coordinator.

## Coordinator log

- 19:05 MDT: Phase 0 + harvest swarm dispatched (7 subagents): MAP-SURFACE, MAP-PROJECTION, MAP-MEDIA, MAP-RENDERER readers; HPP-ARCHAEOLOGY, DESIGN-HARVEST, GITHUB-HARVEST researchers. All findings land in findings/. Build lanes partition once maps land.

## Mission addendum absorbed (19:00 MDT)

Nolan's spec: ~/workspace/design-sprint-2026-09-26/MISSION-ADDENDUM.md (authoritative). Key deltas: HARD CONSTRAINT, no new features on public HPP until public/debug projection separation is fixed (lane 8 builds first); verbatim public-projection removal list; harvesting pools (Webflow design-systems, Spectrum UI, shadcn templates, Chromatic Playwright) + 11-category matrix + harvesting law (pin SHAs, license review, ADOPT/ADAPT/REJECT + GENERIC RULE, no framework imports for 30-line patterns); visual feedback loop on existing machinery; no automated design score (side-by-side original-vs-generated is final visual authority); one-click acceptance owned by lane 16; 16-lane roster below.

## Checkpoints (from ~19:00 MDT)

- T+2 21:00 Sat: root-cause comparison complete, hypotheses ranked.
- T+6 01:00 Sun: separation substantially complete, grammar v1, first screenshot comparison.
- T+12 07:00 Sun: media-aware composition, both sites diverge, regression loop running.
- T+18 13:00 Sun: kill weak mechanisms, keep generalizing improvements.
- T+24 19:00 Sun: fresh one-click generation, full proof, honest gaps report.

## Lanes (16 + 2 workstreams)

| # | Lane | Status | Notes |
|---|---|---|---|
| 1 | HPP archaeology | RUNNING | original vs FYD per-dimension |
| 2 | External visual harvest | RUNNING | + Webflow/SiteInspire/Awwwards pools per addendum |
| 3 | GitHub/open-source harvest | RUNNING | + Spectrum UI, shadcn templates; pin SHAs, licenses |
| 4 | Composition/planner falsifier | PENDING | hunts customer-specific hacks in planner |
| 5 | Media intelligence | PENDING | absorbs Workstream A output |
| 6 | Typography/spacing | PENDING | |
| 7 | Motion | PENDING | restrained reusable transitions |
| 8 | Public/debug separation | PENDING | FIRST BUILD (hard constraint); verbatim removal list |
| 9 | Owner UX | PENDING | Customize with FYD conversational |
| 10 | HPP visual falsifier | PENDING | four falsifier questions, side-by-side vs original |
| 11 | Coppersmith generalization falsifier | PENDING | same intelligence, plumbing/HVAC appropriate |
| 12 | Mobile/accessibility | PENDING | 320/375/390 first-class |
| 13 | Performance | PENDING | LCP/CLS/images/fonts measured |
| 14 | Screenshot/visual regression | RUNNING | coordinator-owned harness (shot-widths.cjs lineage) |
| 15 | Security/evidence | PENDING | gates: factual/privacy/determinism, no invented claims |
| 16 | One-click clean-checkout proof | PENDING | fresh generation from graph, no hand JSX, no customer conditionals |
| A | Object visual identity + PING hero (was SIDE-01) | TRACKED | worktree /home/nolan/worktrees/side-visual-identity @ 42f81d53 + uncommitted: media select chain (select.ts/types.ts), object-visual.tsx + tests, ping-hero.tsx, manifests/ping-fyd.json, run-ingest-supplied.ts, public/fyd-media/<2 hashes>/ |
| B | Ask FYD loop quality (was ASK-LOOP) | TRACKED | worktree /home/nolan/projects/ping-ask-loop, branch ask-loop/fyd-ask-behavior @ 42f81d53 + uncommitted: ask-composer.ts (+150), visitor-answer.ts, ask-loop-gaps.test.ts, updated ask batteries |

Hero assets (untracked, must survive): /home/nolan/projects/ping/public/images/ping-cosmos-hero.jpg, public/images/ping-mark.png.

## Loop log

- 19:05 MDT OBSERVE (baseline): 18 full-page screenshots captured (ping/hpp/copper x 320/375/390/768/1280/1440), zero page errors. Evidence: evidence/baseline/. Biggest defects confirmed visually: (1) "Generated site demo / Procedural clone proof" demo framing owns the header on every page; (2) SITE RECORD / WEBSITE STATEMENT pills + repeated Why this? on every card; (3) "Customize this site" engineering console (Up/Down/Hide per section, proposal digests, design tokens) rendered inline as page content; (4) DEMO OWNER MODE panel with ALLOW/DENY capability evaluations and attestation buttons consuming the bottom third; (5) internal semantics as copy ("Coarse public location claim from the website's structured data", "Person described in the website's structured data"); (6) gallery renders orphaned Why this? links with no visible images on mobile; (7) raw E.164 phone duplication. Harness: sprint-shots.cjs (Windows node + CDP :9223) + make-previews.ps1 + chunk-previews.ps1; full PNGs archived on Pig at C:/Users/nolan/design-sprint/shots/baseline.

## Coordinator log

- 19:10 MDT: Lane 2 (external visual harvest) DONE. 14-pattern corpus at findings/design-corpus.md with FYD signal triggers, verdicts, ranked top 6 for carpentry/HVAC. Gap: finished before the addendum pools arrived (Webflow design-systems, SiteInspire, Awwwards, etc.); a targeted gap-fill pass will cover them.

## Coordinator log

- 19:15 MDT: All Phase 0/1 readers done. findings/ now has: map-surface.md (16-row leak inventory), map-projection.md (render seam spec), map-media.md (SIDE-01 re-observed, per-site media inventory), map-renderer.md (pipeline + hook points), hpp-archaeology.md (301 lines, original repo sourced, top-5 gaps), design-corpus.md (14 patterns), github-corpus.md (12 mechanisms). Worktree /home/nolan/worktrees/design-lane-08 created on branch design/lane-08-public-projection @ a8ed5103. Launching lane 8 (first build) + gap-fill harvest + lane 4 planner falsifier (read-only).

## Coordinator log

- 19:20 MDT: Dispatched lane 8 builder (worktree design-lane-08, branch design/lane-08-public-projection), gap-fill harvest (addendum pools, 1h timebox), lane 4 planner falsifier (read-only). Lane table: 8 RUNNING, 4 RUNNING, 2/3 DONE (+gapfill RUNNING), 1 DONE, 5/6/7/9/10/11/12/13/15/16 PENDING, 14 RUNNING (coordinator harness), A/B TRACKED.

## Coordinator log

- 19:00 MDT: Gap-fill harvest DONE. 11 new patterns, zero overlap with the 26 existing (37 total). Spectrum UI pinned at acdc998c64829f8ae037be48e3c273ccc8d71f60 (Apache-2.0). Standouts: embedded lead form in hero, photo-free typographic composition for media_count < 3, per-service price ranges. Low-yield sources recorded (Webflow design-systems, Awwwards, SiteInspire trade search).

## T+2 CHECKPOINT (21:00 MDT): root-cause comparison, research matrix, ranked hypotheses

### 1. Root-cause comparison: original HPP vs FYD HPP (evidence: findings/hpp-archaeology.md, baseline screenshots)

The original's compositional idea: photography carries the page, typography lives inside it. Full-bleed hero photo (75-88svh, scrim) with text on it; 4:3 mounted service photos; bento featured work with on-photo captions. Remove the photos and the page has no composition left.

FYD's page is an engineering harness with a thin business band. Roughly a third of visible elements are internal tooling. Hard numbers:

| Dimension | Original | FYD |
|---|---|---|
| H2 scale | 36/48px bold Playfair | 24/30px semibold |
| Section padding | 96/128px | 56px |
| Container | 1280px | 1024px |
| Hero | full-bleed photo, text on image | 256/320px strip above text slab |
| Body | Georgia serif | Geist sans |
| Cards | 12px radius, warm shadows | 8px flat bordered boxes |
| Header | business nav | "Generated site demo / Procedural clone proof" |

Data-layer bugs with visual consequences: "Happy Place Carpentry LLC" (no LLC in original), wrong service taxonomy (Painting/Drywall/Restoration vs Decks/Fences/Pergolas/Remodeling/Built-ins), raw +15412865190 (original formats 541-286-5190), duplicated About copy.

### 2. Research matrix: 37 patterns, 3 corpuses, all harvest-law compliant

- design-corpus.md: 14 patterns, FYD signal triggers, ranked top 6 (project gallery, image reveal, before/after slider lead)
- github-corpus.md: 12 mechanisms, SHA-pinned, license-recorded, KEEP/ADAPT/REJECT (1 REJECT: unlicensed buildcraft)
- harvest-gapfill.md: 11 patterns, zero overlap, spectrum-ui pinned acdc998c64829f8ae037be48e3c273ccc8d71f60 (Apache-2.0)

### 3. Ranked hypotheses (defect -> upstream owner -> smallest generic fix)

1. WRONG PROJECTION (a third of visitor HTML is harness) -> lane 8 render seam (RUNNING). Fix: projectForViewer with fail-closed viewer classifier.
2. Print-Business composition (fixed-shape sections, ignored policy values, hand-pinned vectors) -> lane 4 composition compiler (RUNNING). Fix: signal-derived 8-dim vector + pure section-transform step; applyArchetype (zero callers) is the skeleton.
3. Photography does not drive composition (strip hero, photoless cards, orphaned gallery) -> lane 5 media intelligence (RUNNING) fed by Workstream A chain. Fix: richness scoring, focal points, dimension gate, real alts.
4. No typographic drama (numbers above) -> lane 6 type system (RUNNING). Fix: clamp() modular scale, 16px floor, 96/128 rhythm, 1280 container.
5. Internal semantics as copy ("Website statement", "Coarse public location claim", E.164) -> lane 8 quiet Source affordance + copy audit.
6. Demo pins defeat compiler validation (STRATEGY_PINS short-circuits signal inference) -> lane 4 removes or env-gates.

### 4. Lane status

RUNNING: 4, 5, 6, 7, 8 (builders, isolated worktrees, one-writer table enforced). DONE: 1, 2, 3 (+gapfill), 4-falsifier. PENDING: 9 (owner UX, after lane 8 seam), 10/11 (visual falsifiers, after first regeneration), 12/13/15/16, A/B (TRACKED). 14 (screenshot harness) operational: 18 baselines captured.

### 5. Risks

- Integration merges are the coordinator bottleneck (5 branches -> one sprint branch, each replayed from clean checkout).
- Lane 8 is the hard-constraint gate: no public-page visual work lands until separation passes.
- Service taxonomy bug (Painting/Drywall vs Decks/Fences) is a data-layer issue, not a design issue; needs a lane or owner correction, flagged for T+6.

## Coordinator log

- 21:06 MDT: Lane 5 first attempt ERRORED (inference truncation, no work written; worktree verified clean). Re-dispatched lane 5 builder on the same worktree/branch with a shorter report cap. Lanes 4, 6, 7, 8 still running.

## Coordinator log

- 21:07 MDT: Lane 6 (typography) VERIFIED PASS from clean checkout: merged design/lane-06-typography (df5f38d0 + e3af1d89) onto a8ed5103 in a fresh worktree; 48/48 tests, 2 snapshots, tsc clean. Staged for integration after lane 8. Lanes 4, 5, 7, 8 still running.

## Coordinator log

- 21:08 MDT: Lane 7 (motion) VERIFIED PASS from clean checkout: 46/46 tests, new files only (src/fyd/motion/*). Caveat: no real-browser tests on the Pig (chrome-headless-shell missing libnspr4); browser smoke test deferred to the coordinator's screenshot harness. Staged for integration after lane 8. Lanes 4, 5, 8 still running.

## Coordinator log

- 21:09 MDT: Lane 5 (media) VERIFIED PASS from clean checkout: 166/166 tests, tsc clean. Diff: richness.ts (new), select.ts gallery dimension gate, types.ts focalPoint (additive, byte-identical to SIDE-01 shape), manifest backfill (focal points + real alts on 16 assets, 5 brand badges gated out of Coppersmith gallery). Staged for integration after lane 8. Lanes 4, 8 still running.

## Coordinator log

- 21:25 MDT: Lane 4 (composition) VERIFIED PASS from clean checkout: merged a4cd616c onto a8ed5103; new signals/composition/dimensions suites 29/29, INV-02 4/4, tsc clean; full builder suite 128/134 with the exact 6 pre-existing failures the lane claimed; invariants inv-11 4 failures confirmed identical at base (pre-existing). Staged for integration after lane 8. Lane 8 still running; it is the hard-constraint gate.

## Coordinator log

- 21:30 MDT: Lane 8 (public/debug separation) VERIFIED PASS from clean checkout: merged 6ab560c3 onto a8ed5103; 14/14 projection + 4/4 visitor-chrome tests, tsc clean. The hard-constraint gate is DOWN: public-page visual work is now unblocked.
- 21:35 MDT: INTEGRATION COMPLETE on branch design/sprint-visual-v1 (worktree /home/nolan/worktrees/design-sprint-visual-v1): merged lanes 8, 4, 5, 6, 7 in order, zero conflicts. tsc clean. Suites: sitespec 131/131, components 127+4 pre-existing (ping-fyd-dogfood), builder 128+6 pre-existing, media 166/166, theme 48/48, motion 46/46.
- 21:40 MDT: Dispatched RENDER-WIRE (branch design/lane-render-wire from sprint-visual-v1): wires the type system into per-page styles, renders compositionVariant per section, builds the full-bleed photographic hero, wires quiet Source + motion primitives, fixes the /sites path skipping planSite. Owns renderer.tsx/hero-section/section components only.
- 21:40 MDT: next build of sprint-visual-v1 running in background; will serve on :3200 (dev port, DEMO_OWNER_MODE=1 to prove the visitor-stays-clean invariant) and screenshot for the first projection-fixed comparison.

## Coordinator log

- 21:50 MDT: sprint-visual-v1 built clean (next build exit 0) and serving on :3200 with NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 (the production condition). /sites/happy-place 200. Screenshot loop running against :3200 -> shots/v1-separation. RENDER-WIRE still building.

## Coordinator log

- 22:05 MDT: Screenshot runner fixed (run-shots.ps1 was never deployed; created + deployed; must call powershell.exe explicitly). v1-separation capture running against :3200.

## Loop log

- 22:20 MDT OBSERVE (v1-separation vs baseline): lane 8's separation VERIFIED VISUALLY on :3200 with DEMO_OWNER_MODE=1. Gone: "Generated site demo / Procedural clone proof" labels, SITE RECORD / WEBSITE STATEMENT pills, per-card Why this? drill-downs, "Customize this site" console, DEMO OWNER MODE panel, raw digests/sequences. Pages roughly half the height. Evidence: evidence/v1-separation/.
- Remaining for RENDER-WIRE/follow-ups: (1) hero still a photo strip above text slab, not full-bleed; (2) "Business: ... ->" object pill still in hero; (3) About duplicates hero copy verbatim + third business card; (4) "Coarse public location claim from the website's structured data" still customer-facing copy; (5) raw +15412865190 duplicated; (6) gallery shows 1 photo then a large empty gap; (7) "Featured object" pill with no content; (8) header still "FYD SOCIAL", not the business identity; (9) type scale still small (pre-render-wire build).

## Incident 20:06-20:12 MDT: both servers killed, recovered

- At ~20:06 MDT both :3100 (production) and :3200 (sprint proof) next-servers were gone: no listeners, no processes, no OOM, no log errors. 3100.log last write 20:06:02, matching RENDER-WIRE's completion (02:06:26Z). Likely cause: the lane's temp-:3102 cleanup used a broad process kill instead of PID-scoped stop.
- Recovered 20:12 MDT: :3100 via /home/nolan/start-3100.sh (healthy, happy-place 200); :3200 restarted from design/sprint-visual-v1 with NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 confirmed in process env.
- Note: pre-compaction summary timestamps (21:00-22:20) do not match Pig clock; real times reconstructed from file mtimes. Sprint is ~1h in, not 3h.

## Loop log

- ~20:30 MDT OBSERVE (v2-renderwire vs v1): render-wire + evidence-ref fix integrated (design/sprint-visual-v1 @ 8dc68e4a), rebuilt, :3200 serving, 18 screenshots, 0 page errors. Evidence: evidence/v2-renderwire/.
- WINS: full-bleed photographic hero with text on image + scrim (mobile + desktop); fluid type scale up; services as editorial rows (HPP) with full descriptions; debug chrome still absent; /sites/hpp 200 through planSite.
- DEFECTS (falsifiers dispatched): (1) purple initial badges (F/D/P/R/A) at section edges on visitor page; (2) hero tagline redundancy ("X -- locality" then locality again); (3) "Business: ..." object pill in hero; (4) large empty gaps between sections (empty sections not omitted); (5) "Featured object" label with thin content; (6) "Coarse public location claim from the website's structured data." still customer-facing; (7) contact as floating raw links; (8) header "FYD SOCIAL" not the business; (9) Coppersmith hero H1/tagline overflow at 390px; (10) mobile gallery shows 1 of 5 photos.
- FIXED this loop: planSite BindingVerificationError (HTTP 500) for overlay-touched graphs. Root cause: planner stamped base provenance.ref while verifier demanded currentEvidenceRef; no output could satisfy both gates. Fix (4c947384): one semantic, currentEvidenceRef, stamped by planner, checked by assertGeneratedPresentationVerified, enforced by verifier. Regression test fails pre-fix with the exact production error, passes post-fix. Builder 129 pass (6 pre-existing failures identical at base), sitespec 131/131, tsc clean.
- INCIDENT: ~20:06 MDT both :3100 and :3200 killed (likely render-wire temp-server cleanup, broad kill). :3100 recovered via start-3100.sh, :3200 restarted. AGENTS.md rule added: PID-scoped temp-server stops only.

- ~20:35 MDT HPP falsifier returned (read-only, vs orig-hpp captures in evidence/orig-hpp/). Top 3 falsifications:
  F1. MarginObjectLayer glyphs: GLYPH-state object circles (letters F/D/P/R/A from ObjectCircle.tsx:439) mounted on the VISITOR page via site-client.tsx MARGIN-1 with no debug flag. Verdict: do not mount MarginObjectLayer in the visitor projection; gate on viewerKind.
  F2. Masthead brands "FYD SOCIAL" (hardcoded kicker in site-client.tsx), not the business identity. Fix: project owner object identity (name/logo) into the visitor masthead; platform mark to quiet footer.
  F3. Hero: heroMediaFor() falls back to photographic[0] (ingest order) with no composition-fitness ranking, so a dark pipe frame wins; headline degrades to legal name; subhead is a name+location dump; "Visit website" CTA is self-referential. Fixes: rank hero candidates by aspect/luminance fitness; prefer benefit/positioning heading from graph with legal name as fallback; drop self-referential CTA, use conversion intent or omit.
  Also confirmed: services as flat list vs original photo cards; "Coarse public location claim..." is internal-semantics-in-copy. Generated page wins: tap-to-call above fold, full service descriptions, Source provenance affordance (wording too internal).
- Coppersmith falsifier still running; fix lane waits for both reports.

- ~20:40 MDT Coppersmith falsifier returned (read-only; new evidence v2rw-copper-1440-c1.jpg). Top 3:
  F1. Internal narration in visitor copy: "Business:" pill (ObjectDoorway kindLabel prefix), "Featured object" default heading (ObjectRailSection), "Person described in the website's structured data." / "Coarse public location claim..." bound as public descriptions (proceduralizer.ts:916, compile-tenant.ts:369). Fix: projection invariant against provenance-narration descriptions; drop kindLabel prefix; delete default heading.
  F2. Hero "Call 970-245-3869" is a details-disclosure, not a tel: link (FydContactLink, deliberate). Conversion-killing for an emergency plumber. Fix: real tel:/mailto: anchor as primary action, disclosure as secondary affordance.
  F3. "FYD SOCIAL" header + FydMark on every card + margin initial-coins = someone else's brand. Fix: business wordmark in header; gate ObjectAffordance and margin layer to non-visitor viewerKinds.
  Also: hero lead overflows/clipped at 390px (overflow-wrap + planner rule); empty sections (People:8 junk card, rail display:none on mobile, near-empty Gallery/Contact); contact as raw links; featured object duplicates in-flow content.
- Polish lane dispatched: design/lane-polish-f1, all 12 fixes (P0/P1/P2), component tests required, no merge by the lane.

- ~21:10 MDT POLISH LANE DONE (implementation + local validation), SYNC BLOCKED: the Pig is unreachable (standby; proxy leg down, direct Tailscale SSH blocked from Hatch, no WoL mechanism). Lane work validated on Hatch: tsc clean, site-header 5/5, public-copy 5/5, object-affordance 5/5, cta-conversion 6/6, planner 30/30. Verified the lane tree contains the evidence-ref fix (currentEvidenceRef in all 3 files + regression test), so the sync cannot regress the 500 fix. File list staged at lane-polish-f1-files.txt (30 files).
- Wake-watch cron `pig-wake-watch-polish` (every 15m, first run ~21:25 MDT): runs pig-wake-resume.sh (idempotent, stateful) which on Pig wake does sync -> Pig-side tsc+tests -> commit -> merge into design/sprint-visual-v1 -> rebuild -> PID-scoped :3200 restart -> curl 200 checks -> 18 v3 screenshots, then removes itself and reports DONE/FAILED. Status: pig-wake-resume.status.
