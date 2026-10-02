# Email queue — 2026-09-14 UTC cap (10 sends, opens 18:00 MDT 2026-09-13)

Order per standing rules: (1) follow-ups first, (2) new cold emails FIFO oldest-first.
Detached-run sending: attempt sends in order; verify EVERY acceptance in sent mail before marking SENT (a timed-out CLI receipt is not a failed send). Kill on approval stall; never loop retries.

## 1-3. F1 follow-ups (ladder priority; initial sends 2026-09-10, day 4 of 4-7 window)
1. `drafts/round32-f1-canyon-creek-electric.md` → john@canyoncreekelectric.com (Canyon Creek Electric, Montrose). Review check 2026-09-12 clean (Birdeye 5.0/26), no review trigger.
2. `drafts/round32-f1-licos-electric.md` → office@licoselectric.com (Lico's Electric LLC, Rifle). Review check 2026-09-12 clean (Birdeye 4.3/16, recent positive), no review trigger.
3. `drafts/round32-f1-durgin-electric.md` → office@durginelectric.com (Durgin Electric, Carbondale). Newest intel in F1: public listing shows office M-F 8-4:30 while emergency services advertised.

On acceptance: flip pipeline/leads status to F1 SENT, log in follow-ups.md with result, update JSONL suppression_state in-follow-up-ladder / next_eligible_action "F2 eligible 2026-09-19+ (F1 sent 2026-09-14)".

## 4-10. Cold FIFO (oldest drafts first; rest of round-26 batch, queued 2026-09-11)
4. `drafts/round26-high-noon-solar-email.md`
5. `drafts/round26-preferred-garage-doors-email.md`
6. `drafts/round26-renwick-tiles-email.md`
7. `drafts/round26-shaw-solar-email.md`
8. `drafts/round26-sunsense-solar-email.md`
9. `drafts/round26-top-notch-hardwood-email.md`
10. `drafts/round27-alpine-hot-tub-moving-email.md`

Recipient addresses are in each draft file's To: line. Pre-send: cheap-verify Gmail/Yahoo/odd-domain addresses; never send to a bounced address.

## Rolled to 2026-09-15 UTC queue (bumped by F1 priority + FIFO order)
- Rest of round-27 FIFO: round27-aspen-floor-home-services-email.md, round27-blackbird-kitchen-bath-email.md, round27-decktec-outdoor-designs-email.md, round27-eckert-renovations-email.md, round27-honk-key-lock-safe-email.md (HOT; email VERIFIED 2026-09-14: info@honkkeylocksafe.com company-published in 2026-06-19 GlobeNewswire press release; hello@ NOT on current site. Draft To: updated to info@.), round27-miracle-maids-denver-email.md, round27-pride-n-service-junk-removal-email.md, round27-road-scholars-moving-email.md, round27-sander-and-sons-email.md, round27-signature-designs-kitchen-bath-email.md
- round29-alpine-pressure-email.md, round30-apex-waste-solutions-email.md, round30-alpine-fencing-email.md, round30-grand-valley-concrete-polishing-email.md, round30-marathon-concrete-coatings-email.md
- (then round-31 research additions, pending classification + drafting)

## CONSUMED — 2026-09-13 ~20:24-20:35 MDT (round 46)
10/10 sends accepted by Gmail, all verified in sent mail (message IDs 1a09db4ec8259dd5 through 1a09db618f5e19a3):
1. Canyon Creek Electric F1 → john@canyoncreekelectric.com → F1 SENT
2. Lico's Electric LLC F1 → office@licoselectric.com → F1 SENT
3. Durgin Electric F1 → office@durginelectric.com → F1 SENT
4. High Noon Solar → information@highnoonsolar.com → SENT
5. Preferred Garage Doors → preferredgaragedoors@gmail.com → SENT
6. Renwick Tiles → info@renwicktiles.com → SENT
7. Shaw Solar → john@shawsolar.com → SENT
8. Sunsense Solar → Sunsense@sunsensesolar.com → SENT
9. Top Notch Hardwood Flooring → KWILSON@TOPNOTCHHARDWOODFLOORS.COM → SENT
10. Alpine Hot Tub Moving → alpinehotubmoving@rocketmail.com → SENT (accepted), then BOUNCED 20:19 MDT: 552 "mailbox not found" (dead mailbox, logged round 48). F1 ladder cancelled; email route dead.

Cap 10/10 consumed for 2026-09-14 UTC day. No approval stalls. Pipeline.md statuses flipped (3 F1 SENT, 7 SENT); JSONL rows updated for the 4 with canonical rows; follow-ups.md logged.
