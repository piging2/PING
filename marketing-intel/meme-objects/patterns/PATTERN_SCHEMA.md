# Pattern Object Schema

A PATTERN_OBJECT aggregates one recurring market pattern across many
businesses. It is a presentation/distribution artifact, NOT a second
knowledge authority. PING remains the authority for reusable intelligence.

The five-layer chain is inherited from the meme layer:

```
Observation -> Receipt -> Verification status -> Opportunity -> Presentation
```

The joke is NEVER evidence. A pattern object may exaggerate for humor
only where the underlying observation stays materially truthful.

## Fields

| Field | Required | Notes |
|---|---|---|
| `pattern_id` | yes | snake_case, unique |
| `observation` | yes | the pattern in one plain sentence, pattern-level |
| `observation_count` | yes | integer >= 2; the number of businesses observed |
| `affected_market` | yes | e.g. "Grand Junction home services" |
| `category` | yes | e.g. "after-hours conversion", "booking", "web tech" |
| `evidence_refs` | yes | list of pointers into map/discoveries/queue files |
| `verification_state` | yes | VERIFIED / OBSERVED / PROVISIONAL |
| `confidence` | yes | 0.0-1.0, the composer's confidence the pattern is real |
| `mechanism` | yes | what actually produces the pattern |
| `competitive_implication` | yes | what the pattern means for the market |
| `opportunity` | yes | the deployable opportunity, linked to an arbitrage item where one exists |
| `joke_candidates` | yes | list of 1+ punchlines, all downstream of the observation |
| `seriousness` | yes | LOW / MEDIUM / HIGH; HIGH means the joke could read as an attack and needs extra approval care |
| `risk_notes` | if MEDIUM+ | why, and what keeps it fair |
| `public_safe_text` | yes | the pattern stated for public use; must pass the no-name validator |
| `durable` | yes | true if the pattern is structural (exempt from freshness downgrade) |
| `fresh_until` | yes | YYYY-MM-DD; past this date a non-durable pattern is downgraded |
| `approval_state` | yes | draft / approved / queued / posted |
| `publication_state` | yes | where it stands in the distribution pipeline |
| `outcome_evidence` | yes | object; empty until content runs, then real metrics only |
| `approved_by` | if approved | who, and date |

## The three entertainment modes

Every pattern renders all three from the same evidence object:

- EDUCATE: "Here is a surprisingly common problem in local-service marketing."
- CLOWN: the punchline, pattern-level, never personal.
- LIVE: host commentary voice ("Okay, PING just found something
  interesting...") followed by what was observed and why it matters.

## Ranking

```
score = evidence_quality x novelty x entertainment x market_relevance x actionable_insight
```

Each factor 0.0-1.0, set by the composer from the object's fields and
freshness. Freshness multiplier: 1.0 when fresh, 0.5 when past
`fresh_until` and not durable. Durable patterns keep 1.0.

## Hard rules (enforced by compose_pattern.py)

1. observation_count >= 2. A single business is an observation, not a pattern.
2. No named business in public_safe_text, joke_candidates, or rendered modes.
   Scanned against ../business-names.txt.
3. PROVISIONAL patterns must carry the hedge inside every joke candidate.
4. Every populated scoreboard-style claim cites evidence_refs.
5. No em dashes in public text.
6. No publish function exists. Approval is human. Distribution is human.
