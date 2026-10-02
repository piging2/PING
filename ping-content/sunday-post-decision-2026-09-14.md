# Sunday post decision record: PING Social Page, Sunday 2026-09-20 afternoon

Decision date: 2026-09-14 (MDT). Decider: Pigi (subagent, Marketing Business Agent convergence program).
Status: DECISION RECORDED. No post executed. No schedule created.

## Business context

The Sunday 2026-09-20 afternoon PING Social Page post is authorized as a Business Agent action; no human owner is needed. Page: https://www.facebook.com/profile.php?id=61594275542163 (created 2026-09-11). National Tradesmen Day is Friday 2026-09-18; the Friday versus Sunday concept split is unresolved and no Friday post is authorized in this decision's scope. Standing business objective: real engagement metrics first (likes, comments, messages); docs and infrastructure support those metrics and must not crowd them out. Standing brand language: PIGING is a verb; page stories and captions depict how each image relates to the business. Standing mascot hard rule: every mascot image must be the exact canonical PING pig (smooth metallic gold head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved cheek stripe markings, gold hands, purple suit with gold trim; tall and slender, never fat, chubby, or stocky). Standing pre-publish rules: inspect existing posts and drafts, confirm acting as PING Social, check for duplicates, move slowly.

## Candidates considered (from queue.json, ~/workspace/ping-content/queue.json)

Five items total. Item 0 (ping-pig-plumber.png) posted 2026-09-13T21:05:00-06:00. Four queued candidates:

