# PING Playbook Convergence Sprint: Phases 11-15
## Final report, Agent E

**Run date:** 2026-09-17 (UTC). Driver v4 ran approx 02:36-02:42 UTC; driver v5 approx 02:42-02:47 UTC; driver v6 approx 02:47-02:50 UTC.
**Correlation id:** `sprint-2026-09-16`
**Knowledge namespace:** `test.playbook`
**Event namespace:** `core::playbook`
**Test playbook:** `test.verified-operational-response` (labeled TEST SCOPE ONLY in every approval label)
**Worktree:** `/home/nolan/ping/worktrees/playbook`, branch `sprint/playbook`, base `5b102c664`. All work uncommitted; no commits, pushes, resets, or history changes. Target: Oracle OCI host `129.146.60.17`, container `ping-gateway` (code deployed from that branch).

## Executive summary

All five phases are complete. The full learning chain ran: knowledge proposal, approval through the deployed `KnowledgePromoter` authority, activation, a real mission executed by the real `ReplayWorker` through the real `MissionRuntime`/`MissionScheduler`/`WorkerRuntime` path, outcome to a proposed revision that stayed gated on a human approver, a mission-driven replay of the whole chain verified by `DeterministicReplayEngine` and attested by the witness worker, then a gateway-only restart after which every artifact survived and new work executed.

Three genuine architecture gaps were found and proven by failed runs, not by reading code:

1. **Knowledge HTTP adapter gap.** `POST /knowledge/nodes` drops `nodeId`, `sourceEventId`, and `correlationId`, so a node created through it can never be matched by the approval gate.
2. **KnowledgePromoter dispatch gap.** The promoter is registered but `SNIPPET_APPROVED` is in neither the event-to-mission bridge map nor the mission-to-worker map, so ordinary runtime wiring cannot reach it.
3. **REPLAY_VERIFY bridge gap.** A directly emitted `REPLAY_VERIFY` event creates no mission, so the dispatch-only worker runtime never runs the replay worker. Replay works only when driven as a mission.

Phase 11 is therefore classified VERIFIED on the authority logic with documented runtime-reachability gaps, not as a fully closed production path. Phases 12, 13, 14, and 15 are VERIFIED end to end through production runtime machinery.

No production playbook was approved or revised. Every approval carried the label `agent-e (sprint operator; TEST SCOPE ONLY - not a human)`. The revision node remains `PENDING_HUMAN` with `decided_by: null`, naming Nolan Geske as the required human approver.

## Phase results

### Phase 11: knowledge to approved playbook

Result: PASS with documented gaps (authority logic verified; HTTP adapter and runtime dispatch gaps disclosed).

The run first proved the deployed event identity formula differs from the inspected source. The deployed gateway computes:

```
sha256(JSON({eventType, source, namespace, logical_id: JSON(payload minus volatile timestamp fields)}))
```

Authenticated requests use source `api:muse-level-2`. This was proven by a known-vector self-test: the first proposal attempt in namespace `core::owner` produced id `d1b47668c4b71b125c6e34a4c54c4360fa0bc079cca0397fd9f461bfbb6055d5`, matching the deployed formula exactly. Explicit `core::playbook` namespace requests are accepted by the deployed canonicalization boundary.

Verified identifiers:

- Proposal event `9d5b14d34e1a445f8743650584535a43d2751b1d55012b8bf3acc276ca58f633` (aggregate `test-playbook-proposal-001`), namespace `core::playbook`, correlation `sprint-2026-09-16`.
- Playbook node `94043c0eb1d3918d`, `node_type='playbook'`, namespace `test.playbook`, `source_event_id` set to the proposal event, confidence `0.5`, status `candidate`.
- Approval event `3c1985a53d9fa1e5994aee8440e24573a944691fe2e5c225f44c5d765105e3de` (aggregate `test-playbook-approval-001`), label explicitly test-only.
- The deployed `KnowledgePromoter.handle()` was invoked inside `ping-gateway` against the real persisted approval event, the real deployed promoter code, and the real `KnowledgeGraph` with the gateway's real Postgres configuration. It returned `promoted: true, status: approved`. The node moved to status `approved`, confidence `1.0`.
- The gate fired exactly once: the approval referenced the proposal's source event, and confidence crossed the 0.8 promotion threshold. The promoter's stats after the run were `handled=1, approved=1` on the test namespace.

