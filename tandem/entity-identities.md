# Entity Identities: append-only identity relation log

Purpose: record evidence-backed relationships between BUSINESS ENTITY,
PLATFORM ACCOUNT, and INTERACTION layers so a fresh agent can reconstruct
what was known and unknown about identity, and challenge: was the identity
correct.

## The three layers (do not conflate)

* BUSINESS ENTITY: the real-world object. Example: the actual company
  "Captain Ron Handyman L.L.C." registered with the Colorado Secretary of
  State. Identified by legal registration, verified formation date, trade,
  operating geography.
* PLATFORM ACCOUNT: an execution surface, identified by the pair
  (platform, account). Example: a Facebook Page, an Instagram handle. This
  is where an action (like, comment, DM) is executed. The engagement guard
  prevents re-engagement with an account; it cannot prove the business was
  never engaged elsewhere.
* INTERACTION: an event against a platform account at a time. Example: a
  like placed on 2026-09-14. Interactions are logged in the engagement
  logs, keyed by (platform, account, timestamp).

Entity identity lives ABOVE the platform-account layer. Where identity is
uncertain, preserve UNKNOWN. Never false-merge: two accounts are not the
same entity without evidence, and one entity is not two accounts without
evidence.

## Rules for this log

1. Append-only. New entries go at the end with a timestamp. Never edit or
   delete an entry. A correction is a new entry that references the
   superseded entry id.
2. Every relation cites its supporting evidence: a PING event_id, a
   sidecar/artifact path, or an engagement-log path. No evidence, no entry.
3. This log holds relationships and provenance ONLY. It never holds
   independent business facts (filing dates, trades, contact routes live in
   PING observations and artifacts). The moment it does, it becomes a
   second truth store.
4. Confidence is stated per entry: high / medium / low. Absence of evidence
   is recorded as "no account evidenced", never as "no account exists".
5. Reconstructible: a stranger with this file plus the cited evidence can
   rebuild every claim. If a cited artifact is gone, say so in a new entry.

## Entry schema

| entity | related account or alias | relationship type | supporting evidence | confidence | timestamp |

Relationship types: name-variant-of, platform-account-of, same-entity-as,
distinct-from, no-account-evidenced.

## Entries

| entity | related account or alias | relationship type | supporting evidence | confidence | timestamp |
|---|---|---|---|---|---|
| Captain Ron Handyman L.L.C. (Grand Junction CO handyman, SOS formation 2026-07-14) | "Captain Ron Handyman LLC" (unpunctuated spelling) | name-variant-of | PING event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7 (observation names "Captain Ron Handyman LLC"); raw artifact ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.md (names "Captain Ron Handyman L.L.C.") | high | 2026-09-14T19:45:00Z |
| Captain Ron Handyman L.L.C. | UNKNOWN | no-account-evidenced | PING event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7 (observation: "none had a published phone, email, or website" for the 3 qualified filings) | high (that no account is evidenced; not proof none exists) | 2026-09-14T19:45:00Z |
| Tote and Trailer Moving LLC (Grand Junction CO moving, SOS formation 2026-06-24) | UNKNOWN | no-account-evidenced | PING event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7 (observation: "none had a published phone, email, or website" for the 3 qualified filings) | high (that no account is evidenced; not proof none exists) | 2026-09-14T19:45:00Z |
| AB Steel LLC (Grand Junction CO fence/steel/welding, SOS formation 2026-06-23) | UNKNOWN | no-account-evidenced | PING event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7 (observation: "none had a published phone, email, or website" for the 3 qualified filings) | high (that no account is evidenced; not proof none exists) | 2026-09-14T19:45:00Z |
| Captain Ron Handyman L.L.C. (Grand Junction CO handyman, SOS formation 2026-07-14) | UNKNOWN | no-account-evidenced | RD-20260914-01 research pass, evidence ~/workspace/tandem/routing-evidence/rd-20260914-01-research.md (two read-only web searches 2026-09-14: only CDOS filing mirrors; no website, phone, GBP, or Facebook page for the Grand Junction entity; other-state "Ron/Captain Ron" hits excluded as distinct entities) | high (that no account is evidenced; not proof none exists) | 2026-09-14T20:05:00Z |

## Changelog (append-only; corrections are new rows, never edits)

* 2026-09-14T19:45:00Z: log created; seeded with identity entries for the
  three Round 52 genuinely-new Colorado filings. No platform accounts are
  evidenced for any of them as of this timestamp.
* 2026-09-14T20:05:00Z: RD-20260914-01 research pass reconfirmed
  no-account-evidenced for Captain Ron Handyman L.L.C. (new table row, not
  an edit). The 19:45 row for this entity stands unmodified; this row adds
  the second independent negative evidence.
