#!/usr/bin/env python3
"""Scan FB groups + feeds for engagement candidates. Writes durable JSON."""
import json, subprocess, os

OUT = os.path.expanduser("~/workspace/goals/ping-social-outreach-campaign/hidden_files/fb-discover-68.json")

GROUPS = [
    ("2803047646497352", "CO Business Networking"),
    ("108728816001912", "CO Trade Group"),
    ("coloradobusinessmingle", "CO Business Mingle"),
    ("1677940889636763", "GJ Message Board"),
    ("MMBColorado", "Montrose Message Board"),
    ("2370574193230682", "Glenwood Springs"),
    ("786995948656362", "Durango"),
    ("2375845965922391", "Montrose"),
    ("3741333852807065", "Fruita"),
    ("1178801365519809", "Ridgway"),
    ("389118470962985", "Palisade"),
    ("1224852974550520", "Palisade Message Board"),
    ("5456977881034408", "Western CO Message Board"),
    ("grandjunctionmarketplace", "GJ Marketplace"),
    ("171567566992739", "Colorado Desi"),
    ("livingingrandjunctioncolorado", "Living In GJ"),
    ("mesacountylostandfoundpets", "Mesa County lost/found pets"),
    ("1567209726900688", "GJ trees"),
]

def run(cmd, timeout=60):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if out.returncode != 0:
            return None
        return json.loads(out.stdout)
    except Exception:
        return None

def norm_post(p, source):
    url = p.get("post_url") or p.get("url") or p.get("permalink") or ""
    if url and not url.startswith("http"):
        url = "https://" + url
    return {
        "source": source, "url": url, "id": str(p.get("id") or ""),
        "text": (p.get("content") or "")[:200],
        "likes": p.get("react_count") or 0, "comments": p.get("comment_count") or 0,
    }

def norm_feed(p, source):
    return {
        "source": source, "url": p.get("url") or "", "id": str(p.get("post_id") or ""),
        "author": p.get("author_name") or "",
        "text": (p.get("post_caption") or p.get("post_text") or "")[:200],
        "likes": 0, "comments": 0,
    }

posts = []
for gid, gname in GROUPS:
    d = run(["facebook-cli", "groups", "posts", "--group-id", gid])
    if not d:
        print(json.dumps({"warn": f"group scan failed: {gname}"}))
        continue
    for p in (d.get("data") or []):
        posts.append(norm_post(p, f"group:{gname}"))

for feed, fname in [("newsfeed", "newsfeed"), ("friends", "friendsfeed")]:
    cursor = None
    for _ in range(2):
        cmd = ["facebook-cli", "feed", feed, "--limit", "10"]
        if cursor:
            cmd += ["--after", cursor]
        d = run(cmd)
        if not d:
            break
        for p in (d.get("posts") or []):
            posts.append(norm_feed(p, f"feed:{fname}"))
        cursor = d.get("next_cursor") if d.get("has_next_page") else None
        if not cursor:
            break

json.dump(posts, open(OUT, "w"), indent=1)
print(f"SCANNED {len(posts)} posts -> {OUT}")
