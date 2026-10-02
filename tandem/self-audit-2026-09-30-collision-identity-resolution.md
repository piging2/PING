# Self-audit note: collision-guard identity resolution (2026-09-30, meta-ai-intel-pass)

## What the agent had to reason about
During the distill sweep of `20260930-030418-b-new-business-radar.md`, `check-prospect-collision.py`
fired a substring COLLISION on "Mesa Concrete LLC" -> pipeline.md L1302 "Pine Mesa Concrete LLC".
The name-substring hit was a FALSE POSITIVE: the two are provably distinct businesses.

Evidence used to resolve identity (this run's artifacts):
- Mesa Concrete LLC (Delta): phone (970) 417-0167, FB page profile.php?id=100093617135413,
  5584 Sunridge Dr Delta CO, GBP place_id 1366898000590070.
- Pine Mesa Concrete LLC (Montrose/Olathe): phone (970) 209-3812, FB page profile.php?id=100090866749997,
  4016 5500 Rd Olathe CO.
Different phone + different platform page ID + different town = distinct businesses.
The guard also fired a SUSPECT variant hit on "Montrose Elite LLC" against an unrelated
"Elite Radon Specialists LLC" radon-skips line; same resolution procedure applied.

This is the mirror image of the 2026-09-29 lesson already in AGENTS.md (guard MISSED a
"Charlie's Pest Control Montrose" name variant = false negative). Together they show the
guard's name matching is neither sound nor complete in either direction.

## The rule (specified precisely)
A collision-guard name hit is an identity CANDIDATE, never a verdict.
Identity is decided by contact evidence only: phone, street address, or platform page ID
(FB profile/page ID, GBP place_id). Decision procedure:
- >=2 independent contact points match existing record -> SAME business: block, enrich existing row.
- >=1 contact point provably different (different phone, different page ID, different town
  with no shared contact) -> DISTINCT businesses: clear, record the resolving evidence.
- No contact evidence available on either side -> UNKNOWN: fail closed (do not merge as new;
  note the unresolved hit).
- Name-substring or name-variant alone NEVER decides, in either direction.

## Unit cases (to be added as tests before automating)
1. Exact name + same phone -> block (same business).
2. Substring name + different phone + different page ID -> clear with evidence (this run's case).
3. Substring name + same phone -> block (same business, variant name).
4. Variant name + no contact overlap on either side -> UNKNOWN, fail closed, note unresolved.
5. Exact name + different phone + different town -> distinct (rebrand collision), clear with evidence.

## Automation design (deferred: implement + verify in a dev lane, not this cron pass)
Patch `check-prospect-collision.py` to (a) label every hit with its class
(exact/substring/variant) in machine-readable output, and (b) for non-exact hits, print the
existing record's contact fields (phone, address, page IDs) alongside the candidate name so
the operator resolves identity from evidence rather than from memory. Verify against the
unit cases above plus the 2026-09-29 blind-spot regression ("Charlie's Pest Control Montrose").
Do NOT weaken the fail-closed default: unresolved non-exact hits must still block merges
until a human or the identity procedure clears them.

## Not promoted this run
- The primary d-segment-deep-dive run (20260930-090434) was SIGTERM'd ~2 min after start
  (ledger outcome=unknown, classification=terminated_by_signal_TERM, sidecar stuck at "started").
  Cause unknown; the 2026-09-15 backgrounding warning covers turn-end kills, but this turn was
  still active and the previous pass's runs (up to 189s) survived backgrounding. No deterministic
  rule can be promoted from one unexplained kill; recorded as an infra observation for the
  engineering ledger, not a promoted rule. Next pass retries the slug (rotation anchors on
  non-ok latest run).
