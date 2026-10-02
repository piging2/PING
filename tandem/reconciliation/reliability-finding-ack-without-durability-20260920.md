# Reliability Finding: HTTP Accepted ≠ Durably Persisted

## Classification

FAILURE CLASS: ACK WITHOUT DURABILITY

## The Finding

```text
HTTP accepted
≠
durably persisted
```

A system without canonical persistence was capable of producing a
success-looking acceptance state that downstream evidence interpreted
as durable acceptance.

## Evidence (R3 Incident, 2026-09-13)

1. Gateway returned HTTP acceptance responses for 20 event submissions
2. Sidecar provenance files recorded `accepted_by_ping` for all 20
3. Postgres was not available; gateway ran in degraded in-memory mode
4. 13 events found in `ping_events` (persisted before degradation or after recovery)
5. 7 events absent from `ping_events` (accepted during degraded window)
6. Gateway restart erased ephemeral in-memory state
7. Downstream reconciliation interpreted "accepted_by_ping" as "canonically persisted"
8. The 7 missing events are irrecoverable; source .md artifacts survived

Source: `~/workspace/tandem/reconciliation/r3-closure-20260920.md`

## Required Distinction

The system must eventually distinguish:

```text
RECEIVED
  → bytes arrived at the gateway

ACCEPTED
  → gateway acknowledged receipt (HTTP 200)

DURABLY_PERSISTED
  → event committed to canonical store (Postgres ping_events)
  → survives process restart
  → verifiable via read-back
```

These are three distinct states. The R3 incident collapsed ACCEPTED into
DURABLY_PERSISTED, creating false confidence in durability that did not exist.

## Broader Failure Class

Per Nolan directive 2026-09-20, search PING for this entire failure class:

- ACK WITHOUT DURABILITY
- SUCCESS WITHOUT PERSISTENCE
- COMPLETION WITHOUT VERIFICATION
- HEALTH WITHOUT DEPENDENCY
- VERIFIED WITHOUT CANONICAL INPUT
- SENT WITHOUT PROVIDER CONFIRMATION
- PROCESSED WITHOUT STATE TRANSITION

Each represents a success-looking state that was not backed by the
durability, verification, or confirmation the state name implies.

## Resolution Boundary

DO NOT patch from the business-agent track.

This finding is preserved for the convergence/runtime track to resolve
through the canonical event authority (UnifiedEventRuntime).

The fix must ensure:
1. Degraded gateway can never return canonical-acceptance semantics for
   memory-only persistence
2. Every gateway acceptance response clearly indicates persistence tier
3. Negative regression: Postgres unavailable → canonical event submission
   → MUST NOT return canonical persistence success
4. Sidecars distinguish: REQUEST_SENT vs ACCEPTED_BY_PROCESS vs
   CANONICALLY_PERSISTED vs VERIFIED_PRESENT

## Status

FINDING PRESERVED. Awaiting convergence/runtime track resolution.
Not an operational failure; no self-heal attempted from this track.
