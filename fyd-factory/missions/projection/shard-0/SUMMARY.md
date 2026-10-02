# PROJECTION-SHARD-0 SUMMARY (missions 0-499)

Mission: attack the idea that one graph safely produces many surfaces. Per mission: rotate fixture graph (54 true graph fixtures from corpus/fixtures), inject deterministic private/owner-hidden overlays + adversarial variants (seed = mission index), generate 16 projections (website-sections, mobile-summary, ask-answers via the repo's ask concierge, owner-dashboard-view, circle-context, mcp-context, search-doc, faq, catalog, directory-entry, portfolio-card, proposal-draft, lead-intake-schema, campaign-draft, landing-page, analytics-view), verify each independently.

## Outcome distribution (final clean run, harness v3)

- PASS: 323
- WARNINGS: 83 (all source-contamination: private value embedded in a public source description, faithfully repeated; classified as source hygiene, not a projection leak)
- LEAK: 94
- MISLABEL: 0
- GENERATOR_ERROR: 0
- Throughput: ~87,000 missions/min. Peak RSS: 102 MB. p50/p95 per-projection latency: 0/0-1 ms.

## Failure taxonomy

### Generic class G1: concierge cites non-public objects via relationship traversal (LEAK, 84 missions)
DOMAIN: PROJECTION / COMPONENT: src/fyd/ask/concierge.ts (buildGraphView) / CLAIM: answerConciergeQuestion lists a hidden/private service as offered when the input graph is not pre-filtered / EVIDENCE: repro fixture missions/fixtures/concierge-hidden-service-traversal.json; services answer contained "Offers: Hidden Service 1" from an active provides edge to a visibility=hidden object; 71+ missions across fixtures, signature leak:concierge:full-graph / CALLER: any concierge caller / CALLEE: unfiltered object graph / WRITER: shard-0 harness (adversarial wiring) / READER: public ask surface / AUTHORITY: mission verifier / CLASSIFICATION: LEAK / CONFIDENCE: 0.95 / BROKEN BOUNDARY: concierge input contract ("the visible graph the answer may cite"), enforced nowhere / DEPENDENCIES: visibility gate at traversal / AFFECTS AGENTS: projection, ask.
Status: FIXED and VERIFIED. Patch: missions/patches/concierge-buildgraphview-visibility-filter.patch (git apply --check clean against repo HEAD e48ef710). One-line choke-point fix: filter to visibility=public once in buildGraphView; non-public objects become uncitable. Fix verified on a staged copy: hidden service and hidden person no longer cited from a full graph; public-only input behavior unchanged (8/8 public services still cited); non-public target still answers about itself (caller's explicit choice, unchanged); the repo's own concierge tests pre-filter to public objects, so they are unaffected by construction. Rerun of all 500 missions against the patched concierge: G1 findings drop to zero (94 LEAK -> 10 LEAK; PASS 323 -> 407).

### Generic class G2: owner address-hide does not propagate to related public location objects (LEAK, 10 missions)
DOMAIN: PROJECTION / COMPONENT: ask-answers (repo concierge where-answer) / CLAIM: owner hid the address on the business object; the same address survives on a related public location object and is cited via located_at traversal / EVIDENCE: signature leak:ask-answers:hidden-address, e.g. mission 4 / CALLER: projection SDK / CALLEE: graph / WRITER: shard-0 harness / READER: public ask surface / AUTHORITY: mission verifier / CLASSIFICATION: LEAK / CONFIDENCE: 0.85 / BROKEN BOUNDARY: owner address-visibility decision (per-object scope vs propagation) / DEPENDENCIES: owner-intent overlay, relationship traversal / AFFECTS AGENTS: projection, owner, ask.
Status: NOT patchable by this worker (needs a design decision: propagate addressVisibility to related location objects at the reader, sanitize at projection time, or declare per-object scope). Filed as decision-backlog D-501. Integration decision for the concierge patch filed as D-502.

### One-offs logged (not generic)
- Stale source phone after owner correction: zero occurrences in claim text across 500 missions (owner-effective value shown, labeled OWNER_INTENT; SOURCE SAYS X kept in basis lineage only). The verifier's initial whole-JSON check false-positived on lineage; corrected to text-only.
- Canonical-authority phrasing: zero occurrences across 8,000 projections.
- Unknown claim labels: zero.
- Public-stays-public drops: zero (public phone/email/website present on all contact-bearing public projections).
- Dashboard completeness: owner-dashboard-view surfaced private+hidden values with visibility tags on all 500 missions.

## Labeling verdict
SOURCE_FACT / OWNER_INTENT / OBSERVATION / PROJECTION_NOTE stayed distinct across all projections; owner-corrected values were labeled OWNER_INTENT everywhere they appeared as claims (proposal-draft included). No projection claimed canonical authority. PROJECTION != TRUTH held: every projection carries rendering-rule PROJECTION_NOTEs.

## Generic classes found: 2 (G1 fixed+verified, G2 filed as decision). Patches proposed: 1.
## Saturation: Pig load 2.05 on 24 cores at start; no waits needed. Repo untouched (read-only); all changes confined to the harness and factory dirs.
