# CRITIC-PERFORMANCE checkpoint
2026-09-23 20:55 MDT. Independent performance critic for ORCA FINISH PROGRAM.
Night shift; no stopping conditions; YOLO.

Status:
- Started. Targets: MissionScheduler throughput, lease timings, /mc SQL, memory ingestion stall, probe/harness timing, "fast enough" claims.
- Methods: read-only code inspection on Pig via pigwsl-run.sh; arithmetic in workspace; no live benchmark against prod without scratch isolation.

Findings so far: none yet. Next: locate the scheduler and mission_control.js on the Pig.

## 21:25 — deliverable written
- PERFORMANCE-CRITIQUE.md complete: T1 ceiling min(180/T_s,36)/min, hung-worker permanent zero (TEST H11), T2 70s+T clean-death recovery / infinite hung recovery, T3 /mc routes file does not exist (UNVERIFIED), getActive() unbounded, T4 index stall >=70min LIVE, FORGET-index broken, T5 probes <1s, kill matrix ~2.9s/pkt ~4min full pass ~3.6h per 4500 serial.
- Ceiling table established. Scratch timing copy isolated under scratch/chaos-timing; CHAOS-A evidence untouched.
- Follow-on: benchmark scheduler timeouts/heartbeats when they land; review /mc routes when they land; re-measure index when it recovers.
