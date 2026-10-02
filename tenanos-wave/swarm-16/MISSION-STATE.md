# SWARM-16 Mission State — verification engine (confidence ceiling)

Resumed 2026-09-24 ~01:35 UTC after the daemon restart killed the previous worker.
Checkpoint at `~/workspace/tenanos-wave/swarm-16/` survived intact.

## What the checkpoint already established (previous worker, pre-crash)

1. **Harvest**: 7 PING-repo files pulled into `verify/` for KEEP/PROPAGATE/REFACTOR/REPLACE/DROP
   classification: `interview-engine-v3.ts`, `classifier.ts`, `duplicate-detector.ts`,
   `metadata-extractor.ts`, `service-suggester.ts`, `project-suggester.ts`, `county-suggester.ts`.
2. **Problem evidence**: repo-wide greps (`raw-*.txt`) proving the anti-pattern is live:
   - `raw-boolean-true.txt`: hardcoded `return { success: true }` in kit.ts, auth-manager.ts,
     blob-storage.ts, media-kv-store.ts, deployment-transaction.ts, newsletter/download routes, etc.
   - `src/lib/blob-storage.ts:336`: `verified: true` as a literal.
   - `raw-confidence-numeric.txt`: hardcoded `confidence: 0.9` / `0.95` constants in
     `src/lib/sentiment/*` suggesters — confidence as a constant, not a measurement.
   - `raw-guaranteed.txt`: "guaranteed" marketing claims adjacent to verification language.
   These are RESULT reported as VERIFIED OUTCOME — exactly what the verifier must ban.

## Harvest classification (decided this session, 80%+ confidence)

| Asset | Source | Verdict |
|---|---|---|
| interview-engine v3 gating skeleton (`computeConfidence`/`computeComplexity`, `shouldRequireSiteVisit`/`shouldRequireEstimatorReview`, "Not sure"→null) | checkpoint `verify/` | **REFACTOR/PROPAGATE**: pattern only (challenge-before-acceptance, confidence ceiling); home-service domain constants dropped |
| attestation-gate C4 pattern (`attestRelationshipState`: journal must carry claimed state before success; missing evidence → ATTESTATION_REJECTED) | constitutional sprint AUTHORITY-MAP #19, CANONICAL_LIVE | **PROPAGATE**: re-implemented as substrate invariant (`requeryEvidence`/`journal-readback`); `src/fyd/**` is hard-excluded so the code is NOT copied |
| media content-hash authority (`verifyBlobHash`) | sprint #46, ADAPTER | **PROPAGATE**: `hashRecomputeEvidence` (sha256 recompute over actual bytes) |
| sentiment classifier, duplicate detector, metadata extractor, service/county/project suggesters | checkpoint `verify/` | **DROP** for this mission (review-pipeline domain; `ClassifierFactory` UNREACHABLE per sprint). Suggesters' constant confidences kept as negative evidence (`SELF_ASSERTED_CLAIM` test) |

## What this session built (in `work/verification/`, 29/29 tests green)

`src/tenanos/verification/` v0 — the RESULT→VERIFICATION gate:
- `types.ts`: `EvidenceGrade` (none<asserted<observed<recomputed<attested>), `GRADE_CONFIDENCE_CAP`
  (0 / 0.25 / 0.6 / 0.85 / 1.0), `VERIFIED_GRADE_FLOOR='observed'`, `ToolResult`, `VerificationExpectation`
  (freshness nonce + maxAgeMs), `EvidenceCheck` (nonce-bound), `Verification` (outcome, gradeFloor,
  certifiedConfidence, findings, autonomousMutationAllowed).
- `verifier.ts`: `verifyToolResult(result, expectation, checks, nowMs)` — deterministic (explicit nowMs).
  Fail-closed order: expectation/toolCallId mismatch → REJECTED; unknown side-effect semantics →
  UNVERIFIED; ack≠ok → UNVERIFIED; missing expected claim / unexpected (unauthorized) claim → UNVERIFIED;
  stale or nonce-recycled evidence → UNVERIFIED; contradicted evidence → REJECTED with the missing
  evidence named; self-asserted claims can never VERIFY; VERIFIED requires every claim at ≥'observed'
  and is the ONLY state with `autonomousMutationAllowed=true` and `certifiedConfidence>0` (capped by
  weakest grade). A bare `success:true` with no evidence → UNVERIFIED + `NO_EVIDENCE`.
