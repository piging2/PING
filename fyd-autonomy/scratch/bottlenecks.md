# Bottleneck hunt (reader 6/6, completed 2026-09-27T00:19:51Z)

## Hit list (judged)
1. Staging MEMORY.md:143 / ~/MEMORY.md - BLOCKED on Nolan's one-time Instagram login (2FA). YES required (human-only login).
2. Staging MEMORY.md:142 - TikTok login blocked on Nolan. YES required.
3. ~/workspace/outreach/instagram-engagement.md:745 - ig-profile Chrome CDP wedge needs Nolan manual close/reopen. NO (unclear). Diagnosis: missing capability (no graceful-restart-with-session-preservation path).
4. ~/workspace/outreach/threads-engagement.md:416,451,459,469 - no browser action per Sept-16 force-kill lesson; restart needs Nolan's word. NO (unclear). Diagnosis: unclear authority (one-time trauma -> over-broad permanent gate).
5. ~/workspace/GRILLING-BRIEF.md:205 - Threads site-data clear origin-scoped and safe, stopped anyway. NO. Diagnosis: unclear authority (rule too coarse).
6. ~/workspace/your_files/hardening-pass-2026-09-13.md:62 - bearer key printed in tool output; no rotation without Nolan. YES required (credential escalation).
7. ~/workspace/GRILLING-BRIEF.md:430 - secret rotation needs Nolan's word. YES required.
8. ~/workspace/goals/ping-social-outreach-campaign/hidden_files/linkedin-launch-2026-09-13.md:50 - LinkedIn warmup only on Nolan's word. YES required (new outreach channel = external effect).
9. ~/workspace/outreach/content-queue.md:3 - content not auto-published; Nolan decides. YES required (public publishing).
10. ~/workspace/outreach/x-engagement.md:526 - never-re-engage relaxation needs Nolan's word. YES required (guard semantics change; he later declined).
11. ~/workspace/outreach/night-shift-2026-09-15.md:100 - browser OAuth + branch review before merge. YES required.
12. ~/workspace/outreach/night-shift-2026-09-15.md:245,219,269,291 - morning review pile of routine driver fixes (exit codes, regex scoping, retry wiring). NO (unclear). Diagnosis: unclear authority (no bounded L-level authority for low-risk driver fixes).
13. ~/workspace/outreach/research-scratch-round71.md:110 - widening discovery pool needs Nolan's call. NO (unclear). Diagnosis: unclear authority (targeting-rule ownership ambiguous).
14. ~/workspace/ping-migration/morning-report-2026-09-16.md:77 - GitHub App install is Nolan's call. YES required.
15. ~/workspace/outreach/night-shift-2026-09-15.md:187 - Instagram/Threads 2FA needs Nolan. YES required.
16. Staging MEMORY.md:286 - tunnel approval to Nolan's phone; GOOD pattern: packaged as one-tap approval. YES required.

## Tally
- Legitimate gates: 11 (1,2,6,7,8,9,10,11,14,15,16)
- Unclear authority: 4 (4,5,12,13)
- Missing capability: 1 (3)

## 3 most common bottleneck patterns
1. One-time trauma becomes permanent blanket gate (Sept-16 force-kill lesson blocks even graceful/origin-scoped/watchdog-recoverable ops).
2. Human-only auth actions with no low-friction delegation path (only the tunnel case used a one-tap approval bundle).
3. "Proposal-only" code authority turns routine fixes into morning-review debt; training-curriculum.md:63 is the codified root.
