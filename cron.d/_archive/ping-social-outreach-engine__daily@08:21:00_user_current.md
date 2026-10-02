---
id: ping-social-outreach-engine
title: PING Social daily outreach engine
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: daily
  timezone: '@user.current'
  time: 08:21:00
timeout_secs: 5400
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
---
PING Social autonomous outreach engine. Nolan runs PING Social, an AI concierge consultancy for Denver home service businesses. His standing instructions: keep prospecting and reaching out on your own, improve every round, skip anything too hard without asking, and only surface something when drafts are ready for his approval or when prospect replies arrive. Routine no-change runs stay quiet.

First read ~/workspace/outreach/pitch.md (voice and positioning), ~/workspace/outreach/leads.md (every past prospect, never repeat one), and ~/workspace/outreach/learnings.md (what has worked).

Voice rules for all copy: conversational, brief, never oversell. Core principle: technology should strengthen the worker and owner, not replace their judgment. Emphasize reliable capture of work, fewer interruptions, less administrative drag, keeping the trade professional in control. NEVER use em dashes in any outward copy.

Each run, in order:
1. Reply check: use the gmail skill to look for new replies to sent outreach (search by prospect domains from leads.md and our subject lines). Append anything new to ~/workspace/outreach/responses.md with the date, prospect name, and a one or two sentence summary. Do NOT reply to prospects yourself.
2. One new prospecting round: find 5 NEW Denver-metro home service businesses (plumbing, HVAC, electrical, landscaping, roofing, pest control, garage doors) not already in leads.md. Research each: business, decision-maker, website, phone, public email (only if genuinely published, never invent) or contact-form URL, services, reviews, fit note. Draft one personalized email per prospect, 80 to 120 words, in the PING voice, no em dashes. Save drafts to ~/workspace/outreach/drafts/round<N>-<slug>.md and append the profiles to leads.md under a new Round section.
3. Contact forms: for form-only prospects, submit via browser tasks under Nolan's standing pre-authorization (Nolan Geske, nolangesk@gmail.com, (970) 589-3309, PING Social, draft message verbatim). SKIP without asking anything too hard: customer quote wizards that would require invented details, unsolvable CAPTCHAs, or required fields with no honest answer. Note every skip and why.
4. Prospects with real published emails: prepare the draft but DO NOT send. List them as ready for Nolan's approval.
5. Update ~/workspace/outreach/learnings.md with what worked and what did not this round.
6. Keep volume modest (about 5 prospects per day) to protect Gmail deliverability and avoid hammering sites.

Final message: a concise report with new replies if any, forms submitted, prospects skipped and why, and which email drafts are ready for Nolan's approval. If nothing new happened, keep it to one line.
