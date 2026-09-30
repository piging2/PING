\pset footer off
\echo '=== T11 app_ro: temp table created while writable, then written while read-only ==='
SET default_transaction_read_only = off;
CREATE TEMP TABLE t2(i int);
SET default_transaction_read_only = on;
SHOW default_transaction_read_only;
INSERT INTO t2 VALUES(10);
SELECT count(*) AS temp_write_rows FROM t2;
\echo '=== T11b app_ro read-only: COPY FROM to temp table ==='
COPY t2 FROM STDIN;
20
\.
SELECT count(*) AS temp_rows_after_copy FROM t2;
