# WORLD-SHARD-0 SUMMARY

Worker: WORLD-SHARD-0 (depth 2, no children). Shard: world indices 0-499 (500 missions).
Repo: /home/nolan/projects/ping, branch fyd-factory, read-only via ~/workspace/bin/wsl-run.sh. Repo never touched, nothing committed.
All artifacts synthetic: every record carries synthetic:true + testing_only:true. Nothing presented as real.

## Outcome distribution (500/500 missions completed)

- GENERATED: 225 (45.0%)
- GENERATED_WITH_WARNINGS: 275 (55.0%)
- EVIDENCE_CONFLICT: 0 (reclassified 2026-09-23, see taxonomy note below)
- CRASH: 0
- NEEDS_REVIEW: 0
- UNSUPPORTED: 0
- UNSAFE_SOURCE: 0
- ACQUISITION_FAILED: 0
- IDENTITY_AMBIGUOUS: 0

Warning-class breakdown (227): owner-intent correct-fact 75, owner-intent hide-object 75, hostile no-jsonld 48, hostile many-services 29 (one world carried both hostile and owner intent; warning signature records the hostile first).

Verify asserts across all 500: unsafe URL schemes in output 0, unbound factual claims 0, hidden-object leaks 0, validator errors 0, viewport meta present 500/500, sections >= 1 on 500/500 (min 1, p50 15). Determinism spot-check (every 50th world, regenerate spec, compare digest): 10/10 identical.

## Latency (ms per mission, harness-measured)

- mission total: p50 1.72, p95 3.11, max 24.50
- source: p50 0.01, p95 0.01
- observation: p50 0.00, p95 0.00
- evidence: p50 0.00, p95 0.00
- objects: p50 0.01, p95 0.01
- relationships: p50 0.00, p95 0.00
- owner_intent: p50 0.00, p95 0.00
- projection: p50 0.00, p95 0.00
- sitespec: p50 0.04, p95 0.06
- render: p50 0.00, p95 0.00
- verify: p50 0.11, p95 0.17 (slowest stage: regex scans over ~52KB HTML, p50 length 52,543)

Throughput: 500 worlds in 980 ms harness time (~30,600 missions/min compute); end-to-end wall ~5 s including ssh + tsx startup (~6,000/min). Peak RSS 161 MB. One tsx invocation for the whole shard; results streamed incrementally to results.jsonl (crash-safe).

## Saturation

Pre-run load check: 1-min load 2.56 on 24 cores (threshold 48). No waits needed. Noted during run: the dirty working tree is live-mutated by other lanes; one transient breakage observed (registry.ts briefly imported a nonexistent ./schema-roles mid-run, fixed by its lane minutes later). Harness retries after such events; final run saw a healthy tree.

## Failure taxonomy

No repo defects found. Terminal non-generated outcomes are all by-design hostile simulations:

- GENERATED_WITH_WARNINGS includes hostile=conflicting-hours (48): two source records disagreed on hours; both preserved in evidence with conflict flags; resolved deterministically by source-a precedence; rendered with a recorded warning. (Previously labeled EVIDENCE_CONFLICT; reclassified 2026-09-23 per factory falsification FF-1: a terminal outcome must not label a completed, fully-verified render. See taxonomy note.)
- GENERATED_WITH_WARNINGS: hostile no-jsonld (degraded field set, site still rendered), hostile many-services (12 services rendered), owner-intent hide-object (75, incl. 12 where the owner hid the business object itself: generator emitted only the owner-independent explore page), owner-intent correct-fact (75: owner phone won in every tel: link; source value retained only in the evidence badge, by renderer design).

## Generic classes and the improve-once loop

One candidate generic class appeared mid-run: `hidden-object-leaked` (13 missions, owner hid the business object).

