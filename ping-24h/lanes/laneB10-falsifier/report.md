# Lane B10 Report: Wave B Independent Falsifier

**Role:** Lane B10, Wave B independent falsifier for the PING 24-hour intelligence maximization program.
**T+0:** 2026-09-28 14:26 MDT. **Report completed:** 2026-09-28 ~15:30 MDT. **Deadline:** T+20 (2026-09-29 10:26 MDT).
**Status:** HYPOTHESIS until replayed from a clean checkout. This report falsifies Wave B lanes B1 through B9 by independent recomputation, re-derivation from cited evidence, and direct reads of the canonical tree.

## Constraints honored

Read-only on canonical systems and source trees throughout. Never contacted the gateway, `:3100`, Jev, or scheduler missions `402152d14539171b`, `70e962a9d257c6dc`, `a5dc21a36107b0a5`. Never restarted `:3100`. No pushes, no destructive Git actions, no destructive data actions. Did not interfere with running lanes. Pig WSL use was limited to read-only source/file inspection via `~/workspace/pig-fb/pigwsl-exec.sh -s`. UNKNOWN was never collapsed. No em dashes used.

The permanent secret baseline (2026-09-28) was honored: no bearer/session material or credential values were logged; diagnostics were sanitized; missing credentials fail closed.

## Method

For each Wave B lane B1-B9: read the full report, read the raw evidence files and scripts, independently recomputed numbers from the lane's own data, re-derived verdicts from cited code, and checked for threshold theater, hand-picked samples, stale baselines, overreach, vocabulary mismatches, and arithmetic errors. Per-lane attack notes are in `raw/b1-attack.md` through `raw/b9-attack.md`.

---

## Per-lane verdicts

### Lane B1 (decision-surface deep map)

