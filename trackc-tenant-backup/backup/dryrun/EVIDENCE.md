# Backup Contract Dry-Run Evidence — 2026-09-27 ~07:26 MDT (Track C)

Contract: backup/spec/backup-contract.md (contract v1)
Scripts: backup/scripts/{backup.sh,restore-verify.sh,prune.sh}
All local. No credentials, no cloud, no bucket. Provisioning HELD pending
Nolan's exact bucket/credential authority.

## Run 1 — backup
- Command: backup.sh --tenant demo-tenant --source dryrun-src --src <4-file tree>
- Result: BACKUP_OK
- Artifact: demo-tenant-20260927T132615Z-dryrun-src.tar.gz.enc (4581 bytes)
- plaintext_sha256=5d91d87676d960a67cfbd189d25a862e59c1783307ed9dc37dcbcd9c7b81be68
- ciphertext_sha256=70cfaec04db084816d479474b2f0a79caeb66986442c1303b8bc647e511dbe1b
- files=4 (per-file sha256 in manifest)

## Run 2 — restore-verify (positive)
- Result: RESTORE_PASS
- Gate 1 ciphertext digest: match
- Gate 2 plaintext digest: match
- Gate 3 plaintext size: match
- Gate 4 file-level: 4/4 files OK, no extras
- Gate 5 byte-level cmp of two independent decrypts: match
- diff -r source vs restored tree: IDENTICAL

## Run 3 — tampered artifact (negative)
- Flipped 1 byte at offset 100 of a copy.
- Result: RESTORE_FAIL at gate 1 — ciphertext digest mismatch. Fail-closed.

## Run 4 — wrong key (negative)
- Random wrong passphrase.
- Result: RESTORE_FAIL at gate 2 — decryption failed (Bad session key). Fail-closed.

## Run 5 — prune retention (scratch vault copy)
- Manifest-less orphan artifact: QUARANTINED (not deleted) — correct per contract.
- 40-day-old backup with --keep-n 0 --keep-days 30: flagged DELETE (dry-run) — correct.
- Real dry-run vault untouched.

## Verdict
Contract v1 is defined, implemented, and dry-run end to end INCLUDING a
restore that verified byte-level integrity against digest + manifest.
Fail-closed behavior proven on tamper and wrong-key paths.
BLOCKER (owner decision, NOT requested now): provisioning needs Nolan's
exact bucket/credential authority. Nothing further to do on backup until then.
