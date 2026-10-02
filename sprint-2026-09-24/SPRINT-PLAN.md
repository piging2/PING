# 24-HOUR SPRINT — REVISED PLAN (SUPERSEDED 2026-09-24 ~18:35 MDT)

SUPERSEDED by Nolan's final execution order. The single authorities are now:
CHARTER.md + WORK-QUEUE.jsonl (machine-readable) + FYD-24H-PRODUCT-PROOF.md (the deliverable).
Kept for history only; do not execute from this file.

Nolan: "GO OVER ALL THE BACKLOGS, DO ONE DELIVERABLE 24 HOUR SPRINT OF ALL THE GAPS,
WHAT YOU THINK ARE THE NEXT HIGHEST CONFIDENCE IMPROVEMENTS."

This supersedes the charter's lane-demotion posture. The charter's hour plan, gates, hard freeze,
scoreboard, and escalation rules still stand. What changes: the queues now carry the highest-confidence
gaps from ALL backlogs, ranked by confidence x value, each with a concrete acceptance proof.

## THE ONE DELIVERABLE

The hour-24 demo (charter's 26 beats) PLUS every gap below closed with evidence.
If a gap doesn't serve the demo or a safety seam, it's not in the 24h.

## QUEUE 1 — P0 SAFETY (first, in this order)

1. NOW-5 / Ask FYD field-level privacy gate. The renderer passed OWNER ADDRESS OVERRIDE; Ask FYD is a
   second mouth on the same data and was never tested. Proof: public viewer + hidden field -> zero
   disclosure across traversal, Ask, search, citations; owner viewer -> disclosed. Both directions green.
   (This is the FYD-Q2 hidden-address work; port the proven renderer pattern.)
2. NOW-3 / cited evidence_refs existence check. Every evidence_ref in Ask FYD output resolves in the
   target graph snapshot or the answer FAILS CLOSED (marked unsupported). Proof: one dangling ref test.
3. Task #1 / DEMO_SYNTHETIC labeling bypass (0.5d). Happy Place service overlay classifies DEMO_SYNTHETIC;
   Ask FYD cites it as demo addition, not fact; demo-classification tests + 1 fixture regression.
   (Serves the "NO FICTION" north star.)
4. NOW-9 / wrong-journal fail-closed guard. Gap already reproduced 2026-09-23. Emit/dump fail closed with
   typed WRONG_JOURNAL when the target journal lacks the overlay marker. Proof: synthetic misconfigured
   gateway URL -> typed failure, zero writes.
5. FYD-028 / per-run wake lock. Acquire -> run -> release in the automation lifecycle; never global policy.
   Proof: lock held during a run (powercfg /requests), released after; sleeping machine -> PAUSED/RESUMED,
   not cascade failure.
6. Task #15 / store-layer transition-table enforcement (S). Illegal status writes rejected at the store;
   legal transitions unaffected. Proof: adversarial illegal write rejected, all legal paths pass.

## QUEUE 2 — BROKEN END-TO-END ARROW

7. NOW-2 / minimum Service object proof. "What services does this business offer, and how do you know?"
   answerable from BOTH real graphs: id, schema type, name, Business->offers->Service, claim/evidence
   bindings resolving to real source URLs. Without this the Ask FYD boundary is prose pretend.
8. NOW-1 / acquisition contract, MINIMUM ONLY (Nolan's locked decision): source identity/digest,
   observation/evidence provenance, deterministic extraction result, visibility, acquisition status,
   temporal identity for re-observation. Formalize the existing path; no second acquisition system.
9. NOW-8 / changed-source regeneration fixture. Source v1 -> graph -> SiteSpec; owner customization;
   source v2 (one field) -> regen; assert customization preserved + diff explains the change; second run
   idempotent. (Owner-intent survival proof.)
10. NOW-4 / structured generation binding validation (already IN_PROGRESS): land it. Generator returns
    text fragments + claim bindings; bindings validated deterministically; injected unsupported claim fails.

## QUEUE 3 — PRODUCT UX

11. Task #19 / Ask FYD suggested-question chips (S). 2-3 chips derived from schema roles present in the
    graph; never suggests unanswerable questions.
12. Task #2 / remove demo chrome from tenant product surface (0.5-1d). Demo OFF: no demo header/badge/
    editor, tab title = business name; footer honesty line stays; mode ON restores proof chrome.
13. Task #10 / human-readable proposal review card (1-2d). Any intent renders a before/after card with
    digest collapsed; approval applies the exact digest-bound proposal.

## QUEUE 4 — RELIABILITY

14. Task #12 / effect ledger + reconcile-vs-retry classifier (design + synthetic proof, M-L). Effect sent,
    worker dies, classifier suppresses retry -> sink shows exactly one effect; no ledger entry -> retry NOT
    suppressed. No real external effects. (The ORCA idempotency core; directly serves "no blind retry of
    unknown external effect.")
15. Task #5 / six missing audit event types (M). Probe-001 re-run shows memory_read, authorization, tool_call,
    effect_receipt, memory_write, mission_completed; synthetic rogue write -> blocked receipt.
16. Task #20 / Oracle gateway healthcheck + Pig disk-hygiene dry-run (S). Config diff only; no live restart.

## QUEUE 5 — CLEANUP

17. Task #7 / env-allowlist lint for Vercel (S). CI red on smuggled env key; allowlist + names-only doc.
18. NOW-7 / binding verifier coverage audit. Every factual render binding call site routed through
    verifyPresentationBinding; lint/test that no factual binding bypasses it.

## EXPLICITLY NOT IN THE 24H

- Convergence O1-O20 deep architecture (multi-day; cheap watch only).
- 300-row JSONL freeze removal + status-store convergence: OWNED BY THE OUTREACH ENGINE (status-store
  writer rules). Do not touch from the sprint; coordinate, don't duplicate.
- NOW-6 (dual-writer deploy decision), gated sweep items G1-G8: Nolan's call, not the sprint's.
- PING dogfood website, broad harvest, Vercel/CI tasks blocked on Nolan's import.
- Anything on the charter's HARD FREEZE list.

## SEQUENCING

Safety queue first (items 1-6), then arrows (7-10), then UX (11-13), then reliability (14-16), then
cleanup (17-18). If the H4/H7/H11 gates go red, capacity moves to the gate; queues wait. Coordinator
recomputes the critical path every 4 hours and may reorder within these rules, but may not pull items
from the NOT-IN list without my approval.