- **STRONGEST SURVIVING:** The declared-only corrections (D-09 `rankDiscoveryItems`, B-01 `classifyReview`, B-04, B-10 WAITING_APPROVAL) verify cleanly. The 42-surface count arithmetic holds (16+10+4+5+7). The B-05 ledger count (12,673 lines) and B-08 run count (57 entries) recompute exactly.
- **WEAKEST LINK:** Grill-20 record counting. The lane's breakdown does not survive a careful parse of the malformed line 19.
- **FALSIFIED:** The grill-20 breakdown "25 records (9 decide, 14 escalate, 1 escalate_resolved_by_owner, 1 unparseable line)". Line 19 holds 2 concatenated JSON objects (1 escalate, 1 decide). True count: 25 records = 10 decide, 14 escalate, 1 escalate_resolved_by_owner. The lane undercounted decide by 1 and treated the malformed line as a separate "unparseable record". (This falsifier's initial note claiming 24 records was wrong; the line-19 re-parse corrects it. B2 independently found the concatenation.)
- **WEAKENED:** Criticality labels (C1-C4) are B1-defined judgments that do not retroactively establish Lane 11's meaning. Several line citations are slightly inaccurate (`verifyResultEnvelope` at :307 not :306; owner-mode demo wording at header lines 12-13 not line 2).

### Lane B2 (processor tournament)

- **STRONGEST SURVIVING:** All 80 cases, 87 Jev samples, agreement percentages, Brier scores, and stability ranges recompute exactly from `tournament-records-2026-09-28.json`. The engagementGuard evidence-asymmetry finding (1/6 to 6/6 with the decisive fact added, Brier 0.4312 to 0.0006) is methodologically substantive and recomputes cleanly.
- **WEAKEST LINK:** Baseline provenance. The local orca-adapter mirror is stale; the canonical tree re-blocked codex on 2026-09-28, invalidating the AW-07 "expired block" baseline.
- **FALSIFIED:** The AW-07/AW-08 evidence-sensitivity baseline as a statement about current canonical behavior. The mirror's expired `blockedUntil` ('2026-09-17T06:01:00Z') was superseded by the owner's 2026-09-28 re-block with no expiry ("expiry is ELIGIBLE FOR RE-EVALUATION, not AUTHORIZED FOR WORK"). The reported DENY to GRANT flip does not reflect the current tree. The lane named mirror equivalence as its load-bearing claim; it does not hold.
- **WEAKENED:** The AW-01 framing-gap causal attribution (0.36 vs lane-11's 0.95) is not isolated by a controlled A/B; Jev version, envelope, and time also differ. Threshold-adjacent probabilities (GV-03 0.34, GV-04 0.41, CR-04 0.42, RG-04 0.39) make agreement percentages fragile to the lane-imposed 0.5 line. The lane is honest about both; the numbers will still be misread.

### Lane B3 (ORCA knowledge vs patched dispatch)

- **STRONGEST SURVIVING:** F1 (the EVIDENCE to ORCA CONTEXT edge is closed at the artifact level but open at the executor-reasoning level; verified: `runOllama(prompt)` and `runBroker(agent, prompt)` at route.ts:356/358 receive the raw prompt only). F3 (lane-12's 409/HOLD citations describe a dirty worktree; verified: zero occurrences in 9a555021). The ranked weakest-edge list is well-grounded.
- **WEAKEST LINK:** The 12-question and 20-boundary verdicts are interpretive code readings with zero test coverage (R9 confirms no tests pin dispatch behavior). They are careful hypotheses, not proofs.
- **FALSIFIED:** Nothing material. Patch stats (3 files, +327/-6), F1, F3, and the 32-item evidence cap all verify against the committed tree.
- **WEAKENED:** Line citations are approximate (context-compiler.ts path not fully specified; the scratch worktree no longer exists). The "fails closed honestly" headline sits in tension with F2's ordering wrinkle (MC_EXECUTION_STARTED emitted before compile failure). Carried findings (dangling refs, reapExpiredLeases) rest on prior lanes, not re-proof.

### Lane B4 (recovery torture)

- **STRONGEST SURVIVING:** Five FAILs execution-confirmed (T3 S2 misclassification proven, T7 S13 divergent terminals accepted, T8 S14 UNKNOWN overwritten by late result, T10 event-write loss with total evidence loss, T12 S18 unbounded stuck work). The 409-HOLD-absent-at-HEAD correction independently confirms B3's F3. The UNTESTABLE-SAFELY register is honest.
- **WEAKEST LINK:** Route.ts control flow is replicated by hand ("verbatim extraction"), not executed. A transcription drift would silently invalidate the torture verdicts. The clean-checkout replay procedure does not include re-verifying extraction fidelity.
- **FALSIFIED:** Nothing material. The 17 results, 2-line parameterization diff, HEAD file sizes (402/424 lines), and 409 absence all verify.
- **WEAKENED:** "PASS-STRUCTURAL" (T6) is code-reading labeled as execution. The four highest-risk scenarios (T5 lease-expiry, T11 reconciler-crash, S9 rotation, S11 revocation) are UNTESTABLE-SAFELY, leaving the most dangerous mechanisms unproven.

### Lane B5 (worker replaceability)

- **STRONGEST SURVIVING:** D1 (the contract cannot distinguish workers; all three echoed `hermes` and verified valid). D6 (identical result_id `bda817d09dd1` across materially different outputs). D7/D8 (fabricated evidence and rewritten objectives verify valid). The 7-prohibition table matches the raw verify output.
- **WEAKEST LINK:** D4 (codex expiry) was accurate at run time but is now stale; the owner re-blocked codex on 2026-09-28, firing the lane's own falsification condition #4. Worker C is the operator simulating a worker, not an independent worker implementation.
- **FALSIFIED:** D4 as a description of current state. At B5's run time (14:47-14:55 MDT) codex admission GRANTED due to expired `blockedUntil`; the canonical tree now has codex re-blocked with no expiry.
- **WEAKENED:** The "three workers" framing (C is operator-simulated). Hermes "obeyed" a directly-prompted malicious instruction (not an unprompted failure). D5 (completion extraction divergence) is a design observation, not a measured divergence.

### Lane B6 (business intelligence)

- **STRONGEST SURVIVING:** Honest UNKNOWNs for business identity, customer questions, and business outcomes. Accurate reporting of the Jev measurement falsification (6/6, Brier 0.0076, then lane 16's correction: 429.8ms vs 422ms, n=6 hand-picked). The four-dimensions framework (executor success vs action verified vs effect observed vs business outcome observed) prevents conflation.
- **WEAKEST LINK:** Synthesis without reconciliation. Three sections assert 409 HOLD (citing lane 12) without B3/B4's correction that it does not exist at HEAD. The codex "intended-temporary" (citing lane 16) is contradicted by the owner's 2026-09-28 re-block.
- **FALSIFIED:** The 409 HOLD claims in sections 7, 10, and 13 as descriptions of HEAD behavior. B3 and B4 verified zero occurrences in the committed tree. The "resolved as intended-temporary" for codex (section 3) is contradicted by the owner's re-block with explicit "never by timestamp" language.
- **WEAKENED:** Entirely derivative (no new canonical reads; Pig transport failed). The 14-question format forces verdicts on thin evidence. Identifies vocabulary gaps without closing them.

### Lane B7 (Mission Control observability)

- **STRONGEST SURVIVING:** The live HEALTH probe flaw (HTTP 200 with body saying unhealthy/degraded, 1704 NAMESPACE_VIOLATION rejections, embedding not_initialized; MC probes check 200 and discard the body). The "RECONCILIATION IN PROGRESS" text with no reconciler existing (MISLEADING verdict well-founded).
- **WEAKEST LINK:** Worktree vs HEAD confusion. The report claims HEAD 0264d517 but admits reading "worktree files as-is" without diffing. The 144-file dirty batch means line citations may not match HEAD.
- **FALSIFIED:** The HOLD section's "409 HOLD exists in dispatch/route.ts:344-353" as a HEAD claim. B3 and B4 verified absence at HEAD and at 9a555021. B7's finding describes uncommitted worktree state.
- **WEAKENED:** All code-reading verdicts inherit worktree-vs-HEAD uncertainty. The served UI (stale 17.5h) was not audited, so verdicts do not describe the observable system.

### Lane B8 (portability)

- **STRONGEST SURVIVING:** Journal overlay event_ids are wall-clock plus randomness (verified at HEAD: `Date.now().toString(36)` plus `randomBytes(6)`), not reconstructible. Extension namespace governance is absent (the live jev NAMESPACE_OWNERS incident proves it).
- **WEAKEST LINK:** B8 audited the dirty worktree, not HEAD. The report claims "all reads were against HEAD-tracked content" but this is false for at least digest.ts.
- **FALSIFIED:** Dimension 5's PASS verdict as a HEAD claim. The pinned `sha256-canonical-json-v1` (`src/lib/ping/digest.ts:1-60`) with test vectors and shell recipe does not exist in commit 0264d517; the file is untracked (`??` in git status). The mission-id `idempotencyKey` formula (route.ts:309) contradicts HEAD (`ts` at line 256).
- **WEAKENED:** All file:line citations inherit worktree-vs-HEAD uncertainty. The "one-authority violation" framing assumes digest.ts is canonical; at HEAD the canonicalizer landscape is different.

### Lane B9 (security continuous, INTERIM)

- **STRONGEST SURVIVING:** Journal write-access equals authority (repro exists at `repro/scratch/b9-journal-authority-forgery.mjs`; composes with B4's confirmed projector behavior). Approval WHO not bound (specific, serious, falsifiable: route takes `approver_identity` from caller body with no authentication). Honest provenance caveats throughout.
- **WEAKEST LINK:** The digest-confusion repro uses digest.ts, which is untracked and not in HEAD 0264d517. The "one-authority claim is FALSE" verdict overstates HEAD-level significance. The reaper liveness claim rests on a live docker exec that this falsifier cannot replicate under its no-gateway-contact constraint.
- **FALSIFIED:** Nothing definitively. The reaper liveness is UNVERIFIABLE under B10 constraints (not falsified, not confirmed). The digest framing is weakened, not falsified (the undefined-handling divergence is real in the worktree).
- **WEAKENED:** Interim status (repros queued, SHA-256 comparisons pending). Digest.ts provenance not disclosed as untracked. Live container observation is single-observer.

---

## Cross-lane findings

### Strongest surviving across Wave B

1. **The 409 HOLD correction (B3, B4).** Two lanes independently verified that the 409 HOLD path does not exist in the committed tree. B6 and B7 still cite it, which is itself a finding about synthesis lanes not reconciling.
2. **B2's arithmetic.** All 80 cases, 87 samples, agreement/Brier/stability numbers recompute exactly. The computation pipeline is sound even where the baseline provenance fails.
3. **B4's execution-confirmed FAILs.** Five findings moved from code-reading to execution-confirmed (S2, S13, S14, S16, S18).
4. **B5's D1/D6.** The contract cannot distinguish workers; result_id does not bind content. Both verified in raw output.
5. **B3's F1.** The executor never receives the compiled packet. Verified at route.ts:356/358.

### Weakest links across Wave B

1. **Worktree vs HEAD confusion (B7, B8).** Two lanes claim HEAD but audited the dirty worktree (144 files). B7's 409 citation and B8's digest.ts both fail against HEAD. B3 was careful to use a detached worktree at the patch commit; B4 used HEAD files; B7/B8 did not.
2. **Stale baselines (B2).** The orca-adapter mirror differed materially from the canonical tree (codex re-block). B2 named this as its load-bearing claim; it did not hold.
3. **Synthesis without reconciliation (B6).** Cites lane-12 409 HOLD in three sections without B3/B4's correction. Cites lane-16 "intended-temporary" without the owner's re-block.
4. **UNTESTABLE-SAFELY gaps (B4).** The highest-risk mechanisms (lease expiry, reconciler crash, credential rotation) cannot be tested safely, leaving them unproven.

### Falsified across Wave B

1. **B1's grill-20 breakdown** (9 decide vs true 10 decide; malformed line treated as a record).
2. **B2's AW-07 baseline** (expired block vs current re-block).
3. **B5's D4** (codex expiry; now re-blocked).
4. **B6's 409 HOLD claims** (sections 7, 10, 13).
5. **B7's 409 HOLD citation** (route.ts:344-353).
6. **B8's digest.ts dimension 5** (file not in HEAD) and mission-id formula.
7. **B6's codex "intended-temporary"** (contradicted by re-block).

### The codex re-block

Three lanes (B2, B5, B6) touched the codex `blockedExternal` expiry. The canonical tree was updated on 2026-09-28 (after B5's run, during Wave B) to re-block codex with no expiry. This single change falsified or weakened findings in B2 (AW-07 baseline), B5 (D4), and B6 (section 3). The lanes' falsification conditions anticipated it; the change still propagated.

---

## What would falsify this falsifier report

- A clean-checkout replay showing any "FALSIFIED" item above is actually correct (e.g., digest.ts exists in 0264d517 under a different path, or the 409 HOLD exists in a file B3/B4 did not grep).
- B9's final (T+20) report withdrawing or correcting the interim claims.
- The codex re-block being reverted (would un-falsify B5's D4 as a current-state claim).

## Open questions for the parent

1. B9's reaper liveness claim (live container bytes) cannot be verified under B10's no-gateway-contact constraint. If the parent wants independent confirmation, it requires gateway access that B10 was forbidden.
2. B7 and B8 should re-run their audits against a clean checkout at 0264d517 to resolve the worktree-vs-HEAD confusion. Their line citations cannot be trusted until then.
3. The synthesis lanes (B6) need a reconciliation pass against B3/B4/B5 corrections before their verdicts are consumed downstream.

---

*Lane B10 falsifier. Read-only throughout. No gateway, :3100, Jev, or scheduler mission contact. No pushes. No em dashes. All per-lane attack notes in `raw/`.*
