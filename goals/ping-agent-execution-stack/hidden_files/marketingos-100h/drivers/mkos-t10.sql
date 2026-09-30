\pset footer off
\echo '=== T10 app_append (revoked INSERT/UPDATE/DELETE/TRUNCATE), no read-only default (C7) ==='
SHOW default_transaction_read_only;
SELECT count(*) AS can_select FROM journal;
INSERT INTO journal(body) VALUES('t10') RETURNING id;
UPDATE journal SET body = 'mut' WHERE id = 1;
DELETE FROM journal WHERE id = 1;
TRUNCATE journal;
\echo '=== T10b app_append explicit READ WRITE ==='
START TRANSACTION READ WRITE;
INSERT INTO journal(body) VALUES('t10b') RETURNING id;
ROLLBACK;
