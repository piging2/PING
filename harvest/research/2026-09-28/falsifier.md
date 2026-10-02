# Harvest Pass FALSIFIER (2026-09-28)

Binding law: `~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md`
(no whole-mechanism ports, no Lexicon-into-authority leaps, no Lexicon-into-CanonicalAuthority;
AGPL/GPL/SUL = patterns only).
Registry: `~/workspace/harvest/candidates.json`, schema fyd-harvest-candidates/1.
Falsifier scope: SHA pins, licenses, registry edit, validator, fixtures, em dashes,
estimate hygiene, hard law, writer LOC sanity. No repo writes outside `~/workspace/harvest/`
and the research dirs. No em dashes used anywhere in this file.

## 1. SHA verification (GitHub commits API, all live 2026-09-28)

All nine pins returned HTTP 200 with the exact SHA echoed back. Commit dates match the papers.

| repo | pin (as staged) | API full SHA | status | commit date |
|---|---|---|---|---|
| bluesky-social/atproto-website | ad5b0c7e299ac5f749f656d02f5a3e66895e6e15 | ad5b0c7e299ac5f749f656d02f5a3e66895e6e15 | 200, exact match | 2026-09-24T22:50:58Z |
| json-schema-org/json-schema-spec | 4f56a9900674 (short) | 4f56a9900674b27804f0ec32e3b7fdfa4efad695 | 200, resolved to full | 2026-09-04T18:28:06Z |
| protocolbuffers/protobuf | b1503a1ca420 (short) | b1503a1ca4205a9f9e4f3a8be98890705f1e03e2 | 200, resolved to full | 2026-09-28T06:38:49Z |
| apache/avro | 209a3735ec33 (short) | 209a3735ec330679790824da54b7558db55e4e7f | 200, resolved to full | 2026-09-21T12:53:46Z |
| cyberphone/json-canonicalization | 19d51d7fe467d4706a3ff08adf8a748f29fc21e0 | 19d51d7fe467d4706a3ff08adf8a748f29fc21e0 | 200, exact match | 2024-12-13T10:21:44Z |
| multiformats/multicodec | 8d9e9b3b3d376ee86179fc6c866f6e56f74fa167 | 8d9e9b3b3d376ee86179fc6c866f6e56f74fa167 | 200, exact match | 2026-09-15T21:08:58Z |
| bluesky-social/atproto (re-verify) | 7a857989751ae31518509d69ab7194a922064f3d | 7a857989751ae31518509d69ab7194a922064f3d | 200, exact match | 2026-09-25T17:45:47Z |
| unclecode/crawl4ai | e5d2e786d1a101225f3f6a3e6fd344d76eeb13af | e5d2e786d1a101225f3f6a3e6fd344d76eeb13af | 200, exact match | 2026-09-25T06:35:50Z |
| firecrawl/firecrawl | 9b15c332111ca719335c5776d80a4946218d9bec | 9b15c332111ca719335c5776d80a4946218d9bec | 200, exact match | 2026-09-25T18:29:58Z |

Notes:
- The three short pins (json-schema-spec, protobuf, avro) were resolved to full 40-char SHAs
  via the API response, as the dedup contract requires. The full SHAs above are what entered
  the registry; nothing was invented.
- branch_observed for the three: papers did not name the branch; repo API says
  default_branch=main for all three (verified live, not guessed). atproto-website main,
  cyberphone master, multicodec master per the papers.
- firecrawl: canonical name firecrawl/firecrawl matches the registry row (paper confirms the
  mendableai -> firecrawl 301). The pin is preserved per the contract's "pin is the contract,
  not moving HEAD" rule; vein-18 notes HEAD advanced to 58b06b90d2955b6f5eb036fb5e6e78c3348827e7.
- git/git pin was NOT re-verified today (out of scope per the task; GPLv2-only record stands
  from 2026-09-27). No UNVERIFIED pins in this pass.

## 2. License spot-checks (root license file at the pin, plus license endpoint)

