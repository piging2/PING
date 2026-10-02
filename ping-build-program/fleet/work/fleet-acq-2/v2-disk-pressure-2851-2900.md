# v2 disk-pressure 2851-2900: 10 subjects x 5 cases (fleet-acq-2, 2026-09-24)

Sandbox-local pressure lab only. The live Oracle host was never touched.
Lab: `fleet/work/fleet-acq-2/disk_pressure_lab.py`; evidence: `disklab-evidence.json`.
Quota scale 1:1000 (behavior class preserved, not byte-identical).

## Subjects (from lane-oracle/ORACLE-DEPLOYMENT-CLOSURE.md via v2 matrix)
S1 oracle_pgdata 69 MB | S2 oracle_qdrant_storage 2.3 MB | S3 /var/lib/docker 2.0 GB |
S4 /opt/ping 2.7 GB | S5 /var/log 454 MB | S6 journald 432 MB uncapped |
S7 p18-oracle-staging 219 MB | S8 host disk 28 GB free | S9 reclaimable images 4.088 GB |
S10 ollama image 6.99 GB (no container)

## Case 0 (ORA-2851..2860): behavior at 90% full — PROVEN x10
Writes succeed; pressure warning typed at >=90%. On the smallest quotas a 1 KiB
probe write can itself trip the quota (honest boundary effect); every refusal is
the typed DiskPressureError, never silent. No corruption in any subject.

## Case 1 (ORA-2861..2870): behavior at 95% full — PROVEN x10
Same as case 0 with less headroom. All refusals typed; no partial writes.

## Case 2 (ORA-2871..2880): behavior at 100% — PROVEN x10
All 10 subjects raised TYPED_DISK_PRESSURE on write at 100%. Fail-closed holds.

## Case 3 (ORA-2881..2890): no partial writes presented as success — PROVEN x10
400 pressured writes (40/subject) with atomic tmp+rename: checksum audit found
0 partial or corrupt survivors and 0 stray .tmp files. Every surviving file is
complete; every failed write is a typed error. Nothing partial was presented
as success.

## Case 4 (ORA-2891..2900): json-file rotation 10m x 5 — PROVEN x3, ADAPT x7
Lab: 80 MB of log lines per subject through a 10 MiB x 5 rotating log.
Retained bytes stayed within the 60 MiB cap for all subjects (over-cap: none).
Honest finding (matches ora-2 case-5 precedent): rotation caps the LOG STREAM,
not the volume. It engages and protects S3 (container json-file logs), S5
(/var/log), S6 (journald) — PROVEN. It does nothing for S1, S2, S4, S7, S8,
S9, S10 — for those the claim "rotation engages before exhaustion" is false as
literally stated; their protection is monitoring + reclaim runbook, not a log
cap — ADAPT with this documented.

## Verdict totals
PROVEN 43, ADAPT 7, REJECTED 0, NEEDS-FOLLOWUP 0.
ADAPT: ORA-2891, 2892, 2894, 2897, 2898, 2899, 2900.
