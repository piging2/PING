# Interval 10: Copilot Wave-2 q5-q8 Fold-In Report (Reader R4)

Date: 2026-09-30 ~11:00 MDT. Source: /home/nolan/copilot-broker/reports/cp-wire-q{5,6,7,8}.{json,txt} on the Pig, run 08:21-08:23 MDT (14:21-14:23 UTC). All four classification SUCCESS, identities 2+4, no timeouts. No local mirror found on this VM.

## Verdicts

### q5 — Secret-shape scan of added lines reaching event/projection/UI sinks
- **Verdict: CORROBORATES-EXISTING** (writer C context; no new unit, no close-bar change)
- Result: NO_FINDINGS. Credential-shaped matches were env-backed DB config and test-key fixtures, not secret literals reaching sinks.
- Fails the four-test: no reproduced defect (b). It is consistent with writer C's T06 scope (redaction at the emission choke point for secrets already in ping_events) — new lines are not introducing secrets — but it neither confirms nor denies the historical defect.

### q6 — Mission Control read-path field transforms
- **Verdict: OUT-OF-SCOPE for Interval 10**
- Reason: documents real MC read-surface transforms (today-work projection renames/drops fields; AI-recommendation projection renames event_id/timestamp; marketing-action construction fabricates action values `case_study`/`testimonial_request`/`nurture_sequence` and a constant `reason: 'Project completed'`), but this is projection field-fidelity, not writer D's deterministic-ordering scope (T4 = kill the +1ms epsilon). Runtime-side selection/ordering and any frontend projection remain UNKNOWN, so no smallest corrective delta is established.
- Flag: the fabricated `reason: 'Project completed'` and dropped event fields are relevant fidelity evidence for the close bar's "MC explains real journal" claim, but they do not change writer D's close bar.

### q7 — Unknown-outcome handling census (mission_scheduler.js, worker_runtime.js, failure_record.js)
- **Verdict: OUT-OF-SCOPE for Interval 10 as a new unit** (would need a fifth writer or scope expansion of B)
- Reason: FALSE-FAILED rows (mission_scheduler.js:380-385 malformed receipt; 391-392 `{status:'failed'}` without pre-effect proof; failure_record.js:191 + 103-112 `effect_known` omitted treated as known then `failed` when retries exhausted), FALSE-SUCCESS row (mission_scheduler.js:394-406 truthy worker result counted completed), and UNHANDLED rows (636-647 `_reconcileUnknown` derivation throw swallows HOLD; 664-685 HOLD persistence failure emits nothing durable; 729-734 stuck-running scan failure leaves no reconciliation; worker_runtime.js:258-274 disabled `_poll()` catch swallows without reconciliation). Writer B is scoped to pre-claim denial persistence only; post-effect worker-outcome ambiguity is a separate convergence unit.
- **Close-bar threat (relay to falsifier / writer B):** the UNHANDLED rows and the `effect_known` default directly challenge the close bar's "post-effect UNKNOWN/HOLD" claim. Recommend adding these rows to the hostile matrix: verify whether 636-647, 664-685, 729-734, and the failure_record.js:191 effect_known-default path are reachable in the real Coppersmith run. If reachable, the "never FAILED / always durable HOLD" claim needs qualifying before the bar is declared met. This does not change any writer's scope text, but it adds mandatory falsifier checks.

### q8 — glue-tests build-pipeline stage census
- **Verdict: CORROBORATES-EXISTING** (evidence for the bounded Ask FYD read-path reader; no writer unit)
- Result: 4 GREEN, 4 MISSING/UNWIRED (EXTRACT unwired, RESOLVE missing, SITE_SPEC missing, RENDER missing). Missing capability, not a reproduced defect on a reached path. Feeds the authorized "one pass, first broken hop" Ask FYD diagnosis; earns no writer work.

## Net for the parent
- No finding earns a new Interval 10 writer unit (none passes all four of reached path / reproduced defect / existing semantic owner / smallest delta).
- Two findings feed authorized lanes without new work: q5 -> writer C context; q8 -> Ask FYD read-path reader.
- Two findings are OUT-OF-SCOPE for Interval 10: q6 (MC projection field fidelity) and q7 (post-effect worker-outcome ambiguity). q7 carries a close-bar threat that the falsifier should check before close (specific rows above).
