# BLOCK 0–20 REPORT — RESEARCH EXCELLENCE (2026-09-30 ~15:05 MDT)

## Topic
**What does PostgreSQL read-only actually seal?**
Framing: "We sealed our audit journal with `default_transaction_read_only`. Here is the exact boundary of that claim."
Defense: primary evidence reachable today (disposable PG 16, official docs, read-only Oracle inspection); a real contradiction was plausible (and found); it fits the technical audience (reproducible matrix, disagreeable conclusions); it sharpens the Oracle 7-day review without touching Oracle state.

## Research questions (committed BEFORE research: commit 28c38d1)
Q1: Does `ALTER ROLE ... SET default_transaction_read_only=on` prevent writes, or can the role override it?
Q2: Which write-class operations still succeed inside a read-only transaction?
Q3: What minimal privilege config gives a non-superuser a genuine append-only/read-only table?
Q4: Does Oracle's deployed config satisfy the Q3 bar? Precise residual risk?

## Mission record
- Mission `93a79e48accd23e3`, INTELLIGENCE_RESEARCH, tenant ping-ops, status completed.
- Machinery (all pre-existing): merged-line `UnifiedEventRuntime` + `MissionRuntime` + `mission_labels.createLabeledMission` + `verdict_vocab.attachClaimVerdict`, against the live Pig journal (brain-postgres / ping_runtime). Bounded wiring only.
- Residue: ping_missions (brief + synthesis), ping_events (3 OBSERVATION_CREATED + 8 CLAIM_CREATED, all correlation_id = mission), knowledge_nodes (9: 8 findings + 1 learning, namespace marketingos::block0-20), knowledge_edges (8, findings -> learning supports).
- Drivers + trial SQL: `drivers/` in this directory.

## Findings
- C1 CONFIRMED: non-superuser, read-only default, fresh session: INSERT -> ERROR: cannot execute INSERT in a read-only transaction. (T1)
- C2 CONFIRMED: SET default_transaction_read_only=off or START TRANSACTION READ WRITE restores writes. It is a default, not a boundary. (T2, T3; PG16 docs)
- C3 REFUTED as worded: CREATE TEMP TABLE FAILS in a read-only transaction (ERROR: cannot execute CREATE TABLE in a read-only transaction). Refined truth: DML on an already-existing temp table IS allowed read-only (INSERT + COPY FROM verified, T11). Docs confirm: COPY FROM exempt only "if the table they would write to is not a temporary table"; CREATE categorically disallowed. (T4, T11)
- C4 CONFIRMED: SELECT nextval(seq) -> ERROR in read-only transactions. (T5)
- C5 CONFIRMED: pg_advisory_lock/unlock and LISTEN/NOTIFY function normally in read-only transactions. (T6, T7)
- C6 CONFIRMED: superuser is bound by the default in a fresh session but bypasses it at will via SET. (T9a, T9b)
- C7 CONFIRMED: REVOKE INSERT/UPDATE/DELETE/TRUNCATE on a non-superuser blocks writes even under explicit READ WRITE. Privilege revocation is a real boundary. (T10)
- C8 CONFIRMED: Oracle (ping-core-01) matches the claimed config exactly, verified read-only: role ping IS superuser; pg_db_role_setting = crx_runtime|ping|{default_transaction_read_only=on}; fresh session SHOW = on; journal sealed at 2557 rows; triggers trg_ping_events_append_only + _truncate present. Zero write attempts against Oracle.

## Contradictory evidence (recorded, not suppressed)
- K1: prior belief + a secondary source ("operations on temporary tables are permitted in read-only transactions") vs T4. Resolution: exemption is DML-only on existing temp tables. The secondary source was overbroad.
- K2 (internal): retirement doc's "read-only enforced at the database boundary... binds even superusers" vs T9b. Resolution: the doc itself scopes this to the app's connection pattern (app never issues SET/START TRANSACTION). No doc rewrite proposed here; recorded as U1 for the deployment-convergence lane.

## Unresolved-question set (automatic)
- U1: Does the Oracle gateway app code ever issue SET / START TRANSACTION? (the one unverified link in the seal chain; code inspection of image candidate-3c5d280dd)
- U2: Do the Oracle append-only triggers actually block UPDATE/DELETE? (testable on disposable PG; Oracle write attempts out of scope)
- U3: Experiments on PG 16; Oracle runs PG 17 (docs indicate parity; not directly trialed)
- U4: Any pooler/proxy resetting session defaults between gateway and PG?
- U5: Full extent of "high-level read-only does not prevent all writes to disk" beyond tested ops.

## Wired vs pre-existing
- WIRED: two throwaway driver scripts (mission create; observations/claims/knowledge/complete), trial SQL files, Oracle read-only inspection script. Disposable PG 16 container (destroyed after).
- PRE-EXISTING (untouched): MissionRuntime, UnifiedEventRuntime, mission_labels, verdict_vocab, ping_events/ping_missions/knowledge_nodes/knowledge_edges schemas, ClaimMissionChainer/ContradictionDetector behaviors.
- NOT created: no MarketingDB, ContentBrain, ResearchTruthStore, or any new authority/store. No pushes.

## Commits (this block)
- 28c38d1: research brief (before research)
- (drivers + this report: commit follows)

## Readiness for block 20–40 (editorial judgment)
READY. The findings are verdict-tagged, evidence-linked, and contain genuine editorial tension: the honest headline ("your read-only seal is a default plus app discipline, not a privilege boundary") is exactly the kind of claim a skeptical senior engineer can argue with while respecting the work. Contradictions K1/K2 give the falsifier lane real material. U1 is the natural next research mission if block 20–40 wants a deeper cut before scripting. Recommended theses for 20–40 can be built directly from C2/C3/C6/C8 without further research.
