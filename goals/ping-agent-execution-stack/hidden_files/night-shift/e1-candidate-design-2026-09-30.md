# E-1 Candidate Design (night shift, design only, no implementation)

Date: 2026-09-30 (MDT)
Status: Candidate for crew reaction. The main-chat crew owns choosing and executing E-1. Nothing here is built, pinned, or run. No claim is made that E-1 would pass.

Inputs composed:
- CEO-ORDER-RECEIPTS-ARE-THE-PRODUCT-2026-09-30.md (E-1 spec, receipt questions, report template)
- night-shift/evidence-evidence-replay-scope-2026-09-30.md (8-step replay procedure, 6 gaps)
- night-shift/askfyd-outcome-history-contract-2026-09-30.md (AskFydOutcomeRecord shape)
- night-shift/one-canonical-read-model-discrepancy-map-2026-09-30.md (Side A vs Side B)

## 1. Recommended single FYD derivation

**The derivation: Ask FYD answer composition for ONE customer question.**

Concrete instance (recommended):

- Customer question: "What services does Coppersmith Plumbing offer?"
- Derivation: the ask lane's deterministic composition pipeline (builder `src/fyd/ask/context-builder.ts` + composer `src/fyd/ask/answer.ts`) run against a pinned graph snapshot of the coppersmith tenant, producing a claim set of DIRECT claims (one per service object cited), each bound to evidence records, plus the per-citation and per-presentation validation verdicts.
- Customer-visible claim produced: the enumerated service list with evidence citations, exactly what a visitor reads in the answer panel.

The deterministic portion under test is: snapshot pin verification, claim construction/validation (`makeClaim`/`validateClaims`), evidence index build, per-citation binding validation (`validateEvidenceRef`), and presentation binding verification (`verifyPresentationBinding`). The generated prose fragment (`bindAnswerFragment` output) is NOT re-derived; it is pinned as an artifact and re-validated for binding correctness only, per the deterministic-derivation vs artifact-regression distinction the CEO order and Nolan's follow-on analysis require.

**Why this one:**

- It is the exact customer promise in the order: ANSWERS YOU CAN CHECK. A question, an answer, evidence, a derivation.
- It exercises the full receipt question set: what was claimed, what evidence supported it, what rule produced it, what version ran, what superseded it, whether the deterministic portion re-derives.
- It exercises correction preservation through the supersession-mark leg of the replay procedure (replay step 2 re-applies marks and requires superseded records to fail closed), which is the ASK-030-shaped property without waiting on the full owner loop.
- The services subgraph is the sharpest customer-visible claim in the current system: it is exactly where the two read models disagree (D1/D2 in the discrepancy map), so pinning which input graph the derivation ran against is itself a meaningful honesty test.

**Rejected alternative 1: SiteSpec presentation binding for one page field (e.g. resolving one service card on a rendered page).**

Lost because: `verifyPresentationBinding` fails by omission (the caller omits the value), so the verdict surface is weaker than a claim set; it does not exercise claim construction, the DIRECT admission rule, or supersession marks; and tying E-1 to a rendered page drags in the website synthesis lane, which the order says to leave alone. It answers "what did the page show" but not "what did we claim and why."

**Rejected alternative 2: whole-corpus evidence-chain replay with no customer question (re-run `resolveAcquisitionChain` over the full evidence corpus).**

Lost because: it replays machinery without producing a customer-visible receipt. The CEO order's report template starts with CUSTOMER QUESTION and ANSWER; a corpus replay cannot fill those fields. It also has a larger pin surface (every acquisition) while proving less about any single decision. It is a useful regression, but it is not E-1.

## 2. Pin set template

Everything E-1 pins, with concrete field names, sources, and UNKNOWN markers. The crew fills values at the golden run; nothing below is pre-filled as fact.

