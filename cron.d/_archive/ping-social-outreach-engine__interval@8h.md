---
id: ping-social-outreach-engine
title: PING Social daily outreach engine
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-09T02:12:55
  every: 8h
timeout_secs: 5400
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
---
PING Social autonomous outreach engine, high-volume perpetual mode. Nolan runs PING Social, an AI concierge consultancy for Denver home service businesses. His standing instructions: reach out to as many prospects as possible, keep improving every round, keep researching new candidates perpetually until he says stop (only stopping conditions are rate or tool limits), skip anything too hard without asking, and only surface something when prospect replies arrive or a real mistake or genuine decision needs him. Fully autonomous: never wait for Nolan to trigger a run or approve queued work; routine runs stay quiet.

First read ~/workspace/outreach/pitch.md (voice and positioning), ~/workspace/outreach/leads.md (every past prospect, never repeat one), ~/workspace/outreach/pipeline.md (the persistent candidate pool), ~/workspace/outreach/facebook-dms.md (Facebook outreach log), and ~/workspace/outreach/learnings.md (what has worked).

Voice rules for all copy: conversational, brief, never oversell. Core principle: technology should strengthen the worker and owner, not replace their judgment. Emphasize reliable capture of work, fewer interruptions, less admin drag, keeping the trade professional in control. NEVER use em dashes in any outward copy. Every message opens with an explicit "I am not a customer and this is not a service request" line.

Each run, in order:
1. Reply check: use the gmail skill to look for new replies to sent outreach (search by prospect domains from leads.md and our subject lines). Append anything new to ~/workspace/outreach/responses.md with the date, prospect name, and a one or two sentence summary. Do NOT reply to prospects yourself.
2. Work the pipeline: pull the next 8 to 10 NEW-status prospects from ~/workspace/outreach/pipeline.md (prefer trades not contacted recently). Draft one personalized email per prospect, 80 to 120 words, in the PING voice, no em dashes, with the not-a-customer line first. Save drafts to ~/workspace/outreach/drafts/round<N>-<slug>.md, append the profiles to leads.md under a new Round section, and flip their pipeline.md status from NEW to CONTACTED.
3. Perpetual research: research at least one new trade segment per run and append 8 to 15 fresh candidates to ~/workspace/outreach/pipeline.md with status NEW, deduped against leads.md and pipeline.md (never repeat a business). Record only contact info genuinely published on the business's own site; never invent emails, addresses, or owner names. Update the Ecosystem notes section with anything new learned about segment heat or timing.
4. Social media angle (perpetual): scan Nolan's Western Colorado Facebook groups for new business-promo posts using facebook-cli groups posts --group-id (Western Colorado Message Board & Classifieds 5456977881034408, Buy & Sell in Grand Junction 108728816001912, Delta 1504277980997243, Orchard Mesa 486356801008208, Fruita 3741333852807065, Living In Grand Junction Colorado 1082777608577867). Log genuine prospects in ~/workspace/outreach/facebook-dms.md and add them to pipeline.md under "Facebook — Western Colorado" with status NEW, deduped. The group-posts API strips author identity: send a Messenger DM only when the recipient resolves via Messenger contacts or an existing thread, max 3 per day, genuinely personalized to their post, with the not-a-customer line first. Never message guessed recipients. Follow the messenger skill safety rules. Log every send and skip.
5. Contact forms: for form-only prospects, submit via browser tasks under Nolan's standing pre-authorization (Nolan Geske, nolangesk@gmail.com, (970) 589-3309, PING Social, draft message verbatim). SKIP without asking anything too hard: customer quote wizards that would require invented details, unsolvable CAPTCHAs, or required fields with no honest answer. Note every skip and why.
6. Prospects with real published emails: send up to 10 cold emails per UTC day to protect Gmail deliverability. Drafts that exceed the cap are queued and sent automatically when the next UTC day's cap opens; never hold queued drafts for Nolan's approval.
7. Update ~/workspace/outreach/learnings.md with what worked and what did not this round.

Final message: only surface prospect replies, real mistakes, or genuine decisions. Otherwise keep it to one line.
