# Phase 7: Knowledge-Compounding Loop Rerun (2026-09-17)

Isolated-namespace rerun of the complete knowledge-compounding loop through ordinary
production wiring only, after the Phases 3-6 P0 fixes. All work ran against the live
Oracle deployment. No harness, no direct worker invocation, no manual mission
manufacture, no production writes outside the test scope.

## Environment

- Oracle host: ping-core-01 (ubuntu@129.146.60.17), reached via Pig WSL hop
- Release: /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot
- Compose: infrastructure/oracle/docker-compose.oracle.yml
- Gateway: port 8080, healthy before and after the run
- Source authority (read-only reference): /home/nolan/ping, branch constitutional-convergence-v2, HEAD 099927152
- Correlation: phase7-2026-09-17
- Canonical event namespace: core::owner (implicit, per Phase 3 ACL; api:muse-level-2 is entitled to core::owner)
- Isolated knowledge namespace: tenant::phase7-loop (stored in node data, passed to KnowledgePromoter as the optional guard; never claimed as the event namespace)
- Test playbook: test.phase7-loop-response

## Method and constraints honored

- Every step went through ordinary production wiring: POST /events, POST /knowledge/nodes, GET /knowledge/nodes, EventToMissionBridge, MissionScheduler, KnowledgePromoter, ReplayWorker, witness and lineage workers.
- KnowledgePromoter was never called directly. POST /missions was never called. No direct Postgres writes. No in-container harnesses.
- Approval was TEST SCOPE ONLY: an authenticated POST /events of type SNIPPET_APPROVED with explicit labeling that the operator is not a human, the candidate is disposable, and production approval still requires Nolan. No human approval was fabricated.
- The learning proposal (revision node) stayed PENDING_HUMAN with decided_by null. No auto-promotion occurred.
- Bearer was resolved transiently from the exterior_agent_credentials table on Oracle; only its length was ever echoed. No credential value was printed, stored, or transmitted.
- No git history changes, no branch changes, no pushes. Postgres and Qdrant were never restarted.

## Incident during the run: initial mis-targeting (disclosed)

The first driver launch executed on the Pig's WSL instead of Oracle, so its first two
HTTP calls hit the Pig's local PING stack (gateway on the Pig) rather than Oracle.
Symptoms: the returned event id did not match the predicted deterministic id, and no
row appeared in the database being inspected, because the event had persisted to the
Pig's brain-postgres ping_runtime database.

Residue (Pig local dev stack only, harmless test-scope observations, left in place):
- a933458f077376a6d20b71484c39972619c2a2bc20290668f65a6a98d1348b9b (OBSERVATION_CREATED, phase7-proposal-001)
- 06b162e7360648c8584f860286f43e6a9dc491b9f208fa276e73877bc5bfdd66 (OBSERVATION_CREATED, phase7-debug-probe)

