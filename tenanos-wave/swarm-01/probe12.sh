#!/bin/bash
# SWARM-01 probe 12: mission control + knowledge + memory + evidence tenant handling (read-only)
P=/home/nolan/ping
echo "########## routes/mission_control.js tenant ##########"
grep -n -i "tenant\|namespace" $P/gateway/routes/mission_control.js | head -30
echo "########## routes/knowledge.js tenant ##########"
grep -n -i "tenant\|namespace" $P/gateway/routes/knowledge.js | head -30
echo "########## memory_vector_store_authority tenant ##########"
grep -n -i "tenant\|namespace\|collection" $P/gateway/memory_vector_store_authority.js | head -40
echo "########## hybrid_search tenant ##########"
grep -n -i "tenant\|namespace" $P/ping-runtime/search/hybrid_search.js | head -30
echo "########## evidence_authority tenant ##########"
grep -n -i "tenant\|namespace" $P/ping-runtime/evidence/evidence_authority.js | head -30
echo "########## canonical_event_envelope tenant ##########"
grep -n -i "tenant" $P/gateway/canonical_event_envelope.js | head -30
