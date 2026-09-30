\pset footer off
\echo '=== T3 app_ro fresh session: START TRANSACTION READ WRITE + INSERT (C2b) ==='
START TRANSACTION READ WRITE;
INSERT INTO journal(body) VALUES('t3') RETURNING id;
COMMIT;
\echo '=== T4 app_ro read-only: CREATE TEMP TABLE + write to it (C3) ==='
CREATE TEMP TABLE t1(i int);
INSERT INTO t1 VALUES(1);
SELECT count(*) AS temp_rows FROM t1;
\echo '=== T5 app_ro read-only: nextval (C4) ==='
SELECT nextval('testseq');
\echo '=== T6 app_ro read-only: advisory lock (C5a) ==='
SELECT pg_advisory_lock(42);
SELECT pg_advisory_unlock(42);
\echo '=== T7 app_ro read-only: LISTEN/NOTIFY (C5b) ==='
LISTEN mkos_ch;
NOTIFY mkos_ch, 'ping';
\echo '=== T8 app_ro read-only: CREATE permanent TABLE (DDL) ==='
CREATE TABLE perm_table(i int);
