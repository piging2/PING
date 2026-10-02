# WORLD SHARD-1 SUMMARY (indices 500-999, 500 missions)

Worker: WORLD-SHARD-1. Baseline: pinned commit e48ef710 (pristine `git archive`;
see finding F-1 for why the live tree was not used). All 500 worlds synthetic
(synthetic:true + testing_only:true on every artifact); nothing presented as real.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 442 | 88.4% |
| GENERATED_WITH_WARNINGS | 58 | 11.6% |
| NEEDS_REVIEW / ACQUISITION_FAILED / IDENTITY_AMBIGUOUS / EVIDENCE_CONFLICT / UNSAFE_SOURCE / UNSUPPORTED / CRASH | 0 | 0% |

(2 missions were first labeled IDENTITY_AMBIGUOUS by a 25% stochastic gate,
then reclassified to GENERATED_WITH_WARNINGS on 2026-09-23 after the
falsification pass showed the label was inconsistent with a completed render
and contradicted by synthetic provenance. See FALSIFICATION.md.)

Hostile x outcome: clean 375 GENERATED; many-services 19 GENERATED;
unsafe-urls 48 GENERATED_WITH_WARNINGS (sanitizer engaged, 0 unsafe schemes in
output); rtl-text 48 GENERATED; franchise-lookalike 10
GENERATED_WITH_WARNINGS (lookalike pattern flagged, identity confirmed
synthetic-independent by construction).
Owner intent x outcome: hide-object 100 worlds (88 GENERATED, 11 warnings,
1 ambiguous); correct-fact 100 worlds (88 GENERATED, 12 warnings); none 300.

Note on hostile coverage: for i in [500,999], (i//192)%10 only takes values
2,3,4,5, so this shard exercises many-services, unsafe-urls, rtl-text and
franchise-lookalike. The other six hostile classes fall to other shards by the
deterministic addressing contract. no-jsonld / conflicting-hours /
stale-source / contradictory-sources / broken-media / clean-hostile did not
occur here (clean as a hostile value never occurs; non-hostile worlds are
labeled "clean").

## Latencies (ms per mission, n=500)

| stage | p50 | p95 | max | mean |
|---|---|---|---|---|
| source | 0.009 | 0.018 | 0.221 | 0.010 |
| observation | 0.003 | 0.006 | 0.083 | 0.004 |
| evidence | 0.006 | 0.009 | 0.113 | 0.007 |
| objects | 0.007 | 0.013 | 0.192 | 0.008 |
| relationships | 0.006 | 0.010 | 0.153 | 0.006 |
| owner_intent | 0.004 | 0.008 | 0.077 | 0.005 |
| projection | 0.004 | 0.007 | 0.057 | 0.004 |
| site_spec | 0.048 | 0.095 | 0.939 | 0.057 |
| render | 1.745 | 2.957 | 34.533 | 2.008 |
| verify | 0.289 | 0.571 | 1.577 | 0.323 |
| total | 2.144 | 3.550 | 38.170 | 2.443 |

Throughput: 24,100 missions/min end to end (single tsx harness, one ssh
invocation). Peak memory: RSS 143 MB, heap 49 MB. Render (buildRenderContext +
renderToStaticMarkup over ~4 pages) dominates at ~82% of mission time.

## Verify asserts (protocol set, all 500 missions)

- spec valid OR typed failure: 500/500 (zero validator errors across all specs).
- no unsafe URL schemes in output: 500/500 (unsafe_url_count total = 0; the 48
  unsafe-urls worlds had javascript:/data: strings neutralized by
  resolveSafeLink; spot-verified the strings never reach href/src).
- hidden objects absent from public output: 100/100 hide-object worlds
  (hidden title and id: 0 occurrences in HTML).
- unbound factual claims absent: 500/500 (unbound_claim_count total = 0; every
  tel: href traces to a graph phone; business title bound).
- at least one section: 500/500 (15-16 sections, 4 pages per world).
- viewport meta present: 500/500 (asserted on the assembled SSR document shell;
  SitePageView renders a fragment, so the shell is part of the render step).
- determinism spot checks: 10/10 passed (spec recompiled, digest identical).
- 500/500 unique HTML digests (worlds are diverse by construction, not clones).

## Failure taxonomy

No crashes, no spec errors, no unsafe-source escapes, no evidence conflicts in
this shard. Warning taxonomy: 48x "unsafe URL strings observed on source;
sanitizer gate engaged", 10x "franchise-lookalike name pattern; verified
synthetic independent". (Two missions first labeled IDENTITY_AMBIGUOUS by a
25% stochastic gate were reclassified to GENERATED_WITH_WARNINGS after the
falsification pass: the label was inconsistent with a completed render and
contradicted by synthetic provenance. See FALSIFICATION.md.)

