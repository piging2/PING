# OFF-HOST BACKUP DESTINATION BRIEF
## Ops lane, mandate item 1A, 2026-09-24

Status: DISCOVERY + PREPARATION. Nothing was copied off any host. No destinations
were created. No credentials were created, listed, or echoed. All host access was
read-only reconnaissance.

## 1. What the 2026-09-24 baseline proved (and what it did not)

Proved: local Postgres backup (daily 03:30 UTC via `pg-backup.timer`), local Qdrant
snapshot (daily 04:00 UTC via `qdrant-snapshot.timer`), 7-day local retention,
isolated restore drill (Postgres RTO 7s in the verified drill).

Not proved: host loss. Both backup stores live on ping-core-01's single 45G ext4
root volume. If the host is lost, both copies are lost together. That is the
residual risk this brief closes the preparation for.

## 2. Recon findings (read-only, 2026-09-24)

### ping-core-01 (ubuntu, via oracle-ssh.sh)
- No transfer tooling installed: `rclone`, `restic`, `s3cmd`, `aws`, `oci`,
  `duplicity` all absent from PATH.
- No cloud config dirs: no `~/.oci`, no `~/.aws`, no `~/.config/rclone`,
  no `~/.config/gcloud`.
- No mounted network volumes. Single local disk: 45G total, 20G used, 25G free.
- No user crontab. Backups run as systemd timers: `pg-backup.timer` (next
  03:35 UTC) and `qdrant-snapshot.timer` (next 04:01 UTC).
- No environment or config hints pointing at any remote destination
  (grep of docker-compose.yml and .env files for S3/BUCKET/OBJECT/REMOTE
  key names returned nothing).
- No ssh host aliases configured on the host.
- Encryption tooling present: `gpg`, `openssl`, `curl`, `python3`.
  `age` is NOT installed.
- Backup scripts are present and clean: `/opt/ping/backups/pg-backup.sh`,
  `/opt/ping/backups/qdrant-snap-auto.sh`.

### Pig (WSL, via pigwsl ssh)
- No `rclone`, `restic`, `aws`, or `az` on PATH.
- `/home/nolan/.aws` EXISTS on the Pig WSL. This is capability presence only:
  AWS CLI-style credentials appear to have been configured on the Pig at some
  point. Contents were not inspected and no values were read.
- No `~/.oci` on the Pig WSL.

### Prior research in ~/workspace
- None. The only hit is a deferred-policy line in self_improvement staging
  memory naming "off-host destination, key custody" as an open decision.
  No destination was ever chosen or researched.

### Related defect found during recon (pre-existing, not caused by this mission)
- `/opt/ping/backups/backup.log` (2026-09-24 run) shows:
  `pg-backup.sh: line 32: pg_restore: command not found`.
  The local integrity check that depends on `pg_restore` is degraded; the run
  still exits OK on sha256 alone. The off-host drill procedure below depends
  on a working `pg_restore`, so this must be fixed first (install
  postgresql-client on the host, or run the verify via `docker exec
  ping-postgres`). Flagged for the ops lane; no change made by this mission.

## 3. Payload measurement (2026-09-24)

| Artifact | Latest file | Size | Schedule |
|---|---|---|---|
| Postgres dump | ping-postgres-20260924T114327Z.dump | 448,103 bytes | daily 03:30 UTC |
| Qdrant snapshot | knowledge-20260924T114333Z.snapshot | 68,138,496 bytes | daily 04:00 UTC |
| Total /opt/ping/backups | | 66 MB (one PG dump + one Qdrant snapshot + legacy dir) | 7-day retention |

Growth estimate:
- Postgres: 368,338 bytes (2026-09-19) to 448,103 bytes (2026-09-24),
  about 16 KB/day. Negligible.
- Qdrant: single data point; growth rate not yet measurable. Recommend the
  ops lane record snapshot size weekly and revisit the estimate.