- Minimize: isolated repro of one world showed the private object itself never rendered (0 pages from owner-dependent generators; explore page listed only public objects).
- Root cause: harness artifact, not a repo defect. My world builder embedded the business name in related objects' post titles ("Update N from <BizName>") and descriptions; the leak check substring-matched the hidden title against harness-authored prose on public objects. The repo visibility seam (resolveQuery pub() filter, generator public-only grouping) worked correctly in all 13.
- Falsify: fixed the builder to use neutral titles/descriptions, reran the full shard: hidden-object-leaked went 13 -> 0, with the 13 worlds reclassifying to GENERATED_WITH_WARNINGS (13). Classification falsified; no repo patch warranted (no defect, and generator semantics are another lane's authority).
- Patches proposed to missions/patches/: none. Fixtures added to missions/fixtures/: none (no repo defect to pin).

Two further targeted verifications (not full classes):
- correct-fact rendering: first harness version attached a malformed OwnerFieldCorrection (missing correctedAt/actorLabel/basis) and the renderer threw at renderer.tsx:800 (correction.correctedAt.slice). Fixed in harness to emit spec-complete correction records; all 100 correct-fact worlds then rendered with the owner value in every tel: link.
- unsafe-urls hostile does not occur in shard 0's address space, so I tested the detector directly: a javascript: website value is neutralized by the repo's resolveSafeLink seam (0 unsafe scheme matches in output; the raw string never reaches the HTML). The UNSAFE_SOURCE classifier is armed and would have fired.

## Findings (shared record format)

DOMAIN: fyd.sitespec.generator / COMPONENT: explorePage / CLAIM: explorePage renders a public-object feed even when the owner business object is hidden or absent, so a site can exist with zero owner-bound content / EVIDENCE: 13 shard-0 worlds where owner intent hid the business object produced page_count=1 (explore), section_count=1, validator_errors=0; hidden object id/title absent from HTML in all 13 after harness fix / CALLER: generateSiteSpec / CALLEE: explorePage, resolveQuery / WRITER: proceduralize lane / READER: renderer / AUTHORITY: fyd-factory shard-0 (observation only) / CLASSIFICATION: observation, by-design behavior, not a defect / CONFIDENCE: high / BROKEN BOUNDARY: none / DEPENDENCIES: none / AFFECTS AGENTS: future owner-hide UX work (whether an ownerless explore feed is desired is a product decision for Nolan, not a bug).

DOMAIN: fyd.sitespec.safe-link / COMPONENT: resolveSafeLink / CLAIM: unsafe URL schemes in source fields never reach rendered output / EVIDENCE: targeted javascript: website probe rendered 0 unsafe-scheme attribute matches; raw scheme string absent from HTML / CALLER: renderer contact/link binding / CALLEE: resolveSafeLink / WRITER: sitespec lane / READER: renderer / AUTHORITY: fyd-factory shard-0 / CLASSIFICATION: verified invariant / CONFIDENCE: high / BROKEN BOUNDARY: none / DEPENDENCIES: none / AFFECTS AGENTS: none.

## Coverage notes

Shard 0's deterministic address space exercises hostiles {clean, no-jsonld, conflicting-hours, many-services} only ((i//192)%10 in {0,1,2} for i<500). Hostiles {unsafe-urls, rtl-text, franchise-lookalike, stale-source, contradictory-sources, broken-media} fall in higher shards. All 32 types and 6 dims covered (16/16/16... per type; dims 96/96/96/84/64/64).

## Outputs

- results.jsonl: one JSON line per mission (500), fields: mission, shard, i, type, dim, hostile, owner_intent, outcome, failure_stage, failure_signature, stage_latencies_ms, object/relationship/observation/evidence/section/page counts, validator errors/warnings, unsafe_url_count, unbound_claim_count, hidden_leak_count, viewport_meta, correction checks, determinism spot-checks, elapsed_ms, notes, synthetic:true, testing_only:true.
- SHARD-LOG.md: decisions and the post-shard continuation.
- Working files: run.sh, gen-runner.sh (harness generator), smoke.sh, dbg.sh, _harness-body.sh, run-progress.log, run-stats.txt.

## Taxonomy note (2026-09-23, factory falsification alignment)

Sibling worker WORLD-SHARD-1's FALSIFICATION.md (FF-1) showed this shard's
48 EVIDENCE_CONFLICT labels were misclassifications: terminal outcomes mean
the pipeline produced no trustworthy site, but all 48 rendered full sites
with every verify assert passing; the hours conflict was resolved by
documented source-a precedence. Accepted (confidence high). All five of my
shards (0, 4, 6, 8, 9) were rerun under the aligned taxonomy:
conflicting-hours -> GENERATED_WITH_WARNINGS; contradictory-sources (phone,
identity-critical, no safe fail-closed) -> halt at evidence, no render,
EVIDENCE_CONFLICT (adopting shard-2's FF-4-confirmed exemplar);
franchise-lookalike -> GENERATED_WITH_WARNINGS (identity known by synthetic
construction, FF-2). One divergence from FF-1's suggestion: world-240
(conflicting-hours + owner hid the business, 1-page explore-only render)
stays GENERATED_WITH_WARNINGS, not NEEDS_REVIEW/UNSUPPORTED: the
explore-page-without-owner is by-design generator behavior and every assert
passed, so it meets the "trustworthy site" bar for a warnings label.
