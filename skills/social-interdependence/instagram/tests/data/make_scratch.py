#!/usr/bin/env python3
"""make_scratch.py: build a scratch outreach tree for tests.

The scratch tree mirrors the production layout the real engagement-guard.py
and authority-check.py expect (five engagement logs, AUTHORITY.json,
holds.json, eligibility-data/*). The eligibility data files are COPIES of
the live single copies, taken at scratch-build time; production runs always
use the live tree (ENGAGEMENT_GUARD_DIR unset). One variant dir
(scratch-stale-cap) carries a stale capability matrix (instagram like=False)
for the stale-capability injection test.
"""
import json
import os
import shutil
import sys

PROD = os.path.expanduser("~/workspace/outreach")
HERE = os.path.dirname(os.path.abspath(__file__))

IG_LOG = """# Instagram engagement log (SCRATCH FIXTURE)

Started 2026-10-01. Session logged in as nolanpigi via browser (fixture).
Rules: business accounts only, never personal profiles. Likes at human pacing (60-120s between actions).
Caps: 50 likes + 12 comments per 2h pass. One browser task per pass on this account.
Stop instantly on any action block, checkpoint, or warning and report it.
NEVER like or comment on the same account twice across passes. The off-limits list is PER-ACCOUNT.

## 2026-10-01 - Pass 1 (fixture)

3 likes, 1 comment. Session stable throughout.

Likes: @alreadyengaged_plumbing, @prior_roofing_co, @vetted_hvac_gj.

Comments:
- @prior_roofing_co: "Clean flashing work. The details are doing the talking here."

Skipped: @stale_account_xyz (0 posts).

GUARD-RECORD platform=instagram action=like account=alreadyengaged_plumbing url=https://www.instagram.com/p/FixtureEngaged1/
"""

MINIMAL_LOG = """# {p} engagement log (SCRATCH FIXTURE)

## 2026-10-01 - Pass 1 (fixture)

0 likes, 0 comments. Nothing engaged.
"""


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def build(root):
    if os.path.isdir(root):
        shutil.rmtree(root)
    os.makedirs(root)
    write(os.path.join(root, "instagram-engagement.md"), IG_LOG)
    for p in ("facebook", "threads", "x", "tiktok"):
        write(os.path.join(root, "%s-engagement.md" % p),
              MINIMAL_LOG.format(p=p))
    authority = {"surfaces": {
        "instagram": {"status": "ACTIVE",
                      "reason": "scratch fixture: surface active",
                      "capability": {"authorized": True,
                                     "notes": "scratch fixture"}},
        "facebook": {"status": "ACTIVE", "capability": {"authorized": True}},
        "threads": {"status": "ACTIVE", "capability": {"authorized": True}},
        "x": {"status": "ACTIVE", "capability": {"authorized": True}},
        "tiktok": {"status": "HELD", "capability": {"authorized": False}},
    }}
    write(os.path.join(root, "AUTHORITY.json"), json.dumps(authority, indent=1))
    holds = {"description": "scratch fixture holds",
             "schema_version": 1,
             "holds": {
                 "instagram": {"held": False,
                               "reason": "scratch fixture: no hold",
                               "set_by": "fixture", "set_at": "2026-10-01T00:00:00Z"},
                 "facebook": {"held": False, "reason": "scratch",
                              "set_by": "fixture", "set_at": "2026-10-01T00:00:00Z"},
                 "threads": {"held": False, "reason": "scratch",
                             "set_by": "fixture", "set_at": "2026-10-01T00:00:00Z"},
                 "x": {"held": False, "reason": "scratch",
                       "set_by": "fixture", "set_at": "2026-10-01T00:00:00Z"},
                 "tiktok": {"held": True, "reason": "scratch: platform flag",
                            "set_by": "tripwire", "set_at": "2026-10-01T00:00:00Z"},
             }}
    write(os.path.join(root, "holds.json"), json.dumps(holds, indent=1))
    data_dir = os.path.join(root, "eligibility-data")
    os.makedirs(data_dir)
    for name in ("corridor.json", "blocked-businesses.json",
                 "precedent-registry.json", "action-capability.json"):
        shutil.copy(os.path.join(PROD, "eligibility-data", name),
                    os.path.join(data_dir, name))
    return root


def build_stale_cap(root):
    """Variant where the capability matrix no longer lists instagram like."""
    build(root)
    path = os.path.join(root, "eligibility-data", "action-capability.json")
    with open(path, "r", encoding="utf-8") as f:
        caps = json.load(f)
    caps["platforms"]["instagram"]["like"] = False
    with open(path, "w", encoding="utf-8") as f:
        json.dump(caps, f, indent=1)
    return root


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        HERE, "scratch-outreach")
    if "--stale-cap" in sys.argv:
        build_stale_cap(target)
    else:
        build(target)
    print("scratch outreach tree at %s" % target)
