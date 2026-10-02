# Oracle Assessment — Incident Zero (2026-09-30 ~06:20 MDT)

Host: `ping-core-01` (ubuntu@129.146.60.17), reachable ONLY via the Pig WSL tunnel
(chain: cloud VM -> ssh pigwsl -> wsl -> ssh ubuntu@Oracle). Uptime: 10 days.

## 1. MEASURED STORAGE (exact, 2026-09-30)

| Mount | Size | Used | Avail | Use% |
|---|---|---|---|---|
| `/` (/dev/sda1) | 45G | 20G | **25G** | 46% |
| /boot (/dev/sda16) | 891M | 167M | 662M | 21% |
| /boot/efi | 98M | 6.4M | 92M | 7% |

- Disk: single 46.6G boot disk (sda). No data mounts, no block devices beyond loop/snaps. Inodes fine (5% used on /).
- `/home/ubuntu`: 219M total (depcheck logs, ops-lane memstats, `p18-oracle-staging/` dir).
- Largest dirs: `/opt` 3.5G, `/var` 1.4G. `/mnt` empty.

**What Oracle IS:** Nolan's Oracle Cloud VM ("ping-core-01", oracle-cloud-agent snap, 6.17 kernel).
It is a LIVE PING infra box, not idle capacity: Docker running, Qdrant on 127.0.0.1:6333/6334,
Postgres on 127.0.0.1:5432, plus a service on 127.0.0.1:8080. Boot history shows stable
long uptimes (63-day run prior). No cost/quota signals retrievable (instance metadata endpoint
returned 403; no billing CLI on the box). No other human users visible in wtmp beyond reboots.

## 2. SECOND BACKUP COPY (~5 MB, authorized) — DONE, VERIFIED

- Source: `/mnt/c/PIG-BACKUPS/incident-zero-20260930/` on the Pig (real C: fs, not VHDX).
- Pulled to sandbox as `/tmp/pg-backup.tar.gz` (1,571,337 bytes), extracted, and
  `sha256sum -c` against `~/workspace/pig-storage/incident-zero-20260930/SHA256SUMS.txt`:
  all 9 files OK (crx_runtime, h13_*, ping_runtime, postgres, cluster-plain.sql, globals.sql).
- Pushed to Oracle at `/home/ubuntu/pig-backups/incident-zero-20260930.tar.gz` via the
  tunnel. Remote sha256: `0f5bd8f7ae8a0f46ca50335b51b06d89bfd00317013c2559c0099b83693be993`
  — byte-identical to local. Extracted on Oracle, re-ran `sha256sum -c`: all 9 OK.
- Remote layout: `/home/ubuntu/pig-backups/incident-zero-20260930.tar.gz` (canonical tarball)
  + extracted copy under `/home/ubuntu/pig-backups/verify/` (spot-verification; 5 MB, harmless).

Transfer quirk (recorded, not a defect in the script): `/tmp/oracle-ssh.sh` non-`-s` mode
passes command words through the Pig's cmd shell, so a `&&` in the argument string was
executed locally on the Pig (mkdir ran on Oracle, `cat` failed on the Pig, rc=1, nothing
written). Switched to `-s` script mode with the tarball embedded as base64; worked cleanly.

## 3. EXPORT-TAR STAGING EVALUATION — **NO-GO**

- Requirement for comfort: ~130+ GB free for the ~118 GB WSL export tar.
- Oracle has **25 GB free** on a 45 GB root. Not close.
- Verdict: **NO-GO. Oracle cannot stage the WSL export tar.** Even a compressed tar (~90-100 GB
  optimistic) exceeds total disk. Do not attempt; a fill would threaten the live Qdrant/Postgres
  services sharing that root.

## 4. BANDWIDTH REALITY (measured, then extrapolated — labeled estimate)

- Measured: 1,571,337 bytes through the tunnel in 3.66 s = ~429 KB/s (~3.4 Mbps effective,
  includes double-ssh-hop + base64 overhead).
- Extrapolated (ESTIMATE): 118 GB at ~429 KB/s ≈ **~76 hours** (~3.2 days) of continuous
  tunnel time. Even at 2-3x that rate, it is a multi-day transfer. Combined with NO-GO on
  space, the 118 GB push to Oracle is off the table on both axes.

## 5. INDEPENDENCE CAVEAT (one line)

Oracle is independent of the Pig's Docker/WSL VHDXs (off-VHDX) but NOT independent of the
Pig itself: it is reachable only through the Pig's network/power, so a Pig outage cuts all
access — it is off-VHDX, not off-site.

## RECOMMENDATION

- The ~5 MB pg_dump set now has a verified second copy on Oracle: **backup redundancy improved,
  mandate served.** This is the right size class for Oracle (megabytes, not hundreds of GB).
- For the ~118 GB WSL export tar: Oracle is ruled out. Options in order: (a) the NUSYN 1 TB
  SSD when it arrives (canonical landing zone), (b) D: flash drive staging (~6.4 GB free —
  insufficient alone; only viable with split archives), (c) split the export into
  independently restorable chunk archives if a large target never materializes.
- Do not stage anything bulk on Oracle going forward: 25 GB free on a box running live
  Qdrant + Postgres leaves no safe headroom, and filling root would be an incident, not a backup.
