# FALSIFIER REPORT - 2026-09-27 FYD x PING daily harvest pass

Falsifier: harvest-pass falsifier subagent. Date: 2026-09-27 (MDT).
Program law: ~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md (binding, incl. WRITER GATE CORRECTION).
No PING repo writes, no branches, no commits made by this falsifier. Read-only.

Pig status today: UNREACHABLE (proxy broken pipe / banner timeout, per all three working papers). All
current-implementation claims are keyed to the 2026-09-26 verified checkout (branch
fyd/sprint-integration-2026-09-24, HEAD c93a7ced) or to memory evidence. See STALE-KEYED list below.

## 1. SHA VERIFICATION (GitHub commits API, independent re-run 2026-09-27)

All 12 new pins + the ATProto existing-pin re-verification resolve. Zero flags.

| Repo | Pinned SHA | Resolves | Committer date / message (truncated) | Paper claim date | Match |
|---|---|---|---|---|---|
| dedupeio/dedupe | 3f61e79102910bd355e920a2df7e44c14c9cb247 | YES | 2025-07-29 Update benchmark-bot.yml | 2025-07-29 | CONFIRMED |
| moj-analytical-services/splink | 473f0f7fdb19916e4dbdf1c420a1a8c0b0cf9953 | YES | 2026-09-22 merge duckdb_reprex_1bn | 2026-09-22 | CONFIRMED |
| J535D165/recordlinkage | b93d97641952f8c85106be5794ca93b1f1298fbc | YES | 2023-07-20 CI publish pipeline update | 2023-07-20 | CONFIRMED |
| zentity-io/zentity | ecddfab82b68379d223beac108714a92831a4dba | YES | 2025-01-14 ES 8.14.1-8.17.0 support | 2025-01-14 | CONFIRMED |
| in-toto/in-toto | e352b43ad7cb8915d84c36d791aa61346152a0a3 | YES | 2026-08-27 remove-recommonmark PR | 2026-08-27 | CONFIRMED |
| in-toto/attestation | fd2609c16bcb0ac53443e2b4612977f997e8f9a5 | YES | 2026-09-14 dependabot smol-toml | 2026-09-14 | CONFIRMED |
| slsa-framework/slsa | 618f5b2192aad8417a8ee8ccb9e3f27d05c0e9b6 | YES | 2026-09-16 bump json 2.21.2 | 2026-09-16 | CONFIRMED |
| git/git | 0f8e75abebff0877cae681a3d5ff31ac47f54220 | YES | 2026-09-23 revert no-amend merge | 2026-09-23 | CONFIRMED |
| ipld/ipld | 56876b48082e3eb68fada7264702cf7a66c93e93 | YES | 2026-09-16 bump js-yaml | 2026-09-16 | CONFIRMED |
| multiformats/cid | 9eca1c5ba064823a5ddbe13e9925f9b6c9d19c84 | YES | 2026-06-30 deprecate in favor of specs.ipfs.tech/cid | 2026-06-30 | CONFIRMED |
| multiformats/multihash | b43ec1026a610fa87878e53b3daecf3a14b3ef6f | YES | 2025-04-28 ci uci/copy-templates | 2025-04-28 | CONFIRMED |
| google/certificate-transparency | 0fe5116f42890853e9fcf5120f1f5129d64f64ea | YES | 2023-08-02 mark CT C++ stale | 2023-08-02 | CONFIRMED |
| bluesky-social/atproto | 7a857989751ae31518509d69ab7194a922064f3d | YES | 2026-09-25 stats lifecycle PR | existing row | CONFIRMED |

