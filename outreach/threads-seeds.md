# Threads seed list for engagement passes (@nolanpigi)

Discovery reads the seed profiles' recent posts; the guard (`engagement-guard.py`,
platform `threads`) enforces the never-re-engage rule mechanically. Identity rule
per the engagement-log header: verify a handle is really the person (verified
badge or unmistakable identity) before engaging.

## Established seeds (verified on Threads 2026-09-15; pool as of pass 70)

- @garyvee — ENGAGED (like, pass 63). Skip.
- @karpathy — no verified badge detected in later passes; identity not verifiable per header rule; dropped pre-guard.
- @mcuban — ENGAGED history none, but posts excluded on standing off-brand content grounds (political-insult posts); treat as excluded.
- @ycombinator — ENGAGED (like, pass 63). Skip.
- @mosseri — ENGAGED (like, pass 63). Skip.
- @zuck — ENGAGED (like, pass 63). Skip.

## Pool expansion 2026-09-21 (source=pool-expansion-2026-09-21)

All guard-checked ELIGIBLE (no prior engagement, no fuzzy collisions) on 2026-09-21.
Handle identity confirmed via threads-cli keyword search authorship + recency.

| Handle | Who | Category | Identity signal | Recent post seen |
|--------|-----|----------|-----------------|------------------|
| @iharnoor | Harnoor Singh, AI/tech educator | tech educator | verified badge | 2026-09-21 |
| @theinternetvc | The Internet VC, startup commentary | startup/VC | verified badge | 2026-09-17 |
| @marclouvion | Marc Lou, CodeFast/ShipFast | indie hacker / SaaS founder | verified badge | 2026-07-03 |
| @rlakhnyuk | Roman Lakhnyuk | indie hacker | persona-consistent posts | 2026-08-12 |
| @themoneycruncher | The Money Cruncher, CPA | finance creator | persona-consistent posts | 2026-09-18 |
| @tradeschool2.0 | Tyler Watkins | trades | persona-consistent posts | 2026-08-13 |
| @islebecreative | Debra Tracey | maker | persona-consistent posts | 2026-09-21 |
| @slrs_roastery | SLRS Roastery | coffee / small business | persona-consistent posts | 2026-08-17 |
| @brock11johnson | Brock Johnson, IG growth coach | agency/marketing | verified badge | 2026-08-21 |
| @tykerpurchafit | Tyker, online fitness coach | coach / small business | persona-consistent posts | 2026-09-21 |
| @yordybarber1 | Yordy Barber | trades / small business | persona-consistent posts | 2026-09-21 |
| @lynne_sutherlandau | Lynne Sutherland | landscaping / trades | persona-consistent posts | 2026-09-21 |
| @seventhheavengroup | Seventh Heaven Group | real estate | persona-consistent posts | 2026-09-03 |
| @hivinz_ | Vinz, open-sourced Codenotch | dev-tool maker | persona-consistent posts | 2026-09-05 |
| @jjeffrose | Jeff Rose, CFP | finance creator | verified badge | 2025-06-17 (account is a known active finance creator; recency on Threads unconfirmed) |

## Pool expansion 2026-09-29 (source=pool-expansion-2026-09-29)

All 10 guard-checked by handle against existing seeds and rejects (no overlap).
Handle identity confirmed via threads-cli search authorship (Threads API author
objects: exact username + full_name + verified flag) with an authored post dated
2026-09-15 or later. Note: web search does not surface threads.com profile URLs
(threads.com returns 403 to unauthenticated fetches), so handles are grounded in
Threads' own API rather than a search-result URL. Several are already in Nolan's
X/Spotify follow sets (memory/people index).

| Handle | Who | Category | Identity signal | Recent post seen |
|--------|-----|----------|-----------------|------------------|
| @pompglobal | Anthony Pompliano, investor (Pomp Investments) | investor / tech-finance voice | verified badge; exact full-name match on authored post | 2026-09-29 ("Good morning. Today is going to be a great day...") |
| @linusekenstam | Linus Ekenstam, AI educator/designer | AI educator / builder | verified badge; web-confirmed AI educator identity | 2026-09-28 ("I'm building a skate park builder tool...") |
| @kris.kashtanova | Kristina Kashtanova, AI artist (Zarya of the Dawn) | AI artist / creator | verified badge; web-confirmed AI-artist identity | 2026-09-28 (AI Video Creator job post) |
| @bilawal.ai | Bilawal Sidhu, tech creator, TED AI host, ex-Google | AI/tech creator | verified badge; web-confirmed (bilawal.ai, TED) | 2026-09-22 ("Space and time reconstructed in 4D...") |
| @sahilbloom | Sahil Bloom, business/finance author | business voice | verified badge; in Nolan's X follow set | 2026-09-27 |
| @codiesanchez | Codie Sanchez, investor/business author | business / investing voice | verified badge; in Nolan's X follow set | 2026-09-24 ("Go build.") |
| @timferriss | Tim Ferriss, entrepreneur/author | entrepreneur | verified badge; in Nolan's X follow set | 2026-09-27 ("How I spent time this weekend.") |
| @lewishowes | Lewis Howes, podcaster (School of Greatness) | business / podcaster | verified badge; in Nolan's Spotify/TikTok seed set | 2026-09-29 |
| @tombilyeu | Tom Bilyeu, entrepreneur (Quest/Impact Theory) | entrepreneur | verified badge; in Nolan's Spotify/TikTok seed set | 2026-09-28 |
| @mkbhd | Marques Brownlee, tech reviewer | tech creator | verified badge; unmistakable tech-creator identity | 2026-09-21 (M5 Ultra Mac Studio post) |

