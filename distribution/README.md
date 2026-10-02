# Creator Discovery Pool

Built 2026-09-23 by the CEO MODE distribution-wave coordinator (creator-pool child agent).
Standing authorization: Nolan, CEO MODE directive 2026-09-23 12:55 MDT.

## What this is

`creator-pool.jsonl` is the distribution wave's core asset: a structured pool of
public-facing creators/influencers with 100K+ followers, seeded for PING/FYD
first-touch outreach. Minimum info per candidate, no dossiers.

## Schema (one JSON object per line)

| Field | Meaning |
|---|---|
| `identity` | Person or brand name |
| `display_name` | Name plus primary public handle |
| `platform` | Primary platform (`instagram`, `youtube`, `tiktok`) |
| `profile_handle` | Public handle as observed |
| `profile_url` | Public profile URL. Canonical handle mapping unless a verbatim source URL was available |
| `profile_url_derived` | `true` when the URL is the canonical handle mapping (not copied from a source) |
| `public_follower_count` | Numeric count on the primary platform |
| `count_label` | Human-readable count as observed |
| `observed_at` | ISO date the count was observed (2026-09-23 for seed) |
| `source_evidence` | How the count and identity were observed (named source + what it said) |
| `website` | Only when explicitly linked in a source read (bio email domain noted as such) |
| `contact_route` | Only when publicly provided for business/contact purposes (bio business email, public podcast contact, own-site FAQ email, stated management contact). Data-broker guesses are never used |
| `cross_platform` | Other public presences with audience sizes where observed |
| `status` | Lifecycle: `discovered` (seed state) |
| `cohort_first_touch` | `true` for the bounded first-touch cohort (10) |
| `dedup_checked_at` | When dedup ran |
| `dedup_result` | Dedup outcome vs prior outreach state |
| `notes` | Fit notes, caveats, evidence-strength flags |

## Collection method (public surface only)

1. Web search for trade/business/creator listicles that publish per-creator
   follower counts (feedspot influencer lists, channel analytics pages,
   reputable press).
2. Every count is grounded in a named source read during the session; the
   `source_evidence` field quotes what the source said.
3. No private contact info inferred. No scraping around access controls.
   Ambiguous identity matches stay out; merges only on strong evidence
   (explicit cross-link, same website, sameAs/rel=me, verified public claim).
4. Aggregator pages (feedspot) redact email local-parts to non-logged-in
   readers; where a bio-published business email is cited, the domain is
   recorded and the exact address must be read from the live public profile
   before any send.

## Dedup

Every candidate was checked 2026-09-23 against the canonical outreach state:
`~/workspace/outreach/pipeline.md` (571 names), all outreach JSONL prospect
files, `action-intent-ledger.jsonl`, `action-truth.jsonl`, the dated
`email-queue-*.md` files, and `drafts/`. Result: **0 collisions** across all
29 candidates. A frozen copy of the checked index lives at
`dedup-source-index.json` in this directory. Re-run dedup against live state
again immediately before any send.

## Seed stats (2026-09-23)

- 29 candidates, all 100K+ with sourced evidence
- 17 cross-platform (2+ public presences)
- 10 in the bounded first-touch cohort (`cohort_first_touch: true`)
- Segments: trades/construction creators (16), woodworking/maker (7),
  real estate/business (4), DIY/home (2)

## Rules for future use

- This pool is preparation, not permission. Nothing here is cleared to send
  until the coordinator reviews the cohort and the send rules in
  `first-touch-campaign.md` pass.
- Re-verify follower counts and contact routes at send time; counts decay.
- Never add a candidate without `source_evidence`. Never promote a
  data-broker email into `contact_route`.
