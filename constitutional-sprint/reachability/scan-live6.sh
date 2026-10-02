#!/bin/bash
B=/home/nolan/projects/ping-constitutional
echo "### environ readability for next-server 3100"
ls -l /proc/87920/environ 2>&1
tr '\0' '\n' < /proc/87920/environ 2>/dev/null | wc -l
tr '\0' '\n' < /proc/87920/environ 2>/dev/null | grep -ciE "gateway" 
echo "### social config.ts full head"
sed -n '1,40p' "$B/src/fyd/social/config.ts"
echo "### ask pipeline: what happens when journal overlay fetch fails?"
grep -n "GatewayUnreachable\|catch\|fallback\|fixture" /home/nolan/projects/ping-constitutional/src/fyd/data/fyd-tenant-graph.ts | head -15
echo "### anything on 18199 (double-check)"
(ss -ltn 2>/dev/null | grep 18199) || echo "nothing listening on 18199"
echo "### .env.local in served checkout?"
ls /home/nolan/projects/ping/.env.local 2>/dev/null || echo "no .env.local"
echo "### parent of next-server 3100 (how launched)"
ps -o pid,ppid,args -p 87920 2>/dev/null; ps -o pid,args -p $(ps -o ppid= -p 87920 2>/dev/null) 2>/dev/null
