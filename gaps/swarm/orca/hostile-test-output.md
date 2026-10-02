# Q20 hostile test — raw output (Pig, node v22.23.2, 2026-10-01 ~18:40 MDT)

```
CASE 1 [control-unknown-agent]: NO-THROW -> {"granted":false,"reason":"Unknown exterior agent: orca-synthetic"}
CASE 2 [control-email.send-via-adapter]: THREW code=WORK_ORDER_DENIED msg=Work order denied: Capability 'email.send' not allowed for agent 'hermes'
CASE 3 [control-missing-constraint]: NO-THROW -> {"granted":false,"reason":"Constraint 'no_writes' must be true for agent 'hermes'"}
CASE 4 [ATTACK-direct-issue-no-approval]: NO-THROW -> {"work_order_id":"04de01a38f08a378","agent_id":"hermes","mission_id":"hostile-mission-001","task_id":"hostile-task-001","correlation_id":"hostile-corr-001","context_pack_id":"hostile-ctx-001","causation_id":null,"attempt":1,"principal":"ping:external-agent-adapter","namespace":"core::system","capabi...[truncated at 300 chars]
CASE 5 [policy-email.send-classification]: NO-THROW -> {"decisionClass":"REQUIRES_HUMAN_APPROVAL","sourceRule":"contract§6:temporal-stub:requiresApproval","reason":"Capability 'email.send' is outward-facing and requires human approval via the approval gate; dispatcher policy, never worker choice.","action":"escalate","at":"2026-10-02T00:32:39.133Z","age...[truncated at 300 chars]
CASE 6 [policy-text.summarize-classification]: NO-THROW -> {"decisionClass":"AUTO_EXECUTE","sourceRule":"external_agent_adapter.authorizeWorkOrder:granted","reason":"Granted by the authorization gate (agent 'hermes', capability 'text.summarize', namespace 'core::system'). ORCA chose the means; PING granted the authority.","action":"delegate","at":"2026-10-0...[truncated at 300 chars]
DONE. No process spawned, no file written, no event emitted by this script.
```

Notes:
- Case 4's `work_order_id` (`04de01a38f08a378`) is deterministic across runs (stableWorkOrderId from taskId) — the idempotency design working as specified, not a collision.
- Script: `hostile-test.js` in this directory. Ran from `/tmp/orca-q20-hostile/` (ephemeral scratch) against worktree `/home/nolan/worktrees/orca-autonomy` @ `a2b2e9f1e9d5e8194f321356dbe22b345ee08c09`.
- No dispatcher was invoked, no Windows process spawned, no journal/event/DB writes performed by the test.
