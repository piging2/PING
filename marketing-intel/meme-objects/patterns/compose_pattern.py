#!/usr/bin/env python3
"""Pattern object composer for live competitive clowning.

Patterns are presentation/distribution artifacts, not a knowledge authority.
PING remains the authority for reusable intelligence.

Commands:
  validate <file>   enforce the pattern schema + hard rules
  render <id>       render EDUCATE / CLOWN / LIVE modes from the pattern
  rank              rank all patterns into live-queue.json (five-factor score x freshness)
  approve <id>      record human approval (Nolan)
  list              show all patterns and their states
"""
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
MEMES = os.path.dirname(HERE)
QUEUE_FILE = os.path.join(HERE, "live-queue.json")
STATES = {"VERIFIED", "OBSERVED", "PROVISIONAL"}
SERIOUSNESS = {"LOW", "MEDIUM", "HIGH"}
APPROVAL = {"draft", "approved", "queued", "posted"}


def load_names():
    path = os.path.join(MEMES, "business-names.txt")
    with open(path) as f:
        return [n.strip().lower() for n in f if n.strip()]


def load_pat(path):
    with open(path) as f:
        return json.load(f)


def pat_path(pid):
    return os.path.join(HERE, pid + ".json")


def errors(p):
    errs = []
    for field in ("pattern_id", "observation", "observation_count",
                  "affected_market", "category", "evidence_refs",
                  "verification_state", "confidence", "mechanism",
                  "competitive_implication", "opportunity", "joke_candidates",
                  "seriousness", "public_safe_text", "durable",
                  "fresh_until", "approval_state", "publication_state",
                  "outcome_evidence"):
        if p.get(field) in (None, "", []):
            # outcome_evidence may legitimately be empty
            if field != "outcome_evidence":
                errs.append("missing or empty: " + field)
    if not isinstance(p.get("observation_count"), int) or p["observation_count"] < 2:
        errs.append("observation_count must be an integer >= 2 (a pattern, not a anecdote)")
    if p.get("verification_state") not in STATES:
        errs.append("bad verification_state: %r" % p.get("verification_state"))
    if p.get("seriousness") not in SERIOUSNESS:
        errs.append("bad seriousness: %r" % p.get("seriousness"))
    if p.get("approval_state") not in APPROVAL:
        errs.append("bad approval_state: %r" % p.get("approval_state"))
    if not isinstance(p.get("confidence"), (int, float)) or not 0 <= p["confidence"] <= 1:
        errs.append("confidence must be 0.0-1.0")
    try:
        date.fromisoformat(p.get("fresh_until", ""))
    except ValueError:
        errs.append("fresh_until must be YYYY-MM-DD")
    # Hard rule: no named business in public text
    names = load_names()
    haystacks = [p.get("public_safe_text", "")] + list(p.get("joke_candidates") or [])
    for h in haystacks:
        low = h.lower()
        for n in names:
            if n and n in low:
                errs.append("named business in public text: %r" % n)
                break
    # Hard rule: provisional patterns carry the hedge in every joke
    if p.get("verification_state") == "PROVISIONAL":
        hedge = p.get("hedge", "")
        if not hedge:
            errs.append("PROVISIONAL pattern needs a hedge field")
        else:
            for jc in p.get("joke_candidates") or []:
                if hedge.lower() not in jc.lower():
                    errs.append("joke candidate missing hedge: %r" % jc)
                    break
    # Hard rule: no em dashes in public text
    for h in haystacks:
        if "\u2014" in h:
            errs.append("em dash in public text")
            break
    if p.get("seriousness") in ("MEDIUM", "HIGH") and not p.get("risk_notes"):
        errs.append("MEDIUM/HIGH seriousness needs risk_notes")
    if p.get("approval_state") in ("approved", "queued", "posted") and not p.get("approved_by"):
        errs.append("approval_state %r requires approved_by" % p.get("approval_state"))
    return errs


def cmd_validate(path):
    p = load_pat(path)
    errs = errors(p)
    if errs:
        print("INVALID %s" % p.get("pattern_id", path))
        for e in errs:
            print("  - " + e)
        return 1
    print("VALID %s (n=%d, %s)" % (p["pattern_id"], p["observation_count"],
                                  p["verification_state"]))
    return 0


def render_modes(p):
    pub = p["public_safe_text"]
    imp = p["competitive_implication"]
    opp = p["opportunity"]
    joke = p["joke_candidates"][0]
    educate = ("Here is a surprisingly common pattern in local-service "
               "marketing. %s %s The fix is usually simpler than a full "
               "transformation: %s" % (pub, imp, opp))
    clown = "%s\n\nPING says: %s" % (pub, joke)
    live = ("Okay, PING just found something interesting. %s What is new: "
            "this is a market-wide pattern, not one shop. Why it matters: "
            "%s The takeaway: %s" % (pub, imp, opp))
    return {"educate": educate, "clown": clown, "live": live}


