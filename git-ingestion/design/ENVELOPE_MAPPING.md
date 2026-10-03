# Envelope Mapping: git objects to PING source envelope

The envelope is the handoff document between connector and compiler.
Field names mirror
`compiler-aggregator-foundation:integration/envelope/src/envelope.ts`
exactly. This document maps each git object kind onto those fields and
explains the identity and versioning choices.

## Mapping table

| Envelope field | Commit observation | Ref observation | Repo-level event (quarantine / stale) |
|---|---|---|---|
| `sourceSystem` | `"git"` | `"git"` | `"git"` |
| `sourceAccount` | repo id (tenant-scoped connection reference) | repo id | repo id |
| `sourceObjectType` | `"commit"` | `"ref"` | `"repo"` |
| `sourceObjectId` | commit sha (hex) | ref name, e.g. `refs/heads/main` | repo id |
| `sourceVersion` | commit sha (hex) | ref target sha **at snapshot time** | `quarantined:<code>` / `"stale"` |
| `observedAt` | packet start (ISO-8601) | packet start | packet start |
| `ingestedAt` | envelope build time | envelope build time | envelope build time |
| `principal` | `ping-git-ingest` | `ping-git-ingest` | `ping-git-ingest` |
| `namespace` | `core::git` | `core::git` | `core::git` |
| `rawPayloadHash` | sha256 of the verbatim commit object bytes (via ODB read) | sha256 of `refname + NUL + target-sha` | sha256 of the canonical quarantine/moved-ref JSON |
| `sourceIdentity` | `sha256hex("git-ingest\|repo:<id>\|<sha>\|<sha>")` | `sha256hex("git-ingest\|repo:<id>\|<refname>\|<target-sha>")` | `sha256hex("git-ingest\|repo:<id>\|<repo-id>\|quarantined:<code>")` |
| `cursor` | omitted in v1 | omitted in v1 | omitted in v1 |

## Why the commit sha is both object id and version

Git objects are content-addressed: the sha IS the bytes. Two fetches of
the same sha return the same bytes by construction, so
`sourceObjectId == sourceVersion == sha` is not a shortcut, it is the
identity semantics of the underlying store:

- `sourceIdentity` answers "is this the same record version?" A commit
  sha seen twice yields the same identity, so re-ingestion is a safe
  downstream no-op (dedupe).
- `rawPayloadHash` answers "did the bytes change?" For commits it is
  the sha256 of the verbatim object bytes, an independent check that
  the object database served what the sha promises (drift/tamper
  detection distinct from dedupe).
- A force-push does not "edit" a commit; it moves a ref to a different
  sha, which is a new record version by definition. History rewrites
  therefore surface as new identities, never as silent mutations.

Tags (annotated) map like commits: `sourceObjectType` `"tag"`,
object id and version both the tag object's sha. Lightweight tags are
refs, not objects, and are covered by the ref mapping.

## Ref versioning via snapshot

A ref name is stable but its target moves; the name alone cannot
version a record. The version is therefore the target sha **captured in
the packet's start snapshot** (`ref_snapshot`). Consequences:

- The same ref observed at two different target shas yields two
  distinct `sourceIdentity` values: ref movement is visible as new
  record versions, which is what lets downstream track branch-tip
  evolution without re-reading history.
- The snapshot/end-snapshot pair in the packet lets any consumer
  detect the T-07 race independently: if `ref_snapshot_end` disagrees
  with `ref_snapshot` on a walked ref, the packet is `STALE` and its
  observations were discarded.
- `HEAD` is recorded as `head_target` on the snapshot, never merged
  into branch identity (T-12): the default branch is a symbolic
  pointer, not a branch.

## Wire nesting

A packet observation carries `{envelope, eventType, payload,
logicalId, confidence, lifecycleStage}`. `ingest_client`
builds the `/ingest` wire body as:

```json
{
  "source": "git-ingest",
  "eventType": "GIT_COMMIT_OBSERVED",
  "payload": {
    "envelope": { "...envelope fields..." },
    "observation": { "...commit/ref fields..." },
    "principal": "ping-git-ingest"
  },
  "namespace": "core::git",
  "logicalId": "<sourceIdentity>"
}
```

`logicalId = sourceIdentity`, so gateway-side dedupe
(`ON CONFLICT DO NOTHING` semantics) keys on the same canonical
identity the envelope defines. Re-emitting a packet is idempotent.
