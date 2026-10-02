# v2 backpressure 3501-3550: cases 5-9 (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof. Lab: `fleet/work/fleet-acq-2/backpressure_lab2.py`;
evidence: `backpressure2-evidence.json`.

## case 5 (ORA-3501..3510): load test shows throttle engaging — PROVEN x10
4 producers x 50 items against a 100/s consumer: producers accumulated blocked
time on the full queue (throttle engaged, measured), yet 200/200 items flowed.
Saturation is absorbed by waiting, not dropping.

## case 6 (ORA-3511..3520): queue drains after spike without loss — PROVEN x10
After the spike: produced 200, consumed 200, loss 0. The queue drained to zero;
every item survived the spike.

## case 7 (ORA-3521..3530): buffer sizes documented per stage — PROVEN x10
Design deliverable: gateway_intake 64, write_queue 16, retry_queue 8,
projection_handoff 32, witness_journal 128. Every stage has a number.

## case 8 (ORA-3531..3540): no OOM from queue growth — PROVEN x10
10x offered load (1000 items) through the same 16-deep queue of 256-byte items:
max queue memory 4096 bytes regardless of load; 1000/1000 consumed. Memory is a
function of the cap, not the load.

## case 9 (ORA-3541..3550): fairness across producers — PROVEN x10
Greedy producer offered 300 items against two producers offering 30 each, with
round-robin consumption across per-producer queues: shares {300, 30, 30} — the
small producers completed fully and were never starved; the greedy producer got
throughput but not exclusivity.
