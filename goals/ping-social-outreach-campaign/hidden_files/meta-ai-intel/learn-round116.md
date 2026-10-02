# LEARN — outreach-engine round 116 (2026-09-22)

## Observation: mailto-href reroute is the legitimate path when a queued address leaves the own site

VERIFIED this round: WBS Coatings' queued draft targeted contact@wbscoatings.com, but the current own site no longer shows that address anywhere (footer + /contact-us inspected in the live browser, 2026-09-22 08:34 MDT). Instead of parking the slot, the engine inspected the site's mailto hrefs: jstockton@wbscoatings.com is the address in the published footer and /contact-us mailto links. The rerouted cold fired to jstockton@ and is Gmail-accepted (id 1a0ca27c7c7006e2, 2026-09-22 11:26 MDT, per-recipient in:sent 0, send-eligibility.py exit 0, chain re-verified INDEPENDENT).

PATTERN (generalizable, durable rule): when a queued draft's address disappears from the business's current own site, the next check is the site's mailto hrefs — the address in the published mailto href IS the business's own published contact and a legitimate reroute target. This is the same standard that cleared High Mountain Hearth this morning (kim@highmountainhearthsolutions.com via mailto hrefs). Escalation ladder now three rungs: (1) fetched-text verbatim, (2) mailto-href inspection, (3) HOLD.

WHY IT MATTERS: businesses change their published contact without telling anyone; the inbox you wrote to last month may not exist. The address bar is not a once-ever check. The ladder preserves the no-invention rule (the reroute address must be the site's own published mailto, not a directory guess) while recovering sends that a strict parser would have parked.

UNCERTAIN: how often mailto-href reroutes convert vs verbatim addresses (WBS is the second live instance; no reply data yet).

SOURCE EVIDENCE: ~/workspace/outreach/pipeline.md "## Round 115 — mailto verdict" (WBS mailto verdict, browser-observed 2026-09-22); drafts/round116-wbs-coatings-jstockton.md; email-queue-2026-09-22.md (WBS reroute block); sent mail id 1a0ca27c7c7006e2.

## Observation: cap counts must come from a per-day sent-mail enumeration, never a carried-forward lane count

VERIFIED this round: the round-115 report closed at 7/10 for the 2026-09-22 UTC day, and the round-116 Gmail lane (baseline ~11:15 MDT) also reported 7/10 — but a full in:sent newer_than:1d enumeration shows 9/10. The missing send: High Mountain Hearth cold (kim@highmountainhearthsolutions.com, 2026-09-22 08:54:59 MDT, id 1a0ca99cedbee68ff). The mailto-verdict run fired it at ~09:00 MDT and recorded 8/10; the reply check's baseline (~08:25) predated it and the lane enumerated per-address rather than per-day, so 7/10 carried forward through two records.

PATTERN (generalizable, guardrail): in-flight sends change the count between a lane's baseline and the engine's reconciliation. The only trustworthy cap number is a full per-day sent-mail enumeration (in:sent newer_than:1d filtered to the UTC day) run at send time. A carried-forward count is a stale projection, not a count.

WHY IT MATTERS: the 10/day email cap protects Gmail deliverability. An undercounted cap is the exact failure mode that would let a later run overshoot it. This round the undercount was 2 slots (7 vs 9); the final UTC-day slot was intentionally left unfilled after reconciliation rather than risked.

UNCERTAIN: whether any earlier day's closing count was similarly stale (reconciliation runs going forward will re-verify, not reconstruct).

SOURCE EVIDENCE: email-queue-2026-09-22.md "## Round-116 cap reconciliation"; gmail triage in:sent newer_than:1d (9 accepted: 4 round-111 batch, 5 on 2026-09-22 08:36-11:26 MDT); round-115 sweep report (7/10); lane A reply-check (7/10, baseline ~11:15 MDT).

## Provenance

- Raw artifact: this file (learn-round116.md), written by outreach-engine round 116.
- Verification: WBS reroute verified in sent mail (id 1a0ca27c7c7006e2) + per-recipient in:sent 0 + eligibility exit 0; cap count verified by full in:sent enumeration at 11:37 MDT 2026-09-22.
- Status: VERIFIED per mark-verified.sh (outreach-engine round 116 operator review).
