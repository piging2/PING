# SYNTH Shard 0 — SUMMARY

Worker: SYNTH-SHARD-0. Shard: SYNTH missions, indices 0-499 (500 missions).
Harness: `work/harness.ts` (one invocation for the whole shard, run twice: reference mode + PATCHED mode).
Results: [results.jsonl](sandbox://workspace/fyd-factory/missions/synth/shard-0/results.jsonl) (reference), [results-patched.jsonl](sandbox://workspace/fyd-factory/missions/synth/shard-0/results-patched.jsonl) (fixes under test).
Repo: read-only at HEAD e48ef710; patches proposed as checked patch files, never applied.

## Headline rates

| metric | reference | patched |
|---|---|---|
| missions survived | 463/500 (92.6%) | 498/500 (99.6%) |
| owner-correction survival (correct-fact worlds, n=100) | 83/100 (83.0%) | 98/100 (98.0%) |
| hide survival (hide-object worlds, n=100) | 87/100 (87.0%) | 100/100 (100.0%) |

## Outcome distribution (reference)

- SURVIVED: 463
- FAILED: 37, all in 4 generic classes (each 7-13 missions, same signature):
  - HIDE_ORPHANED_ID_CHURN: 13 (stage: visibility)
  - CORRECTION_AMBIGUOUS_TARGET: 10 (stage: compose)
  - CORRECTION_SILENTLY_DROPPED: 7 (stage: compose)
  - SPURIOUS_DRIFT_CONFLICT: 7 (stage: compose)

## Invariants that held across all 500 missions (both modes)

history-immutable (occurrence ids append-only, byte-identical), no-unbound-claims (every public claim bound to an occurrence or an owner assertion), no-unsafe-urls (unsafe schemes stripped, zero leaked), hide-evidence-retained + hide-owner-view (hide never deleted underlying evidence), conflict-labeled (conflicting sources labeled, never silently resolved), owner-layer-intact (digest proof held 500/500, including on missions where application failed: the digest is necessary but not sufficient for correction survival), real-conflict-surfaced.

## Failure taxonomy and generic classes

### GC-1 HIDE_ORPHANED_ID_CHURN (13 missions)
- DOMAIN: FYD owner visibility / COMPONENT: src/fyd/owner-mode/visibility-policy.ts resolveFactVisibility / CLAIM: a HIDE assertion silently stops applying after a source refresh re-derives the graph with new object ids / EVIDENCE: 13 missions (e.g. fixture synth-shard0-hide-orphaned-id-churn, mission 20): hide assertions anchor to factId = sha256(objectId|field|index) (corrections.ts assertionFactId via facts.ts factIdFor); the identity-churn probe re-keys service object ids; refreshed factIds no longer match; the fact falls through to the conservative default (public) and the hidden service's name/description reappear in the public projection. Evidence occurrences retained, owner view intact. / CALLER: projectPublicFacts / CALLEE: resolveFactVisibility / WRITER: owner assertion pipeline / READER: public renderer / AUTHORITY: visibility-policy.ts / CLASSIFICATION: generic (13 same signature) / CONFIDENCE: high / BROKEN BOUNDARY: hide is anchored to a re-derivable id, so FACT/VISIBILITY separation breaks across refresh / DEPENDENCIES: facts.ts factIdFor, corrections.ts assertionFactId / AFFECTS AGENTS: owner-mode, projection, Ask FYD public answers.

### GC-2 CORRECTION_AMBIGUOUS_TARGET (10 missions)
- DOMAIN: FYD owner overlay / COMPONENT: src/fyd/object/owner-overlay.ts findBusinessObject + applyOwnerFieldCorrections / CLAIM: when a refresh emits two public business-role objects (franchise parent + local listing), the correction attaches to the first with no flag / EVIDENCE: 10 missions (fixture mission 61): the composed correction lands on the parent-brand object's phone field; the local business object shows the drifted source value; no error, no flag / CALLER: read seam (ping-object-source.ts) / CALLEE: applyOwnerFieldCorrections / WRITER: owner store / READER: site pages, Ask FYD, ObjectView, Circle / AUTHORITY: owner-overlay.ts / CLASSIFICATION: generic (10) / CONFIDENCE: high / BROKEN BOUNDARY: first-match predicate is a silent guess under identity ambiguity / DEPENDENCIES: SCHEMA_ROLES.business / AFFECTS AGENTS: all read-seam consumers.

### GC-3 SPURIOUS_DRIFT_CONFLICT (7 missions)
- DOMAIN: FYD owner overlay / COMPONENT: src/fyd/object/owner-overlay.ts sourceDrifted derivation / CLAIM: a whitespace / bidi-mark-only re-emission is flagged as source drift and raises a spurious CorrectionConflict / EVIDENCE: 7 missions (fixture mission 31): sourceDrifted compares trim(current) to the raw recorded sourceValue; a semantically identical re-emission wrapped in spaces/bidi marks yields drifted=true and a downstream "source now says X" conflict for a value that never changed / CALLER: applyOwnerFieldCorrections / CALLEE: corrections.ts conflict algebra / WRITER: owner overlay / READER: owner surfaces / AUTHORITY: owner-overlay.ts / CLASSIFICATION: generic (7) / CONFIDENCE: high / BROKEN BOUNDARY: normalization asymmetry between record path (raw) and read path (trimmed) / DEPENDENCIES: corrections.ts CONFLICT semantics / AFFECTS AGENTS: owner-mode.

### GC-4 CORRECTION_SILENTLY_DROPPED (7 missions)
- DOMAIN: FYD owner overlay / COMPONENT: src/fyd/object/owner-overlay.ts applyOwnerFieldCorrections / CLAIM: when the refreshed graph has no public business object, corrections return applied: [] with no trace while the owner-layer digest still verifies / EVIDENCE: 7 missions (fixture mission 71): visibility-flip probe re-derives the business object as unlisted; findBusinessObject returns null; surfaces show raw source values as if the owner never corrected; ownerLayerIntact=true throughout, proving the digest is necessary but not sufficient / CALLER: read seam / CALLEE: applyOwnerFieldCorrections / WRITER: owner store / READER: all read-seam consumers / AUTHORITY: owner-overlay.ts / CLASSIFICATION: generic (7) / CONFIDENCE: high / BROKEN BOUNDARY: silent no-op where an explicit orphan signal belongs / DEPENDENCIES: source-refresh.ts digest proof / AFFECTS AGENTS: all read-seam consumers.

## Patches proposed (missions/patches/, all pass git apply --check against pristine HEAD e48ef710)

1. synth-shard0-overlay-orphan-ambiguity.patch -> src/fyd/object/owner-overlay.ts (v2: extended during shard 1). Adds OrphanedCorrection {correction, reason, detail} to OwnerOverlayResult; applyOwnerFieldCorrections resolves candidates explicitly: exactly one -> apply; zero -> orphaned(no-business-object); two or more -> orphaned(ambiguous-target), refusing to guess (fail closed; previously attached to the first). v2 also makes findBusinessObject itself fail-closed (returns the object only when exactly one candidate matches; null otherwise) via a shared businessCandidates() helper, so no caller (overrides route, patch-loop preview, overlay) silently operates on the wrong business object; all three call sites already null-handle. Covers GC-2, GC-4, and GC-5 (shard-1 class).
2. synth-shard0-overlay-drift-normalization.patch -> src/fyd/object/owner-overlay.ts. Adds driftValuesEqual: trim + collapse whitespace runs + strip bidi controls (U+200E/U+200F/U+202A-U+202E) on BOTH sides before comparing; dashes, case, punctuation NOT folded. Covers GC-3.
3. synth-shard0-visibility-hide-reresolve.patch -> src/fyd/owner-mode/visibility-policy.ts. Adds resolveHideAssertions: exact factId first (unchanged fast path), then content-stable fallback (same field+index, value normalizes equal to sourceValueSeen); exactly one match wins; zero -> orphan, multiple -> ambiguous, both reported and never guessed. projectPublicFacts passes the full refreshed fact set so re-resolution sees the whole scope. Covers GC-1.

## Improve-once loop results

- Repro minimized per class -> fixtures in missions/fixtures/ (4 files, deterministic by mission index).
- Patches: 3 files, one authorized path each, git apply --check clean.
- Tested in-harness (PATCHED mode ports the exact patch logic): 498/500 survived; hide 100/100; correction 98/100.
- Falsified: work/falsify.ts, 20 adversarial probes (en-dash vs hyphen, case folding, null/empty, ambiguous identical values, null sourceValueSeen, field mismatch, transient disappearance/recovery, first-wins attachment) -> 20/20 PASS, fixes not broken.
- Reran affected missions: GC-1 13->0, GC-2 10->0, GC-3 7->0, GC-4 7->0.

## Residual (logged follow-up: 2 missions here, 5 across four shards)

CORRECTION_NOT_SURFACED x2 (missions 466, 486; plus 831 in shard 1, 1176 in shard 2, 1806 in shard 3 = 5 across four shards): identity-churn + visibility-flip coincide, leaving exactly one public business candidate: the parent-brand object. The correction attaches to it (count-based guard does not fire) while the local business shows the source value. Fixing this needs a stable target key carried on the assertion record (a corrections.ts record change), which is follow-up work, not part of the three minimal patches. Evidence preserved in results-patched.jsonl.

## Performance

- Throughput: ~41,700 missions/min (reference), ~31,800/min (patched). Peak RSS 106.5 MB, heap 12.8 MB.
- Stage latencies p50/p95 (ms): gen 0.043/0.551, intent 0.002/0.019, reobserve 0.029/0.389, refresh 0.059/1.216, verify 0.031/0.112.
- Saturation: Pig load 2.44 on 24 cores at start (1-min avg); no wait needed; no throttling observed.

## Notes and caveats

- The harness ports the repo's documented semantics (owner-overlay.ts, source-refresh.ts, corrections.ts, visibility-policy.ts, facts.ts) into a self-contained model; it does not execute repo code. Findings are design-level, grounded in the actual code read from the repo at HEAD e48ef710. The patches are proposed, not applied (repo is integration-writer owned).
- Every synthetic artifact carries synthetic:true + testing_only:true; nothing here represents a real business.
- results.jsonl is the canonical per-mission record (one line per mission: world params, probes, outcome, checks, latencies, counts).
