-- PING canonical DB write-boundary regression check.
-- Run read-only against brain-postgres / ping_runtime.
-- PASS = every query returns zero rows. FAIL = any row: the infrastructure
-- trust boundary has widened and promotion must re-evaluate.

-- CHECK 1: no grantee other than the canonical writer role may hold a
-- write-class privilege on any canonical event table.
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('ping_events', 'repository_events', 'canonical_events',
                     'event_outbox', 'event_processing', 'mission_events')
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES')
  AND grantee NOT IN ('postgres')
ORDER BY table_name, grantee, privilege_type;

-- CHECK 2: no login role other than the canonical writer role may exist.
SELECT rolname AS unexpected_login_role
FROM pg_roles
WHERE rolcanlogin AND rolname NOT IN ('postgres')
ORDER BY 1;

-- CHECK 3: no row-level-security policy changes are expected to alter the
-- boundary silently (currently zero policies; any nonzero result is a
-- flag to review, not an automatic fail).
SELECT count(*) AS rls_policy_count FROM pg_policies;
