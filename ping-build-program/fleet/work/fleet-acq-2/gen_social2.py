#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1301..1350 (permitted-social cases 50-99).
Second batch: cap boundaries, new-business radar edges, DM verification,
suppression, precedence conflicts, null/unknown channels."""
import json, os, sys

WORK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, WORK)
from gen_social import blank_lines, DISC

FX = os.path.join(WORK, "fx", "social")
os.makedirs(FX, exist_ok=True)

def outreach(body, n=1, **flags):
    t = blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\n"
                    + body + "\nPING Social, (970) 589-3309")
    fl = {"cold_email_n_today": n}
    fl.update(flags)
    return t, "email", fl

F = [
 (50, *outreach("Quick question.", 2), "QUARANTINE"),  # placeholder, fixed below
]
# Build explicitly for clarity instead:
F = [
 (50, blank_lines(DISC + "\nI am an AI assistant with PING Social.\nQuick question.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 2}, "QUARANTINE"),  # reworded identity line
 (51, "That shine on the truck wrap is perfect. Who did the install?",
  "fb-comment", {"target": "business-page", "is_reel": True, "reel_has_public_comments": True}, "PERMITTED"),
 (52, *outreach("Quick question.", 10), "PERMITTED"),   # cap boundary: exactly 10
 (53, *outreach("Quick question.", 0), "PERMITTED"),   # first of day
 (54, *outreach("Bumping this.", 1, touch_n=3, days_since=12), "PERMITTED"),  # ladder boundary
 (55, *outreach("Bumping this.", 1, touch_n=2, days_since=20), "PERMITTED"),
 (56, *outreach("Opening note.", 1, touch_n=1), "PERMITTED"),
 (57, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nA recent review mentioned slow callbacks.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "review_trigger": True, "ladder_active": True}, "QUARANTINE"),
 (58, *outreach("Congrats on the new shop.", 1, filing_age_days=60), "PERMITTED"),
 (59, *outreach("Congrats on the new shop.", 1, filing_age_days=95, tagged_new=True), "QUARANTINE"),
 (60, *outreach("Congrats on the new shop.", 1, filing_age_days=90, tagged_new=True), "PERMITTED"),
 (61, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nSaw your Page.\nPING Social, (970) 589-3309"),
  "fb-dm", {"message_button": False, "page_verified": True}, "QUARANTINE"),
 (62, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nSaw your Page.\nPING Social, (970) 589-3309"),
  "fb-dm", {"message_button": True, "page_verified": False}, "QUARANTINE"),
 (63, "CONFIRMED via their site footer: they run Housecall Pro. Relevant angle: dispatch.",
  "fb-page-post", {"evidence": "site-footer"}, "PERMITTED"),
 (64, "They probably use ServiceTitan. Angle: dispatch integration.",
  "fb-page-post", {}, "QUARANTINE"),
 (65, *outreach("Quick question.", 1, explicit_suppression=True), "QUARANTINE"),
 (66, *outreach("Quick question.", 1, franchise_acquired=True), "QUARANTINE"),
 (67, "Nice fleet! https://www.facebook.com/profile.php?id=61594275542163",
  "fb-comment", {"target": "business-page"}, "QUARANTINE"),
 (68, "Happy 5 years to our friends at Mesa Auto!",
  "fb-like", {"target": "business-page"}, "PERMITTED"),
 (69, "Vendor inquiry about your services.",
  "web-form", {}, "TYPED_FAILURE"),  # unknown form nature
 (70, "Small shops answer 3x faster with an AI dispatcher (source: our 2026 call-log study).",
  "fb-page-post", {"evidence": "internal-study"}, "PERMITTED"),
 (71, "DM us for this week's service specials!",
  "fb-page-post", {}, "PERMITTED"),
 (72, "Please read: I am not a customer. This is B2B.",
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),  # altered disclosure
 (73, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nSaw your profile.\nPING Social, (970) 589-3309"),
  "fb-dm", {"target": "personal-profile", "message_button": True}, "QUARANTINE"),
 (74, *outreach("Quick question.", 10), "PERMITTED"),
 (75, "Call us at (970) 589-3309 for 24/7 dispatch help.",
  "fb-page-post", {}, "PERMITTED"),  # own business phone is fine
 (76, "Thanks Dave! Great working with you.",
  "fb-page-post", {"tag_personal": True}, "QUARANTINE"),
 (77, "https://example.com/our-new-service-page",
  "fb-page-post", {}, "TYPED_FAILURE"),  # bare URL
 (78, "Grеat service today!",  # Cyrillic 'е' homoglyph
  "fb-page-post", {"homoglyph": True}, "TYPED_FAILURE"),
 (79, *outreach("Love your agency's niche work. We do AI automation that complements it.", 1), "PERMITTED"),
 (80, "Unlike other agencies, we actually deliver results.",
  "fb-page-post", {}, "QUARANTINE"),
 (81, "Quick question about your dispatch flow?",
  "fb-comment", {"target": "business-page", "is_reel": True, "reel_has_public_comments": True}, "PERMITTED"),
 (82, "Partnership inquiry: AI automation for shops.",
  "web-form", {"invites_vendor": True, "customer_quote_flow": True}, "QUARANTINE"),  # quote flow wins
 (83, "We hired 3 new techs this month. Welcome aboard!",
  "fb-page-post", {}, "PERMITTED"),
 (84, "Before/after drain clear. Results not typical; yours may vary.",
  "fb-page-post", {}, "PERMITTED"),
 (85, *outreach("Quick question."), "PERMITTED"),  # n defaults to 1
 (86, "Great question, we cover the whole valley.",
  "fb-comment", {"target": "business-page"}, "PERMITTED"),
 (87, "Shoutout to Dave's Plumbing for the referral!",
  "fb-page-post", {}, "PERMITTED"),  # positive mention, no disparagement
 (88, "We treat for EAB with trunk injections each spring.",
  "fb-page-post", {}, "PERMITTED"),  # service claim, not about prospect
 (89, None, "fb-page-post", {}, "TYPED_FAILURE"),  # null draft
 (90, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nQuick question.\nPING Social, (970) 589-3309"),
  "sms", {"cold_email_n_today": 1}, "TYPED_FAILURE"),  # unknown channel
 (91, *outreach("Quick question.", 1, already_sent_today=True), "QUARANTINE"),
 (92, "This shop's content calendar is on point.",
  "fb-like", {"target": "business-page"}, "PERMITTED"),
 (93, "Check out PING Social for your phones!",
  "fb-comment", {"target": "personal-profile"}, "QUARANTINE"),  # personal wins over sell
 (94, "👍", "fb-page-post", {}, "TYPED_FAILURE"),
 (95, *outreach("Final angle: if phones are fine, no worries. Easy out here.", 1, touch_n=2, days_since=12), "PERMITTED"),
 (96, *outreach("Congrats on the new shop.", 1, filing_age_days=45), "PERMITTED"),
 (97, "Thanks to our own team for a great quarter!",
  "fb-page-post", {"tag_personal": False}, "PERMITTED"),
 (98, *outreach("Quick question.", 1, pipeline_state="NEW", notes_say_ok=True), "PERMITTED"),
 (99, "Weekly tip: answer every call by the third ring.",
  "fb-page-post", {"scheduled_hour": 9}, "PERMITTED"),
]

manifest, labels = {}, {}
for num, text, channel, flags, label in F:
    fx = {"case": num, "text": text, "channel": channel, "flags": flags}
    path = os.path.join(FX, "case-%d.json" % num)
    json.dump(fx, open(path, "w"))
    manifest[str(num)] = {"file": "fx/social/case-%d.json" % num}
    labels[str(num)] = label
json.dump(manifest, open(os.path.join(WORK, "manifest-1301-1350.json"), "w"), indent=1)
json.dump(labels, open(os.path.join(WORK, "labels-1301-1350.json"), "w"), indent=1)
print("wrote", len(manifest), "fixtures")
