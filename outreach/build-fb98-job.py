#!/usr/bin/env python3
"""Build pass-98 job file: 75 likes + 4 comments, round-robin breadth."""
import json, re

C = json.load(open('/home/hatch/workspace/outreach/fb98-candidates.json'))

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
    r'abbots cleanup|pinon ridge rv|bonanza cleaning|reset & shine cleaning)',
    re.I)

COMMENTS = [
    {"type": "comment",
     "url": "https://facebook.com/groups/2803047646497352/permalink/4080001918801912/",
     "page": "Abbotts Cleanup & Restoration | CO BizNet sewage post",
     "text": "Flood water is annoying. Sewage is a biohazard with opinions. Respect the ones who suit up for that."},
    {"type": "comment",
     "url": "https://facebook.com/groups/786995948656362/permalink/2008821903140421/",
     "page": "Pinon Ridge RV Mobile Repair | Durango service area",
     "text": "A mobile RV shop that actually travels is worth its weight in gaskets. Hesperus folks just got lucky."},
    {"type": "comment",
     "url": "https://facebook.com/groups/189143395673059/permalink/1760470888540294/",
     "page": "Bonanza Cleaning LLC | deep clean post",
     "text": "Deep cleans are archaeology with a vacuum. The stuff hiding in baseboards never stands a chance."},
    {"type": "comment",
     "url": "https://facebook.com/groups/189143395673059/permalink/1759516981969018/",
     "page": "Reset & Shine Cleaning | 5-bedroom Airbnb clean",
     "text": "Five bedrooms, hot tub, AND pickleball before checkout? That is not cleaning, that is a decathlon."},
]

for c in COMMENTS:
    assert len(c["text"].split()) < 20, c["text"]

actions = list(COMMENTS)
used_urls = {c["url"] for c in COMMENTS}
used_pages = {c["page"] for c in COMMENTS}

HOME = [
    ("https://facebook.com/1000034661811802/posts/pfbid02CC16CMcfowyW9M2heu2b1sVR63Y93PSp6i2iinyAZS89qTJ2CGp6yJyfTKN1D3zLl/", "Joy Johnson"),
    ("https://facebook.com/1709932216/posts/pfbid02anJf5xvePQaXXpEEePoRRCHyU2pBRcV6ToWbbnuFcK8PAvq8KdrxT8tiuZ5KyM1Fl/", "Jessica Heilman"),
    ("https://facebook.com/photo.php?fbid=122238028946315741&set=a.122166284618315741&type=3", "Jennifer Nicole Stewart"),
    ("https://facebook.com/100004116543646/posts/pfbid027D2qJ6b1LpCPkkffkigfbbnfqnxPBfvjwAgwos6sZRirj23mGKXfkrTRA3V5XLHRl/", "Sian Hughes"),
    ("https://facebook.com/events/1524871069428807/permalink/1613881760527737/", "Desirae Smith"),
]
for url, name in HOME:
    if url not in used_urls and name not in used_pages:
        actions.append({"type": "like", "url": url, "page": name})
        used_urls.add(url); used_pages.add(name)

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
while len([a for a in actions if a['type'] == 'like']) < 75 and groups:
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
json.dump(job, open('/tmp/fb-job-20260922-2326.json', 'w'), indent=1)
print("wrote /tmp/fb-job-20260922-2326.json")
