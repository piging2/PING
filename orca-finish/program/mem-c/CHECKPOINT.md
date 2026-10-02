# MEM-C — Memory Loop Re-proof + Adversarial Attack Suite (scratch) — CHECKPOINT

Session: 09e00d4a-27c4-42d5-895d-79cbbccfceda | Started: 2026-09-24 05:07 MDT
Quota: program 300 missions (MEM-A ~40, MEM-B ~55 consumed). NIGHT SHIFT in force. NO STOPPING CONDITIONS. YOLO MODE.

## Objective
1. LOOP RE-PROOF: WRITE -> STORE -> RETRIEVE -> RANK -> INJECT -> USE -> VERIFY VALUE -> SUPERSEDE -> FORGET on a SCRATCH store (task rule: memory experiments use scratch stores only, never production memory). A stage is PROVEN only if its OUTPUT reaches the next stage's INPUT.
2. ATTACK SUITE (10 attacks incl. wrong-version split out): stale, contradictory, poisoned, wrong-tenant (+positive isolation proof), wrong-mission, wrong-version, untrusted-source, overlong, irrelevant retrieval, missing provenance. For each: construct, run naive consumer, run hardened consumer, grade system-level + agent-level defense.
3. Every loop failure -> memory candidate in the REQUIRED 9-field shape (problem / scope / evidence / mechanism / fix / test / version / applicability / counterexample). Missing any field = INCOMPLETE, rejected.
4. Harvest new sibling-lane failures since MEM-B 21:22 MDT (orca-b VERDICTS.md, critic-semantic, critic-archdel GC12-REGREP, critic-performance, critic-product, chaos-a MC-1..MC-4, agent19).
5. Deliverables: program/mem-c/CHECKPOINT.md, MEMORY-PROOFS.md (per-mission proof records), MEMORY-HARVEST.md (qualified candidates only).