| repo | endpoint spdx | file at pin | verdict |
|---|---|---|---|
| bluesky-social/atproto-website | NOASSERTION | LICENSE.txt: "Creative Commons Attribution (CC-BY)"; inline code examples/data/regex "under Creative Commons Zero (CC-0, aka Public Domain)" | VERIFIED: CC-BY docs / CC-0 code. Paper claim CONFIRMED. The NOASSERTION is expected for a docs repo; classification from the file per dedup policy |
| json-schema-org/json-schema-spec | NOASSERTION | LICENSE: "Copyright (c) 2022 JSON Schema Specification Authors", standard BSD-3-Clause redistribution text | VERIFIED: BSD-3-Clause. Paper claim CONFIRMED |
| protocolbuffers/protobuf | NOASSERTION | LICENSE: "Copyright 2008 Google Inc.", standard BSD-3-Clause redistribution text | VERIFIED: BSD-3-Clause. Paper claim CONFIRMED |
| apache/avro | Apache-2.0 | LICENSE.txt: Apache License 2.0 header | VERIFIED: Apache-2.0. Paper claim CONFIRMED |
| cyberphone/json-canonicalization | NOASSERTION | LICENSE: "Copyright 2018 Anders Rundgren ... Licensed under the Apache License, Version 2.0" | VERIFIED: Apache-2.0. Paper claim CONFIRMED. Verdict: flag explicitly as REQUIRED by task: the endpoint says NOASSERTION ("Other"), so per the dedup contract's license policy the record classifies from the root license file, which is verbatim Apache-2.0 text. Recorded as Apache-2.0 with the endpoint disagreement noted in license_evidence. Correct handling; no violation |
| multiformats/multicodec | MIT | LICENSE: "The MIT License (MIT)" | VERIFIED: MIT. Paper claim CONFIRMED |
| firecrawl/firecrawl | AGPL-3.0 (per vein-18 paper) | LICENSE: "GNU AFFERO GENERAL PUBLIC LICENSE" | VERIFIED: AGPL-3.0 core. Paper claim CONFIRMED. AGPL = PATTERN/REFERENCE ONLY per binding law; row decision already states this |
| bluesky-social/atproto | (recorded previously) | LICENSE.txt: "Dual MIT/Apache-2.0 License" | VERIFIED: dual MIT/Apache-2.0, matches existing row |

## 3. Registry diff summary

- Rows added: 6 (bluesky-social/atproto-website, json-schema-org/json-schema-spec,
  protocolbuffers/protobuf, apache/avro, cyberphone/json-canonicalization,
  multiformats/multicodec). The cyberphone and multicodec rows use vein-6 section 6
  merge-ready JSON verbatim; the four vein-5 rows were constructed from the paper's
  stated repo, resolved full SHA, license evidence, and mechanism lists.
- Rows updated: 5, all fields intact except as stated:
  - bluesky-social/atproto: sha_verified_date set to 2026-09-28 (pin re-verified today).
  - google/certificate-transparency: decision updated to REJECT (PING WINS) with the
    vein-6 lineage-qualified text; one mechanism appended (parity-verified 2026-09-28 note).
  - in-toto/in-toto: decision updated to REJECT (PING WINS) for the MATCH-rule mechanism
    per the vein-4 audit (MATCH-rule law already enforced in code at route.ts:58-69 and
    ping-object-source.ts:237-238, 178-188). All four mechanisms kept.
  - unclecode/crawl4ai: one mechanism appended (egress_broker is_global + transition-form
    unwrapping + resolve-and-pin + pinning forward-proxy pattern); sha_verified_date set
    to 2026-09-28 (pin re-verified via commits API today).
  - firecrawl/firecrawl: one mechanism appended (post-connect socket.remoteAddress check
    via undici connect interceptor, pattern only); sha_verified_date set to 2026-09-28
    (pin verified live today).
- No new rows for vein-18 (mechanism appends only, per the paper and the task) or vein-4
  (decision updates only) or the Q1 hunts (no registry changes).
- New row count: 33 (was 27). Mechanism count: 93 (dedup.py scorecard).
- verified_date updated to 2026-09-28; verified_timezone unchanged (America/Denver).
- dedup keys: all six new keys verified absent before insertion; all 33 pins are full
  40-char hex; zero duplicate repo keys.

## 4. dedup.py + test_dedup.py

- `python3 ~/workspace/harvest/dedup.py`: status OK, exit 0. Scorecard: 33 raw records,
  33 unique repositories, 0 duplicate rows collapsed, 33 pinned SHAs full length,
  0 unverified SHAs, 93 total mechanisms, no merge notes, no conflict.
- `python3 ~/workspace/harvest/test_dedup.py`: all 9 fixture tests green (OK), exit 0:
  test_atproto_lexicons_alias, test_granary_protocol_labels, test_no_shadow_candidates,
  test_license_conflict, test_sha_conflict, test_unverified_sha_not_invented,
  test_bad_ref, test_variants, test_canonical_registry.
- No DedupConflict raised; no fail-closed triggered. Nothing needed a human guess.

## 5. Em-dash findings

- Found and fixed: bm25s-q1-hunt.md (3, title and two list markers) and
  vein6-canonical-encodings.md (1, title line). All replaced with comma/colon
  equivalents; re-scan shows zero.
- vein18-ssrf-url-safety.md, vein3-q1-hunt.md, vein4-audit-gaps.md,
  vein5-contract-mechanics.md: zero em dashes.
- The seven new registry additions (six rows plus five row updates): zero em dashes.
- This falsifier.md: zero em dashes (verified by authoring rule, not by luck).

## 6. Estimate hygiene

No lines-saved fiction found. Every estimate-bearing paper states CURRENT / DONOR /
ADDED / REMOVED / NET LOC, dependencies, and authorities:

- vein5: Candidate 1 NET +45 (0 deps, 0 authorities); Candidate 2 NET +20 (0 deps,
  0 authorities); Candidate 3 NET +35 (0 deps, 0 authorities). Paper states these are
  law plus test lines, zero new machinery. The four new registry rows from this vein are
  PATTERN/REFERENCE law references with no code patch proposed, so no implementation
  estimates apply; that is consistent, not a gap.
