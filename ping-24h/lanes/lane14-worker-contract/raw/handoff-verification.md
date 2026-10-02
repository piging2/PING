# LANE 14 raw: Lane 11 / Lane 10 handoff verification (2026-09-28 ~14:35 MDT)

Handoff source: ~/workspace/ping-24h/lanes/lane15-memory-taxonomy/raw/lane14-handoff-received.md
(quarantined by lane 15, re-sent to lane 14 by coordinator).

## T1 verified in code
- adapter.js:1239: `const auth = vendor.authorizeWorkOrder({ agentId, capability, namespace, constraints });`
- adapter.js:1298: `const workOrder = vendor.issueWorkOrder({...})` inside the cross-process index lock;
  issueWorkOrder re-runs authorizeWorkOrder internally -> grant re-derived at issue time.
- adapter.js:1313-1320: transport invoker resolved from caller `transport` param; unknown -> throw before index.
- adapter.js:1334-1348: reconciliation record + dispatched-phase index line appended BEFORE transport, under lock.
- adapter.js:1353: `const disp = invokeTransport(prompt, timeoutMs)` AFTER lock release.
  No re-decide of authority between issue and invoke. Gap confirmed as stated by lane 11.

## T2 confirmed
- workOrderId = sha256('workorder:'+taskId)[0:16] (vendor/external_agent_adapter.js workOrderId fn).
  Deterministic ID, not a fingerprint over (tool, identity, args, targets).
- resultIdentity fingerprints identity fields only
  (work_order_id, mission_id, task_id, attempt, agent_id, capability, context_pack_id, namespace).

## P2 / U-07
- Lane 11: no startup execution-authority integrity gate observed at ORCA/MC resume boundary. Not
  independently re-verified in this lane; carried as lane-11 hypothesis.

## Test gap
- Lane 11: zero dedicated unit tests for authorizeWorkOrder despite C4 criticality. Carried as lane-11
  hypothesis.

## Lane 10 executor-input binding
- Lane 10: post-patch, executor receives raw prompt, not the compiled packet
  (route.ts:139 runOllama POSTs {model, prompt}; route.ts:175 runBroker likewise).
  Packet binds the work order, not the executor's reasoning. Carried as lane-10 hypothesis;
  the contract answer (input_digest field) is specified in report section 6.5.

## Naming
- "mc.authorize_work_order/v1": lane-11 Decision Unit label for the live function authorizeWorkOrder
  (label source: live function). The string does not occur in the orca-adapter tree
  (grep adapter.js + vendor file: zero hits).
