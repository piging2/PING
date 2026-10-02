# OWNER DECISIONS (2026-09-30 ~12:52 MDT, Nolan, binding)

Dispatched to the deployment execution lane. These decisions remove the schema/backfill
ambiguity. They DO NOT authorize a blind deployment. Deployment gate must be re-run
against current live state. Merged line remains: LOCAL MERGE != BUILT != DEPLOYED != SERVED.

## 1. JOURNAL SCHEMA

APPROVED: COALESCE READ PATH + DEFAULT UNKNOWN FOR FUTURE WRITES.

DO NOT backfill canonical append-only events merely to populate a field
that historical writers did not record.
Historical absence means: UNKNOWN. Preserve that truth.
If an old value can later be derived deterministically from immutable
evidence, derive it in a projection/read model.
DO NOT mutate history to manufacture certainty.
No trigger-disabling UPDATE.
No maintenance-window backfill currently authorized.

Rationale (Nolan): Do not mutate the append-only journal just to make historical rows
look newer. PostgreSQL defaults apply naturally to future writes, and a constant default
can be added without rewriting every existing row; changing a default also does not
retroactively alter existing rows. Treat historical absence honestly as UNKNOWN. If later
we can deterministically derive a value from immutable historical evidence, do that in a
rebuildable projection, not by rewriting canonical history.

Prove:
- old events read correctly through compatibility path
- new events persist explicit/default value correctly
- replay remains deterministic
- journal digest/integrity unchanged
- current writers/readers remain compatible.

## 2. ORACLE JOURNAL

RETIRE ORACLE AS AN ACTIVE CANONICAL WRITER.
DO NOT RESYNC IT INTO A SECOND LIVE JOURNAL.
Pig is the current demonstrated live plane.

Oracle becomes: READ-ONLY HISTORICAL / ROLLBACK EVIDENCE
until an explicit archival/retention decision removes that need.

Requirements:
- disable/stop canonical writes to Oracle
- do not delete its journal
- do not rewrite its journal
- label the plane RETIRED/READ-ONLY unmistakably
- remove it from normal writer/service discovery
- ensure health dashboards cannot imply Oracle is current authority
- document its final sequence/count/digest/state
- preserve a bounded forensic read path.

THE RULE: ONE LIVE CANONICAL JOURNAL.
We do not create active-active ambiguity accidentally.

Rationale (Nolan): redundant compute is useful; redundant authority is dangerous.
If later HA is needed, design explicit replication/failover around one authority model.
Don't achieve "resilience" by leaving two divergent journals capable of claiming truth.

## 3. PRODUCT FOCUS

After these operational decisions are applied: RETURN TO FYD.
Do not reopen architecture exploration merely because the integration program passed.
The important chain now is:
PUBLIC/OWNER SOURCE -> OBSERVATION -> EVIDENCE -> OBJECT GRAPH -> GENERATED EXPERIENCE
-> ASK FYD -> OWNER INTENT -> PROPOSED CHANGE -> APPROVAL WHEN CONSEQUENCE REQUIRES IT
-> OUTCOME -> LEARNING.
PING exists to make that chain trustworthy and extensible. FYD exists to make it useful.
GO.