- vein18: CURRENT PING LOC TOUCHED ~60, DONOR LOC EXAMINED ~560, ADDED ~30-40,
  REMOVED 0, NET ~+35, NEW DEPENDENCIES 0, NEW AUTHORITIES 0, NEW RUNTIME SERVICES 0.
  Paper has an explicit "Evidence rule for estimates" section stating measured reads
  (1809 lines acquisition + 616 lines net read in full; donor ~560 lines plus tests).
  Hygiene: GOOD.
- vein6: CURRENT 0, DONOR "not measured as implementation LOC; treat as UNKNOWN-LOC,
  law-level examination", NET 0, 0 deps, 0 authorities, 0 runtime services. Hygiene: GOOD.
- vein4, vein3-q1-hunt, bm25s-q1-hunt: research/audit only, no estimates claimed.
  Hygiene: GOOD.
- The scorecard totals NET +100 lines across the three vein-5 candidates; all three are
  BACKLOG/REFACTOR, none is a writer task today except Candidate 2's REFACTOR, whose
  write is gated (see section 7).

## 7. Hard-law findings

- No paper proposes a whole-mechanism port. Explicit rejections found and honored:
  - vein5: "This pass harvests LAWS only, never whole-mechanism ports." WHAT NOT TO COPY
    lists Lexicon documents, NSID, DNS authority discovery, lexicon-resolver, lex-cli
    codegen, publication machinery; "Port ATProto Lexicons into PING: REJECT. Binding
    rejected leap." JSON Schema as schema language REJECTED; Protobuf/Avro wire formats
    REJECTED.
  - vein6: "harvest laws, not whole-mechanism ports"; multicodec registry never adopted
    internally; JCS implementation rejected (PING wins on valid inputs).
  - vein18: narrow ~30-40 line adaptation of one law (transition-form unwrapping) into
    the existing isPublicIp, Apache-2.0 attribution preserved; Firecrawl AGPL pattern
    reference only, nothing copied.
- No Lexicon-into-authority leap: vein5 states twice (Candidate 1 and Candidate 2
  WHAT NOT TO COPY) that Lexicons must never enter CanonicalAuthority, IdentityAuthority,
  or CapabilityAuthority, and that PING's vocabulary module remains the authority.
- AGPL/GPL/SUL = patterns only: firecrawl row already PATTERN/REFERENCE ONLY;
  AGPL-3.0 confirmed in file; git GPLv2-only row untouched.

Gating for the one vein-5 REFACTOR proposal (Candidate 2, name PING's validation mode
and enforce the vocabulary gate at ingestion):
1. Nolan's word on the product decision: fail-closed at ingestion for unknown schemas
   (paper's recommendation, matching PING's existing fail-closed precedents in the
   projector) versus the warn-and-downgrade-the-claim alternative (paper's stated
   fallback if Nolan prefers permissive ingest). This is the one item in the pass that
   touches live behavior.
2. A distinct-schema audit MUST run before any write: `SELECT DISTINCT schema FROM
   ping_events`. If any non-canonical schema exists in history, the recommendation flips
   to warn mode for the historical tail (paper's stated condition, not negotiable).

## 8. Writer LOC verdict (Pig branch harvest/2026-09-28, commit 2532e5a51365e7eff524ecd03f6d5f5d9acd8472)

Writer reported: ADDED 496 / REMOVED 2 / NET +494, 0 deps, 0 authorities, extruct microdata.

Verdict: PLAUSIBLE but NOT independently verified. Rationale: no writer paper exists in
`~/workspace/harvest/research/2026-09-28/` (only the six research papers are present),
and the task forbids re-cloning the repo, so there was no cheap path to inspect the
commit. On numbers alone: extruct is a multi-syntax structured-data extractor and
microdata is one of its five syntaxes; a self-contained extractor module plus its tests
plausibly lands in the 300-600 added-line band with zero new dependencies and zero new
authorities, which is exactly what was reported. REMOVED 2 is consistent with a small
registration hook. No red flags in the shape of the numbers.

Recommended verification for the coordinator: run
`git show --stat 2532e5a51365e7eff524ecd03f6d5f5d9acd8472` on the Pig branch
harvest/2026-09-28 to confirm the file list and the ADDED/REMOVED split before promotion.

## 9. Notes for the coordinator

- The three short pins from the vein-5 paper were the only SHA-fidelity risk in the
  staged material; all resolved to full SHAs via the API and are recorded in full.
  Nothing UNVERIFIED was invented.
- cyberphone NOASSERTION verdict is the one license case needing eyes (section 2):
  correctly classified from the root file per the dedup policy; license_evidence notes
  the endpoint disagreement.
- The em-dash fixes touched only the two affected papers' titles/markers; no content
  changed.
- Registry file was rewritten with the same JSON structure (1-space indent); validator
  and fixtures both pass against the written file.
- Falsifier's own deliverable written to
  ~/workspace/harvest/research/2026-09-28/falsifier.md. Nothing appended to any shared
  report.
