#!/bin/bash
echo "=== sample event_id format in ping_events ==="
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT event_id FROM ping_events LIMIT 5;"
echo "=== try full 64-hex source_event_id as event_id ==="
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM ping_events WHERE event_id='046dbd4096756b9f19ffba7e703df6912793d1c927bb6ad364660803e9ebe4f9';"
echo "=== which tables have an event_id-ish column? ==="
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT table_name, column_name FROM information_schema.columns WHERE column_name IN ('event_id','source_event_id','id') AND table_schema='public' ORDER BY 1,2;" | head -30
echo "=== databases ==="
docker exec ping-postgres psql -U ping -tAc "SELECT datname FROM pg_database WHERE datistemplate=false;"
echo "=== search canonical_events structure ==="
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM canonical_events;"
