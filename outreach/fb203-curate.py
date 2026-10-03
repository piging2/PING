#!/usr/bin/env python3
"""Pass-199 manual curation (pass-129 tier-quality lesson), v2.

Builds on the canonical builder's own logic (imported, not copied):
  candidate_blocked() -> fresh-ok pool
  ok_like()           -> tier drop regexes (empties, feed national authors,
                        DROP/GEO/CURATED regexes)
Then applies pass-196 curation rules the builder tiers miss:
  - CO BizNet group (out-of-corridor, standing rule)
  - junk classes (lost/found pets, giveaways, garage/estate sales,
    real-estate, fundraisers, insurance lead-gen, ISO/hiring, political,
    personal rants, gardening Q&A, vague content-free posts, MLM,
    cross-post trade spam, chimney-sweep pattern needing owner verify)
  - near-dup collapse (one action per content cluster)
  - Monument View (no autonomous contact, standing)
Keeps = genuine local business promos only. Honest below-cap count.
Writes ~/workspace/outreach/fb203-curated-job.json (durable, bare list).
"""
import json, os, re, sys
import importlib.util

OUT = os.path.expanduser("~/workspace/outreach")
_spec = importlib.util.spec_from_file_location(
    "bfb", os.path.join(OUT, "build-fb-job.py"))
bfb = importlib.util.module_from_spec(_spec)
_argv_saved = sys.argv
sys.argv = ["build-fb-job.py", "199"]  # builder reads PASS from argv at import
try:
    _spec.loader.exec_module(bfb)
finally:
    sys.argv = _argv_saved

cands = json.load(open(os.path.join(OUT, "fb203-candidates.json")))

