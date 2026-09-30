# SPRINT 2, BLOCK 15–30 — REPORT: SIGNAL + AUDIENCE (2026-09-30)

Three bounded workers, three commits, all verified by the coordinator.
No new authorities, stores, writers, or subsystems. No push. No distribution.

## 1. Verdict-observability fix (worker 1, commit 7273ac7)

The known gap from 0–15 is closed as bounded ingress work. Findings:
- `ping_events` has no `correlation_id` column (it lives at
  `metadata->>'correlation_id'`); `event_id` is varchar, not uuid.
- Verdicts were in the journal all along: `attachClaimVerdict()` sets
  `payload->'claim'->>'verdict'` before the CLAIM_CREATED event is emitted.
  `metadata->>'verdict'` is NULL on all 106 CLAIM_CREATED rows, but 39 carry
  a payload verdict.
- Join key: `knowledge_nodes.source_event_id = ping_events.event_id`
  (105 nodes link to CLAIM_CREATED events).

Fix: a committed **read-only projection query**
(`verdict-projection.sql` + `mkos-s2-verdict-driver.cjs`) — not a VIEW, not
an UPDATE. No history mutated, no schema state added to the journal surface.
Tested: sprint-1 mission `93a79e48accd23e3` projects all 8 verdicts
(C1,C2,C4–C8 CONFIRMED; C3 REFUTED), matching the baseline exactly;
sprint-2 U2 mission projects all 9, preserving the correction history
(original REFUTED events alongside later CONFIRMED corrections, not
overwritten). 21/21 payload/label agreement checks pass.

Residual: 67 CLAIM_CREATED rows (mostly pre-vocabulary) have no verdict
anywhere — the projection returns honest NULLs, not backfilled. 9 events
have no linked knowledge node.

## 2. First evidence-backed signals (worker 2, commit 059b582)

Deliverable: `SIGNALS-S2-15-30.md`. 8 signals, each with support set,
evidence grade, scope. 4 explicit rejections. U1, U3, U4, U5, U6 carried as
UNKNOWN.

| id | signal | grade |
|----|--------|-------|
| S-1 | Claim verdicts unqueryable from claim events (the gap worker 1 fixed) | primary |
| S-2 | Trigger seal is class-bound; production sits outside it (app role `ping` is superuser — the seal holds via app discipline, not the DB) | primary |
| S-3 | FYD UNDERSTAND is head-metadata-only: 0/5 owner-ready (referenced; FYD lane owns the fix) | primary |
| S-4 | Continuity-A slot unoccupied across 34 surveyed systems | independent |
| S-5 | /ingest creates missions nothing consumes: 25 CLAIM_GENERATE missions stuck in `created` (2026-09-25 → 2026-09-30) | primary |
| S-6 | Head-metadata projection propagates source-side falsehoods ("A&D Auto Parts" template cruft projected verbatim) | primary |
| S-7 | Observation→claim causality wiring is live (correlation/causation chains intact) — keep as the ingress contract | primary |
| S-8 | Governance machinery exists, unexercised: approval authority live, zero approvals; outcome-intake seam built, zero windows opened | primary |

Rejected: R-1 (empty `constitutional_memory` Qdrant collection — cadence
unobserved, could be by design); R-2 ("0/5 means the whole loop is broken" —
acquisition and generation are green; failure is scoped to UNDERSTAND);
R-3 (vendor mechanism numbers — claims awaiting evidence, not signals);
R-4 (journal event growth as "production momentum" — growth is research
residue).

Strongest for 30–45: S-4 (differentiation anchor — market whitespace with
per-system evidence grades), S-2 (technical constraint any replayable-evidence
opportunity must reckon with), S-1 (most actionable ingress decision).

## 3. Two audience clusters (worker 3, commit ccf4f0e)

Deliverable: `AUDIENCE-S2-15-30.md`. Modeled by questions, beliefs, failure
modes, objections, evidence standards — no demographics, no invented personas.

**CLUSTER A — The Operator (n=1, fully observed).** Nolan as the senior
technical decision-maker and sole approver, every dimension backed by concrete
journal/directive observations: questions always paired with falsifiable
predictions committed before research; beliefs ("SEARCH BEFORE DESIGN. TRACE
BEFORE MATRIX. OBSERVE BEFORE REPAIR"; UNKNOWN is a successful result;
credibility is a constraint); failure modes he punishes (fabricated evidence,
overclaim beyond scope, self-attested authority, absence→falsehood
conversions, silent mutation, made-up root causes); objections he raises (the
four landed steelmans plus the L6 question and the nine certification
questions); evidence standards (13-field claim ledger, demonstration ladder,
overclaim compiler, causally modest experiments, five separated outcome
classes). Informs the approval-gate shape and the "confident without bullshit"
voice. Cannot inform anything about the external audience's response.

**CLUSTER B — External senior technical audience: UNKNOWN.** Honestly
declared UNKNOWN across all five dimensions. The plan's target profile is
doctrine, not data. The 34-system harvest is ecosystem, not audience. The
only real metric baseline: 11 `platform_metric` observations, reach 0–37,
zero engagement — an honest zero, page identity unresolved. Each UNKNOWN
field carries its precise resolving observation. The signals worker's two
cluster seeds were not materialized — hypotheses, recorded as such.

Strongest observed evidence-standard: **the mandatory falsifying
observation** — "What observation would prove this answer wrong?" The
meta-rule governing every other standard.

Most-wanted observation from the first authorized distribution: one
AUTHORITY-class signal — a technically sophisticated outsider correcting,
extending, or independently reproducing the work — through the canonical
intake seam with the five outcome classes separated.

## 4. Watch items

- **Baseline corrected:** the 0–15 baseline named the `ping-postgres`
  container; the live journal actually runs on brain-postgres. Fixed in
  `BLOCK-S2-0-15-BASELINE.md` (this block).
- **S-5 is PING-core territory, not MarketingOS's to fix:** 25
  CLAIM_GENERATE missions stuck in `created` since 2026-09-25 with no
  journal-visible consumer. Flagged for the parent; the queue is growing.
- The FYD understanding fix (0/5) is referenced only; that lane owns it.

## 5. Open questions carried

U1 (gateway code — deployment-convergence lane's, referenced not resolved),
U3 (PG17 parity), U4 (pooler), U5 (disk writes), U6 (Oracle table owner
unknown). All UNKNOWN. None are signals.

## 6. Readiness for 30–45 (OPPORTUNITY + RESEARCH)

READY. The block inherits: 8 graded signals with explicit rejections,
Cluster A as the operative audience model (the approver), Cluster B's
honest UNKNOWNs with resolving observations specified, the queryable
verdict projection for any future claim audit, and the open-question list.
The 30–45 worker should start from S-4 (whitespace), S-2 (constraint), and
the harvest candidates — and must reject several of the 10 candidates
explicitly, per the plan.
