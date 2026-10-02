# INVARIANT-7 ADJUDICATION: re-scope to the FYD pipeline

**Date:** 2026-09-23. **Mode:** research only, adjudication.
**Subject:** LANE-18 invariant 7 ("PING must treat memory as decaying claims with provenance, re-verified before outbound action; forward taint tracing when a memory is falsified"), left open by the delete-our-need pass, DELETE-OUR-NEED.md section (d)/(e).

## Verdict: ADMIT

The re-scoping is a legitimate generalization, not gate-gaming. As specified in the outreach coordinator, invariant 7 is dead (prevents zero of the 9; the gate's judgment on the original stands). Re-scoped to the FYD pipeline, it becomes the worker-layer and evidence-graph statement of two disciplines no FYD survivor covers: temporal decay of evidence and forward taint of derived artifacts on falsification.

## Reasoning

### (a) Legitimacy of the re-scope

The test applied: would the re-scoped mechanism's falsifiable test be meaningfully different from the tests already covering #5 (F5-S1/S2/S3) and #8 (F8-S1..S4)? Yes, on both halves of the mechanism.

**Half 1: decaying claims (freshness windows, re-verification at action time).**

No FYD survivor covers temporal decay of evidence:

- F5-S1 (binding verifier) checks *existence* of support at projection time. A claim bound to a two-year-old DIRECT_EVIDENCE record passes S1 happily. S1 has no clock.
- F5-S2 (prevention-first generation) constrains the input claim set; it never inspects age.
- F5-S3 (claim-level provenance pointers, fail-closed dangling resolution) covers *revocation/deletion*: the pointer no longer resolves, so the claim fails closed. It does not cover *staleness*: the pointer still resolves, but the evidence is old. These are different failure modes with different tests (delete evidence vs. age evidence).
- FAIL-5-falsification, critique C4, explicitly names this as a missing piece: "Correction preservation without a decay or re-confirmation policy becomes staleness preservation, the mirror image of #8." The failure files themselves identify the gap invariant 7 fills.
- FAIL-9's open question 2 asks for a principled staleness bound on conflicts; it is an open question, not a covered mechanism. FAIL-9's cut of "freshness-weighted last-write-wins" is a different thing entirely (using freshness to *pick a winner*); invariant 7 uses freshness to *invalidate or re-check a claim*, never to pick winners.

**Half 2: forward taint on falsification.**

All four F8 survivors are pull-at-read: the decision-store overlay (S1), the three-way merge (S2), the golden suite (S3), and the diff (S4). They assume every consumer passes through the composition seam. That assumption is already falsified on the record: STEP-06's presentation boundary hole (one consumer never received the overlay) and FAIL-8's open question 7 (is there exactly one composition point?) name the leak. Forward taint runs the opposite direction: on falsification of a claim (new crawl contradicts it, owner correction falsifies it), enumerate every derived artifact built from it (cached render models, serialized client graphs, digest lines, analytics rollups, segment heat records) and mark them tainted for regeneration. No FYD survivor enumerates derived artifacts. F8-S1's falsifiable test changes the source and checks the effective value at read; the taint test falsifies a claim with *no source change at all* (e.g. an owner correction) and checks that downstream artifacts carrying the old claim are marked, including consumers the read seam never sees.

Gate-gaming counter-argument considered and rejected: re-wording a dead mechanism until it brushes two classes would produce tests redundant with existing survivors. Here the mechanism's falsifiable tests fire in scenarios where every existing test passes while the failure occurs (stale-but-resolving evidence passes F5-S1/S3; bypass consumers pass F8-S1's read-seam check). That is the signature of a real gap, not a rewording.

### (b) The decay angle, specifically

Invariant 7's "decaying claims" element is unique among the survivors:

- F9's conflict-decay discussion is an open question with no mechanism.
- F8's "staleness attack" is diagnosed in FAIL-8-falsification ("Time is the adversary the tests forgot": conflict staleness in S2, golden rot in S3, base invalidation in S4) as the adversary the existing tests do not imagine, not as a mechanism that covers it.
- F5's falsification demands a re-confirmation policy and names its absence.

Strengthens the re-scope case: the temporal dimension is the one axis the whole mechanism library acknowledges and none of it implements.

## Library entry

### Name

**Evidence decay with action-time re-verification and forward taint** (re-scoped LANE-18 invariant 7).

### How it works in FYD terms

Three parts, applied to the evidence graph and the render/answer pipeline:

1. **Decay.** Every evidence record about the external world carries an observed-at timestamp and a freshness window appropriate to its class (a business phone number decays slower than today's hours; the window is a policy per claim class, not a number on the record). Confidence decays as the window passes: a claim whose evidence is past its freshness window is marked STALE. Stale is not false; it is un-renderable without re-checking.
2. **Re-verification before outbound action.** "Outbound action" in FYD means rendering a claim to a public site or asserting it in an Ask FYD answer (the pipeline's own doctrine, FYD-BAR-001's zero-unsupported-claims bar and the 24/7 rule, already treats these as consequential outbound acts with the same harm profile as sending a pitch). At action time, any claim on STALE evidence must be re-verified against a live source within its window; if re-verification cannot be performed, the claim fails closed (omitted or qualified), never rendered as settled fact.
3. **Forward taint on falsification.** When a claim is falsified (a new source crawl contradicts it, or an owner correction falsifies it), the system traces forward through the derivation graph to every artifact built from that claim (render models, cached projections, serialized client graphs, digest lines, analytics rollups) and marks them TAINTED, which schedules their regeneration or re-composition. Tainting the root alone is insufficient; Attack 4's causal chain ("every downstream artifact has absorbed the false premise as a data point") is the reason.

Relationship to existing survivors: this is the worker-layer and evidence-graph statement of the same discipline FAIL-5 S3 (dangling pointers fail closed) and FAIL-9 M4 (conflict and correction task lifecycle) implement at the render seam. S3 covers revoked evidence; this covers stale evidence. F8's overlay covers consumers that pass the read seam; this covers consumers that do not.

### Prevents, with one crisp reason each

- **#5 claim-binding.** A claim bound to evidence that is old but still resolving passes F5-S1's existence check and F5-S3's dangling check, so without this mechanism it renders as settled fact with a real evidence pointer behind it. Decay plus action-time re-verification closes the staleness-shaped hole in the binding chain: support must be fresh, not merely present.
- **#8 correction-loss.** When an owner correction falsifies a source claim, F8's pull-based overlay only protects consumers that pass the single read seam; STEP-06 proved such consumers are not guaranteed. Forward taint pushes the falsification to every derived artifact, so the correction cannot die silently inside a cached projection or an analytics rollup that never re-composes.

### Falsifiable test (not redundant with F5-S1/S2/S3 or F8-S1..S4)

- **Input:** a fixture business with a phone claim bound to a DIRECT_EVIDENCE observation recorded 400 days ago (past the phone class freshness window of 180 days); a cached render model and a digest line derived from that observation; then an owner correction changing the phone, entered through the real override path.
- **Procedure:** (1) attempt to render the site and answer "what is your phone number?" via Ask FYD without any re-acquisition; (2) then run the falsification path: record the owner correction and inspect every derived artifact for taint marks and scheduled regeneration, including the cached render model and the digest line.
- **Expected observable outcome:** (1) the phone claim does not render as settled fact on stale evidence alone; it is omitted or qualified as stale pending re-verification, and the event log names the STALE classification. (2) after the correction, the cached render model and the digest line both carry TAINTED marks tied to the falsified claim, with regeneration scheduled; the digest line is not silently left carrying the old number.
- **What proves the mechanism DOESN'T work:** (1) the 400-day-old phone renders as settled fact with its evidence pointer, because S1/S3 both pass it; that is decay not implemented. (2) the owner correction is effective at the live read seam (F8-S1 passes) while the cached render model and digest line still carry the falsified number with no taint mark; that is forward taint not implemented. Note the deliberate design: in scenario (2) the F8-S1 and F8-S4 tests both pass, which is exactly why this test is not redundant.

## Kill rationale (not applied)

Not applicable; verdict is ADMIT. The gate's kill of the original outreach-coordinator specification stands separately: as specified, it prevents zero of the 9 and is dead there.

## Open design debt (recorded, not resolved)

1. **Taint cutoff** (LANE-18 open question 3, unresolved): a falsified claim can have months of derived artifacts. The mechanism needs a principled cutoff (time, derivation depth, confidence threshold) or one poisoned claim requires rebuilding the world. Recorded here so the library entry is not adopted as "taint everything forever."
2. **Freshness windows are policy, not data:** the per-claim-class windows need to be written down and versioned; an arbitrary global window would either churn (too short) or preserve staleness (too long).
3. **Re-verification authority:** "re-verified against a live source" needs the same minting-authority discipline as owner assertions; otherwise re-verification is a fresh observation with an unverified source.
4. **Interaction with the STALE graph-outage case** (FAIL-5-falsification C5): if the graph is unreachable at action time, every claim is unverifiable; the mechanism must specify the outage behavior (specified outage page) rather than silently failing open or taking down the whole site.