- Daily off-host payload: about 68.6 MB/day.
- Bandwidth: 68.6 MB/day is roughly 6.4 kbps averaged, sent as one burst
  after the 04:00 UTC Qdrant snapshot completes. Trivial for any destination.
- 30-day off-host retention steady state: about 2.1 GB.

Conclusion: this is a small, cheap payload. Cost will not decide the
destination; authorization simplicity and restore-path quality will.

## 4. Pipeline design (destination-agnostic)

### 4.1 Flow
Local backup completes (03:30/04:00 UTC) -> off-host copy job runs at 04:30 UTC
-> for each of the two artifacts (PG dump + sha256, Qdrant snapshot + sha256):
encrypt a copy in a temp dir -> upload ciphertext + sidecars per the selected
driver -> server-side list to confirm presence -> append to copy log.
Monthly: pull the latest off-host set back and run the restore drill (section 6).

### 4.2 Encryption (proposed, not yet generated)
- Tool: `age` (preferred: single static binary, simple recipient model) or
  `gpg --symmetric` (already installed; acceptable fallback). Decision at
  install time; the script supports both.
- Key custody proposal:
  - Operational key file lives ONLY on ping-core-01 at
    `/root/.ping-offhost/offhost.key`, mode 600, root-owned, used solely by
    the copy script. Never in the repo, never in chat, never in logs.
  - One recovery copy is held personally by Nolan (paper or offline USB).
  - Off-host stores hold ciphertext only. A compromised destination yields
    nothing without Nolan's key.
- No keys were generated by this mission. Key generation is step 1 of
  execution, after the destination choice.

### 4.3 Retention for the off-host copy
- 30-day rolling retention (vs 7-day local). Deletes are explicit
  date-prefix purges, logged. No versioning games, no lifecycle surprises.
- sha256 sidecars and the plaintext manifest travel with every upload so any
  future restorer can verify without trusting the destination.

### 4.4 Copy script
Standalone, parameterized, destination left as a placeholder:
`~/workspace/ops-lane/ping-offhost-copy.sh`
It fails closed with a clear message until `PING_OFFHOST_DRIVER` is set to one
of `oci_os`, `pig_scp`, or `s3_via_pig`. Installing it on ping-core-01 and
wiring the 04:30 UTC timer is execution work, gated on the destination choice.

### 4.5 Verification (not just copy-success)
Copy-success only proves bytes left the host. Monthly, the drill in section 6
pulls the latest off-host set back and restores it in isolation. A copy job
that cannot pass its drill is treated as failed.

## 5. Candidate destinations (real, ranked; ranking is a recommendation)

### Rank 1: OCI Object Storage in Nolan's existing tenancy (RECOMMENDED)
- Why it fits: ping-core-01 is already an OCI compute instance; Object
  Storage is the same provider's native backup target, different failure
  domain from the VM, no second machine to maintain.
- Cost: Always Free tier includes 10 GB/month; Standard tier is about
  $0.0255/GB-month. At ~2.1 GB steady state this is effectively free.
- Complexity: low. Install `oci` CLI (or use pre-authenticated requests),
  `oci os object put` per artifact.
- Authorization required: Nolan creates one private bucket and either an
  API key for a backup-only user or an instance-principal dynamic group +
  policy. This is a ~5 minute console action only he (tenancy admin) can do.
- Restore path: `oci os object get` straight back to a fresh host, then the
  standard local restore. Single hop, documented CLI, no Pig involved.
- Residual risk: same cloud account as the VM. A tenancy-wide event is
  outside this threat model for a 2 GB payload.

### Rank 2: Pig local disk as second copy (FALLBACK)
- Why it fits: the Pig is a physically separate machine on a different power
  and network path; SSH from this environment to the Pig already works.
- Cost: $0 marginal.
- Complexity: medium. Needs an scp path FROM ping-core-01 TO the Pig
  (currently the proven SSH direction is this-VM to Pig and this-VM to
  ping-core-01; host-to-Pig push needs a key and a reachable address such as
  the Tailscale IP).