| Pin field | Concrete name | Sourced from | Status |
|---|---|---|---|
| Derivation id | `derivation_id` = `askfyd-answer@<questionDigest>` | sha256 of the normalized question string; question text itself stored in the golden-run record only | to be computed |
| Derivation version | `derivation_version` | git commit of the fyd-build tree containing `src/fyd/ask/answer.ts`, `context-builder.ts`, `claims.ts`, `refs.ts`, `graph.ts`, `snapshot.ts`; exact function versions | UNKNOWN until crew pins; tree ownership between `~/workspace/fyd-build` and the ask-fyd-gold worktree is open question O7 |
| Policy/rule version | `policy_version` | `src/fyd/visibility/policy.ts` (FYD-010 gate), claim classification vocabulary (`claims.ts` DIRECT/DERIVED/INFERRED/GENERATED_PRESENTATION/OWNER_AUTHORED), suppression rendering pending D-SHIP (Nolan decision) | UNKNOWN until crew pins |
| Event range / ids | `event_ids` | overlay event ids applied over the fixture base through the governed PingObjectReader (form: `ping-event:<hex>` as in the discrepancy map, e.g. `39fc9971...` was the happy-place overlay; coppersmith equivalents to be listed by crew) | to be listed by crew |
| Graph base | `graph_base_digest` | fixture file + its sha256 base digest; for coppersmith: `fyd-product-lane/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts`, base digest reported as `8eaf11fc...` in the discrepancy map | to be recomputed at golden run |
| Graph snapshot | `graph_snapshot` | FYD-024 pin, `graphSnapshotPin(G)` from `src/fyd/ask/snapshot.ts:73`, form `sha256:<hex>` | to be computed at golden run |
| Evidence acquisition record | `acquisition_record_digest` | `~/workspace/fyd-build/evidence/acquisition-<slug>-2026-09-22.json` (sha256 of file bytes) | slug to be confirmed by crew; UNKNOWN which slugs exist on disk |
| Source bytes | `content_digest` | `acquisition.contentDigest` inside the acquisition record; re-verified as `sha256(stored bytes)` | to be re-verified |
| Observation corpus | `observations_digest` | `~/workspace/fyd-build/evidence/observations-<slug>-2026-09-22.json` (sha256 of file bytes), 6 observations per site per the replay memo | to be computed |
| Corpus version | `corpus_version` | `evidenceVersion` assigned by `observationsToEvidenceEntries` (V1 for committed corpus; regen bumps it) | to be pinned explicitly per replay-memo gap 4 |
| Supersession marks | `supersession_marks_digest` | `RegenerateResult.supersededObservations` set, applied via `applySupersededMarks` | UNKNOWN: no canonical stored home on the ask path (replay-memo gap 2); first run likely pins an explicitly EMPTY mark set, which must be recorded as empty, not absent |
| Viewer | `viewer_mode` | `AskViewer.mode`: `visitor` or `demo_owner` | crew choice; see open question O3 |
| Claim set | `claims_digest` | the claim set C as composed (`makeClaim` outputs: text, classification, evidence refs) | UNKNOWN: claims are not persisted today (replay-memo gap 3); crew must capture C into the golden-run record |
| Expected output digest | `expected_output_digest` | sha256 over canonical bytes of: claim set + per-claim validation verdicts + per-citation binding verdicts + per-presentation binding verdicts + composition verdict (refusal vs answered) | computed at golden run, then compared after replay |
| Prose artifact (regression, not derivation) | `answer_fragment_digest` | `bindAnswerFragment` output bytes, stored and pinned; replay re-validates its claim bindings, never byte-compares regenerated prose | to be pinned |

Notes on the pin table:

- The graph base is the ask lane's actual input: fixture base digest + overlay event ids + resulting snapshot pin (Side A in the discrepancy map). The PING-backed projection (Side B) is disqualified as the E-1 reconstruct target for this derivation because the ask lane deliberately never reads `FYD_PROJECTION_DIR` (test-pinned), and the projection was dumped from an older base generation (D4). Pinning against Side B would change the derivation's inputs. The read-model split itself is recorded in the receipt, not resolved by E-1.
- Record ordering is a pinned input: first-wins rules in `buildEvidenceIndex`, `applySupersededMarks`, and `findEvidence`/`resolveRecord` depend on the `inOrder` sequence (replay memo, non-replayable item 6). The corpus file ordering at golden-run time is part of the pin.
- The empty mark set must be an explicit pin (`supersession_marks_digest` over `[]`), not a missing field, so a later run with real marks is a detectable input change rather than a silent addition.

## 3. Replay procedure

Adapted from the replay memo's steps 0-7, specialized to the chosen derivation. Each step cites the machinery; the combined harness does not exist yet (replay-memo gap 1) and is not to be built by this design task.

**Step 0. Delete the disposable projection, keep the pins.** After the golden run records `expected_output_digest` and the full pin set, delete the composed answer object and any derived projection. What survives: the pin set, the pinned inputs (fixture file, evidence corpus files, mark set, viewer mode), and the pinned prose artifact bytes.

**Step 1. Re-pin the snapshot.** Load the fixture base, apply the pinned overlay event ids, re-run `graphSnapshotPin` (`src/fyd/ask/snapshot.ts:73`). Require equality with the pinned `graph_snapshot`. Mismatch stops the replay: it is not the graph the claims were made on.

**Step 2. Re-derive evidence records from stored bytes.** Run `resolveAcquisitionChain(<slug>)` (`src/fyd/acquisition/validate-chain.ts:375`) over the stored corpus files. Re-verifies sha256 of stored bytes against the acquisition record, binds every observation's `sourcePointer` to the acquisition digest, emits `ResolvedEvidence[]`. Any typed error (`digest_mismatch`, `byte_length_mismatch`, `dangling_source_pointer`, `missing_source_bytes`) fails the replay closed. Corpus slug and `corpus_version` must match the pins (the V1 committed set vs regen-emitted versions).

