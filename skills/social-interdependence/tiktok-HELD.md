# TikTok — HELD (no autonomous loop)

**Status: HELD. Do not build or run an active engagement loop for TikTok.**

Standing hold (machine-readable, `~/workspace/outreach/holds.json`):

- `held: true`, `set_by: tripwire`, `set_at: 2026-09-29T00:00:00Z`
- Reason: platform restriction banner observed; tripwire `tiktok-like-recovery-state.json` status BLOCKED (`durable_like_cap` 0); cron disabled 2026-09-29.
- Nolan's 2026-09-30 ~16:05 order: stays held until the flag clears, not on a timer. Only Nolan's explicit word or a tripwire-observed flag clearance changes this.

What exists and stays:

- `engagement-guard.py` supports TikTok candidates (`check_tiktok`, `TT_URL_RE`) and the eligibility data files list TikTok capabilities. The guard remains the authority for any future TikTok candidate evaluation.
- The durable log `~/workspace/outreach/tiktok-engagement.md` remains the history source.

What is NOT built:

- No TikTok adapter, no scheduling, no budgets, no watchdog scope. The autonomy envelope for this skill explicitly excludes TikTok from `allowed_platforms` until the hold clears.

Reactivation path (owner or tripwire only):

1. Tripwire observes the platform restriction flag cleared (`tiktok-like-recovery-state.json` no longer BLOCKED).
2. `set-hold.py` clears the hold with `--by tripwire` (evidence ref) or `--by owner` (Nolan's word).
3. Only then may a TikTok platform deliverable be built to the same standard as the facebook/instagram/threads/x deliverables in this skill.

Prose in this file never creates or clears the hold. `holds.json` is the mechanism.
