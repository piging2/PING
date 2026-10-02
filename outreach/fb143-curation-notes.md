# FB Pass 143 curation notes (2026-09-28 19:26 MDT)

## Discovery
fb143-discover.py: 534 candidates, 54 trade-keyword hits. All 20 group surfaces healthy. Page timelines still return 0 posts (persistent since pass 115).

## Builder pre-filter
build-fb-job.py 143: 534 -> 412 fresh (blocked: ledger-engaged 48, engaged-name 71, engaged-post-id 3; 2281 engaged post IDs consulted). Provisional: 75 likes at /tmp/fb-job-20260929-012703-provisional.json. Provisional eyeballed and NOT used as-is (pass-129 lesson): usual misfire mix (AG Property Services 7x, WCO Chimney pellet stove 2x, real-estate, lost pets, personal posts, bank spam, Durango/CO BizNet/CO Desi out-of-corridor).

## Builder pre-filter blind spot (NEW finding this pass)
Terminal-aware ledger cross-check found 49 of the 412 "fresh" candidates actually carry blocking terminals (EXECUTED/FAILED/UNKNOWN_EXECUTION within the 7-day window), e.g. El Rey tamales (EXECUTED 09-27), Golden Wings (FAILED 09-27), North Fork Flowers (FAILED 09-27), Colorado Philly (EXECUTED 09-28), SDMS tree (EXECUTED 09-27), fire-maintenance one-liner (EXECUTED 09-27), Surf To Turf cotton candy (FAILED 09-27), Forget Me Not $20/hr (FAILED 09-28), plus ~40 others. Likely a URL-normalization gap (www. vs bare facebook.com) in the builder's exclusion set. The at-dispatch guard remains the final net; manual curation caught all 49 this pass.

## Manual curation (parent only, no subagent; full 534-candidate eyeball + author verification via facebook-cli post read)
Final: 7 likes + 3 comments (10 actions). 7-day same-business window applied, terminal-aware.

### Keeps
1. Dreadhead Detailing (Palisade) — like. Business Page 61589655483561, mobile detailing "clean-car feeling" promo, posted today. 0 history mentions.
2. Bodan's Detailing (GJ community) — like+comment. Business Page 61555437704291, mobile interior detail Tahoe-at-work story, posted today. 0 history mentions.
3. Travis Baca (Roofing B/Cedaredge) — like. Page ID 61570080005334, swamp-cooler/handyman winterization promo, posted today. 0 history mentions. Like-only (identity is a personal name on a Page).
4. Scott Rush (Living In GJ) — like. Personal-profile dad-and-son haul/thrift pickup new-business promo, GJ local, posted today. Like-only (personal profile; same class as pass-141 handyman like).
5. Starry Nights Entertainment (Palisade Msg) — like+comment. Business Page 61552053057218, Monday trivia night at Palisade Brewing (Movies & T.V. theme 9/28). 0 history mentions.
6. Grand Gloss Boss (Roofing A) — like+comment. Business Page 61579271855122, exterior protection through Colorado winter promo, posted today. 0 history mentions.
7. ImpressionZ Art & Gift Gallery (Roofing B) — like. Business Page 100057784084325, local Co-Op artists Applefest pieces (Loretta Columbia acrylic). 0 history mentions.

Comments (all <20 words, punchy, non-selling, no PING/link/contact, business-Page authors verified via post read):
- Grand Gloss Boss: "Colorado winter is the real test. UV in summer, mag chloride in winter. Protection earns its keep." (17 words)
- Starry Nights: "Monday movie trivia is elite. Somebody is finally getting paid for useless knowledge." (12 words)
- Bodan's: "Mobile detail in the work parking lot is genius. Zero errands, just a clean Tahoe at 5pm." (16 words)

### Drops (notable)
- El Rey tamales: EXECUTED 2026-09-27 (terminal). Golden Wings + North Fork Flowers: FAILED terminals 2026-09-27 (also 404 on re-read for North Fork). Colorado Philly Applefest: EXECUTED ~18h ago. SDMS tree trim: EXECUTED 09-27. Fire-maintenance one-liner (Jovanny Vargas personal profile): EXECUTED 09-27. Surf To Turf cotton candy: FAILED 09-27. Forget Me Not $20/hr: FAILED (pass-140). Smith Family Orchard "New Maker": pass-131 engagement ~18h ago (recency; guard SKIPPED_REENGAGEMENT on file). Korean Corn Dogs: pass-136 like+comment ~20h ago (recency). CLOGZILLA: 719 Springs number, out-of-corridor. Bullseye Texture Services: CO BizNet, locality unverifiable, out-of-corridor group. Clark's Market: chain (pass-133 standing drop). Hannah Stoker sourdough / Bobby Schenck tree one-liners / hardwood-floors no-name / "Free estimate" / Jovanny Vargas fire: fail-closed (no verifiable business identity). Peach Street pop-up: FAILED terminal 09-27 (also personal-profile author). PRUF Pizza: personal profile (pass-142). Harmony Acres Gala fundraiser: author is personal profile Christy Burke (post read), fundraiser → dropped per standard fundraiser/solicitation drop. Cedaredge FFA alumni Applefest: school org, not a business. The 970 Tuesday-plans roundup / B-Sisters The Lab events / Iginia Boccalandro harvest feast / Kristofer Petross Halloween / Currey Lyn Gugel concert: not business promos or personal-profile authors. AG Property Services 7x: do-not-retry. WCO Chimney pellet stove 2x: blocked business (owner-verification standing rule). Real-estate 7x, lost/found pets, for-sale/ISO/asks, fundraisers, church, dance, Medicare, lender ads, 720-Denver numbers, Durango/Glenwood/CO Desi/CO BizNet out-of-corridor: standard drops. Glenwood aeration: out-of-corridor.

## Patch landed 2026-09-29 ~06:55 MDT (follow-up)
The suspected "URL-normalization gap (www. vs bare)" was falsified: the regexes are host-agnostic. The real missed form was `/posts/pfbid<token>` (opaque, non-numeric post IDs), invisible to the extractor on both sides. Fixed in engagement-guard.py (`FB_PFBID_RE` + shared `FB_URL_ID_RES` tuple; mirrored in action-intent-ledger.py), tested 22/22, logged in facebook-engagement.md. Before/after on this pass's pool: exclusion sets +88 md / +117 ledger pfbid IDs, pre-filter output unchanged (534 -> 412, no candidate collided with a terminal pfbid intent, zero false drops).
