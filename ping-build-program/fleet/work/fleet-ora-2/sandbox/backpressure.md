# Backpressure contract (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). Design-spec for the gateway-to-postgres write path;
the mechanism was validated in a bounded-queue simulation (backpressure-evidence.json).

## Rules
1. Producer throttled, zero silent drops: when the queue is full the producer
   gets a typed BACKPRESSURE error (or blocks with a deadline); nothing is
   silently dropped.
2. Bounded queue with an explicit overflow policy: cap 1000 (gateway write
   queue); overflow policy = reject with typed BACKPRESSURE (never block forever,
   never grow unbounded).
3. Consumer lag measured and alerted: queue depth is a metric; alert at 70 pct
   of cap, page at 95 pct.
4. Backpressure propagates end to end: postgres slowness -> gateway queue fills
   -> gateway returns typed 503 BACKPRESSURE to the client -> client retries with
   backoff. No hidden unbounded buffer anywhere in the chain.
5. Typed BACKPRESSURE error surfaced to the caller (not a timeout, not an empty
   response).

## Simulation result (2026-09-24)
cap 10, 100 attempts: 36 accepted, 64 rejected with typed BACKPRESSURE,
36 consumed, 0 silent drops, produced == consumed (conservation holds).
