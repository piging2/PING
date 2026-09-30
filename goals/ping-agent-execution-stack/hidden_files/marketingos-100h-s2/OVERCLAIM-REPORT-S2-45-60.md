# Overclaim Compiler Report — Sprint 2, Block 45-60 (C1)

Date: 2026-09-30. Scanned: C1-EVIDENCE-PACKAGE.md, BLOCK-S2-45-60-SCRIPT.md,
CLAIM-LEDGER-S2-45-60-HUMAN.md, claim-ledger-s2-45-60.json.
Word list (plan, binding): solves, guarantees, proves, always, never,
production-ready, deterministic, secure, autonomous, self-healing,
exactly-once, zero-downtime, fault-tolerant, verified, canonical.
Plus: em-dash sweep (standing law).

## Verdicts by word

- **deterministic / deterministically**: heavy use, all scoped to the defined
  standard ("deterministic derivations replayable from a pinned immutable
  event plane") or to cited vendor mechanisms. Zero unscoped claims that OUR
  system is deterministic. PASS.
- **never**: three uses. "history is never rewritten" (Fowler's formulation,
  definitional). "never via the database" (scoped to our production journal
  via S-2/CLS2-14). "was never recorded" (observed in the trial record).
  All scoped. PASS.
- **proves**: found in draft ("Temporal proves the standard is
  engineerable"; "Fin's back-test proves artifact-level regression"). FIXED:
  reworded to "shows the primitive is described and shipped in another
  domain" and "as described and corroborated, shows artifact-level
  regression is achievable." Claims now match grades. PASS after fix.
- **guarantee** (singular, near-miss of the list): package line "the
  guarantee lives" refers to the definitional two-layer standard, not our
  system. Flagged, accepted as definitional. PASS.
- **verified / canonical**: mechanistic uses only ("verified against a
  signing secret" = HMAC; "Phil Seeman's canonical forum explanation" =
  recognized community authority, not an authority claim). PASS.
- **always / production-ready / secure / autonomous / self-healing /
  exactly-once / zero-downtime / fault-tolerant**: zero hits. PASS.

## L6-driven corrections (applied, not merely noted)

1. CLS2-02 (Temporal) demoted independent -> vendor-described. The docs are
   the vendor's claim about itself; the ledger's own rule forbids promotion.
   Added verified bounds: retention limits, no cryptographic tamper-evidence.
2. CLS2-04 (Fin back-test) demoted independent -> vendor-described.
   VentureBeat interview + two corroborating sources, none independently
   tested end-to-end. Script retagged; "proves" softened.
3. CLS2-09 (KurrentDB rebrand) demoted independent -> vendor-described.
   The rebrand is documented in the project's own repository.
4. CLS2-12 (EDPB/crypto-shredding): the "near-equivalent to erasure"
   reading corrected. EDPB 02/2025's posture is avoidance, not endorsement
   (verified against the guideline text by the L6 review); crypto-shredding
   hollows replay for personal data, which is most CRM data. The standard
   now admits erasure and replay are in tension by design.
5. CLS2-15: "append-only events" narrowed to "as observed in the journal
   reads of 2026-09-30" to resolve the contradiction with CLS2-14 (app
   behavior unverified, must not be asserted).
6. CLS2-01: conjunction caveat added. The definition's two conjuncts are
   individually occupied elsewhere; the claim is that no surveyed
   in-category system combines both, and demand is unobserved.
7. CLS2-20 added: D365 Copilot Cowork propose-don't-act, vendor-described.
   The package named it; it had no ledger row. One spoken line added to the
   script; part numbers 9-16 renumbered to 10-17.
8. H1 headline scope fix: "zero replayable histories" -> "zero with
   replayable decision history" (tied to the defined standard, survey-bounded).

## Em-dash sweep

Zero em dashes across all six deliverables (headers in the human ledger
were the only hits; replaced).

## Final ledger state

20 rows x 13 fields. CONFIRMED 18, UNCLEAR 2 (CLS2-17 Common Room
unreplicated; CLS2-19 6sense vendor-described), REFUTED 0. Grades:
independent 13, vendor-described 6, unreplicated 1. Script references all
20 rows; zero unresolved references. Every claim bound by scope and time
(as of 2026-09-30).
