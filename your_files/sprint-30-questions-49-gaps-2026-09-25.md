# 30 Questions + 49 Proposed Backlog Gaps
2026-09-25, during the FYD compiler sprint. Nolan asked for 30 questions and 49 more gaps.

The 49 gaps are a PROPOSAL. They are not in BACKLOG_PING.md until Nolan says so.

---

## 30 QUESTIONS

### Proof and done metric
1. Owner half of the owner/visitor test: you are the stand-in owner, correct? No real Coppersmith owner contact anywhere in this sprint?
2. Should I prepare a Coppersmith owner outreach package (like Monument View's) while the build proves itself, or wait until it passes?
3. HPP "materially different": same skeleton with a different theme, or genuinely different composition? Where is the line?
4. Six gates: pass/fail each, or graded? What fails the sprint, one red gate or the overall picture?
5. Performance gate: a number (e.g. Lighthouse mobile 90+), or your judgment on a real phone?
6. Screenshot falsification: do you want every 375/390/1440 capture, or only the ones where something changed or failed?
7. At the 24h mark: live walkthrough or written proof package first?

### Ask FYD
8. Visitors see Ask FYD on day one, or owner-only until grounding is proven?
9. On INSUFFICIENT_EVIDENCE: offer to route the question to the owner (lead capture), or just stop?
10. Conversation context within a session, or every question standalone for the sprint?
11. Suggested-question chips in this sprint, or after the core proof lands?

### Owner loop
12. Sprint proof of the owner loop: natural-language change ("move emergency plumbing first") or UI controls, which one must work?
13. Owner change: apply immediately with undo, or preview-then-approve?
14. Source site changes under the owner's customizations: auto-update, propose, or wait?
15. Two sources disagree (website says X, Google says Y): what does the public site show before the owner weighs in?

### Privacy
16. Is the phone in the demo data real or synthetic? If real, a proven leak already exposed it.
17. Newly observed phone that is published on the business's own website: public-by-default or private-until-published?
18. "Show my business address": must the owner be able to publish street address without exposing every related location object?

### Compiler and design
19. How far may the generated site depart from the source site's look: same brand feel, or fully FYD's grammar?
20. Single-page or multi-page proof? (Services page, about page?)
21. Zero usable media: designed placeholder, text-only hero, or something else?
22. Are there business types where the identity-led hero is wrong, and the compiler must choose differently?
23. If the privacy fix proves real but risks the sprint clock, does it ship in-sprint or right after?

### Media and rights
24. Demo media: is hotlinking ever acceptable, or always download, digest, provenance?
25. Low-quality source images: use them anyway (authentic) or substitute a designed treatment?

### Evidence
26. Should the public site show "last verified" dates on facts?

### Business
27. After Coppersmith and HPP both pass: stay at two backends, or is there a third proof business in mind?
28. FYD: a service you sell, a product owners buy, or both? This shapes what the demo must prove.

### Blockers
29. Q-P0-05 (credential-shaped history entry) and Q-P0-06 (tenant isolation): do they block the demo, or are they explicitly deferred until a real external owner is near?
30. If the sprint needs more than 24h for the last 10 percent, stop at the clock or finish the dimension?

---

## 49 PROPOSED BACKLOG GAPS

Each names the missing mechanism and its failure mode. None are tracked yet.

### Build and render integrity
1. No build-time assertion that every family.css @import resolves. Failure mode: a dead import ships silently again, exactly like the theme failure.
2. No automated element-overlap check at 320/375/390 in CI. Failure mode: header collisions return.
3. No duplicate-visible-fact detector. Failure mode: the same fact renders in unlisted placements with no alarm.
4. No duplicate-media detector. Failure mode: one condenser image across every card again.
5. No horizontal-overflow assertion on generated pages. Failure mode: sideways scrolling on phones.
6. No touch-target minimum assertion. Failure mode: the 44px rule lives in code and rots.
7. No heading-hierarchy assertion. Failure mode: zero or three h1s, unordered headings.
8. No broken-image/empty-src gate in the render pipeline. Failure mode: dead image boxes on the public page.
9. No console-error/hydration-error gate on generated pages. Failure mode: runtime errors invisible to tests.
10. Theme token coverage unasserted. Failure mode: the family uses a utility with no token behind it and nobody knows.

### Consumption map
11. Planner rationale does not cite the rule that emitted each placement. Failure mode: repetitions with no attributable cause.
12. Secondary placements declare no semantic job. Failure mode: the allowlist becomes repetition with permission.
13. No cross-entity compiler test. Failure mode: the map works for Coppersmith and silently fails for the next business.
14. Consumption ledger has no machine-readable artifact. Failure mode: the dev proof stays prose and untestable.
15. No missing-content collapse test. Failure mode: empty services, no phone, or no address leave ghost sections.

### Responsive and header
16. No test that nav collapses before collision at narrow widths. Failure mode: nav crushes identity at 320px.
17. No identity-duplication assertion. Failure mode: logo/name block renders twice.
18. Sticky header has no overlap assertion against hero content. Failure mode: fixed bar eats the headline.
19. CTA groups have no wrap-intentionally assertion. Failure mode: orphaned buttons and mid-word breaks.

### CTA and capabilities
20. No "primary looks primary" assertion. Failure mode: CTA tiers flatten visually.
21. Unsupported actions can render as dead CTAs. Failure mode: buttons that do nothing.
22. URL allowlisting at the projection/render boundary has no adversarial test. Failure mode: javascript:/data: URLs slip back in.
23. Phone CTA has no tel: link format validation. Failure mode: tap-to-call broken on real phones.

### Media
24. Media ingest has no rights/source-policy field. Failure mode: demo media silently promoted to production reuse.
25. No derived-asset relationship. Failure mode: responsive derivatives untraceable to their original.
26. No designed fallback for zero usable media. Failure mode: empty hero holes.
27. Hotlink-vs-download policy unenforced in code. Failure mode: runtime dependency on source availability.
28. No media relevance scoring in code. Failure mode: fallback order is a plan, not behavior.

### Ask FYD
29. No suggested-question chips derived from graph schema roles. Failure mode: users ask unanswerable questions.
30. INSUFFICIENT_EVIDENCE has no owner-escalation path. Failure mode: dead ends instead of lead capture.
31. No unsupported-question taxonomy. Failure mode: competitor intel and unknowable pricing get improvised answers.
32. No abuse/rate guard on the public Ask endpoint. Failure mode: open endpoint, open abuse.
33. No public citation rendering. Failure mode: answers without human-meaningful provenance.

### Owner loop
34. No before/after proposal review card. Failure mode: owners approve what they cannot see.
35. No undo for applied owner changes. Failure mode: one bad change, no way back.
36. No owner notification when the source changes under customizations. Failure mode: silent drift.
37. No owner-facing changelog. Failure mode: "what changed on my site" is unanswerable.

### Regeneration and visual proof
38. No regeneration provenance. Failure mode: per-value changes have no recorded cause.
39. No pixel-diff visual regression harness between builds. Failure mode: regressions caught only by eyeball.
40. No accessibility gate on generated pages. Failure mode: contrast, focus order, and alt text rot.
41. No SEO sanity on generated pages. Failure mode: missing titles and meta descriptions ship.
42. No graceful unknown-path handling on the demo site. Failure mode: raw 404s.

### Privacy and safety adjacency
43. Renderer javascript: URL sink still open (FL-20260921-032). Failure mode: the hostile probe stays partial.
44. No favicon/logo fallback when no logo media exists. Failure mode: browser tab shows nothing.

### Operations
45. Port 3105 serve provenance unrecorded. Failure mode: nobody knows which build the demo serves.
46. No authorized deploy/restart checklist for demo updates. Failure mode: manual coordination, missed steps.
47. Sprint wake-lock reliability over 24h unproven on Windows/WSL. Failure mode: the 3am nap returns.
48. Battery drain rate under sprint load unknown. Failure mode: the 20% guard is a guess.
49. No sprint run record. Failure mode: the next post-mortem is reconstructed from memory.

---

Say the word and all 49 go into BACKLOG_PING.md as new items.
