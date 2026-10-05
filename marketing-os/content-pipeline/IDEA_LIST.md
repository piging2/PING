# Projection Content Creation — Idea List (Coordinator B, 2026-10-04)

Pinned from Nolan's binding directives:
- `~/workspace/directives/2026-10-04-marketingos-content-workflow.md`
- `~/workspace/directives/2026-10-04-marketingos-workflow-freeze.md`
- `~/workspace/goals/ping-agent-execution-stack/files/MARKETINGOS-CONTENT-DIRECTIVE-2026-10-01.md`

"Projection content creation" = deterministic content-compilation machinery that turns
projections/evidence into content artifacts WITHOUT inventing claims, upgrading epistemic
state, or creating new authorities/stores. Every item is a pure function over JSON/dict
inputs (stdlib Python only), plus a cheapest-relevant test.

| # | Slug | Idea | Directive source |
|---|------|------|------------------|
| 1 | claim-ledger | Claim ledger compiler: Claim \| State \| Evidence \| Counterevidence \| Reproduction \| Publication treatment. Guard: prose generation must never upgrade epistemic state (INFERRED never becomes PROVEN). | content-directive 2026-10-01 |
| 2 | source-packet | Source packet builder: deliberately overcomplete editorial intelligence packet (thesis, why-now, audience, evidence tiers, observations, possible arguments, counterargument, unknowns, firsthand evidence, demonstrations, hook candidates, narrative candidates, claim matrix CONFIRMED/REFUTED/UNCLEAR, visual opportunities, source material w/ provenance). | workflow 2026-10-04 |
| 3 | marker-metrics | Fact-check marker measurer: markers CONFIRMED/CORRECTED/QUALIFIED/REMOVED/UNRESOLVED; research-accuracy score + editorial-distance score. | workflow-freeze 2026-10-04 |
| 4 | edit-classifier | Editorial edit classifier: PROPOSED THESIS → OWNER EDIT → APPROVED THESIS with 12 edit classes (CLAIM REMOVED, CLAIM QUALIFIED, TECHNICAL DETAIL ADDED, COUNTERARGUMENT ADDED, HOOK REWRITTEN, HUMOR ADDED/REMOVED, JARGON REMOVED, EXPLANATION COMPRESSED, EXAMPLE REPLACED, STRUCTURE REORDERED, PERSONAL EXPERIENCE ADDED, EDITORIAL REJECTION). + Script→recording semantic diff: numbers/proper-nouns/technical-claims changed, qualifiers removed, new claims introduced, approved sections omitted, disclaimers removed. | workflow 2026-10-04 |
| 5 | production-manifest | Production manifest generator (SCRIPT_ID, SCRIPT_DIGEST, RECORDING_ID, RECORDING_DIGEST, DURATION, TRANSCRIPT_DIGEST, SCRIPT_TRANSCRIPT_DIFF, MEDIA_PLAN_ID, VIDEO_RENDER_ID, VIDEO_DIGEST, SUBTITLE_DIGEST, THUMBNAIL_ID, FACT_VERIFICATION_STATUS, EDITORIAL/MEDIA/PUBLICATION APPROVAL STATUS) + lightweight render packet builder (scene beats, visual purpose per beat, required factual visuals, generation prompts, target duration, aspect ratios, derivative opportunities). | workflow-freeze 2026-10-04 |
| 6 | video-verification | Multimodal video verification: findings classified CONTENT ERROR / VISUAL CONTRADICTION / SUBTITLE ERROR / PRIVACY-SECRET RISK / STALE SCREENSHOT / UNSUPPORTED VISUAL CLAIM / TIMING-EDITORIAL ISSUE / PASS. SCRIPT VERIFIED ≠ VIDEO VERIFIED. | workflow-freeze 2026-10-04 |
| 7 | distribution-package | Distribution package builder: title/hook/caption variants per destination, thumbnail concepts, chaptering, short-form cut candidates from SEMANTIC moments (not arbitrary timestamps), captions/subtitles, CTA variants, source/evidence appendix, publication proposal, experiment metadata, expected observation window + metrics. | workflow 2026-10-04 |
| 8 | derivative-lineage | Derivative lineage compiler: one canonical technical artifact → videos/shorts/posts/diagrams/articles/emails. Every derivative inherits claim IDs. A derivative may OMIT a claim; it may NEVER silently strengthen one. Stale claims traceable to every derivative. | content-directive 2026-10-01 |
| 9 | content-features | Computed content features (recommend-only, never publish authority): SurpriseDensity, EvidenceStrength, Reproducibility, PracticalConsequence, AudienceFit, NoveltyClass, ExplanationCost. | content-directive 2026-10-01 |
| 10 | prior-art | Prior-art collision classifier: KNOWN / KNOWN BUT DIFFERENT APPLICATION / KNOWN PRINCIPLE + NEW EMPIRICAL RESULT / APPARENTLY NOVEL IMPLEMENTATION / APPARENTLY NOVEL RESULT / UNKNOWN. + Novelty class recorder: empirical / mechanistic / explanatory. | content-directive 2026-10-01 |
| 11 | adversarial-review | Adversarial reviewer: attacks causality, sample size, novelty, benchmark fairness, confounders, unverifiable numbers, cherry-picking, terminology, security disclosure, reproducibility, prior art, overgeneralization, sensationalism, title-vs-experiment. Objections become structured evidence: OBJECTION → RESPONSE → SUPPORT → RESOLUTION (RESOLVED / PARTIALLY_RESOLVED / UNRESOLVED). | content-directive 2026-10-01 |
| 12 | epistemic-metadata | R0–R5 reproducibility grades as publication metadata + disagreement signal classifier (AGREEMENT / TECHNICAL_CORRECTION / COUNTEREXAMPLE / TERMINOLOGY_DISPUTE / PRIOR_ART_REFERENCE / REPRODUCTION_ATTEMPT / REPRODUCTION_SUCCESS / REPRODUCTION_FAILURE / IMPLEMENTATION_QUESTION / LOW_INFORMATION_REACTION) feeding INTELLIGENCE_RESEARCH missions + attribution strength (TEMPORALLY_ASSOCIATED / PLAUSIBLY_CONTRIBUTED / EXPERIMENTALLY_SUPPORTED / CAUSALITY_UNESTABLISHED) + effect chain tracker ARTIFACT→AUTHORIZATION→DISTRIBUTION→VERIFIED EFFECT→QUALIFIED ATTENTION→EXPERT RESPONSE→ADOPTION/INTENT→OUTCOME→ATTRIBUTION→LEARNING + artifact lineage projection nodes (RESEARCH→SOURCE PACKET→EDIT→SCRIPT APPROVED→RECORDING→RECORDING VERIFIED→MEDIA BUILD→MEDIA VERIFIED→PUBLICATION APPROVED→DISTRIBUTION→EFFECT→OUTCOME→LEARNING, each node answering what/who/digest/evidence/delta/approval/blocker). | content-directive 2026-10-01, workflow-freeze 2026-10-04 |

Implementation rules (all workers):
- Stdlib Python 3 only. Pure deterministic functions over JSON/dict. No network, no DB, no new authorities/stores.
- One worker owns `marketing-os/content-pipeline/<slug>/` exclusively.
- Search-first: check marketing-os/ and marketing-intel/ for an existing implementation before building; if found and tested, prove it (code path + test command) and mark DONE.
- Cheapest relevant test per idea (pytest if available else plain assert runner).
- Commit law: `git status` first, stage ONLY owned files (`git add marketing-os/content-pipeline/<slug>`), one semantic commit, never `git add -A`/`.`, never push.
- Claim classification on completion: IMPLEMENTED / TESTED.
- Do NOT touch: ui-next, Vercel FYD app, HPP assets, live social automation scripts, credentials.
