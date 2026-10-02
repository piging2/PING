# Marketing Intelligence: Findings, Cycle 1

2026-09-14. Author: Pigi. Method: cross-industry mechanism scan (adjacent industries,
open source, free tier, self-hosted, API/CLI, existing PING/Pig/Quo capabilities),
compressed to findings below. Status: CHALLENGED 2026-09-14 by an independent
red-team pass (~/workspace/marketing-intel/challenge-report.md). Verdict: all five
original findings ACCEPTED WITH REVISIONS; D2 downgraded to HYPOTHESIS; D6 added
from the challenge. Every required revision (R1-R5 per finding) and grading
correction (G1-G5) is integrated below.

Cross-cutting rules from the challenge, binding on all findings:
- NOLAN-HOURS BUDGET (M2): every experiment states its Nolan-hours/month.
  Prioritization ranks on expected value per hour, not per dollar. "$0 software"
  never means $0 cost.
- CAPACITY CHECK (M3): before recommending any lead-generation mechanism, the
  Business Agent checks demand vs capacity. Many Western Slope trades are
  capacity-constrained, not lead-constrained; selling speed-to-lead to a shop
  that is booked out weeks is malpractice. The alternative pitch for full shops
  is selectivity and pricing power.
- QUO CONCENTRATION (M4): D1, D3, Q1, Q3, Q5 all route through Quo. That is
  correct composing, but it concentrates platform risk (price hikes, ToS
  changes, number-portability friction, Quo's own upsell pressure toward Sona).
  Keep an exit sketch: what moves where if Quo doubles prices.

---

## D1. The industry's flagship product is a configured automation Nolan already owns

What is working: "missed call text back" is the single most-sold product in
contractor marketing right now. A 2026-09-14 social sweep found 20+ vendors
selling it as their headline offer (Flozy Systems, Whale Web Designs, Slotted
Systems, ReplyON, RingBack, Contractor Pro, getbeepback, ToolBelt Co., Second
Ring, w3bly/Ava, Beckett Systems, Forward Dawn, DYZIGN LABS, Omnyx, Ai Business
Growth, Hexa, SocialJack, PradoAI, FizzScalez, Dryft Solutions, HomeServPros,
and Facebook pitchmen). Grade: OBSERVED vendor convergence. This is evidence of
demand for the product, explicitly not evidence that the product works. The
efficacy claim rests on the speed-to-lead data below, not on the vendor count.

Evidence grades:
- INDEPENDENTLY SUPPORTED: speed-to-lead effect. InsideSales/Oldroyd analysis of
  15,000+ leads: contacting within 5 minutes vs 30 minutes = 100x contact odds,
  21x qualification odds (observational operational data, 2007; widely replicated
  directionally). HBR audit of 2,241 firms: average response 42 hours; 37% under
  an hour; 23% never responded. Treat exact multipliers as directional, not
  precise; all concern contact/qualification odds, not completed-sale multipliers.
  Never quote them as revenue guarantees.
- CLAIMED BY VENDOR: Blazeo 2026 (573 service companies): 81.2% of slow
  responders lose leads vs 46.6% of fast responders; 24.6% respond slowly or not
  at all. Blazeo sells speed-to-lead products, so the numbers stay vendor-graded
  even though the direction is plausible. Same grade for Vendasta's "27% average
  missed inbound calls, ~$1,200 lost per missed call" and GoHighLevel-adjacent
  "62% of SMB calls unanswered, 85% never call back."
- KNOWN (official Quo documentation, quo.com, verified 2026-09-14): Quo
  (formerly OpenPhone) supports auto-replies with during-business-hours and
  after-business-hours variants, separate triggers for missed call with no
  voicemail, missed call with voicemail, and incoming message, plus duplicate
  suppression (max one auto-response per contact per 3 hours). Setup: Settings
  -> Phone numbers -> Auto-replies.

The mechanism (not the product): instant SMS on missed call -> two-way texting
-> booking. Nothing in it requires Podium ($399/mo), Operlyn ($79/mo), or
HighLevel ($97/mo). It requires a phone system with missed-call triggers and
an SMS sender. Nolan already pays for both inside Quo.

Honest client-side cost (R1): "Nolan already owns it" is true of Nolan, not of
the client. Each client needs their own Quo workspace (~$15/user/mo), US carrier
registration (10DLC; per Quo's own docs you cannot text US numbers without it),
their public number routed through Quo, and Nolan's configuration hours. Still
far cheaper than Podium/HighLevel, but it is an adoption project, not a $0
toggle. Price it that way in every pitch.

Compliance design (R3), up front not footnoted: registered 10DLC campaign,
"Reply STOP to opt out" language in automated messages per Quo's own guidance,
and a suppression log. A responsive text to someone who just called is lower
TCPA risk than cold outreach but not risk-free. No client runs this on an
unregistered number, ever.

Demand-gap AND capacity qualifier (R2): recommend only for clients with
demonstrable after-hours or on-job missed-call volume AND unmet capacity.
Many owner-operators answer on the second ring (their problem is interrupted
work, not missed calls); many shops are booked out weeks (faster response
changes nothing). Without the qualifier this is a solution in search of a
problem.

Thin moat note (R5): this is table stakes now, and the vendor wave is already
moving from text-back to AI answering. Quo's own docs upsell Sona, its AI voice
agent, on the same page as the auto-reply instructions. Selling "we set up
text-back" has a short shelf life. See D6.

Piggyback route: COMPOSE on Quo. Configure the during/after-hours variants per
client, measure recovered conversations and booked jobs, charge for the outcome
not the software. Estimated cost: ~2 Nolan-hours per client setup + ~1 hr/month
monitoring.

Business Agent decision it changes: for a client WITH the volume and capacity
qualifiers met, the default recommendation becomes "turn on Quo missed-call
text-back this week" instead of "consider a lead-management platform."

Falsification (pre-registered, R4): metric = missed-call-to-conversation rate;
minimum sample = 50 missed calls in the pilot window; kill threshold = under
15% conversation rate OR no booking lift vs the pre-period. Thresholds are set
before the pilot starts, not negotiated after. A compliance incident (carrier
complaint, registration rejection) pauses the pilot immediately.

## D2. Shared leads are a tax on slowness; owned signals are the arbitrage
## Status: HYPOTHESIS, not a finding (downgraded per challenge)

What is working: lead marketplaces (Angi, HomeAdvisor, Thumbtack) demonstrably
sell intent. Angi/HomeAdvisor leads run ~$20-85 each, often shared with 3-8
contractors (agency commentary; grade CASE-STUDY CLAIM, and note the sources
are agencies that sell alternatives to marketplaces). One composite estimate
puts Angi's lead spend near $542 per booked job: computed from Angi's 2024
SEC-reported $587.1M lead revenue over an ESTIMATED booked-job denominator.
Grade: CASE-STUDY CLAIM at best. The denominator is estimated, the inputs are
vendor-reported, and national blended numbers do not transfer cleanly to
Western Slope trade volumes. Quote the method alongside the number, always.

The hypothesis: the marketplace's real product is speed plus aggregation plus
homeowner brand trust plus zero-effort demand. The transferable idea is selling
high-intent demand itself rather than buying it shared. But this conflates
supply-side discovery with demand-side intent, and that is the hole: PING's
owned signals (SOS new-business radar, review complaints, chamber lists,
grand-opening posts) discover BUSINESSES (supply). A plumbing client's customer
acquisition needs DEMAND: homeowners with an active problem. The real
demand-side signals for trades are new-building permits, remodel permits, and
real-estate transactions. Permit-feed access is currently a gap, not an owned
capability.

What would promote this to a finding: name the demand-side signal per trade
before any pilot. If permit access cannot be obtained at reasonable cost, say
so and keep this as "unproven transfer."

Piggyback route if proven: the owned-signal stack pointed at the client's
customers instead of PING's prospects. Until then: no pilot, no pitch.

Business Agent decision it would change: when a client asks about buying
leads, the answer becomes a costed comparison (marketplace $/booked job vs
owned-signal pilot) instead of a vendor recommendation. Not yet earned.

Falsification (must be made runnable before it counts): pre-register what
counts as a booked job, the trade-adjusted benchmark and its source, minimum
pilot duration accounting for trade seasonality (30 days is short for
permit-driven trades), and the judge (Nolan). Until those exist, there is no
falsification, only a plan for one.

## D3. The review machine is a trigger and a log, not a $399 dashboard

What is working: review velocity and rating correlate with map-pack visibility
(directionally supported); review responses drive conversion and trust
(supported); review responses as a RANKING factor is UNVERIFIED (Google has
never confirmed it). Never quote the lumped version. The honest single-truck
price comparison is NiceJob/Grade.us at $75-150/mo, not only Podium's $399
multi-location price. The rejection still holds, and the honest comparison
makes it more credible, not less.

The mechanism: job completes -> timed SMS with the GBP review link ->
monitoring for new reviews -> fast owner response -> escalation on negatives.
Google Business Profile gives the review link free; it provides no automation.

Compliant loop design (R2), written into the finding: universal solicitation
(every customer gets one request, no sentiment pre-screening, no diverting
unhappy customers away from the review path), no on-site pressure or kiosks,
no staff naming in reviews, no incentives or quotas (per 2026 Google rules;
violations risk review removal and profile restriction). Negatives get a
SERVICE RECOVERY workflow, never a review-diversion path. The natural
temptation when productizing ("escalate on negatives") slides toward review
gating unless the design above is explicit. Any Google profile warning or
review-removal event kills the loop design immediately, not at day 60.

Honest cost (R5): SMS (~$0.01/msg) + 10DLC brand/campaign fees + the client's
Quo seat + the real labor of responding to reviews fast, especially negatives.
"Every dollar above $0.01/SMS is workflow" is only true if everyone's time is $0.

Piggyback route: COMPOSE. Quo SMS + a job-completion trigger + the existing
ledger for send/suppression logging + GBP free link. Dogfood on PING Social
proves only the mechanics (the loop fires, logs, suppresses); the falsification
requires a client pilot with real job volume, because dogfood sample size is
near zero. Note (M6): the referral ask (capability map #13) shares this
loop's trigger moment and channel; test review-request and referral-ask as ONE
touch, not two.

Business Agent decision it changes: never recommend a review platform before
the Quo-based loop has been tested on a client pilot and shown insufficient.
Platform purchase requires a demonstrated gap, not a sales call.

Falsification: client pilot, 60 days; review velocity and rating do not move
vs control businesses, or customers report annoyance, or any policy event
fires. If the loop works, the review-platform question is permanently closed.

## D4. Competitor watching is free; agencies sell the watching

What is working: the visible winners in each trade/town share observable
traits (review cadence, photo cadence, GBP post frequency, offer pages,
pricing pages). changedetection.io does the ongoing-watch portion as real
open-source software (verified via its GitHub: one docker command,
CSS/XPath/JSONPath filters, optional JS rendering). Semrush ($139/mo) and
Ahrefs ($129/mo) are expensive substitutes for the audit portion.

Honest hosting (R1): "$0 on existing infrastructure" is unverified for this
stack. Standing record: Docker Desktop will not start on the Pig, so "one
docker command" does not run there today. Options: pip-install on Pig
Windows, or the cloud VM, each with upkeep cost. Until the host is named and
proven running, the self-host cost stays UNVERIFIED.

ToS boundary (R2): GBP-linked business sites, permit feeds, and chamber lists
are fair game for automated watching. Google-owned surfaces (reviews, Maps)
are excluded: automated monitoring there violates Google's ToS and is
increasingly blocked technically. The seed list's "2 review pages for watched
prospects" is cut.

Honest cost (R3): the interpretation labor is the whole cost. Price it at
2-4 Nolan-hours/month and judge the experiment on signals per hour, not
signals per dollar.

Narrowed decision surface (R4): trade businesses move on seasons, supplier
prices, and capacity, not on each other's landing pages. The realistic value
is entrant detection and review/velocity surges, not "copy the mechanism"
broadly. Claim only the narrow surface unless broader value is demonstrated.

Piggyback route: COMPOSE. Standing watch list (top 3 visible winners per
trade per town, baseline recorded) + quarterly manual re-audit + automated
watch on 10 non-Google surfaces once the host is proven.

Business Agent decision it changes: competitive questions get answered from
the watch list with dated evidence instead of from memory or a vendor pitch.

Falsification: 30 days of automated watch; predefine "decision-changing"
(an entrant spotted, a velocity surge caught, a recommendation altered) and
the judge (Nolan) before the trial starts. A null in 30 days kills the
automated watch only, not the quarterly manual audit (seasonality: fall
furnace offers and spring AC pushes do not fit in 30 days).

## D5. Do not buy glue; the stack already is the glue (internal scope)

What is working: agencies run on Zapier ($19.99/mo for 750 tasks, scaling to
hundreds at volume), Make, or GoHighLevel workflows. The open-source
substitute is n8n (self-hosted, $0 license, ~$5-15/mo server). Public 2026
comparisons confirm the license math and the hidden costs (deployment,
uptime, proxies, storage, weekend failures). Symmetry note: bespoke scripts
share those failure modes with worse observability; the comparisons are
themselves vendor-adjacent content.

The finding, scoped (R3): for NOLAN'S INTERNAL machinery, the rejection
stands. Scripts + cron + event ledger + Pig + PING already implement every
required flow (scheduled passes, state, dedupe, verification gates,
emission, reconciliation). Adding n8n would be a second automation authority
with no demonstrated bottleneck. This does NOT automatically extend to
client-operated workflows: a client who must run something without Nolan may
be better served by a tool they can see and touch. That is a separate
decision per client.

Accepted tradeoff (R2): the real price of bespoke scripts is bus factor and
transferability. Only this team can debug them; a client can never take over;
every collaborator faces a custom stack instead of a documented visual tool.
n8n's value was never raw capability; it is debuggability and handoff. Named
and accepted, not pretended away.

Piggyback route: NONE. Explicit REJECT for internal glue.

Business Agent decision it changes: any "we need Zapier/n8n for this"
proposal must first show the failed script attempt and its cost. The default
answer is no.

Falsification (rewritten so it can fail, R1): an "integration failure" is a
client deliverable missed OR more than 4 hours of manual workaround in one
week on an integration the scripts were asked to handle. Judge: Nolan.
Plus a time-boxed review: revisit annually regardless of failure count, so
the rejection cannot survive through avoidance (integrations never attempted
because scripts make them painful never get to fail).

## D6. AI voice answering is eating text-back's lunch (HYPOTHESIS, from challenge M1)

What is happening: Quo's own documentation upsells Sona, its AI voice agent,
on the same page as the auto-reply instructions, and the vendor wave behind
D1 is shifting its pitch from "we text back" to "our AI answers." The track
evaluated the previous generation's flagship and missed the current one.

The open question, with compose-before-build discipline: ride Quo's native
Sona, compose an independent voice agent, or explicitly reject AI answering
for this market. Unknowns: Sona pricing and failure modes, accuracy on trade
vocabulary, client and homeowner appetite for talking to an AI, AI disclosure
requirements, and whether voice answering actually beats text-back on
missed-call-to-booking (it may only beat it on demo calls).

This stays a HYPOTHESIS until the research in Q8 is done. It directly affects
D1: if AI answering wins, text-back is a stopgap product with a short shelf
life, and the client-service packaging should say so.

Business Agent decision it would change: whether the speed-to-lead product
sold to clients is text-back, AI voice, or a staged combination.

Falsification: defined after Q8 research; at minimum, a head-to-head pilot
metric both options must beat.

---

## What was deliberately left out

- Content repurposing pipelines (capability map #7): real mechanism, but PING
  Social's own queue proves the DIY version; no new intel needed this cycle.
- Abandoned-quote follow-up: strong adjacent-industry mechanism (cart recovery),
  queued as an experiment rather than a finding until a client pilot exists.
- Paid social / Google Ads management: deliberately excluded; the track's edge
  is near-zero-cost mechanisms, and paid media is a different business.

---

## Verification lesson, 2026-09-14 (GJ weekend sweep)

- Meta AI raw research presented Rocky Mountain Gun Club (Grand Junction indoor facility) as an active weekend opportunity. Independent public-source check found a Business Times closure report: the Grand Junction facilities closed (property listed for sale/lease in 2021). Stale review-site listings were the likely source of the error.
- Classification: CANCELLED. Direct evidence that Meta AI raw output cannot be promoted to PING or decision artifacts without the verification gate. Reinforces the standing rule: Meta AI output is UNVERIFIED external research until verified.
