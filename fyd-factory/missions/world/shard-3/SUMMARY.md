# WORLD-SHARD-3 SUMMARY (indices 1500-1999, 500 missions)

Worker: WORLD-SHARD-3. Repo: /home/nolan/projects/ping, branch fyd-factory, HEAD e48ef710 (read-only; 103 dirty files from other lanes untouched, zero repo writes).
Harness: `harness.ts` (esbuild-bundled, one ssh invocation for the whole shard; render-model + HTML-string verification, no live browser).
All artifacts synthetic: every result line carries synthetic:true + testing_only:true.

## Outcome distribution

| Outcome | Count | Share |
|---|---|---|
| GENERATED | 423 | 84.6% |
| GENERATED_WITH_WARNINGS | 68 | 13.6% |
| EVIDENCE_CONFLICT | 9 | 1.8% |
| NEEDS_REVIEW | 0 | 0% |
| IDENTITY_AMBIGUOUS | 0 | 0% |
| UNSAFE_SOURCE | 0 | 0% |
| ACQUISITION_FAILED | 0 | 0% |
| UNSUPPORTED | 0 | 0% |
| CRASH | 0 | 0% |

Warnings (all by-design hostile/intent handling): media_unavailable 48, acquisition_partial_no_jsonld 20, evidence_conflict_unresolved 9, owner_hide_vacuous 4.

## Latencies (ms)

| Stage | p50 | p95 | max |
|---|---|---|---|
| total | 2 | 5 | 28 |
| source | 0 | 0 | 1 |
| observation | 0 | 0 | 1 |
| evidence | 0 | 0 | 0 |
| objects | 0 | 0 | 1 |
| relationships | 0 | 0 | 1 |
| owner_intent | 0 | 0 | 1 |
| projection | 0 | 0 | 0 |
| sitespec | 0 | 1 | 1 |
| render | 2 | 4 | 21 |
| verify | 0 | 1 | 6 |

Render (react-dom/server static markup) dominates; everything else is sub-millisecond.

## Throughput and saturation

- 500 missions in 1,367 ms harness wall time = 365.8 missions/sec (single ssh invocation incl. esbuild bundle: ~4 s end to end).
- Peak RSS: 120 MB.
- Pig load before run: 1-min 2.39 on 24 cores (saturation rule: no wait needed). No throttling observed.

## Volume totals

7,034 objects, 6,534 relationships, 7,456 sections rendered across 500 worlds. 100 hide-object intents, 100 correct-fact intents.

## Failure taxonomy

- EVIDENCE_CONFLICT (9 @ observation): contradictory-sources hostile worlds. Typed outcome by design: two synthetic sources disagree on phone/hours, conflict left unresolved, unbound_claim_count=2, render still produced with source-A values. Not a repo defect.
- GENERATED_WITH_WARNINGS: broken-media (48, gallery/hero honestly absent), no-jsonld (20, sparse extraction: name+phone only, 1 object, still 6 sections), owner_hide_vacuous (4: hide-object intent on sparse no-jsonld worlds with no non-owner object; nothing to hide, logged not failed).
- Zero validator errors across all 500 specs (spec_valid=true everywhere). Zero unsafe URL scheme leaks in href/src/action/style (unsafe_url_count=0 on all 500). Zero crashes. Zero assert failures after the harness fix below.

## Generic classes and patches

No generic repo failure class found (nothing hit the 3+ same-signature bar as a defect). No patches proposed; missions/patches/ untouched. The repo was never written to.

One harness-side defect found and fixed (my own verify code, not the repo): the hidden-object leak assert used a raw substring check, which false-positived on world 1745 ("Advisors Assessment 1" hidden vs visible sibling "Advisors Assessment 11"). Root-caused by replicating the mulberry32 sequence in Python and confirming the title-prefix collision. Fix: boundary-aware match (`(?![0-9A-Za-z_])`). Full shard re-run after the fix: 0 assert failures, 1745 now GENERATED. Fix verified in real operation.

## Verification highlights