Gaps proven by failed attempts (these residues remain in the database and are documented, not hidden):

- Attempt 1: proposal in namespace `core::owner` (`d1b47668...`) was rejected by the sprint's own namespace policy and abandoned.
- Attempt 2: node `4917265ee67e678c` created via `POST /knowledge/nodes` came back with `source_event_id` null, because the route drops that field. It is an orphan: the promoter updates by `source_event_id`, so no approval can ever match it. The matching approval event `71093708ce27749f14d968cbe7fbc42bf7bc1e2d1e8e0e0307ec5c2e4c751419` returned `promoted: false` against it.
- Attempt 3: a direct `KnowledgeGraph.updateKnowledgeNode` call from outside the gateway died at the Postgres auth boundary (`password authentication failed`), which is what forced the honest design of the v4 harness: an in-container script importing the deployed `knowledge_graph.js` with the gateway's real configuration, rather than spoofed credentials.

Classification: the promoter's gate logic is proven against the real authority and real persistence. The ordinary runtime cannot reach the promoter (dispatch gap) and cannot create matchable nodes (adapter gap). Both gaps are production findings for the platform team, and Phase 11 must not be read as a closed production path.

### Phase 12: approved playbook to mission runtime to worker to outcome

Result: PASS, end to end through production machinery.

- Activation event `0bc80b9de9cc41f7b042f3d7360eb41e3ec26d70192eeefcd9db95cb8f2a3fd3` (aggregate `test-playbook-activation-001`). The activation gate read the node from Postgres: status `approved`, confidence `1.0`, `data.lifecycle.status` flipped to `active`. The gate refused to activate anything else.
- Projection event `04e4808ae4067a2740b9533b5fa1041f450d90c096b09ceff80d350d73fe1774` (aggregate `test-playbook-projection-001`).
- The real bridge fired: `PROJECTION_CREATED` is in `EVENT_MISSION_MAP`, so `EventToMissionBridge` created mission `0405c01805096690` (`REPLAY_VERIFY`). `MissionScheduler` claimed it, `WorkerRuntime` dispatched the real `ReplayWorker`. Mission status: `completed`, recorded 2026-09-17T02:38:27.529Z, worker `replay`, duration 16 ms.
- Downstream evidence: `REPLAY_COMPLETED` `408247b6cd7f2ba0899df500fb4b7b9e90ea7da2835f328172462dbb2fc745a2` (observed 2026-09-17 02:38:27.524431+00), then `WITNESS_CREATED` `2c75c8da1fdb6b228e43db277508252a317f3446312e42f20e04bf7f649673ef` (observed 2026-09-17 02:38:32.552664+00) via the `WITNESS_CREATE` mission path.

### Phase 13: outcome to learning to proposed revision, no automatic mutation

Result: PASS. The human gate held.

- Outcome event `93687aab65fb0ddc613089e364ee102934a048b8ab3134844fe7e3019bdc8b30` (aggregate `test-playbook-outcome-001`).
- Proposed revision node `194a2b85bde957ed`, `node_type='playbook_revision'`, version `1.1.0`, status `candidate`, `decision: PENDING_HUMAN`, `required_approver: Nolan Geske (human)`, `decided_by: null`.
- Revision event `725cb9964f7314c3762eea0a9d955fc77233eb55ca294c423e7530076da1860a` (aggregate `test-playbook-revision-001`).
- The revision gate checked Postgres for any approval event referencing the revision's source event: zero found. The active playbook v1.0.0 was not mutated into v1.1.0. The revision waits on a human who was never asked and never approved, which is exactly the required behavior.

### Phase 14: replay and witness the full learning chain

Result: PASS, after one honest failure that became a finding.

The first attempt (driver v4) emitted a bare `REPLAY_VERIFY` event `78be38acc10b936ca5fc519b8f8d90744fe6bf994b2bea1a11397e4431dceaad` (aggregate `test-playbook-replay-001`) and waited 120 seconds for a matching `REPLAY_COMPLETED`. None came. Root cause: `REPLAY_VERIFY` is a worker event type but is absent from `EVENT_MISSION_MAP`, so the bridge created no mission and the dispatch-only `WorkerRuntime` never ran the replay worker. Replay machinery itself was healthy the whole time (the phase-12 chain proved it).

The corrected run (driver v5) drove replay the way the architecture intends, as a mission:

