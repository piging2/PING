# Prospect source of truth — agent ops

## The rule
`~/workspace/your_files/western-co-prospects.jsonl` is the ONE source of truth for the prospect business list (migrated 2026-09-11 from the retired CSV; backup at `~/workspace/goals/ping-social-outreach-campaign/hidden_files/csv-backup-2026-09-11.csv`). One JSON object per line, 33 fields, validated by `~/workspace/outreach/prospect-schema.json`. Every prospecting batch merges into it. Never maintain a second competing list. The Nolan-facing digest `~/workspace/your_files/prospect-digest.md` is rebuilt by `~/workspace/outreach/prospect-digest.py` after every sweep.

## Columns
- `email`, `business_name`, `owner_name`, `phone`, `website`, `trade`, `city`, `state`, `region`, `source` — as before. Only record contact info genuinely published by the business (own site, bio, profile). Never invent.
- `revamp_candidate` — `yes` for old, less active, or non-technical businesses that could use a PING-style revamp. Blank means not yet assessed (this is the default for the 143 pre-2026-09-10 rows).
- `notes` — one-line battle-tested note: why they fit, stack signals, IG handle, caveats (e.g. town unconfirmed).

## Intelligence columns (added 2026-09-11; the living record)
Appended after `notes`. Empty means unknown. Every prospect gradually accumulates these as sweeps observe real signals.
- `intel_updated` — YYYY-MM-DD of last enrichment.
- `website_quality` — strong/moderate/weak/unknown. Inferred from public observation.
- `booking_mechanism` — as observed on their site (e.g. phone-only, online form, Housecall Pro book button). Empty means unknown.
- `missed_call_risk` — high/medium/low/unknown. Inferred from signals (phone-only intake, bad reviews about reachability, no after-hours capture).
- `social_presence` — e.g. ig+fb, fb only, ig only, none, unknown.
- `review_velocity` — e.g. 3/mo, stale, unknown.
- `notable_reviews` — short problem-category notes (e.g. "2-star Sep 2026: scheduling friction"). Never reviewer names.
- `new_filing_signal` — YYYY-MM-DD the business filed or opened, or empty.
- `stack_signals` — short text; graded CONFIRMED / STRONG INDICATION / WEAK INDICATION / UNKNOWN per the stack rule.
- `opportunity_primary`, `opportunity_secondary` — one of: NEW_BUSINESS_SETUP, MISSED_CALL_LEAD_CAPTURE, WEBSITE_REVAMP, SEO, AEO_AI_DISCOVERABILITY, SOCIAL_PRESENCE, AUTOMATION, INTEGRATION, UNKNOWN.
- `opportunity_evidence` — the observed facts behind the opportunity call. Never invented.
- `opportunity_confidence` — high/medium/low.
- `ai_discoverability` — strong/moderate/weak/unknown. Assigned ONLY from observable evidence (clear service/location info, structured content, FAQs, consistent identity, third-party references, review presence). Never claim a ranking that was not measured.
- `priority_state` — HOT (multiple fresh signals plus strong fit plus legitimate opportunity), WARM (good fit plus meaningful signal), WATCH (interesting but insufficient evidence), SUPPRESS (no, cooldown, contacted too recently, unsuitable).
- `last_signal` — YYYY-MM-DD plus short descriptor of the newest meaningful signal.
- `suppression_state` — canonical vocabulary (see below). Never free prose.
- `next_eligible_action` — e.g. F1 after 2026-09-15, watch, none.