## Safety
- Scratch store ONLY: program/mem-c/scratch/memory/2026-09-24.md + tenants/. All fixtures [PROBE3]-namespaced, synthetic Zephyr-project content. No production memory written. Read-only on repos.
- Production reads: exactly two read-only checks (memory_search re-verification of MEM-A's deleted probe; grep for active PROBE tokens in 2026-09-24.md). No writes.
- classify don't delete: failures -> LOCAL ACCIDENT vs GENERIC CLASS.

## Method note (why scratch)
MEM-A proved the loop on production memory but the index stall left attacks 1,2,4,5,6,7,10 as PROJECTIONS. The scratch pipeline (scratch/memc.py) is a faithful-to-observed-behavior model: append-only store with no validation, point-in-time index snapshot (serves stale/deleted content), Jaccard-ranked line-fragment retrieval (no recency default, no exact-token dominance, no tenant/provenance filters, no relevance threshold), citation inject from store or index. This lets every attack run to an OBSERVED verdict instead of a projection. Where scratch behavior is a model rather than the production system, the proofs say so.

## Mission log
- 05:07 MDT: lane dir created. MEM-A CHECKPOINT+MEMORY-PROOFS, MEM-B CHECKPOINT+MEMORY-HARVEST, cmd-ops FAILURE-CLUSTERS absorbed. ~/workspace/AGENTS.md house rules read.
- 05:09 MDT [M-26]: production index re-verification (read-only): muse.memory_search for ORCA-MEM-PROBE-ZX81-QUINTIC returns only generic near-misses; the deleted v1.0 entry is NO LONGER served. State transition since MEM-B 20:56 MDT (still served): the index converged sometime in the ~8h window. FORGET-at-index defect reframed: unmarked staleness window of minutes-to-hours, not permanent. Grep of ~/memory/2026-09-24.md: 0 PROBE tokens (no active probe cross-contamination tonight).
- 05:10 MDT [M-27]: sibling sweep for new failures since MEM-B 21:22: orca-b VERDICTS.md (15 records, T1-T4, H1-H4 harvest specs — positive mechanisms, noted not harvested), critic-semantic SEMANTIC-AUDIT.md (NEW: vocabulary equivocations), critic-archdel GC12-REGREP-REPORT.md (NEW: 24/24 survive + stale-bundle hygiene note), critic-performance (T1 throughput ceilings), critic-product (W2-MISSIONS overreach sentence), chaos-a MC-1..MC-4 (NEW memory candidates, non-9-field), agent19 (P-7 verbatim downgraded — self-correction, positive).
- 05:12 MDT [M-11..M-13]: scratch pipeline built (memc.py: store/index/retrieve/inject + naive/hardened consumers + Zephyr fixtures). Loop driver built (loop_proof.py). First run: 2 harness bugs caught (M-2 verdict condition, M-4 top-k depth) -> LOCAL ACCIDENT, fixed, re-run clean.
- 05:15 MDT [M-1..M-10]: LOOP RE-PROOF complete on scratch. 9/10 PROVEN, M-10 FORGET-index BROKEN (re-proven deterministically: stale snapshot serves deleted fragments; old citations rot to unrelated lines). M-7 VERIFY VALUE caught the planted defect (claimed +20, actual +10). M-4 RANK hazard: ZX91 ranked #20 on the natural query, 6 decoys above. M-8 SUPERSEDE: v1.0 + v1.1 co-served, declaration-only.
- 05:20 MDT [M-14..M-15]: attack driver built (attacks.py). First run: 4 measurement refinements (A3 needed retrieve->INJECT chain for the instruction to enter context; A4 attribution check false-positive from entry self-description; A6 fragment-vs-entry date-ordering split; A8 inject-layer sentinel separated from retrieval ranking; A9 acted-on metric) -> LOCAL ACCIDENT (methodology), fixed, re-run clean.
- 05:25 MDT [M-16..M-25]: ATTACK SUITE complete, 10 attacks, all OBSERVED verdicts. System ABSORBED 10/10 (A8: absorbed unbounded, resisted budgeted). Headline: every working defense is agent convention; the pipeline has no active defenses. New sharp findings: A6 content-date confusion (fragment-level date-ordering ADOPTS THE PLANT; entry-level after INJECT picks genuine); A2 date-order silently picks the newer plant; A3 naive consumer FOLLOWS the injected instruction; A4b positive proof (namespaced store + tenant param -> isolation HOLDS).
- Next: write H-35..H-48 harvest entries (9-field), schema audit, then the three deliverables.

## Mission log (cont.)
- 05:35 MDT [M-28..M-41]: 14 harvest entries drafted (H-35..H-48): 9 memory-loop failures (H-35..H-43) + 5 new sibling failures (H-44..H-48). Schema audit: 14/14 carry all 9 fields. MEMORY-HARVEST.md written.
- 05:40 MDT [M-42..M-44]: MEMORY-PROOFS.md written (loop trace, per-mission proof records M-1..M-44, 10 attack verdicts, failure classifications). This CHECKPOINT.md finalized. Scratch artifacts: memc.py, loop_proof.py, attacks.py, loop-proof-log.json, attack-log.json, memory/2026-09-24.md (attack residue, synthetic), memory/tenants/.
- Mission tally ~44 this run; program total ~139/300.

## Failure classifications (this lane)
- LOCAL ACCIDENT (harness, recovered): loop_proof.py M-2 verdict condition (grep counts header line only, not all lines); M-4 top-k=8 too shallow (decoys filled top-8, hazard understated). attacks.py: A3 first ran consumers on fragments only (instruction lives on unretrieved line — fixed to retrieve->INJECT chain); A4 attribution check matched entry self-description text (fixed to metadata-only check); A8 conflated retrieval ranking with inject truncation (split into two claims); A9 lacked an acted-on metric (added summary-ingestion check). All caught by re-reading outputs, fixed, re-run green. No work lost, no production touched.
- GENERIC CLASS (candidate): none new from this lane's own operation; the H-35..H-43 entries ARE the generic classes (memory-loop failure classes).
