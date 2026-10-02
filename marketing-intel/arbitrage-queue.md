# Marketing Intelligence: Arbitrage Queue

The cheapest reproducible implementation of each discovery, as queued experiments.
Status: REVISED post-challenge 2026-09-14 (challenge-report.md). No experiment starts
without Nolan-visible decision or standing authorization; all are reversible.

Binding rule (challenge M2): every experiment states its Nolan-hours/month.
Prioritization ranks on expected value per hour, not per dollar.

Binding rule (challenge M3): no lead-generation experiment pitches a client
before the Business Agent runs the demand-vs-capacity check.

## Q1. Quo missed-call text-back client pilot
Discovery: D1. Route: COMPOSE. Client-side cost: Quo seat (~$15/user/mo) + 10DLC
registration + number routing/porting effort + ~2 Nolan-hours setup + ~1 hr/month
monitoring. Not $0; still far under Podium/HighLevel.
Eligibility: client shows demonstrable after-hours or on-job missed-call volume
AND has unmet capacity. Full shops get the selectivity/pricing pitch, not this.
Compliance design (non-negotiable): registered 10DLC campaign, "Reply STOP to
opt out" language, suppression log. No unregistered numbers, ever.
Pre-registered falsification: metric = missed-call-to-conversation rate;
minimum sample = 50 missed calls in the pilot window; kill threshold = under
15% conversation rate OR no booking lift vs the pre-period. A compliance
incident pauses the pilot immediately.
Thin-moot note: package honestly as table stakes with a short shelf life; see D6.
Nolan-hours: ~3 setup, ~1/month.

## Q2. Owned-signal prospecting vs marketplace benchmark
Discovery: D2 (HYPOTHESIS). Route: none until promoted.
Blocked on: naming the demand-side signal per trade (permits, real-estate
transactions, service-area triggers). Permit-feed access is currently a gap.
If permit access cannot be obtained at reasonable cost, this stays "unproven
transfer" and no pilot runs.
If unblocked, pre-register before any pilot: what counts as a booked job, the
trade-adjusted benchmark and its source (with the $542 composite-estimate method
stated, not quoted clean), minimum duration per trade seasonality, judge = Nolan.
Nolan-hours: TBD after unblock; estimate 4-6 for the pilot design alone.

## Q3. Review-request loop (mechanics dogfood, then client pilot)
Discovery: D3. Route: COMPOSE (Quo SMS + GBP link + ledger).
Compliant design (non-negotiable): universal solicitation, one request per
customer, no sentiment pre-screening, no on-site pressure, no staff naming, no
incentives; negatives get service recovery, never review diversion. Any Google
profile warning or review removal kills the design immediately.
Honest cost: SMS + 10DLC fees + client Quo seat + response labor (especially
fast negative responses).
Steps:
1. Dogfood on PING Social: proves the mechanics only (fires, logs, suppresses).
2. Client pilot with real job volume, 60 days: review velocity and rating vs
   control businesses. Dogfood alone cannot falsify.
3. Test review-request AND referral-ask as ONE touch (same moment, same channel).
Falsification: no velocity lift, customer annoyance reports, or any policy event.
Nolan-hours: ~2 setup, ~2/month during pilot (response labor is the client's).

## Q4. Competitor watch list + changedetection.io trial
Discovery: D4. Route: COMPOSE.
Blocked on: naming and proving the host. Docker Desktop does not start on the
Pig; options are pip-install on Pig Windows or the cloud VM. Until the host is
proven, self-host cost is UNVERIFIED.
Scope: 10 non-Google surfaces only (competitor pricing/offer pages, GBP-linked
business sites, permit/chamber feeds). Google-owned surfaces excluded (ToS).
Decision surface claimed: entrant detection + review/velocity surges only.
Cost: 2-4 Nolan-hours/month; judge on signals per hour, not per dollar.
Pre-register before the trial: what counts as "decision-changing" and who
judges (Nolan). A 30-day null kills the automated watch only, not the quarterly
manual audit.
Nolan-hours: ~3 setup (mostly host proving), 2-4/month.

## Q5. Dormant-customer reactivation sequence template
Discovery: capability map #20 (adjacent-industry transfer, not a D-finding yet).
Route: COMPOSE (customer list + Quo SMS + booking link + outcome log).
Needs a willing client with a customer list; no list, no experiment.
Compliance: same 10DLC/opt-out design as Q1 (reactivation SMS to existing
customers is lower risk but still registered).
Falsification: rebook rate does not beat the client's baseline win-back (or
zero) in 60 days.
Nolan-hours: ~2 template, ~1/month per client.

