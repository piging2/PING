# Falsifier report: harvest pass 2026-10-01

Role: FALSIFIER. Read-only. No subagents, no browser tasks, no writes to PING, no commits, no branches.
Inputs read in full: vein11-outcomes-experiments.md, vein2-structured-data.md, vein4-evidence-provenance.md.
Binding law: ~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md (WRITER GATE CORRECTION, dedup rules, evidence rule for estimates).
No em dashes anywhere in this paper (machine-verified: 0 in all three source papers).

## 1. Per-candidate verdict table

All pins verified LIVE via the GitHub commits API (GET /repos/<owner>/<repo>/commits/<sha> returned 200 with the exact SHA echoed in the response body). Licenses verified at the pinned tree (root LICENSE file content and/or license endpoint).

| # | Candidate | Pin | Pin verified | License claimed | License status | Dedup status |
|---|---|---|---|---|---|---|
| 1 | PostHog/posthog | 81858b69f20bc997cf0e6c5027821cdd99b53514 | 200, SHA echoed, msg matches paper | Path-level: MIT Expat (non-ee) / PostHog Enterprise (ee/) | CONFIRMED (root LICENSE at pin has the ee/ split verbatim; ee/LICENSE exists at pin; endpoint NOASSERTION is consistent with a path-split repo) | PIN UPDATE of existing row (registry pin c36aad65 superseded); mechanisms append, NO new row |
| 2 | growthbook/growthbook | 4f4929cd744a09fe8fa9392f0527924d322761ab | 200, SHA echoed, msg matches paper | Path-level: MIT Expat (non-enterprise) / GrowthBook Enterprise (enterprise dirs) | CONFIRMED (root LICENSE at pin lists exactly packages/back-end/src/enterprise, packages/front-end/enterprise, packages/shared/src/enterprise; packages/stats/pyproject.toml declares license = "MIT"; endpoint NOASSERTION consistent) | NEW ROW (no existing registry row) |
| 3 | microformats/mf2py | e4626be97bdf3526b735785be17eb4384452b58e | 200, SHA echoed | MIT | CONFIRMED (LICENSE at pin is verbatim MIT text; endpoint NOASSERTION) | NEW ROW (no existing registry row) |
| 4 | RDFLib/pyRdfa3 | d76b2cba86872ad35c6d3ae422d2b1454732520c | 200, SHA echoed | W3C Software Notice and License | CONFIRMED (LICENSE at pin reads "W3C SOFTWARE NOTICE AND LICENSE, Copyright (c) 2018 W3C") | NEW ROW (no existing registry row) |
| 5 | mozilla/readability | ab4027a8b37669745016869a37a504727992b2ba | 200, SHA echoed | Apache-2.0 | CONFIRMED (matches registry) | FOLD: identical to existing row pin; V2-3 is mechanism appends, NOT a new row (see correction C3) |
| 6 | scrapinghub/extruct | a31daaadb82ec684b7d468d3b15734b8ae3b7265 | 200, SHA echoed (researcher's HTTP 403 was transport-only, confirmed not evidence of absence) | BSD-3-Clause | CONFIRMED (matches registry) | FOLD: identical to existing row pin; mechanism appends, NO new row |
| 7 | builder-group/community (head-metadata) | a71d8dba1813bfb32f28e25d41f222b5970c5fde | 200, SHA echoed | MIT | CONFIRMED (package.json + LICENSE, per paper; endpoint data not re-pulled, paper's file-level evidence stands) | NEW ROW (no existing registry row; mechanism: single-vs-collection extractor kinds) |
| 8 | adbar/trafilatura | 96e19b949c3ac4a9e193b41fe2fb352e7150db86 | 200, SHA echoed, commit 2026-09-30 (signed) | Apache-2.0 | CONFIRMED (matches registry license) | PIN UPDATE of existing row (registry pin 1e31e3e9 superseded by this newer pin); mechanisms append, NO new row |
| 9 | secure-systems-lab/dsse | 1d3370f62565bca041e97c8310b873ac340edc2e | 200, SHA echoed | Apache-2.0 (root LICENSE); CSL-1.0 files under governance/ | CONFIRMED (root LICENSE at pin is verbatim Apache-2.0; governance/01-community-specification-license-v1.md exists at pin; endpoint spdx Apache-2.0) | NEW ROW (no existing registry row; distinct repo/license/mechanism from in-toto/attestation) |

Net registry movement: 5 NEW rows, 2 pin updates (PostHog, trafilatura), 2 mechanism appends to existing rows (readability, extruct). 36 -> 41 unique rows if the coordinator accepts all.

## 2. License spot-check conclusions

No AGPL/GPL/SUL surprises anywhere in this pass. No Firecrawl-style core-vs-SDK confusion. PostHog and GrowthBook are both correctly classified as path-level, not globally; the papers' path splits were verified verbatim at the pinned trees, so there is no global-vs-path misclassification. The license-blocked zones are exactly the ones the papers flag: PostHog ee/ (production use needs enterprise subscription; code must never enter PING) and GrowthBook's enterprise dirs, including packages/back-end/src/revisions/ which imports from "shared/enterprise" (verified at pin: revisionLifecycle.ts line 5 imports from "shared/enterprise", confirming the paper's proprietary-entanglement finding). The DSSE governance/ CSL-1.0 caution is real and confirmed; the paper's "implement the mechanism, do not copy spec prose" instruction is the correct treatment, matching the SLSA precedent in program law.

License corrections needed: NONE. All nine claims confirmed.

## 3. Dedup audit (against candidates.json, 36 rows)

- Clean new rows (5): growthbook/growthbook, microformats/mf2py, RDFLib/pyRdfa3, builder-group/community (head-metadata), secure-systems-lab/dsse. No existing row or alias covers them. "ATProto Lexicons" alias row, Granary aliases, and all other rows checked; no near-duplicates.
- Pin updates (2): PostHog 81858b69 supersedes c36aad65; trafilatura 96e19b94 (2026-09-30) supersedes 1e31e3e9. The registry contract says a pin is a pinned SHA, not moving HEAD; the coordinator should replace the SHAs and record the study notes under the same rows.
- Folds (2): readability V2-3 and extruct sub-decisions are mechanism appends to existing rows. The vein-2 paper's own section-5 count ("5 unique repository rows proposed ... extruct row already exists from 09-28, mechanism appends only") is right for extruct but it presents V2-3 readability as its own candidate record; the pass report must not create a second readability row.

## 4. Hard-law scan

- Em dashes: 0 in all three papers. PASS.
- Whole-mechanism ports: none proposed. Vein-2 V2-1 explicitly rejects the whole-parser port; V2-2/V2-3 are HARVEST-narrow + BACKLOG; vein-11 REJECTs all product ports (analytics product, replay, funnels, HogQL/ClickHouse, gbstats as dependency, revision model); vein-4 DSSE is BACKLOG with narrowed laws. PASS.
- New-authority proposals: none. Every paper asserts NEW AUTHORITIES = 0. Vein-11 explicitly names and rejects ExperimentAuthority, OutcomeAuthority, ReviewAuthority. PASS.
- Estimate fiction: none. All papers use the evidence-rule format (CURRENT PING LOC TOUCHED / DONOR LOC EXAMINED / ADDED / REMOVED / NET / NEW DEPS / NEW AUTHORITIES). V2-2 (~60 added) and V2-3 (~80 added) carry tilde forecasts tied to NAMED gated patches; these are labeled future estimates, not proven savings. Acceptable. The pass report should carry them as "forecast for a gated patch" and not as a claim.
- Closed-competitor inference as fact: vein-2 V2-3 item 5 (twitter->og fallback) is labeled DOCUMENTED (archived official) / OBSERVED (current docs agree). No other closed-competitor claims. PASS.
- Honest-uncertainty preservation: vein-4 envelope.md 422 treated as secondary-sourced, not primary-verified (spot-check: the real envelope doc is envelope.md at repo root, also exists; the paper's caution stands). Vein-2 extruct 403 treated as transport error, not absence (independently confirmed 200 from this host). PASS.
- Writer-gate discipline: all papers decline to run the 12-gate and name BACKLOG instead. No writer receives work. PASS.

## 5. Mechanism spot-checks (sampled, verified at pinned trees)

- DSSE PAE law: PAE(type, body) = "DSSEv1" SP LEN(type) SP type SP LEN(body) SP body verified in protocol.md at the pin (6638 bytes, matches the paper's count). keyid-as-unauthenticated-hint and no-reparse-after-verification laws both verified at pin. The security properties the paper says PING's envelope kit already has (type in signed bytes, payload_hash binding) are PING-side claims I did not re-verify; they are the researcher's read of f94bba39.
- GrowthBook top-level-only JSON-patch restriction: verified in validators/revisions.ts at pin ("TOP-LEVEL paths only", with the documented rationale).
- mf2py implied-property discipline: uniqueness guard ("only one grandchild"), ordered name/photo/url cascade, "in priority order, descending" metaformats table, and the "source": "metaformats" provenance tag all verified at the pin.

## 6. Registry spot-checks (existing rows)

Verified still resolvable: slsa-framework/slsa @ 618f5b21 (200), git/git @ 0f8e75ab (200), adbar/trafilatura @ 1e31e3e9 (200), bluesky-social/atproto @ 7a857989 (200), PostHog/posthog @ c36aad65 (200). The vein-4 paper's drift notes are correct in form: old pins still resolve (a pin is not HEAD), so no row is broken. No truncated SHAs found in any of the 36 rows. No researcher license claim contradicts any registry license record.

## 7. Corrections that must land in the pass report

- C1 (vein-4 paper, DSSE paths): the paper says docs/protocol.md, docs/envelope.md, docs/envelope.proto. Verified at the pin: protocol.md, envelope.md, envelope.proto live at REPO ROOT (tree shows exactly those paths; protocol.md is 6638 bytes as claimed). The pass report and the DSSE registry row must use root paths. Mechanism findings unaffected.
- C2 (vein-2 paper, mf2py paths): the paper says mf2py/mf2py/implied_properties.py (and the same doubled prefix for metaformats.py, value_class_pattern.py, datetime_helpers.py). Verified at the pin: the files are at mf2py/implied_properties.py etc. (package root), which 404'd under the paper's path. Mechanism findings verified at the corrected paths.
- C3 (dedup): readability V2-3 folds into the existing readability row as mechanism appends; the pass report must not create a second readability row. Registry grows 36 -> 41 (5 new rows), with 2 pin updates and 2 appends.
- No license corrections. No hard-law violations to escalate. Nothing merge-ready, no DEPEND proposals, no security findings requiring action.

## Verdict

Falsifier verdict for 2026-10-01: 9/9 pins verified live, 9/9 licenses confirmed (zero corrections), 5 clean new rows, 2 pin updates, 2 mechanism appends, 2 factual path corrections for the pass report, zero hard-law violations, zero em dashes. Nothing in this pass authorizes a writer.
