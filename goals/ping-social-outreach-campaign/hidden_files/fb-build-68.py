#!/usr/bin/env python3
"""Build fb engagement job file for this pass."""
import json, re, os

posts = json.load(open(os.path.expanduser("~/workspace/goals/ping-social-outreach-campaign/hidden_files/fb-discover-68.json")))

GROUP_SHORT = {
    "group:CO Business Networking": "CO BizNet",
    "group:CO Trade Group": "CO Trade",
    "group:CO Business Mingle": "CO Mingle",
    "group:GJ Message Board": "GJ Msg",
    "group:Montrose Message Board": "Montrose Msg",
    "group:Glenwood Springs": "Glenwood",
    "group:Durango": "Durango",
    "group:Montrose": "Montrose",
    "group:Fruita": "Fruita",
    "group:Ridgway": "Ridgway",
    "group:Palisade": "Palisade",
    "group:Palisade Message Board": "Palisade Msg",
    "group:Western CO Message Board": "WesternCO Msg",
    "group:GJ Marketplace": "GJ Market",
    "group:Colorado Desi": "CO Desi",
    "group:Living In GJ": "Living In GJ",
    "group:Mesa County lost/found pets": "Pets",
    "group:GJ trees": "GJ trees",
}

SKIP_SUBSTRINGS = [
    "vote yes", "jeff hurd", "congress", "lost this weekend in an accident",
    "deadline october 31, 2025", "absolutely no ai photos",
    "kick jeff hurd", "vote no on",
]

def likeable(p):
    if not p.get("url"):
        return False
    if "sale_post_id" in p["url"]:
        return False
    if p["source"] == "group:GJ trees":  # consistent like-button-not-found failures
        return False
    t = p.get("text", "").strip()
    if len(t) < 5:
        return False
    tl = t.lower()
    if any(s in tl for s in SKIP_SUBSTRINGS):
        return False
    return True

actions = []
likes = []
for p in posts:
    if likeable(p):
        if p["source"].startswith("group:"):
            page = f"{GROUP_SHORT.get(p['source'], p['source'])} post {p['id']}"
        else:
            page = f"{p['author'] or 'feed'} {p['id']}"
        likes.append({"type": "like", "url": p["url"], "page": page})

# Interleave across sources for pacing variety (avoid hammering one group in a row)
by_src = {}
for l in likes:
    by_src.setdefault(next((p["source"] for p in posts if p["url"] == l["url"]), "?"), []).append(l)
ordered = []
buckets = list(by_src.values())
i = 0
while len(ordered) < 75:
    added = False
    for b in buckets:
        if b and len(ordered) < 75:
            ordered.append(b.pop(0))
            added = True
    if not added:
        break

comments = [
    {"type": "comment", "url": "https://facebook.com/groups/5456977881034408/permalink/28529260853379451/",
     "page": "Screen Medic (comment)",
     "text": "That cloudy buildup never stood a chance. Crystal clear is the whole mood."},
    {"type": "comment", "url": "https://facebook.com/groups/2803047646497352/permalink/4074999052635532/",
     "page": "Memphis Auto Spa (comment)",
     "text": "Before and afters never lie. That interior went from mom-mobile to showroom."},
    {"type": "comment", "url": "https://facebook.com/groups/1178801365519809/permalink/28506942225612354/",
     "page": "The Flower Garden (comment)",
     "text": "Rain fresh cut bouquets just hit different. Saturday morning plans are sorted."},
    {"type": "comment", "url": "https://facebook.com/groups/2375845965922391/permalink/3490946497745660/",
     "page": "The Rusty Nail Salon (comment)",
     "text": "Pre-holiday refresh season is here. That chair is calling your name."},
    {"type": "comment", "url": "https://facebook.com/groups/1224852974550520/permalink/2871779386524529/",
     "page": "The Fowl Motel (comment)",
     "text": "The Fowl Motel. Best name on the Western Slope, and the eggs are a bonus."},
    {"type": "comment", "url": "https://facebook.com/groups/1178801365519809/permalink/28434228116217099/",
     "page": "Legacy Home Solutions (comment)",
     "text": "Side jobs today, booked solid tomorrow. That is how the good ones start."},
    {"type": "comment", "url": "https://facebook.com/groups/grandjunctionmarketplace/permalink/2166768457205970/",
     "page": "Surf to Turf (comment)",
     "text": "Four happy guests, one delicious dim sum experience. The proof is on the table."},
    {"type": "comment", "url": "https://facebook.com/100044413750003/posts/pfbid0ZV4LdNcayTMZPt1pPVBLc",
     "page": "Lars Leber Photography (comment)",
     "text": "Mount Princeton doing the heavy lifting. That sunset did not miss."},
    {"type": "comment", "url": "https://facebook.com/groups/171567566992739/permalink/2348819792600823/",
     "page": "Cafe India Denver (comment)",
     "text": "Weekend specials that read like a bucket list. The paneer tikka pizza is calling."},
]

# Dedup URLs within job (comments take precedence)
seen = set(c["url"] for c in comments)
likes_final = []
for l in ordered:
    if l["url"] not in seen:
        seen.add(l["url"])
        likes_final.append(l)

job = {"actions": likes_final + comments, "minDelaySec": 60, "maxDelaySec": 120}
ts = __import__("datetime").datetime.now().strftime("%Y%m%d-%H%M%S")
outdir = os.path.expanduser("~/workspace/goals/ping-social-outreach-campaign/hidden_files")
path = f"{outdir}/fb-job-{ts}.json"
json.dump(job, open(path, "w"), indent=1)
print(f"wrote {path}: {len(likes_final)} likes + {len(comments)} comments = {len(job['actions'])}")
