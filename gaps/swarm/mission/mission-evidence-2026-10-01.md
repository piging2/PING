# ONE REAL MISSION — live proposal → approval chain: EVIDENCE
2026-10-01 ~18:36–18:50 MDT. Lane worker: one-real-mission (parent tasking).

## Operator report (binding format)

- REPO: /home/nolan/projects/ping (mission machinery) + /home/nolan/projects/ping-fyd-converged (reference: converged route/projection)
- WORKTREE: none (main checkouts, not worktrees)
- BRANCH: ping @ fyd/builder-harvest-trackc-2026-09-28; ping-fyd-converged @ convergence-2026-09-28
- HEAD: ping feeed831 / ping-fyd-converged 6405011d
- STATUS: no new dirty files from this mission. ping: pre-existing dirty (3 __pycache__ .pyc, adapters .pyc, var/mc-approvals.json; untracked tests/__pycache__, var/mc-approvals-auth-classification.json) — all pre-date this mission, untouched. ping-fyd-converged: pre-existing untracked (mc-approval/__pycache__/, tests/__pycache__/, var/), untouched.
- AHEAD/BEHIND: local commits unpushed (pre-existing state; this mission pushed nothing and committed nothing — no repo file was written)
- UNTRACKED: none added by this mission
- DIRTY FILE COUNT: 0 attributable to this mission
- LAST 3 COMMITS: ping: feeed831 / ea497a94 / f94bba39; ping-fyd-converged: 6405011d / 4ad9a7a3 / 300c9c91 (all pre-existing)
- REMOTES VERIFIED: NO (not probed; irrelevant — no push intended)
- PUSHED: NO (nothing committed; nothing to push)

## Path chosen and why
The ORCA control-loop path was excluded: ORCA swarm Q20 proved its
REQUIRES_HUMAN_APPROVAL class dead-ends (no machinery records/consumes a
human approval; the ApprovalRequest store is never consulted there). The
served :3100 HTTP surface was excluded as authority: it runs PRE-FIX
300c9c91. The exercised path is the MC approvals route's canonical
machinery — approval_request.py + approval_cli.py (the exact CLI the
converged route 6405011d shells to) + converged emit.py → canonical journal
#1, read back through the live :18199 gateway's own HTTP reader. The HTTP
route-gate layer (caller-key auth, capability/tenant gates) was NOT
exercised (it lives on the pre-fix served plane); the canonical transition,
journal writes, gateway reads, projection, and replay WERE. Approver
identity recorded honestly as "mission-lane:one-real-mission" (the lane
worker under parent tasking), not Nolan.

## Per-stage evidence

### Stage 1 — Proposal created: PASS
- PROPOSITION: a real proposal artifact exists in the ApprovalRequest store, status WAITING_APPROVAL.
- PLANE: integrated (ping @ feeed831 working tree, converged emit.py); journal write on live canonical plane (:18199).
- COMMAND: mission_driver.py record (canonical request_approval), store=/tmp/mission-probe-20261001/store.json (mission-scoped scratch; the shared var/mc-approvals.json was NOT touched), journal=canonical journal #1.
- OBSERVED: ok:true, created:true, id=mprobe-d9017c7cb936, status=WAITING_APPROVAL, tenant=ping, capability=mc.probe.synthetic; MC_APPROVAL_REQUESTED appended, event_id=mc-apr-a8f27016ac167f4a, aggregate mc:approval:mprobe-d9017c7cb936.
- EVIDENCE: raw/stage1-record.log.

### Stage 2 — Proposal digest fixed: PASS
- PROPOSITION: the digest is content-addressed and independently reproducible.
- PLANE: integrated + deterministic (coreutils).
- COMMAND: in-driver independent proposal_digest() recompute; sha256sum proposal.json.
- OBSERVED: digest=93093e678faf67a2ea2aa6c72b78db35523f79925dfab0e4ecf9144a8ffc2bee; digest_match:true; sha256sum of the file == digest (file bytes ARE the canonical bytes: sorted keys, compact separators, ASCII).
- EVIDENCE: raw/stage1-record.log, raw/stage4-tamper.log (sha256sum line).

