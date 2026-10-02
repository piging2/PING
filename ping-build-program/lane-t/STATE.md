# LANE T — Action Planner Seam

Status: BUILDABLE

## Ledger
- RESEARCHED: 2026-09-23 — OWNERSHIP.md charter; lane-g STATE.md (coordination target).
- RESEARCHED: 2026-09-23 — PING repo read-only (Pig, /home/nolan/projects/ping): src/lib/ping/action-planner.ts (Lane A affordance planner, pure+deterministic, git f59da64a / 3cdc8ec7); src/lib/ping/types.ts (FydGrant vocab, PlannedAction, CapabilityPlan, AskProposal digest cards); src/lib/ping/ask-composer.ts (keyword-anchored proposal intents: reply draft, object update, ownership gates); src/fyd/ask/types.ts (SitePatchIntent, SitePatchCard review-card pattern); src/fyd/ask/concierge.ts (7 canonical factual questions, graded claims); src/fyd/components/contact-link.tsx (ContactMethod evidence-backed contact flow, CONTACT lane seam 2026-09-22); src/fyd/object/object-projection.ts (contactMethodFor + safe-link gate).
- RESEARCHED: 2026-09-23 — ecosystem scan (web): task-oriented intent+slot+clarification framing; Mycroft Adapt intent parser (Apache 2.0, deterministic keyword/entity mechanism); Cedar/OPA policy semantics (allow/deny, explicit deny wins, principal/action/resource/context); human-in-the-loop approval interrupt pattern.
- DECIDED: 2026-09-23 — Mycroft Adapt / Cedar / OPA are ADAPT-CONCEPT, not imports (kill criteria: weight dwarfs value; PING's own keyword-anchored idiom already matches; policy semantics hand-rolled in pure TS on the existing FydGrant vocabulary).
- DESIGNED: 2026-09-23 — ACTION-PLANNER-DESIGN.md (intent model, plan record, policy gates, confirmation boundary, worked examples, red-team).
- SPIKED: 2026-09-23 — lane-t/spike (pure JS, zero deps): deterministic intent classifier, policy gate evaluator, action plan builder, synthetic run, red-team cases. All green.

## Current position
The seam exists as a design plus a tested spike in this lane dir. It is NOT wired into the PING repo (read-only rule; wiring is a factory-lane decision). The lane-A affordance planner (object affordances) and this lane-T intent planner (natural-language intent to action plan) are complementary: lane A enumerates what an object offers; lane T resolves what a question asks to do and gates it.

## Proofs (2026-09-23 ~20:40 MDT, lane-t/spike/proof.js, exit 0)
Target: real FYD factory demo object biz-clearwater ("Clearwater Plumbing Co.", clearwater-plumbing-demo fixture, read-only mirror via lane G's spike). Planner never mutates the object; plans are proposals only.
- PROVEN (A): read-only plan. "call them" as visitor on biz-clearwater -> 1 direct candidate (observed phone from the business website), ZERO confirmation gates, no approval needed. No invented contact value.
- PROVEN (B): owner-scoped mutation plan + approval binding. Owner "update my hours to 8 AM to 5 PM" -> propose gate, gate.digest === plan.digest, card shows exact before/after. Approval verified on the untampered plan. Tampered one argument (value -> "9 AM to 6 PM") -> digest b7ae0aad673c became ae0829e9b20e; approval goes STALE ("approval binds digest ... but the plan digest is .... The proposal changed; approval does not carry over.").
- PROVEN (C): refused plan. Visitor "publish my site changes" -> zero candidates; refusal cites the EXACT policy rule verbatim: "Refused: Only the controlling identity of this object may perform owner actions." (FORBIDDEN.not_owner). No hallucinated alternative offered.
- PROVEN: run.js synthetic cases + redteam.js RT1-RT8 all PASS (re-run 2026-09-23, exit 0). Determinism PASS (byte-identical digests across runs).
- NO CAMPAIGNS: the planner produces single plans for single intents only. Bulk/campaign/scheduled execution is out of scope; the design states this in section 1 and the spike has no scheduling surface. Any bulk wrapper must be rejected as a separate product decision, never smuggled into this seam.

## Lane S contract reconciliation (2026-09-23 ~20:40 MDT)
Lane S has dispatched with CAPABILITY-DISCOVERY-DESIGN.md. Its record is NOT identical to the lane-T consumed contract (ACTION-PLANNER-DESIGN.md section 4). Mapping S -> T:

| Lane S field | Lane T consumed field | Notes |
|---|---|---|
| capability_id (cap_<sha16>) | id | same; deterministic, stable. Adopt S ids. |
| kind ("contact.request"...) | intent-matching kind | BETTER FIT: S kind vocabulary already matches T intent kinds. T's old channel-ish kind comes from S's channel field. |
| channel ("phone"... ) | kind | T candidate kind <- S channel. |
| status "resolved" | status "active" | parity ok. |
| status "withdrawn" | status "vanished" | tombstone parity ok: planner MUST NOT emit candidates from either. |
| status "candidate" | (no T equivalent) | INVARIANT: T never plans from candidates. Spike asserts via vanished-refuse path. |
| tenant_id | objectId | GAP: T contract binds capabilities per objectId. Request: S record carries objectId (or T resolves per-object at plan time from the packet). |
| evidence[].observed_at (max) | lastChecked | ok by computation. |
| evidence grades SUPPORTED/DERIVED/INFERRED/UNKNOWN | evidence.state observed/inferred/unverified/... | mapping: SUPPORTED->observed, DERIVED->inferred, UNKNOWN->unverified; INFERRED->inferred. |
| (none) | stale freshness | GAP: S design has no explicit staleness policy; T computes downgrade from observed_at recency. Recommend S policy gate emits a freshness verdict or T keeps the computation. |
| policy.checks (7 checks) | grantRequired (FydGrant) | GAP: S design does not name FydGrant. T gate needs grantRequired per record; request S maps gate outcomes to the FydGrant vocabulary. |
| parameters.display_value | valueRef | display-only; action_uri stays inside the FYD contact flow (lane L custody rule). |

REQUESTS FOR LANE S / COORDINATOR: (1) carry objectId on capability records; (2) map the policy gate to FydGrant vocabulary for grantRequired; (3) decide whether freshness is an S verdict or stays a T computation. Nothing in S contradicts the seam; the mapping is mechanical.

## Verification gap (honest)
The "PING ALREADY HAS" file inventory in the ledger above was recorded from Pig-side research earlier 2026-09-23. This session could NOT re-verify those files: SSH egress to the Pig (100.79.154.43) is blocked from this host ("Operation not permitted"), and /home/nolan/projects/ping exists only on the Pig. The seam's proofs are self-contained in the zero-dependency spike and do not depend on those files; wiring into the repo remains a factory-lane decision with its own verification.

## Coordination
- NEEDS FROM LANE S (capability discovery): the resolved capability record contract defined in ACTION-PLANNER-DESIGN.md section 4. Lane T does NOT discover capabilities; it consumes resolved records (observation -> resolved capability after policy check stays lane S). Lane S dir was empty at write time; the contract is recorded here for them to read.
- NEEDS FROM LANE G (context compiler): intent classification consumes the compiled ContextPacket's target object + viewer + grants. The intent seam emits plans back for the answer composer to render (proposal cards). No duplication of the compiler.
- CONSUMED BY LANE I (MCP edge, future): ActionPlan is the shape an MCP tool surface should accept as its execution contract (capability handles, digests, gates). Not built here.
- CONSUMED BY LANE J (observability): plan records carry digest + refused[] so "why did this action not happen" is answerable.

## NEXT
1. Feed the capability-record contract to lane S (INTEGRATION-REQUEST style note if coordinator wants one). CONTRACT RECONCILIATION NOW WRITTEN (see above, 2026-09-23 ~20:40): mapping table + 3 requests for lane S/coordinator (objectId on records, FydGrant mapping for grantRequired, freshness verdict vs T computation).
2. Spike hardening: booking-slot time expression parsing, FYD-native message capability, multi-turn clarification memory.
3. When the factory lane asks: adapter sketch mapping ActionPlan to existing AskProposal / SitePatchCard rendering. The proof's ActionProposalCard already mirrors the SitePatchCard shape; recommended: reuse the existing AskProposal object_update path verbatim with ActionProposalCard as a rendering.

## Standing decisions absorbed (2026-09-23)
- Connector credentials: queued for morning, not this lane. No live
  credentials used; spike uses fixtures only. The design routes any future
  non-public channel handle through the lane-L secret broker as a capability
  handle, never a raw value.
- Vendor veto: no paid/heavy vendor in the design. Ecosystem candidates
  (Mycroft Adapt, Cedar/OPA, approval-interrupt pattern) are ADAPT-CONCEPT
  only; the spike is zero-dependency pure JS. Nothing to gate.
