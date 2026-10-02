# LINEAGE-REPORT.md — LANE-LIN final verification report

Lane: LANE-LIN (lineage lane), resumed after daemon restart. The previous agent had staged the tracer machinery on the Pig and generated both chain records (01:19 / 01:20 UTC 2026-09-24), then was killed mid-verification. This report covers only the verification that remained: I ran the remaining verifiers (Pig `verify-tracer.ts` self-test, the happy-place JSON inspectors, and new coppersmith equivalents I wrote), and did not redo any completed probes or modify the Pig repo.

## Lane intent (recovered from artifacts)

The lane proves end-to-end lineage for rendered facts on the two demo sites (Happy Place fencing, Coppersmith Plumbing) through the real FYD machinery: SOURCE BYTES -> OBSERVATION -> EVIDENCE -> OBJECT FIELD -> SITESPEC BINDING -> RENDERED CLAIM -> ASK FYD ANSWER. The tracer (`src/fyd/lineage/tracer.ts` on the Pig repo, branch `fyd-factory`) resolves each link with real pipeline code (pinned raw bytes, persisted observation records, the composed PING projection, `generateSiteSpec`, `renderSection` via `renderToStaticMarkup`, `buildAskFydContext` + `composeAskFyd`). Where a link cannot be machine-resolved, it returns status "missing" with a `needed` field; a missing link is a first-class verdict, nothing is faked.

## Per-site results

### happy-place (claim: fencing statement about staying straight / gates closing / Oregon winters)

- 7/7 links resolved. `complete: true`. Every link carries a pointer and an excerpt.
- Source bytes: pinned raw bytes under `src/fyd/proceduralize/raw/happy-place/`; `concatDigestMatches: true` (recomputed concat digest equals the machine-generated fixture header).
- Observation: claim is byte-locatable in pinned `index.html` at exact offset 46535. The extractor's recorded range 42463-46769 contains the claim start ("claim starts inside the recorded range").
- Evidence: object `website-business-6fa5ebd99d72c4cb-service-340c39513223`, provenance `website-derived`, ref `website-ingestion:https://happy-place-platform.vercel.app/`. Entity join: observation entityId joins relationship `rel-c0f...` with evidenceRef `proceduralizer:project:service-card:estimate-service-card:fences`.
- Object field: live value matches in composed projection; journal-overlay delta recorded (one added object `website-service-51de038c1defe8bd`, canonical-journal provenance).
- Sitespec binding: object bound into 4 sections (`home:Services:2`, `home:ObjectRail:8`, `services:Services:0`, `explore:ObjectFeed:0`).
- Rendered claim: claim present in `home:Services:2` and `services:Services:0` renders via `ServicesSection -> CardGrid -> FydObjectCard -> resolveBoundField` (verifier: `src/fyd/sitespec/graph.ts`). NOT present in `home:ObjectRail:8` (claimPresent False) — expected: the rail renders a doorway reference, not the full description; the link is resolved through the Services sections.
- Ask FYD answer: states the claim verbatim with citation `[1]` and 3 evidenceRefs (object + relationship + provenance). `partial: false`.

### coppersmith-plumbing (claim: "Are you working on new construction for residential homes or commercial buildings?")

- 7/7 links resolved. `complete: true`. Every link carries a pointer and an excerpt.
- Source bytes: `concatDigestMatches: true` against fixture header for `src/fyd/proceduralize/raw/coppersmith-plumbing/`.
- Observation: claim byte-locatable in pinned `index.html` at exact offset 65239 (file bytes independently show the claim text in context). Recorded range 63873-65082: "claim starts 157 bytes after range end (same card widget)". Per the tracer's documented design (staged by the previous agent), the recorded range is the extractor's element record, not required to contain the claim; the strong proof is the exact byte offset. Noted transparently, not hidden.
- Evidence: object `website-business-2f1327c09d622175-service-139408827c27`, provenance `website-derived`, ref `website-ingestion:https://www.coppersmithplumbing.com/`. Entity join: relationship `rel-f450fdb901a6baa3` with evidenceRef `proceduralizer:project:service-card:elementor-cta-services:plumbing`.
- Object field: journal-overlay delta empty (addedObjectIds [], removedObjectIds []) — projection matches the fixture base for this site.
- Sitespec binding: 4 sections (`home:Services:2`, `home:ObjectRail:8`, `services:Services:0`, `explore:ObjectFeed:0`).
- Rendered claim: present in Services renders via `resolveBoundField`; ObjectRail doorway reference again does not carry the full claim (same expected behavior).
- Ask FYD answer: states the claim with citation `[1]`, 3 evidenceRefs. `partial: false`.

## sha/byte-verification results

- Canonical JSON sha256 (sort_keys, compact separators) recomputed locally:
  - `chain-happy-place.json`: `066154e6da5aaca3a6e33649e347b6b381151a2ebe413977ef14cf7cf4d73e31` — MATCHES the value recorded by verify-happy2.sh.
  - `chain-coppersmith.json`: `bf52d74f12d08fc37ab4beacf238cfc04c5c7304997f3e3f5bade86c17df5340` — recorded and recomputed identically.
- Pig self-test (`src/fyd/lineage/verify-tracer.ts`, read-only run, 2026-09-24 ~01:35 UTC): `PASS resolved chain: coppersmith-plumbing`, `PASS resolved chain: happy-place`, `PASS missing chain (correct missing-link verdict)`, `ALL TRACER TESTS PASSED`. The negative control matters: a bogus claim produces the correct MISSING verdict at the evidence link instead of a fake pass.

## Broken links found

None. 0 of 14 links missing or broken across both chains.

## Chain coverage (honest scope)

Coverage is ONE representative rendered fact per site, 7/7 links complete for each. The tracer proves the full chain for the sampled claim on each demo site; it does not exhaustively trace every rendered fact on either site. Extending to per-fact coverage of all rendered claims was not in the staged artifacts and would be new work, not verification.

## Verdict

**PASS.** The lineage invariant (every link of the sampled rendered fact traces machine-verifiably from source bytes through observation, evidence, object field, sitespec binding, rendered markup, and Ask FYD answer, with exact byte offsets and sha-pinned sources) holds on both demo sites, confirmed by three independent paths: the Pig self-test (live re-trace + negative control), the local JSON inspector checks, and the canonical sha256 recomputation. No broken links. The two noted observations (ObjectRail doorway omits the full claim; coppersmith claim starts 157 bytes after the extractor's recorded range but is byte-exact in the pinned raw file) are design-transparent, not failures.

## Open items / recommendations

- Coverage is sample-based (1 fact per site). If the convergence wave later requires per-fact coverage, the tracer accepts any `--claim`, so a driver script could enumerate rendered claims and assert chains for all of them; that work is not done.
- Pig repo remains untouched by this session (read-only per constraints); the staged `src/fyd/lineage/*` files from the previous agent are uncommitted working-tree files on branch `fyd-factory`.
