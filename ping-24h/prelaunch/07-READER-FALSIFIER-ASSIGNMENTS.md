# READER / FALSIFIER ASSIGNMENTS - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY. Read-only assignments, useful BEFORE GO.
No implementation, no product-tree writes, no commits. Readers REPORT; they do not fix.

Twelve assignments across the preparation waves.

---

## R-01: Wave A repro preparation - event bridge + MC dispatch tenant gap

- ASSIGNMENT: prepare the T-01 and T-02 repro harnesses (fixture design, assertion list, isolated-test-namespace plan). Do not run them against live paths.
- DELIVERABLE: repro scripts ready to execute at GO (T-01, T-02)
- WAVE: Wave A (safety)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: scripts are deterministic on paper, use isolated test namespaces, and cannot touch real tenant state.

## R-02: Wave B repro preparation - shared hostile corpus scaffolding

- ASSIGNMENT: draft the 8 Wave B fixture scenarios (T-05) as written scenarios with setup/trigger/expected-invariant before implementation.
- DELIVERABLE: 8 written fixtures ready for the comparison owner
- WAVE: Wave B (recovery)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: each fixture names the invariant under test (UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION).

## R-03: Wave C repro preparation - orca-run-mu6wmbzn fixture

- ASSIGNMENT: assemble the recorded orca-run-mu6wmbzn data into a self-contained fixture: trimMission input/output, getTrace correlation inputs, the lossy ContextPack, the D-26b judge input.
- DELIVERABLE: fixture bundle ready for T-08
- WAVE: Wave C (evidence)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: fixture reproduces the recorded loss byte-for-byte when replayed, or records exactly where the recording is incomplete.

## R-04: Pseudo-vector reachability call-site map

- ASSIGNMENT: enumerate every _text_to_vector / _qdrant_search call site across the canonical tree, the duplicate worker copies, and the integration branch; mark reachability from live entry points (gateway spine, dispatch plane, Ask paths).
- DELIVERABLE: call-site × reachability matrix (feeds T-09)
- WAVE: Wave 3 (evidence)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: matrix distinguishes REACHED / REACHABLE-BUT-DORMANT / UNREACHABLE; no claim without a traced path.

## R-05: Decision-record round-trip dry run

- ASSIGNMENT: hand-run the T-11 round-trip for one candidate schema against all 15 records on paper/desk-check; list every field that would be lost or coerced.
- DELIVERABLE: lossy-field list for one schema (the pattern the full T-11 matrix will follow)
- WAVE: Wave 4 (observability)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: every lossy field named with the record it came from; no guessing.

## R-06: Repo-binding archaeology

- ASSIGNMENT: search the full forest (canonical tree, integration branch, tenanos-wave, second repo) for any existing repo→tenant binding: authorization records, repo registry, tenant mapping, ingestion gates.
- DELIVERABLE: locations × verdicts report (feeds T-16)
- WAVE: Wave 7 (GitHub)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: report distinguishes EXISTING / PARTIAL / DESIGN-ONLY / ABSENT; if an existing binding is found, T-16 becomes harvest.

## R-07: Dirty-work preservation verification

- ASSIGNMENT: verify the 04 preservation map against current disk state: re-run git status on the listed dirty trees, confirm SHAs, flag anything that moved since 2026-09-28 ~18:45 MDT.
- DELIVERABLE: verified-preservation delta report
- WAVE: Wave 0 (preparation)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: every DW entry re-confirmed or flagged CHANGED; no resets, no cleanups, no commits performed.

## R-08: Source/build/served baseline capture

- ASSIGNMENT: capture the current binding evidence byte-level: branch HEAD, .next/BUILD_ID, served asset digests, :3100 process start time and env flag (read-only: process env, NOT restart).
- DELIVERABLE: baseline capture (feeds T-18)
- WAVE: Wave 0/1 (binding)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: all four values (SOURCE SHA, BUILD ID, served-asset digests, flag-live proof) recorded with timestamps; no restart, no flag changes.

## R-09: Identity-handoff map draft

- ASSIGNMENT: enumerate the identity handoff sites (target: 20) with per-site concept, minting implementation, verifying implementation, trust basis.
- DELIVERABLE: draft handoff map (feeds T-12)
- WAVE: Wave 1 (tenant safety)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: trust basis one of: explicit / inherited / inferred / duplicated / untrusted-input / absent / reconstructed; no site without a cited file.

## R-10: WorkOrder envelope comparison desk-check

- ASSIGNMENT: field-by-field E1 (live adapter) vs E7 (proposed spec) comparison; desk-run the J-16 well-formed-lie through verifyResultEnvelope.
- DELIVERABLE: comparison matrix + J-16 result (feeds T-15)
- WAVE: Wave 6 (worker autonomy)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: every field marked IDENTICAL / COMPATIBLE / DIVERGENT / MISSING; lie caught or not, with the exact check (or its absence) named.

## R-11: E1 integrity re-verification dry run

- ASSIGNMENT: verify the frozen E1 artifacts are intact and the rerun command works: sha256sum e1-corpus.json, python3 lexical_baseline.py, confirm 19/25 = 0.760 exactly. Zero Jev calls.
- DELIVERABLE: rerun log (feeds T-20)
- WAVE: Wave 5 (Jev, frozen)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: exact 19/25; any deviation is a corpus-integrity incident, not a tuning opportunity.

## R-12: Mission Control truth audit

- ASSIGNMENT: audit what Mission Control displays vs what the authorities hold: journal scoping (global vs tenant), projection freshness (manual vs automatic), dispatch tenant binding, approval-door state.
- DELIVERABLE: truth-audit report (MC-shown vs authority-held, per surface)
- WAVE: Wave 1 (tenant safety)
- REPORTS TO: prelaunch coordinator
- ACCEPTANCE: every MC surface marked AUTHORITY-BACKED / DERIVED / MOCK / UNKNOWN; mocks named, not excused.

---

## Rules for all readers

1. Read-only. No product-tree writes, no commits, no pushes, no live-service restarts.
2. Lane self-reports are hypotheses; reader reports are evidence only after independent verification.
3. Report verdicts, not architecture essays. Verdict first, evidence attached.
4. If a surface is owned by an active writer, the reader does not touch it (collision check before starting).
5. No em dashes in Nolan-facing writing.
