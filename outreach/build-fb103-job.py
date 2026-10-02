#!/usr/bin/env python3
"""Build pass-103 job file: 20 likes + 1 comment (new CEO MODE caps from
pass 103: 20 likes + 10 comments; only ONE comment candidate met the bar:
The Yellow handyman services, an in-corridor Delta-area business Page.
Pass-96/101/102 precedent: draft 0 comments rather than forcing weak ones;
geography (Mesa County corridor + Delta/Montrose/Rifle/Carbondale only)
ruled out the out-of-area business-Page posters (Beam & Bristle, Dumpster
Rental NoCo, Ld Landscaping Denver). Western Colorado Chimney commented in
pass 52 (guard-blocked); BugDaddys 403-gated -> like-only per fail-closed;
Empowered Energy Systems like-only per pass-102 determination."""
import json, re

C = json.load(open('/home/hatch/workspace/outreach/fb103-candidates.json'))

SKIP = re.compile(
    r'(witches|halloween|welcome new members|troublemaker|carabao|frog grass|'
    r'lalamove|quezon|bulacan|bataan|mumbai|riyadh|saudi|bagwani|nurser(y|ies)|'
    r'show me the money|\u20b1|movers & packers|roommate|moving sale|cross-country|'
    r'bitcoin|xbox|hit and run|2 irrigated acres|2150 road|crawford,? colorado|'
    r'new price|live water & hay|40 acres|orta?ga construction|keeper of the cave|'
    r'hardy dads|handy dads|western colorado chimney|owen landscape|falling star hvac|'
    r'drymedic|summit window|memphis auto spa|mariana lazo|ag property services|'
    r'darrin andrew mcneil|oziel|burciaga|chloe smith|eric landscaping|top home zones|'
    r'crystal clear cleaning|jurassic junk|sarahdipity|kadz|chris hutchinson|'
    r'grub:30|bookfair|lube s|palisade wine festiv|baked goods are here|'
    r'i think gardeners in the grand|something scary is going on|'
    r'private unlicensed in-home ch|excited to announce that i am bringing ba|'
    r'tony rap music|girl i know how much you rea|robert kiyosaki|rupam dewan|'
    r'denver & front range weather|guinness world records|taylor lorenzo|'
    r'cassi rossgeske|luken blair|colorado mesa university|progressive|'
    r'jessica ann|joselyn kop|trill|explore colorado|'
    r'mercedes hickert|vultr|dairy queen|boston celtics|wall street mastermind|'
    r'wazirx|jennifer nicole stewart|sian hughes|jmde|fda-lto|'
    r'pinon ridge rv|bonanza cleaning|reset & shine cleaning|maria clark|'
    r'coastal clean|missy ross|abbots cleanup|eden building|hungry fox|kathy fuchs|2nd time around|secondtimeco)', re.I)

# One in-corridor business-Page trade post, verified via facebook-cli post
# read: owner "The Yellow  handyman  services" (61593120387860), serving
# Delta/Hotchkiss/Cedaredge/Olathe. 19 words, no em dashes, no selling.
COMMENTS = [
    {"type": "comment",
     "url": "https://facebook.com/groups/1504277980997243/permalink/1808595000565538/",
     "page": "The Yellow handyman services",
     "text": "A $25 quote fee and a Delta-to-Olathe service radius. That is an honest handyman ad if I ever saw one."},
]

actions = list(COMMENTS)
used_urls = {c["url"] for c in COMMENTS}
used_pages = {c["page"] for c in COMMENTS}

# home feed: fresh, non-empty text, not previously handled (guard is the
# backstop; this pre-filter keeps the pool honest)
HOME_SKIP = re.compile(r'(colorado mesa university|robert kiyosaki|rupam dewan|'
    r'denver & front range weather|guinness world records|taylor lorenzo|'
    r'cassi rossgeske|luken blair|joselyn kop|desirae smith|jennifer nicole stewart|'
    r'sian hughes|jessica heilman|joy johnson|trill|bitcoin|zillow|'
    r'tamala horton|regan evans|mercedes hickert|vultr|dairy queen|'
    r'boston celtics|wall street mastermind|wazirx|progressive)', re.I)
for x in C:
    if not x['source'].startswith('feed'):
        continue
    t = (x['text'] or '').strip()
    name = (x['author'] or '').strip()
    if not t or not name:
        continue
    if HOME_SKIP.search(name) or HOME_SKIP.search(t):
        continue
    if x['url'] in used_urls or name in used_pages:
        continue
    actions.append({"type": "like", "url": x['url'], "page": name})
    used_urls.add(x['url']); used_pages.add(name)

# group pool: non-trade, non-skipped, prefer non-empty text, round-robin
pool = {}
for x in C:
    if not x['source'].startswith('group'):
        continue
    if x['trade_hit']:
        continue
    t = (x['text'] or '').strip()
    if SKIP.search(t) or SKIP.search(x['url']):
        continue
    if x['url'] in used_urls:
        continue
    g = x['group']
    pool.setdefault(g, []).append(x)
for g in pool:
    pool[g].sort(key=lambda x: (len((x['text'] or '').strip()) == 0, x['url']))

def page_name(x):
    words = re.sub(r'\s+', ' ', (x['text'] or '').strip())[:60]
    base = f"{x['group']} | {words}" if words else f"{x['group']} | {x['url'][-14:]}"
    p, n = base, 2
    while p in used_pages:
        p = f"{base} #{n}"; n += 1
    return p

groups = sorted(pool.keys())
i = 0
while len([a for a in actions if a['type'] == 'like']) < 20 and groups:
    g = groups[i % len(groups)]
    if pool[g]:
        x = pool[g].pop(0)
        p = page_name(x)
        actions.append({"type": "like", "url": x['url'], "page": p})
        used_urls.add(x['url']); used_pages.add(p)
    else:
        groups.remove(g)
    i += 1
    if i > 5000:
        break

likes = [a for a in actions if a['type'] == 'like']
print(f"built {len(likes)} likes + {len(COMMENTS)} comments = {len(actions)} actions")
mix = {}
for a in likes:
    mix[a['page'].split(' | ')[0]] = mix.get(a['page'].split(' | ')[0], 0) + 1
print("group mix:", dict(sorted(mix.items())))
job = {"actions": actions, "minDelaySec": 60, "maxDelaySec": 120}
json.dump(job, open('/tmp/fb-job-pass103.json', 'w'), indent=1)
print("wrote /tmp/fb-job-pass103.json")
