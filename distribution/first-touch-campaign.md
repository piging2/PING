# First-Touch Campaign: PING / FYD Creator Outreach

Status: PREPARED, NOT SENT. Prepared 2026-09-23 ~13:30 MDT by the creator-pool
child agent under CEO MODE standing authorization (Nolan, 2026-09-23 12:55 MDT).
Requires coordinator review before any send. Nothing in this file authorizes sending.

## The draft (Nolan's text verbatim; only mechanical first-name substitution)

Hi [First Name] -- I'm working on PING, a new platform that turns an existing online presence into an intelligent, interactive web and social presence called FYD.

We're starting with people who already have meaningful audiences, and we'd be happy to build your initial FYD presence for free using the public content and sites you already have.

There's nothing you need to rebuild or migrate. The idea is to show you what PING can understand and create from the presence you've already built.

If you're interested, I'll send you a quick example and we can build yours.

-- Nolan / PING

Rules for this message class: no fake familiarity, no fabricated compliments, no
pretending Nolan watches their content, no AI-generated "loved your recent post"
lines. The draft above is fixed; only [First Name] is substituted.

## Bounded cohort (10)

All ten are in `creator-pool.jsonl` with `cohort_first_touch: true`. Dedup ran
2026-09-23 against pipeline.md, all outreach JSONL, action-intent-ledger.jsonl,
action-truth.jsonl, email queues, and drafts/: 0 collisions.

| # | Name | Platform | Contact route | Why this route is legitimate |
|---|---|---|---|---|
| 1 | Aaron Witt | IG 1M + Dirt Talk podcast | dirttalk@buildwitt.com | Public podcast contact email published in the Dirt Talk by BuildWitt show notes on iHeart ("Questions or feedback? Email us at dirttalk@buildwitt.com!") |
| 2 | Jeff Thorman | IG 702.6K + YT 4M+ | merch@homerenovisiondiy.com | Published on his own website's FAQ page (homerenovisiondiy.com/pages/faq); a partnerships business email is also published in his public IG bio |
| 3 | Jason Russell (Dr Decks) | IG 490.4K + YT | Business email in public IG bio at drdecks.com | Creator-published in his own bio at his own business domain |
| 4 | Justin Metzler | IG 423K | Collabs email via bluecollarmgmt.com | His public bio literally says "For Collabs:" followed by the address; a creator-stated management contact |
| 5 | Tyler Farrell (Killowen Homes) | IG 402.2K | Business email in public IG bio at killowenhomes.com | Creator-published in his own bio at his business domain (Killowen Homes, UT) |
| 6 | Dennis Comstock (Builder Brigade) | IG 914.2K | Business email in public IG bio at builderbrigade.com | Creator-published in his own bio at his own domain |
| 7 | Priscilla La Ruffera | IG 427.7K | Business email in public IG bio | Contractor and founder (@nowplrconstruction, Miami); bio-published business email |
| 8 | Timothy Uhler | IG 426.4K | Business email in public IG bio at awesomeframers.com | Creator-published in his own bio at his own domain; 20+ year JLC/Fine Homebuilding contributor |
| 9 | Lydia Crowder (Drywall Shorty) | IG 403.2K | Business email in public IG bio | Bio carries an explicit email glyph; @thebuildshow contributor |
| 10 | Steve Ramsey | YT 1.97M + FB 851.2K | Business email in public bio at zram.com | Creator-published business email; longest-running beginner woodworking educator on YouTube |

First-name substitutions: Aaron, Jeff, Jason, Justin, Tyler, Dennis, Priscilla,
Timothy, Lydia, Steve.

Alternates (pool members with routes, held for wave 2): Leah Bolden
(@seejanedrill.com bio email), April Wilkerson (bio email), Alex D'Alessio
(@realiferenovation.com bio email), Shanty2Chic (explicit "Email 4 Collabs").

## Pre-send verification (must complete before any send)

1. Read the exact bio email address from each creator's LIVE public profile.
   Aggregator pages redact the local-part; the domain is confirmed, the full
   address is not. Do not guess the local-part.
2. Re-run dedup against live outreach state immediately before sending.
3. Confirm no suppression, no prior send, no active follow-up ladder for the
   identity in canonical structured state.
4. Confirm the route is still published (bio/FAQ unchanged).

## Send rules

PROSPECT + CAMPAIGN + CHANNEL + MESSAGE CLASS
  -> suppression check -> prior-send check -> eligibility check
  -> capability check -> policy check -> send.

- Canonical structured state wins every disagreement. Notes and free text
  never override it.
- An UNKNOWN external result (bounce ambiguity, no read receipt, unclear
  delivery) reconciles before any retry. No blind re-sends.
- Duplicates must equal 0: one first-touch per identity, ever, across all
  channels and campaigns.
- This is a general first-touch (message class: creator-first-touch). It does
  not count against the home-service cold-email cap; it is a separate campaign
  with its own accounting once sends begin.
- Replies route to the coordinator immediately; routine sends stay quiet per
  reporting discipline.

## Flags for Nolan's call

- BiggerPockets is in the pool as a BRAND entity (Denver HQ, 1.3M YT). The
  draft is written for a person; it needs a named recipient (e.g., CEO Scott
  Trench or founder Josh Dorkin) and your call before use.
- Victor Oliveira (@thegoodboss, ~890K TikTok): the count evidence is a video
  title/description, weaker than the rest. Kept in pool, out of cohort.
- No contact-route discovery was done for: Cody Romer, Jon Peters, The Honest
  Carpenter, Vancouver Carpenter, Scott Wadsworth, Clayton Morris, James
  Hamilton. They stay in the pool as route-discovery backlog.
