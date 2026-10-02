#!/bin/bash
# SWARM-01 probe 19: constructors for test harness (read-only)
P=/home/nolan/ping
echo "########## CanonicalizationService ctor ##########"
sed -n 1,56p $P/ping-runtime/canonicalization/canonicalization_service.js
echo "########## EventBridge ctor ##########"
grep -n "constructor" -A 15 $P/ping-runtime/events/event_bridge.js | head -25
echo "########## MissionRuntime ctor ##########"
sed -n 12,40p $P/ping-runtime/orchestration/mission_runtime.js
echo "########## HybridSearch ctor ##########"
sed -n 25,40p $P/ping-runtime/search/hybrid_search.js
echo "########## MemoryVectorStoreAuthority ctor ##########"
sed -n 1,30p $P/gateway/memory_vector_store_authority.js
echo "########## express in gateway node_modules? ##########"
ls $P/gateway/node_modules 2>/dev/null | head -3; ls $P/node_modules 2>/dev/null | head -3
echo "########## node version on pig ##########"
node --version 2>/dev/null
