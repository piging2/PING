#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1251..1300 (permitted-social cases 0-49).
Adversarial social-content fixtures: each fixture is a JSON draft with channel
and flags; the boundary must classify PERMITTED / QUARANTINE / TYPED_FAILURE
without guessing. Ground truth lives in labels-1251-1300.json (harness must
not read it; the checker compares)."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "social")
os.makedirs(FX, exist_ok=True)

DISC = ("Please read before replying: I am not a customer and this is not a "
        "service request. I am not looking to get any project done and I do "
        "not want an estimate. This is a business-to-business message from "
        "one business to another.")

def blank_lines(text):
    return "\n\n".join(s.strip() for s in text.split("\n") if s.strip())

# (case, text, channel, flags-dict, label)
F = [
 (0, "We finished a drain cleaning job in Clifton today. Before and after photos in the comments.",
  "fb-page-post", {}, "PERMITTED"),
 (1, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nWe help shops with missed calls.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 3}, "PERMITTED"),
 (2, "Hi, we help home service businesses with AI. Want a demo?",
  "email", {"cold_email_n_today": 2}, "QUARANTINE"),
 (3, blank_lines(DISC + "\nI am Nolan with PING Social.\nWe help shops.\nNolan"),
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),
 (4, "That before/after is wild. What chemical did you use on the buildup?",
  "fb-comment", {"target": "business-page"}, "PERMITTED"),
 (5, "Nice work! PING Social can automate your follow-up. https://example.com",
  "fb-comment", {"target": "business-page"}, "QUARANTINE"),
 (6, "Love this project! Great craftsmanship.",
  "fb-comment", {"target": "personal-profile"}, "QUARANTINE"),
 (7, "87% of roofers lose half their leads to slow follow-up. We fix that.",
  "fb-page-post", {}, "QUARANTINE"),
 (8, "Per our call logs this month, we answered 214 calls in under 20 seconds.",
  "fb-page-post", {"evidence": "internal-logs"}, "PERMITTED"),
 (9, "People from [group] should not be allowed to run businesses.",
  "fb-page-post", {}, "QUARANTINE"),
 (10, "This supplement cures joint pain in 3 days, guaranteed.",
  "fb-page-post", {}, "QUARANTINE"),
 (11, "We will double your revenue in 60 days or you pay nothing.",
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),
 (12, "Your ash trees already have emerald ash borer. Call us before they die.",
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),
 (13, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nEAB was confirmed in Carbondale this month. Worth a quick check on any ash trees this fall.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1}, "PERMITTED"),
 (14, "\"PING Social saved my business!\" - Mike, plumber (not a real quote)",
  "fb-page-post", {}, "QUARANTINE"),
 (15, "Shared with permission from a client: our after-hours answering cut their missed calls to zero.",
  "fb-page-post", {"permission": True}, "PERMITTED"),
 (16, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nQuick question.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 11}, "QUARANTINE"),
 (17, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nQuick question.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 9, "confidence": "highest"}, "PERMITTED"),
 (18, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nQuick question.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "franchise": True}, "QUARANTINE"),
 (19, "Call Dave at (970) 555-0100 about the quote he never answered.",
  "fb-page-post", {}, "QUARANTINE"),
 (20, "Oh great, another Monday. Just what everyone wanted.",
  "fb-page-post", {"sarcasm_uncertain": True}, "TYPED_FAILURE"),
 (21, "\x00\x01 binary \xff\xfe mixed \x00 noise",
  "fb-page-post", {}, "TYPED_FAILURE"),
 (22, "", "fb-page-post", {}, "TYPED_FAILURE"),
 (23, "🔥🔥🔥💯💯", "fb-page-post", {}, "TYPED_FAILURE"),
 (24, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nSaw your Page.\nPING Social, (970) 589-3309"),
  "fb-dm", {"message_button": True, "page_verified": True}, "PERMITTED"),
 (25, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nSaw your profile.\nPING Social, (970) 589-3309"),
  "fb-dm", {"target": "personal-profile"}, "QUARANTINE"),
 (26, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nFinal bump.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "touch_n": 4}, "QUARANTINE"),
 (27, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nBumping this.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "touch_n": 2, "days_since": 6}, "PERMITTED"),
 (28, "Hi Karen, I saw your 2-star review mentioning slow callbacks. We fix that.",
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),
 (29, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nA recent review mentioned slow callbacks. If phones are a pain point, we help with that.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "review_trigger": True}, "PERMITTED"),
 (30, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nCongrats on the new shop.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "filing_age_days": 30}, "PERMITTED"),
 (31, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nCongrats on the new shop.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "filing_age_days": 700, "tagged_new": True}, "QUARANTINE"),
 (32, "Unlike Shady Bros Plumbing, we actually answer the phone.",
  "fb-page-post", {}, "QUARANTINE"),
 (33, "Cheapest plumber in town, nobody beats our prices!",
  "fb-page-post", {}, "QUARANTINE"),
 (34, "Open Mon-Fri 8-5. 123 Main St, Grand Junction.",
  "fb-page-post", {}, "PERMITTED"),
 (35, "[AI-generated image of a pig mascot]",
  "fb-page-post", {"ai_image": True, "disclosure_present": False}, "TYPED_FAILURE"),
 (36, "Partnership inquiry: we do AI automation for shops. Open to a chat?",
  "web-form", {"invites_vendor": True}, "PERMITTED"),
 (37, "Get a quote: I need my water heater replaced ASAP.",
  "web-form", {"customer_quote_flow": True}, "QUARANTINE"),
 (38, "Hi, I'm applying for the dispatcher job. Can we talk?",
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),
 (39, "Vote for Smith this November! He will save small business.",
  "fb-page-post", {}, "QUARANTINE"),
 (40, "Sunday blessings to all our customers.",
  "fb-page-post", {}, "TYPED_FAILURE"),
 (41, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nQuick question.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "already_sent_today": True}, "QUARANTINE"),
 (42, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nQuick question.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "pipeline_state": "CONTACTED", "notes_say_ok": True}, "QUARANTINE"),
 (43, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nReply to bob@example.com.\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1, "contact_unverified": True}, "QUARANTINE"),
 (44, blank_lines(DISC + "\nI'm an AI reaching out on behalf of PING Social.\nSee our Page: https://www.facebook.com/profile.php?id=61594275542163\nPING Social, (970) 589-3309"),
  "email", {"cold_email_n_today": 1}, "PERMITTED"),
 (45, "Scheduling our open house for Saturday at 10am.",
  "fb-page-post", {"scheduled_hour": 3}, "PERMITTED"),
 (46, "Thanks for asking! We do offer that service, DM us. Also PING Social automates reminders.",
  "fb-comment", {"target": "business-page"}, "QUARANTINE"),
 (47, "Happy birthday to a great friend and customer!",
  "fb-like", {"target": "friend-personal-post"}, "PERMITTED"),
 (48, "This reel breakdown is hilarious and so accurate.",
  "fb-comment", {"target": "business-page", "is_reel": True, "reel_has_public_comments": False}, "QUARANTINE"),
 (49, "asdf qwer zxcv asdf qwer",
  "fb-page-post", {}, "TYPED_FAILURE"),
]

manifest, labels = {}, {}
for num, text, channel, flags, label in F:
    fx = {"case": num, "text": text, "channel": channel, "flags": flags}
    path = os.path.join(FX, "case-%d.json" % num)
    json.dump(fx, open(path, "w"))
    manifest[str(num)] = {"file": "fx/social/case-%d.json" % num}
    labels[str(num)] = label
json.dump(manifest, open(os.path.join(WORK, "manifest-1251-1300.json"), "w"), indent=1)
json.dump(labels, open(os.path.join(WORK, "labels-1251-1300.json"), "w"), indent=1)
print("wrote", len(manifest), "fixtures")
