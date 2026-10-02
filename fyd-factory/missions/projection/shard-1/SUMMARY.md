# PROJECTION-SHARD-1 SUMMARY (missions 500-999)

Worker: PROJECTION-SHARD-1. Repo: /home/nolan/projects/ping @ e48ef710 (read-only, fyd-factory branch).
Harness: one tsx invocation for all 500 missions; results appended incrementally to results.jsonl.

## Method
Per mission i in [500,999]: fixture = FILES[i % 62] across ~/workspace/fyd-factory/corpus/fixtures/
(batch-a, batch-b, hostile, professional, clearwater, clearwater-plumbing-demo).
Deterministic mutation (mulberry32 seed i): one object forced private with injected
markers (prv-{i}@example.test, PRV-{i}, PRVF-{i}); if i%5==0 one object owner-hidden
(HID-{i}, HIDF-{i} field); if i%5==1 one owner phone correction (sourceValue vs
ownerValue); field decisions (hide private fields, coarse address).
16 projections generated through repo gates: publicObjects + assertNoPrivateLeak
(builder/visibility), applyFieldVisibility + coarsenAddress (sitespec/field-visibility),
answerConciergeQuestion + toAskFydAnswer + CONCIERGE_QUESTIONS (ask/concierge, 3 canned
questions per mission). Projections: website-sections, mobile-summary, ask-answers,
owner-dashboard-view, circle-context, mcp-context, search-doc, faq, catalog,
directory-entry, portfolio-card, proposal-draft, lead-intake-schema, campaign-draft,
landing-page, analytics-view. ~60 checks per mission: leak scans on all 15 public
projections, canonical-authority scans, projection markers, public-stays-public,
hidden-stays-hidden, SOURCE FACT / OWNER INTENT / OBSERVATION labeling, stale-source
retirement, field-hide/coarse, ask evidence integrity + public-only evidence refs,
gate fail-closed probe (private binding must throw).

## Outcome distribution (n=500)
- PASS: 116
- PASS_WITH_NOTES: 312 (all notes = concierge legitimately refusing questions with
  no evidence, e.g. "who works here" on no-people fixtures; refusal is the correct
  fail-closed behavior)
- UNSUPPORTED: 72 (64 = provenance.json fixture files carry no object graph;
  8 = hostile-stale 2-object fixtures where mutation consumed both objects,
  harness artifact, not a repo failure)
- LEAK: 0
- MISLABELING: 0
- THROW: 0
- NEEDS_REVIEW: 0

## Leak / mislabeling counts
- Private-fact leaks into public projections: 0
- Owner-hidden leaks into public projections: 0
- Canonical-authority claims by any projection: 0
- Source/intent/observation mislabelings: 0
- Ask answers citing non-public objects or unevidenced graded claims: 0
- Findings emitted: 0

## Failure taxonomy
No failed checks across 29,900+ check executions. No generic failure classes
(threshold: 3+ missions sharing a signature). Improve-once loop: not triggered;
no patches proposed.

## Performance / saturation
- Pig load before run: 2.31 on 24 cores (well under the 2x-core tripwire).
- Full shard: 500 missions in 0.3 s of harness compute (single tsx invocation);
  missions/min ~100,000; peak heap 17.0 MB.
- Per-mission latency: p50 0 ms, p95 2 ms, max 5 ms.
- Ask concierge: 1,500 questions attempted, 791 answered, 709 refused (no evidence).

## Notes
- The repo's gates held everywhere they were probed: publicObjects excluded
  private/hidden objects in all 428 supported missions; assertNoPrivateLeak threw
  on every private-binding probe and accepted every public binding;
  applyFieldVisibility removed hide-policy fields and coarsened addresses;
  the concierge threw zero times and refused rather than inventing answers.
- Two harness bugs were found and fixed during smoke tests (relationship-id
  evidence refs misclassified; vacuous owner-intent layer check). No repo bugs found.
