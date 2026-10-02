# Provider-Neutral Backup Contract — TRACK C (2026-09-27)

Status: CONTRACT DEFINED, REFERENCE IMPLEMENTATION DRY-RUN LOCALLY.
PROVISIONING HELD: no bucket, no credentials, no cloud upload until Nolan
gives exact bucket/credential authority. This contract runs against a local
vault directory today and any object store tomorrow without changing the
artifact format.

## 1. Artifact

- Source tree is archived with `tar` (no absolute paths, owner/group
  normalized, mtime clamped for determinism where supported).
- Compressed with gzip.
- Encrypted with an AEAD cipher: AES-256 (GCM or equivalent via the
  reference implementation's gpg --symmetric --cipher-algo AES256).
- Artifact name: `<tenant>-<utc-ts>-<source-id>.tar.gz.enc`
  (`utc-ts` = YYYYMMDDTHHMMSSZ).
- The encryption key is supplied by the operator at backup time (env var
  or file descriptor). The key is NEVER stored with the artifact, NEVER
  committed, NEVER logged.

## 2. Digest

Two SHA-256 digests are recorded, never inferred:
- `plaintext_sha256`: digest of the compressed tar.gz BEFORE encryption.
- `ciphertext_sha256`: digest of the final encrypted artifact.
- Per-file: every file in the source tree gets `{path, size_bytes,
  sha256}` so restore can verify at file granularity.

## 3. Manifest

A JSON sidecar `<artifact>.manifest.json`, written atomically next to the
artifact. Schema (contract v1):

```json
{
  "contract_version": "backup-contract/1",
  "tenant": "<tenant id>",
  "source_id": "<logical source, e.g. worktree path or service name>",
  "source_git_sha": "<git sha or 'none'>",
  "created_at_utc": "<RFC3339 UTC>",
  "artifact": "<artifact filename>",
  "plaintext_sha256": "<hex>",
  "ciphertext_sha256": "<hex>",
  "plaintext_size_bytes": 0,
  "ciphertext_size_bytes": 0,
  "encryption": {"scheme": "gpg-symmetric", "cipher": "AES256"},
  "files": [{"path": "<rel path>", "size_bytes": 0, "sha256": "<hex>"}],
  "retention": {"keep_last_n": 10, "keep_days": 30},
  "restore_command": "./restore-verify.sh <artifact> <manifest> <keyfile> <destdir>"
}
```

The manifest is the restore authority. A restore that does not validate
against the manifest is not a restore, it is an extraction.

## 4. Timestamp

`created_at_utc` is RFC3339 UTC, recorded at backup time from the local
clock. Artifact filenames embed the same timestamp. No timezone ambiguity.

## 5. Source identity

`tenant` + `source_id` + `source_git_sha` bind the artifact to what was
backed up. A backup that cannot say what it is a backup of is an archive
hypothesis, not a backup.

## 6. Retention policy

Declared in the manifest (`keep_last_n`, `keep_days`), enforced by
`prune.sh --vault <dir> [--dry-run]`:
- Sort backups by `created_at_utc` (manifest), newest first.
- Keep the newest `keep_last_n`.
- Of the rest, delete only artifacts older than `keep_days`.
- A backup without a manifest is quarantined, never pruned blindly:
  it is moved to `quarantine/` for human review.
- Prune never deletes the manifest without its artifact or vice versa.

## 7. Restore verification (the actual contract)

`restore-verify.sh` performs, in order, and FAILS CLOSED on any mismatch:
1. Verify `ciphertext_sha256` of the artifact against the manifest.
2. Decrypt with the operator-supplied key (to a temp dir, never the vault).
3. Verify `plaintext_sha256` of the decrypted bytes against the manifest.
4. Extract and verify EVERY file: path, size, sha256 against `files[]`.
5. Byte-level `diff -r` of the restored tree against a re-extraction is
   implied by per-file digest equality; the script additionally runs
   `cmp` on the full decrypted payload as a belt-and-suspenders check.
6. Report PASS with all digests, or FAIL with the first mismatch and stop.

A backup is COMPLETE only when a restore-verify run against it reports
PASS. An untested artifact is an archive hypothesis.

## 8. Provider neutrality

The contract references only: a vault directory, the artifact, the
manifest. Moving to S3/GCS/R2 later means syncing vault contents; the
contract, manifest schema, and verification procedure do not change.
No provider SDK is imported by the reference implementation.
