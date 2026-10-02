#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1351..1400 (permitted-social cases 100-149).
Third batch: ritual position/format rules, word-count edges, type coercion,
precedence conflicts, null/odd inputs."""
import json, os, sys

WORK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, WORK)
from gen_social import blank_lines, DISC

FX = os.path.join(WORK, "fx", "social")
os.makedirs(FX, exist_ok=True)

AI_ID = "I'm an AI reaching out on behalf of PING Social"
SIGNOFF = "PING Social, (970) 589-3309"

def outreach(body, n=1, **flags):
    t = blank_lines(DISC + "\n" + AI_ID + "\n" + body + "\n" + SIGNOFF)
    fl = {"cold_email_n_today": n}
    fl.update(flags)
    return t, "email", fl

def words(n):
    return " ".join("word%d" % i for i in range(n))

F = [
 (100, "Hi there. " + DISC + " " + AI_ID + ". Quick question. " + SIGNOFF,
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),  # disclosure buried
 (101, DISC + " " + AI_ID + " Quick question. " + SIGNOFF,
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),  # single paragraph
 (102, blank_lines(DISC + "\n" + AI_ID + "\nQuick question.\n" + SIGNOFF + "\nP.S. one more thing"),
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),  # text after signoff
 (103, *outreach("Quick question about your dispatch flow.", 2), "PERMITTED"),
 (104, "Our autumn service window is now open — book early.",
  "fb-page-post", {}, "QUARANTINE"),  # em dash
 (105, words(30), "fb-comment", {"target": "business-page"}, "QUARANTINE"),
 (106, words(20), "fb-comment", {"target": "business-page"}, "PERMITTED"),
 (107, *outreach("Quick question.", "three"), "TYPED_FAILURE"),
 (108, blank_lines(DISC + "\n" + AI_ID + "\nSaw your Page.\n" + SIGNOFF),
  "fb-dm", {"message_button": True}, "QUARANTINE"),  # verified flag missing
 (109, blank_lines(DISC + "\nI'm Nolan, with PING Social.\nQuick question.\n" + SIGNOFF),
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),
 (110, blank_lines(DISC + "\n" + DISC + "\n" + AI_ID + "\nQuick question.\n" + SIGNOFF),
  "email", {"cold_email_n_today": 1}, "PERMITTED"),  # duplicated disclosure harmless
 (111, *outreach("Quick question.", 11, franchise=True), "QUARANTINE"),  # overcap wins
 (112, *outreach("Quick question.", 1, touch_n=4, already_sent_today=True), "QUARANTINE"),  # dup wins
 (113, "   \n  \t ", "fb-page-post", {}, "TYPED_FAILURE"),
 (114, blank_lines(DISC + "\n" + AI_ID + "\nQuick question.\n" + SIGNOFF),
  "push", {"cold_email_n_today": 1}, "TYPED_FAILURE"),
 (115, "DM me for a quote!", "fb-comment", {"target": "business-page"}, "QUARANTINE"),
 (116, "Proud of this install.", "fb-like", {"target": "own-page-post"}, "PERMITTED"),
 (117, "I need my water heater replaced ASAP. What do you charge?",
  "web-form", {"invites_vendor": True}, "PERMITTED"),  # boundary cannot know intent
 (118, "We now use AI dispatchers to answer after hours.",
  "fb-page-post", {}, "PERMITTED"),
 (119, *outreach("Quick question.", 10, touch_n=3, days_since=12), "PERMITTED"),
 (120, blank_lines(DISC + "\n" + AI_ID + "\nQuick question.\nPING Social, (970) 555-0100"),
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),  # wrong phone in signoff
 (121, words(19), "fb-comment", {"target": "business-page"}, "PERMITTED"),
 (122, "Drain clears starting at $89. Results may vary by job.",
  "fb-page-post", {}, "PERMITTED"),
 (123, blank_lines(DISC + "\n" + AI_ID + "\nA recent review mentioned slow callbacks.\n" + SIGNOFF),
  "email", {"cold_email_n_today": 1, "review_trigger": True}, "PERMITTED"),
 (124, blank_lines(DISC + "\n" + AI_ID + "\nAs Karen's review said, callbacks are slow.\n" + SIGNOFF),
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),
 (125, *outreach("Congrats on the new shop.", 1, filing_age_days=91, tagged_new=True), "QUARANTINE"),
 (126, *outreach("Quick question.", 1, pipeline_state="NEW", notes_say_ok=True), "PERMITTED"),
 (127, "See our new service page https://example.com/services for details.",
  "fb-page-post", {}, "PERMITTED"),
 (128, "https://example.com", "fb-page-post", {}, "TYPED_FAILURE"),
 (129, blank_lines(DISC + "\n" + AI_ID + "\n" + SIGNOFF),
  "email", {"cold_email_n_today": 1}, "PERMITTED"),  # empty body
 (130, blank_lines(DISC + "\n" + AI_ID + "\nSaw your Page.\n" + SIGNOFF),
  "fb-dm", {"message_button": True, "page_verified": True}, "PERMITTED"),
 (131, "Great work — really impressive.", "fb-comment", {"target": "business-page"}, "QUARANTINE"),
 (132, 12345, "fb-page-post", {}, "TYPED_FAILURE"),
 (133, *outreach("Quick question.", None), "TYPED_FAILURE"),
 (134, "Praying for our techs out in this heat today.",
  "fb-page-post", {}, "TYPED_FAILURE"),
 (135, *outreach("Quick question.", 1, confidence="highest"), "PERMITTED"),
 (136, "Check out PING Social for your phones! " + words(25),
  "fb-comment", {"target": "personal-profile"}, "QUARANTINE"),  # personal wins
 (137, "EAB was confirmed in Carbondale this month per the state lab.",
  "fb-page-post", {"evidence": "state-lab"}, "PERMITTED"),
 (138, "\n\n" + blank_lines(DISC + "\n" + AI_ID + "\nQuick question.\n" + SIGNOFF),
  "email", {"cold_email_n_today": 1}, "PERMITTED"),  # leading whitespace ok
 (139, blank_lines(DISC + "\nI'm  an AI reaching out on behalf of PING Social.\nQuick question.\n" + SIGNOFF),
  "email", {"cold_email_n_today": 1}, "QUARANTINE"),  # double-space identity
 (140, "I need a quote for a new AC unit.",
  "web-form", {"customer_quote_flow": True}, "QUARANTINE"),
 (141, "Congrats on the expansion!", "fb-like", {"target": "competitor-page"}, "PERMITTED"),
 (142, "Call Dave at (970) 555-0100 or our office at (970) 589-3309.",
  "fb-page-post", {}, "QUARANTINE"),
 (143, *outreach("Quick question.", 1, filing_age_days=30), "PERMITTED"),
 (144, {"a": 1}, "fb-page-post", {}, "TYPED_FAILURE"),
 (145, words(21), "fb-comment", {"target": "business-page"}, "QUARANTINE"),
 (146, *outreach("Quick question.", 11), "QUARANTINE"),
 (147, "Vote for Smith!", "fb-page-post", {}, "QUARANTINE"),
 (148, blank_lines(DISC + "\n" + AI_ID + "\nSaw your Page — nice work.\n" + SIGNOFF),
  "fb-dm", {"message_button": True, "page_verified": True}, "QUARANTINE"),
 (149, "Storm cleanup slots open this weekend. Call to book.",
  "fb-page-post", {}, "PERMITTED"),
]

manifest, labels = {}, {}
for num, text, channel, flags, label in F:
    fx = {"case": num, "text": text, "channel": channel, "flags": flags}
    path = os.path.join(FX, "case-%d.json" % num)
    json.dump(fx, open(path, "w"))
    manifest[str(num)] = {"file": "fx/social/case-%d.json" % num}
    labels[str(num)] = label
json.dump(manifest, open(os.path.join(WORK, "manifest-1351-1400.json"), "w"), indent=1)
json.dump(labels, open(os.path.join(WORK, "labels-1351-1400.json"), "w"), indent=1)
print("wrote", len(manifest), "fixtures")
