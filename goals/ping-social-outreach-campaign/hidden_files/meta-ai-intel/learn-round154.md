# LEARN — outreach-engine round 154 (2026-09-27)

## Observation: DM reply status UNVERIFIED fails closed — an unreadable inbox is not a zero-reply inbox

VERIFIED this round: the Messenger thread sync failed with a transport error (retryable) on the explicit retry in round 154, the second consecutive round of failure after round 153's identical failure. Local cache holds 0 threads; the daemon-level delegation returned `error_reason: transport, operation: threads_fetch`. Two rounds running, the DM reply check cannot complete: no unread-thread read, no per-thread verification.

PATTERN (generalizable, durable rule): DM ladder logic treats "no reply seen" as the fire condition for the next follow-up. When the reply check cannot run, the state is UNVERIFIED, not zero. Firing a DM follow-up on UNVERIFIED risks double-contacting a prospect who already replied (the campaign's strictest violation class after the never-re-engage rule). The correct action is HOLD on all DM follow-up sends until a verified unread read completes: Spurlock DM F1 (window 2026-09-28 to 2026-10-01, draft written round 152), the 09-29 DM F1 cohort (Good Neighbors Fencing, Genesis Appliance Service, D20 Locksmith Services, drafts written round 150), and Coldiron's Creations F2 (window through 2026-10-03, thread reply status unverified through three inspection attempts). Email is unaffected: Gmail reads succeed, so email ladders proceed normally. The Pig-side headless Chrome path (check-dm-thread.js, used for Coldiron's) is a read-only fallback for single-thread inspection but does not cover the bulk unread check the CLI owns.

WHY IT MATTERS: this run's transport failure coincides exactly with the DM F1/F2 window opening. Without the fail-closed rule, the next run would fire Spurlock's F1 blind. A one-line discipline (status UNVERIFIED = no DM follow-up sends) protects the campaign's hardest constraint at the moment it matters most.

UNCERTAIN: whether the Messenger transport failure is local (daemon/socket) or server-side; Pig-side Chrome reads were healthy as of round 150, which argues for a local/daemon-layer issue. Not yet diagnosed.

SOURCE EVIDENCE: round-154 run transcript (`hatch_messenger_cli sync threads --since-days 7` -> `{"success":false,"error_reason":"transport","operation":"threads_fetch","retryable":true}`); round-153 sweep summary (same failure, same error class); drafts/dm-round152-f1-spurlock.txt; round-150 DM F1 cohort drafts.

## Provenance

- Raw artifact: this file (learn-round154.md), written by outreach-engine round 154.
- Verification: the sync command output is in this run's transcript; round-153 failure logged in sweep-2026-09-27-round153.md. DM thread-list cache empty is observable state, not a claim.
- Nothing here is a prospect row; no unverified claims; no contact info invented.
