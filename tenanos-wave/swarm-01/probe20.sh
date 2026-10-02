#!/bin/bash
# SWARM-01 probe 20: route factories + HybridSearch.search body (read-only)
P=/home/nolan/ping
echo "########## routes/mission_control.js top ##########"
sed -n 1,60p $P/gateway/routes/mission_control.js
echo "########## routes/knowledge.js top ##########"
sed -n 1,50p $P/gateway/routes/knowledge.js
echo "########## hybrid_search search() body ##########"
sed -n 39,100p $P/ping-runtime/search/hybrid_search.js
