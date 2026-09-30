\pset footer off
\echo '=== T9a su_ro fresh session: SHOW + INSERT (superuser default) ==='
SHOW default_transaction_read_only;
SELECT rolsuper FROM pg_roles WHERE rolname = current_user;
INSERT INTO journal(body) VALUES('t9a') RETURNING id;
\echo '=== T9b su_ro: SET override then INSERT (C6) ==='
SET default_transaction_read_only = off;
INSERT INTO journal(body) VALUES('t9b') RETURNING id;