def cmd_render(pid):
    p = load_pat(pat_path(pid))
    errs = errors(p)
    if errs:
        print("cannot render an invalid pattern:")
        for e in errs:
            print("  - " + e)
        return 1
    modes = render_modes(p)
    for name, text in modes.items():
        print("=== %s ===" % name.upper())
        print(text)
        print()
    return 0


def freshness_multiplier(p):
    if p.get("durable"):
        return 1.0
    try:
        fresh = date.fromisoformat(p["fresh_until"]) >= date.today()
    except ValueError:
        fresh = False
    return 1.0 if fresh else 0.5


def score_factors(p):
    # evidence_quality from verification state and count
    v = p["verification_state"]
    eq = {"VERIFIED": 1.0, "OBSERVED": 0.8, "PROVISIONAL": 0.4}[v]
    eq = min(1.0, eq + 0.02 * min(p["observation_count"], 10))
    novelty = 0.9 if p["approval_state"] == "draft" else 0.5
    entertainment = {"LOW": 0.6, "MEDIUM": 0.9, "HIGH": 0.7}[p["seriousness"]]
    relevance = min(1.0, 0.5 + 0.05 * p["observation_count"])
    actionable = 0.9 if "arbitrage Q" in p["opportunity"] or "Q1" in p["opportunity"] or "Q10" in p["opportunity"] else 0.6
    return {"evidence_quality": round(eq, 2), "novelty": novelty,
            "entertainment": entertainment,
            "market_relevance": round(relevance, 2),
            "actionable_insight": actionable}


def cmd_rank():
    ranked = []
    for fn in sorted(os.listdir(HERE)):
        if not fn.startswith("pattern_") or not fn.endswith(".json"):
            continue
        p = load_pat(os.path.join(HERE, fn))
        errs = errors(p)
        if errs:
            print("skipping invalid %s" % p.get("pattern_id"))
            continue
        f = score_factors(p)
        fm = freshness_multiplier(p)
        score = f["evidence_quality"] * f["novelty"] * f["entertainment"] * \
            f["market_relevance"] * f["actionable_insight"] * fm
        ranked.append({"pattern_id": p["pattern_id"],
                       "verification_state": p["verification_state"],
                       "observation_count": p["observation_count"],
                       "seriousness": p["seriousness"],
                       "durable": p["durable"],
                       "fresh_until": p["fresh_until"],
                       "freshness_multiplier": fm,
                       "factors": f,
                       "score": round(score, 3),
                       "approval_state": p["approval_state"],
                       "modes": render_modes(p)})
    ranked.sort(key=lambda r: r["score"], reverse=True)
    with open(QUEUE_FILE, "w") as f:
        json.dump({"generated": date.today().isoformat(),
                   "rule": "quiet queue beats fabricated queue; nothing here is published automatically",
                   "candidates": ranked}, f, indent=2)
        f.write("\n")
    for r in ranked:
        print("%.3f  %s  n=%d  %s  freshness x%.1f" % (
            r["score"], r["pattern_id"], r["observation_count"],
            r["approval_state"], r["freshness_multiplier"]))
    print("wrote %s" % QUEUE_FILE)
    return 0


def cmd_approve(pid):
    path = pat_path(pid)
    p = load_pat(path)
    errs = errors(p)
    if errs:
        print("cannot approve an invalid pattern:")
        for e in errs:
            print("  - " + e)
        return 1
    p["approval_state"] = "approved"
    p["approved_by"] = "Nolan Geske %s" % date.today().isoformat()
    with open(path, "w") as f:
        json.dump(p, f, indent=2)
        f.write("\n")
    print("approved %s" % pid)
    return 0


def cmd_list():
    for fn in sorted(os.listdir(HERE)):
        if fn.startswith("pattern_") and fn.endswith(".json"):
            p = load_pat(os.path.join(HERE, fn))
            errs = errors(p)
            mark = "VALID  " if not errs else "INVALID"
            print("%s %-32s n=%-3d %-11s %s" % (
                mark, p.get("pattern_id"), p.get("observation_count"),
                p.get("verification_state"), p.get("approval_state")))
    return 0


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    cmd = argv[1]
    if cmd == "validate" and len(argv) == 3:
        return cmd_validate(argv[2])
    if cmd == "render" and len(argv) == 3:
        return cmd_render(argv[2])
    if cmd == "rank":
        return cmd_rank()
    if cmd == "approve" and len(argv) == 3:
        return cmd_approve(argv[2])
    if cmd == "list":
        return cmd_list()
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