JUNK_RE = re.compile(
    r"(still missing|missing.*reward|reward.*safe return|day \d+ missing|"
    r"please help.*missing|last seen midnight|she isn.t an outdoor cat|"
    r"lost (her |his |my |a |the )?(kitty|dog|cat|puppy|kitten)|"
    r"found (dog|cat|puppy|kitten)|firecracker|betty.s safe return|"
    r"let.s get brutus home|"
    r"garage sale|estate sale|yard sale|moving sale|craft show|storage shed sale|"
    r"come on by for some treasures|"
    r"free (nuna|iris|couch|pupp|kitten|records|mulch|baby clothes)|"
    r"\*all claimed\* free|"
    r"realtor|realty|just listed|on the market|for sale by owner|\bfsbo\b|"
    r"\$\d{3},\d{3}|offered at \$|move-in ready|open house|acres|"
    r"mandani bay|3 car garage, rv parking|"
    r"donate|fundrais|please share if you can.t donate|"
    r"wait.+before you renew your insurance|insurance agency owner|"
    r"have your car or home insurance rates gone up|"
    r"give us a call for your roofing needs|"
    r"schedule your fireplace service|"
    r"another bathroom remodel completed|"
    r"there.s heat.+then there.s fireplace|"
    r"monument view|"
    r"inked and infused|"
    r"planning palooza|"
    r"chamber newsletter|"
    r"my favorite festival is back|"
    r"cotton candy is here|"
    r"15% off if you text me|"
    r"this weekend!!|"
    r"creating and maintaining a fb page|"
    r"blue angels|"
    r"apparently monday is our holiday|"
    r"roads, weather, wildlife, or pass conditions|"
    r"what these artists can make out of a gourd|"
    r"tik tok is live|"
    r"cowboys and aliens|"
    r"rise and shine bakes|"
    r"the apple shed is ready to celebrate|"
    r"paper wings.*kissflower|"
    r"we.re moving.*trivia at.*palisade brewing|"
    r"sandra bullock and nicole kidman will reunite|"
    r"four hours until practical magic|"
    r"food truck fridays.*historic lowell|tempo open mic|"
    r"message me for orders|"
    r"give us a call!$|wow!!!$|don.t miss out!$|two weeks away!$|join us!$|"
    r"hello everyone 📢$|tonight in grand junction\.?$|beautiful!$|"
    r"esther jade|frankincense oil|"
    r"iso\b|in search of|looking for (a |an |some|someone|recommendations)|"
    r"anyone (know|recommend)|who do you (use|recommend)|need a ride|"
    r"babysitt|nannying|childcare|dog/cat sitter|pet sitter|"
    r"looking for work|now hiring|hiring!|job (fair|opening)|help wanted|"
    r"vote|ballot|1st amendment|free speech|state senator|"
    r"prayer|bible|worship night|"
    r"welcome.*new members|let.s welcome|ordinary life skill|"
    r"cafe india denver|desi district|dandiya|diwali extravaganza|"
    r"grand county|elia\.bloombox|"
    r"we met a nice couple from cedaredge|"
    r"for the young man on the scooter|you know it isn.t our roads|"
    r"i.ve seen multiple drivers|turn left onto patterson|"
    r"my 1st amendment|top handlers now resorting|"
    r"looks like palisade & mesa county aren.t|wow\.\.\. talk about short notice|"
    r"show me the money, part 3|"
    r"grand junction doesn.t need a data center|"
    r"you can.t use a resource|transportation continues|"
    r"attention parents|82 year old mother|"
    r"good morning you beautiful individuals|"
    r"why i stopped using store-bought shampoo|"
    r"help! my garbage disposal|"
    r"wellness support groups|find out what.s happening in palisade|"
    r"a huge thank you to everyone posting pets|update-found|"
    r"happy october 😊|"
    r"air show parking|tiktok is live|prices are fixed|"
    r"the sweetest boy!!|"
    r"i have a 2 top table|tyce delk concert|"
    r"antique table|i have 72 covers|2692 hwy 50|"
    r"cheap appliances for sale|will not respond to|"
    r"if you were working on your toyota pickup|"
    r"ducklings have 2 saxony|grand valley cirque|"
    r"looking for more than just a home|join us tomorrow for a tour|"
    r"womens shirts all \$5|1 more day to solidify the top 15|"
    r"you can still use these beautiful authentic crystal|"
    r"located in olathe, co 📍|"
    r"can.t wait to see you at our women.s retreat|"
    r"✨ deal days are here|have you stopped in to see us yet|"
    r"located at hwy 65 and hwy 92|"
    r"need metal fabricator|"
    r"something i.ve been thinking about lately|"
    r"sitrep.+crawford colony|tnr since september|"
    r"come cheer on the bruins|who is winterizing swamp coolers|"
    r"wickedwears|beautiful crib for sale|massive boxes with storage totes|"
    r"trick or treaters|great things are done by a series of small|"
    r"hotchkiss building goes topless|don.t guess, be an informed voter|"
    r"league of women voters|your gut does more than digest|"
    r"time for friday favorites|have you enjoyed a drive to the mesa|"
    r"grand valley roads can change|"
    r"members, please please please stop posting links|"
    r"y.all, put it in your calendar|ballot measures|"
    r"directly involved with housing|teach me how to groom|"
    r"family reunion photos|selling: snowblower|lost a day pack|"
    r"sock it to them trump|"
    r"hi all!!! today is the day the .token.|scavenger hunt game|"
    r"harvest village|hanging lake rest area|"
    r"free mulch will deliver|is anyone available for a few hours on thi|"
    r"it.s that time of year, yard sale season|"
    r"looking for a recommendation on a good auto|"
    r"iso recommendations for a pumber|view of the needles|"
    r"iso ride from flagstaff|mountain middle school in durango|"
    r"go out and enjoy your weekend let me handle|"
    r"i am looking for someone to clear my elderly|"
    r"hi i.m a 19 year old|wondering if anyone can refer a good trust|"
    r"me and my family are planning a vacation|"
    r"anyone driving to or through hurricane|anyone driving to the st george|"
    r"amazing colorado views|awesome day of photographing|"
    r"bring your business cards|"
    r"we.ve moved to our official page|"
    r"check it out @|helloavahealth|"
    r"new products plus the old faithfuls|"
    r"country charm & mountain serenity|"
    r"let.s welcome our new members! @\[100007264720681|"
    r"found a cell phone at an atm|"
    r"it.s air show weekend, and the blue angels just buzzed|"
    r"local and reliable! appointments available this week!$|"
    r"we.re ready for you 🩷 4305 e platte|"
    r"@\[61550831678226:2048:yesa window tinting\]$|"
    r"🚨🔥 ¡crossfit, cardio y pesas|"
    r"🍂 𝐁𝐞𝐚𝐮𝐭𝐢𝐟𝐮𝐥 𝐟𝐚𝐥𝐥 𝐰𝐞𝐚𝐭𝐡𝐞𝐫 𝐡𝐚𝐬 𝐚 𝐰𝐚𝐲|"
    r"https://www\.instagram\.com/elia\.bloombox|"
    r"i ran into an old timer on my bus|"
    r"seeking farm caretaker|iso an unlocked iphone|"
    r"any one else have lilacs|royal canon food|anyone pick up old refrigerators|"
    r"2002 f350 for sale|please take a look and vote|good luck boys|"
    r"being raised in fruita|"
    r"these two sweet boys are still available|"
    r"found at pabor and coulson|"
    r"please come by and support a local nonprofit open from 630|"
    r"here is a great opportunity to support the fmhs|"
    r"we.re moving!! !! trivia|"  # ledger-engaged pass-195; belt & suspenders
    r"we.ve moved to our official page"
    r")",
    re.IGNORECASE)