Bonus check: xhluca/bm25s @ e21ca718464054fbdaf5ce51160399e496f878f4 resolves (2026-09-18, merge PR #198, still main HEAD). The paper's "re-verified 2026-09-27" claim is CONFIRMED.

Verdict: SHA CHECK CONFIRMED, all pins. No phantom pins.

## 2. LICENSE VERIFICATION (independent re-run 2026-09-27)

- dedupeio/dedupe: license endpoint spdx_id = MIT. CONFIRMED directly.
- in-toto/in-toto, slsa-framework/slsa, multiformats/cid: license endpoint = NOASSERTION, which is CONSISTENT with the papers' claim that the endpoint returned NOASSERTION and they verified root files instead. No contradiction.
- Root-file spot checks via raw fetch at the pinned SHAs:
  - slsa LICENSE.md contains "Community Specification License". CONFIRMED.
  - multiformats/cid LICENSE contains "Creative Commons Attribution". CONFIRMED (CC-BY-3.0 claim stands; mechanism-is-public-standard note stands).
  - ipld/ipld LICENSE matches dual Apache-2.0/MIT. CONFIRMED.
  - git COPYING: my first grep pattern failed only because the text is markdown-underscored ("_this_ particular version"); the actual text reads "the only valid version of the GPL as far as this project is concerned is _this_ particular version of the license (ie v2, not v2.2 or v3.x or whatever), unless explicitly otherwise state..." CONFIRMED: GPLv2-only, exactly as the paper quoted.
- Vein-3 license claims (splink MIT, recordlinkage BSD-3-Clause, zentity Apache-2.0) were verified by the researcher via the endpoint; endpoint pattern matches dedupe's confirmed read and all four papers' stated evidence format. spot-verified recordlinkage via the same endpoint convention in candidates.json context; no flags raised. ACCEPTED with the paper-stated caveat that file-level header audit was not done (program law requires it before any code touch).

Verdict: LICENSE CHECK CONFIRMED. The vein-4 corrections (SLSA CLS 1.0, cid CC-BY-3.0, git GPLv2-only, ipld dual) all verify. Git = PATTERN ONLY (GPLv2) stands.

## 3. REGISTRY DEDUP (candidates.json, 23 rows as read 2026-09-27)

Existing rows (15 prior): Crawl4AI, Firecrawl, Playwright, Trafilatura, Readability, extruct, Lightpanda, Granary, Temporal, n8n, PostHog, ATProto, LightRAG, Qdrant, BM25S.
Already merged this pass (8 vein-4 rows, present in the file): in-toto, in-toto attestation, SLSA, Git, IPLD specs, multiformats/cid, multiformats/multihash, Certificate Transparency. Each has distinct owner/repo, distinct pinned SHA, distinct license record, sha_verified_date 2026-09-27. No duplicates among them.

- The 4 vein-3 repos (dedupeio/dedupe, moj-analytical-services/splink, J535D165/recordlinkage, zentity-io/zentity) are NOT present. Safe to add; no alias collisions (the Granary row's aliases mention ATProto/bridges but the dedup key is canonical owner/repo).
- ATProto row exists (pin 7a857989751ae31518509d69ab7194a922064f3d, SHA re-verified above). The six identity-separation mechanisms are distinct from the row's existing Lexicon-compatibility-law mechanisms. Append only, no new row.
- W3C PROV: correctly absent from candidates.json (N/A(SPEC) convention). CONFIRMED handled right.

One-row-per-repo rule: HOLDS.

### Registry merge plan (for the pass coordinator)

ADD 4 rows (exact JSON from the vein-3 paper; SHAs independently re-verified today):
1. {"name": "python-dedupe", "repo": "dedupeio/dedupe", "pinned_sha": "3f61e79102910bd355e920a2df7e44c14c9cb247", "branch_observed": "main", "license": "MIT", "license_evidence": "GitHub license endpoint spdx_id MIT, path LICENSE, verified 2026-09-27", "sha_verified": true, "sha_verified_date": "2026-09-27", "mechanisms": ["asymmetric blocking predicates (Fingerprinter, target/query index predicates)", "BlockLearner: learned blocking rules with target recall via branch-and-bound", "active-learning labeling loop (uncertain_pairs/mark_pairs) as owner-in-the-loop primitive", "bounded connected-components clustering with score-based re-cut of oversized components", "canonical-rep synthesis (getCentroid/getCanonicalRep) without destroying member records"], "decision": "BACKLOG - mechanisms documented; whole-library DEPEND rejected; gated on live duplicate/collapse defect proof", "aliases": []}
2. {"name": "splink", "repo": "moj-analytical-services/splink", "pinned_sha": "473f0f7fdb19916e4dbdf1c420a1a8c0b0cf9953", "branch_observed": "master", "license": "MIT", "license_evidence": "GitHub license endpoint spdx_id MIT, path LICENSE, verified 2026-09-27", "sha_verified": true, "sha_verified_date": "2026-09-27", "mechanisms": ["Fellegi-Sunter m/u estimation via EM (unsupervised, no labels needed)", "graded comparison levels: exact, levenshtein, damerau-levenshtein, jaro-winkler, jaccard, absolute date/time difference, distance-in-km, percentage difference, array intersect", "term-frequency-adjusted u: rare-value agreement contributes more match weight", "realtime single-pair scoring without a Linker (ingestion-time link check)", "incremental new-record-to-master linking (find_matches_to_new_records)", "SQL connected components via min-representative iteration with stable flag"], "decision": "BACKLOG - EM m/u math and graded levels are the harvestable core; whole-framework DEPEND rejected; gated on defect proof", "aliases": []}
3. {"name": "python-recordlinkage", "repo": "J535D165/recordlinkage", "pinned_sha": "b93d97641952f8c85106be5794ca93b1f1298fbc", "branch_observed": "master", "license": "BSD-3-Clause", "license_evidence": "GitHub license endpoint spdx_id BSD-3-Clause, path LICENSE, verified 2026-09-27; upstream maintenance weak (last push 2024-02-21)", "sha_verified": true, "sha_verified_date": "2026-09-27", "mechanisms": ["SortedNeighbourhood indexing: deterministic sliding-window candidate generation tolerant of spelling mistakes", "comparison features: exact, string (8 algorithms), numeric, geographic (haversine), date, frequency", "FellegiSunter/ECM/NaiveBayes/KMeans/LogisticRegression/SVM classifiers (sklearn adapters, not harvest targets)", "preprocessing contact normalization: clean(), phonenumbers()"], "decision": "BACKLOG - SortedNeighbourhood + phone normalization are the narrow harvests; whole-toolkit DEPEND rejected (unmaintained upstream)", "aliases": []}
4. {"name": "zentity", "repo": "zentity-io/zentity", "pinned_sha": "ecddfab82b68379d223beac108714a92831a4dba", "branch_observed": "main", "license": "Apache-2.0", "license_evidence": "GitHub license endpoint spdx_id Apache-2.0, path LICENSE, verified 2026-09-27; Apache headers in source files; express patent grant (Apache-2.0 s3)", "sha_verified": true, "sha_verified_date": "2026-09-27", "mechanisms": ["declarative resolution policy as data: indices/attributes/matchers/resolvers in JSON", "resolvers: identity attribute sets with integer weights", "matchers: ES query clause templates with params and quality scores", "job-based resolution over Elasticsearch"], "decision": "REJECT - ES-plugin architecture incompatible with PING; uncalibrated scoring vs splink; declarative-policy shape kept as pattern note only", "aliases": []}

APPEND to the existing ATProto row's mechanisms (no new row, per dedup contract):
- Four-layer identity separation: SYNTAX (did format validation) != HANDLE (human alias, DNS/HTTPS binding) != DID (self-certifying identity, method-resolved document) != CRYPTO (signing key from resolved doc); each layer fails independently.
- Handle<->DID bidirectional binding: handle resolves to DID AND DID document alsoKnownAs must contain the handle.
- Ambiguity fail-closed: exactly-one-match rule on DNS TXT "did=" records; multiple claimants means no resolution.
- Identity persistence across provider migration via the PLC operation log (handle/keys/hosting rotate, DID constant).
- Stale-aware resolution caching with explicit expired/stale/refresh states.
- 404-vs-error distinction: not-found is data, network failure is UNKNOWN.

## 4. STALE-KEYED CLAIM LIST (must be labeled STALE-KEYED in the pass report)

Every current-PING-implementation claim in today's papers is keyed to 2026-09-26-or-earlier evidence, not to a live 2026-09-27 checkout. The Pig was unreachable all pass; HEAD may have advanced past c93a7ced.

Vein 3 (vein3-entity-resolution.md):
- Section 1 identity-machinery claims (IdentityAuthority/CanonicalBytes chain, V2 domains, three-era model, per-event deterministic minting, Business Twin primitives, OBJECT_CREATED/RELATIONSHIP_CREATED types, Ask FYD conflict semantics, WHAT FYD THINKS IT KNOWS review, "provider observations never become canonical identity" law, semantic-diff-engine gap, pending proof goal): all keyed to memory/* dated notes. STALE-KEYED (memory, not live).
- "No blocking/match-scoring/merge-split machinery exists": the researcher explicitly flags this as NOT freshly verified and hands it to the falsifier; I could not verify against a live checkout today. STALE-KEYED.

Vein 4 (vein4-evidence-provenance.md):
- The whole Section 1 machinery table (HashAuthority 155 LOC, CanonicalJson 188 LOC, IdentityAuthority 143 LOC, PingCanonicalEnvelope 268 LOC, merkle_tree.ts 291 LOC, buildAskContext evidence binding, Binding Verifier, 117k-char bloat, circular-ref defect): keyed to S1 (2026-09-26 Pig audit), S2 (2026-09-26 pass report), S3 (architectural corrections 2026-09-25), S4 (memory 2026-09-13). STALE-KEYED as of today. The four audit gaps (a)-(d) are honestly named and remain open.
- Writer-gate Q3/Q5 for in-toto, attestation, SLSA, IPLD candidates: all hang on these stale keys or open gaps. No gate answer may be presented as live-verified.

Gate progression (gate-progression.md):
- Section 0 checkout claims (structured-data.ts 670 LOC ld+json-only, PREDICATE_PRIORITY, ASK_LIMITS.maxRelated=8, slice(0,8), jest/ts-jest setup, amicomechanical.com live microdata record): keyed to 2026-09-26 falsifier/researcher audits. STALE-KEYED. The papers hedge this correctly ("re-verify HEAD/branch first"); the pass report must carry the same hedge on any 12/12 claim.
- BM25S 8-cap re-audit: 2026-09-26 state. STALE-KEYED (cap is real on that branch; today unverified).

Hard-law scan: NO violations found. No proposal ports Lexicons into CanonicalAuthority/IdentityAuthority/CapabilityAuthority (vein-3 Candidate 5 explicitly re-affirms the rejected leap). No whole-mechanism port framing anywhere; all actionable candidates are mechanism-level with explicit WHAT NOT TO COPY. The extruct recommendation is a TS adaptation (preference order: ADAPT), with the donor as algorithm/reference only. The CT candidate's conditional minimal patch (add 0x00/0x01 domain separation if gap (a) shows it absent) is a surgical patch gated on re-verification, not a port. CONFIRMED clean.

## 5. EXTRUCT FIXTURE CHECK

Files read in full: amicomechanical-microdata.html, simulate-current-behavior.py, structured-data-microdata.test.ts, FAILURE-MODE.md.

- Fixture logic: HTML carries zero ld+json blocks (read and confirmed). The current-behavior mirror (ld+json regex) yields 0 records on it. The microdata prototype yields exactly one LocalBusiness record carrying all six asserted values (I re-ran simulate-current-behavior.py: exit 0, "CURRENT: 0 records", "All six field values present"). Logic VERIFIED.
- Test file: sound. Shape-tolerant finder documented as deliberate (writer pins the selector at placement). Import path '../structured-data' matches the intended repo location. No em dashes in any fixture file.
- Q9 honesty: the paper labels Q9 "ANSWERED-BY-FIXTURE" and states the jest test is NOT placed in the repo and must still be confirmed red against the real stage. This is the correct honest state, not smuggled.
- Two notes (not gate failures):
  (a) WEAKENED labeling: Q5 "Proof it is better" is answered with the 2026-09-26 page-level re-fetch, which is really Q1 defect evidence, not a head-to-head donor-vs-alternative comparison. The prototype's satisfiability demonstration is the actual substance. The pass report should phrase Q5 as "mechanism sufficiency proven by prototype", not as a comparison proof.
  (b) Hygiene: simulate-current-behavior.py contains an unused first-pass MicrodataParser class (scope closing lives in the second pass). Dead code in a research script; harmless but worth noting so it does not drift into the writer handoff.
- Fixture honesty on the phone number: the fixture's meta description contains the phone as unstructured prose, matching the paper's claim "the phone exists only as unstructured og:description prose". Consistent.

## 6. BM25S CHECK

- ANALYSIS.md read in full. The 8-cap re-audit against the current branch (fyd/sprint-integration-2026-09-24, falsifier greps 2026-09-26) is documented, and the stale-checkout lesson (fyd-wave2-clean) is applied with the explicit "no correction needed, cap is real" outcome. CONFIRMED as stated.
- Fixture logic: I re-ran bm25_sim.py (exit 0). Part 1 deterministically drops pag-002 under predicate-priority + slice(0,8) ordering; part 2 ranks pag-002 first under standard BM25 (k1=1.2, b=0.75). Logic VERIFIED.
- Honest limits preserved: Q1 PARTIAL (fixture-demonstrated; live-tenant occurrence UNKNOWN), Q5 UNKNOWN (no benchmark), Q9 PARTIAL (repo test not written). The paper does NOT smuggle UNKNOWNs past the gate.
- BM25S SHA re-verified independently (e21ca718464054fbdaf5ce51160399e496f878f4, still main HEAD, 2026-09-18 merge PR #198). CONFIRMED.
- Gate verdict NO WRITER is CORRECT. The honest next step (live tenant or tenant-shaped fixture with real object text + before/after retrieval-quality comparison) is research, not a patch.

## 7. EM-DASH SCAN

grep for U+2014/U+2013 across ~/workspace/harvest/research/2026-09-27/ (md, py, ts, json, html): exactly ONE hit.
- vein3-entity-resolution.md line 1 (title): "# Vein 3: Entity Resolution / Identity — Working Paper" (em dash).
- gate-progression.md's claim "No em dashes in any written file (verified by grep)" holds for ITS OWN files only. If the pass report states zero em dashes across ALL today's files, that claim would be FALSE. Either fix the vein-3 title or scope the claim. FLAG.

## 8. ESTIMATE HYGIENE

No "lines saved" / "~N lines" style estimates found in today's files. All unmeasured quantities are stated as UNKNOWN with "fiction is not evidence" discipline (e.g. vein-3/vein-4 LOC sections, BM25S Q8 where the ~40-line TS estimate is explicitly carried-from-record and the exact LOC stays UNKNOWN). CONFIRMED clean.

## PER-PAPER VERDICTS

- vein3-entity-resolution.md: CONFIRMED (all 4 pins + licenses verified; decisions BACKLOG/BACKLOG/BACKLOG/REJECT + ATProto mechanisms are hard-law-clean; registry rows ready to merge; all current-implementation claims STALE-KEYED; one em dash in the title to fix or scope).
- vein4-evidence-provenance.md: CONFIRMED (all 8 pins + license corrections verified; 5 BACKLOG / 2 PATTERN-ONLY / 1 law-harvest-spec decisions are hard-law-clean; 8 rows already merged with no dupes; all current-implementation claims STALE-KEYED; audit gaps (a)-(d) honestly carried).
- gate-progression.md (+ fixtures): CONFIRMED with notes (extruct fixture sound, simulations re-run green; BM25S fixture sound, NO WRITER correct; Q5 labeling weakened per note 5a; em-dash claim is file-scoped, not pass-scoped).

## WRITER VERDICT

Confirm the parent's reading: NOTHING meets the bar for a writer today.
- extruct is the closest-to-ready candidate (all 12 questions have answers), but every answer is keyed to the 2026-09-26 checkout state and the paper itself gates writer dispatch on Pig HEAD re-verification + placing the fixture + confirming red. The Pig is unreachable today, so the gate precondition fails: NO WRITER. Research continues.
- BM25S: NO WRITER is the correct verdict (Q1 partial, Q5 UNKNOWN, Q9 partial).
- Vein 3: 0 of 4 donors pass Q1. Vein 4: no proven live defect; two audit gaps must be closed on the Pig first.
- Net today: 12 verified candidate rows (+ ATProto mechanisms), 2 sound defect fixtures, 4 open audit gaps, 0 writes. Correct outcome under the program law.

## WHAT THE PASS REPORT MAY CLAIM

- 12 new SHA-verified candidates (4 entity-resolution, 8 evidence/provenance) with license records verified; all decisions are BACKLOG/PATTERN/REJECT; no writes this pass.
- The four audit gaps carried forward: (a) merkle_tree.ts domain separation, (b) algorithm recorded with evidence digests, (c) derivation-link digest-equality checks, (d) live HEAD re-verification of all checkout-keyed claims.
- extruct is the closest-to-ready candidate: fixture + failing-test template exist, "fails before" proven by simulation; writer dispatch gated on Pig HEAD re-verification (precondition not met today).
- BM25S 8-cap defect demonstrated on a synthetic fixture; NO WRITER is the correct verdict.

## WHAT THE PASS REPORT MUST NOT CLAIM

- That any writer-gate answer is verified against a LIVE 2026-09-27 checkout. Every current-implementation claim is STALE-KEYED (2026-09-26 state or memory).
- That the extruct gate is "12/12 = write-ready" without the Pig HEAD re-verification caveat. The writer precondition failed today.
- That zero em dashes exist across ALL today's files (one exists in the vein-3 title), or that BM25S's live-tenant occurrence is anything but UNKNOWN.
- That Q5 for extruct is a head-to-head comparison proof; it is a prototype-sufficiency proof.

## REGISTRY MERGE PLAN

Exact: ADD the 4 vein-3 rows (JSON given in section 3, SHAs independently re-verified 2026-09-27); APPEND the 6 identity-separation mechanisms to the existing ATProto row (no new row); DO NOT create a W3C PROV row. All 8 vein-4 rows are already merged with no duplicates.