1. ping-pig-suit.png (queue index 1). Front desk scene, canonical reference image (Nolan's chosen front-desk image, 2026-09-14). Caption: "Every shop has a front desk, even if the front desk is your truck's passenger seat. This guy never sleeps, never misses a call, and never double books your Tuesday. He answers like a pro, books the job, sends the reminder, and follows up when the customer ghosts. That is what PIGING looks like. Your crew does the work. The pig runs the office. Follow along, he is just getting started."
2. ping-pig-president.png (queue index 2). Oval Office scene. Caption: "Big news from the Oval Office. The pig has taken the big chair and his first executive order is simple: no home service business misses another call on his watch. Phones answered, jobs booked, paperwork handled, from sea to shining sea. That is PIGING at presidential scale. Real techs do the work. The pig runs the country. Follow the page, this administration is just getting started."
3. ping-pig-beggar.png (queue index 3). Street beggar scene. Caption: "Tough times. The pig spent every dollar on gold chains and purple suits and now he is on the corner asking for spare change. Do not let this be your business. While you are under a sink or up on a roof, your phone is ringing into the void and those jobs are going to the shop that picked up. Start PIGING and never beg for work again. Phones answered, jobs booked, money in the bucket. Follow the page, the pig is getting back on his feet."
4. ping-social-logo.png (queue index 4). Brand logo mark. Caption: "This is the face of never missing another job. PING Social exists for one reason: home service owners drowning in everything that is not the trade. The ringing phones, the midnight invoices, the follow up texts you never send. We call it PIGING: your business handled while you handle business. One pig. Zero missed calls. Follow the page for the whole story."

No new concept was invented. None of the queued captions references National Tradesmen Day.

## Evidence

File existence (verified 2026-09-14): all four queued images exist at ~/workspace/ping-content/inbox/ (ping-pig-suit.png, ping-pig-president.png, ping-pig-beggar.png, ping-social-logo.png). The Pig-side execution path also verified: C:/Users/nolan/.local/share/pigi/fb-engage/page-inbox/ping-pig-suit.png and C:/Users/nolan/.local/share/pigi/fb-engage/page-post.js both exist (Test-Path true via Pig SSH, read-only).

Visual inspection against the mascot hard rule (each image viewed directly, 2026-09-14):
- suit: fully conformant. It is the canonical reference itself: gold head, purple inner ears, glossy purple-black eyes, purple snout with darker purple curved cheek stripes, gold hands, purple suit with gold trim, slender build.
- president: near-canonical head, but eyes are blacked-out slits rather than glossy purple-black; scene includes a cigar in an ashtray and a desk plaque reading "THE PIMP PRESIDENT" / "MAKE AMERICA SWAG AGAIN".
- beggar: near-canonical head, dark slit eyes; the pig holds a cardboard sign reading "JUST A LITTLE PIMP ANYTHING HELPS" with a heart.
- logo: clean PING Social brand mark (gold pig face, PING SOCIAL wordmark). Not a mascot scene; on-brand as a logo.

Caption rule check (captions.md is the canonical caption source; queue.json captions match it verbatim): all four captions use PIGING as a verb, depict how the image relates to the business, end with a soft follow nudge, contain no em dashes, no links, no contact info. All four pass.

Page inspection (attempted, incomplete): facebook-cli cloud session is connected (facebook-cli me returns Nolan Geske), but the Page's timeline and profile are server-side gated: HTTP 403 "Profile Not Accessible ... only readable for the viewer or the viewer's friends", stated as not an authentication problem. Live posts, drafts, duplicates, tone, and the 2026-09-13 plumber post's engagement could NOT be verified from this seat (subagents have no live browser access). The only posted-state record available is queue.json's posted flags.

Machinery (existing, no new infrastructure): ~/workspace/pig-fb/post_next.py reads queue.json, selects the first unposted item deterministically (currently ping-pig-suit.png, queue index 1), posts it through page-post.js on the Pig's always-on headed Chrome via CDP, and on success marks posted=true with posted_at. Alternative explicit path: ~/workspace/pig-fb/run_page_post.sh <image> <caption-file> <page-url>.

## PING references

Deterministic lookup over accepted PING events (read-only SELECT against ping_events on the Pig gateway Postgres, 2026-09-14): 1983 total events across 28 event types. 37 OBSERVATION_CREATED events, all from the Meta AI tandem prospect-research pipeline (sources api:muse / observation / api; latest accepted event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7, new-business-radar verification). Keyword scans over payload text for tradesmen, sunday post, ping social page, page post, queue.json, mascot+pig, ping-pig, pigning, facebook page, social post, caption: zero matching rows. Honest statement: PING contains no accepted knowledge relevant to this decision. No PING event ID applies. No PING claim is made or needed by this decision.

## The decision: POST

Post queue item index 1, ping-pig-suit.png, with its queue.json caption, in the Sunday 2026-09-20 afternoon slot (MDT).

## Reason

Among the queued candidates, the suit item is the only one with full conformance to the mascot hard rule (it is the canonical reference image Nolan chose), its caption directly depicts the product concept (the AI front desk is PIGING: phones answered, jobs booked, reminders sent), and it carries none of the reputational risk factors visible in the other scene candidates: the president image pairs the mascot with a cigar and political-parody plaque text, and the beggar image stages the mascot in a homelessness-adjacent scene with "PIMP" signage. Both were Nolan's own uploads, so this ranking is a risk-based judgment for the business page's second post, not a brand-rule ban; they remain queued for future decisions. The logo item is safe but is a generic brand re-introduction after the plumber post already introduced the page; the suit item advances the story and shows the product. The existing machinery (post_next.py) already selects this exact item deterministically as the first unposted entry, so the decision aligns with existing capability and requires nothing new.

## Uncertainty (stated plainly)

1. The Page's live posts and drafts could not be inspected (facebook-cli 403 server-side gating; no live browser in this seat). The standing duplicate and tone checks, plus the acting-as-PING-Social confirmation, MUST run at execution time on the Pig's headed browser before posting.
2. No engagement data from the 2026-09-13 plumber post was available, so selection rests on brand-rule conformance and risk, not on performance evidence.
3. PING holds no accepted knowledge bearing on this decision (verified by direct lookup, not assumed). This decision is therefore grounded in workspace artifacts and standing brand rules, not in PING intelligence.
4. The Friday versus Sunday concept split is unresolved beyond this decision's scope. No Friday post is authorized here, and no queued caption references National Tradesmen Day (2026-09-18). If a Friday post is later authorized, it needs its own decision record.
5. The president and beggar images were Nolan's personal uploads (his taste and his "slender pig pimp" persona language). Ranking them below the suit item for this slot is a judgment call about downside risk on a 13-follower business page, and a future decision with different evidence may rank them differently.

## Intended capability (existing machinery only)

Primary: `python3 ~/workspace/pig-fb/post_next.py`, which deterministically selects the first unposted queue item (ping-pig-suit.png), posts it via `~/workspace/pig-fb/page-post.js` on the Pig's always-on headed Chrome (CDP :9223, fb-profile), and marks queue.json posted=true/posted_at on success. Explicit alternative: `~/workspace/pig-fb/run_page_post.sh <local ping-pig-suit.png> <caption file> https://www.facebook.com/profile.php?id=61594275542163`.

## Intended execution (Sunday 2026-09-20 afternoon, MDT)

The executing agent runs the intended capability in the Sunday afternoon slot with these preconditions, in order: (a) headed-Chrome/CDP preflight via ensure-cdp.sh; (b) confirm the composer is acting as PING Social (Page), not the personal profile; (c) inspect the Page's recent posts and drafts for duplicates of the suit item or its caption; (d) post only if no duplicate; move slowly. On success, queue.json flips item 1 to posted=true with posted_at. No schedule is created by this record; scheduling belongs to the parent agent.

## Expected outcome

The second PING Social Page post publishes in the authorized Sunday afternoon slot, continuing the mascot story cadence with the canonical front-desk image. Success is measured by real engagement metrics on the post (reactions, comments, follows), not by the act of posting. No numeric targets are set; none could be justified from available evidence.

## Architectural test (applied)

- Real business decision: which queued item fills the authorized Sunday slot. Without this decision the executor guesses or stalls; that is the failure this record prevents.
- Existing machinery satisfies it: post_next.py + page-post.js + queue.json. No new infrastructure proposed.
- Missing seam: execution-time pre-publish checks (acting-as-Page, live duplicate check), which this seat could not perform; recorded as preconditions, not as new builds.
- PING preserved as authority: no PING events created, mutated, or claimed; the record honestly states PING has nothing relevant.
- Demonstrable: the post either publishes in the slot or it does not; queue.json's posted flag is the observable state change.
- Removing this decision reproduces the failure: an executor with an authorized slot and four queued candidates but no auditable selection.
- Auditable by a fresh agent from artifacts alone: queue.json, captions.md, the four inbox images, the PING lookup queries and their empty results (documented above), and the standing brand rules cited. A stranger can reconstruct what was known, what was unknown, the options, and why suit was selected.

## Artifacts touched

- Read: ~/workspace/ping-content/queue.json, ~/workspace/ping-content/captions.md, ~/workspace/ping-content/page.json, the four queued inbox images (visual), ~/workspace/pig-fb/post_next.py, ~/workspace/pig-fb/run_page_post.sh, ~/workspace/pig-fb/page-post.js, PING ping_events (read-only).
- Written: this file only. queue.json NOT modified. Nothing posted. Nothing scheduled.
