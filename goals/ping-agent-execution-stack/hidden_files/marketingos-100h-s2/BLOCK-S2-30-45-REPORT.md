# SPRINT 2, BLOCK 30–45 — REPORT: OPPORTUNITY + RESEARCH (2026-09-30)

Block complete. Two commits, both verified. No new authorities, stores,
writers, or subsystems. No push. No distribution.

## 1. Opportunity generation + scoring (coordinator, commit d29caa9)

Deliverable: `OPPORTUNITIES-S2-30-45.md`. 10 candidates generated from the 8
graded signals, scored on the plan's 13 information-gain factors (0–5 each,
max 65; CLAIM RISK and PRODUCTION COST scored 5 = low risk / cheap).

Anchors honored: S-4 (continuity-A slot unoccupied across 34 surveyed
systems) as the differentiation anchor; S-2 (trigger seal is class-bound,
production sits outside it) as the technical constraint every
replayable-evidence opportunity must reckon with. Framed for Cluster A
(Nolan, fully observed) as the operative approver; Cluster B stays UNKNOWN —
no candidate assumes external audience knowledge.

Advanced (5): C1 "Your audit log is not evidence" (51/65, picked for deep
research); C2 "The seal that doesn't bind its maker" (54/65, queued #2 —
evidence already in hand from U2); C3 "Source-faithful, business-false"
(47/65, queued #3, strongest after the FYD fix lands); C4 "What deterministic
replay would actually require" (43/65, merge candidate into C1); C5
"Pre-register your database questions" (45/65, queued #4).

Rejected (5, first-class): R-C6 the undrained /ingest queue (internal ops,
D-F3 steelman — nobody outside the team cares about our journal's queue);
R-C7 verdict-observability (engineering note, already fixed); R-C8
correlation IDs as standalone (implementation detail, D-F3); R-C9
counterparty-risk acquisitions (not our primary evidence, claim risk 1/5);
R-C10 governance-theater (premature — revives after the first real approval).

Cross-lane note recorded in the file: the 99-hour convergence program's
ecosystem archaeology (Attio/Clay/Apollo/HubSpot) overlaps C1's survey
territory — same systems, different question (they ask "which primitive to
harvest," we ask "does any have continuity-A"). Dependency recorded, not
resolved; if their archaeology finds event-sourced internals, C1's
counterevidence section must be updated.

## 2. Deep research on C1 (worker, commit 6167418)

Deliverable: `DEEP-RESEARCH-C1-REPLAYABLE-EVIDENCE.md` (95 lines, all 9
novelty-detector sections). **Verdict: ADVANCE, narrowed.**

What the research found:
- Strongest counterevidence is an argument, not a product: Temporal's Event
  History proves deterministic replay is a shipped, engineerable standard in
  workflow infrastructure. This supports the thesis (the primitive exists;
  no surveyed CRM adopted it) rather than killing it.
- immudb 1.11 (May 2026) ships tamper-evident audit logging with PG
  compatibility — tamper-evidence of a data plane, not replay of decisions.
  Distinction preserved in the report.
- The steelmanned L6 objection stands half-right: bit-identical replay of
  LLM generation is a strawman (model/seed/prompt/tool/world-state drift);
  the honest standard is narrowed to **replayable deterministic derivations
  from a pinned immutable event plane plus artifact-level regression** (the
  Fin pattern), not replay of generation.
- Amazon QLDB is dead (end of support 2025-07-31) — eliminated as a
  counterevidence candidate. EventStoreDB rebranded as KurrentDB (alive, but
  out-of-category infrastructure).
- GDPR-vs-immutability tension is real, with crypto-shredding (EDPB 02/2025)
  as the accepted reconciliation — a genuine cost the thesis must carry.
- Re-verification: Intercom Fin debugger back-test (independent, VentureBeat
  interview), Linear HMAC webhooks (independent, three sources), Asana 24h
  story consolidation (independent, three forum threads), HubSpot July 2026
  ToS reversal (independent, multiple outlets). D365 Cowork propose-don't-act
  and Common Room entity binding stay vendor-described; no production CRM
  claims event sourcing (hobby OSS only) — a finding in itself.
- **S-2 reckoning included and honest:** our trigger seal binds only
  non-owner non-superuser roles; the production app role is a superuser
  outside the seal; pinned replay proof is follow-up work, not claimed. The
  piece argues for the standard, not that we have met it.
- Cross-lane: QLDB-dead and immudb 1.11 handed off to the convergence lane;
  dependency on their Attio/Clay/Apollo/HubSpot archaeology recorded.

## 3. Readiness for 45–60 (EVIDENCE PACKAGE + CONTENT COMPILER)

GREEN. The block inherits: a scored 10-candidate set with explicit
rejections, a deep-researched C1 with a narrowed thesis and graded
counterevidence, a queued C2 whose evidence is already in hand, and the
convergence-lane dependency recorded. The 45–60 block builds the canonical
thesis/evidence package for C1 ("Your audit log is not evidence," narrowed:
replayable deterministic derivations from a pinned immutable event plane),
with the atomic claim ledger, overclaim pass, and hostile L6 review the plan
requires — and the S-2 reckoning as a mandatory section, not an appendix.

Watch: if the convergence lane's archaeology finds event-sourced internals
in Attio/Clay/Apollo/HubSpot, C1's counterevidence section updates before
the evidence package freezes.
