SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY 1;
\echo '--- crx_runtime tables matching ---'
\c crx_runtime
SELECT schemaname, tablename FROM pg_tables WHERE tablename ILIKE '%playbook%' OR tablename ILIKE '%revision%';
