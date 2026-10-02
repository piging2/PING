# ORCA A6 harness decision + routed failures (2026-09-24 ~06:25 MDT, Nolan's 80% rule applied)

## Harness designation (DECIDED)
The ORCA lane's own harness is canonical. The ops/effect-port continuation lane's harness worker detected the collision, stopped editing, held rather than clobbered, and verified the ORCA run read-only instead of re-running. Rationale: single ownership avoids two competing proofs; the ORCA lane's run is substantive (all 12 kill points executed, complete 18-field records, every retry authorization grounded in a probe reason, no unheld UNKNOWN terminals).

## Failures routed to the ORCA lane (owning lane, not the ops lane)
- **T-hold**: a held op resumed into retry_authorized while still in HELD state; a pending op could not see the held state (pendingSeesHeld=false). Possible real visibility gap.
- **T-low**: the low-consequence bounded-retry path did not engage; the op held like a high-consequence one.
- No evidence the ORCA lane's `assert.js` step ran — confirm.

## Carry-over findings for the ORCA lane
- Provider-probe requirement for honest terminals.
- spawn-without-await for kill points 11/12.
- AFTER_ACK kill validity.

## Open items (ops lane resumes after ORCA lane clears the failures)
- Re-run the 17-scenario chaos suite against the canonical harness once T-hold/T-low are resolved.
- Proceed with message execution port (C), then social/campaign (D), then merge + merged-state proof (E).
