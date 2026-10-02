# Oracle Artifact Classification (Lane C, design only, no Oracle mutation)

**Nolan's binding correction:** NOT "everything must be in Oracle". Every
artifact required to reproduce, certify, operate, recover, or explain the
Oracle release must either be deployed on Oracle in its proper role OR be
represented by an immutable manifest/digest with a proven recovery source.
Oracle is never a junk drawer.

**Classes:** RUNTIME_REQUIRED, RELEASE_REQUIRED, RECOVERY_REQUIRED,
OPERATIONS_REQUIRED, HISTORICAL_EVIDENCE, DERIVED_REBUILDABLE, DEV_ONLY,
CACHE, UNKNOWN. UNKNOWN is never deployed and never referenced; it must be
classified before the release certifies.

## Current Oracle deployment design (gateway, ping-core-01)

### On Oracle: RUNTIME_REQUIRED

These are the only artifacts the running system needs. Anything here that is
not needed at runtime is a classification defect.

| Artifact | Role | Recovery source |
|----------|------|-----------------|
| Container image `oracle-gateway:<release>` (linux/arm64) | The certified runtime closure | Rebuildable from the release's distribution manifest digest + source SHA (release artifact); rollback image retained per RECOVERY_REQUIRED |
| `infrastructure/oracle/docker-compose.oracle.yml` | Container topology, restart policy, network | Git (worktree, committed) |
| `runtime-manifest.json` (when the distribution milestone lands) | Runtime allowlist; build fails on out-of-distribution imports | Git, committed; digest in release artifact |
| Startup migrations (UER ensureSchema + migration engine units) | Schema convergence at boot | Git, committed; per-statement digests in release artifact |
| Secrets via environment / Docker secrets | Credentials | Operator secret store; NEVER files in the image (security-negatives gate) |
| `trigger-policy.oracle-canonical.json` (mirror) | Declared enforcement boundary the migrations must respect | Git, committed; digest in release artifact and in Lane A's fixture result |

### Manifest-referenced (NOT on Oracle as files; immutable digest + proven recovery source)

| Artifact | Class | Lives | Recovery source |
|----------|-------|-------|-----------------|
| Release certification artifact (`release-certification.json`, pre-promotion + post-runtime-proof) | RELEASE_REQUIRED | Artifact store (operator-designated; content-addressed by digest) | Re-emittable: deterministic gates over source SHA + snapshot manifest digest |
| Distribution manifest (path -> sha256) | RELEASE_REQUIRED | Alongside the release artifact | Recomputable from the snapshot; digest in artifact |
| Rollback image `oracle-gateway:rollback-<date>` | RECOVERY_REQUIRED | Oracle image store (retained, tagged) | Digest recorded in the release artifact BEFORE the swap (gate 17 ordering) |
| Genesis operator decision record | RECOVERY_REQUIRED | Outside the DB (standing durability decision) | Operator archive |
| DB backup references (pg_basebackup / WAL) | RECOVERY_REQUIRED | Backup target | Backup runbook |
| `capture-evidence.sh` outputs, incident runbooks | OPERATIONS_REQUIRED | Operations archive | Git (`docs/incident-response/`) |
| Failed deploy images (`oracle-gateway:refactor-bb63da5`, `oracle-gateway:refactor-395b9759`) | HISTORICAL_EVIDENCE | Oracle image store, retained for forensics, never run | Digests in FL-20260919-ORACLE-006/008 |
| Generated registries (`gateway/generated/*.json`) | DERIVED_REBUILDABLE | Rebuilt by generators; shipped copies are REQUIRED_RUNTIME only because two are load-fatal (see tools/distribution/README.md) | Generator inputs in Git |
| Projections, embeddings, indexes | DERIVED_REBUILDABLE | Rebuilt from canonical event history | `ping_events` (canonical journal) |
| Tests, fixtures, docs source, evals | DEV_ONLY | Git only; excluded from the image by .dockerignore | Git |
| npm cache, image build layers | CACHE | Builder-local, ephemeral | Rebuildable |
| The append-only trigger definitions on `ping_events` | RECOVERY_REQUIRED + OPERATIONS_REQUIRED | **GAP:** exist only on Oracle, in no repository, no named owner | Provenance: FL-20260919-ORACLE-008. Until the trigger DDL is committed to Git with an owner, the `trigger-policy.oracle-canonical.json` mirror is the checked-in declaration and any policy change without a mirror update is a release defect |

### Explicitly NOT on Oracle

- Source history (.git), audit documents, certification narratives, backlog,
  marketing content, the convergence worktree itself. These are
  HISTORICAL_EVIDENCE / DEV_ONLY and live in Git. Copying them into the
  runtime host would make Oracle the junk drawer the correction forbids.

## Open classification defects (design findings, not mutations)

1. **Trigger DDL unowned:** the `ping_events` append-only trigger has no
   repository definition and no named owner (beyond-backlog audit
   meta-finding). The mirror document + fixture digest chain is the interim
   control; the durable fix is committing the trigger DDL with an owner and
   a migration exception path. This is a convergence-lane decision, routed
   via GRILLING-BRIEF.md if Nolan must rule on the exception path.
2. **Dockerfile drift:** `infrastructure/oracle/Dockerfile.gateway` declares
   `node:18-alpine` while the deploy used `node:20-alpine`; the arm64-compat
   gate fails the mismatch by design. The deploy lane must reconcile the
   checked-in Dockerfile with the actual build toolchain.
3. **Release artifact store:** no operator-designated content-addressed
   store exists yet for release artifacts; digests are currently recorded in
   Git and the failure ledger. The store is OPERATIONS_REQUIRED.

## Rule for future artifacts

Before any new artifact is added to the Oracle host, it is classified into
exactly one class above, with its recovery source named. Unclassified
artifacts are UNKNOWN and block the release. "Get rid of artifacts" means
exclude from the distribution, never delete from Git.
