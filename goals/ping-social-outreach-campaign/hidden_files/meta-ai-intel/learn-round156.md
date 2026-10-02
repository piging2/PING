# LEARN — outreach-engine round 156 (2026-09-28)

## Observation: the DM reply check's primary path is now the Pig-side thread read, and the fail-closed HOLD validated end to end

VERIFIED this round: after three consecutive rounds of Messenger Companion `threads_fetch` transport failures (rounds 153-155), a direct Pig-side `check-dm-thread.js` read of the Spurlock thread (via the Pig's headed Chrome, portable Windows node, house CDP :9223) succeeded on the first attempt. The read showed the initial DM ("Message sent Thursday 8:21 AM", verbatim, "Sent 3d ago") as the last thread message with NO reply, so the round-154/155 fail-closed HOLD on DM follow-ups was lifted and the Spurlock DM F1 fired the same run (send-dm-v2.js, `verify_sent_text_visible=true`, in-thread verified).

PATTERN (generalizable, durable rule): the DM reply check now has TWO paths and their roles invert — (1) Pig-side per-thread read is the PRIMARY (deterministic, works when transport is healthy, doubles as the send-verification path), (2) the Messenger Companion bulk unread sync is the FALLBACK (it is the one that failed 3 rounds running). The observed "Chat history is missing / Enter your PIN to restore chat history" notice in the Messenger dialog is the likely root cause of the Companion-side failures (server-side chat-history encryption state), not a local daemon bug — round 154's UNCERTAIN about local-vs-server is now resolved toward server-side. Standing update to the round-154 fail-closed rule: DM follow-ups HOLD on UNVERIFIED, and the read that clears the hold is the Pig-side thread check, which also self-verifies the send in the same run.

WHY IT MATTERS: the fail-closed mechanism designed in round 154 just proved itself across a full cycle — HOLD fired on unverified state for three rounds, a verified read arrived, the hold lifted, the F1 sent with in-thread verification, zero duplicate risk. That is the exact loop the campaign's hardest constraint (never double-contact, never contact a replier) depends on. The 09-29 DM F1 cohort (Good Neighbors Fencing, Genesis Appliance Service, D20 Locksmith Services) can now be cleared the same way: one Pig-side thread read each before their F1s fire.

UNCERTAIN: whether the PIN-restore prompt would permanently fix the Companion sync; not attempted (the Pig-side path is sufficient, and the prompt asks for a user action the detached run cannot supply). Also uncertain whether send-dm-v2.js's focus sequence stays reliable on heavier Pages; one clean send is a single data point.

SOURCE EVIDENCE: round-156 run transcript (check-dm-thread.js output `ok=true, probe_found=true, no reply in thread excerpt`; send-dm-v2.js output `sent=true, verify_sent_text_visible=true`, screenshot C:/Windows/Temp/spurlock-f1-1790583381514.png); facebook-dms.md round-156 section; learn-round154.md (the rule this validates); follow-ups.md round-156 section.

## Provenance

- Raw artifact: this file (learn-round156.md), written by outreach-engine round 156.
- Verification: the node script outputs are in this run's transcript; screenshots on the Pig's C:/Windows/Temp; the PIN notice quoted from the check-dm-thread.js dialog scan.
- Nothing here is a prospect row; no unverified claims; no contact info invented.
