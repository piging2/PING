#!/usr/bin/env python3
"""Build fb engagement job file for this pass."""
import json, re, os

posts = json.load(open(os.path.expanduser("~/workspace/goals/ping-social-outreach-campaign/hidden_files/fb-discover-69.json")))

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
    {"type": "comment", "url": "https://facebook.com/groups/2375845965922391/permalink/3490930304413946/",
     "page": "The Flower Stand (comment)",
     "text": "Sunflowers and dahlias in peak bloom. Tomorrow's bouquet run just planned itself."},
    {"type": "comment", "url": "https://facebook.com/groups/2375845965922391/permalink/3490723861101257/",
     "page": "Horsefly Brewing steinholding (comment)",
     "text": "Steinholding competition with a ten dollar entry. October 3rd is about to get loud."},
    {"type": "comment", "url": "https://facebook.com/groups/2803047646497352/permalink/4074869745981796/",
     "page": "Wingin It podcast (comment)",
     "text": "Construction owners talking business instead of tools. That is a podcast with a purpose."},
    {"type": "comment", "url": "https://facebook.com/groups/coloradobusinessmingle/permalink/28087645300906538/",
     "page": "Open house partner (comment)",
     "text": "Twilight open houses with a twist. That is how you pull buyers off the couch."},
    {"type": "comment", "url": "https://facebook.com/groups/171567566992739/permalink/2348613432621464/",
     "page": "Garnish Lone Tree (comment)",
     "text": "Gobi 65 and Ambur biryani in one weekend. That lineup does not mess around."},
    {"type": "comment", "url": "https://facebook.com/groups/171567566992739/permalink/2348461182636689/",
     "page": "Desi District Denver (comment)",
     "text": "Festival weekend at Desi District. Ganesh Chaturthi specials hit different."},
    {"type": "comment", "url": "https://facebook.com/groups/5456977881034408/permalink/28528174716821398/",
     "page": "Palisade new construction open house (comment)",
     "text": "Bookcliffs views and new construction. Sunday open house writes itself."},
    {"type": "comment", "url": "https://facebook.com/groups/786995948656362/permalink/2005543260134952/",
     "page": "La Plata County Humane Society cups (comment)",
     "text": "Coffee and adoptable pups on the same cup. Marketing genius and a good cause."},
    {"type": "comment", "url": "https://facebook.com/groups/1178801365519809/permalink/28491050270534883/",
     "page": "Rescue save (comment)",
     "text": "From saved to safe. That is the best kind of plot twist."},
    {"type": "comment", "url": "https://facebook.com/groups/2375845965922391/permalink/3490771187763191/",
     "page": "1797 6429 Circle open house (comment)",
     "text": "New construction and mimosas. House hunting just became brunch."},
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