- `evidence.ts`: constructors that *perform* the inspection — `schemaMatchEvidence` (observed),
  `hashRecomputeEvidence` (recomputed, node:crypto sha256), `requeryEvidence` (attested, re-reads the
  authoritative source now), `invariantEvidence` (observed).
- `interview.ts`: `challengeClaims` (one blocking probe per claim lacking sufficient live evidence, plus
  probes for expected-but-unclaimed effects) and `scoreChallenge` ('unsure'/'unknown' = the interview
  engine's "Not sure" → fail closed; 'confirmed' without an evidence reference → fail closed; only
  'confirmed'+evidenceRef clears).
- Tests: `node --experimental-strip-types --test` → 9 suites, 29 tests, 29 pass, 0 fail
  (run 2026-09-24 ~01:36 UTC in `work/verification/`; files have no repo imports so the run is faithful).
  Writer still owes Gate 2 (tsc + scoped jest `src/tenanos/jest.config.cjs`) on the isolated branch —
  Pig WSL bridge was DOWN this session (`wsl: no installed distributions`), so no Pig-side runs were possible.

## Staging status — READ BEFORE TOUCHING diffs/ OR STATE.json

The shared staging area is **unsafe right now: concurrent writers are racing** (observed 01:37–01:48 UTC).
Do NOT compute "next free ID" from a stale STATE.json view.

- My proposal was staged as `diffs/STAGED-swarm16-verification-engine-v0.diff` (7 files, correct
  `a/src/tenanos/verification/...` paths). **No numbered ID claimed; no STATE.json entry written**
  (by me). Coordinator: assign the ID and append the entry; suggested claimed_areas
  `src/tenanos/verification/**`. Overlap vs current non-terminal proposals: none (checked).
- **Incident 1 (mine, repaired)**: I first wrote my diff to `diffs/P-20260923-089.diff`, clobbering
  swarm-18's staged MemoryCandidate-schema diff (their STATE entry P-20260923-089/diff_ref pointed at
  it). I reconstructed it from their source `swarm-18/diffs/S18-13-memory-candidate-schema.diff`
  (byte-identical content; regenerated git header). Swarm-18 should verify the reconstruction.
  The reconstructed file was later DELETED by the concurrent churn (not by me).
- **Incident 2 (not mine, open)**: `diffs/P-20260923-091.diff` (mtime 01:37:57) currently holds a copy of
  MY verification diff (with a doubled-path bug from my first generation command) while STATE.json
  P-20260923-091 (swarm-10, status **approved**) describes the decision-budget module and points
  diff_ref at that file. **An approved proposal's staged diff does not match its entry — do not let a
  writer apply it as-is.** I staged a faithful recovery at
  `diffs/RECOVERY-swarm10-P-20260923-091.diff`, regenerated from `swarm-10/work-verify/src`
  (identical to `swarm-10/stage/src`; 6 files exactly matching the entry's files_touched).
  Coordinator: verify and swap in.
- **Related scramble (observed, not mine)**: `diffs/P-20260923-092.diff` currently contains the
  MemoryCandidate schema while STATE P-20260923-092 (swarm-01) is "Tenant boundary kit" — same
  diff/entry mismatch class. Pre-existing overlap hits from check-overlap.py: P-20260923-082↔084
  and P-20260923-087↔088 (both swarm-08 pairs, same-file claims).

## What's next (for coordinator / writer)

1. Serialize staging-area writes (one-writer on `diffs/` + STATE.json until the churn is understood).
2. Assign my verification-engine proposal an ID; append STATE entry (fields drafted above).
3. Writer: apply on isolated branch from `tenanos-wave-base-20260923`, run Gates 2–3
   (tsc --noEmit, jest with `src/tenanos/jest.config.cjs`), then hand the fail-before suite to
   adversary swarms 06/18 for the adversarial pass.
4. Open design question for a future pass: where the verifier plugs into the autonomous loop
   (swarm-02 ORCA mission engine owns the loop; the verifier is a pure gate it can call — no new
   orchestrator/event authority created, per directive 1).
