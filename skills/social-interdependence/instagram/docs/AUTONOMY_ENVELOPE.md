# AUTONOMY_ENVELOPE: social-interdependence/instagram

The autonomy envelope is the machine-readable charter for one pass. It is
loaded by `siig_executor.load_envelope()` (defaults in code, overridable
by `state/autonomy-envelope.json`) and it is stamped into every intent's
decision record. The envelope does not grant authority; the authority
gate does. The envelope bounds what autonomy may do once the gate opens.

## Fields

| field | meaning |
|---|---|
| platform | `"instagram"` |
| account | `"nolanpigi"` (the only authorized account) |
| actor | `"si-ig"` |
| tenant | `"default"` |
| max_likes_per_pass | 50 |
| max_comments_per_pass | 12 |
| pass_window_hours | 2 |
| weekly_ramp_likes / weekly_ramp_comments | +5 / +3 per week from the 2026-09-26 epoch |
| inter_action_delay_sec | [60, 120] human pacing window |
| maximum_failure_rate | 0.10; the watchdog stops the pass above this |
| maximum_unknown_rate | 0.25; above this the pass pauses for reconcile |
| negative_feedback_spike | 3 signals in a pass trips the platform breaker |
| breaker_failure_threshold | 5 failures before a scope opens |
| breaker_cooldown_sec | 600 |
| max_retries | 2 bounded retries per intent (3 attempts total) |
| prohibited_targets | owner-ordered no-contact list (name match, e.g. monument view) |
| envelope_version | schema version of this envelope |

## Budget semantics (binding)

- 50 likes + 12 comments per 2h pass. The weekly ramp climbs 5 likes and
  3 comments per platform every week from the 2026-09-26 epoch.
- A failed pass is retried; caps are NEVER lowered in response to
  failure. (Standing rule: never weaken safety for volume, never answer
  a failed pass with lower caps.)
- Reservation is atomic and per-window; commit happens only at
  VERIFIED_SUCCESS; release happens on every non-terminal exit so a
  retried intent re-reserves honestly.
- Scheduling variation (slot offsets, 60-120s pacing) exists only for
  operational reasons: queue depth, cooldowns, budgets, backpressure.
  Randomness is never used for detection evasion.

## What the envelope does NOT contain

Taste. Ranking features (trade relevance, photo quality, recency) live in
the decision record's priority features, computed above eligibility.
TASTE IS NOT ELIGIBILITY: the envelope carries no ranking, and the guard
data files carry no taste.

## Envelope lifecycle

1. Loaded at the start of `build_pass` and `execute_pass`.
2. Budgets derived from it gate planning (reserve) and dispatch
   (re-reserve on retry).
3. The watchdog reads its thresholds at the end of every pass.
4. The learner may propose bounded parameter changes inside
   `inter_action_delay_sec` [60, 120]; anything outside the envelope is
   refused without a human decision, and the learner never edits this
   file itself.

## Cross-platform contract

Field names in the envelope, intent, and decision record are shared with
the facebook, threads, and x platform builders: `intent_id` is
`"<platform>:<action>:<target_ref>:<batch_id>"`; the 19 intent states
are identical; the AutonomyEnvelope fields above are the common set.
A pass on any platform can be read with the same tooling.