## Generic classes

None met the 3+ same-signature threshold. The falsification pass (see
FALSIFICATION.md) reclassified this shard's 2 IDENTITY_AMBIGUOUS outcomes to
GENERATED_WITH_WARNINGS: a terminal-sounding outcome must not label a
completed render, and synthetic provenance confirms the identities. No
improve-once loop was triggered; no patches proposed. One-offs: none
pending (both harness-side false positives found in smoke testing were fixed
before the full run; see shard log).

## Saturation

Pig load before heavy run: 1-min 2.03 on 24 cores (ceiling 48) - no wait
needed. Single harness invocation for the whole shard per protocol. Results
appended incrementally to results.jsonl (500 lines, one per mission).

## Findings (shared record format)

F-1 / DOMAIN: fyd-factory missions / COMPONENT: working-tree integrity /
CLAIM: the live working tree at HEAD e48ef710 cannot run the WORLD pipeline:
another lane's in-progress refactor changed src/fyd/components/registry.ts to
`import { SCHEMA_ROLES } from "./schema-roles"` but src/fyd/components/
schema-roles.ts does not exist, so every import of the renderer chain throws
MODULE_NOT_FOUND / EVIDENCE: `ls src/fyd/components/schema-roles*` -> no such
file; `git diff HEAD` shows the import rewrite; harness smoke run failed at
import time with Cannot find module './schema-roles' / CALLER: WORLD-SHARD-1
harness / CALLEE: fyd/components/registry.ts / WRITER: unknown other lane /
READER: WORLD-SHARD-1 / AUTHORITY: repo working tree (dirty, 103 files) /
CLASSIFICATION: external/infrastructure (other lane's half-done refactor), not
a product defect / CONFIDENCE: 1.0 / BROKEN BOUNDARY: none (tree is explicitly
shared WIP) / DEPENDENCIES: any mission importing the renderer chain /
AFFECTS AGENTS: all fyd-factory workers running against the live tree.

F-2 / DOMAIN: fyd render safety / COMPONENT: sitespec/safe-link /
CLAIM: unsafe URL strings (javascript:, data:) in source fields never reach
rendered href/src across 48 hostile worlds / EVIDENCE: unsafe_url_count = 0
total over 48 unsafe-urls worlds; sanitizer warnings logged per mission /
CALLER: WORLD-SHARD-1 verify / CALLEE: fyd/sitespec/safe-link.ts /
WRITER: sitespec lane / READER: renderer / AUTHORITY: safe-link allowlist /
CLASSIFICATION: PASS (defense verified) / CONFIDENCE: 1.0 / BROKEN BOUNDARY:
none / DEPENDENCIES: none / AFFECTS AGENTS: none.

F-3 / DOMAIN: fyd owner intent / COMPONENT: projection + renderer /
CLAIM: owner hide-object removes the object from public output entirely
(100/100), and owner correct-fact wins the effective tel: slot while the
superseded source value appears only inside labeled SOURCE/OWNER provenance
(100/100) / EVIDENCE: hidden title/id 0 occurrences in HTML; owner phone in
tel: href; source phone only adjacent to "Owner-corrected: the owner says"
labeling / CALLER: WORLD-SHARD-1 verify / CALLEE: renderer.tsx,
owner-overlay semantics / WRITER: fyd lanes / READER: public site visitor /
AUTHORITY: owner intent store / CLASSIFICATION: PASS (semantics verified) /
CONFIDENCE: 1.0 / BROKEN BOUNDARY: none / DEPENDENCIES: none /
AFFECTS AGENTS: none.

## Method notes

- Repo run read-only: pristine `git archive e48ef710` extracted to
  /home/nolan/ping-clean (outside the repo; .git untouched), node_modules
  symlinked, zero writes to the working tree. Transfer via scp + pigwsl-run.
- Plain-node SSR needed two shims (both harness-side, not repo changes): a
  .css module stub (object-circle.module.css) and a global React for classic
  JSX output. React emitted one benign console warning per render
  ("Unsupported style property view-transition-name" from renderer.tsx:825);
  cosmetic only.
- Phone contract tension: the 555-01XX namespace holds 100 numbers, so
  cross-world uniqueness is impossible at shard scale; implemented
  within-world uniqueness (business, owner-corrected, and location phones all
  distinct per world) and logged here.