**Step 3. Re-apply supersession.** Run `applySupersededMarks(records, M)` (`src/fyd/evidence/refs.ts:161`) with the pinned mark set M (explicitly empty on the first run). First mark wins on duplicates; record order preserved.

**Step 4. Rebuild the evidence index.** Run `buildEvidenceIndex(records, graph)` (`src/fyd/evidence/refs.ts:92`). Loader "acquisition" placeholders are excluded by construction; any claim whose only resolution is a placeholder fails.

**Step 5. Re-run claim validation.** Run `validateClaims(C, evidenceLookup)` (`src/fyd/claims/claims.ts:265`) over the captured claim set C. Re-checks non-empty text, vocabulary membership, evidence-ref presence for DIRECT/DERIVED, ref resolution, non-supersession, and the DIRECT admission rule (every bound record kind `observation` with real observationId and `supersededBy === null`).

**Step 6. Re-run citation bindings and presentation bindings.** For every citation ref in C, run `validateEvidenceRef(ref, {index, graph, viewer: V})` (`src/fyd/evidence/refs.ts:192`) with the pinned viewer mode: checks the digest match between the record's `sourcePointer` and the citing object's `fields.source_digest` (`wrong_snapshot`), the FYD-010 visibility gate (`hidden_evidence`), and graph anchoring. For every presented field binding, run `verifyPresentationBinding(binding, G)` (`src/fyd/sitespec/graph.ts:146`); omissions are recorded as gaps, never silently filled.

**Step 7. Recompute and compare.** Recompute the output digest over the same canonical structure as the golden run. Compare to `expected_output_digest`. Then run the artifact-regression leg: re-validate the pinned prose artifact's claim bindings against the replayed index (bindings valid or typed-invalid); do not regenerate prose and do not expect byte-identical text.

**Step 8. Assert dual-path agreement (replay-memo gap 6).** Run both the composer's `findEvidence` resolution (`src/fyd/ask/answer.ts:87`) and the validator's `resolveRecord` (`src/fyd/evidence/refs.ts:127`) over the same inputs and require agreement on every citation. A divergence is itself a replay failure with a typed reason, even if the digest matches.

## 4. PASS/FAIL criteria

Per the CEO order: PASS means the same deterministic semantic result from the pinned inputs. FAIL means the next moat defect was found. Either outcome is useful.

**PASS requires all of:**

- Snapshot re-pin equals the pinned `graph_snapshot`.
- Step 2 completes with zero typed errors and the emitted record count and `content_digest` match the pins.
- Steps 5 and 6 reproduce the golden per-claim, per-citation, and per-binding verdicts exactly, including typed failure reasons where the golden run recorded any.
- Step 8 shows composer/validator resolution agreement on every citation.
- Recomputed output digest equals `expected_output_digest`.
- Artifact-regression leg: the pinned prose artifact's bindings re-validate (or re-fail with the same typed reasons) against the replayed index.
- No UNKNOWN silently became a pass: any step that could not run its check fails the replay rather than skipping.

**FAIL classes, each a named finding for the moat backlog:**

- `SNAPSHOT_DRIFT`: re-pin mismatch. Means the derivation inputs moved; the receipt now names the wrong graph.
- `EVIDENCE_CORPUS_CHANGED`: `digest_mismatch`, `byte_length_mismatch`, `dangling_source_pointer`, or `missing_source_bytes`. Means stored bytes no longer back the evidence.
- `CORPUS_VERSION_CONFUSION`: `corpus_version` pin does not match what step 2 derived. Means V1 vs regen versioning is unenforced (replay-memo gap 4, live).
- `WRONG_SNAPSHOT`: citing object's `fields.source_digest` no longer matches the record's `sourcePointer` digest. Means the object moved to a different acquisition than the one cited.
- `SUPERSEDED_RESURRECTION`: a record marked superseded in M validates as current, or a current record validates as superseded when M says otherwise. This is the stale-claim-resurrection detector and maps directly to the CEO order's STALE CLAIM RESURRECTED field.
- `HIDDEN_EVIDENCE_LEAK`: a citation validates for a viewer mode whose gate should have hidden it. Privacy-authority failure.
- `RESOLUTION_DIVERGENCE`: step 8 composer/validator disagreement (replay-memo gap 6, live).
- `VERDICT_MISMATCH`: digest differs with no typed reason above. Means an unmodeled nondeterminism source (ordering, environment, unpinned input). The finding is the input that was not pinned.

**The golden-run report skeleton** (fields from the CEO order, to be filled by the crew):

