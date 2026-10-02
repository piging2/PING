# Release Manifest: candidate a9cad2663

Candidate release record for the PING gateway Oracle deploy lane.
This record is SHA-pinned: every field below refers to the exact source
revision named in SOURCE_SHA, not to any branch tip.

## Identity

- SOURCE_SHA: a9cad266353679a90e54b318100efb8153ea988e
- MERGED_BRANCH: constitutional-convergence-v2 (repo https://github.com/ngesk2/crx-runtime.git)
- RELEASE_ID: ping-gateway-rc-a9cad2663-20260920
- ARCHITECTURE: linux/arm64
- BUILD_TIMESTAMP: 2026-09-20 ~09:35 MDT (provenance only; not part of any identity hash)

## Distribution

- DISTRIBUTION_MANIFEST_DIGEST: e21a0d4faa18a9bcbb97b29b3fe7262e6e1d48025062d9770155c26be6c7ced4
- Manifest entries: 2160 files (node_modules and .git excluded from content listing)
- node_modules: present at snapshot root (production `npm ci --only=production` from the
  locked package-lock; 360 packages; mirrors Dockerfile.gateway /app layout)
- package-lock digest: ad0f643a8daa332eeb50dd6aff9ff7cbc88e7e96f99cc2ec4fa23695498de714
- Snapshot construction (honest record): `git archive a9cad2663` + repo .dockerignore
  applied (excludes the three credential-bearing .env files, tests/, docs) + root
  node_modules installed. See CERTIFICATION-NOTES.md.

## Image

- IMAGE_DIGEST: PENDING_DEPLOY_LANE
  The image has NOT been built yet. The deploy lane builds it and records the real
  digest here (amending this record or a successor record; never rewriting history).
- Rollback image (record-keeping only; NOT modified by this lane):
  - ROLLBACK_IMAGE: 8400deecf2a9
  - Full digest: sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5
  - Tags: oracle-gateway:rollback-20260919, oracle-gateway:latest, oracle-gateway:certified-20260919

## Migration set

- MIGRATION_SET: uer.ensureSchema.sequence-addition (UnifiedEventRuntime.ensureSchema,
  source file ping-runtime/events/unified_event_runtime.js)
- 18 statements scanned, 0 TRIGGER_SUSPECT, fixture PASS (see fixture-adapter.json)
- SCHEMA_EXPECTATION:
  - ping_events.sequence BIGINT NULLABLE DEFAULT nextval('ping_events_sequence_seq')
  - legacy rows keep NULL sequence (explicit unknown-ordering semantics; no backfill)
  - append-only enforcement intact: trg_ping_events_append_only (BEFORE DELETE OR UPDATE),
    trg_ping_events_append_only_truncate (BEFORE TRUNCATE), function
    public.ping_events_no_mutation() raises unconditionally, no maintenance exception path
  - Oracle actual state per 2026-09-19 forensics: 2510 rows (41 sequenced via default,
    2469 NULL legacy); the corrected migration is idempotent against this state

## Test manifest

Every gate Lane F ran on this candidate, with exact counts: see TEST-MANIFEST.md.
Summary: release-certify.js 8/8 PASS (verdict CERTIFIED); migration cert 50/50;
CE-001 45/45; CE-002 46/46; volatile dedup 25/25; UER collision cert 15/15;
sequence replay 64 pass / 6 fail (known pre-existing T1 class FL-20260919-014) / 1 blocked;
EVAL-006 10/10; runtime identity FL-004 13/13; bridge integration 49/49;
auth mount contract 4/4; auth middleware 10/10; security negatives 0 findings.

## Certification verdict

CERTIFICATION_PASS for candidate a9cad266353679a90e54b318100efb8153ea988e.
Deployment-phase gates (container build, candidate startup, readiness, canonical event
write, dedup, mission path, worker result path, restart, post-restart read, rollback
proof, provenance labels) are NOT_RUN and belong to the deploy lane on the target plane.
Nothing deploys unless the deploy lane completes them.

## Provenance design (non-secret)

- IMPLEMENTED NOW: release-certify.js records deploymentGateNotes.provenanceLabels as a
  REQUIREMENT on the deploy lane: every PING image must carry
  org.opencontainers.image.revision=<git SHA>,
  org.opencontainers.image.source=<repository>,
  org.opencontainers.image.created=<build timestamp>, and a /health or build-info
  surface must expose non-secret source_sha / image identity / runtime version.
  This closes the baseline gap (the certified rollback image was built from a non-git
  tarball with no labels, forcing forensic SHA reconstruction).
- FOLLOW-UP (deploy lane): implement the labels at `docker build` time (--label),
  verify via `docker inspect`, record the real IMAGE_DIGEST in this record's successor,
  and prove the /health (or build-info) surface returns the non-secret source SHA.