GJ_TREES = "GJ trees"

def sig(c):
    t = re.sub(r'\s+', ' ', (c.get('text') or '').lower())
    t = re.sub(r'[^a-z0-9 ]', '', t)
    return t[:60]

keeps, drop_reasons = [], {}
seen_sig, seen_page = set(), set()
stats = {"pre-filter": 0, "ok_like-fail": 0, "co-biznet": 0, "gj-trees": 0,
         "junk": 0, "near-dup": 0, "dup-page": 0}

for i, c in enumerate(cands):
    b = bfb.candidate_blocked(c)
    if b:
        stats["pre-filter"] += 1
        drop_reasons[i] = "pre-filter:" + b
        continue
    if c.get('group') == "CO BizNet":
        stats["co-biznet"] += 1
        drop_reasons[i] = "co-biznet-out-of-corridor"
        continue
    if c.get('group') == GJ_TREES:
        stats["gj-trees"] += 1
        drop_reasons[i] = "gardening-qa-not-business"
        continue
    if not bfb.ok_like(c):
        stats["ok_like-fail"] += 1
        drop_reasons[i] = "builder-ok_like-fail"
        continue
    text = c.get('text') or ''
    # normalize whitespace: candidate texts contain newlines where patterns
    # assume spaces (pass-196 debug: "Good Morning\nYou Beautiful Individuals")
    ntext = re.sub(r'\s+', ' ', text).strip()
    if JUNK_RE.search(ntext):
        stats["junk"] += 1
        drop_reasons[i] = "curation-junk"
        continue
    # link-only posts are not vettable as business promos
    if re.fullmatch(r'https?://\S+', ntext):
        stats["junk"] += 1
        drop_reasons[i] = "curation-junk:link-only"
        continue
    s = sig(c)
    if s and s in seen_sig:
        stats["near-dup"] += 1
        drop_reasons[i] = "near-dup-collapse"
        continue
    seen_sig.add(s)
    pn = bfb.page_name(c)
    if pn in seen_page:
        # same 42-char prefix on a different post: disambiguate with post id
        pids = bfb._eg._platform_post_ids("facebook", c["url"])
        bare = [p.split(":", 1)[1] if ":" in p else p for p in pids]
        pn = (pn[:70] + " #" + (bare[0][-6:] if bare else str(i)))
        if pn in seen_page:
            stats["dup-page"] += 1
            drop_reasons[i] = "dup-page-descriptor"
            continue
    seen_page.add(pn)
    keeps.append((i, c, pn))

print(f"pool={len(cands)} kept={len(keeps)} stats={stats}", file=sys.stderr)
print("--- sample curation drops (non-pre-filter) ---", file=sys.stderr)
shown = 0
for i, reason in sorted(drop_reasons.items()):
    if reason.startswith("pre-filter"):
        continue
    if shown < 60:
        print(f"  DROP [{i}] {bfb.page_name(cands[i])[:70]} :: {reason}",
              file=sys.stderr)
        shown += 1
print(f"  ... ({sum(1 for r in drop_reasons.values() if not r.startswith('pre-filter')) - shown} more)",
      file=sys.stderr)

actions = [{"type": "like", "url": c["url"], "page": pn} for _, c, pn in keeps]
out = os.path.join(OUT, "fb203-curated-job.json")
json.dump(actions, open(out, "w"), indent=1)
print(f"wrote {out} ({len(actions)} likes)", file=sys.stderr)
print("=== KEEPS ===")
for _, c, pn in keeps:
    print(f"[{cands.index(c)}] {pn}")
