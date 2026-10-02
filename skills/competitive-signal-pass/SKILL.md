---
name: "competitive_signal_pass"
description: "Run one deterministic competitive-intelligence pass: evidence in, hard gates decide, exactly one terminal state out (PASS / NO_VALUE / BLOCKED / FAILURE). The LLM generates candidates; deterministic machinery decides what survives. Never writes to PING."
---

# Competitive Signal Pass

## Purpose

Turn the repeatable parts of competitive-intelligence work into deterministic
machinery so the agent reasons less and the infrastructure decides more.
One invocation executes the full lifecycle and terminates in exactly one
terminal state. The agent gets a tiny machine-readable result, not a
narrative.

Pipeline:

```
INPUT -> EVIDENCE COLLECTION -> NORMALIZATION -> DEDUPLICATION
  -> VERIFICATION -> PATTERN AGGREGATION -> ELIGIBILITY
  -> PRESENTATION GENERATION -> PUBLIC-SAFETY GATE
  -> ARBITRAGE DETECTION -> OUTCOME RECORD -> SELF-AUDIT
```

## The core distinction

LLM = generates candidates (discovers, classifies, proposes patterns,
proposes jokes, proposes opportunities, ranks).

Deterministic machinery = decides what is allowed to survive (evidence
gates, pattern compiler, eligibility, safety gates).

The model may NOT: establish truth, promote knowledge into PING, override
verification, override hard eligibility, bypass safety gates, publish
automatically, circumvent platform restrictions, or create hidden
authority.

## Terminal states

Every invocation ends in exactly one:

- `PASS` — pattern eligible, variants generated, all gates green.
- `NO_VALUE` — insufficient evidence, below minimums, or stale with
  nothing durable. Not a failure; nothing to act on.
- `BLOCKED` — a hard boundary was hit (unresolved contradiction, missing
  receipt, individual targeting, platform restriction). Do not retry
  around it; fix the cause.
- `FAILURE` — the machinery itself broke (unreadable evidence, invariant
  violated). Investigate the skill, not the market.

## Result contract

Stdout is one JSON object, exactly these fields:

```json
{
  "status": "PASS | NO_VALUE | BLOCKED | FAILURE",
  "pattern_id": "pattern_no_booking_path",
  "evidence_count": 12,
  "verified_count": 12,
  "verification_state": "OBSERVED",
  "publication_eligible": true,
  "arbitrage_eligible": true,
  "next_action": "awaiting human approval",
  "self_audit_status": "ok"
}
```

Narrative appears only in the run artifact, and only to explain failure,
blocking, or genuine self-improvement.

## Usage

```bash
# Run the pass for one existing pattern object
python3 signal_pass.py run pattern_no_booking_path

# Run for every pattern object in the patterns directory
python3 signal_pass.py run --all

# Run the pass over raw evidence candidates (adversarial testing, new signals)
python3 signal_pass.py run --evidence path/to/evidence.json

# Acceptance test: proves the gates, the determinism, and the PING boundary
python3 acceptance_test.py

# Production cycle: run every pattern, diff against the last cycle,
# surface only what changed (FAILURE, BLOCKED, NEW, RESOLVED, RETIRED,
# NEW_ARBITRAGE). Everything else stays quiet.
python3 signal_pass.py cycle

# Self-audit report: which pipeline parts still need nondeterministic
# agent reasoning, ranked by observed frequency x risk
python3 signal_pass.py report
```

Raw evidence records look like this:

```json
[
  {
    "id": "ev-001",
    "observation": "Site advertises 24/7 service with no after-hours path",
    "source": "competitive-tech-map.md section 1",
    "timestamp": "2026-09-14",
    "receipt": "Static page text shows phone + contact form only",
    "verification": "OBSERVED",
    "contradictions": [],
    "category": "after-hours conversion"
  }
]
```

## The pattern compiler

Before any composition is allowed, deterministic code computes an
intermediate representation from actual evidence only:

- candidate_count, verified_count, verification_ratio
- independent_source_count
- freshness (fresh / stale / durable)
- category, recurrence
- evidence_completeness (required fields present)
- contradiction state (none / resolved / unresolved)
- public-risk state (LOW / MEDIUM / HIGH)