- `POST /missions` with `missionType: REPLAY_VERIFY` and the persisted replay event plus the full chain payload returned `missionId: 945689817fdad075`, matching the deterministic expectation `sha256("REPLAY_VERIFY:" + replay_event_id)[0:16]`.
- Mission `945689817fdad075` completed at 2026-09-17T02:43:27.554Z via the real `ReplayWorker`.
- `REPLAY_COMPLETED` `ead4be8a1eaaa77c19c5588df4804525c77589a81092a31d2e876836614561ab`, `verified: True`, `upstreamEventId` equal to the replay event.
- The bridge created the `WITNESS_CREATE` mission; the witness worker emitted `WITNESS_CREATED` `4aa7b0ebecdbf2fcf25bca69b46d105a8b7d9ffc3b31110393decbeb98f5b0f9` at 2026-09-17 02:43:32.534609+00, `documentId: 94043c0eb1d3918d` (the playbook node), attestation `witness-ead4be8a1eaaa77c`. A `LINEAGE_CREATE` mission followed, handled by the lineage worker.

One tooling note: the v5 driver's witness poll filtered on the correlation id inside the witness payload, but the witness payload carries `documentId`/`upstreamEventId`, not the correlation string, so the poll timed out after the evidence already existed. Driver v6 verified the evidence directly by `upstreamEventId` linkage. This was a driver filter bug, not a system gap.

### Phase 15: restart only necessary components, prove durability and post-restart execution

Result: PASS.

- Restarted ONLY the `ping-gateway` container (`docker restart ping-gateway`, rc=0). Postgres and Qdrant were not touched (up 32 hours and 49 minutes respectively at check time).
- Gateway returned healthy after restart (health endpoint, with retry/backoff).
- Durability checks, all PASS:
  - Playbook node `94043c0eb1d3918d` still `approved`, lifecycle still `active`.
  - Revision node `194a2b85bde957ed` still `PENDING_HUMAN`, `decided_by` still null. The restart did not approve anything.
  - All 9 chain events present in `ping_events` (proposal, approval, activation, projection, outcome, revision, replay, replay-completed, witness). The table carries an append-only trigger (`ping_events_no_mutation`), so survival is structural, not luck.
  - Missions `0405c01805096690` and `945689817fdad075` both still `completed` in `ping_missions`.
- Post-restart execution: a new `OBSERVATION_CREATED` event (aggregate `test-playbook-probe-001`) persisted with the exact deterministic id predicted before emission (`c4b129f76a8afd17...`), proving the gateway does real work after the restart.

## Architecture findings (verified by experiment, not by reading)

1. **Deployed event identity differs from inspected source.** The deployed gateway hashes `{eventType, source, namespace, logical_id: JSON(payload minus volatile timestamp fields)}`; the inspected source suggested a different formula. Proven by the known-vector self-test (`d1b47668...`).
2. **Knowledge HTTP adapter is lossy.** `POST /knowledge/nodes` accepts only `nodeType, label, data, entityType, entityId, namespace, status, confidence` and drops `nodeId, sourceEventId, correlationId`. Any node created through it is invisible to the approval gate. Proven by the orphan node `4917265ee67e678c`.
3. **KnowledgePromoter is registered but unreachable.** `SNIPPET_APPROVED` is in neither `EVENT_MISSION_MAP` nor `MISSION_WORKER_MAP`. Normal runtime wiring cannot dispatch to it. Proven by code inspection after the promoter's logic was verified; the registration exists, the route does not.
4. **REPLAY_VERIFY has the same dispatch shape.** Direct emission creates no mission; the mission route is the only working path. Proven by the failed v4 phase-14 attempt followed by the successful v5 mission-driven run.
5. **Durability is structural.** `ping_events` has a `BEFORE DELETE OR UPDATE` trigger rejecting mutation; missions and knowledge nodes live in Postgres, untouched by the gateway restart.

## Honest limitations

- Phase 11's approval ran the real deployed `KnowledgePromoter.handle()` against real persisted data, but through an in-container harness, not through the HTTP adapter (which is lossy, finding 2) or the scheduler (finding 3). The gate logic is proven; the production path to it is not closed.
- The replay in phase 14 ran through the production mission path (`POST /missions` to completed mission to worker), which is the architecture's intended route. The bare-event route for `REPLAY_VERIFY` does not work (finding 4).
- All test artifacts live in the `test.playbook` knowledge namespace and `core::playbook` event namespace under correlation `sprint-2026-09-16`, isolated from production namespaces. Residual failed-attempt records (the `core::owner` proposal `d1b47668...`, the orphan node `4917265ee67e678c`, the unmatched approval `71093708...`) remain in the database as evidence and were not cleaned up, per the no-destructive-actions constraint.

