# LANE 14 raw notes: donor unit-of-work field structures (read 2026-09-28)

## MatrixClaw (internal/externalagents/agent.go, pinned SHA 83fa297162338d31c99e70cf4547e60a227f8b4e)
RuntimeAgent interface: ID, DisplayName, Available, StartSession, ResumeSession, Send, Interrupt, Close.
StartSessionRequest: CWD, Model, ApprovalPolicy, Sandbox, BaseInstructions, DeveloperInstructions, Metadata.
ExternalSession: AgentID, ExternalThreadID, ExternalSessionID, CWD, Model, ApprovalPolicy, Sandbox, Metadata.
Input: Text. EventKind: turn.started, message.delta, reasoning.delta, tool.started, tool.output.delta,
tool.completed, diff.updated, turn.completed, turn.failed.
Event: Kind, AgentID, ExternalThreadID, ExternalSessionID, ExternalTurnID, ItemID, ToolName, ToolInput,
Text, Error, RawMethod, Raw, At.
Capabilities: StartSession, ResumeSession, StreamingEvents, ToolEvents, Interrupt, ConfigurablePath (booleans).
Selection: normalizeSubagentRuntime maps runtime string; "auto" -> native matrixclaw (subagents_presentation.go).
Interrupt: declared, unimplemented on both adapters; dispatcher swallows error (external_agent_execution.go:424).
External children default: defaultApprovalPolicy="never", defaultSandbox="danger-full-access" (codexapp/runtime.go:33-34).

## MyAgens (src/core/tasks.ts, src/mcp/crew.ts; pinned SHA 7068fbf2764a515b85235f71b38e1e8e5632f73d)
TaskDelegation: status queued|running|ok|error|stopped, runId, startedAt, endedAt?, error?, output? (capped tail),
sessionId? (Claude resume token; kept across failure, cleared on done).
Task: id, title, notes, column, priority, parentId?, blockedBy?, delegate?, retryCount?, resumeSessionId?
(consumed exactly once by task runner), order, createdBy, createdAt, updatedAt.
TaskRunConfig: timeoutMs (default 1_800_000), maxConcurrent (default 3).
delegatedPermissionMode (crew.ts:72): callerAutonomy full|auto_until_error -> "bypassPermissions", else "default"
with canUseTool gate (AUTO_ALLOWED_TOOLS). Computed by framework, never worker-declared.
FallbackSpec: backendId?, providerId?, model?; runTurnWithFallback retries ONCE on usage-limit/silent-crash only;
drops resume token on backend change ("resume handle is meaningless on a different backend's CLI");
auth failures and watchdog aborts never fail over.

## Goated (internal/subagent/run.go; pinned SHA 39d94b98de0d39967ecd08be2514d87d1f3b1d43)
Unit of work = generated shell wrapper: wait on gate file; run command; capture $?;
subagent-finish --status <ok|error> --run-id <run_id>; rm -f wrapper, gate, run-id file.
No typed work record. run_id read from temp file into shell var; no binding between finishing process and run id.
HealthStatus{OK, Recoverable, Summary}: healthFromSnapshot classifies pane-tail text vs cached headless auth probe;
three-way verdict (ok / non-recoverable / recoverable-will-retry). ensureHealthySession: maxSessionRetries=5,
one restart per minute; non-recoverable -> zero restarts, immediate manual-intervention.
Bounds: 500MB log cap (sizeWatchWriter), 45s daemon send timeout / 90s client deadline, cron 1h timeout
skip-if-in-flight, stuck helpers >600s reaped by 2-minute cron watchdog.
