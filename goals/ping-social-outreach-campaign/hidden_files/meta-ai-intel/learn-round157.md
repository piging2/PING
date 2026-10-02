# LEARN — outreach-engine round 157 (2026-09-28)

## Observation: Page-DM gating now has a complete, rehearsed procedure — business-name sent search satisfies the email-history gate, and the Pig page check is the DM-eligibility verifier

VERIFIED this round: Elite Pool Professionals (Page ID 61586183197807) was DM-staged by the discovery job with DM eligibility UNVERIFIED (facebook-cli `profile info` returned HTTP 403 server-side). The engine job ran Pig-side `check-page-generic.js` against the Page URL and got a definitive answer on the first attempt: `hasMessageButton=true`, with Page identity re-verified on the rendered page (name, bio "Grand Junction's Elite Pool Pros!", 181 followers, Fruita, CO, Swimming Pool & Hot Tub Service category). The initial DM then sent via `send-dm-v2.js` (`sent=true, verify_sent_text_visible=true`, screenshot archived) after the send-eligibility gate returned exit 0.

PATTERN (generalizable, durable rule): for a Facebook Page DM, the `send-eligibility.py --action dm` gate's mandatory `gmail-sent-count` field is satisfied by a Gmail `in:sent "<Business Name>"` business-name search, because a Page DM has no email address to query. This round's first gate attempt without the count exited 1 INELIGIBLE ("mandatory verification missing, fail closed" — a tool-limitation artifact, not a suppression verdict); the business-name search returned "No messages found", the gate was re-run with `--gmail-sent-count 0`, and it exited 0 ELIGIBLE. Standing rule: NEVER pass an unverified count; the business-name sent search IS the verification for Page DMs. The gate also scans facebook-dms.md / follow-ups.md / sweep summaries for prior acceptance markers on the business name, which is the real no-double-contact check for the DM lane.

PROCESS CORRECTION (generalizable): `check-page-generic.js` on the Pig is now the standing DM-eligibility verifier for business Pages — facebook-cli's `profile info` 403s server-side for Pages, so its 403 is not evidence of anything. A side benefit: the rendered Page also surfaced Page-published contact info the discovery summary had missed (Elite publishes (970) 683-1301 as its Page phone; its promo post said "give us a call" with no number). Page DM stays first-choice per Nolan's directive; the phone enriches the pipeline row instead of displacing the DM route.

WHY IT MATTERS: the never-double-contact guarantee is the campaign's hardest constraint, and the DM lane (9 of today's 10/day DM budget still open; the 09-29 DM F1 cohort fires tomorrow) needs a gate procedure that works for Page recipients, not just email-bearing ones. This round produced the rehearsed procedure end to end: verify Message button + identity (Pig), verify zero prior sent mail (Gmail business-name search), gate exit 0, send via the Pig headed-Chrome path with in-thread verification, log everything. It is now the repeatable pattern for every future Page DM.

UNCERTAIN: whether the Pig page check stays reliable when Pages carry heavier notification/marketplace chrome (send-dm-v2.js's focus sequence has one clean send each on Spurlock and Elite; two data points). Also uncertain whether facebook-cli's 403 is permanent or transient for business Pages; the Pig path is sufficient either way.

SOURCE EVIDENCE: round-157 run transcript (check-page-generic.js output `hasMessageButton=true` + rendered Page text; `in:sent "Elite Pool Professionals"` = "No messages found"; send-eligibility.py `--action dm --gmail-sent-count 0` exit 0 ELIGIBLE; send-dm-v2.js output `sent=true, verify_sent_text_visible=true`, screenshot C:/Windows/Temp/elite-pool-professionals-1790624310318.png); facebook-dms.md round-157 section; pipeline.md Elite row (DM SENT); drafts/dm-round157-elite-pool-msg.txt (639 bytes, Pig-side byte-count verified before send).

## Provenance

- Raw artifact: this file (learn-round157.md), written by outreach-engine round 157.
- Verification: the node script and gate outputs are in this run's transcript; screenshots on the Pig's C:/Windows/Temp; the Page phone quoted from the rendered Page text.
- Nothing here is a prospect row; no unverified claims; no contact info invented.
