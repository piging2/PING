# PING Social Operations Manual

The complete, reproducible spec for the PING Social outreach machine. Everything here is how it actually runs as of 2026-09-10. This is a living document: it gets updated every time the system improves.

## 1. What this machine is

PING Social is Nolan Geske's AI concierge, operations, automation, and marketing-intelligence consultancy for home-service businesses. Not an LLC. Never imply incorporation.

The machine has three jobs:
1. **Outreach** — find Western Colorado home-service businesses, engage them publicly, and send tailored B2B messages.
2. **Intelligence** — stay expert on every software those businesses use, so every pitch is honest and tailored.
3. **Capture** — never miss a genuine reply, inbound call, or platform warning.

Contact identity used everywhere: Nolan Geske, PING Social, nolangesk@gmail.com, (970) 589-3309.

## 2. The non-negotiables

Break any of these and the machine is broken. No exceptions.

1. **Disclosure line.** Every outreach message opens verbatim: "Please read before replying: I am not a customer and this is not a service request. I am not looking to get any project done and I do not want an estimate. This is a business-to-business message from one business to another."
2. **Never invent.** No invented software, owners, staff, reviews, metrics, results, guarantees, projects, addresses, ZIP codes, appointments, or business facts.
3. **Never pose as a customer or job applicant.** Vendor/partnership framing only, and forms only where the page unmistakably invites business contact.
4. **Stack grading.** Every finding about a prospect's software is graded CONFIRMED, STRONG INDICATION, WEAK INDICATION, or UNKNOWN. Never assume.
5. **Drafting is never contact.** `DRAFTED`/`QUEUED` are not contact. `SENT` only after Gmail confirms acceptance. `SUBMITTED` only after a confirmed form submission. `DM SENT` only after a confirmed DM.
6. **No em dashes** in anything written for Nolan. Ever.
7. **Quiet by default.** Surface only: genuine prospect replies, inbound calls, real mistakes, platform warnings/checkpoints, or decisions that genuinely need Nolan. Never send routine send reports. Never auto-reply to prospects.
8. **Honor exits permanently.** Bounces, "no interest" replies, and opt-outs are suppressed forever. Maximum a couple of reminders, never a drip campaign.
9. **One source of truth.** `western-co-business-owner-list.csv` is the only business list. See section 5.
10. **AI identity in outreach (2026-09-20, Nolan).** Messages never introduce a human name. After the disclosure line: "I'm an AI reaching out on behalf of PING Social." Sign-off is "PING Social, (970) 589-3309" with no name.
11. **Sentence spacing in outreach (2026-09-20, Nolan).** Every sentence in the message body stands alone, separated by a blank line.

## 3. Targeting

**Geography:** Western Colorado first, expanding outward only when the pool thins. Priority towns: Grand Junction, Fruita, Palisade, Clifton, Montrose, Delta, Gunnison, Durango, Cortez, Pagosa Springs, Glenwood Springs, Rifle, Carbondale, Aspen, Basalt, Eagle, Edwards, Avon, Vail, Steamboat Springs, Craig, Meeker, Hayden, Rangely, and nearby. Denver is deprioritized.

**Trades:** plumbing, HVAC, electrical, roofing, painting, landscaping, tree service, garage door, concrete, fencing, chimney sweep, pest control, carpet cleaning, appliance repair, locksmith, junk hauling, drywall, masonry, septic, gutter, pressure washing, handyman, solar, insulation, flooring.

**Channel priority (standing order):**
1. Social interactions (likes, comments, DMs) at maximum sustainable volume
2. Tailored outreach drafting
3. Marketing intelligence (stack research, competitor research, playbook upkeep)
4. Website forms, only where B2B intent is unmistakable
5. Cold email last, without chasing volume

**Temporary state (2026-09-10):** Instagram-first for ~24 hours while Facebook browser sessions are unstable, then the old-laptop home-browser plan. Facebook CLI read-only work continues throughout.

## 4. Prospecting SOP

### 4a. Sources
- Web research batches (Google, business directories, trade sites)
- Instagram search and profile bios (read-only browser)
- Facebook CLI (read-only: profiles, Pages, groups)

### 4b. Per-prospect procedure
1. Capture: business name, trade, town, contact info **only as published** by the business (own site, bio, profile). Empty fields stay empty.
2. Verify the town. If unconfirmed, mark region "Colorado (town unverified)" and note what to verify. Do not outreach until town is confirmed.
3. Dedupe by normalized business name AND by email against the CSV before adding.
4. Assess `revamp_candidate` (section 5) and write the one-line `notes`.
5. Add to `pipeline.md` as `NEW` with the fit note.
6. Merge into the CSV and update the notes doc (section 5).

### 4c. Stack research
For each prospect, determine what software they actually run (booking, CRM, payments, call handling, reviews, marketing) from public evidence only: their website's booking widgets, job links, source code hints, review profiles, job ads mentioning tools. Grade every finding. One confirmed stack signal beats ten guesses.

## 5. The source of truth

**File:** `~/workspace/goals/ping-social-outreach-campaign/files/western-co-business-owner-list.csv` (211 rows as of 2026-09-19; the old `your_files/` copy no longer exists).

