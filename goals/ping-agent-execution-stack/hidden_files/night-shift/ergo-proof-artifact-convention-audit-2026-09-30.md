# Proof-artifact convention adoption audit - 2026-09-30 ~20:15 MDT

Auditor: night-shift subagent (item 2 of 10), read-only. Nolan asleep.
Convention source: goals/ping-agent-execution-stack/hidden_files/proof-artifact-convention-2026-09-25.md
(written 2026-09-25 by ping-perfecting-pass). Backlog entry: ergo-proof-artifact-convention (OPEN) in BACKLOG_PING.md.

## (a) The convention, verbatim in structure

One header block at the top of every dated proof artifact:

```
# <title> - <date>
Lane/owner: <lane or agent id>          # who ran it; required
Claim: <one sentence>                   # what this artifact proves/decides
Evidence: <tool results, digests, file paths>   # the proof, not narration
Status: <proven claim or next step>     # optional
```

Rationale recorded on 2026-09-25: the owner field is the only way a later pass
knows which lane's invariant an artifact belongs to without re-reading the whole file.
Date alone does not identify ownership.

## (b) Gap table: 20 recent artifacts vs the convention

Sampled the 20 most recent proof-style artifacts across goal hidden_files dirs
(2026-09-30 and the first hours of 2026-10-01). Paths are relative to ~/workspace/goals/.
Judged on the four header fields: date / lane-owner / claim / evidence.

| # | File | date | lane/owner | claim (one sentence) | evidence | verdict |
|---|------|------|------------|----------------------|----------|---------|
| 1 | ping-agent-execution-stack/hidden_files/convergence-99h/worker-contract-readability-2026-09-30.md | present ("Date: 2026-09-30 ~18:35 MDT") | present in sentence form ("Lane: INTELLIGENCE_RESEARCH worker contract (P0)"), not the Lane/owner label | missing (no Claim: line; claim is implicit) | present | PARTIAL |
| 2 | ping-agent-execution-stack/hidden_files/convergence-99h/intelligence-research-p0-2026-09-30.md | present ("Filed: 2026-09-30 ~18:55 MDT") | present ("by the research-worker seam writer (subagent)") | missing (implicit in "What was built") | present | PARTIAL |
| 3 | ping-agent-execution-stack/hidden_files/convergence-99h/fyd-will-not-build-ledger.md | present (subheading 2026-09-30) | missing at file level (per-entry OWNER exists, ledger as a whole has none) | missing (living checklist, no single claim sentence) | present | PARTIAL |
| 4 | ping-agent-execution-stack/hidden_files/convergence-99h/harvest-map-2026-09-30.md | present ("Date: 2026-09-30 ~18:30 MDT") | present ("Coordinator: harvest sweep coordinator (subagent)") | missing (implicit synthesis verdict) | present | PARTIAL |
| 5 | ping-agent-execution-stack/hidden_files/convergence-99h/proposal-tenant-2026-09-30.md | present (title) | missing | implied by title only | present (commit identity) | PARTIAL |
| 6 | ping-agent-execution-stack/hidden_files/convergence-99h/gateway-deploy-2026-09-30.md | present (title, ~17:47 MDT) | missing | implied by title only | present | PARTIAL |
| 7 | ping-agent-execution-stack/hidden_files/convergence-99h/capability-provision-2026-09-30.md | present (title) | missing | implied by title only | present | PARTIAL |
| 8 | ping-agent-execution-stack/hidden_files/convergence-99h/production-seal/SEAL-INVESTIGATION-2026-09-30.md | present ("Access date: 2026-09-30") | present ("Investigator: read-only archaeology worker ...") | present ("VERDICT: DEFECT" one-liner) | present | CONFORMING (functional) |
| 9 | ping-agent-execution-stack/hidden_files/convergence-99h/ITEM4-UNKNOWN-RETRY-AUDIT-2026-09-30.md | present ("Date: 2026-09-30 ~17:20 MDT") | missing (scope/method given, no lane named) | implied by title ("UNKNOWN ≠ FAILED") | present | PARTIAL |
| 10 | ping-agent-execution-stack/hidden_files/convergence-99h/jev-shadow-quarantine/QUARANTINE-RECORD.md | present (title, ~17:15 MDT) | missing ("Authority:" names the order, not the actor) | present ("Blocking defect ..." one-liner) | present | PARTIAL |
| 11 | ping-agent-execution-stack/hidden_files/convergence-99h/object-opportunity-seam/DESIGN-2026-09-30.md | present (2026-09-30) | missing ("Source order" names the order, not the lane) | present ("No new object type is required.") | present | PARTIAL |
| 12 | ping-agent-execution-stack/hidden_files/convergence-99h/remotion-poc/RUN-LOG-2026-09-30.md | present (title) | missing | implied ("Result: BLOCKED at Step 3/4") | present | PARTIAL |
| 13 | ping-agent-execution-stack/hidden_files/convergence-99h/stuck-missions-fix/FIX-RECORD.md | present (title) | missing (implied executor, not named) | present (first-missing-edge one-liner) | present | PARTIAL |
| 14 | ping-agent-execution-stack/hidden_files/convergence-99h/tts-benchmark/TTS-BENCHMARK-2026-09-30.md | present ("Date: 2026-09-30") | present ("Worker: benchmark subagent ...") | partial (selection rule, not a one-sentence claim) | present | PARTIAL |
| 15 | ping-agent-execution-stack/hidden_files/convergence-99h/harvest-ledger/2026-09-30-influencer-intelligence.md | present (title) | missing ("Filed verbatim per Nolan's steer", no lane) | implied (classifications) | present | PARTIAL |
| 16 | ping-agent-execution-stack/hidden_files/marketingos-100h-s2/C1-EVIDENCE-PACKAGE-V2.md | present (subtitle, Revision 2 2026-09-30) | partial ("MarketingOS Sprint 2, Block 45-60" is scope, not a named actor) | partial (Layer 0 paragraph, not a one-liner) | present | PARTIAL |
| 17 | ping-agent-execution-stack/hidden_files/marketingos-100h-s2/BLOCK-S2-45-60-REPORT.md | present ("Date: 2026-09-30 ~21:50 UTC") | partial (block lane implied) | partial (title "COMPLETE") | present | PARTIAL |
| 18 | ping-agent-execution-stack/hidden_files/marketingos-100h-s2/C1-EVIDENCE-PACKAGE.md | present ("Research date: 2026-09-30") | partial (block lane implied) | partial ("Verdict: ADVANCE, narrowed") | present | PARTIAL |
| 19 | ping-agent-execution-stack/hidden_files/marketingos-100h-s2/L6-REVIEW-S2-45-60.md | present ("Date: 2026-09-30") | present ("Reviewer role: hostile L6") | missing (review, no single claim sentence) | present | PARTIAL |
| 20 | fyd-social-product-build/hidden_files/understanding-fix-state-2026-09-30.md | present (title) | partial ("Coordinator State", no named actor) | partial (0/5 STOP verdict in Trigger) | present | PARTIAL |

