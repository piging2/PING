# BLOCK 0–20 RESEARCH BRIEF — INTELLIGENCE_RESEARCH mission
Sprint: MARKETINGOS NEXT 100 HOURS. Block: 0–20 RESEARCH EXCELLENCE.
Written BEFORE any research began: 2026-09-30 ~14:35 MDT.

## Topic
**What does PostgreSQL read-only actually seal?**
Subtitle candidate: "We sealed our audit journal with `default_transaction_read_only`. Here is the exact boundary of that claim."

## Why this topic (defense of choice)
1. Primary evidence is reachable TODAY: a disposable Postgres 16, the official PG docs, and read-only inspection of our own Oracle deployment config. No external permission needed, no fabricated benchmarks.
2. A contradiction is plausible and valuable: the widespread belief "read-only role = no writes possible" vs. the documented reality that `default_transaction_read_only` is a *default*, overridable per session, and that superuser roles bypass it entirely. If our Oracle "sealed" claim rests on the weaker mechanism, we need to know before we publish anything — and the honest correction IS the publishable story.
3. Audience fit: senior engineers / infra engineers can disagree with our hardening choices while concluding the work was done. The output is a reproducible test matrix, not an opinion essay.
4. Internal value: directly sharpens the Oracle 7-day review (what "read-only" actually guarantees) without touching Oracle state.

## Research questions
- Q1: Does `ALTER ROLE r IN DATABASE d SET default_transaction_read_only = on` prevent role r from writing, or can r override the default per session / per transaction?
- Q2: Inside a read-only transaction, which write-class operations still succeed? (temp tables, advisory locks, LISTEN/NOTIFY, sequence nextval, COPY, SET, DDL)
- Q3: What minimal privilege configuration gives a NON-superuser role a genuinely append-only (or read-only) journal table, and what residual operations remain possible?
- Q4: Does our Oracle journal's deployed configuration (role `ping`, documented superuser, `default_transaction_read_only=on` in database `crx_runtime`) satisfy the Q3 bar? What is the precise residual risk, stated without euphemism?

## Claims to verify (predictions recorded; falsifiers named)
- C1: A non-superuser role with `default_transaction_read_only=on` cannot INSERT in a fresh session. PREDICTED: CONFIRMED. Falsifier: INSERT succeeds.
- C2: That same role regains write ability via `SET default_transaction_read_only = off` or `START TRANSACTION READ WRITE`. PREDICTED: CONFIRMED (the hole). Falsifier: override is rejected.
- C3: In a read-only transaction, `CREATE TEMP TABLE` succeeds (documented exemption). PREDICTED: CONFIRMED. Falsifier: it errors.
- C4: In a read-only transaction, `SELECT nextval('s')` fails. PREDICTED: CONFIRMED. Falsifier: it succeeds.
- C5: Session advisory locks and LISTEN/NOTIFY function inside read-only transactions. PREDICTED: UNKNOWN going in (no strong prior; will test both). Falsifier: either errors.
- C6: A SUPERUSER role bypasses `default_transaction_read_only` at will; the setting is a default, not a privilege boundary. PREDICTED: CONFIRMED. Falsifier: superuser override is rejected.
- C7: `REVOKE INSERT, UPDATE, DELETE, TRUNCATE` on the table from a non-superuser role blocks writes even in explicit READ WRITE transactions. PREDICTED: CONFIRMED. Falsifier: a write succeeds.
- C8: The Oracle journal's deployed setting matches the claimed `ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only = on`. Verification method: READ-ONLY inspection only (`pg_roles`/`pg_db_role_setting`); ZERO write attempts against Oracle. PREDICTED: CONFIRMED. Falsifier: the setting is absent or different.

## Evidence requirements (binding)
- Primary: experiment matrix on a disposable Postgres 16 container (thrown away after). Every trial records exact SQL + verbatim result.
- Primary: PostgreSQL 16 official documentation (transaction semantics, read-only restrictions, role defaults).
- Primary: read-only inspection of Oracle role configuration. No writes to Oracle, no writes to the live Pig journal beyond this mission's own events.
- Contradictory evidence: any trial contradicting a prediction is recorded as-is, never suppressed. A REFUTED prediction is a successful outcome of the mission.

## Out-of-scope (explicitly not claimed)
- Performance characteristics of read-only vs read-write.
- Whether other databases (MySQL, SQLite) behave the same.
- Any recommendation to change Oracle's deployment (that is the deployment-convergence lane's decision, with Nolan's authority).

## Residue homes (binding)
- ping_events: observations, claims, signals for this mission.
- ping_missions: this brief + findings + synthesis.
- knowledge_nodes/edges: findings and learnings (if the table exists on the Pig journal; verify first).
- No new stores. No new authorities.
