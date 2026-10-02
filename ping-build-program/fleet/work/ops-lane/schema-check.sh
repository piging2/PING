#!/bin/bash
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='ping_events' ORDER BY ordinal_position;" | head -20
echo "--- rowcounts all public tables ---"
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;" | while read -r t; do c=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM \"$t\";"); echo "$t:$c"; done
