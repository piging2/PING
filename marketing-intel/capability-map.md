# Marketing Intelligence: Capability Map

Version 1.0, 2026-09-14. Author: Pigi (marketing intelligence track).
Purpose: one page per capability family covering the whole local-business marketing stack.
Columns: who does it well | tools | costs | mechanism | piggyback/composition route |
current capability | gap | worth closing?

Grading: claims graded per the track rule (KNOWN / OBSERVED / CLAIMED BY VENDOR /
CASE-STUDY CLAIM / INDEPENDENTLY SUPPORTED / UNVERIFIED).

---

## 1. DISCOVERY (finding new businesses)

Who does it well: data brokers (AeroLeads, Apollo), local agencies with SOS scrapers.
Tools: Colorado SOS business search (free), Apollo free tier, chamber directories.
Costs: SOS free; Apollo ~$49/mo; brokers $0.10-$1/record.
Mechanism: public filings + registries + new-member lists, filtered by trade and recency.
Piggyback route: none needed. The current SOS radar + chamber + grand-opening searches ARE this.
Current capability: OWNED. b-new-business-radar rotation already does this.
Gap: none meaningful.
Worth closing: NO. Already a PING differentiator (formation-date verified, free).

## 2. RESEARCH (stack and opportunity intel per business)

Who does it well: BuiltWith/Wappalyzer (tech), agencies doing manual audits.
Tools: BuiltWith ($295/mo paid, limited free), Wappalyzer free tier, manual inspection.
Costs: mostly time.
Mechanism: public evidence -> graded claims (known/inferred/unknown).
Piggyback route: the Meta AI tandem research prompts + verification gate already implement this.
Current capability: OWNED via tandem pipeline (a/b/c/d prompts, verify, emit).
Gap: no systematic stack-history tracking (what changed when).
Worth closing: MAYBE later. Needs a demonstrated decision that stack history would change.

## 3. SIGNAL DETECTION (buying triggers)

Who does it well: review-monitoring agencies, permit-data resellers.
Tools: Google Business Profile notifications (free), permit feeds (varies), changedetection.io (free self-hosted).
Costs: changedetection.io $0; Visualping ~$10-40/mo; permit data $50-200/mo.
Mechanism: watch a public surface for a state change that implies demand (bad review, new permit, hiring, redesign).
Piggyback route: COMPOSE. Current review-triggered outreach (c-review-complaint-signals) already covers reviews.
The gap is non-review signals: permits, hiring, redesigns.
Current capability: PARTIAL. Review signals owned; page-change signals not.
Gap: cheap page-change monitoring for competitor/client surfaces.
Worth closing: EXPERIMENT. changedetection.io self-hosted at $0 + existing scripts. Small test: 10 local surfaces, 30 days, count actionable signals. See discovery D4.

## 4. BUSINESS IDENTIFICATION (who is the real entity)

Who does it well: nobody in the agency world; everyone merges accounts with entities.
Tools: SOS records (free), PING identity relation (owned).
Costs: $0.
Mechanism: separate BUSINESS ENTITY from PLATFORM ACCOUNT from INTERACTION; preserve UNKNOWN.
Piggyback route: none. This is a PING-native advantage by design (identity doctrine).
Current capability: OWNED. Strongest differentiator vs agencies.
Gap: none.
Worth closing: NO.

## 5. IDENTITY RESOLUTION (same business across channels)

Who does it well: data brokers, poorly.
Tools: manual matching, phone/address keys.
Costs: time.
Mechanism: deterministic keys (phone, address, SOS id) + human confirmation; never false-merge.
Piggyback route: existing PING evidence discipline.
Current capability: OWNED at small scale.
Gap: automation of candidate matching at scale.
Worth closing: NOT YET. No demonstrated volume problem.

## 6. QUALIFICATION (is this worth pursuing)

Who does it well: experienced closers, scoring models.
Tools: the validated JSONL prospect record (owned), BANT-style rubrics.
Costs: $0.
Mechanism: opportunity + evidence + confidence + priority (HOT/WARM/WATCH/SUPPRESS), graded known/inferred/unknown.
Piggyback route: none needed; the 30-field JSONL + MD digest is the mechanism.
Current capability: OWNED.
Gap: closed-loop calibration (which signals actually predicted replies).
Worth closing: YES, cheap. Track signal -> reply -> meeting -> revenue in the existing ledger. No new tool.

## 7. CONTENT (making the assets)

Who does it well: agencies ($1-3k/mo retainers), freelancers, owners with phones.
Tools: Canva (~$120/yr), CapCut (free), phone camera (free).
Costs: retainers expensive; DIY near zero.
Mechanism: one real asset (job photo, short clip) repurposed into channel-specific variants.
Piggyback route: COMPOSE. PING Social queue machinery + Pig already produce and schedule posts.
Current capability: OWNED for PING Social itself; not yet a client service.
Gap: a repeatable client-content pipeline (capture -> variant -> schedule) without agency retainer.
Worth closing: EXPERIMENT. Postiz is open source (AGPL, self-hosted, 30+ channels, public API) and replaces
Buffer-type schedulers at $0 + small server. But existing Pig posting already works; only add Postiz if a
demonstrated scheduling need fails. See queue.

