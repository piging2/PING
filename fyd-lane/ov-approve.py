#!/usr/bin/env python3
"""Approve an owner-override proposal read from a propose response file."""
import json, sys, urllib.request

PROPOSE_FILE = sys.argv[1]
OUT_FILE = sys.argv[2]

d = json.load(open(PROPOSE_FILE))
cmd = d["proposal"]["command"]
dig = d["digests"]
body = json.dumps({
    "stage": "approve",
    "command": cmd,
    "baseStateDigest": dig["baseStateDigest"],
    "baseViewDigest": dig["baseViewDigest"],
    "patchDigest": dig["patchDigest"],
}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:3100/api/fyd/objects/coppersmith-plumbing/overrides",
    data=body, headers={"Content-Type": "application/json"}, method="POST")
r = urllib.request.urlopen(req, timeout=30)
out = json.loads(r.read().decode())
json.dump(out, open(OUT_FILE, "w"), indent=1)
print("status:", r.status, "ok:", out.get("ok"), "code:", out.get("code"))
print("keys:", sorted(out.keys()))
