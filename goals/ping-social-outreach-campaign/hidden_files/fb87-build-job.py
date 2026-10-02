#!/usr/bin/env python3
"""Build fb-job-87: 75 likes + 3 comments, unique page labels, cap-checked."""
import json, time

cands = json.load(open('/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/fb87-candidates-raw.json'))
C = {i: cands[i] for i in range(len(cands))}

GNAME = {
 "786995948656362": "Durango", "1677940889636763": "GJ Message Board",
 "2376973139292229": "Orchard Mesa", "2646836605529865": "Roofing B (Cedaredge)",
 "2803047646497352": "CO BizNet", "3741333852807065": "Fruita",
 "1178801365519809": "Ridgway", "1224852974550520": "Palisade Msg",
 "2964258493889262": "GJ Events", "843886667756237": "Redlands",
 "2375845965922391": "Montrose", "hvacrtechtalk": "HVACR Tech Talk",
 "landscapingideas": "Landscaping and Designing Ideas",
 "pesthomes": "Pest Control & Insecticides", "189143395673059": "Airbnb Cleaning Services",
 "saasfoundergroup": "SaaS Founder Group", "4098505490210812": "SaaS Marketing Group",
 "my724outdoors": "My724Outdoors", "home feed": "Home feed", "friends feed": "Friends feed",
}

LIKE_IDX = [0,1,2,6,7,11, 17,19,18,21,24, 37,46, 47,52,53,55,58,60,
            62,68, 80,83,84,86,89,93,94, 95,99,105,110,113, 114,116,123,
            136, 140,148, 162,163, 165,176, 183,184,187,188,190,196,
            198,199,200, 207,208,209,210,212,213,214,215,217, 225,235,236,237,
            239,240,248,251,253, 254,256]

COMMENTS = [
  {"url": "https://facebook.com/groups/1178801365519809/permalink/28540533625586547/",
   "like_idx": 99, "page_like": "The Lube Shop Tire & Brakes (Ridgway group, like)",
   "page_comment": "The Lube Shop Tire & Brakes (Ridgway group, comment)",
   "text": "Honoring competitors' coupons AND winter-ready brakes. That is how you win a neighborhood."},
  {"url": "https://facebook.com/groups/2803047646497352/permalink/4078237212311716/",
   "like_idx": None, "page_like": "Ld Landscaping And Concrete (CO BizNet, like)",
   "page_comment": "Ld Landscaping And Concrete (CO BizNet, comment)",
   "text": "Free estimates across the whole state is a bold travel schedule. Respect the hustle."},
  {"url": "https://facebook.com/groups/2646836605529865/permalink/4986763598203809/",
   "like_idx": None, "page_like": "Snow Boy Coffee (Roofing B, like)",
   "page_comment": "Snow Boy Coffee (Roofing B, comment)",
   "text": "Mediocre coffee is a wasted morning. Glad someone in Cedaredge takes this seriously."},
]

def page_label(c):
    g = GNAME.get(c["group"], c["group"])
    author = c["author"].strip()
    who = author if author else g
    snippet = c["text"][:34].strip().replace("\n"," ")
    return f"{who} ({g}: {snippet})"

seen_urls = set()
actions = []

for i in LIKE_IDX:
    c = C[i]
    assert c["url"] not in seen_urls, f"dup like url {c['url']}"
    seen_urls.add(c["url"])
    actions.append({"type":"like","url":c["url"],"page":page_label(c)})

for cm in COMMENTS:
    if cm["like_idx"] is None:
        # extra like on the comment-target post (keeps <=75 total)
        actions.append({"type":"like","url":cm["url"],"page":cm["page_like"]})
        seen_urls.add(cm["url"])
    else:
        # like_idx 99 already included in LIKE_IDX; need a distinct like action label
        # replace that action's page with the distinct like label
        for a in actions:
            if a["url"] == cm["url"]:
                a["page"] = cm["page_like"]
    actions.append({"type":"comment","url":cm["url"],"page":cm["page_comment"],"text":cm["text"]})

nl = sum(1 for a in actions if a["type"]=="like")
nc = sum(1 for a in actions if a["type"]=="comment")
assert nl <= 75 and nc <= 10, f"caps exceeded: {nl} likes, {nc} comments"
pages = [a["page"] for a in actions]
assert len(pages) == len(set(pages)), "page labels not unique"
for a in actions:
    w = len(a["text"].split()) if a["type"]=="comment" else 0
    assert w < 20, f"comment too long: {a['text']}"
    assert "\u2014" not in (a.get("text") or ""), "em dash in comment"

ts = time.strftime("%Y%m%d-%H%M")
job = {"actions": actions, "minDelaySec": 60, "maxDelaySec": 120}
p1 = f"/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/fb-job-{ts}.json"
p2 = f"/tmp/fb-job-{ts}.json"
json.dump(job, open(p1,"w"), indent=1)
json.dump(job, open(p2,"w"), indent=1)
print(f"likes={nl} comments={nc} actions={len(actions)}")
print("job:", p1)
print("tmp:", p2)
