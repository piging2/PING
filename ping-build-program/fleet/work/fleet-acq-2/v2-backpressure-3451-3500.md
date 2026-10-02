# v2 backpressure 3451-3500: 10 subjects x 5 cases (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof. Lab: `fleet/work/fleet-acq-2/backpressure_lab.py`;
evidence: `backpressure-evidence.json`. Bounded-queue producer/consumer with a
slow consumer (10 ms/item) against a fast producer.

## case 0 (ORA-3451..3460): producer throttled, zero silent drops — PROVEN x10
200 items through a 16-deep queue: produced 200, consumed 200, dropped 0. The
producer blocked on the full queue instead of dropping. Throttle, not loss.

## case 1 (ORA-3461..3470): bounded queue with explicit overflow policy — PROVEN x10
Max observed depth never exceeded the cap of 16. The overflow policy is a named
config: BLOCK (producer waits), REJECT (typed error), DROP_OLDEST / DROP_NEWEST
(journaled, counted). Demonstrated: BLOCK.

## case 2 (ORA-3471..3480): consumer lag measured and alerted — PROVEN x10
Lag alerts fired with depth and oldest-item age whenever depth passed 70% of
cap. Lag is a measured number in the alert, not a feeling.

## case 3 (ORA-3481..3490): backpressure propagates end to end — PROVEN x10
Two-stage pipeline (8 + 8 caps) with a slow middle stage: producer throttled
via q1, total in-flight peaked within the 16 cap, all 100 items consumed. No
hidden unbounded buffer anywhere in the chain.

## case 4 (ORA-3491..3500): typed BACKPRESSURE to the caller — PROVEN x10
With overflow policy REJECT, a full queue raises typed BackpressureError naming
the queue and cap. The caller gets a typed error, never a silent stall.
