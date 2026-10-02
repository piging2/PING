# Agent Artifact Contract — builder lanes

Every builder-lane agent invocation carries this envelope (in the spawn message). Every completion is graded against the status vocabulary. No "healthy" or "done" without proof.

## Invocation envelope

```text
task_id:        <uuid or lane-scoped id>
tenant_id:      fyd-platform | <siteId> for site-scoped work
actor_id:       builder-coordinator | <lane>
capabilities:   e.g. repo-read, repo-write:src/fyd/archetypes/**, no-push, no-secrets
input_snapshot_id / input_digest: contract version + repo HEAD the task was briefed against
task_type:      harvest | implement | test | proof | contract
deadline:       shift-bounded; checkpointed, resumable
resource_budget: bounded (e.g. "one branch, <6000-char bridge scripts, own :3101 server")
tool_allowlist: pigwsl-run.sh bridge, workspace writes under fyd-lane/builder/**, jest, tsc
output_schema:  what the final report must contain (commit SHA, test results, 9-field cards, ...)
evidence_refs:  files/commits the output must cite
policy_version: crx-doctrine v1 (CRX-DOCTRINE.md)
```

Tool risk classes (from the directive) apply to every tool the agent is granted:
READ < DRAFT < REVERSIBLE_MUTATION < EXTERNAL_EFFECT < PRIVILEGED.
Builder agents get READ + DRAFT + REVERSIBLE_MUTATION (local commits). EXTERNAL_EFFECT (push, deploy, publish) and PRIVILEGED (credentials, auth) are never granted; they stay Nolan-gated.

Secret boundary: agents see capability handles, never raw secrets. No credentials in repos, logs, prompts, or reports.

## Output contract

```text
result_id, status, typed_payload, claims, evidence_refs, unknowns, warnings,
requested_actions, artifact_digest, model metadata, started_at, completed_at
```

Status is exactly one of: SUCCEEDED / PARTIAL / FAILED / REJECTED / OUTCOME_UNKNOWN.

- SUCCEEDED: all acceptance criteria met with cited evidence.
- PARTIAL: some criteria met; the report names exactly which and what is missing.
- FAILED: the work did not achieve its objective; evidence of failure preserved.
- REJECTED: the task was refused on policy grounds (missing capability, unsafe input); reason cited.
- OUTCOME_UNKNOWN: attempted but unobserved; never collapsed to success.

## Coordinator single-writer rule

Parallelize only when tasks do not write the same semantic unit. Single writer per: tenant, site spec version, object revision, owner patch, render version, deployment target, repo branch. Read-only work parallelizes freely; any write needs an exclusive unit.
