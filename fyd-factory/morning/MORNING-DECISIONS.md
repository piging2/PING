# FYD FACTORY — Morning Decisions (2026-09-24, coordinator)

Decisions made at 80%+ confidence by the coordinator, with evidence.
Questions for Nolan are phrased precisely for the grilling brief.

## Decisions made (execute now)

### D-W1: WORLD scope — accept 7,000 as documented wave-1 extension (confidence 90%)
Evidence: all 7,000 missions verified (6,977 GENERATED / 23 NEEDS_REVIEW), zero
crashes, full 7,000-mission determinism proof clean, all 10 shard PRNGs
non-overlapping. The seeding (mulberry32(i * 2654435761 + 40503)) is not in the
frozen protocol, but all 7,000 ran under it identically, so the set is
internally consistent. Rejecting 2,000 verified missions would waste proven
work. Canonical wave-1 target for scorekeeping: 5,000. The 2,000 beyond-scope
are labeled WAVE-1-EXTENSION stress coverage. Contract debt: pin the seeding
contract in the protocol for wave 2 (shard-4 collision recorded).

### D-W2: Rail patch reconciliation (confidence 90%)
Apply object-rail-binding-gate.patch (renderer.tsx: title/candidate/description
gating in ObjectRailSection) AND 0001-rail-bound-description.patch
(object-rail.tsx: boundRailDescription in pingObjectToProjection and
pingObjectToView adapters). Reject 0002-rail-section-bound-summary.patch:
it touches the same ObjectRailSection lines as the first patch and would
conflict; its function is superseded. The combination covers the section path,
the hover-preview path, and the card path through one binding authority
(boundTitle/boundDescription). The strong-verifier migration (WIRE P5) is a
separate seam; rail stays consistent with all other render paths.

### D-W3: Patch families (confidence 85-95%)
- Concierge visibility filter (D-502): APPLY. Sealed the public leak class
  (LEAK 94 -> residual G2) with all 152 ask tests green.
- Phone-dial gating: APPLY. 4/4 patch tests, 500-mission rerun, exactly 44
  phonec missions flipped, zero unrelated changes.
- SEC-FIX x5: APPLY all. 4 REQUIRED XSS-class + 1 RECOMMENDED (documented
  tradeoff: rejects RFC-legal quoted local parts, acceptable for business
  contact data). INV-05 closes through SEC-FIX #1 (same seam, one authority).
- SYNTH x3: APPLY. All apply --check clean, improve-once evidence complete.
- WIRE x4: APPLY. P4 is observation-only; P5 introduces the strong verifier
  at the caller seam without touching the pinned weak verifier.
- VQ x5: APPLY each that passes git apply --check; REJECT per-patch on
  conflict with evidence (VQ-001 was based on another lane's reworked CSS).
- ask-concierge-wire.patch: APPLY (closes the TD-002 "concierge not wired"
  gap) after the visibility filter is in.

### D-W4: DEHPP merge — CONDITIONAL GO, not now (confidence 85%)
Technical risk is low (SPEC_IDENTICAL renewed through the composed path,
1,157/1,157 tests green, zero customer-specific branches). Timing risk is
the driver: 108 dirty files, active patch-integration wave, in-flight lanes.
Gate: (a) patch wave lands green, (b) scratch-merge proof passes, (c) Nolan's
morning review. A merge-proof worker is proving (b) in a scratch worktree
now. No merge into fyd-factory tonight.

### D-W5: Claim/lock — required before new overlapping writes (confidence 95%)
Three collisions this wave (WORLD-6, OBJECT-0, OBJECT-2). Atomic claim
mechanism (mkdir-based marker + lease) is being implemented and tested now;
the wave-2 re-list-before-write rule is already protocol. OBJECT-0 resolved:
worker 2's fully-documented run (488/12) is canonical; worker 1's independent
corroboration and title-gating patch are preserved.

## Precise questions for Nolan (grilling brief)

### Q1: Ambiguity notice — approve the fail-closed public copy? (SYNTH lane)
When an owner correction conflicts with observations, the lane proposes the
projection present NO settled business contact facts under ambiguity plus an
explicit public ambiguity notice: "We have conflicting information about this
business and are holding the facts until the owner confirms. [Business]
requested verification." Trigger: any owner correction conflicting with
>=2 independent observations on contact fields. If Nolan says no, the fallback
is owner-wins silently (weaker privacy posture, simpler surface).

### Q2: D-501 — address-visibility propagation (owner-intent semantics)
Owner hides the business address; the same address survives on a related
public location object and the ask concierge cites it via located_at
traversal. Recommendation: propagate owner HIDE for address-kind facts to
related objects with matching normalized values at the reader (fail-closed
for privacy; the hide is about the fact, not the object). Alternative:
declare per-object scope and document it (simpler, but leaves the leak class
G2 open). This is owner-intent semantics — Nolan's call.

### Q3: D-015 — Phase 17 publish gate: approve the factory's gap list?
Factory half of the unauthenticated-visitor-publish readiness list, post
integration: (1) H4/R-H4 two-verifier seam (WIRE P5 lands the strong verifier
at the caller seam), (2) R-MODEL /sites wiring, (3) SEC-FIX integration,
(4) F-1..F-8 fail-closed under pressure, (5) rate limiting / abuse controls,
(6) rollback plan, (7) Nolan sign-off in this brief. Threat model "safe" and
the go/no-go are Nolan's.

### Q4: Golden-set bar — adopt tiered bars? (D-012/D-213/D-214/D-217)
Proposal: 0.95 per-mission pass rate for presentation seams, 1.0 for
safety-critical seams (identity, visibility, claim binding, link gating,
export). Metric: per-mission pass rate over the golden set. Red-run response:
integration worker halts the wave and routes to the coordinator; Nolan is
notified, not asked, unless the bar itself is disputed.

## Workers in flight
1. OBJECT-0 reconciliation + claim/lock implementation and test.
2. Patch integration (SEC-FIX x5, concierge x2, rail x2, phone, SYNTH x3,
   WIRE x4, VQ x5) with per-family test runs; no commits.
3. DEHPP scratch-merge proof + golden replay + test runs; worktree removed
   after unless evidence requires keeping it.
4. Generation wave 2: OBJECT shards 5-6, DECISION shards 2-3 (new definitions),
   /o hostile runs, compile-harness re-run of the 40 hostile fixtures on the
   patched tree.
5. Cohort-2: 10-15 real sites, Wix/Squarespace/Webflow/SPA focus, read-only.
6. Ask FYD eval harness v2 with the deterministic-first hierarchy, TD-002 and
   G1 re-measurement.
