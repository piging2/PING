# Retention policy (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). Design-spec; the retention job does not exist yet.

## Nightly pg_dump lifecycle: 7 daily + 4 weekly
- Keep the 7 most recent daily dumps and the 4 most recent weekly dumps.
- The newest dump and the newest weekly are PROTECTED: premature deletion is
  impossible without an explicit --override flag plus a typed reason.

## Rules
1. Policy executes as typed, auditable deletions: every deletion is a typed
   RETENTION_DELETE event in the JSONL audit trail (operator, UTC time, artifact
   name, digest, reason).
2. Bytes actually freed: the job records df before and after; the freed bytes
   are in the audit entry.
3. Deletion event recorded with timestamp and scope (which lifecycle tier).
4. Retention schedule defined with numbers: 7 daily, 4 weekly, 12 monthly
   (qdrant snapshots: 7 daily + 4 weekly).
5. Premature deletion impossible without an explicit override (--override +
   typed reason + second-person rule for the protected set).
