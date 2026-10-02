# REF - Authority Sources

Every authority this skill depends on, and where it lives. The skill
creates no new authorities.

| Authority | Source | Consumed as |
|---|---|---|
| Eligibility | `~/workspace/outreach/engagement-guard.py` `eligibility_check()` | live call per candidate per pass |
| Engagement holds | `~/workspace/outreach/holds.json` (writer: `set-hold.py`, owner/tripwire) | step-0 check, fail-closed |
| Action capability | `~/workspace/outreach/eligibility-data/action-capability.json` | live probe per pass; UNKNOWN -> safe mode |
| Authorized account | envelope (`AUTONOMY_ENVELOPE.md`): `@nolanpigi` | runtime invariant |
| Ceilings | authorized deployment ceilings: 45 likes + 12 comments / 2h, 60-120s pacing | envelope == budgets, atomic consume |
| First-contact decisions | Nolan's standing orders (e.g. Monument View: no autonomous contact) | policy gate above eligibility |
| Mission/scheduler | external cron/operator; the skill never schedules itself | `th-si-cycle.py` is invoked, not self-run |
| Identity | `intent_id` contract; stable external target IDs | no UUID minting |
| Evidence | `evidence.jsonl` canonical envelopes; transition log hash-chained | witness = verifier read-back |
| Replay | `decision_replay` (recompute, never mutate) | integrity proof |
| Event Authority | UNDER FORENSIC REVIEW: `RECORD_EXTERNAL` is a persistence boundary only, marked in the transition log, never an event emission | explicit boundary |

## What is deliberately NOT an authority here

- The adapter (dumb I/O; `NO_ADAPTER_DECISION_AUTHORITY`).
- The learner (parameters only, bounded, journaled).
- The watchdog (safety gates only; cannot dispatch or decide).
- Any prose, note, or chat message (never freezes; `holds.json` is the
  only freeze mechanism).
- The skill's own ledger for never-reengage (the guard's durable
  history is the authority; the skill's ledger is a convenience copy).
