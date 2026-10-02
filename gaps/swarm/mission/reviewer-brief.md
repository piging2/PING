# One-real-mission evidence summary (for free-model reviewers)

Redaction note: all mission data is synthetic (IDs like mission-probe-20261001,
mprobe-d9017c7cb936). A secret-pattern scan of all raw logs found no secrets,
credentials, keys, tokens, or PII; the only hits were the consequence-vocabulary
field name "credential_access":"none". No redaction was needed beyond this check.

## Context
Goal: prove the LIVE proposal -> approval chain end to end on real machinery.
Path chosen: the MC approvals route's canonical ApprovalRequest primitive
(/home/nolan/projects/ping/mc-approval/approval_request.py + approval_cli.py,
the exact CLI the converged :3100 approvals route shells to), converged
emit.py writing to the canonical journal served by the live :18199 gateway
(PID 850, store /home/nolan/projects/ping/data/fyd-journal/events.jsonl).
NOT used: the ORCA control-loop path (its REQUIRES_HUMAN_APPROVAL class
dead-ends; approval seam unwired there per ORCA swarm Q20) and the served
:3100 HTTP surface (runs pre-fix code 300c9c91; excluded as authority).
The HTTP route gate layer (caller-key auth, capability/tenant gates) was
therefore NOT exercised; the canonical transition, journal writes, gateway
reads, projection, and replay WERE.

## Per-stage results
1. Proposal created: PASS. request_approval -> id mprobe-d9017c7cb936,
   status WAITING_APPROVAL, tenant=ping, MC_APPROVAL_REQUESTED appended
   (event mc-apr-a8f27016ac167f4a).
2. Digest fixed: PASS. digest 93093e678faf67a2ea2aa6c72b78db35523f79925dfab0e4ecf9144a8ffc2bee;
   independent recompute matched (digest_match:true); the proposal.json file
   bytes are exactly the canonical bytes (sha256sum of the file == digest).
3. Approval references exact proposal: PASS. decide approve with the exact
   digest -> ok:true, APPROVED, MC_APPROVAL_APPROVED (mc-apr-89da363b8fe6b357)
   whose event_data carries proposal_digest == expected_digest == recorded
   digest. No blank-check approval exists in the code (approve requires the
   exact digest argument).
4. Tampering rejected: PASS. decide approve with mutated digest (...bee ->
   ...bef) -> ok:false reason digest_mismatch, MC_APPROVAL_REFUSED appended
   (mc-apr-0c206da5d8163ba7); follow-up get showed status still
   WAITING_APPROVAL with decided_at/decided_by null: zero state change.
5. Execution occurs once: PASS. The approved effect (emit one MC_LANE_COMPLETED
   probe event) was executed twice with identical arguments: first returned
   "appended" (event mc-bf-5302504dad77, aggregate mc:lane:mission-probe-20261001),
   second returned "duplicate-skipped" (content-derived event_id dedupe).
6. Canonical event written: PASS. The :18199 gateway's own HTTP reader
   (GET /events/<type>) returned all four events: REQUESTED, REFUSED,
   APPROVED, LANE_COMPLETED (each exactly once for this probe).
7. Projection updates: PASS. A journal-fold projector (reads via gateway only)
   folded REQUESTED -> REFUSED (no state change) -> APPROVED and reported
   status APPROVED, digest 93093e..., decided_by mission-lane:one-real-mission,
   refusals=1.
8. Refresh survives: PASS. Fresh process: new ApprovalStore instance read
   APPROVED with identical digest/decided_by/decided_at/tenant; gateway
   re-read still returned the APPROVED event.
9. Replay reconstructs: PASS. Journal-only replay produced
   {status:APPROVED, digest:93093e..., decided_by:mission-lane:one-real-mission,
   decided_at:2026-10-02T00:39:58Z}, identical on all four semantic fields to
   the ApprovalStore's server state.

## Review questions
CORRECTNESS REVIEWER: For each stage 1-9, does the observation actually support
the verdict? Name any stage where the evidence is insufficient, circular (e.g.
writer verifying its own claim), or where a cheaper falsification was missed.
SECURITY REVIEWER: Any unsafe behavior, secret/PII exposure, external effect
(social/email/provider/money), authority bypass, or irreversible state change?
The journal is append-only by design; is writing labeled synthetic probe events
to the canonical journal acceptable given the mission constraints (harmless,
reversible by superseding event)? Note anything that should stop the line.