Nothing from this incident touched Oracle. The run was relaunched correctly on Oracle
(bearer from Oracle exterior_agent_credentials, gateway http://127.0.0.1:8080 on
Oracle, docker exec against Oracle's ping-postgres), and every subsequent identifier
below is from the Oracle run. Deterministic event ids matched predictions exactly on
Oracle, confirming the identity formula against the deployed build.

## Per-leg results (all VERIFIED)

Leg 1, proposal: OBSERVATION_CREATED emitted through POST /events.
E_prop = c9186726cff9ae37a45e5daf7484a377b22a8683076d4fb426918263c0556934
(predicted id matched returned id; persisted in core::owner). VERIFIED.

Leg 2, candidate: POST /knowledge/nodes created phase7-playbook-node-001 as candidate
with nodeId, sourceEventId, and correlationId provenance intact (Phase 4 fix). VERIFIED.

Leg 3, test-scope approval and promotion: authenticated SNIPPET_APPROVED
E_appr = 410b4f7f18036e922a047a2f135c7c63895220e2c570b71d0214c17f1be5e7ad
was dispatched by EventToMissionBridge to mission KNOWLEDGE_PROMOTE
M_kp = 244b39a58b4df495 (deterministic id matched prediction; scheduler label
knowledge-promotion; status completed). KnowledgePromoter read payload.sourceEventId,
applied the namespace guard, and set the node to status approved with confidence 1.0
via the ordinary path. VERIFIED.

Leg 4, activation: activation OBSERVATION_CREATED
E_act = 09378896b38ea01e80a6e451577833cab1531888222b3c55cc2ebb89cb349d0d
followed by an ordinary POST /knowledge/nodes upsert recording lifecycle active with
approval_ref = E_appr. No harness used. VERIFIED.

Leg 5, execution replay: PROJECTION_CREATED
E_proj = 27a96cb9f60a8889df77d0b997fb4244fec678c14369bc76b91d3ff0fbbf3af0
was dispatched by the bridge to mission REPLAY_VERIFY
M_exec = c5b9d089c039c054 (status completed, assigned to replay). ReplayWorker emitted
REPLAY_COMPLETED E_rc = 63675e4779edfb7c6a331f8549441d062759058fdde376d561146ee0dbeb600a
(verified true, kernel_verified), then the witness worker emitted
E_wit = 82f007904e8d8cd2121b35651b9b49ea902310dd48d47f5432cd7a9d71338122
(attestation witness-63675e4779edfb7c, documentId phase7-playbook-node-001) and the
lineage worker emitted
E_lin = 42f8e86dbf5a003977b827adbd6670cc4a01acaf75e760390122e16f1cdedbd7.
VERIFIED.

Leg 6, outcome: OBSERVATION_CREATED
E_out = 32655f7712f7704f3bc9b4952b228c6f77327df41b343ae78c8b9024bc1977aa
recorded the completed mission outcome. VERIFIED.

Leg 7, learning proposal under human gate: POST /knowledge/nodes created
phase7-revision-node-001 (playbook_revision, candidate, confidence 0.5) with
decision PENDING_HUMAN, required_approver Nolan Geske (human), decided_by null in its
data. Revision event
E_rev = a1425d09cad4f8b4f6aad125330264e7db04f93a7aa07a3015cfb81bdbe199fc.
Zero SNIPPET_APPROVED events reference the revision. No auto-promotion. VERIFIED.

Leg 8, direct REPLAY_VERIFY (Phase 6 fix path): event
E_replay = 105635f4837b43ec5ed6662c5f10966a9329054748ae924da93d184e9cb83dce
was dispatched by the bridge to mission REPLAY_VERIFY
M_replay = a11084d75279e7de (status completed). ReplayWorker emitted
E_rc2 = c82c522cb6a99e31f86cf537d2465814c7b52f6069cd8ddc9a27e24235e1cfdd
(verified true, upstream E_replay), witness
E_wit2 = 1bb24339e3c74ff125b132e96dd07250982034c66b1fd9df63637e76509bb82b
(attestation witness-c82c522cb6a99e31) and lineage
E_lin2 = 93b9329b402ac6f1195bd5192f2d2e80267e5e9906e2a34f1430cb6741bc1583.
VERIFIED.

Leg 9, restart survival: gateway recreated alone via
docker compose -f <live-compose> up -d --no-deps --force-recreate gateway
(Postgres and Qdrant untouched; gateway healthy after 20s). Post-restart verification
confirmed: N2 still approved/confidence 1.0/lifecycle active; N3 still candidate with
PENDING_HUMAN and decided_by null; 13/13 chain events present; 3/3 missions still
completed; a post-restart probe event with a predicted id matched and persisted:
E_probe = 451913eae361df1853b6e351da1a0be09983d8ab0da22b762002edab57358427.
VERIFIED.

## Production safety

- Production revision 194a2b85bde957ed: candidate, decision PENDING_HUMAN, decided_by null. Untouched.
- Orphan node 4917265ee67e678c: candidate. Untouched.
- Pre-restart evidence snapshot and post-restart verification both read directly from Postgres, bypassing the gateway.

## Full identifier chain

- correlation_id: phase7-2026-09-17
- playbook: test.phase7-loop-response
- playbook_node (N2): phase7-playbook-node-001
- revision_node (N3): phase7-revision-node-001
- proposal_event: c9186726cff9ae37a45e5daf7484a377b22a8683076d4fb426918263c0556934
- approval_event: 410b4f7f18036e922a047a2f135c7c63895220e2c570b71d0214c17f1be5e7ad
- promote_mission: 244b39a58b4df495
- activation_event: 09378896b38ea01e80a6e451577833cab1531888222b3c55cc2ebb89cb349d0d
- projection_event: 27a96cb9f60a8889df77d0b997fb4244fec678c14369bc76b91d3ff0fbbf3af0
- execution_mission: c5b9d089c039c054
- execution_replay_completed: 63675e4779edfb7c6a331f8549441d062759058fdde376d561146ee0dbeb600a
- execution_witness: 82f007904e8d8cd2121b35651b9b49ea902310dd48d47f5432cd7a9d71338122
- execution_lineage: 42f8e86dbf5a003977b827adbd6670cc4a01acaf75e760390122e16f1cdedbd7
- outcome_event: 32655f7712f7704f3bc9b4952b228c6f77327df41b343ae78c8b9024bc1977aa
- revision_event: a1425d09cad4f8b4f6aad125330264e7db04f93a7aa07a3015cfb81bdbe199fc
- replay_event: 105635f4837b43ec5ed6662c5f10966a9329054748ae924da93d184e9cb83dce
- replay_mission: a11084d75279e7de
- replay_completed: c82c522cb6a99e31f86cf537d2465814c7b52f6069cd8ddc9a27e24235e1cfdd
- witness: 1bb24339e3c74ff125b132e96dd07250982034c66b1fd9df63637e76509bb82b
- lineage: 93b9329b402ac6f1195bd5192f2d2e80267e5e9906e2a34f1430cb6741bc1583
- probe_event: 451913eae361df1853b6e351da1a0be09983d8ab0da22b762002edab57358427

## Artifacts

- /home/hatch/workspace/ping-overnight/phase7/phase7-driver.py (ordinary-wiring driver)
- /home/hatch/workspace/ping-overnight/phase7/phase7-verify.py (post-restart survival verifier)
- /home/hatch/workspace/ping-overnight/phase7/chain.json (22 identifiers)
- /home/hatch/workspace/ping-overnight/phase7/verify-runlog.jsonl (8 verifier checks)
- /home/hatch/workspace/ping-overnight/phase7/driver.out (full driver log)
- /home/hatch/workspace/ping-overnight/phase7/verify.out (verifier summary)
- Oracle-side copies remain at /tmp/phase7/ and /tmp/phase7-artifacts/ (ephemeral)

## Overall verdict

Phase 7 COMPLETE. All nine legs VERIFIED through ordinary production wiring on the
live Oracle deployment. The knowledge-compounding loop (propose, candidate with
provenance, test-scope approval, promotion, activation, replay with witness and
lineage, learning proposal under human gate, direct replay dispatch) compounds
correctly in the isolated tenant::phase7-loop namespace, survives a gateway-only
restart, and leaves production state untouched.