- Authorization required: Nolan confirms a target directory on the Pig and
  that disk headroom is acceptable. Note: C: disk pressure on the Pig is
  already a standing operational risk, so this destination competes with a
  known constraint.
- Restore path: scp back to a rebuilt host. Works, but the Pig must be up
  and reachable, and it commutes (7am/4pm MT blackout windows).
- Residual risk: same building/region as Nolan; fine as a second copy, weak
  as the only off-host copy.

### Rank 3: AWS S3 via the Pig's existing AWS credential presence (VIABLE, TWO-HOP)
- Why it fits: `/home/nolan/.aws` already exists on the Pig, so the
  credential side may already be authorized; S3 is the most boring,
  best-documented object store available.
- Cost: S3 Standard about $0.023/GB-month; at ~2.1 GB roughly $0.05/month
  plus negligible request charges.
- Complexity: medium-high. Two hops: ping-core-01 scp to Pig staging, then
  `aws s3 cp` from the Pig. Requires installing `aws` CLI on the Pig and
  confirming the existing credentials are valid for the chosen bucket.
- Authorization required: Nolan names the bucket in his AWS account and
  confirms the Pig's existing AWS credentials may be used for it. If the
  credentials are stale or scoped wrong, he refreshes them.
- Restore path: `aws s3 cp` back down, then standard local restore. Two hops
  also on the way back.
- Residual risk: none beyond normal S3; the cost is the extra moving part.

### Not recommended as primary
- Any new cloud account, new bucket on a new provider, or new paid service:
  adds accounts, bills, and credential sprawl for a 2 GB payload. Rejected
  under the "no new accounts" constraint of this mission.
- Restic/rclone: fine tools, but they are a transfer mechanism, not a
  destination. Either can front whichever destination Nolan picks.

## 6. Restore-from-off-host drill procedure (evidence format)

Run monthly, first run within 7 days of the copy job going live. Restores to
an isolated scratch directory/container, never over live data.

```
DRILL ts=<UTC ISO> driver=<oci_os|pig_scp|s3_via_pig>
artifact: <filename>  size=<bytes>
sha256: <computed> vs <sidecar>  -> MATCH | MISMATCH
postgres: pg_restore --list OK; row counts <table>=<n> ... match live -> MATCH | MISMATCH
qdrant: snapshot restored to scratch collection; point count <n> vs live <n> -> MATCH | MISMATCH
RESULT: PASS | FAIL
operator: <name>  log: /opt/ping/backups/offhost-drill.log
```

PASS requires all three MATCH lines. Any MISMATCH is a FAIL, quarantines that
off-host set, and opens a bounded repair mission. The drill log is the
evidence; copy-job logs alone are never accepted as proof of restorability.

## 7. Execution checklist (ready the moment the destination is chosen)

1. Nolan answers the escalation question below (destination + who creates
   the credential/policy).
2. Generate the encryption key; place operational copy at
   `/root/.ping-offhost/offhost.key` (600); hand Nolan the recovery copy.
   (Fix the `pg_restore: command not found` defect from section 2 at the
   same time so drill verification works.)
3. Install one transfer tool on ping-core-01 (`oci` CLI for rank 1, or
   nothing new for rank 2 since `scp` exists).
4. Install `~/workspace/ops-lane/ping-offhost-copy.sh` to
   `/opt/ping/backups/`, set `PING_OFFHOST_DRIVER`, dry-run with a canary
   file, then enable the 04:30 UTC systemd timer.
5. First manual drill within 7 days; monthly drills after.

## 8. Escalation

Which off-host destination do you authorize, and will you create the
credential/policy yourself or grant the access to do it: (1) a private OCI
Object Storage bucket in your existing tenancy, (2) a folder on the Pig's
disk, or (3) an S3 bucket in your AWS account using the credentials already
present on the Pig?
