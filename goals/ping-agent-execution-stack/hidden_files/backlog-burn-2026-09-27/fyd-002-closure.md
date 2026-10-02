# FYD-002 closure ledger — NOW-1 acquisition contract (P1)

2026-09-27 ~09:40 MDT. Implementer verdict: PASS.

## What was harvested (before writing anything)

1. `~/workspace/acquisition-seam/` — LANE ACQ-1 (2026-09-24, Nolan's URL TRUST directive): the single SSRF-hardened fetch seam `acquireUrl(url, opts)` -> `{ ok: true, bytes, contentType, finalUrl, redirectChain }` | `{ ok: false, reason, redirectChain }`, 58/58 hostile battery PASS. **Reused as authority, not reinvented**: the contract covers what a fetch PRODUCED (stored bytes + contentType + retrieval metadata), not the fetch itself. No second fetch path, no "service crawl logic" invented.
2. `src/fyd/evidence/refs.ts` (FYD-009) — digest convention and fail-closed typed validation style (`dangling_evidence_ref`, `wrong_snapshot`). The contract mirrors its `web:sha256:<digest>` pointer convention and its typed-failure posture.
3. `src/fyd/ask/types.ts` — `ResolvedEvidence` (`ref/kind/observationId/sourceUrl/sourcePointer/observedAt/extractor/summary`). The contract maps parsed observations into this EXISTING shape; no new evidence authority created.
4. `~/workspace/fyd-harvest/lanes/f-provenance.md` — Lane F provenance audit: documented the known chain-breaks this contract closes (object-level digest without byte-verified bytes; `ExtractedField -> scalar` dropping). The contract's hop-2 pointer binding is the per-observation anchor Lane F found missing.
5. Existing convention verified BEFORE formalizing: `evidence/acquisition-<slug>-2026-09-22.json` files are CONSISTENT with the stored bytes and all 11 observations across both fixtures (proven independently via python3 sha256 below and again mechanically via the new loader in jest).

## Delta (files + diff stat)

- NEW `src/fyd/acquisition/types.ts` (~200 lines): `AcquisitionRecord`, `ParsedObservation`, `AcquisitionSource`, `FetchedResource`, `ParserIdentity`, `AcquisitionResult` (source / fetched resources / content digests / parsers w/ version / observations / acquiredAt), typed `AcquisitionChainError` with 8 failure codes (missing_acquisition_record, missing_observations, missing_source_bytes, digest_mismatch, byte_length_mismatch, dangling_source_pointer, malformed_acquisition_record, malformed_observation), `parseParserIdentity`.
- NEW `src/fyd/acquisition/validate-chain.ts` (~350 lines): NODE ONLY (fs). `loadAcquisitionRecord`, `loadSourceBytes`, `verifyAcquisitionBytes`, `loadObservations`, `bindObservationsToAcquisition`, `collectParsers`, `buildAcquisitionResult` (defensive re-binding), `observationsToEvidenceEntries` (ResolvedEvidence shape), `resolveAcquisitionChain` (the full mechanical walk).
- NEW `src/fyd/acquisition/__tests__/acquisition.test.ts` (11 tests): both real fixture chains resolve; 7 tamper/fail-closed cases.
- EDIT `jest.config.cjs`: added `src/fyd/acquisition/__tests__/*.test.ts` to testMatch.
- EDIT `tsconfig.json`: added `src/fyd/acquisition/**/*` to include.

Surface boundaries respected: `src/fyd/ask/` untouched (FYD-010 in flight), `src/fyd/components/renderer.tsx` untouched (FYD-012 later), nothing Pig-side. Branch: fyd-002-acquisition-contract (local, NOT pushed).

## Full test output

- `npx jest --config jest.config.cjs src/fyd/acquisition`: **11/11 PASS** (happy-place 6-observation chain; coppersmith 5-observation chain; mutated bytes -> digest_mismatch; wrong-digest acquisition record -> digest_mismatch; dangling sourcePointer -> dangling_source_pointer; wrong sourceUrl -> dangling_source_pointer; missing bytes -> missing_source_bytes; malformed record -> malformed_acquisition_record; cross-chain binding refused defensively).
- `npm test` (full suite): **22 suites, 221/221 PASS** — no regressions.
- `npx tsc --noEmit -p tsconfig.json`: clean, exit 0.

## Mechanical hop-by-hop resolution proof (against the REAL stored bytes)

Happy-place chain (`evidence/happy-place-2026-09-22.html`):
- Hop 1 (bytes -> acquisition): stored file 139661 bytes == acquisition `contentBytes` 139661; sha256(bytes) = `40f7c22d6b1a5a3f99d956670ed004422f330bca36b277ae5552a7faad72a68c` == acquisition `contentDigest` (verified by the loader in jest AND independently via python3 hashlib).
- Hop 2 (acquisition -> observations): all 6 observations (`obs-happy-place-business-fields`, `obs-happy-place-estimate-service-card-{drywall,fences,painting,repairs,restoration}`) have `sourcePointer == web:sha256:40f7c22d...a68c` == `web:` + acquisition contentDigest, and `sourceUrl == https://happy-place-platform.vercel.app/` == acquisition sourceUrl.
- Hop 3 (observations -> evidence entries): 6 `ResolvedEvidence` entries, kind `observation`, each `sourcePointer` byte-verified; parser identity `service-cards.ts v2-2026-09-22`.

Coppersmith-plumbing chain (`evidence/coppersmith-2026-09-22.html`):
- Hop 1: stored file 117900 bytes == `contentBytes` 117900; sha256(bytes) = `2233052b4ad0da1dac9a905dd2ea4b0b54e0b30f36428bfc0c73f785904b9e57` == acquisition `contentDigest`.
- Hop 2: all 5 observations (`obs-coppersmith-plumbing-business-fields`, `obs-coppersmith-plumbing-elementor-cta-services-{cooling,hvac,plumbing,ventilation}`) have `sourcePointer == web:sha256:2233052b...b9e57`, `sourceUrl == https://www.coppersmithplumbing.com/`.
- Hop 3: 5 evidence entries, byte-verified pointers; cross-chain binding refused (coppersmith observations against the happy-place digest fail `dangling_source_pointer` by test).

Fail-closed tamper cases all produce typed `AcquisitionChainError` (never silent skips, never empty results): see the 7 tamper tests above.

## Recommended follow-ups

- FYD-038 synthetic-overlay labeling remains OPEN (per triage) — this contract covers acquisition, not synthetic overlays.
- Adoption path for the factory: when intake lands bytes via the acquisition-seam, write the `acquisition-*.json` record and run `resolveAcquisitionChain` as the intake gate before parsing continues downstream.
