# Q28/Q29 — probe log (condensed)
All Pig commands via ~/workspace/bin/pigwsl-exec (read-only: grep/sed/find). Scratch plane: /tmp/swarm-q29 on sandbox VM, removed after.

## Q28 probes
- `grep -rnw placement placeMission eligibleTarget selectAdapter chooseAdapter resolveAdapter pickAdapter executionTarget` on mission_scheduler.js, worker_runtime.js, dispatcher.js, infrastructure_dispatcher.js, kernel/execution/dispatcher.js → NO MATCH
- Read worker_runtime.js dispatch(): eventTypes registration match; tenant-blind
- Read mission_scheduler.js lines 41-70 (MISSION_WORKER_MAP contract comment), grep dispatch/emit/worker/tenant/capability → tenant threaded as `mission.tenant_id || null` only; capability refs are feature-capability guards only
- capability_registry.js grep select/choose/eligible/tenant/pick/prefer → NO MATCH (register/markConnected/updateHealth only)
- capability_resolver.js resolve(): provider-exists check, no selection
- execution_authority.py: single injected adapter
- Whole-tree `grep -rniw placement|placeMission` (js/py/ts, caches/tests/md excluded) → only presentping illustration-layout + placement_mapper.py (student placements)
- `grep -w tenant` on the five execution files → NO MATCH

## Q29 probes
- pig-get.sh pulls (sequential; first parallel batch raced on /tmp/pigget.b64 and was re-pulled sequentially with byte-count verification): fyd-journal-gateway server.mjs, approval_request.py, tenant_capability_grant.js, capability_registry.js, scoped-stores.ts, tenant-context.ts
- Journal gateway scratch: FYD_JOURNAL_PORT=18999, scratch store, WRITE_TOKEN=q29scratchtoken. 9 probes: 2 writes ok; 2 scoped reads ok (1 each); no-tenant read 400; smuggle write 400 tenant_mismatch; replay same-tenant deduped:true; cross-tenant request_id 400 no leak; no-token write 401. All pass.
- approval_request.py scratch: ApprovalStore(scratch path). synthetic tenant create+approve ok; legacy approve → tenant_unknown; dedupe ok.
- tenant_capability_grant.js node require: validate ok; cross-tenant check refused; missing tenant invalid.
- tenant-context.ts: tsc-transpiled in scratch (npx typescript), 11/11 gate probes pass.
- Pig static hunt: `grep -rni nolan|geske` on execution files → comments only. Fallback hunt `|| "tenant::ping"`, `tenant or`, `tenant_id or` → none. hpp hunt → gateway_runtime.js:443-458 (tenant::hpp table), project_authority.js (7x `tenantId = 'hpp'`, 2x SQL DEFAULT), ai_workspace_authority.js (6x + 1x SQL), huggingface_adapter.js (6x), customer_authority.js:581 owner:'hpp'. tenant::ping defaults → ZERO. Unkeyed global caches → none. Implicit cwd → none.

## Cleanup
- Scratch node server killed (proc session terminated); port 18999 verified free; /tmp/swarm-q29 + /tmp/pigget.b64 removed; no swarm residue in /tmp. Served systems untouched throughout.
