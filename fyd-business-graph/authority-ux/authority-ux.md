# Authority UX by Consequence

Binding source: `~/workspace/directives/2026-10-04-backend-assault-narrowed.md` section 14.
Machine-readable policy: `authority_tiers.py` (`classify(action)`).

Authority scales with consequence, not with nervousness. The plumber experiences
"FYD handles things," not 47 security questions.

## The four tiers

| Tier | Rule | What the UX demands |
|---|---|---|
| LOW | Change a local draft, reorder a private plan, generate a preview, analyze data. | Automatic. No question. Log a receipt so it is observable later. |
| MEDIUM | Change what visitors see on the public FYD presentation. | Preview with easy undo. Show the change, let the owner revert in one step. No approval gate. |
| HIGH | Send a communication, publish to an external channel, spend any money (> $0), modify an external account. | Explicit authorization per policy. The owner says yes; the system executes. |
| VERY HIGH | Large spend (>= $500), large audience (>= 10,000), or an irreversible external action. | Explicit bounded approval: scope + limit + expiry. "Yes, spend up to $X on this campaign, for these two weeks, then stop." |

UNKNOWN (unrecognized action kind) is fail-closed: it never auto-dispatches and is
treated as requiring at least HIGH-level explicit authorization until the kind is
classified.

## Why these boundaries

- **Spend > $0 is HIGH.** Any real money leaving the business is a consequence the
  owner must have chosen. There is no "small enough to skip" spend: $1 today is
  the same code path as $1,000 tomorrow, and the owner should see it at least once.
- **Spend >= $500 is VERY HIGH.** $500 is a meaningful line for a home service
  business: a real ad buy, not a test. At that level "yes" is not enough; the
  approval needs a ceiling (scope), an amount (limit), and a window (expiry), or
  a small test silently becomes a large burn.
- **Audience >= 10,000 is VERY HIGH.** Ten thousand people is a reputation-scale
  audience. A mistake there is not a typo; it is a public event. Below that, a
  send is still HIGH (explicit yes) but one bounded approval can cover a whole
  list send.
- **Irreversible + external is VERY HIGH.** If it leaves FYD's control and cannot
  be taken back, the approval must be bounded. Reversibility is judged at
  classification time: a queued campaign send is still cancelable (HIGH); a send
  that cannot be unsent is not. Missing reversibility data fails closed to
  VERY HIGH for external actions.
- **External publish/send is at least HIGH.** Once it leaves the building, the
  owner owns the consequence. LOW is strictly local-only.

## Worked examples

### 1. Draft campaign tweak (LOW)
The owner says "make the emergency plumbing headline punchier." FYD rewrites the
copy in the draft CampaignSpec. Nobody sees it; nothing is sent; nothing is spent.
Tier: LOW. The system just does it, logs a receipt, and shows the new draft.

### 2. Site headline change (MEDIUM)
The owner approves the new headline for the live site. This changes what visitors
see, so it is not LOW, but it is fully reversible (the compiler can regenerate the
old one) and costs nothing.
Tier: MEDIUM. The owner sees a preview of the changed homepage and can undo with
one click. No approval ceremony.

### 3. Sending an approved campaign to 5,000 people (HIGH)
The campaign is approved and queued. 5,000 people is below the 10,000 audience
line, there is no spend, and the queued send is still cancelable.
Tier: HIGH. The owner gives explicit authorization ("yes, send it"), the system
sends once, receipts are recorded. If the same send were already dispatched and
could not be unsent, it would be VERY HIGH.

### 4. $2,000 ad buy (VERY HIGH)
$2,000 exceeds the $500 spend line regardless of audience or reversibility.
Tier: VERY HIGH. The owner gives a bounded approval: scope (this campaign),
limit (up to $2,000), expiry (this two-week flight). The compiler enforces all
three; when the limit or the window is hit, spending stops without a second ask.

## Compiler contract

The campaign compiler calls `classify(action)` for every planned action BEFORE
anything reaches an owner or an external channel. Classification is deterministic
software: explicit if/elif over kind, spend, audience, reversibility, external.
No LLM judgment, no tuned thresholds at runtime. The compiler must supply
explicit `reversible` and `external` values for any HIGH-kind action; omission
fails closed.