**Columns (30):** email, business_name, owner_name, phone, website, trade, city, state, region, source, revamp_candidate, notes, intel_updated, website_quality, booking_mechanism, missed_call_risk, social_presence, review_velocity, notable_reviews, new_filing_signal, stack_signals, opportunity_primary, opportunity_secondary, opportunity_evidence, opportunity_confidence, ai_discoverability, priority_state, last_signal, suppression_state, next_eligible_action.

**revamp_candidate = yes** when the business is old, less active, or non-technical and could use a revamp. Any one of these qualifies:
- Thin or stale social (under ~50 posts, nothing in 6+ months, tiny following for an established business)
- No website, or phone-only / DM-only intake with no booking system
- Consumer email as the business address combined with thin presence
- No published direct contact at all

Blank means not yet assessed. Assess every new prospect at merge time ("note as you go" is a standing instruction). Backfill older rows opportunistically; never bulk-guess.

**Companion docs:**
- Nolan-facing notes: `~/workspace/your_files/western-co-prospect-notes.md` (revamp candidates first, then batch lists, one or two lines each)
- Agent ops: `~/workspace/outreach/prospect-source-of-truth.md` (merge workflow, dedupe rules)

## 6. Engagement SOP (social)

### 6a. Instagram (active channel)
- **Session:** logged in as nolanpigi (saved credentials in Secure Vault, 2FA done once, trust-device selected). Verified stable 2026-09-10. Restore the session per pass; never log out; never visit facebook.com in the same run.
- **Targets:** Western Colorado home-service business accounts. Read `instagram-prospects.md` and the engagement log first; never engage the same account or post twice across passes.
- **Format preference (Nolan's call):** prefer regular public feed posts (photos, carousels) over reels. Engage a reel only if it visibly has public comments already.
- **Limits per pass:** up to 30 likes, up to 8 comments. Like only genuine trade content (job photos, trucks, crews, before/after, tips). Skip memes, personal content, giveaways, stale accounts.
- **Comment voice:** business accounts ONLY, never personal profiles. Under 20 words. Funny first, then punchy, expert, down to earth, specific to something in the post. Built to spark replies and profile views. NEVER sell, never mention PING Social, no links, no contact info, no customer-posing, no em dashes.
- **Pacing:** 60 to 120 seconds between every action.
- **Stop conditions:** any action block, "try again later," checkpoint, verification challenge, or warning of any kind. Stop instantly and report it.
- **Forbidden:** DMs, follows/unfollows, posts, stories, account changes unless separately authorized.
- **Logging:** every like (account + post description) and every comment (account + exact text) appended to `~/workspace/outreach/instagram-engagement.md` under a dated pass section, plus skips and any warning.

### 6b. Facebook (paused, browser blackout until 2026-09-11 16:05 MDT)
- Same comment voice as Instagram (funny, under 20 words, never selling, business Pages only, never personal profiles).
- Human pacing 45-90s between actions; cap ~50 likes and ~15 comments per pass.
- Facebook CLI read-only prospecting is permitted during the blackout. No browser login checks, login attempts, or engagement until the blackout ends.
- **Session problem (confirmed 2026-09-10):** restored sessions die within 1-2 minutes, eight consecutive failures, idle sessions die too. Concrete risk leads: Linux Chromium fingerprint, unavailable WebGL, spoofed-canvas signal, timezone inconsistency, differing observed IPs. Full analysis in `~/workspace/outreach/facebook-detection-workarounds.md`.
- **Standing rule:** whenever the session is found logged out, automatically start the re-login flow; Nolan approves on his iPhone. Never ask for passwords.
- **After the blackout:** do NOT blindly resume cloud-browser retries. Reconcile with the old-laptop plan first (section 9).

### 6c. PING Social Facebook Page
Nolan is creating it. When he shares the URL: record it in `~/workspace/outreach/facebook-page.md`, follow `~/workspace/outreach/facebook-page-strategy.md`: invite up to 20 new post reactors per engagement pass via the native Invite button, never invite the same person twice, log invitations in `facebook-engagement.md`, stop on any limit or warning. No Page posts, edits, or boosts without Nolan asking. He owns Page content.

## 7. Outreach SOP (email, forms, DMs)

### 7a. Drafting
- Brief, conversational, direct, tailored, confident, natural. No AI hype, no polished sales-script language.
- Open with the disclosure line (section 2).
- AI identity (2026-09-20, Nolan): never introduce a human name. Right after the disclosure line, the message says: "I'm an AI reaching out on behalf of PING Social." Sign-off is "PING Social, (970) 589-3309" with no name.
- Sentence spacing (2026-09-20, Nolan): every sentence in the message body stands alone, separated by a blank line. Never run sentences together in one dense paragraph.
- Never "might"/"could" conditional pain framing. Lead with the customer's business problem, not technical capabilities.
- Tailor to the prospect's actual workflow and stack (section 4c). Consultative, never a predetermined solution.
- Drafts live in `~/workspace/outreach/drafts/`. Statuses in `pipeline.md`: NEW, DRAFTED, QUEUED, SENT, SUBMITTED, DM SENT, SKIPPED, DM BLOCKED.

### 7b. Cold email (last resort channel)
- Hard cap: **10 Gmail-accepted sends per UTC day.**
- Before sending: count what Gmail actually accepted for the current UTC day via the Gmail tool, reverify the recipient, dedupe against accepted sends, then send only the remaining allowance.
- `SENT` only after Gmail confirms acceptance. Never probe-send to a real prospect.
- Mandatory pre-send reconciliation (2026-09-13): before ANY send or submit, the candidate must clear all three checks. (1) Gmail's actual sent mail for the current UTC day (the cap-counting pattern above). (2) The JSONL row's status fields (`suppression_state`, `last_signal`, `next_eligible_action`); declined, bounced, cooling-down, or ladder rows are skipped, as is any row whose `last_signal` already records the send. (3) The sweep's own sent-log (today's email-queue file, follow-ups.md, today's sweep summary). If ANY source says already sent or submitted, skip. Run `~/workspace/outreach/pre-send-check.py --business "Name" [--email addr]` for checks 2 and 3; exit 1 means DO NOT SEND. This closes the crash window between Gmail acceptance and local logging that could otherwise cause a duplicate send.
- Permanently retired: fleursauvage.llc@gmail.com (550 5.1.1, 2026-09-10), info@denver-appliance.repair (bounced 2026-09-08).

### 7c. Website forms (maximum honest volume)
- Only where the page unmistakably invites vendors, partnerships, or business connections. Never customer quote/estimate flows.
- Visually verify nolangesk@gmail.com and every contact field on the rendered form before submitting (a 2026-09-09 typo sent replies nowhere; verification is now mandatory).
- The 7b pre-send reconciliation checklist applies to form submits too: reconcile the candidate against the JSONL row's status fields and the sweep's sent-log (`pre-send-check.py`) before submitting; if any source says already submitted, skip.
- Skip: dishonest selections, customer-only required details, CAPTCHAs, broken forms, required marketing consent.

### 7d. Facebook DMs
- Verify a Message button exists on the profile/Page BEFORE drafting copy or doing research. No Message button means no DM route; reroute to email/form or skip.
- Messenger CLI is contact-restricted; no proactive sends outside authorized flows.

### 7e. Follow-ups
A couple of reminders maximum, best practice, never a campaign. Honor declines, bounces, and opt-outs permanently. Thomas Friel (Roaring Fork Landscapes, "No interest," 2026-09-10) is permanently suppressed.

## 8. Reply monitoring

Every outreach round checks for replies (Gmail + any DM surface). Genuine human replies surface to Nolan immediately with full per-prospect context from the files (what was sent, when, which angle). Automated acknowledgments are logged, not surfaced. Replies live in `~/workspace/outreach/responses.md`.

Standing rule (2026-09-13): every sweep's response-handling step MUST project each reply, decline, and bounce into the prospect's JSONL row in the same run: `suppression_state` (canonical vocabulary, see `outreach/prospect-source-of-truth.md`), `next_eligible_action`, `last_signal`, and `conversion_state` when a reply moves toward a meeting or customer. Prose-only outcomes are not allowed. A hard decline (e.g. Roaring Fork Landscapes, "No interest.", 2026-09-10) sets `suppression_state` to `declined YYYY-MM-DD`, `priority_state` to SUPPRESS, and `next_eligible_action` to none, permanently stopping the ladder.

## 9. Infrastructure and schedules

**Active schedules** (all America/Denver unless noted):
- `ping-social-outreach-engine` — every 3h. The main loop: reply monitoring, prospecting, drafting, sending within caps, logging. Runs perpetually until Nolan says stop.
- `instagram-engagement-pass-2/3/4` — one-shots: 2026-09-10 22:30, 2026-09-11 09:00, 2026-09-11 15:00. The 24-hour Instagram push.
- `facebook-blackout-end` — one-shot 2026-09-11 16:10: re-enable the two disabled Facebook jobs. Reconcile with the old-laptop plan before letting cloud retries resume.
- `facebook-session-watch` — every 2h, currently DISABLED for the blackout.
- `facebook-engagement-pass` — every 8h, currently DISABLED for the blackout.
- `agentic-feature-tour` — daily 10:21, product tips.

**Old-laptop plan** (`~/workspace/outreach/home-laptop-browser-plan.md`): after the Instagram period, Facebook moves to a dedicated old laptop on Nolan's home internet (stable residential fingerprint, persistent cookies, private secure network, no sleep). Setup walkthrough begins when Nolan says go. Never ask for passwords in chat; use the Secure Vault flows.

## 10. Intelligence assets

- `~/workspace/outreach/software-playbook.md` — ~18,500 words, 65 tools, 10 categories. The five market gaps: (1) after-hours/unanswered calls do not reliably become booked jobs, (2) quotes die without persistent follow-up, (3) paid leads go to the first responder, (4) answering services meter time and usually only take messages, (5) marketing and review spend leaks at the inbound handoff. Keep it current as new tools surface.
- Quo is the phone platform; Sona is its built-in AI receptionist. PING's honest angle: evaluate whether answered calls actually become jobs.

## 11. File map

| File | Purpose |
|---|---|
| `goals/ping-social-outreach-campaign/files/western-co-business-owner-list.csv` | THE source of truth: every prospect business |
| `your_files/western-co-prospect-notes.md` | Nolan-facing notes: revamp candidates + batch lists |
| `outreach/prospect-source-of-truth.md` | Agent ops for the CSV |
| `outreach/leads.md`, `outreach/pipeline.md` | Execution layer: statuses, fit notes |
| `outreach/drafts/` | Outreach drafts |
| `outreach/pitch.md` | Current pitch |
| `outreach/learnings.md` | Accumulated lessons |
| `outreach/responses.md` | Replies and outcomes |
| `outreach/facebook-dms.md`, `outreach/facebook-engagement.md` | Facebook log |
| `outreach/instagram-prospects.md`, `outreach/instagram-engagement.md` | Instagram log |
| `outreach/western-co-candidates.md` | Candidate pool |
| `outreach/software-playbook.md` | Software intelligence |
| `outreach/facebook-blackout.txt` | Blackout state |
| `outreach/facebook-detection-workarounds.md` | Detection analysis |
| `outreach/facebook-page.md`, `outreach/facebook-page-strategy.md` | Page strategy |
| `outreach/home-laptop-browser-plan.md` | Old-laptop plan |

Known cleanup status (2026-09-19, see BACKLOG.md): the stale `pipeline.md` header, legacy CONTACTED statuses, and `learnings.md` reconciliation are resolved; Round 14 and older unknown form outcomes are resolved and parked (Fenix/Cooley's stay OUTCOME_UNKNOWN by Nolan's decision).

## 12. Recovery playbooks

- **Facebook session dies:** do not retry more than twice in a row. Log the failure with timestamps. During blackout, stay out entirely. Otherwise follow the standing re-login rule, or shift work to the old laptop.
- **Instagram action block / warning:** stop the pass instantly, log exactly what Instagram showed, report to Nolan. Do not retry that day.
- **Email bounce:** retire the address permanently, note it in learnings, never retry.
- **"No interest" reply:** suppress permanently, log it, no follow-up, no hard feelings.
- **A real mistake (wrong email, bad form):** tell Nolan plainly, fix the process so it cannot repeat (this is how the form-verification rule was born).

## 13. Reproducing this from zero

1. Create the workspace files above (start with the CSV, pipeline, and this manual).
2. Store Instagram/Facebook credentials in the Secure Vault; connect Gmail, Calendar, Facebook, Instagram.
3. Recreate the crons in section 9 with the same bodies and cadences.
4. Prospect per section 4, engage per section 6, outreach per section 7, all under section 2's rules.
5. The machine runs itself from there. Nolan only hears about replies, mistakes, warnings, and real decisions.

## 14. Refinement mandate

Nolan's standing instruction (2026-09-10): keep refining and improving as needed; the operator is the expert. Every improvement lands in this manual and in AGENTS.md so the next session, and any other agent, inherits it exactly.

## 15. Follow-up ladder, new-business radar, review-triggered outreach (2026-09-11, Nolan's call)

Efficiency rule: everything below runs inside the outreach engine's existing sweeps. No new schedules are added unless a cap is hit. Nolan: "start specing out ONLY ON THE SAME SWEEPS, we're not adding new unless we hit a cap. I just want efficiency."

### 15a. Follow-up ladder
Every SENT email or DM SENT prospect with no reply, no decline, and no suppression gets up to two follow-up touches:
- F1 at day 4 to 7 after first send: short bump under 50 words, references the original angle, one question max, opens with the not-a-customer line.
- F2 at day 10 to 14: final touch with a NEW angle (a bad review seen since, seasonal timing, a specific new observation) and an easy out.
- Never more than three total touches (initial plus F1 plus F2). Never follow up a "no interest" or any decline. Stop the ladder permanently on any reply.
- Follow-ups count inside the 10-per-UTC-day Gmail cap and take PRIORITY over new cold sends. Daily send order: (1) follow-ups and review-triggered messages, (2) new cold emails FIFO.
- Log every follow-up in `outreach/follow-ups.md` (date, prospect, touch number, trigger). Pipeline statuses F1 SENT and F2 SENT are flipped only after Gmail or Messenger acceptance.
- Facebook DM follow-ups follow the same ladder inside the 10-DMs-per-day ceiling.

### 15b. New-business radar
Each engine run dedicates a share of its research candidates to brand-new Western Slope trade businesses:
- Sources: Colorado SOS business database (https://co.colorado.gov/search-business-records, search trade-name keywords), city clerk business-license new-issue lists, chamber new-member announcements, and "grand opening" / "now open" / "just launched" posts found during Facebook group scans.
- Criteria: filed or opened within about 60 to 90 days, trade business, Western Slope address, own-site or Facebook presence for contact.
- Tag `source=new-filing` in pipeline.md with status NEW, deduped against leads.md.
- New-business pitch angle: congratulations plus set it up right from day one (capture every call, instant booking, reviews from the start).

### 15c. Review-triggered outreach
Each run monitors pipeline.md and leads.md prospects' Google reviews:
- Trigger: a new review of 2 stars or fewer, or a new 3-star review mentioning phone, response, wait, or scheduling problems.
- Within 7 days of the review, draft a tailored message referencing the pain category (missed calls, slow response). Never name the reviewer and never quote the review text.
- Max one review-triggered message per business per 90 days. Suppressed while a follow-up ladder is active on that prospect.
- Log in `outreach/follow-ups.md` with trigger=review; statuses flip per the send rules.

### 15d. Gather information while already there (2026-09-11, Nolan's call)
Whenever a pass or scan is already on a prospect's page or post, capture: visible software stack signals, website quality (flag very non-technical owners with weak sites as revamp candidates), review sentiment, services offered. Record in the pipeline row or research scratch notes. Never invent.

### 15e. Positioning updates (2026-09-11, Nolan's call)
- Market PING Social more aggressively. Nolan is setting up Google Workspace and will launch a PING Social website soon.
- Target market: blue collar home-service businesses.
- Revamp rule: propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof: https://happy-place-platform.vercel.app/ (cite in revamp pitches; never invent other client work).

## 16. Business-intelligence + demand-generation engine (2026-09-11, Nolan's directive)

The outreach system evolves into a cross-channel business-intelligence and demand-generation engine. Same sweeps, same schedules, same caps. Better intelligence, better timing, better relevance, not more volume.

### 16a. Unified business record
The canonical CSV (`goals/ping-social-outreach-campaign/files/western-co-business-owner-list.csv`) is the living record: 12 identity columns plus 18 intelligence columns (`intel_updated`, `website_quality`, `booking_mechanism`, `missed_call_risk`, `social_presence`, `review_velocity`, `notable_reviews`, `new_filing_signal`, `stack_signals`, `opportunity_primary`, `opportunity_secondary`, `opportunity_evidence`, `opportunity_confidence`, `ai_discoverability`, `priority_state`, `last_signal`, `suppression_state`, `next_eligible_action`). (The 2026-09-13 conversion trio `conversion_state` / `converted_at` lives on the JSONL rows, not in the CSV.) Full semantics in `outreach/prospect-source-of-truth.md`. Empty means unknown.

### 16b. known → inferred → unknown (hard rule)
KNOWN: what the business published itself (contact info, filings). INFERRED: assessed from public observation (website quality, missed-call risk, AI discoverability, opportunity calls); usable for targeting and timing, never stated as fact in copy. UNKNOWN: empty; never negative evidence, never filled by guessing. Stack keeps CONFIRMED / STRONG INDICATION / WEAK INDICATION / UNKNOWN. Social chatter is labeled signal / unverified / confirmed, never a verified fact.

### 16c. Operating loop
SWEEP → DISCOVER (FB scans, research, new-business radar, social discovery, plus the 16k current-event radar and competitor-claim watch) → VERIFY (dedupe, own-site checks, chatter labels) → ENRICH (profile intel, SEO/AEO on HOT/WARM, review monitoring; may attach search-intelligence findings) → CLASSIFY (review problem taxonomy, priority states) → IDENTIFY OPPORTUNITY (primary/secondary + evidence + confidence) → SCORE CONFIDENCE → CHECK SUPPRESSION (cooldowns, declines, ladders) → SELECT BEST ELIGIBLE ACTION → PERSONALIZE (evidence packet) → OUTREACH / CONTENT / WATCH → RECORD OUTCOME (follow-ups.md, responses.md, angle-performance.md, AND the JSONL row's suppression_state + next_eligible_action + last_signal projected in the same run; prose-only outcomes are not allowed) → LEARN (learnings.md, plus the PING distillation procedure in 16o) → NEXT SWEEP. New content ideas enter `outreach/content-queue.md` under its ranking rule. Stages feed each other through the CSV record; never disconnected features. Every stage transition is observable: per-row in the JSONL fields, per-sweep in the structured run line (16m).

### 16d. Priority states
HOT: multiple fresh signals + strong fit + legitimate opportunity. WARM: good fit + meaningful signal. WATCH: interesting but insufficient evidence. SUPPRESS: no, cooldown, contacted too recently, unsuitable. Every sweep asks "What is the highest-value eligible action for this business right now?" Caps and ladders are absolute; signals never raise volume.

### 16e. Opportunity engine
Enums: NEW_BUSINESS_SETUP, MISSED_CALL_LEAD_CAPTURE, WEBSITE_REVAMP, SEO, AEO_AI_DISCOVERABILITY, SOCIAL_PRESENCE, AUTOMATION, INTEGRATION, UNKNOWN. Record primary, secondary, evidence (observed facts only), confidence (high/medium/low). Pitch the primary; mention the secondary only if natural.

### 16f. Review classification
Classify the business problem behind a bad review: unreachable, no response, missed call, scheduling friction, poor communication, outdated information, confusing website, poor customer experience, operational complaint. Map review signal → business problem → solution angle. Never name the reviewer, never quote the review, never look like surveillance. Max one review-triggered message per business per 90 days.

### 16g. SEO + AEO intelligence
For HOT/WARM prospects (a few per run): branded search presence, local visibility, missing service pages, weak location signals, title/meta structure, FAQ coverage, answer-oriented content, structured information, NAP consistency, conversion paths, "near me" coverage, topical authority, AI-answer discoverability ("if someone asks Google, ChatGPT, Gemini, Perplexity for the best business for this service in this area, how discoverable is this company?"). Never claim a ranking that was not measured.

### 16h. AI discoverability field
States: strong, moderate, weak, unknown. Assign ONLY from observable evidence: clear service/location info, authoritative pages, structured content, FAQs, service descriptions, consistent identity, third-party references, review presence, local relevance, crawl/index accessibility where measurable.

### 16i. Stack signals
Chain: observed stack → likely friction → possible opportunity → confidence. Examples: website platform, booking platform, contact form, phone-only contact, old CMS, weak measurement, disconnected systems. Never assume a technology is bad.

### 16j. Personalization engine
Before drafting, build the WHY THIS BUSINESS packet: 1-3 verified observations, newest relevant signal, likely business problem, relevant solution, why now. Generate the message from the packet. No generic openers unless there is genuinely nothing better. Short, specific, human, useful.

### 16k. Content engine: PING Social as a viral marketing OS (2026-09-19, Nolan's directive)

PING Social is evolving from an outreach bot into a viral marketing OS for PING. The content engine keeps the manual's constitutional discipline: observed facts, inferred signals, and unknowns stay distinct; content never fabricates evidence. It reuses the existing sweep, queue, learning ledger, provenance model, evidence rules, and suppression/publishing controls. Nothing here auto-publishes; Nolan decides what gets made.

**Objective function.** Optimize for qualified attention + trust + demonstrated competence + business relevance + conversion. Never optimize for likes, followers, impressions, or empty engagement; engagement is an instrument, not the objective. Do NOT make "persuade everyone to use PING" the literal objective: that produces engagement bait and confirmation bias. PING becomes the obvious solution when the evidence supports it.

**The funnel.** ATTENTION → CURIOSITY → VALUE → TRUST → AUTHORITY → RELEVANCE → PING CONSIDERATION → QUALIFIED CONVERSATION → CUSTOMER → LEARNING.

**The PING content thesis.** PING becomes known as THE PEOPLE WHO ACTUALLY UNDERSTAND HOW MODERN HOME-SERVICE BUSINESSES WORK. We inform, educate, investigate, explain, expose bad assumptions, make complicated technology understandable, find operational leaks, watch the market, the algorithms, customers, and competitors, test claims, show receipts when we have them, admit uncertainty when we do not. Then, occasionally: "Here's the problem. Here's why everyone keeps getting this wrong. Here's what actually happens. Here's what we'd do. Here's how PING can help." That is the brand.

**Translator identity (highest leverage).** PING translates TECHNOLOGY → BUSINESS CONSEQUENCE. AI → what it actually means for a plumber. Google update → what the HVAC owner should do. New software → whether it actually solves anything. Missed call → revenue possibly leaking. Bad review → the operational failure underneath. AI search → what a local business needs to be understood. Useful enough to earn attention without begging for it.

**Content modes.** Classify every candidate: 1 VIRAL/ATTENTION, 2 HOT TAKE, 3 EDUCATIONAL, 4 BREAKING/CURRENT EVENT, 5 INDUSTRY INTELLIGENCE, 6 COMPETITOR/MARKET ANALYSIS, 7 PRACTICAL HOW-TO, 8 CASE/PROOF, 9 PING BUILD-IN-PUBLIC, 10 INSPIRATIONAL, 11 SERIOUS/TRUST, 12 HUMOR/CULTURE, 13 CONVERSION. Do not make every post promotional; the audience receives value repeatedly before PING asks for anything.

**Portfolio balance (starting priors, never immutable rules).** 30% educational/useful, 20% entertaining/humorous, 15% industry/current-event commentary, 10% hot takes, 10% proof/build-in-public, 10% inspiring/serious, 5% direct PING conversion. Never ten hot takes in a row. The learning system adjusts these from measured qualified outcomes, never from vanity engagement.

**Humor as ingredient (scored, not a checkbox).** Every post attempts a humorous or playful beat, scored as HUMOR OPPORTUNITY 0-4: 0 = genuinely inappropriate, 1 = subtle/lightheartedness, 2 = natural wit, 3 = strong comedic angle, 4 = highly shareable humor. A serious post may legitimately score 0-1; a mundane operational topic should normally be pushed toward 2-4. Never force humor to satisfy the metric. PING humor is observant, dry, clever, occasionally absurd, self-aware, blue-collar friendly, technically literate, never corporate, never desperate. No repetitive pig puns, no generic AI humor. The scoring gate lives in `ping-content/captions.md`.

**Hot-take engine.** PING has opinions grounded in evidence: never outrage farming, never fabricated facts. Structure: dominant industry assumption → evidence for/against → PING's interpretation → practical implication → concise conclusion. Every hot take labels FACT vs OBSERVATION vs INFERENCE vs PING OPINION. Never manufacture controversy.

**Current-event radar.** Each sweep's DISCOVER may surface relevant current events: home services, local business, Google/Meta/Instagram/Facebook/TikTok/Threads/X, AI, search, AI search, local SEO, advertising, lead gen, CRM, phones, answering services, booking, reviews, automation, software pricing, platform/algorithm changes, privacy, small-business regulation, major tech launches, major outages, consumer behavior. Never merely repost news; INTERPRET it with the repeatable formula: NEWS → WHAT HAPPENED → WHY EVERYONE IS TALKING ABOUT IT → WHAT IT ACTUALLY MEANS → WHICH HOME-SERVICE BUSINESSES SHOULD CARE → WHAT TO DO.

**Search + organic-marketing intelligence loop.** Inside the existing sweeps (no new schedules): trending searches, recurring questions, Reddit discussions, Google/SEO patterns, social discussions, emerging terminology, competitor messaging, common complaints, misunderstood concepts, new products/features, algorithm discussions, questions owners repeatedly ask. Findings become content-queue.md candidates. Marketing vocabulary (search intent, AEO/GEO, zero-click, lead leakage, first-response time, attribution, LTV/CAC, demand capture vs generation, trust signals, shareability) only when it improves precision, never as buzzword garnish.

**Competitor/market clown engine.** PING occasionally clowns the competition, precisely. Targets: bad practices, misleading marketing, ridiculous pricing, bloated software, terrible UX, operational inefficiencies, contradictory claims, generic AI slop, outdated advice, absurd industry conventions, documented competitor shortcomings. Never random personal attacks. Never fabricate behavior, numbers, or unsupported allegations; when evidence exists, show it. Formula: CLAIM → SOURCE → VERIFICATION → WHAT IS ACTUALLY TRUE → BUSINESS IMPACT → PING'S INTERPRETATION → PRACTICAL ALTERNATIVE. The ideal pattern: "Company/industry says X. Here's what their own documentation actually says. Here's why that matters. Here's what we'd do instead." That makes PING the adult in the room who can laugh at the industry while understanding it.

**Clown + teach formula (high-performing format).** HOOK → FUNNY OBSERVATION → "BUT HERE'S THE REAL PROBLEM" → EVIDENCE → EXPLANATION → PRACTICAL FIX → OPTIONAL PING CONNECTION. The joke gets attention, the insight earns trust, the evidence earns credibility, the solution creates demand.

**Trust engine.** Every post answers at least one "WHY SHOULD I TRUST PING?" with real evidence: actual experiments, system builds, documented observations, transparent limitations, before/after evidence, measured outcomes, technical explanations, real market research, useful tools, honest disagreement, public mistakes followed by improvements. Never manufacture case studies; never imply client results that do not exist. If we lack proof, teach instead.

**Conversion engine.** Organic content never constantly says "Buy PING." The ladder: "This is happening" → "Here's why" → "Here's what it costs businesses" → "Here's how to diagnose it" → "Here's how we solved/tested it" → "If you want this infrastructure, this is what PING builds." The audience arrives at the conclusion themselves. Explicit CTA only when the evidence supports it ("If your business has this problem, PING can help"). Never claim PING is the answer to every problem; credibility beats hype. Demonstrated capability sells the repo/services, not constant self-promotion: after 20 useful posts, the sales argument has largely already happened.

**"Why PING?" thread.** Over time the feed repeatedly demonstrates PING is not another marketing agency, chatbot, scheduler, AI wrapper, or dashboard, but business intelligence + automation + marketing intelligence + software infrastructure + AI-assisted operations + measurement + integration + evidence-driven decision systems, explained through actual content rather than asserted.

**Serious/inspirational mode.** Deliberately slow down sometimes: entrepreneurship, craftsmanship, building from nothing, honest work, technology serving people instead of replacing judgment, resilience, local businesses, lessons from failure, lessons from building PING. Genuinely sincere; lightheartedness welcome; never a sales pitch. These establish PING as a company with values.

**Competitive content score (dimensions preserved, never one opaque number).** Score each candidate 1-5 on ATTENTION, HUMOR, NOVELTY, USEFULNESS, EVIDENCE, TIMELINESS, SHAREABILITY, DISCUSSION POTENTIAL, PING RELEVANCE, TRUST IMPACT, CONVERSION RELEVANCE; RISK as low/med/high. Stored on the queue item; the learning loop reads the dimensions separately.

**Content quality gate (before publishing).** FACTUALITY, EVIDENCE, ORIGINALITY, USEFULNESS, ATTENTION, HUMANITY, HUMOR/EMOTIONAL BEAT, PING RELEVANCE, NON-DECEPTIVE PERSUASION, PLATFORM FIT, SAFETY. Weak posts get improved, not published to hold cadence. Do not publish mediocre content merely to maintain cadence.

**Platform adaptation.** One canonical content concept; platform-specific manifestations (hook, length, visual format, pacing, caption style, CTA, comment strategy, platform vocabulary). Never blind cross-posts.

**Queue mechanics.** `outreach/content-queue.md` stays the ranked idea queue; its ranking rule is unchanged (real-signal frequency first). `ping-content/queue.json` items may carry an optional `content` block: mode, humor_opportunity (0-4), scores (the 12 dimensions), factual_basis, cta_type. post_next.py ignores unknown fields, so publishing controls are unchanged.

### 16l. Closed-loop learning
`outreach/angle-performance.md`: rolling tally of signal → angle → channel → response → outcome. Optimize toward qualified conversation → meeting → customer → revenue, never opens/clicks/follows.

**Content-dimension learning (2026-09-19).** For published Page content, log per post the input dimensions at queue time (content_type/mode, topic, hook_type, humor_score 0-4, controversy_score, timeliness, evidence_strength, CTA_type, platform) and fill outcomes after each post's OBSERVE step: impressions, engagement, shares, saves, profile_visits, inbound_questions, qualified_conversations, meetings, opportunities, customers, revenue. Learn four separate questions: WHICH CONTENT CREATES ATTENTION? WHICH CREATES TRUST? WHICH CREATES CONVERSATIONS? WHICH CREATES CUSTOMERS? Viral is not automatically valuable; serious is not automatically boring; promotional is not automatically bad. The 16k portfolio priors adjust from these reads. The per-post OBSERVE → REVIEW → one-improvement loop is defined in `ping-content/captions.md`.

**Evidence ledger (2026-09-19, Nolan's ruling).** PROVEN: the architecture (by audit and implementation). IMPLEMENTED BUT UNVALIDATED: the content framework; humor 0-4 scoring (current scores are hypotheses); portfolio priors (starting priors, not truth); hot-take, current-event, and competitor engines (structurally specified, real value unobserved); conversion ladder (specified, not validated against actual qualified conversations or customers). NOT STARTED: the learning loop; Sunday's OBSERVE is the first meaningful experiment. UNPROVEN: viral performance, until real distribution data exists. RESTRAINT (hard rule): never tune scores, priors, or portfolio weights before observations exist; pre-observation tuning optimizes our own assumptions. Sunday is the baseline experiment, not evidence the system works. After OBSERVE, the question is not "did the post do well" but: which content characteristics produced attention, trust, conversations, and commercial outcomes, and were those effects repeatable?

### 16m. Sweep output
Each run writes `goals/ping-social-outreach-campaign/hidden_files/sweep-<UTC-date>-round<N>.md` with: NEW SIGNALS, FOLLOW-UPS, OPPORTUNITIES, SOCIAL INTELLIGENCE, SEO-AEO, HOT PROSPECTS, SUPPRESSED, LEARNING. Nolan's chat message stays one line.
Then it appends ONE structured JSONL line to the shared run ledger `goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl` (same file the meta-ai-intel pass uses; no second ledger) via `~/workspace/outreach/append-sweep-run.py`, with `origin:"outreach-engine"`, sweep_id, started_at, ended_at, outcome, per-stage counts for the full loop (signal, research, candidate, validated, verified, prospect, outreach_sent, outreach_submitted, outreach_dm, responses, declines, bounces, followups, conversions, evidence_observations, ping_emitted), and evidence refs. Sweep lines never set brief_id, so they stay inert to the prompt-rotation jq and to the tandem verification gate. Every stage transition is derivable from the record without parsing prose.

### 16n. Non-negotiables
Never fabricate observations, reviews, or business problems. Never claim unmeasured rankings or AI visibility. Never identify reviewers or expose private info. Never spam social, trigger rate limits, or bypass restrictions. Never duplicate outreach or override a no. Never create new schedules or raise volume because signals increased. Never weaken suppression, cooldown, or frequency controls.

### 16o. LEARN-phase PING distillation (2026-09-13)
Generalizable campaign learnings have a route into PING. This is a doc procedure using existing tools, not a new pipeline. PING is the common intelligence substrate, never a prospect database: only high-quality, generalizable, VERIFIED intelligence goes there (consumer needs, failure patterns, market signals, campaign insights, validated relationships, contradictions and uncertainty). Operational prospect rows NEVER go to PING.

Each sweep may propose 0 to 3 generalizable observations distilled from the round (never prospect rows, never unverified claims). For each proposed observation:
1. Write the proposal as `goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/learn-<sweep-id>.md` with a provenance sidecar `learn-<sweep-id>.provenance.json` carrying `status:"answer_captured"`, `brief_id:"learn-<sweep-id>"`, and an empty `transitions` list. The brief_id MUST use the `learn-` prefix; it is never one of the four research cycle slugs.
2. Append the learn run line to the shared runs.jsonl: `~/workspace/outreach/append-sweep-run.py --sweep-id <sweep-id> --started-at ... --ended-at ... --outcome ok --learn-brief learn-<sweep-id> --sidecar learn-<sweep-id>.provenance.json`. This is the only engine line that sets brief_id, which makes it resolvable by the verification gate while staying inert to the prompt rotation.
3. Verification gate (human or authorized gate; never automatic): `~/workspace/tandem/mark-verified.sh <answer-file> --by "outreach-engine round-N"`. This appends the `verified` transition to the sidecar.
4. Emit: `~/workspace/tandem/emit-observation.py "learn-<sweep-id>" "<observation text>"`. The script fail-closes without a verified transition and records `accepted_by_ping` on the sidecar after a successful POST.
If a sweep yields no generalizable intelligence, it emits nothing to PING.