- CUSTOMER QUESTION: ...
- ANSWER: ... (prose artifact digest, not prose re-derivation)
- PINNED EVIDENCE: acquisition digest, observations digest, corpus version, per-claim evidence refs
- DERIVATION: askfyd-answer pipeline, `derivation_version`, `policy_version`
- OWNER CORRECTION: none in first run, or the correction record ref if the mark set is non-empty
- OLD ANSWER PRESERVED: YES/NO (whether superseded answer records remain intact and unmodified)
- STALE CLAIM RESURRECTED: YES/NO
- REPLAY FROM PINNED INPUTS: PASS/FAIL
- RECONSTRUCTED RESULT: recomputed digest and verdict comparison
- PRODUCTION IMMUTABILITY STANDARD: expected FAIL + exact gap (see below)
- FIRST BROKEN INVARIANT: ...
- NEXT: ...

**Production immutability standard, stated plainly:** E-1 as designed runs against sandbox files and a worktree checkout; it does not and cannot demonstrate the production event plane standard. The known exact gap, carried over from C1 V2 and the CEO order: the production application role is a superuser outside the database trigger seal, so production immutability is currently application discipline, not a system property. Do not market otherwise. Closing that gap is a separate work item, not part of E-1.

## 5. Open questions the crew must resolve before execution

- **O1. Read-model target (the split).** This design pins the reconstruct target to the ask lane's composed graph: fixture base digest + pinned overlay event ids + FYD-024 snapshot pin (Side A). The PING-backed projection (Side B) is disqualified for this derivation. The crew must confirm this choice explicitly in the golden-run record, because a reader of the receipt will ask why the receipt does not name the projection. Unifying the read models remains a separate backlog item owned by the fyd-build lane; E-1 records the split, it does not fix it.
- **O2. The question.** Recommended: "What services does Coppersmith Plumbing offer?" (sharp, customer-visible, sits on the D1/D2 disagreement). Alternative: a business-field question ("What is the phone number of Coppersmith Plumbing?") whose inputs are identical on both read models, for a read-model-agnostic first run. The crew picks one; the pin records which.
- **O3. Viewer mode.** `visitor` vs `demo_owner`. Verdicts are viewer-dependent by design under FYD-010. Recommend `visitor` for the first run; `demo_owner` outcomes must be labeled demo and never fed to owner-loop learning.
- **O4. Supersession marks storage.** No canonical stored home exists on the ask path (replay-memo gap 2). For the first run, pin an explicitly empty mark set. If the crew wants E-1 to exercise the correction leg (ASK-030 shape), they must first decide where M lives and version it alongside the corpus; that decision is prerequisite, not part of E-1.
- **O5. Claims capture.** Claims are not persisted today (replay-memo gap 3). The crew must decide the capture mechanism for C at the golden run: a one-off golden file for E-1 only, or the proposed (unbuilt) `AskFydOutcomeRecord` journal. Do not build the journal as part of E-1.
- **O6. Dual-path agreement.** Require the step 8 composer/validator agreement assertion before trusting any verdict (replay-memo gap 6). If the paths diverge, that divergence is the E-1 finding.
- **O7. Tree and version ownership.** The replay machinery lives in `~/workspace/fyd-build`; the gold set and active ask work live in `/home/nolan/projects/ping-askfyd-gold`. The crew must name the exact tree, branch, and commit that `derivation_version` and `policy_version` refer to before the golden run. Reconcile with the frozen identity ruling before minting any digest-based record id.
- **O8. Corpus slug and version.** Confirm which site slug's corpus files exist on disk at execution time and pin `corpus_version` explicitly (V1 committed vs regen-emitted).
- **O9. Prose artifact handling.** Confirm the artifact-regression leg semantics with the crew: pinned prose bytes are re-validated for binding correctness only; byte-identical regeneration is never expected and never claimed.

## 6. Non-goals

- No new authorities. No ReceiptAuthority, ReplayAuthority, ClaimAuthority, DecisionAuthority, or any other new authority, store, runtime, scheduler, or framework. The receipt is a derivation/evidence artifact over existing EVENTS, EVIDENCE, OBJECTS, TRANSITIONS, PROJECTIONS, and CAPABILITIES. If execution proves a missing authority, that proof is itself a finding, not a license to build one here.
- No implementation. This design does not build the combined replay harness, the claims capture, the mark storage, or the outcome journal. Those are crew decisions with their own sequencing.
- No touching crew lanes. FOCUS-1 through FOCUS-10, the BUG-0001 archaeology, the C1 perfecting pass, the website synthesis, and the FYD owner loop are not in scope and are not to be duplicated or interfered with.
- No publication. Nothing here is a market claim. C1 V2 remains a product hypothesis. The production weakness stays stated until fixed.
- No push. Nothing in this design authorizes or requires pushing any branch.
