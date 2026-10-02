#!/bin/bash
# Read-only Oracle PG metadata snapshot via docker exec into ping-postgres.
# SELECT on information_schema/pg_stat ONLY. Never dumps row contents. Never writes.
set -u
PG="docker exec -i ping-postgres psql -U ping -d crx_runtime -At -F $'\t'"
echo "=== TABLES ==="
echo "SELECT table_schema||'.'||table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1;" | $PG
echo "=== COLUMNS ==="
echo "SELECT table_schema||'.'||table_name||'.'||column_name||'|'||data_type||'|'||COALESCE(column_default,'')||'|'||is_nullable FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1;" | $PG
echo "=== TRIGGERS ==="
echo "SELECT event_object_schema||'.'||event_object_table||'.'||trigger_name||'|'||string_agg(event_manipulation,',' ) FROM information_schema.triggers WHERE trigger_schema NOT IN ('pg_catalog','information_schema') GROUP BY 1,2,3 ORDER BY 1;" | $PG
echo "=== SEQUENCES ==="
echo "SELECT sequence_schema||'.'||sequence_name FROM information_schema.sequences ORDER BY 1;" | $PG
echo "=== RELTUPLES ESTIMATES ==="
echo "SELECT schemaname||'.'||relname||'='||COALESCE(reltuples::bigint,0) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND c.relkind IN ('r','v') ORDER BY 1;" | $PG
echo "=== PG_STAT_USER_TABLES ==="
echo "SELECT schemaname||'.'||relname||'|seq_scan='||seq_scan||'|idx_scan='||idx_scan||'|n_tup_ins='||n_tup_ins||'|n_tup_upd='||n_tup_upd||'|n_tup_del='||n_tup_del FROM pg_stat_user_tables ORDER BY 1;" | $PG