## Findings

1. Adoption is real for date and evidence, weak for the two fields the convention
   was written to fix. 20/20 carry a date and substantive evidence. But 0/20 use
   the literal Lane/owner: / Claim: header labels, and a named lane/owner is
   missing or implied in 11/20. This is the same drift the 2026-09-25 audit found:
   authors identify the ORDER ("Authority:", "Source order:", "Filed verbatim per
   Nolan's steer") or the SCOPE ("Block 45-60", "99h program") instead of the ACTOR
   (the lane or subagent that produced it).

2. The missing piece is almost never the proof itself. Every sampled artifact has
   genuine evidence (commit SHAs, mission IDs, test counts, verification logs).
   What is missing is the one-line machine-readable front door: who ran it and
   what single sentence it proves. Fixing this is a header edit, not a rewrite.

3. Ledgers and living documents (fyd-will-not-build-ledger.md, harvest-map,
   C1 evidence packages) are partial by structure: they aggregate claims rather
   than making one. They should still carry Lane/owner + a one-sentence file-level
   claim (what the ledger's current verdict is), with per-entry ownership as they
   already do.

4. The two artifacts from the original 2026-09-25 audit that were rated GOOD
   (perfecting-pass-2026-09-24/hygiene-sweep.md, orca-a6-readiness-2026-09-23.md)
   do not themselves use the literal header block either; the convention's
   canonical format has never been followed literally by any file found in this
   sample. That weakens enforcement: lanes cannot copy a format that exists only
   in the convention doc.

## (c) Conforming examples for lanes to copy

None of the 20 use the literal header block. The three closest real files are
functionally conforming (all four fields present in some label). They are the
models until a lane writes the first literal-block example.

### Example 1 (closest to canonical): SEAL-INVESTIGATION-2026-09-30.md

Its header, as written:

```
# PRODUCTION SEAL INVESTIGATION - 2026-09-30

Investigator: read-only archaeology worker (99h convergence program), parent session 818d3b8c.
Access date: 2026-09-30. All times MDT unless noted.
...
## VERDICT: DEFECT
```

Why it works: date, named owner, one-sentence claim (the verdict), evidence
below. To be literal-canonical it needs only a label change: "Investigator:"
to "Lane/owner:", "Access date:" to "Date:", "## VERDICT:" to "Claim:", plus an
optional Status line.

### Example 2: orca-a6-readiness-2026-09-23.md (from the original 2026-09-25 audit)

```
# Orca A6 Readiness + Boundary Check - 2026-09-23

Investigator: subagent (Jev/Orca forensics lane). Method: read-only. ...
## (a) Is A6 still the coherent next?

**Yes, but its form changed from "implement" to "witnessed re-proof."** ...
```

Why it works: date in title, lane named, the bolded one-liner is the claim,
commits and SHAs are the evidence. Same label-change path to canonical.

### Example 3: TTS-BENCHMARK-2026-09-30.md

```
# TTS Benchmark for the Evidence Pipeline - 2026-09-30

Worker: benchmark subagent (parent coordinator session 818d3b8c). Date: 2026-09-30.
Method: fixed technical paragraph, local candidates actually run, ...
Selection rule (binding): winner = the provider that preserves the evidence contract
...
```

Why it works: date + named worker in two lines. Its gap is the claim: the
selection rule is a method, not a verdict sentence. A "Claim:" line (the winner)
would make it fully conforming.

### Copy-paste canonical header for new artifacts

Until a lane files a literal-block artifact, this is the block to paste:

```
# <title> - <YYYY-MM-DD>
Lane/owner: <lane id or subagent description>
Claim: <one sentence: what this artifact proves or decides>
Evidence: <tool results, digests, file paths; the proof, not narration>
Status: <optional: proven claim or next step>
```

## Recommendation

The backlog item stays OPEN. Suggest the parent agent attach the canonical
header block to one high-traffic lane intake (e.g. the night-shift or 99h
convergence template) rather than asking each lane to adopt it by reading: the
format has never been copied because no filed example shows it. The three
examples above are the closest real models.

No files were edited, no git operations beyond reads were performed, no network
or platform actions taken. This audit is read-only as ordered.
