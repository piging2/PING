#!/usr/bin/env python3
"""Eligibility harness: the REAL engagement-guard.py eligibility_check(),
stamp_evidence, and verify_evidence, against scratch state.

Proves the autonomous slice's policy core is the single deterministic
eligibility function (CEO P0 order), not a reimplementation.
"""
import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import helpers as H

GUARD_PY = os.path.expanduser("~/workspace/outreach/engagement-guard.py")


def load_guard(env):
    for k in ("ENGAGEMENT_GUARD_DIR",):
        os.environ[k] = env[k]
    spec = importlib.util.spec_from_file_location("engagement_guard", GUARD_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def seed_engaged_post(env, post_url, name=None):
    log = os.path.join(env["ENGAGEMENT_GUARD_DIR"], "facebook-engagement.md")
    with open(log, "a") as f:
        f.write("\n## Pass 9\n\n### likes\n")
        f.write("- %s - %s\n" % (name or "Seeded Bakery", post_url))


RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name
          + (" | " + detail if detail and not cond else ""))


def main():
    tmp, env = H.fresh_env()
    try:
        guard = load_guard(env)
        data = guard.load_eligibility_data()
        index = guard.load_index()

        # 1. ELIGIBLE: like on an in-corridor group post with business identity.
        c = {"platform": "facebook", "type": "like",
             "url": "https://www.facebook.com/groups/%s/permalink/4476644419276001/"
                    % H.IN_GROUP_ID,
             "page": "Test Bakery",
             "text": "Fresh sourdough today! Call (970) 555-0100.",
             "group_id": H.IN_GROUP_ID, "group_name": H.IN_GROUP_NAME}
        v = guard.eligibility_check(index, dict(c), data=data)
        check("eligible_like_in_corridor", v["decision"] == "ELIGIBLE",
              json.dumps(v))

        # 2. BLOCKED: blocked-businesses.json post id.
        c2 = dict(c, url="https://www.facebook.com/groups/%s/permalink/1531824742295756/"
                  % H.IN_GROUP_ID, page="Western Colorado Chimney")
        v2 = guard.eligibility_check(index, c2, data=data)
        check("blocked_business_post_id",
              v2["decision"] == "INELIGIBLE"
              and v2["primary_reason"] == "BLOCKED", json.dumps(v2))

        # 3. OUTSIDE_CORRIDOR: CO BizNet group.
        c3 = dict(c, url="https://www.facebook.com/groups/%s/permalink/4476644419276002/"
                  % H.OUT_GROUP_ID, group_id=H.OUT_GROUP_ID,
                  group_name="CO BizNet")
        v3 = guard.eligibility_check(index, c3, data=data)
        check("outside_corridor_cobiznet",
              v3["decision"] == "INELIGIBLE"
              and v3["primary_reason"] == "OUTSIDE_CORRIDOR", json.dumps(v3))

        # 4. ALREADY_ENGAGED by post id, then by name.
        seed_engaged_post(env,
                          "https://www.facebook.com/AlreadyLikedBakery/posts/999888777666555/",
                          "Already Liked Bakery")
        index2 = guard.load_index()  # rebuilds: log sha changed
        c4 = dict(c, url="https://www.facebook.com/groups/%s/permalink/999888777666555/"
                  % H.IN_GROUP_ID)
        v4 = guard.eligibility_check(index2, c4, data=data)
        check("already_engaged_post_id",
              v4["decision"] == "INELIGIBLE"
              and v4["primary_reason"] == "ALREADY_ENGAGED", json.dumps(v4))
        c4b = dict(c, page="Already Liked Bakery",
                   url="https://www.facebook.com/groups/%s/permalink/4476644419276009/"
                   % H.IN_GROUP_ID)
        v4b = guard.eligibility_check(index2, c4b, data=data)
        check("already_engaged_name",
              v4b["decision"] == "INELIGIBLE"
              and v4b["primary_reason"] == "ALREADY_ENGAGED", json.dumps(v4b))

        # 5. UNKNOWN on empty candidate: never dispatched, never INELIGIBLE.
        v5 = guard.eligibility_check(index2, {}, data=data)
        check("unknown_empty_candidate", v5["decision"] == "UNKNOWN"
              and v5["primary_reason"] == "UNKNOWN", json.dumps(v5))

        # 6. CAPABILITY_MISSING: facebook supports like+comment only.
        c6 = dict(c, type="follow")
        v6 = guard.eligibility_check(index2, c6, data=data)
        check("capability_missing_follow",
              v6["decision"] == "INELIGIBLE"
              and v6["primary_reason"] == "CAPABILITY_MISSING", json.dumps(v6))

        # 7. DUPLICATE within one batch.
        seen = set()
        va = guard.eligibility_check(index2, dict(c), data=data,
                                     batch_seen=seen)
        vb = guard.eligibility_check(index2, dict(c), data=data,
                                     batch_seen=seen)
        check("duplicate_within_batch",
              va["decision"] == "ELIGIBLE" and vb["decision"] == "INELIGIBLE"
              and vb["primary_reason"] == "DUPLICATE",
              json.dumps({"a": va["decision"], "b": vb["decision"]}))

        # 8. pfbid same-form join: opaque token joins as post:pfbidXXX.
        seed_engaged_post(env,
                          "https://www.facebook.com/SeedPage/posts/pfbidAbC123xYz/",
                          "Seed Page")
        index3 = guard.load_index()
        c8 = dict(c, url="https://www.facebook.com/SeedPage/posts/pfbidAbC123xYz/")
        v8 = guard.eligibility_check(index3, c8, data=data)
        check("pfbid_same_form_join",
              v8["decision"] == "INELIGIBLE"
              and v8["primary_reason"] == "ALREADY_ENGAGED", json.dumps(v8))

        # 9. stamp_evidence / verify_evidence roundtrip (real functions).
        action = {"type": "like", "platform": "facebook",
                  "url": c["url"], "page": c["page"]}
        stamped = guard.stamp_evidence(action, v, data)
        ok, why = guard.verify_evidence(stamped, data)
        check("envelope_roundtrip", ok, why)
        # Tamper: flip the decision, hash must refuse.
        tampered = json.loads(json.dumps(stamped))
        tampered["eligibility"]["decision"] = "INELIGIBLE"
        ok2, why2 = guard.verify_evidence(tampered, data)
        check("envelope_tamper_refused", not ok2, why2)
        # Stale: checked_at older than the 6h TTL. The evidence hash does
        # not cover checked_at, so backdating keeps the hash valid and only
        # the TTL check must refuse.
        stale = json.loads(json.dumps(stamped))
        stale["eligibility"]["checked_at"] = (
            datetime.now(timezone.utc) - timedelta(hours=7)).isoformat()
        ok3, why3 = guard.verify_evidence(stale, data)
        check("envelope_stale_refused", not ok3, why3)

        # 10. Precedence: BLOCKED outranks ALREADY_ENGAGED.
        c10 = dict(c2, url="https://www.facebook.com/groups/%s/permalink/999888777666555/"
                   % H.IN_GROUP_ID)  # blocked post id AND engaged post id
        v10 = guard.eligibility_check(index3, c10, data=data)
        check("precedence_blocked_first",
              v10["primary_reason"] == "BLOCKED"
              and "ALREADY_ENGAGED" in v10["reasons"], json.dumps(v10))
    finally:
        H.cleanup(tmp)
    failed = [r for r in RESULTS if not r[1]]
    print("\n%d/%d passed" % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
