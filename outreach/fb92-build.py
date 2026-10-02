#!/usr/bin/env python3
"""Build pass-92 Facebook engagement job from fb92-candidates.json.
Cap enforced at build time: max 75 likes + 10 comments.
Writes ~/workspace/pig-fb/.jobs/pass92-job-20260922.json (durable; /tmp is wiped mid-run)."""
import json, re, os

OUT = os.path.expanduser("~/workspace/outreach")
JOBS = os.path.expanduser("~/workspace/pig-fb/.jobs")
os.makedirs(JOBS, exist_ok=True)

cands = json.load(open(OUT + "/fb92-candidates.json"))
URL_SEEN = set()
draft = []

def drop(c):
    t = (c["text"] or "").lower()
    u = c["url"]
    if not c["text"] or len(c["text"].strip()) < 8:
        return "empty-caption"
    if "?sale_post_id=" in u:
        return "sale-url"
    if any(w in t for w in ["protest", "maga", "democrat", "republican",
                            "biden", "trump", "vote for", "defund", "border wall"]):
        return "political"
    if "realtor" in t and ("listed" in t or "for sale" in t or "3200 rd" in t):
        return "realestate-listing"
    if "exceptional custom home" in t:
        return "realestate-listing"
    if "timeless comfort meets" in t:
        return "realestate-listing"
    if "progressive" in t and "insurance" in t:
        return "ad"
    return None

BLOCKED_AUTHORS = [
    "unique solutions handyman", "ag property services", "teresa",
    "raven", "western colorado chimney", "taylor lorenzo",
    "cassi rossgeske",
]
# known guard-blocked Page slugs (personal-profile re-engagement)
BLOCKED_HOME = [
    "trill", "colorado mesa university", "the campaign lab",
    "explore colorado with rupam dewan", "visual capitalist", "shopify",
    "bitcoin magazine", "secret dallas", "robert kiyosaki", "logic",
    "guinness world records", "progressive", "boston celtics",
]

comments = [
    ("Profinish Drywall & Paint",
     "https://facebook.com/groups/2375845965922391/permalink/3492992100874433/",
     "Thirty years in drywall and paint means you have seen every builder shortcut. Twice."),
    ("Elevated Martial Arts",
     "https://facebook.com/groups/786995948656362/permalink/2008019109887367/",
     "Less raking leaves, more rolling on the mats. That is the fall trade I did not know I needed."),
]
comment_urls = {u for _, u, _ in comments}

# home feed: friends' personal posts only
for c in cands:
    if c["group"] != "home":
        continue
    au = c["author"] or ""
    if au.lower() in BLOCKED_HOME:
        continue
    reason = drop(c)
    if reason:
        continue
    u = c["url"]
    if u in comment_urls or u in URL_SEEN:
        continue
    URL_SEEN.add(u)
    draft.append({"type": "like", "url": u, "page": au or "home friend"})

def prio(c):
    g = c["group"]
    if g in ("Fruita", "Montrose", "Durango", "Ridgway", "Delta", "Palisade",
             "Palisade Msg", "Orchard Mesa", "GJ community", "GJ Events",
             "Redlands", "WesternCO Msg", "GJ Message Board", "Living In GJ",
             "CO BizNet", "GJ trees", "Glenwood", "CO Desi"):
        return 0
    return 1

pool = [c for c in cands if c["group"] != "home"]
pool.sort(key=lambda c: (prio(c), c["created"] or ""), reverse=True)
for c in pool:
    if sum(1 for a in draft if a["type"] == "like") >= 75:
        break
    au_l = (c["author"] or "").lower()
    if any(b in au_l for b in BLOCKED_AUTHORS):
        continue
    reason = drop(c)
    if reason:
        continue
    u = c["url"]
    if u in comment_urls or u in URL_SEEN:
        continue
    URL_SEEN.add(u)
    name = c["author"] or c["group"]
    t = (c["text"] or "")[:50].replace("\n", " ")
    page = f"{name} ({t})" if name != c["group"] else f"{c['group']} ({t})"
    draft.append({"type": "like", "url": u, "page": page[:100]})

for p, u, t in comments:
    draft.append({"type": "comment", "url": u, "page": p, "text": t})

n_like = sum(1 for a in draft if a["type"] == "like")
n_com = sum(1 for a in draft if a["type"] == "comment")
assert n_like <= 75 and n_com <= 10, f"cap breach: {n_like} likes, {n_com} comments"

job = {"actions": draft, "minDelaySec": 60, "maxDelaySec": 120}
out_path = JOBS + "/pass92-job-20260922.json"
json.dump(job, open(out_path, "w"), indent=1)
print(f"drafted {len(draft)}: {n_like} likes + {n_com} comments -> {out_path}")