## 8. PERSONALIZATION (right message per prospect)

Who does it well: good SDRs; AI personalization tools (Clay ~$149/mo+, Smartlead).
Tools: the prospect JSONL (opportunity, evidence, angle fields) + message templates.
Costs: Clay/Smartlead $100+/mo; template-driven $0.
Mechanism: evidence -> angle -> message, with disclosure and human review.
Piggyback route: existing outreach engine already personalizes from evidence.
Current capability: OWNED.
Gap: none.
Worth closing: NO.

## 9. OUTREACH (sending the message)

Who does it well: agencies, automated sequences.
Tools: Gmail (capped 10/day UTC), Facebook DMs, contact forms, Quo SMS.
Costs: near zero marginal.
Mechanism: channel-appropriate first touch + follow-up ladder, suppression on reply.
Piggyback route: existing engine.
Current capability: OWNED.
Gap: SMS as an outreach channel (Quo supports it; policy/compliance needs care).
Worth closing: MAYBE. Only for opted-in/warm contexts. Cold SMS is legally risky; do not build cold SMS.

## 10. FOLLOW-UP (deterministic, no lead left behind)

Who does it well: CRMs (HubSpot free, GoHighLevel $97/mo), disciplined owners.
Tools: outreach ledger (owned), HubSpot free tier, spreadsheets.
Costs: $0 with owned ledger.
Mechanism: every touch logged; next-eligible-action computed; suppression prevents duplicates.
Piggyback route: none; owned.
Current capability: OWNED. This is the "deterministic follow-up" near-zero-cost advantage.
Gap: none.
Worth closing: NO.

## 11. SOCIAL (organic presence)

Who does it well: consistent owners, niche agencies.
Tools: Meta Business Suite (free scheduler), Pig posting machinery, Postiz (free self-hosted).
Costs: $0 DIY; agencies $500-2k/mo.
Mechanism: regular proof-of-work posts (job photos, before/after), engagement in local groups.
Piggyback route: PING Social already runs this for itself; the mechanism transfers directly to clients.
Current capability: OWNED for self; transferable.
Gap: packaging it as a client service with honest effort math.
Worth closing: YES as a service line, not as new tooling. The tooling is already free.

## 12. REVIEWS (generation + response)

Who does it well: Podium ($399/mo Core, $599/mo Pro), NiceJob ($75-150/mo), Grade.us ($110/mo).
Tools: GBP review link (free), SMS/email requests, monitoring, response workflow.
Costs: Podium expensive; core mechanism reproducible near zero.
Mechanism: event-triggered request (job done -> SMS with link) + monitoring + fast owner response + escalation.
Piggyback route: COMPOSE. Quo SMS ($0.01/msg scale) + job-completion trigger + existing ledger + GBP free link.
No Podium needed to prove the mechanism.
Current capability: PARTIAL. Outreach uses review signals; no client review-request service yet.
Gap: the trigger -> request -> log -> monitor loop as a packaged client service.
Worth closing: EXPERIMENT. See discovery D3. Falsification: review velocity vs control.

## 13. REFERRALS (systematic, not accidental)

Who does it well: owners with a habit; ReferralCandy-type tools for e-commerce (poor fit for trades).
Tools: ask-scripts, simple tracking (who referred whom), thank-you loop.
Costs: near zero.
Mechanism: ask at the moment of delight (job complete, 5-star given) + track + reward + remind.
Piggyback route: compose onto the review-request trigger (same moment, same channel).
Current capability: NOT BUILT as a service. Conceptually trivial.
Gap: the ask script + tracking. Smallest build in the whole map.
Worth closing: YES. Cheapest experiment on the map. One script, one log.

## 14. PARTNERSHIPS (local cross-referral network)

Who does it well: BNI chapters, informal trade networks.
Tools: the local-network Meta AI pass already maps chambers, BNIs, home shows.
Costs: BNI dues ~$500-800/yr; informal free.
Mechanism: reciprocal referral agreements between non-competing trades (plumber <-> electrician).
Piggyback route: the 2026-09-14 local-network pass already produced the venue list
(Grand Junction Home Show Nov 13-15 2026 confirmed; BNI NEXUS Montrose needs confirmation).
Current capability: PARTIAL. Intelligence owned; no active partnership program.
Gap: Nolan's own attendance/sponsorship decision.
Worth closing: DECISION for Nolan, not a build. Home show is free to attend.

## 15. LOCAL SEO (map pack)

Who does it well: local SEO agencies ($500-2k/mo), Whitespark (citations ~$4-5/citation).
Tools: GBP optimization (free), review velocity, categories, photos, Q&A, citations.
Costs: mostly effort; tools cheap.
Mechanism: complete profile + review velocity + rating + photo cadence + category fit -> map-pack visibility.
Piggyback route: compose from review system (12) + content system (7/11).
Current capability: PARTIAL. Knowledge owned; not packaged as a service.
Gap: citation/volume work is labor, not tooling.
Worth closing: AS SERVICE, yes, using the composed mechanisms. No new software.

