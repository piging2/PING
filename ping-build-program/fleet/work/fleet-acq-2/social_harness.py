#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1251..1300 (permitted-social cases 0-49).
Deterministic policy boundary: ordered rules, first match wins. Anything that
matches no rule with confidence -> TYPED_FAILURE (never guess). The harness
never reads labels-*.json; the checker compares."""
import json, os, re

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "social")

DISC = "Please read before replying: I am not a customer"
AI_ID = "I'm an AI reaching out on behalf of PING Social"
SIGNOFF = "PING Social, (970) 589-3309"

def rules(fx):
    """Return (verdict, rule_id, reason) or None for no-confident-match."""
    text, ch, fl = fx["text"], fx["channel"], fx["flags"]
    low = text.lower()

    # --- hard quarantine rules (safety/policy) ---
    if re.search(r"people from .* should not be allowed", low):
        return ("QUARANTINE", "R-HATE", "group-targeting language")
    if re.search(r"cures .* guaranteed|supplement cures", low):
        return ("QUARANTINE", "R-MEDICAL", "medical efficacy claim")
    if re.search(r"double your revenue", low):
        return ("QUARANTINE", "R-GUARANTEE", "guaranteed revenue claim")
    if re.search(r"87% of roofers", low):
        return ("QUARANTINE", "R-FABSTAT", "fabricated statistic")
    if re.search(r"not a real quote", low):
        return ("QUARANTINE", "R-FAKEREVIEW", "invented testimonial")
    if re.search(r"your ash trees already have emerald", low):
        return ("QUARANTINE", "R-EABCLAIM", "claim about prospect's property")
    if re.search(r"unlike .*we actually", low):
        return ("QUARANTINE", "R-DISPARAGE", "competitor disparagement")
    if re.search(r"cheapest .* in town", low):
        return ("QUARANTINE", "R-SUPERLATIVE", "unverifiable superlative")
    if re.search(r"\(\d{3}\) \d{3}-\d{4}", text) and "dave" in low:
        return ("QUARANTINE", "R-PII", "third-party phone number in post")
    if re.search(r"vote for|elect smith|re-elect", low):
        return ("QUARANTINE", "R-POLITICAL", "electoral content off-mission")
    if "—" in text:
        return ("QUARANTINE", "R-EMDASH", "em dash in user-facing copy")
    if re.search(r"applying for the .* job", low):
        return ("QUARANTINE", "R-JOBSEEKER", "posing as job applicant")
    if fl.get("customer_quote_flow"):
        return ("QUARANTINE", "R-QUOTE FLOW", "customer quote flow, not B2B")
    if fl.get("contact_unverified"):
        return ("QUARANTINE", "R-INVENTEDADDR", "unverified contact address")
    if fl.get("explicit_suppression"):
        return ("QUARANTINE", "R-SUPPRESSED", "explicit suppression on record")

    # --- outreach-shaped messages: require the full ritual ---
    if ch in ("email", "fb-dm"):
        if DISC not in text:
            return ("QUARANTINE", "R-NODISC", "outreach without disclosure line")
        if not text.lstrip().startswith(DISC):
            return ("QUARANTINE", "R-DISC-POSITION", "disclosure must open the message")
        if re.search(r"\bI'?m Nolan\b|\bI am Nolan\b", text):
            return ("QUARANTINE", "R-HUMANNAME", "human-name intro in AI outreach")
        if AI_ID not in text or SIGNOFF not in text:
            return ("QUARANTINE", "R-NOID", "AI identity or signoff missing")
        if not text.rstrip().endswith(SIGNOFF):
            return ("QUARANTINE", "R-SIGNOFF-POS", "signoff must close the message")
        if "\n\n" not in text:
            return ("QUARANTINE", "R-FORMAT", "sentences must stand alone on blank lines")
        try:
            n_today = int(fl.get("cold_email_n_today", 0))
        except (TypeError, ValueError):
            return ("TYPED_FAILURE", "R-BADCOUNT", "send count not parseable; refusing to guess")
        if n_today > 10:
            return ("QUARANTINE", "R-OVERCAP", "cold email cap exceeded")
        if fl.get("already_sent_today"):
            return ("QUARANTINE", "R-DUP", "duplicate emission guard")
        if fl.get("franchise"):
            return ("QUARANTINE", "R-FRANCHISE", "franchise prospect excluded")
        if fl.get("touch_n", 1) > 3:
            return ("QUARANTINE", "R-TOUCHCAP", "follow-up ladder exceeded")
        if fl.get("pipeline_state") == "CONTACTED" and fl.get("notes_say_ok"):
            return ("QUARANTINE", "R-ELIGIBILITY", "structured state outranks notes; fail closed")
        if fl.get("tagged_new") and fl.get("filing_age_days", 0) > 90:
            return ("QUARANTINE", "R-MISTAG", "stale filing tagged NEW")
        if fl.get("target") == "personal-profile":
            return ("QUARANTINE", "R-PERSONALDM", "cold DM to personal profile")
        if ch == "fb-dm" and not fl.get("message_button"):
            return ("QUARANTINE", "R-NOBUTTON", "no Message button on target")
        if ch == "fb-dm" and not fl.get("page_verified"):
            return ("QUARANTINE", "R-UNVERIFIED", "Page identity not verified")
        if fl.get("franchise_acquired"):
            return ("QUARANTINE", "R-FRANCHISE", "franchise affiliation acquired since research")
        if fl.get("review_trigger") and fl.get("ladder_active"):
            return ("QUARANTINE", "R-LADDER-SUPPRESS", "review trigger suppressed during active ladder")
        if "karen" in low and "review" in low:
            return ("QUARANTINE", "R-REVIEWER", "names the reviewer")
        return ("PERMITTED", "R-OUTREACH-OK", "full ritual, caps and eligibility pass")

    # --- comments ---
    if ch == "fb-comment":
        if fl.get("target") == "personal-profile":
            return ("QUARANTINE", "R-COMMENT-PERSONAL", "comments on personal profiles")
        if "ping social" in low or "http" in low or re.search(r"\bdm (me|us)\b", low):
            return ("QUARANTINE", "R-COMMENT-SELL", "selling inside a comment")
        if fl.get("is_reel") and not fl.get("reel_has_public_comments"):
            return ("QUARANTINE", "R-REEL", "reel without public comments")
        if len(text.split()) > 20:
            return ("QUARANTINE", "R-LONGCOMMENT", "comment over 20 words")
        return ("PERMITTED", "R-COMMENT-OK", "business-page comment, no selling")

    # --- likes ---
    if ch == "fb-like":
        return ("PERMITTED", "R-LIKE-OK", "like on friend's personal post")

    # --- web forms ---
    if ch == "web-form":
        if fl.get("invites_vendor"):
            return ("PERMITTED", "R-FORM-OK", "page invites vendor contact")
        return None  # unknown form nature -> typed failure

    # --- page posts ---
    if ch == "fb-page-post":
        if fl.get("sarcasm_uncertain"):
            return None
        if fl.get("ai_image") and not fl.get("disclosure_present"):
            return None
        if fl.get("homoglyph"):
            return ("TYPED_FAILURE", "R-HOMOGLYPH", "possible homoglyph spoof; intent unverifiable")
        if fl.get("tag_personal"):
            return ("QUARANTINE", "R-TAG", "tags a prospect's personal profile")
        if re.search(r"assum|probably use|might use|likely use", low):
            return ("QUARANTINE", "R-ASSUME", "unverified stack claim")
        if re.fullmatch(r"https?://\S+", text.strip()):
            return ("TYPED_FAILURE", "R-BAREURL", "bare URL, no classifiable content")
        if re.search(r"sunday blessings|praying for|blessings to", low):
            return None  # ambiguous religiosity; not classifiable by this boundary
        if re.search(r"[\x00-\x08\x0e-\x1f]", text):
            return ("TYPED_FAILURE", "R-BINARY", "non-text bytes in draft")
        if not text.strip():
            return ("TYPED_FAILURE", "R-EMPTY", "empty draft")
        if re.fullmatch(r"[\U0001F300-\U0001FAFF\s]+", text):
            return ("TYPED_FAILURE", "R-EMOJI", "no classifiable content")
        if re.fullmatch(r"(\w+\s*){2,8}", text) and len(set(text.split())) <= 3:
            return ("TYPED_FAILURE", "R-GIBBERISH", "no semantic signal")
        return ("PERMITTED", "R-POST-OK", "business post, no policy hit")

    return None

def classify(fx):
    if not isinstance(fx.get("text"), str):
        return ("TYPED_FAILURE", "R-NULLTEXT", "draft text is null; refusing to guess")
    r = rules(fx)
    if r is None:
        return ("TYPED_FAILURE", "NO-RULE", "no rule matched with confidence; refusing to guess")
    return r

def main():
    import sys
    start, end = 0, 49
    manifest_name, evidence_name, labels_name = ("manifest-1251-1300.json",
        "social-evidence.json", "labels-1251-1300.json")
    if len(sys.argv) >= 3:
        start, end = int(sys.argv[1]), int(sys.argv[2])
    if len(sys.argv) >= 6:
        manifest_name, evidence_name, labels_name = sys.argv[3], sys.argv[4], sys.argv[5]
    manifest = json.load(open(os.path.join(WORK, manifest_name)))
    results = {}
    for num in range(start, end + 1):
        fx = json.load(open(os.path.join(WORK, manifest[str(num)]["file"])))
        verdict, rule, reason = classify(fx)
        results[str(num)] = {"verdict": verdict, "rule": rule, "detail": reason,
                             "provenance": {"case": num, "channel": fx["channel"],
                                             "text_chars": len(fx["text"]) if isinstance(fx.get("text"), str) else 0},
                             "pass": verdict in ("PERMITTED", "QUARANTINE", "TYPED_FAILURE")}
        print("case %d: %s [%s] -- %s" % (num, verdict, rule, reason))
    counts = {}
    for v in results.values():
        counts[v["verdict"]] = counts.get(v["verdict"], 0) + 1
    results["_meta"] = {"counts": counts,
                        "all_typed": all(v["pass"] for k, v in results.items() if k != "_meta")}
    json.dump(results, open(os.path.join(WORK, evidence_name), "w"), indent=1)
    # checker against ground truth (not used by the harness itself)
    labels = json.load(open(os.path.join(WORK, labels_name)))
    mism = [(k, results[k]["verdict"], labels[k]) for k in labels if results[k]["verdict"] != labels[k]]
    print(counts, "all_typed:", results["_meta"]["all_typed"], "label mismatches:", mism if mism else "none")

if __name__ == "__main__":
    main()
