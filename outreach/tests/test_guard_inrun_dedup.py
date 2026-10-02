#!/usr/bin/env python3
"""Deterministic test: guard in-run dedup keys on (identity, action).

Identity = the durable never-re-engage identity: account handle for
instagram/threads/x/tiktok, page name for facebook. Same-handle second like
on a DIFFERENT video within one job is blocked (intended: the durable rule
bars that handle next pass anyway). Like+comment pairs pass.
Runs the REAL engagement-guard.py filter CLI with a temp PASSES_DIR so no
open manifests exist; restores the real log file byte-for-byte afterwards.
Exit 0 = behavior matches the documented rule, 1 = divergence.
"""
import json, os, subprocess, sys, tempfile

GUARD = os.path.expanduser("~/workspace/outreach/engagement-guard.py")
LOG = os.path.expanduser("~/workspace/outreach/tiktok-engagement.md")

cands = [
    {"account": "@dedupprobea", "url": "https://www.tiktok.com/@dedupprobea/video/9100000000000000001", "type": "like"},
    {"account": "@dedupprobea", "url": "https://www.tiktok.com/@dedupprobea/video/9200000000000000002", "type": "like"},
    {"account": "@dedupprobea", "url": "https://www.tiktok.com/@dedupprobea/video/9100000000000000001", "type": "comment", "text": "probe comment"},
    {"account": "@dedupprobeb", "url": "https://www.tiktok.com/@dedupprobeb/video/9300000000000000003", "type": "like"},
]
expected = ["ELIGIBLE", "ALREADY_ENGAGED", "ELIGIBLE", "ELIGIBLE"]

with tempfile.TemporaryDirectory() as td:
    in_path = os.path.join(td, "cands.json")
    out_path = os.path.join(td, "elig.json")
    json.dump(cands, open(in_path, "w"))
    env = dict(os.environ, ENGAGEMENT_GUARD_PASSES_DIR=td)
    before = os.path.getsize(LOG)
    try:
        r = subprocess.run([sys.executable, GUARD, "filter", "--platform", "tiktok",
                            "--in", in_path, "--out", out_path, "--audit"],
                           env=env, capture_output=True, text=True, timeout=120)
        assert r.returncode == 0, "filter failed: " + r.stderr[-500:]
        dec = [json.loads(l) for l in open(os.path.join(td, "engagement-guard-decisions.jsonl"))]
    finally:
        with open(LOG, "r+b") as f:
            f.truncate(before)
    assert os.path.getsize(LOG) == before, "log not restored"

got = [d["decision"] for d in dec]
print("decisions:", got)
for i, (g, e) in enumerate(zip(got, expected)):
    print(("PASS" if g == e else "FAIL"), "candidate", i, "->", g, "(expected", e + ")")
if got == expected:
    print("OK: in-run dedup keys on (identity=handle, action) as documented")
    sys.exit(0)
print("DIVERGENCE: in-run dedup does not match the documented (identity, action) rule")
sys.exit(1)