- Owner hide respected: 100/100 hidden objects absent from public HTML; evidence records retained the hidden objects (owner hide did not delete evidence).
- Owner correct-fact effective: 100/100 worlds render the owner phone as the effective value; correction records preserve sourceValue != ownerValue (history intelligible, never collapsed).
- Determinism: 20/20 spot checks (every 25th world re-rendered, sha256 identical).
- Viewport meta present and >=1 section on all 500 pages.

## Hostile coverage in this shard's index range

The deterministic contract only exercises 4 of 10 hostiles for i in [1500,1999]: contradictory-sources (9), broken-media (48), no-jsonld (20), clean (423). NOT exercised here: unsafe-urls, rtl-text, franchise-lookalike, conflicting-hours, stale-source, many-services. Those live in other shards' ranges (shard 4 covers unsafe-urls/many-services/conflicting-hours; shard 5 covers unsafe-urls/rtl-text/franchise-lookalike; shard 6 covers rtl-text/franchise-lookalike/stale-source). IDENTITY_AMBIGUOUS and UNSAFE_SOURCE outcomes therefore have zero samples from this worker.

## Findings (shared record format)

DOMAIN: fyd.render.seam / COMPONENT: buildRenderContext + resolveQuery / CLAIM: owner-hidden objects (visibility private) are excluded from every public query path end to end / EVIDENCE: 100/100 hide-object missions, hidden title/id absent from rendered HTML, spec sections exclude them, evidence records retained / CALLER: harness verify / CALLEE: src/fyd/sitespec/field-visibility.ts, src/fyd/components/renderer.tsx / WRITER: harness.ts / READER: parent orchestrator / AUTHORITY: fyd.sitespec.validator + HTML-string asserts / CLASSIFICATION: verified-behavior / CONFIDENCE: 1.0 / BROKEN BOUNDARY: none / DEPENDENCIES: ObjectVisibility, generateSiteSpec / AFFECTS AGENTS: workers relying on owner-hide semantics.

DOMAIN: fyd.owner.seam / COMPONENT: ownerFieldCorrections read model / CLAIM: owner correct-fact wins as the effective value while source history stays intelligible / EVIDENCE: 100/100 correct-fact missions render owner phone; correction record carries sourceValue != ownerValue / CALLER: harness verify / CALLEE: src/fyd/components/renderer.tsx (correctionFor) / WRITER: harness.ts / READER: parent orchestrator / AUTHORITY: OwnerFieldCorrection type, HTML-string asserts / CLASSIFICATION: verified-behavior / CONFIDENCE: 1.0 / BROKEN BOUNDARY: none / DEPENDENCIES: owner-overlay read seam / AFFECTS AGENTS: SYNTH workers (reobservation loop).

DOMAIN: fyd.test.harness / COMPONENT: shard-3 verify assert / CLAIM: substring presence checks on titles false-positive when sibling titles share a numeric prefix / EVIDENCE: world 1745 NEEDS_REVIEW re-diagnosed as assert bug via PRNG replication; boundary-aware fix; clean re-run / CALLER: WORLD-SHARD-3 / CALLEE: harness.ts verify step / WRITER: WORLD-SHARD-3 / READER: other mission workers / AUTHORITY: shard-3 results.jsonl (before/after) / CLASSIFICATION: harness-defect-fixed / CONFIDENCE: 1.0 / BROKEN BOUNDARY: none (repo unaffected) / DEPENDENCIES: synthetic title numbering scheme / AFFECTS AGENTS: any worker doing HTML presence asserts on generated titles.

DOMAIN: fyd.factory.coverage / COMPONENT: deterministic world addressing / CLAIM: shard 3's index range cannot exercise 6 of 10 hostile classes / EVIDENCE: hostile = HOSTILES[(i//192)%10] yields only {contradictory-sources, broken-media, clean, no-jsonld} for i in [1500,1999] / CALLER: WORLD-SHARD-3 / CALLEE: MISSION-PROTOCOL.md / WRITER: WORLD-SHARD-3 / READER: parent orchestrator / AUTHORITY: protocol contract + results.jsonl / CLASSIFICATION: coverage-gap / CONFIDENCE: 1.0 / BROKEN BOUNDARY: none / DEPENDENCIES: shard index ranges / AFFECTS AGENTS: workers on shards 4/5/6 own the untested hostile paths.
