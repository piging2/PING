# Integration Ledger 05 — 2026-09-29 ~11:30 MDT
**Interval:** CEO-ORDER-LEDGER04-CORRECTION → execution. Coordinator: convergence interval 5.
**Branch:** `security/secret-redaction-2026-09-28` (workspace). Nothing pushed.

## Headline verdict: SUBSTANTIATED INTEGRATION PROGRESS THIS PERIOD

Two more MVP arrows closed, branch convergence executed, stranding finished.

## ARROWS

**WHY THIS → EVIDENCE: GREEN (WIRED / REACHED / PROVEN).** Writer A built the why-this route + `why-this-steps.ts` as a projection of the SAME evidence identity that survived Ask — no new evidence-ID class, no provenance store, no new graph (the CEO's grill item is satisfied). Live on served :3100, Why This returns the correction-aware X/Y response: `sourceSays: X`, `ownerSays: Y`, `governs: "owner"`, chain Source → Observed-when → Evidence → Support.

**OWNER CORRECTION → REGENERATION SURVIVAL: GREEN (WIRED / REACHED / PROVEN).** Live proof on served :3100 (build `n5yNoES2qzaC2jm_jvn1i` @ `50923738`, then re-verified on the integrated build below): SOURCE X → GENERATED X → OWNER CORRECTS TO Y → GENERATED Y → SOURCE REFRESH STILL X → REGEN → GENERATED Y. Digest-survival confirmed (composed graph digest `db8e6779…` stable across refresh+regen, not just string match). Source X preserved as evidence; owner Y governs presentation; Why This still distinguishes X from Y. The live proof caught a real defect: intent parsing lowercased the owner's Y ("We fix small problems…" → "we fix small problems…") — fixed with the `/i` flag + regression test, committed as `50923738`. Three Writer A commits: `954b4e64` (correction-half wiring), `e011b20f` (arrow end to end), `50923738` (case fix). Proof target was the Happy Place Repairs service (tenant-agnostic overrides/regen machinery; PING stays the adversarial fixture).

## CONVERGENCE

**7 of 7 must-harvest groups reached the served line.** Writer B produced 8 atomic commits (A–G + H-part) in an isolated worktree, each with donor provenance; coordinator rebased onto `50923738` with ZERO conflicts (zero file overlap with Writer A's 16 files) and fast-forwarded `fyd/convergence-2026-09-28` to `000ea349`. 43 files, +4603/-50. Rebased SHAs: `3ba537af` (A: Mission Control API surface), `e53cb076` (B: secret-broker, redteam 24/24), `2c5b4017` (C: digest-law dedup), `d2717369` (D: owner panel), `758cf20d` (E: dev objects lab), `6ccf210a` (F: UI components), `2e0806e6` (G: tests/config), `000ea349` (H-part: ping-fyd.json, evidence-side only). Nothing demoted; no superseded artifacts; no reverse merge; trackc untouched (donor-only). Group H: the other 3 manifests contain BOTH evidence-side observations and generated projection metadata — per the rubric they require a media-pipeline schema decision (split ownership without duplicating the asset) → reported PENDING, not integrated.

**Integrated-line verification:** tsc clean except the 5 pre-existing redteam errors (same bytes as donor); Ask suites 343/343 + 99/99; harvested suites 24/24 + 4/4 + 2/2 + 3/3. Rebuilt, restarted via `/home/nolan/start-3100.sh`, serving build `vy3Sa9KU92_KTdVMlFpY_` @ `000ea349` with `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` verified live; Ask ping-fyd still SUPPORTED BY MULTIPLE EVIDENCE with citations and visible staleness.

## STRANDING

**26 → 0.** All 26 dispositioned (20 REFERENCE, 6 SUPERSEDED, 0 harvest/0 wip/0 disposable/0 collision/0 secret-blocked), all 26 worktrees retired with branch refs retained, 12 node_modules dirs deleted as proven-disposable, inventory committed as `be44ee1e`. Copper-v2 remains BLOCKED-COLLISION, untouched. Key find routed mid-interval: `phase1/approval-door-2026-09-28` was classified by Writer A as DO NOT HARVEST — semantic duplicate of the served overrides pipeline (harvesting would have created a second proposal queue/journal/gate, violating the Rule of One); ref retained as reference.

## TRUTH

**No new semantic authority created.** Why This reuses the object's existing provenance identity for X and the attached `OwnerFieldCorrection` for Y. Correction authority stays separate from visibility policy (FYD KNOWS ≠ FYD PUBLISHES); backend correction requires owner capability (demo-stamped, never production). Recorded, unsolved: site-resolution duplication (BUILD AND ASK DISAGREE ABOUT ENTITY EXISTENCE — no SiteAuthority); PING knowledge staleness kept visible as adversarial fixture.

## PRODUCT

**Yes.** The owner can now see why FYD believes something (Why This: source/owner/governs), correct it (digest-bound propose→approve with baseStateDigest TOCTOU, tier MEDIUM, patch preview), regenerate, and retain the correction (digest-survival proven live). Seven owner statements: UNDERSTOOD / CAN SHOW WHY / CAN FIX IT are now green on the served line; CHANGES SAFELY / REMEMBERS DECISIONS have their first live proof; STAYS CURRENT remains the known next defect (acquisition lane).

## Falsification queue (read-only probes, no fixes)

- **Intent-routing defect** (website-design → phone-number): REPRODUCED live, REACHED, owned by the contact branch gate (`ask-composer.ts:1442`) re-consuming "website" after the services branch silently skips ungrounded topics; smallest delta named (negative guard on the contact gate + honest `unknowns`); dead `detectIntents()` classifier disagrees but is not on the served path. Does NOT block the correction arrow → stays queued.
- **CRX state reconciled:** "clean 6c4b531" and "dirty 74fbb74" were never the same checkout. `constitutional-runtime` @ `74fbb74` is the freshest audit-examined line (its "dirt" is a CRLF line-ending artifact — zero real content diff); `CRX_REMOTE` @ `b833d91` is an older diverged line. Authoritative for future harvest: `constitutional-runtime` @ `74fbb74`, normalize line endings before diffing. No wiring, no services, no translation layer. CRX remains a mine, not a dependency.

## Pending / next

Owner decisions unchanged (credential containment, `f21ba933`, corrupt `fyd/builder-rebuild-v1`) + one new: media-pipeline schema decision for the 3 dual-nature manifests. Queued: intent-routing fix (falsification complete, writer-ready), PING knowledge acquisition rebuild (SOURCE → OBSERVATION → EVIDENCE → OBJECT GRAPH), dump.py acquisition-lane environment findings (0600 overlay JS vs docker cp, pg module path, missing demo journal — reported by Writer A, not repaired). Pre-existing failures unchanged (6 media suites, redteam tsc). Next interval per the CEO order: reassess, then the remaining priority order (freshness refresh, regeneration without destroying owner intent).
