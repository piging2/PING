#!/bin/bash
# SWARM-01 probe 16: retries, projections, object authority, product contract (read-only)
P=/home/nolan/ping
echo "########## bullmq_adapter tenant ##########"
grep -n -i "tenant\|namespace" $P/gateway/bullmq_adapter.js | head -10
echo "########## dead_letter_authority tenant ##########"
grep -n -i "tenant\|namespace" $P/gateway/dead_letter_authority.js | head -10
echo "########## mission_scheduler retry tenant ##########"
grep -n -i "tenant\|namespace\|retry" $P/ping-runtime/orchestration/mission_scheduler.js | head -20
echo "########## embedding_service namespace ##########"
grep -rn -i "namespace" $P/ping-runtime/embeddings/embedding_service.js | head -10
echo "########## canonical_object_authority tenant ##########"
grep -n -i "tenant" $P/gateway/canonical_object_authority.js | head -10
echo "########## grants.ts (next repo) ##########"
grep -n -i "tenant" /home/nolan/projects/ping/src/lib/ping/grants.ts | head -20
echo "########## tenant-context.ts head ##########"
sed -n 1,60p /home/nolan/projects/ping/src/fyd/tenant/tenant-context.ts
