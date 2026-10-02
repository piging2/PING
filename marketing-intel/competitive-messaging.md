# Competitive Messaging Evidence Base

Living document. Nolan's directive 2026-09-14. The marketing messaging layer
for PING Social and the Business Agent.

## The object layer

Jokes are now meme objects, not prose. `meme-objects/` holds the schema
(SCHEMA.md), the validator and draft composer (compose_meme.py), the
named-business blocklist (business-names.txt), and the seed objects. Every
object follows the five-layer chain: observation -> receipt -> implication ->
opportunity -> joke. The validator enforces: all five layers present, no
named business anywhere in public text, explicit hedge on provisional
claims, no em dashes, and no automatic @ mentions. Drafts render to
`meme-drafts.json`; human approval flips an object to approved; promotion
moves it to `meme-queue.json` as a pending item for the PING Social queue.
The devices below are the families those objects belong to.

## The rule that governs everything

No joke ships without a proven capability behind it. Every device draft
carries four fields:

1. THE ABSURDITY — a real, publicly evidenced industry absurdity.
2. THE MECHANISM — what actually makes the absurd thing work or fail.
3. WHAT WE COMPOSED — the capability built from existing infrastructure.
4. WHAT IT ACTUALLY DID — measured outcome, or the words NOT YET PROVEN.

Build the capability first. Then let the joke advertise the capability.

## Brand voice

Light-hearted competitive clowning. Not mean, not dishonest, not personal,
not defamatory. We clown the ridiculous complexity, bloated pricing, stale
playbooks, agency theater, dashboard obsession, and unnecessary SaaS stacks.

The joke: everyone else is selling the circus; we're building the machine
that runs backstage.

Confident technological mischief. The audience should feel let in on the joke.

Never claim "we are better than every agency." Never claim savings or
performance we cannot prove. Demonstrate the capability and let the
contrast speak.

Core contrast:

OLD WORLD: Agency -> SaaS -> dashboard -> spreadsheet -> human copy/paste ->
forgotten insight -> repeat

PING WORLD: Evidence -> research -> verification -> persistent intelligence ->
decision -> action -> outcome -> learning

The punchline emerges from the difference. Never forced.

## Recurring devices

### THE MARKETING CIRCUS

"Welcome to the circus. There are 14 dashboards. Nobody knows where the
customer went."

Use for: dashboard obsession, metric theater, tools that report instead of
act. Mechanism to show: the PING decision loop that preserved what happened
and why.

### THE SAAS STACK GRAVEYARD

"$97/month for this. $149/month for that. $299/month for the thing that
connects the first two."

Then: "Or we could just make the machines talk."

Use for: stacked subscriptions that duplicate each other. Every price named
must be real and sourced. The composed alternative must actually exist in
our stack.

### AGENCY MAGIC TRICK

"Step 1: research your competitors. Step 2: put it in a PDF. Step 3: invoice
you. Step 4: never look at it again."

Use for: strategy-as-spreadsheet, research that is never reused. Contrast
with the persistent intelligence loop: research that compounds.

### THE PING RECEIPT

Instead of "we use advanced AI," show:

FOUND -> VERIFIED -> STORED -> REUSED -> DECISION -> RESULT

The receipt is the product. Use for: any proven capability. The receipt must
be real, with dates and evidence behind every arrow.

## Feeding rules

The existing Marketing Intelligence research stream feeds this file. For
every finding (agency service, SaaS workflow, expensive capability,
open-source equivalent, automation mechanism, growth tactic, industry pain),
ask:

- Can PING/Pig/Orca already reproduce this?
- Can we compose it from existing infrastructure?
- Can we demonstrate it publicly?
- Is there a funny but truthful way to expose the unnecessary complexity?

If the answer to the first three is no, it stays in the research file, not
in the messaging file. Marketing never leads capability.

## Voice in practice

"We're not mad at marketing agencies. We're just slightly concerned about
how many spreadsheets are involved."

"Your marketing system actually remembers why it did what it did."

Funny. True. And whenever possible, the demo is the punchline.

## Connection to the content queue

`~/workspace/ping-content/queue.json` draws from this file, never the
reverse. A device enters the queue only when its capability reaches
section 13 of the competitive tech map (verified competitive advantages).
Unproven devices stay here as drafts with their evidence status marked.
