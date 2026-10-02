#!/bin/sh
echo "USER=$POSTGRES_USER"
echo "DB=$POSTGRES_DB"
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "SELECT current_database();"
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "SELECT count(*) FROM pg_tables WHERE tablename = 'playbook_revisions';"
