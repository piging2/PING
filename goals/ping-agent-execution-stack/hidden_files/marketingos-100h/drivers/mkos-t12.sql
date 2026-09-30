\pset footer off
\echo '=== T1 app_ro fresh session: SHOW + INSERT (C1) ==='
SHOW default_transaction_read_only;
INSERT INTO journal(body) VALUES('t1') RETURNING id;
\echo '=== T2 app_ro: SET override then INSERT (C2a) ==='
SET default_transaction_read_only = off;
SHOW default_transaction_read_only;
INSERT INTO journal(body) VALUES('t2') RETURNING id;