## Q6. Referral ask at the moment of delight
Discovery: capability map #13. Route: one script + one log.
Consolidated with Q3: tested as one touch with the review request, never a
second touch. The ask script fires only at job-complete + 5-star given.
Falsification: referral rate does not move in 60 days, or customers find it pushy.
Nolan-hours: ~1 (script), ~0 marginal (rides Q3).

## Q7. Standard client reporting template
Discovery: enabler for Q1-Q6. Route: one document.
Define the decision-first metrics (calls, conversations, booked jobs, revenue,
source) before any pilot starts, so every experiment above has its falsification
numbers ready. No template, no pilot.
Nolan-hours: ~2 one-time.

## Q8. AI voice answering research (Sona and alternatives)
Discovery: D6 (HYPOTHESIS). Route: research, then decide.
The vendor wave behind D1 is shifting from text-back to AI answering, and Quo
upsells its own Sona voice agent on the same docs page as auto-replies.
Research: Sona pricing, capability, and failure modes; independent voice-agent
options and their cost; AI disclosure requirements; homeowner appetite in this
market; whether voice actually beats text-back on missed-call-to-booking.
Output: D6 promoted to a finding (ride Sona / compose independent / staged
combination) or explicitly rejected with reasons. Directly affects how D1 is
packaged and whether its shelf life is as short as the challenge fears.
Nolan-hours: ~3-4 research.

## Q9. Quo native attribution check — RESOLVED 2026-09-14
Discovery: capability map #17 (M5). Route: 30-minute verification, completed.
Verified against official Quo/OpenPhone API docs (KNOWN grade):
- Call recording: yes (`call.recording.completed` webhook event).
- Transcription: yes (`call.transcript.completed` webhook event).
- AI call summaries: yes (`call.summary.completed` webhook event).
- Source/number tracking: webhooks accept `resourceIds` (phone-number IDs) and
  `userId` filters, so per-number attribution works via dedicated numbers per
  source.
- Webhook/export: full webhooks API (calls, recordings, transcripts, summaries,
  messages in/out, contact changes).
Remaining precise gap vs CallRail: dynamic number insertion. Quo attributes by
provisioned number, so campaign-level attribution means manually provisioning
a number per campaign; there is no automatic per-visitor/per-ad number swap.
Verdict: capability #17 gap CLOSED for recording/transcription/summary/webhook
needs. CallRail deferral stays, narrowed to: revisit only when a client needs
true dynamic number insertion for paid campaigns.
Nolan-hours: ~0.5, spent.

## Q10. Booking-path composition for brochure sites
Discovery: pattern_no_booking_path (0 of 12 mapped Grand Junction trade
sites show a booking widget or live chat). Added 2026-09-14 by the pattern
pass; this is the capability the machinery found, so it goes in the rollout
queue, not just into a joke.
Mechanism: embed a real scheduling path into the existing site, no rebuild.
Compose from free tiers (TidyCal, Cal.com) or Quo booking links into
WordPress via simple embed. This is compose-before-build in its purest
form: the site stays, the journey gains a book-now step.
Test: 2 pilot installs on eligible shops. Metric: booking completions vs
the contact-form baseline over 30 days. Kill threshold: no measurable lift
in 30 days, or install/maintenance cost above 2 Nolan-hours per shop per
month sustained. Capacity check (M3) applies before recommending it anywhere.
Nolan-hours: ~4 for two pilots, one-time.

## Explicitly rejected (revisit only on documented failure)
- n8n / Zapier / Make for INTERNAL glue (D5; client-operated workflows are a
  separate per-client decision; annual review regardless of failure count)
- Podium or any review platform (D3; revisit only on a demonstrated gap after
  a client pilot of the composed loop)
- CallRail (capability map #17; revisit when the Q9 check shows Quo cannot
  answer "which ad worked")
- Postiz or any social scheduler (capability map #7; revisit when Pig posting
  fails a demonstrated requirement)
- Paid lead marketplaces (D2; revisit when owned signals are exhausted or the
  D2 hypothesis gets its demand-side signal)
