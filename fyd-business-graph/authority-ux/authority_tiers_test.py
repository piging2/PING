"""Boundary tests for authority_tiers.classify.

Covers all four tiers plus UNKNOWN, and the boundary conditions:
$0 vs $1 spend, 9999 vs 10000 audience, reversible vs irreversible
external publish, unrecognized kinds.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from authority_tiers import classify

CASES = [
    # (name, action, expected_tier, expected_check)
    # --- LOW ---
    ("low: local draft tweak",
     {"kind": "draft_update", "target": "campaign/draft-42", "reversible": True, "external": False},
     "LOW", "automatic"),
    ("low: reorder private plan",
     {"kind": "plan_reorder", "target": "plan/week-41", "reversible": True, "external": False},
     "LOW", "automatic"),
    ("low: generate preview",
     {"kind": "preview_generate", "target": "campaign/draft-42", "reversible": True, "external": False},
     "LOW", "automatic"),
    ("low: analyze data",
     {"kind": "analyze_data", "target": "metrics/september", "reversible": True, "external": False},
     "LOW", "automatic"),
    # --- MEDIUM ---
    ("medium: site headline change",
     {"kind": "public_presentation_change", "target": "site/home/headline", "reversible": True, "external": False},
     "MEDIUM", "preview_with_easy_undo"),
    # --- HIGH: spend boundary ---
    ("high: $1 spend is HIGH (boundary vs $0)",
     {"kind": "analyze_data", "target": "ads/report", "spend_usd": 1, "reversible": True, "external": False},
     "HIGH", "explicit_authorization"),
    ("low: $0 spend stays LOW",
     {"kind": "draft_update", "target": "campaign/draft-42", "spend_usd": 0, "reversible": True, "external": False},
     "LOW", "automatic"),
    # --- HIGH: external publish/send/modify ---
    ("high: reversible external publish",
     {"kind": "publish_external", "target": "facebook/page/post", "audience_size": 100, "reversible": True, "external": True},
     "HIGH", "explicit_authorization"),
    ("high: send approved campaign to 5000 people (still cancelable pre-dispatch)",
     {"kind": "send_communication", "target": "audience/commercial-hvac", "audience_size": 5000, "reversible": True, "external": True},
     "HIGH", "explicit_authorization"),
    ("high: modify external account (reversible)",
     {"kind": "modify_external_account", "target": "meta/ad-account/settings", "reversible": True, "external": True},
     "HIGH", "explicit_authorization"),
    # --- VERY HIGH: spend boundary ---
    ("very high: $500 spend is VERY HIGH (boundary)",
     {"kind": "send_communication", "target": "ads/prospecting", "spend_usd": 500, "reversible": True, "external": True},
     "VERY_HIGH", "explicit_bounded_approval"),
    ("high: $499 spend is HIGH, not VERY HIGH (boundary)",
     {"kind": "send_communication", "target": "ads/prospecting", "spend_usd": 499, "reversible": True, "external": True},
     "HIGH", "explicit_authorization"),
    ("very high: $2000 ad buy",
     {"kind": "publish_external", "target": "meta/ad-account/campaign", "spend_usd": 2000, "reversible": True, "external": True},
     "VERY_HIGH", "explicit_bounded_approval"),
    # --- VERY HIGH: audience boundary ---
    ("very high: audience 10000 is VERY HIGH (boundary)",
     {"kind": "send_communication", "target": "email/list", "audience_size": 10000, "reversible": True, "external": True},
     "VERY_HIGH", "explicit_bounded_approval"),
    ("high: audience 9999 stays HIGH (boundary)",
     {"kind": "send_communication", "target": "email/list", "audience_size": 9999, "reversible": True, "external": True},
     "HIGH", "explicit_authorization"),
    # --- VERY HIGH: irreversible external ---
    ("very high: irreversible external publish",
     {"kind": "publish_external", "target": "facebook/page/post", "audience_size": 100, "reversible": False, "external": True},
     "VERY_HIGH", "explicit_bounded_approval"),
    ("very high: external action with unknown reversibility fails closed",
     {"kind": "publish_external", "target": "facebook/page/post", "audience_size": 100, "external": True},
     "VERY_HIGH", "explicit_bounded_approval"),
    ("very high: irreversible external send (cannot unsend)",
     {"kind": "send_communication", "target": "email/list", "audience_size": 5000, "reversible": False, "external": True},
     "VERY_HIGH", "explicit_bounded_approval"),
    # --- UNKNOWN: fail closed ---
    ("unknown: unrecognized kind fails closed",
     {"kind": "frob_widget", "target": "mystery/thing", "reversible": True, "external": False},
     "UNKNOWN", "explicit_authorization"),
    ("unknown: external unrecognized kind fails closed",
     {"kind": "frob_widget", "target": "mystery/thing", "reversible": True, "external": True},
     "UNKNOWN", "explicit_authorization"),
]

def main():
    passed = 0
    failed = []
    for name, action, want_tier, want_check in CASES:
        got_tier, got_check = classify(action)
        ok = (got_tier == want_tier and got_check == want_check)
        status = "PASS" if ok else "FAIL"
        print("%s  %-58s -> (%s, %s)" % (status, name, got_tier, got_check))
        if ok:
            passed += 1
        else:
            failed.append((name, want_tier, want_check, got_tier, got_check))
    total = len(CASES)
    print("\n%d/%d passing" % (passed, total))
    if failed:
        print("FAILURES:")
        for name, wt, wc, gt, gc in failed:
            print("  %s: wanted (%s, %s), got (%s, %s)" % (name, wt, wc, gt, gc))
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