## Candidates rejected (do NOT add)

- @keny.vee — verified but surfaced post stale (2025-05-03), aggregator tone.
- @cmshub2026 — list/aggregator account, launch-spam tone.
- @levelsio.ai — not Pieter Levels; name-adjacent AI-prompt account (possible impersonator-adjacent), skip.
- @juliy8050 — hashtag-farm woodworking clips ("part 456").
- @holocenehomestead, @simplychickensofficial, @selmamakescents — last posts Jan-May 2026, stale.
- @mikelresaba — engagement-bait ("let's see what you have").
- @dennisadzisam_ — June post, stale.

### Rejected in 2026-09-29 expansion research (do NOT add)

- @rowancheung — verified (Rowan Cheung, AI news), but latest surfaced post 2026-09-09 (20 days; outside ~14d window).
- @amjad_masad — verified (Amjad Masad, Replit CEO), but latest surfaced post 2026-09-10 (19 days).
- @realrileybrown — verified (Riley Brown, AI filmmaker), but latest surfaced post 2026-09-07 (22 days).
- @supabasecom — verified (Supabase org), but latest surfaced post 2026-08-30 (30 days).
- @hunterwalk — unmistakably Hunter Walk (Homebrew VC) but unverified; engagement passes skip unverified seeds (@karpathy precedent), so unverified seeds are dead weight.
- @wesbos — Wes Bos, unverified; same reason.
- @mr.eflow / @matthewmwolfe — two different "Matt Wolfe" accounts, identity ambiguous, both unverified.
- @repwilson — name collision: Congresswoman Frederica Wilson, not investor Fred Wilson.
- @sama — no authored post surfaced via threads-cli search; recency unverifiable through the CLI bar (rattibha Threads mirror exists but undated).
- @pmarca — handle confirmed via mirror (Marc Andreessen) but no recent Threads activity verified.

Names scanned with no authored post surfaced (thin CLI search index, not proof of
inactivity — NOT formal rejects): Sam Altman, Naval Ravikant, Reid Hoffman, Aaron
Levie, Tobi Lutke, Paul Graham, Balaji Srinivasan, Alexis Ohanian, Garry Tan,
Patrick Collison, Brian Chesky, Andrew Chen, Packy McCormick, Chris Dixon,
Ben Horowitz, Jason Calacanis, Pieter Levels, Guillaume Moubeche, Lenny Rachitsky,
Dan Shipper, Logan Bartlett, Elad Gil, Steven Tey, Guillermo Rauch, Theo Browne,
Allie Miller, Tony Dinh, Damon Chen, Lee Robinson, Matt Wolfe, Tina Huang,
Kent Dodds, Dan Abramov, Evan You, Sindre Sorhus, Jon Yongfook, Arvid Kahl,
Dagobert Renouf, Bram Kanstein, Rich Harris, Sara Drasner, Addy Osmani,
Una Kravets, Cassidy Williams, Mark Suster, Brad Feld, Elizabeth Yin,
Matt Shumer, Mckay Wrigley, Vercel, GitHub, Stripe, Figma, Notion, Linear,
Resend, Hasan Toor, Siqi Chen, Dylan Field,
Cristobal Valenzuela, Jensen Huang, Lisa Su,
Philip Schmid, Clement Delangue, Aravind Srinivas, Greg Isenberg,
Rachel Woods, Nikita Bier, Aadit Sheth, Javi Lopez, Salma Aboukar,
Kieran Gaffney, Fahd Mirza, Alex Banks, Paul Trillo, Brian Armstrong,
Jack Dorsey, Steve Huffman, Vlad Tenev, Emmett Shear, Mira Murati,
Dario Amodei, Ilya Sutskever, Lex Fridman, Ethan Mollick, Andreas Kling,
Domen Kozar, Dharmesh Shah, Ed Mylett, Linus Sebastian, Arun Maini,
Justine Ezarik, Patrick Bet David.

## Seeds engaged pass 72 (2026-09-21)

- @drcintas — Dr. Alvaro Cintas, AI/tech educator (verified badge) — ENGAGED (like, pass 72). Skip.
- @robertoclmedina — Roberto Medina, AI & Full-Stack Dev (verified badge) — ENGAGED (like, pass 72). Skip.
