# E5 failure-class findings (2026-09-24)

One process-level failure class discovered during verification; no diff defects
qualified as new failure classes for the wave ledger (both diffs were clean).

## FL-E5-001: scp `pigwsl:/tmp/` lands on the Windows side, not WSL /tmp

**Symptom.** `scp -F ~/.ssh/pig-config <local> pigwsl:/tmp/<name>` reported
success, but `pigwsl-run.sh 'ls /tmp/<name>'` found nothing, and
`git apply --check` failed with "can't open patch".

**Root cause.** The `pigwsl` SSH target terminates at the Windows OpenSSH
server as user `nolan`; sftp's `/tmp/` resolves to a Windows path (observed:
`C:\tmp`, visible from WSL at `/mnt/c/tmp`), while `pigwsl-run.sh` executes
inside WSL (`wsl -- bash`), which sees a different `/tmp`.

**Recovery (verified).** From the WSL side, copy the file across the mount
boundary, then checksum-verify:
`pigwsl-run.sh 'cp /mnt/c/tmp/<name> /tmp/ && sha256sum /tmp/<name>'`
and compare against the local sha256. Both diffs transferred byte-identical
this way (a284117d... / 549ab935...).

**Invariant for future workers.** Never assume the scp target path and the
WSL-visible path are the same filesystem when the SSH endpoint is the Windows
host. Always sha256-verify after transfer and check the file from the same
side that will consume it. Dead ends to not retry: piping a large base64 blob
through `pigwsl-run.sh` as a single command argument ("exec request failed on
channel 0" at ~74KB arg size); streaming multi-MB files via pigwsl-put.sh
(per AGENTS.md, use the scp + cp + sha256 path).

## Diff-defect scan result (no new failure classes)

- P-20260923-093: no defects found. Noted only as integrator guidance:
  `grantedTo` role grants are recorded but not enforced by `dispatch()`
  (server-side remains the grant enforcer; 007's auth_boundary will own the
  role dimension).
- P-20260923-094: no defects found. Noted as integrator guidance:
  (1) tests use node:test and live outside the scoped jest testMatch, so the
  wave's jest gate will not run them; (2) `.ts`-extension imports resolve only
  under Node type-stripping, not ts-jest/CommonJS; (3) doubled directory
  `verification/verification/` is cosmetic; (4) one unreachable
  FRESHNESS_BOUND_KINDS branch (harmless dead code); (5) no-op+allowEmpty
  certifies 1.0 confidence on zero evidence.
