#!/bin/bash
# SWARM-01 probe 21: verify test-harness requires work standalone (read-only)
cd /home/nolan/ping
node -e "
const mods = [
  'ping-runtime/canonicalization/canonicalization_service.js',
  'ping-runtime/events/event_bridge.js',
  'ping-runtime/orchestration/mission_runtime.js',
  'ping-runtime/search/hybrid_search.js',
  'gateway/memory_vector_store_authority.js',
  'gateway/route_middleware.js',
  'gateway/routes/mission_control.js',
  'gateway/routes/knowledge.js',
];
for (const m of mods) {
  try { require('/home/nolan/ping/' + m); console.log('LOAD_OK', m); }
  catch (e) { console.log('LOAD_FAIL', m, '--', e.message.split('\n')[0]); }
}
"