- Cold SMS outreach (legal risk; warm/opt-in only, always registered)

## Q8 results, 2026-09-14

Research completed 2026-09-14 (~3 Nolan-hours equivalent, desk research only).
Every claim graded: KNOWN (official docs), OBSERVED, CLAIMED BY VENDOR,
CASE-STUDY CLAIM, INDEPENDENTLY SUPPORTED, UNVERIFIED.

### 1. Quo Sona: pricing, capabilities, limits (KNOWN, support.quo.com docs)

- Pricing: every paid Quo workspace (Starter $15/user/mo, Business $23, Scale
  $35) gets 10 Sona calls/month (1,000 automation credits) included at no extra
  cost. Paid tiers: $25/mo ~40 calls, $49 ~100, $99 ~250, $199 ~600
  (100 credits per call). Free-tier overage $1.00/call. 7-day free trial,
  auto-converts to paid.
- Failure-safety built in: overages are DISABLED by default. When credits run
  out Sona stops answering and routes to the fallback path in the call flow,
  not to a dead end.
- Capabilities: inbound calls only (no outbound), Quo-only (not portable to
  other phone systems), English/Spanish/French with no mid-call language
  switching, knowledge-base answers from business FAQs, keyword-based
  follow-up questions, message taking, call transfer, SMS/call-transfer
  actions, transcripts and summaries in the Quo inbox, CRM integrations
  including Jobber (CLAIMED BY VENDOR).
- Failure modes observed in independent testing: none found specific to Sona
  (UNVERIFIED; no independent Sona-specific failure reports located). General
  AI-voice failure modes from an independent trade-market tester (Medium,
  Rayhan mahmood, self-run test calls, OBSERVED): obviously robotic voices,
  rigid scripts that fumble off-script questions about pricing or warranty,
  technical setup friction.

### 2. Independent voice agents for small trade businesses

- Rosie (built for home services, integrates ServiceTitan/Housecall Pro):
  from $49/mo; appointment booking only at $149/mo tier; docs upload at
  $299/mo. Works via call forwarding, not as its own phone number
  (CLAIMED BY VENDOR via Rosie and comparison sites; independent tester notes
  rigid scripting, OBSERVED).
- Goodcall: starter ~$59-79/agent/mo with unlimited minutes but capped on
  UNIQUE CALLERS (100/250/500 per month tiers, $0.50 per extra caller);
  workflow builder is powerful but too technical for most contractors
  (OBSERVED via independent tester; pricing CLAIMED BY VENDOR).
- Avoca: no public pricing, positioned for larger HVAC shops with
  ServiceTitan/dispatch workflows; wrong fit for solo shops (OBSERVED via
  industry review).
- AIRA: $24.95/mo including AI answering plus missed-call text-back as backup
  (CLAIMED BY VENDOR).
- All independents add a SECOND system beside Quo: extra number forwarding,
  extra bill, extra integration work. Sona lives inside Quo, which PING Social
  clients already use for D1.

### 3. AI disclosure requirements (KNOWN for federal, KNOWN for Colorado)

- Federal: FCC declaratory ruling Feb 8, 2024 (FCC-24-17) classifies
  AI-generated voices as "artificial or prerecorded voice" under the TCPA.
  The TCPA consent rule targets calls the business INITIATES: a homeowner
  calling the business's published number and reaching an AI receptionist is
  an INBOUND call, not an outbound robocall. The TCPA prior-express-consent
  burden does not attach to answering a call the customer placed.
- Colorado: H.B. 26-1263, the Chatbot Safety Act, signed May 29, 2026 by
  Gov. Polis, effective January 1, 2027. Requires clear up-front AI
  disclosure, minor protections, crisis protocols. CRITICAL CARVEOUT:
  "AI primarily designed to assist with ... customer support or customer
  service falls outside the definition" of covered conversational AI.
  A trade business's AI receptionist is carved out. Attorney General
  enforcement only, no private right of action, up to $20,000/violation.
- Practical rule for pilots: disclose AI identity in the greeting anyway
  (industry standard, zero downside; several other states require disclosure
  when the caller asks or in sales contexts). Legal exposure for inbound AI
  answering in Colorado trades is LOW, documented, not assumed.

### 4. Homeowner appetite: AI receptionist vs human (trade market)