### Stage 3 — Approval references the EXACT proposal: PASS
- PROPOSITION: the approval binds the exact digest; no blank-check approve exists.
- PLANE: integrated (approval_cli.py decide = the converged route's mechanism).
- COMMAND: approval_cli.py decide --decision approve --digest <exact> --approver mission-lane:one-real-mission.
- OBSERVED: ok:true, idempotent:false, status=APPROVED, decided_by=mission-lane:one-real-mission, decided_at=2026-10-02T00:39:58Z; MC_APPROVAL_APPROVED event_id=mc-apr-89da363b8fe6b357 with event_data.proposal_digest == expected_digest == 93093e… (all three equal).
- EVIDENCE: raw/stage3-approve.log.

### Stage 4 — Tampering rejected: PASS
- PROPOSITION: a mutated post-creation digest is refused with zero state change.
- PLANE: integrated.
- COMMAND: decide approve with digest …bee→…bef (one hex char mutated), then get.
- OBSERVED: ok:false, reason=digest_mismatch; MC_APPROVAL_REFUSED appended (mc-apr-0c206da5d8163ba7, reason digest_mismatch in event_data); follow-up get: status STILL WAITING_APPROVAL, decided_at/decided_by null. Refusal is audited; nothing transitioned.
- EVIDENCE: raw/stage4-tamper.log, raw/stage4b-state-after-tamper.log.

### Stage 5 — Approved execution occurs ONCE: PASS
- PROPOSITION: the approved effect executes exactly once; a retried execution is refused as duplicate.
- PLANE: integrated (emit.py, content-derived event_id dedupe) → live journal.
- COMMAND: mission_driver.py execute (MC_LANE_COMPLETED, lane mission-probe-20261001, fixed stamp) run twice with identical arguments.
- OBSERVED: run 1 → event_id mc-bf-5302504dad77, how=appended, aggregate mc:lane:mission-probe-20261001. Run 2 → same event_id, how=duplicate-skipped. Journal holds one copy.
- EVIDENCE: raw/stage5-execute-1.log, raw/stage5-execute-2.log.

### Stage 6 — Canonical event written: PASS
- PROPOSITION: the events are visible through the :18199 gateway's own reader, not just the writer's claim.
- PLANE: live/served (gateway PID 850, journal fyd-demo-journal@8d6956c1caca).
- COMMAND: GET /events/<type>?limit=200 for MC_APPROVAL_REQUESTED / _REFUSED / _APPROVED / MC_LANE_COMPLETED; grep probe aggregates.
- OBSERVED: gateway returned mc-apr-a8f27016ac167f4a (REQUESTED), mc-apr-0c206da5d8163ba7 (REFUSED), mc-apr-89da363b8fe6b357 (APPROVED) each exactly once under aggregate mc:approval:mprobe-d9017c7cb936; mc-bf-5302504dad77 (LANE_COMPLETED) exactly once under mc:lane:mission-probe-20261001.
- EVIDENCE: raw/stage6-gateway-reader.log.

### Stage 7 — Projection updates: PASS
- PROPOSITION: a reader/projection reflects the event.
- PLANE: live (projection reads via gateway HTTP only).
- COMMAND: project_approval.py --gateway http://127.0.0.1:18199 --approval-id mprobe-d9017c7cb936 (folds MC_APPROVAL_* for the aggregate in timestamp order).
- OBSERVED: {status:APPROVED, proposal_digest:93093e…, decided_by:mission-lane:one-real-mission, decided_at:2026-10-02T00:39:58Z, refusals:1, events_folded:[REQUESTED@00:39:40Z, REFUSED@00:39:48Z, APPROVED@00:39:58Z]}. REFUSED folded as no-state-change audit, as constructed.
- EVIDENCE: raw/stage7-projection.log, project_approval.py.

### Stage 8 — Refresh survives: PASS
- PROPOSITION: state persists across process refresh (new store instance, fresh gateway read).
- PLANE: integrated + live.
- COMMAND: fresh process: approval_cli.py get (new ApprovalStore instance from disk); fresh curl of gateway APPROVED stream.
- OBSERVED: store re-read {id, APPROVED, 93093e…, mission-lane:one-real-mission, 2026-10-02T00:39:58Z, tenant ping} — identical; gateway re-read still returns the APPROVED event (count 1).
- EVIDENCE: raw/stage8-refresh.log.

### Stage 9 — Replay reconstructs: PASS
- PROPOSITION: rebuilding from canonical history alone yields the same semantic state as the store authority.
- PLANE: live (journal-only) vs integrated (store).
- COMMAND: project_approval.py (journal-only via gateway) vs ApprovalStore.get direct read; compare {status, proposal_digest, decided_by, decided_at}.
- OBSERVED: replay {APPROVED, 93093e…, mission-lane:one-real-mission, 2026-10-02T00:39:58Z} == store record on all four fields.
- EVIDENCE: raw/stage9-replay.log.

## Honest boundaries (what was NOT proved)
- The HTTP route-gate layer (x-mc-caller-key auth, capability/tenant entitlement gates in mc-approval-gate) was not exercised: it runs on the served :3100 plane at pre-fix 300c9c91. The canonical transition underneath it was proved; the gate in front of it was not.
- The ORCA loop path remains UNWIRED for approvals (Q20 stands): nothing in this mission changes that.
- Mission Control UI projection: not in scope (rebuild waits for this proof per directive).
- Reversal was designed, not executed: supersede path = a MC_ESCALATION event referencing mc:lane:mission-probe-20261001; journal is append-only so probe history is preserved either way. No reversal event was emitted (kept journal minimal).
- /tmp/mission-probe-20261001 appeared shared between sandbox and Pig WSL; all canonical claims were verified through the gateway HTTP reader, never through /tmp.

## Reviewer pipeline (lightweight)
- Privacy: all mission data synthetic; secret-pattern scan of all raw logs found zero secrets/credentials/PII (only the consequence-vocabulary field name "credential_access":"none"). Redaction was a verified no-op. No free-model call carried anything sensitive.
- Correctness reviewer: PARTIAL. Nemotron Ultra free: 503 overloaded (x2), one empty body. North Mini: first attempt supported stages 1–3 explicitly then truncated; two later attempts returned empty ("None"). Qwen 27B: 429 rate-limited (x2). Free tier degraded tonight.
- Security reviewer: COMPLETE (North Mini, clean): "No security concerns identified. GO."
- Deterministic reconciliation (mine): the completed security review is clean; the partial correctness review supports stages 1–3; stages 4–9 rest on quoted deterministic command output preserved in raw/ (refusal JSON, get-after-tamper, duplicate-skipped, gateway grep counts, projector output, refresh output, replay-vs-store field equality) — no stage relies on model judgment. No reviewer conflicts to resolve. Jev escalation NOT warranted: nothing is genuinely unresolved; the evidence is mechanical and independently inspectable in raw/.
- Reviewer logs: raw/reviewer-*.log; brief: reviewer-brief.md.

## Artifacts
- Evidence: ~/workspace/gaps/swarm/mission/ (this file, proposal.json, mission_driver.py, project_approval.py, reviewer-brief.md, raw/ logs, raw/store-final.json)
- Canonical journal events (live, :18199): mc-apr-a8f27016ac167f4a, mc-apr-0c206da5d8163ba7, mc-apr-89da363b8fe6b357, mc-bf-5302504dad77
- No product code written or modified. No commits (nothing to commit). No push.

## Verdict
ALL 9 STAGES PASS on reachable machinery. The live proposal → approval chain is CLOSED on the MC approvals path: proposal → fixed digest → exact-digest approval → tamper refusal → once-only execution → canonical journal → projection → refresh → replay. First broken edge for the NEXT step: the HTTP route-gate layer on the served plane (pre-fix :3100) and the Mission Control rebuild around this verified state.
