#!/usr/bin/env python3
"""Build pass-102 job file: 75 likes, 0 comments (comment pool empty: every
business-Page trade poster was commented in a prior pass; verified via
facebook-cli post read this run). Round-robin breadth."""
import json, re

C = json.load(open('/home/hatch/workspace/outreach/fb102-candidates.json'))

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
    r'coastal clean|missy ross|abbots cleanup|eden building|hungry fox|kathy fuchs|handy dads|2nd time around|secondtimeco)', re.I)

COMMENTS = []  # pass 101: no new eligible business-Page trade posts
               # (Ortega 97, Keeper 97, Pinon Ridge 98, Bonanza 98,
               #  Reset&Shine 98, Handy Dads 95, Owen 99, Eden 100,
               #  Western Colorado Chimney 52; Cleanly Booking off-topic
               #  SaaS, JMDE pest foreign).

RETRY_101 = [
    ("Ridgway | horses: you do not need to know anything (retry p101)", 'https://facebook.com/groups/1178801365519809/permalink/28553219540984622/'),
    ("Roofing A | price improvement opportunity (retry p101)", 'https://facebook.com/groups/1034795403236979/permalink/28306249208998230/'),
    ("Roofing B | Ans Angels Coalition website (retry p101)", 'https://facebook.com/groups/2646836605529865/permalink/4986993261514176/'),
    ("SaaS Marketing Group | cold email dead-generic prompts (retry p101)", 'https://facebook.com/groups/4098505490210812/permalink/28781031754864843/'),
    ("Saas Founder Group | AI recommends the perfect product (retry p101)", 'https://facebook.com/groups/saasfoundergroup/permalink/2231154770793324/'),
    ("WesternCO Msg | Interior Detailing and Oil Changes (retry p101)", 'https://facebook.com/groups/5456977881034408/permalink/28566797026292500/'),
    ("All About AI Tools and AI News | Claude Opus 5.5 coding (retry p101)", 'https://facebook.com/groups/freeai/permalink/1616654316797603/'),
    ("CO BizNet | networking event (retry p101)", 'https://facebook.com/groups/2803047646497352/permalink/4080148658787238/'),
    ("CO Desi | Dandiya Raas 12 days (retry p101)", 'https://facebook.com/groups/171567566992739/permalink/2352437012239106/'),
    ("Delta | The Dog Stars coming home Heller (retry p101)", 'https://facebook.com/groups/1504277980997243/permalink/1807544690670569/'),
    ("Durango | designers for local fashion show (retry p101)", 'https://facebook.com/groups/786995948656362/permalink/2008741709815107/'),
    ("Fruita | Look outside now (retry p101)", 'https://facebook.com/groups/3741333852807065/permalink/4475045882769188/'),
    ("GJ Message Board | free consultation (retry p101)", 'https://facebook.com/groups/1677940889636763/permalink/2292800551484124/'),
    ("GJ community | LIVE AT SOVEREIGN ROOTS (retry p101)", 'https://facebook.com/groups/1476564404259758/permalink/1657967229452807/'),
    ("HVACR Tech Talk | welcome new members (retry p101)", 'https://facebook.com/groups/hvacrtechtalk/permalink/1546660963899492/'),
    ("Landscaping and Designing Ideas | Paisagismo Biodiversidade (retry p101)", 'https://facebook.com/groups/landscapingideas/permalink/28084466827861307/'),
    ("Living In GJ | fresh local milk order (retry p101)", 'https://facebook.com/groups/livingingrandjunctioncolorado/permalink/3442400662615538/'),
    ("Montrose | Thai Pumpkin comfort bowl (retry p101)", 'https://facebook.com/groups/2375845965922391/permalink/3494465587393751/'),
    ("My724Outdoors | Livescanner breakaway (retry p101)", 'https://facebook.com/groups/my724outdoors/permalink/4057814954351314/'),
    ("PEST CONTROL and INSECTICIDES | pest management (retry p101)", 'https://facebook.com/groups/pesthomes/permalink/28771948802442830/'),
]

actions = list(COMMENTS)
used_urls = {c["url"] for c in COMMENTS}
used_pages = {c["page"] for c in COMMENTS}
# pass-101 browser-death retries first: provably unexecuted, still eligible
for _pg, _u in RETRY_101:
    if _u not in used_urls and _pg not in used_pages:
        actions.append({"type": "like", "url": _u, "page": _pg})
        used_urls.add(_u); used_pages.add(_pg)

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

# group pool: non-trade, non-skipped, prefer non-empty text
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
while len([a for a in actions if a['type'] == 'like']) < 115 and groups:
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
print("home likes:", [a['page'] for a in likes if ' | ' not in a['page']])
job = {"actions": actions, "minDelaySec": 60, "maxDelaySec": 120}
json.dump(job, open('/tmp/fb-job-pass102.json', 'w'), indent=1)
print("wrote /tmp/fb-job-pass102.json")
