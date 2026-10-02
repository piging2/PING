# Range 1501-1550 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-1501..1550: family event-ingress-chaos (first 50 of 250; family spans ORA-1501..ORA-1750).
"Event ingress chaos [{it}]: gateway behavior under adversarial ingress" (it = duplicate, malformed, oversized, collision, reordered)
Pass criterion: "Inject {it} events: 100% classified, zero crashes, zero poisoned canonical state; evidence in harness log."

## Hard boundary
Injecting duplicate/malformed/oversized/collision/reordered events into the LIVE production gateway risks
poisoning canonical state — the exact outcome the criterion forbids. Not attempted against the baseline.
The oracle rule permits attacking CANDIDATES: ping-gateway:candidate-3c5d280dd and candidate-84486f056 exist
as images on the host. The harness below runs a candidate against ISOLATED scratch stores (never live
postgres/qdrant volumes), which keeps the baseline sacred.

## Exact followup harness (staging host, or live host ONLY against scratch stores)
  1. Fresh scratch stores: postgres:17-alpine + qdrant/qdrant:v1.7.0 on throwaway volumes, dedicated network.
  2. Start candidate: docker run -d --name chaos-gw --network chaos-net -p 127.0.0.1:18080:<gwport> \
     -e PG_URL=<scratch-pg> -e QDRANT_URL=<scratch-qdrant> ping-gateway:candidate-3c5d280dd
     (verify env var names in /opt/ping/config/env.schema before running).
  3. Injector script (node, local): for each class, send 200 events to the gateway ingest endpoint:
     - duplicate: same event id sent twice (and 3x); expect second+ classified DUPLICATE, single application.
     - malformed: truncated JSON, wrong types, missing required fields; expect MALFORMED/INVALID_PAYLOAD, never crash.
     - oversized: payload 10x the documented max; expect typed rejection, bounded memory.
     - collision: different payload, same event id (id-collision attack); expect CONFLICT, original preserved.
     - reordered: events sent out of causal order; expect accepted-but-ordered or explicitly reordered-handled, never silent loss.
  4. Classify each response against lane K's failure taxonomy; PASS: 100% classified, zero crashes,
     zero poisoned canonical state (diff scratch store before/after: only well-formed unique events applied).
  5. Evidence: harness log with per-event class, response code, and store diff digests.

## What this resolves
Each chaos mission maps to one injector class; the 250 missions are 50 repetitions of the 5 classes
(10x each). One harness run covers all 5 classes; the 50-result batches are redundant repetitions of the
same experiment. Recommend the parent collapse future chaos ranges to one run per class per candidate.

## Verdicts
- All 50 in this range: NEEDS-FOLLOWUP with the harness above (candidate-attack permitted; live injection forbidden).
