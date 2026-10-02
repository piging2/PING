# X engagement pass timeout fix (2026-09-22 ~15:16 MDT)

## Failure
Pass x-engagement-pass (scheduled ~13:14 MDT, run e808f64f) expired its 2-hour
execution window mid-discovery. First probe launcher (10 tier-3 handles) was
killed by a service restart ~72 min in with no output; the retried launcher was
still running when the window expired. Zero candidates, zero likes, no intents
written, nothing to reconcile. Classified TEMPORARY_FAILURE in x-engagement.md.

## Root cause
Launcher bound is 120s + 600s/handle, so 10 handles can consume ~102 of the
120 available minutes. A killed/stalled attempt leaves no room for a retry
plus Phase B.

## Fix (applied via cron.update, scheduler-synced)
- Per-pass tier-3 browser probe capped at 5 fresh handles (worst case ~52 min).
- TIME-BUDGET GUARD: if Phase A browser-probe attempts exceed 60 min total
  without a candidate file, switch remaining discovery to the read-only API
  fallback (discovery only, never engagement) and continue with steps 3+.

No Nolan directives changed; caps, stay-on rule, and fail-closed semantics
untouched. Next run ~17:14 MDT.
