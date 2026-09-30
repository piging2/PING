# Playbook (MarketingOS 100h, block 80–100)

Candidate rules only. Nothing here is policy.

## The decay law

Every rule carries: rule / support set / scope / confidence / sample count /
counterexamples / freshness / expiration / status. Status starts at
CANDIDATE. A rule becomes ACTIVE only by explicit human decision (Nolan or
the lane owner), recorded with the decision, the decider, and the date. On
expiration a rule is re-verified (freshness/expiration updated, evidence
cited) or dropped to EXPIRED. Expired rules are never silently kept and never
silently followed. A learning never becomes a rule silently either — the
promotion is a decision with a record.

## Candidate rules

### PR-01 — verdict vocabulary discipline
- rule: Use CONFIRMED | REFUTED | UNCLEAR for claim verdicts (attachClaimVerdict). Put SUPPORTED / FALSIFIED / INCONCLUSIVE in the mission result's verdict field.
- support set: LR-20260930-001; BLOCK-20-40-REPORT.md I1; drivers/mkos-driver-c2.cjs
- scope: all PING evidence drivers; not mission-level verdicts
- confidence: 1.0 · sample count: n=1 deterministic failure + fix · counterexamples: none observed
- freshness: 2026-09-30 · expiration: 2026-12-31 · status: CANDIDATE

### PR-02 — assign, start, complete, read back
- rule: Never print a terminal mission status without reading the mission row back. Sequence is assign -> start -> complete -> SELECT status.
- support set: LR-20260930-002; BLOCK-20-40-REPORT.md I2; drivers/mkos-driver-c3.cjs
- scope: all MissionRuntime drivers on this journal
- confidence: 1.0 · sample count: n=1 deterministic failure + fix · counterexamples: none observed
- freshness: 2026-09-30 · expiration: 2026-12-31 · status: CANDIDATE

### PR-03 — correlation in metadata
- rule: Query ping_events correlation via metadata->>'correlation_id', never a correlation_id column.
- support set: LR-20260930-003; BLOCK-20-40-REPORT.md I3
- scope: every ping_events query on this journal
- confidence: 1.0 · sample count: n=1 deterministic schema fact · counterexamples: none observed
- freshness: 2026-09-30 · expiration: 2026-12-31 · status: CANDIDATE

### PR-04 — ledger before accuracy pass
- rule: Build the claim ledger with MAXIMUM DEFENSIBLE WORDING before the accuracy pass, so the pass checks rather than rescues.
- support set: LR-20260930-004; BLOCK-40-60-REPORT.md sections 2–3; claim-ledger-40-60.json
- scope: every evidence-native script/artifact
- confidence: 0.8 · sample count: n=1 mission · counterexamples: none observed
- freshness: 2026-09-30 · expiration: 2026-10-31 · status: CANDIDATE

### PR-05 — rendered evidence frames for technical pieces
- rule: Compile technical video pieces as narration + deterministic frames rendered from recorded evidence + ffmpeg assembly. Do not use prompt-led AI video generation for evidence claims.
- support set: LR-20260930-005; BLOCK-60-80-REPORT.md sections 1, 3, 4
- scope: technical pieces whose claims rest on trials/records; not brand/narrative pieces
- confidence: 0.9 · sample count: n=1 artifact (12 shots), 1 self-caught fabrication · counterexamples: none observed
- freshness: 2026-09-30 · expiration: 2026-10-31 · status: CANDIDATE

### PR-06 — headline parameterization
- rule: Keep the headline a parameterized slot through script and compiled artifact; slot the human's pick with zero other changes; never a headline stronger than the evidence map supports.
- support set: LR-20260930-006; BLOCK-40-60-REPORT.md section 1; BLOCK-60-80-REPORT.md sections 1–2
- scope: every artifact whose headline is a human decision
- confidence: 0.85 · sample count: n=1 artifact pipeline · counterexamples: none observed
- freshness: 2026-09-30 · expiration: 2026-10-31 · status: CANDIDATE