- ServiceForge/OnePoll survey, 6,000 US adults, Sept 2026: 87% prefer a
  human over AI when contacting a local home service business; 4 in 5 would
  choose a business where a human answers over one using AI; 62% do not
  trust AI to act correctly in an emergency requiring a tradesperson
  (CLAIMED BY VENDOR: ServiceForge sells live human answering; strong
  advertiser bias, but directly on-topic).
- BBB AI customer-service study: 91% of AI-related reviews negative over
  three years; Hubspot/SurveyMonkey poll: 82% of consumers prefer a human
  for support even with equal wait times (INDEPENDENTLY SUPPORTED).
- Okta consumer survey: ~70% "sick of talking to AI"; US ratio 4.2:1 prefer
  humans over AI; boomers 41.5:1, Gen Z 2.3:1 (CLAIMED BY VENDOR, survey data).
- Net: in the trade market specifically, homeowner resistance to AI
  answering is real and strongest exactly where missed-call stakes are
  highest (emergencies). No survey found prefers AI over human for trades.

### 5. AI voice vs missed-call text-back on missed-call-to-booking

- NO independent comparative evidence found. No study, pilot, or dataset
  located comparing AI voice answering against missed-call text-back on
  missed-call-to-booking conversion for trades (UNVERIFIED across the
  board; treated as absence of evidence, not evidence of absence).
- Vendor claims only: AIRA claims AI-answer close rate 40-60% vs text-back
  response 15-25% of which a fraction converts (CLAIMED BY VENDOR). Plura
  claims "benchmarks show AI receptionists achieve higher same-session
  appointment booking rates than missed-call text-back alone"
  (CLAIMED BY VENDOR, benchmarks undisclosed). Vendasta case study: AI
  receptionist converted 778 of 1,017 inbound calls to qualified leads
  (76%), car rental company (CASE-STUDY CLAIM, not a comparison).
- Text-back benchmark: 12-30% of missed callers respond to a fast text-back
  in home services (CLAIMED BY VENDOR via agency workflow doc).
- Truth status: nobody has published a head-to-head. Any claim that voice
  "beats" text-back today is marketing, not evidence.

### Verdict: D6 PROMOTED TO FINDING, as STAGED COMBINATION

D6 becomes a qualified finding, NOT a blanket endorsement of AI answering.

What the evidence supports:
- Text-back stays the D1 default package. It is cheap, proven at 12-30%
  response, low homeowner friction, and no AI-disclosure or trust risk.
- Sona is the compose-first voice option WHEN a client qualifies: already
  on Quo, high after-hours volume, owner cannot hire a dispatcher. First
  10 calls/mo are free inside their existing Quo bill, so the pilot costs
  ~$0 in software. This is compose-before-build working as designed.
- The "ride Sona wholesale" route is REJECTED for now. Reasons: (a)
  homeowner appetite data cuts hard against AI answering in trades,
  especially emergencies; (b) zero independent evidence that voice beats
  text-back on booking conversion; (c) the D1 shelf-life fear is overstated:
  the vendor wave is loudest where homeowner resistance is strongest, which
  is precisely why text-back remains sellable.
- Independent voice agents (Rosie, Goodcall, Avoca) are REJECTED as the
  default compose route: second system, extra bill, extra integration,
  and Rosie/Goodcall's plans are pricier than Sona for Quo clients. They
  stay on the shelf for non-Quo clients or clients needing deep
  ServiceTitan integration (revisit only on documented client need).

Packaging rule for the Business Agent:
- Default: missed-call text-back (D1 as-is).
- Upsell option, only for capacity- and volume-qualified clients: "Sona
  after-hours intake pilot: free for the first 10 calls, AI discloses
  itself, emergencies get a keyword-triggered live handoff, transcripts in
  your Quo inbox." Pilot requires the D1 falsification discipline: metric
  = after-hours missed-call-to-booking rate, minimum 30 calls, kill
  threshold set before the pilot starts (proposed: no lift vs text-back
  baseline, or >2 caller complaints about the AI in the window).
- Capacity check applies (M3): a booked-out shop gets selectivity and
  pricing advice, not an answering agent.

Revisit triggers: independent head-to-head evidence on voice vs text-back
conversion; a Sona pilot that beats the text-back baseline in a real trade
client; homeowner-appetite data that shifts (Gen Z cohort aging in).

Nolan-hours: ~3 research, spent.
