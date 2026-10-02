# Live Competitive Clowning: Phased Implementation Plan

Nolan's directive, 2026-09-14. The meme layer is not the product. It is a
real-time presentation and distribution surface over the competitive
intelligence system. The eventual loop:

LIVE SIGNAL -> PING EVIDENCE -> PATTERN DETECTION -> VERIFIED/PROVISIONAL
STATUS -> OPPORTUNITY -> MEME/REPLY -> HUMAN APPROVAL -> LIVE CONTENT ->
RESPONSE -> NEW EVIDENCE

Build toward the livestream without building the livestream.

## Phase 0: MVP (now)

Extend the existing meme machinery, do not replace it. New object:
PATTERN_OBJECT. New artifacts: pattern schema + validator, three-mode
renderer (educate/clown/live), receipt-cam format, ranked live queue with
freshness windows, evidence-only scoreboard. First patterns built from the
real 2026-09-14 Grand Junction map seed. Q10 added to the arbitrage queue
(booking-path composition, discovered by the pattern pass).

MVP acceptance criteria (falsifiable):

1. Three or more pattern objects exist, each with observation_count >= 2,
   evidence references into the competitive map, a verification state, and
   public-safe text that passes the no-named-business validator.
2. Every pattern renders educate, clown, and live variants from the same
   evidence object, and no variant asserts more than the verified
   observation supports.
3. The live queue ranks every candidate by
   evidence_quality x novelty x entertainment x market_relevance x
   actionable_insight, each candidate carries a freshness window, and a
   past-window non-durable candidate ranks below its fresh self.
4. The scoreboard contains zero fabricated scores: every populated cell
   cites evidence, every unpopulated cell says UNKNOWN.
5. No code path publishes or tags automatically. Promotion requires human
   approval. The composer has no publish function.
6. The full chain is inspectable from files alone: for any queued
   candidate, trace LIVE SIGNAL -> PATTERN -> RECEIPT -> OPPORTUNITY ->
   CLOWN -> APPROVAL without asking anyone.

## Phase 1: live signal candidates

The existing marketing-intel rotation (h-brief) starts emitting pattern
candidates, not just business findings: "N businesses exhibit X" with
counts, evidence refs, and verification state. The pattern aggregator
merges candidates into pattern objects, bumps observation_count, and
refreshes freshness windows. Auto-downgrade of stale non-durable patterns
runs inside the ranker, not as a separate job. Outcome capture begins:
posted content gets views/reactions/comments/shares/saves/conversation/
lead fields filled from real platform metrics, never invented.

## Phase 2: live-feed intelligence prep

The chain LIVE SIGNAL -> WHAT PING KNOWS -> WHAT IS NEW -> WHY IT
MATTERS -> THE JOKE -> OPTIONAL ACTIONABLE TAKEAWAY becomes a real
composer input format, fed by pattern objects plus fresh signals. Host
commentary drafts render in the live voice ("Okay, PING just found
something interesting...") with the receipt attached. Still no streaming
platform. The approval queue gains a live-priority lane: patterns with
high novelty x market_relevance surface first.

## Phase 3: the window (future, not now)

Only when Phase 1 outcome data shows FUNNY + USEFUL + BUSINESS RESULT
patterns worth amplifying: a live interface consuming the queue, host
approval before broadcast, audience response captured as outcome
evidence back into PING. The livestream becomes the window into the
machine. Nothing in Phase 3 is built until Phase 1 proves the content
earns it.

## Standing rules for all phases

- The joke is NEVER evidence. Meme exaggeration is allowed only where the
  underlying observation stays materially truthful.
- PATTERN > PERSON. Public default is market patterns, never individual
  businesses. Internal evidence may name businesses; public text never
  does without a separate explicit approval.
- Never tag, never harass, never dogpile, never encourage the audience to
  contact anyone.
- A quiet queue beats a fabricated queue. Do not manufacture content to
  keep it full.
- No second knowledge authority, no new event system, database,
  scheduler, or intelligence store. Pattern objects are
  presentation/distribution artifacts. PING stays the authority.
- Optimize for TRUTH x ENTERTAINMENT x USEFULNESS x COMPETITIVE
  ADVANTAGE. Never for outrage alone.
- Surface only: FAILURE, IMPORTANT RESPONSE REQUIRED, NEW
  SELF-IMPROVEMENT, BLOCKED.
- When the machinery finds a genuinely high-leverage capability, it goes
  into the arbitrage queue, not just into a joke.
