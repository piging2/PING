# Q23 — EVIDENCE (claim → support → observation → source)
Audited: 2026-10-01 ~18:24 MDT
Worktree SHA: 2b5c95eef02f3c271c3c1966ec80df2f7e629876
Note: this falsifies Pigi's first-pass "PARTIAL" for Q23. Two of three claims terminate at real sources; the third terminates in prose at exactly the "live probe" step.

## Claim 1 — "770 events … 150 worker executions … 14 scenarios" (commissioning run)

- CLAIM (page.tsx receipt card, src/app/page.tsx ~line 368; hero card hero-evidence-card.tsx): "PING commissioning run, 14 scenarios, 770 events" and "150 worker executions completed in the run"; event_id e9591d7277246b27eb090abb2acece5864c58d8dcaf94701286c6f40ccd33153, recorded 2026-07-28T02:10:54Z, mission 51009ceae9ef316a LEAD_FOLLOWUP priority 3.
- SUPPORT: card labels it "Captured 2026-07-28" / "Not live activity."
- OBSERVATION: artifact on disk — /home/nolan/ping/gateway/COMMISSIONING_REPORT.json, generated_at 2026-07-28T02:10:55.367Z.
- SOURCE: same file: summary = {"scenarios": 14, "events": 770, "missions": 0, "workerExecutions": 150}; events array contains e9591d7277246b27… (verified by count and prefix match).
- TERMINATION: PASS at a real source. Caveat: the visitor cannot click through to it (no link on the page; the repo is private). Termination is real but visitor-opaque — matches the earlier "homepage termination unverified" note from the visitor's side.

## Claim 2 — "ping-gateway: healthy · constitution 1.0.0 · auth enforced on reads" + pulsing green "Live · probed 2026-09-16"

- CLAIM (hero-evidence-card.tsx:100-114): rendered as a live status line with an animated green dot and a "Live" badge.
- SUPPORT: the file comment says "plus a real live gateway probe (2026-09-16). Captured is labeled captured. Live is labeled live. Nothing is presented as live that is not."
- OBSERVATION: the rendered JSX is a hardcoded string. There is NO fetch, no API call, no prop, no build-time injection in hero-evidence-card.tsx or page.tsx. The green dot is `animate-ping` CSS on a static element.
- SOURCE: none. The "probe" exists only as a prose claim in the code comment.
- TERMINATION: FAIL. Break point: between the comment's "real live gateway probe (2026-09-16)" and the rendered element — the comment asserts a probe; the code renders a constant. A visitor reading "Live" is told a live fact that is a 15-day-old snapshot. This directly violates the comment's own "Nothing is presented as live that is not."

## Claim 3 — "Append-only store, now DB-enforced: the trigger rejects UPDATE and DELETE" (LOOP_BEATS /remember; status strip "Canonical events")

- CLAIM (page.tsx:57, page.tsx STATUS_STRIP ~line 120): trigger rejects UPDATE/DELETE; "TRUNCATE is not covered."
- SUPPORT: labeled "Live"; prose notes "(captured 2026-09-16/17)".
- OBSERVATION: /home/nolan/ping/database/events.sql lines 40-60 define prevent_event_updates() and prevent_event_deletes() raising exceptions, with BEFORE UPDATE / BEFORE DELETE triggers on the events table.
- SOURCE: real migration SQL in the PING repo (source-plane). Whether the trigger is DEPLOYED on the live Oracle database was not probed here (belongs to journal/effect swarms; the homepage's "Live" label is asserted, not evidenced on-page).
- TERMINATION: PASS at the source-definition level (the trigger exists as written source). Note the page honestly discloses "TRUNCATE is not covered." The "Live" status itself is an asserted label, not a probed read.

## Verdict

PROPOSITION: "A visible claim terminates at claim → support → observation → source."
STATUS: 2 PASS / 1 FAIL. Claim 2 (the hero "Live" gateway badge) fails: the chain breaks between the code comment and the hardcoded JSX.
SMALLEST FIX IF FAIL: wire the badge to a build-time probe that writes the probe timestamp + result into the page (or delete the "Live" badge and label the line "Last probed 2026-09-16").
