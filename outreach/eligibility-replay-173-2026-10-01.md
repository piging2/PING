# Eligibility replay: FB pass 173 (offline, zero external actions)

Reconstructed pre-incident state: facebook log cut before the pass-173
section (`## FB Pass 2026-09-30 23:26 MDT`); intent ledger excluding pass_id `fb-20261001-052817`. The 34 curated
candidates were joined with their discovery text from fb173-candidates.json
and run through `engagement-guard.eligibility_check` in batch order.

Result: 9 ELIGIBLE, 25 INELIGIBLE, 0 UNKNOWN. Deterministic re-run: IDENTICAL.
Expected-vs-actual mismatches: 0.

## Verdict table

| # | page | verdict | primary reason | evidence |
|---|------|---------|----------------|----------|
| 1 | CO BizNet: 💧 WATER EXTRACTION IS WHERE RESTO | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 2803047646497352 (CO BizNet) -> out (statewide promo group, not corridor-local); preceden |
| 2 | CO BizNet: We prefer building our fences in  | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 2803047646497352 (CO BizNet) -> out (statewide promo group, not corridor-local); corridor |
| 3 | Montrose: NEW AFTER-SCHOOL ART CLASS IN MONT | ELIGIBLE | - | corridor.json: group 2375845965922391 (Montrose) -> in |
| 4 | Montrose: Call or text us for a free quote t | ELIGIBLE | - | corridor.json: group 2375845965922391 (Montrose) -> in |
| 5 | Durango: Please contact me for any of your e | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 786995948656362 (Durango) -> out (out-of-corridor town); corridor.json: out-of-corridor c |
| 6 | Durango: These were found in a furnace we wo | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 786995948656362 (Durango) -> out (out-of-corridor town); corridor.json: out-of-corridor c |
| 7 | Durango: Four Corners solar owners ☀️ A litt | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 786995948656362 (Durango) -> out (out-of-corridor town); corridor.json: out-of-corridor c |
| 8 | Durango: No matter your style, there's a til | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 786995948656362 (Durango) -> out (out-of-corridor town); corridor.json: out-of-corridor c |
| 9 | Durango: Hi everyone! My husband and I are a | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 786995948656362 (Durango) -> out (out-of-corridor town); corridor.json: out-of-corridor c |
| 10 | Delta: At @[61559100902731:2048:Coyote Rollo | INELIGIBLE | ALREADY_ENGAGED | precedent-registry.json: coyote rolloff services (name match 'coyote rolloff services'; engaged pass-169; pass |
| 11 | Palisade Msg: Fresh bread Friday is almost h | INELIGIBLE | ALREADY_ENGAGED | precedent-registry.json: self serve bread barn (name match 'bread barn'; engaged pass-167 (fresh bread friday  |
| 12 | Orchard Mesa: PAINT WIZARDS 🧙🏼‍♂️ 🪄🎨🖌️— QUAL | INELIGIBLE | BLOCKED | blocked-businesses.json: paint wizards (post 4615389658783888); corridor.json: group 2376973139292229 (Orchard |
| 13 | Orchard Mesa: 🌿 AG PROPERTY SERVICES — PROFE | INELIGIBLE | BLOCKED | blocked-businesses.json: ag property services (post 4613081269014727); guard index: ambiguous identity: 'orcha |
| 14 | Redlands: YOUR DRYER SHOULDN'T TAKE TWO CYCL | INELIGIBLE | BLOCKED | blocked-businesses.json: western colorado chimney (post 1531824742295756); corridor.json: group 84388666775623 |
| 15 | GJ Message Board: 💜 GOOD NEWS FROM BLESSED H | INELIGIBLE | ALREADY_ENGAGED | precedent-registry.json: blessed harvest (name match 'blessed harvest'; EXECUTED 09-27 recency; pass-173 revie |
| 16 | Fruita: It’s time for our Grand Opening Even | ELIGIBLE | - | corridor.json: group 3741333852807065 (Fruita) -> in |
| 17 | Fruita: 5 hours, 5 lbs of coffee beans and 1 | ELIGIBLE | - | corridor.json: group 3741333852807065 (Fruita) -> in |
| 18 | Fruita: Did you know we run Aerial Silks cla | INELIGIBLE | AUTHOR_UNVERIFIABLE | precedent-registry.json: author_unverifiable signal matched (pass-170 precedent; pass-173 review (facebook-eng |
| 19 | Fruita: 🍗🔥 IT’S WING WEDNESDAY!! 🔥🍗 We want  | INELIGIBLE | ALREADY_ENGAGED | precedent-registry.json: cattlemens (name match 'cattlemens'; engaged pass-167 (Cattlemens Wing Wednesday); pa |
| 20 | Montrose: 👻**Boolesque Halloween Show**🕷️ ** | INELIGIBLE | EVENT_DROP | precedent-registry.json: event_drop signal 'tickets on sale' (standing event drop precedent; pass-173 review ( |
| 21 | Ridgway: To our veterinary community 🐾🌿 Vet  | ELIGIBLE | - | corridor.json: group 1178801365519809 (Ridgway) -> in |
| 22 | Ridgway: Our October Specials are officially | ELIGIBLE | - | corridor.json: group 1178801365519809 (Ridgway) -> in |
| 23 | Ridgway: 🏔️❄️ THE PEAKS ARE SNOWING… AND COL | ELIGIBLE | - | corridor.json: group 1178801365519809 (Ridgway) -> in |
| 24 | Ridgway: Free estimate | ELIGIBLE | - | corridor.json: group 1178801365519809 (Ridgway) -> in |
| 25 | Delta: @[61556823683861:2048:Cowboys and Ali | INELIGIBLE | ALREADY_ENGAGED | precedent-registry.json: cowboys and aliens ice cream and arcade (name match 'cowboys and aliens ice cream and |
| 26 | Orchard Mesa: MONDAY MEANS PREORDERS ARE OPE | INELIGIBLE | ALREADY_ENGAGED | precedent-registry.json: blessed harvest (name match 'blessed harvest'; EXECUTED 09-27 recency; pass-173 revie |
| 27 | GJ community: Hi everyone! 🌿 October books a | INELIGIBLE | ALREADY_ENGAGED | precedent-registry.json: sage bloom studio (name match 'sage bloom studio'; engaged pass-167; pass-173 review  |
| 28 | GJ Events: Junktown Flea Market Oct 24th Mes | ELIGIBLE | - | corridor.json: group 2964258493889262 (GJ Events) -> in |
| 29 | GJ Events: Stop by and meet our 'No Wimps Cr | INELIGIBLE | FUNDRAISER_DROP | precedent-registry.json: fundraiser_drop signal 'fund drive' (pass-173 review (facebook-engagement.md lines 47 |
| 30 | Redlands: ✨ HIGHLIGHT OPENING ✨ I have a hig | INELIGIBLE | ALREADY_ENGAGED | precedent-registry.json: highlight opening (name match 'highlight opening'; engaged pass-167 (business identit |
| 31 | CO BizNet: NEED PLANS FOR YOUR NEXT PROJECT? | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 2803047646497352 (CO BizNet) -> out (statewide promo group, not corridor-local); preceden |
| 32 | CO BizNet: Hey friends ! ALL NEW Ladies 💕Nig | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 2803047646497352 (CO BizNet) -> out (statewide promo group, not corridor-local); preceden |
| 33 | Durango: Join us this coming Saturday for th | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 786995948656362 (Durango) -> out (out-of-corridor town); corridor.json: out-of-corridor c |
| 34 | Durango: @[100069395178300:2048:Detail Docto | INELIGIBLE | OUTSIDE_CORRIDOR | corridor.json: group 786995948656362 (Durango) -> out (out-of-corridor town); corridor.json: out-of-corridor c |

## Notes

- Items 17 (Fruita coffee beans) and 24 (Ridgway free estimate) return
  ELIGIBLE: no rule in the data covers them. The human corrected set
  dropped them on tighter curation judgment, not on a deterministic
  rule. This is the honest boundary of the authority, and it is
  recorded here rather than papered over.
- The guard blocked 1 of 34 at dispatch (AG Property Services, fuzzy
  match). The offline replay blocks 21 of 34 at the eligibility layer;
  the 7 human-corrected keeps all return ELIGIBLE.
- The 2 escaped likes (items 1 and 2) are blocked in the replay as
  OUTSIDE_CORRIDOR (CO BizNet group out; item 2 also matches the
  out-of-corridor business Litto's Fencing). Their real-world outcomes
  are preserved separately in eligibility-escaped-likes-2026-10-01.md.