## suppression_state: canonical vocabulary (2026-09-13)
Small fixed set. Every sweep's response-handling step must project reply/decline/bounce outcomes into these values in the same run; prose-only outcomes are not allowed.
- `` (empty) — not yet assessed. Default for untouched rows.
- `none` — eligible for outreach; no suppression in force.
- `declined YYYY-MM-DD` — hard decline (e.g. a "No interest." reply). Never contact again, no follow-up ladder.
- `bounced YYYY-MM-DD` — address bounced; permanently retired.
- `cooldown until YYYY-MM-DD` — temporary cooldown; eligible again on/after the date.
- `ladder F1 YYYY-MM-DD` / `ladder F2 YYYY-MM-DD` — follow-up ladder active; the next touch is F1/F2 on/after the date. Set the moment a touch is SENT (not when queued).
- `queued-draft` — draft written and queued, send pending.
- `opt-out YYYY-MM-DD` — recipient asked out; treat like a decline.
- `franchise YYYY-MM-DD` — franchise or chain location; no local buying authority (2026-09-13, Nolan's call: no franchises or chains, ever). Never contact, no follow-up ladder.

2026-09-13 migration (documented so old values stay interpretable):
- `none`, `NONE`, `none; new`, `eligible` → `none`
- `in-follow-up-ladder` → `ladder F1 <date>` / `ladder F2 <date>` (date parsed from next_eligible_action's pending touch)
- `contacted; DM SENT ...` (one row, detail already in last_signal/next_eligible_action) → `none`
- `queued-draft` → unchanged; `` → unchanged

## CONVERSION fields (added 2026-09-13; the loop's observable home)
- `conversion_state` — `` (none recorded), `replied`, `meeting`, `customer`. Tracks the reply → meeting → customer progression.
- `converted_at` — YYYY-MM-DD of the conversion event. Empty means none.
- `conversion_evidence` — link to the evidence (e.g. the responses.md section, a file path). Empty means none.
- Hard rule: only a REAL reply/meeting/customer event with linked evidence may set these. No automation may invent a conversion. A decline is not a conversion: declines set `suppression_state` to `declined YYYY-MM-DD` and leave conversion fields empty.

## known → inferred → unknown (hard rule)
- KNOWN: contact info and facts published by the business itself (own site, bio, profile, filing records).
- INFERRED: assessments from public observation (website_quality, missed_call_risk, ai_discoverability, opportunity_*). Usable for targeting and timing, never stated as fact in copy.
- UNKNOWN: empty fields. Never treated as negative evidence and never filled by guessing.
- Stack findings keep the CONFIRMED / STRONG INDICATION / WEAK INDICATION / UNKNOWN grades.
- Social chatter is labeled signal / unverified / confirmed; chatter is never a verified fact.

## revamp_candidate criteria (any one qualifies)
- Thin or stale social: under ~50 posts, or nothing posted in 6+ months, or tiny follower count for an established business.
- No website, or the intake is phone-only / DM-only with no booking system.
- Consumer email as the business address (hotmail/gmail) combined with thin presence.
- No published direct contact at all (no email, no phone).

## Update workflow (standing)
1. Every prospecting batch (web, Instagram, Facebook groups) merges new businesses into the CSV.
2. Dedupe by normalized business name AND by email before appending. The merge script pattern lives at /tmp/merge_ig_csv.py (one-off; rewrite per batch as needed).
3. Set `revamp_candidate` and `notes` for every new row at merge time. This is Nolan's standing "note as you go" instruction (2026-09-10).
4. Backfill `revamp_candidate` on older rows opportunistically as rounds touch them; do not bulk-guess.
5. When a batch lands, also update the Nolan-facing notes doc `~/workspace/your_files/western-co-prospect-notes.md`: revamp candidates section first, then the batch list. Keep entries to one or two lines.
6. `region` values: "Western Colorado" for confirmed western-CO towns, "Colorado (town unverified)" when town is not confirmed, wider values only per Nolan's expansion calls. Denver-area businesses are deprioritized per 2026-09-09.

## Companion docs
- Nolan-facing notes: `~/workspace/your_files/western-co-prospect-notes.md` (plain English, business name + contact + why).
- Raw Instagram profiles: `~/workspace/outreach/instagram-prospects.md`.
- Engagement log: `~/workspace/outreach/instagram-engagement.md`.
- Pipeline/drafts/leads stay as the outreach execution layer; the CSV is the business list layer.
