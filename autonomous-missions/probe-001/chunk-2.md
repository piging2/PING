# Chunk 2: Five ADAPT mechanisms

All five carry the ADAPT verdict in mechanisms.jsonl.

1. O-1 (orca-cli/orca): Durable run row in SQLite (UUIDv7 id, typed status, prompt, worktree path, timestamps, single writer, WAL mode) gives the replacement worker a canonical, queryable home for an attempt's existence and lifecycle.

2. oa-runstate-durable-snapshot (openai/openai-agents-python): RunState.to_json() serializes original input, generated items, model responses, turn counters, usage, and approvals into durable storage so a replacement worker resumes mid-run without losing approvals, invocation records, or trace continuity.

3. LANGGRAPH-CHECKPOINT (langchain-ai/langgraph): versioned, monotonically-increasing checkpoint records carrying per-channel state snapshots, channel versions, and pending writes let the replacement worker restore exact state and even time-travel or branch from a prior point.

4. DBOS-ATOMIC-RECOVERY (dbos-inc/dbos-transact-py): recovery re-enqueues rather than executes directly so every recovered workflow re-enters through an atomic queue transition, guaranteeing exactly-once revival even when several executors race to recover.

5. DBOS-STEP-RECORDING (dbos-inc/dbos-transact-py): every completed step is recorded in the system DB as it completes, so a replacement worker replays only what is missing and never duplicates a side effect whose report was lost in a crash.

Chosen for direct relevance to the worker-replacement reconstruction invariant (chunk-3); each was verified ADAPT in the source file.
