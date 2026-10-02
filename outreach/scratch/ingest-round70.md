# Meta AI tandem intel ingest — round 70 (2026-09-16 ~17:15 MDT)

## Files processed
- 20260916-210421-c-review-complaint-signals.md.CAPTURE_FAILED (written 21:04-21:06 UTC / 15:04-15:06 MDT) — the ONLY new file since the round-68 watermark. Recorded, NOT extracted.
- No new a/b/d answer files. Newest answer .md remains 20260916-090428-b (ingested round 66). Watermark NOT advanced.
- j/k clowning briefs remain out of scope, not processed.

## Verification results
None. The 210421-c set is a CAPTURE_FAILED raw capture, not an answer file; fail-closed per the research contract, nothing extracted, nothing promoted. No businesses qualified, so no scratch JSONL was written for this round and pipeline.md / leads.md / canonical JSONL were not touched.

## Rejection details (c-brief, 20260916-210421)
- Research contract v1.0.0 validator: 11 entries, 0 VALID (min 3 required), exit 3 → REJECTED.
- Failure mode identical to prior rounds: Meta AI self-labels entries INSUFFICIENT_EVIDENCE (no 1/2/3-star review cited, timing not resolvable to a date) and the validator derives CONTRADICTED; header town/trade fields disagree with entry fields.
- provenance.json: status=capture_failed, verification=failed, ping_ingestion=not_attempted. runs.jsonl: outcome=capture_failed, classification=contract_rejected, last_verified_state=capture_failed_terminal, resumable=true.

## Duplicates excluded
None (no extraction).

## Reliability data points
- c-brief rejection streak now at FOUR consecutive: round 62 (0/10 VALID), round 66 (0/12), round 68 (0/12, 150429 set), round 70 (0/11, 210421 set). This is systematic, not flaky: Meta AI cannot produce contract-valid review-complaint entries under the current prompt. Recommendation for the parent/meta-pass owner: the c-review-complaint-signals brief needs a prompt or contract fix before the next rotation pass; burning another Pig cycle on the unchanged brief is expected to fail again. (The rotation retry logic belongs to the meta-ai-intel-pass cron, not this run.)
- Meta AI's existence and SOS-date claims remain healthy when it actually captures (rounds 60/65/66). The c-brief is the outlier failure mode.
- Reliability ledger: explicit SOS dates correct 12/13 cumulative; novelty/dedupe claims unreliable; novelty AND website-absence claims unreliable on d-briefs; NEWNESS INFERENCE (batch adjacency) unreliable on b-briefs.
