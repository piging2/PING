# Range 0501-0550 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-0501..0550: family arch-compat (first 50 of 150).
"{it} must execute natively on ARM64 with no emulation in the hot path."
Pass criterion: native execution confirmed (no qemu in process tree); perf within 2x of x86 reference or documented.

## Method
Read-only SSH probes against 129.146.60.17. No containers started; baseline untouched.

## Evidence
1. Host arch: `uname -m` -> aarch64.
2. Image arch (docker image inspect, earlier probe, verified 02:33Z):
   ping-gateway:candidate-3c5d280dd arm64/linux, ping-gateway:candidate-84486f056 arm64/linux,
   ollama/ollama:latest arm64/linux, node:24-alpine arm64/linux, postgres:17-alpine arm64/linux,
   node:20-alpine arm64/linux, node:18-alpine arm64/linux, qdrant/qdrant:v1.7.0 arm64/linux.
3. Emulation scan: `ps aux | grep -i qemu` -> zero processes. /proc/sys/fs/binfmt_misc/ contains only
   `python3.12` (magic-based pyc execution, unrelated to container emulation), `register`, `status`.
   No qemu-aarch64/qvm entries. Therefore nothing in the hot path runs under QEMU.
4. Running containers ping-postgres (healthy), ping-qdrant (healthy), ping-gateway (up) all run the
   arm64 images above on an aarch64 host with no emulation layer in the process tree.

## Perf clause
No x86 reference exists in this environment; the "within 2x of x86 reference" comparison cannot be
measured here. This is an explicit adaptation gap, not a failure: native execution is confirmed.

## Verdicts
- postgres, qdrant, gateway: ADAPT (native arm64 execution PROVEN by evidence; x86 perf comparison unavailable -> followup).
- ollama: NEEDS-FOLLOWUP (image is arm64 but no running container; start on staging, confirm no qemu, then ADAPT/PROVEN).
- js-worker-a/b, python-adapter, event-ingest, witness, scheduler, backup-agent, health-monitor,
  log-shipper, reverse-proxy, cert-renewer: N-A (no such service deployed; same evidence as range 0401-0450).

## Followup (for the ADAPT verdicts)
On a staging host with both arches available: run the service's representative workload on x86 and arm64,
record p95 latency/throughput, and document the ratio against the 2x bound. Exact commands depend on the
workload; start from the harness design in range-0401-0450-investigation.md.