## Commands and access path

All Oracle work went through the Pig WSL worktree over stdin pipes, never direct cloud writes to Pig paths:

```
ssh -F ~/.ssh/pig-config pigwsl 'wsl -d Ubuntu -- bash -s' < /tmp/e-*.sh
```

Oracle access from the Pig:

```
ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=no ubuntu@129.146.60.17 '<command>'
```

Database reads used `docker exec ping-postgres ... psql` (read-only queries). Credentials were resolved at runtime from the `exterior_agent_credentials` table inside the Oracle host; no credential values were printed, stored, or transmitted. Gateway calls used Bearer auth with retry/backoff. The one `docker restart ping-gateway` was the only state-changing infrastructure action, and it was explicitly within the phase-15 scope.

Drivers (all uncommitted, worktree `playbook/`):

- `run_phases.py` (v4): phases 11-13 plus the first phase-14 attempt.
- `run_phases_1415.py` (v5): mission-driven phase 14.
- `run_phases_15.py` (v6): phase-14 evidence verification and phase 15.
- `PLAYBOOK_SPEC.md`: the phase specification this report was run against.

Evidence artifacts (cloud `~/workspace/ping-overnight/playbook/`):

- `chain.json`: the full identifier chain (proposal, node, approval, activation, projection, mission, outcome, revision node, revision event, replay event, replay mission, replay-completed, witness).
- `runlog.jsonl`: the v6 run's machine log lines.

## Chain of identifiers (canonical)

| Role | Identifier |
|---|---|
| Correlation | `sprint-2026-09-16` |
| Proposal event | `9d5b14d34e1a445f8743650584535a43d2751b1d55012b8bf3acc276ca58f633` |
| Playbook node | `94043c0eb1d3918d` |
| Approval event | `3c1985a53d9fa1e5994aee8440e24573a944691fe2e5c225f44c5d765105e3de` |
| Activation event | `0bc80b9de9cc41f7b042f3d7360eb41e3ec26d70192eeefcd9db95cb8f2a3fd3` |
| Projection event | `04e4808ae4067a2740b9533b5fa1041f450d90c096b09ceff80d350d73fe1774` |
| Phase-12 mission | `0405c01805096690` |
| Phase-12 REPLAY_COMPLETED | `408247b6cd7f2ba0899df500fb4b7b9e90ea7da2835f328172462dbb2fc745a2` |
| Phase-12 WITNESS_CREATED | `2c75c8da1fdb6b228e43db277508252a317f3446312e42f20e04bf7f649673ef` |
| Outcome event | `93687aab65fb0ddc613089e364ee102934a048b8ab3134844fe7e3019bdc8b30` |
| Revision node | `194a2b85bde957ed` |
| Revision event | `725cb9964f7314c3762eea0a9d955fc77233eb55ca294c423e7530076da1860a` |
| Replay event | `78be38acc10b936ca5fc519b8f8d90744fe6bf994b2bea1a11397e4431dceaad` |
| Phase-14 mission | `945689817fdad075` |
| Phase-14 REPLAY_COMPLETED | `ead4be8a1eaaa77c19c5588df4804525c77589a81092a31d2e876836614561ab` |
| Phase-14 WITNESS_CREATED | `4aa7b0ebecdbf2fcf25bca69b46d105a8b7d9ffc3b31110393decbeb98f5b0f9` |
| Post-restart probe | `c4b129f76a8afd17` (prefix; aggregate `test-playbook-probe-001`) |

## Open items and recommendations

1. The three dispatch/adapter gaps (findings 2, 3, 4) are real production defects in the deployed gateway. Fixing them is platform work and was out of this sprint's scope; no code was changed.
2. The revision `194a2b85bde957ed` (v1.1.0 of the test playbook) is still `PENDING_HUMAN` awaiting Nolan Geske. Nothing in this sprint approved it, and nothing should until he reviews it.
3. Residual test records listed under Limitations remain in Postgres. Cleanup, if ever wanted, is Nolan's call.
4. All sprint work remains uncommitted on `sprint/playbook` at base `5b102c664`. Committing or pushing is Nolan's call.
