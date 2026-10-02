# Execution-identity proposal: IdentityAuthority findings and the minimal formula

**Status:** PROPOSAL for Nolan's review. NOT implemented. The approved decision (docs/decision-execution-identity-2026-09-17.md) stands; this proposes the identity mechanics.

## What the forensics found about IdentityAuthority

Headline: IdentityAuthority owns zero identity-generation capabilities on the live path. It is declared but bypassed everywhere that matters. All live identity generation is done inline by the emitting components.

- IdentityAuthority (TS interface, runtime/kernel/identity/identity-authority.ts): INTERFACE / DORMANT. Unimplemented; zero importers repo-wide. (forensics/AUTHORITY_FORENSICS.md:126, :298)
- IdentityAuthority (Python, runtime/authorities/identity_authority.py): LEGACY / DORMANT. Used only by dormant runtime/workers/*.py. (forensics:127)
- IdentityAuthority (JS kernel variants, runtime/kernel/authorities/*identity*): DORMANT kernel path, on the dormant kernel pipeline. (forensics:100)
- Second-hand note only: "identityAuthority mints tool/tool_exec IDs but they are not wired onto spine events [SECOND-HAND: continuity-audit-2026-09-13.md:40]". (thread-handoffs.md sec 4)
- Zero captured drift-source files contain any IdentityAuthority implementation; `grep -i identity` across all drift captures returned only mission-id code.

The actual live identity conventions (what really mints ids):

| Id kind | Minter | Formula |
|---|---|---|
| Event id | UnifiedEventRuntime.emit() | sha256(JSON({eventType, source, [namespace], [logical_id \| payload]})) |
| Mission id | MissionRuntime.create() | sha256(missionType + ':' + payload.event_id)[0:16], fallback sha256(missionType + ':' + JSON(payload))[0:16] (drift-sources/mission_runtime.js.live-20260917:62-84) |
| Knowledge node id | KnowledgeGraph.addNode() | sha256(nodeType:label:canonicalJSON(data))[0:16] |
| Retry attempt | MissionRuntime.failWithRetry() + reclaimRetryPending() | retries INTEGER counter, retry_pending status, backoff gate (mission_runtime.js.live-20260917:187-235, :242-258) |

## Honest statement on the authority path

Nolan's constraint was: inspect IdentityAuthority first, then derive the canonical execution identity from that authority. The evidence says there is no live IdentityAuthority to route through. Two options:

1. **Follow the live inline convention now.** MissionRuntime.assign() mints the execution identity using the same deterministic sha256 pattern as missions and knowledge nodes. The formula is reviewed as a contract proposal, and the constitutional repair (restoring IdentityAuthority as the single owner) becomes its own backend work item. This gets the lineage fixed without depending on a dormant authority.
2. **Restore IdentityAuthority first.** Implement IdentityAuthority as the canonical owner and route execution identity (and eventually the other inline minters) through it. More constitutionally pure, slower, and depends on a runtime that no live code currently calls.

Recommendation: option 1, because the defect (no attempt-level lineage) is real and option 2 has no live caller to converge on. But the decision between them is Nolan's; the forensics cannot make it from captured evidence.

## Proposed minimal deterministic formula (for review, not implemented)

```
execution_id = sha256("EXECUTION:" + mission_id + ":" + attempt_ordinal + ":" + worker_name)[0:16]
```

- `mission_id`: already deterministic, sha256(missionType:event_id)[0:16] (drift-sources/mission_runtime.js.live-20260917:74-76).
- `attempt_ordinal`: the mission `retries` counter at dispatch time (attempt = retries + 1); the counter is authoritative and already persisted (mission_runtime.js.live-20260917:206-235). Distinct attempts of one mission get distinct identities, which is the entire point.
- `worker_name`: the assignment semantic, `MISSION_WORKER_MAP[mission_type]` (mission_scheduler.js.live-20260917:206), combined with the dispatched `event_type` (`payload.event_type || mission.mission_type`, mission_scheduler.js.live-20260917:226-250), since WorkerRuntime.dispatch matches on event types, not mission labels. For a KNOWLEDGE_PROMOTE mission this would be `knowledge-promotion` / `SNIPPET_APPROVED`.
- Shape rationale: colon-joined materials hashed with SHA-256 mirrors the mission formula (`missionType:event_id`); 16-hex truncation is the established PING convention for non-event ids (missions, knowledge nodes). No random UUIDs, no invented authority, no browser generation, no timestamp inference, no correlation_id overloading.

## What happens on approval

If Nolan approves this proposal (or option 1 with a modified formula), the runtime owner is MissionRuntime at assign(): the identity is minted at the PENDING -> assign() transition and carried on every downstream record (mission_id, execution_id, principal, worker_id, attempt, causation, correlation). The UI run.json projection lights up only after the runtime emits it; the UI never generates it. run_id from action truth is NOT renamed to execution_id until code evidence proves the semantics match.