Hard gates, evaluated in order:

1. candidate_count < 2 → `NO_VALUE` (below minimum evidence)
2. weighted verification_ratio < 0.5 → `NO_VALUE` (VERIFIED/OBSERVED count
   full weight, PROVISIONAL half weight; the hedge gate, not this gate,
   carries provisional uncertainty)
3. any unresolved contradiction → `BLOCKED`
4. any record missing receipt, source, or timestamp → `BLOCKED`
5. public text names a business → `BLOCKED`
6. PROVISIONAL without the hedge in every variant → `BLOCKED`
7. stale and not durable → downgrade; score below floor → `NO_VALUE`
8. otherwise → `COMPOSE`: eligible for variant generation

Nothing is fabricated. Confidence and scores are computed, never invented.

## Presentation

For an eligible pattern, the skill renders the three existing modes
(EDUCATE / CLOWN / LIVE) from the same evidence object via the meme
machinery's renderer. The joke remains presentation; the joke is never
evidence.

## Arbitrage detection

For every validated pattern the skill asks: is there a reusable
competitive mechanism here? If yes it emits an arbitrage candidate
(mechanism, observed evidence, current industry approach, likely
commercial solution, open/free alternative, existing PING/Pig/Orca
capability, missing capability, smallest experiment, kill threshold).
Filing it into the arbitrage queue stays a human/agent decision; the
skill reports `arbitrage_eligible: true` and the candidate path.

## Self-audit and the capability-gap ledger

Every run writes an artifact to `runs/` containing everything a fresh
agent needs to answer: what evidence entered, what survived, what pattern
was produced, why it was eligible, what the model generated, what the
gates decided, whether anything published, whether arbitrage was found,
what action occurred, and what should become deterministic next.

`signal_pass.py cycle` is the first promoted primitive from this ledger:
per-cycle surfacing decisions (what changed, what to tell Nolan) used to
require agent reasoning every cycle. Now `diff_cycles` decides
deterministically from status transitions. Highest frequency (every
cycle), highest risk (missed BLOCKED/FAILURE, or noise against the
standing surface rules). The agent delivers what the diff surfaced; it no
longer reasons about surfacing.

`signal_pass.py report` answers from evidence which parts still need the
agent, ranked by observed frequency x risk. Current ranking: arbitrage
candidate filing (next promotion candidate, not promoted yet), joke
quality judgment (stays human by design), per-business evidence detail
(structural, by design).

Repeated work observed across runs is classified in `gap_ledger.json`:

- KEEP_REASONING — genuinely needs judgment
- AUTOMATABLE — can become deterministic (gets a spec + test)
- ALREADY_AUTOMATED
- BLOCKED — cannot be automated safely
- NOT_WORTH_AUTOMATING

The strategic objective: repeated agent reasoning → rule → test →
deterministic operation → auditable artifact, until the agent is small
and the substrate is strong.

## Platform automation safety

Durable principle: respect platform constraints, use bounded authorized
automation, and fail closed when platform behavior indicates a
restriction. Never design around evading detection or defeating a
restriction.

The skill owns the deterministic safety contract for any platform
action it ever takes:

- volume bounds, pacing bounds, authorization checks
- session-health checks, checkpoint detection, failure detection
- stop conditions, retry limits, audit records

If a platform presents a warning, checkpoint, restriction, auth failure,
or action block: STOP, classify `BLOCKED`. Do not attempt to circumvent
it. Retries happen only under an explicitly permitted recovery policy.

This skill currently performs zero platform actions; the contract above
is what any future consumer (including a live interface) must implement.

## PING boundary

This skill has no code path that writes to PING. Pattern objects are
presentation/distribution artifacts. The acceptance test proves the
boundary by asserting it. An agent can be wrong inside this skill
without corrupting PING, because the skill cannot reach PING.

## What this skill does not do

No database, no scheduler, no event system, no knowledge store, no new
authority, no livestream infrastructure, no auto-publish, no auto-tagging,
no weakened verification.