## 16. COMPETITOR INTELLIGENCE (who is winning and how)

Who does it well: agencies with manual audits; Semrush ($139/mo), Ahrefs ($129/mo).
Tools: Semrush/Ahrefs (expensive for this use), manual GBP + website + review audits (free),
changedetection.io (free) for ongoing monitoring.
Costs: $0 with free substitutes at this scale.
Mechanism: pick the 3 visible winners per trade per town; record what they do (reviews/mo, photos, posts, offers);
watch for changes; copy the mechanism, never the content.
Piggyback route: COMPOSE. Manual audit template + changedetection.io for the watch layer.
Current capability: PARTIAL. Ad hoc; no standing watch list.
Gap: a standing top-3-per-trade watch list with monthly re-audit.
Worth closing: EXPERIMENT. See discovery D4. Falsification: does the watch list change any client decision in 60 days.

## 17. ATTRIBUTION (which marketing caused the job)

Who does it well: CallRail ($45-55/mo entry, $90-105 with CI/form tracking, $135-215 complete, usage metered).
Tools: source-specific numbers, dynamic number insertion, call recording/transcription, form tracking,
UTM discipline, PING event lineage (owned).
Costs: CallRail real money at scale; owned lineage $0.
Mechanism: every inquiry carries its source; source links to booked job and revenue.
Piggyback route: COMPOSE. PING decision/event lineage + explicit source labels + dedicated numbers where
Quo supports them. Do NOT claim CallRail equivalence without dynamic number insertion evidence.
Current capability: PARTIAL. Lineage machinery owned; per-client call attribution not productized.
Gap: verification of what Quo actually supports (source numbers, webhooks). Queued as
Q9 (30-minute check, 2026-09-14): recording, transcription, source/number tracking,
webhook/export options. Close the gap or state it precisely.
Worth closing: EXPERIMENT only after a client asks "which ad worked." See discovery notes.

## 18. ANALYTICS (did it work)

Who does it well: GA4 (free), Search Console (free), GBP insights (free).
Tools: all free.
Costs: $0.
Mechanism: define the decision BEFORE collecting data; track the few numbers that change decisions.
Piggyback route: none needed.
Current capability: OWNED conceptually.
Gap: a standard client reporting template (calls, booked jobs, revenue, source).
Worth closing: YES, cheap. One template. Needed to prove every other experiment.

## 19. RETENTION (keep the customer)

Who does it well: ServiceTitan ($400+/mo), Housecall Pro ($79+/mo) with memberships; simple owners with a list.
Tools: customer list + scheduled check-ins + maintenance reminders (SMS/email).
Costs: near zero without FSM bloat.
Mechanism: the business knows who its customers are and contacts them on a schedule with a reason.
Piggyback route: compose onto the follow-up ledger pattern (same machinery, customer table instead of prospect table).
Current capability: NOT BUILT as a client service. Machinery pattern owned.
Gap: the customer-table + reminder loop.
Worth closing: EXPERIMENT. High expected value per the reactivation literature. See queue.

## 20. REACTIVATION (win back dormant customers)

Who does it well: SMS reactivation agencies ($500-1.5k/mo + rev share), GoHighLevel workflows.
Tools: dormant-customer list + SMS/email sequence + offer + booking link.
Costs: near zero DIY; agencies expensive.
Mechanism: identify customers with no transaction in N days; send a reason to return; measure rebooks.
Piggyback route: COMPOSE. Customer list + Quo SMS + booking link + outcome logging. No agency needed.
Current capability: NOT BUILT as a client service.
Gap: the list, the sequence, the measurement.
Worth closing: EXPERIMENT. Classic high-ROI play; falsification is clean (rebook rate vs control).

## 21. AUTOMATION (glue)

Who does it well: Zapier ($19.99+/mo for 750 tasks, scales to hundreds), Make, n8n (self-hosted free, ~$5-15/mo server).
Tools: existing scripts + cron + event ledger + Pig + PING (owned).
Costs: $0 marginal.
Mechanism: event -> rule -> action -> log, with failure states typed.
Piggyback route: none. The existing machinery IS the automation platform.
Current capability: OWNED.
Gap: none.
Worth closing: NO. Explicitly REJECT adding n8n/Zapier/Make. Reconsider only on a demonstrated
integration bottleneck the current stack cannot handle. See discovery D5.

---

## Summary: where the money is

Highest-leverage gaps worth closing (all near zero marginal cost):
1. Missed-call text-back as a client service (compose on Quo; the industry's flagship product, see D1).
2. Review-request loop as a client service (compose on Quo + GBP; see D3).
3. Reactivation/dormant-customer sequences (compose on customer list + Quo SMS).
4. Referral ask at the moment of delight (one script).
5. Competitor watch list + page-change monitoring (changedetection.io; see D4).
6. Standard client reporting template (needed to prove 1-5).

Explicitly rejected: n8n/Zapier/Make, Podium, CallRail (until a client decision requires it),
Postiz (until Pig posting fails a requirement), paid lead marketplaces (until owned signals are exhausted).
