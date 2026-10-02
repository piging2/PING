#!/usr/bin/env python3
"""Meme object composer.

Pipeline: Research -> verified observation -> opportunity -> content object
    -> platform-specific draft -> human approval -> post/reply

Commands:
  validate <file>   enforce schema + hard rules (no named business, hedge if provisional)
  draft <id>        render platform drafts from the object into meme-drafts.json
  approve <id>      record human approval (Nolan)
  promote <id>      move an approved object into meme-queue.json as a pending item
  list              show all objects and their status
"""
import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
FAMILIES = {"MARKETING_CIRCUS", "SAAS_STACK_GRAVEYARD", "AGENCY_MAGIC_TRICK", "PING_RECEIPT"}
GRADES = {"OBSERVED", "INFERRED", "VERIFIED"}
STATUSES = {"draft", "approved", "queued", "posted"}
DRAFTS_FILE = os.path.join(HERE, "meme-drafts.json")
QUEUE_FILE = os.path.join(HERE, "meme-queue.json")


def load_names():
    path = os.path.join(HERE, "business-names.txt")
    with open(path) as f:
        return [n.strip().lower() for n in f if n.strip()]


def load_obj(path):
    with open(path) as f:
        return json.load(f)


def obj_path(obj_id):
    return os.path.join(HERE, obj_id + ".json")


def errors(obj):
    errs = []
    for field in ("id", "family", "status", "observation", "receipt",
                  "implication", "opportunity", "joke"):
        if not obj.get(field):
            errs.append("missing or empty: " + field)
    if obj.get("family") not in FAMILIES:
        errs.append("bad family: %r" % obj.get("family"))
    if obj.get("status") not in STATUSES:
        errs.append("bad status: %r" % obj.get("status"))
    r = obj.get("receipt") or {}
    for f in ("evidence", "sources", "grade"):
        if not r.get(f):
            errs.append("receipt missing or empty: " + f)
    if r.get("grade") not in GRADES:
        errs.append("bad receipt grade: %r" % r.get("grade"))
    j = obj.get("joke") or {}
    if not j.get("punchline"):
        errs.append("joke missing punchline")
    if obj.get("no_named_business") is not True:
        errs.append("no_named_business must be true")
    # Hard rule: no named business in public-facing text
    names = load_names()
    haystacks = [obj.get("observation", ""), j.get("punchline", ""),
                 j.get("alt", "") or ""]
    for d in (obj.get("drafts") or {}).values():
        haystacks.append(d)
    for h in haystacks:
        low = h.lower()
        for n in names:
            if n and n in low:
                errs.append("named business in public text: %r" % n)
                break
    # Hard rule: provisional jokes carry the explicit hedge
    if obj.get("provisional"):
        hedge = obj.get("hedge", "")
        if not hedge:
            errs.append("provisional object needs a hedge field")
        elif hedge.lower() not in j.get("punchline", "").lower():
            errs.append("provisional joke must contain the hedge: %r" % hedge)
    # Hard rule: no em dashes in public text
    for h in haystacks:
        if "\u2014" in h:
            errs.append("em dash in public text")
            break
    # Approval consistency
    if obj.get("status") in ("approved", "queued", "posted") and not obj.get("approved_by"):
        errs.append("status %r requires approved_by" % obj.get("status"))
    return errs


def cmd_validate(path):
    obj = load_obj(path)
    errs = errors(obj)
    if errs:
        print("INVALID %s" % obj.get("id", path))
        for e in errs:
            print("  - " + e)
        return 1
    print("VALID %s (%s)" % (obj["id"], obj["family"]))
    return 0


def render_drafts(obj):
    obs = obj["observation"]
    imp = obj["implication"]
    opp = obj["opportunity"]
    punch = obj["joke"]["punchline"]
    post = (
        "Observed pattern: %s\n\n%s\n\n%s\n\nPING says: %s"
        % (obs, imp, opp, punch)
    )
    reply = (
        "The interesting part: %s %s"
        % (obs[0].lower() + obs[1:], "The fix is usually simpler than a full "
           "transformation. " + opp)
    )
    drafts = {"facebook_post": post, "reply": reply}
    drafts.update(obj.get("draft_overrides") or {})
    return drafts


def cmd_draft(obj_id):
    path = obj_path(obj_id)
    obj = load_obj(path)
    errs = errors(obj)
    if errs:
        print("cannot draft an invalid object:")
        for e in errs:
            print("  - " + e)
        return 1
    obj["drafts"] = render_drafts(obj)
    with open(path, "w") as f:
        json.dump(obj, f, indent=2)
        f.write("\n")
    drafts = {}
    if os.path.exists(DRAFTS_FILE):
        with open(DRAFTS_FILE) as f:
            drafts = json.load(f)
    drafts[obj_id] = {"family": obj["family"], "status": obj["status"],
                      "drafts": obj["drafts"]}
    with open(DRAFTS_FILE, "w") as f:
        json.dump(drafts, f, indent=2)
        f.write("\n")
    print("drafted %s -> %s" % (obj_id, DRAFTS_FILE))
    return 0


def cmd_approve(obj_id):
    path = obj_path(obj_id)
    obj = load_obj(path)
    errs = errors(obj)
    if errs:
        print("cannot approve an invalid object:")
        for e in errs:
            print("  - " + e)
        return 1
    obj["status"] = "approved"
    obj["approved_by"] = "Nolan Geske %s" % date.today().isoformat()
    with open(path, "w") as f:
        json.dump(obj, f, indent=2)
        f.write("\n")
    print("approved %s" % obj_id)
    return 0


def cmd_promote(obj_id):
    path = obj_path(obj_id)
    obj = load_obj(path)
    if obj.get("status") != "approved":
        print("promote requires approved status (currently %r)" % obj.get("status"))
        return 1
    queue = []
    if os.path.exists(QUEUE_FILE):
        with open(QUEUE_FILE) as f:
            queue = json.load(f)
    caption = obj["drafts"]["facebook_post"] if obj.get("drafts") else ""
    queue.append({"source_meme": obj_id, "family": obj["family"],
                  "image": None, "caption": caption,
                  "posted": False, "posted_at": None})
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f, indent=2)
        f.write("\n")
    obj["status"] = "queued"
    with open(path, "w") as f:
        json.dump(obj, f, indent=2)
        f.write("\n")
    print("promoted %s -> %s (pending, image unassigned)" % (obj_id, QUEUE_FILE))
    return 0


def cmd_list():
    for fn in sorted(os.listdir(HERE)):
        if fn.endswith(".json") and fn not in ("meme-drafts.json", "meme-queue.json"):
            obj = load_obj(os.path.join(HERE, fn))
            errs = errors(obj)
            mark = "VALID  " if not errs else "INVALID"
            print("%s %-28s %-14s %s" % (mark, obj.get("id"),
                                        obj.get("family"), obj.get("status")))
    return 0


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    cmd = argv[1]
    if cmd == "validate" and len(argv) == 3:
        return cmd_validate(argv[2])
    if cmd == "draft" and len(argv) == 3:
        return cmd_draft(argv[2])
    if cmd == "approve" and len(argv) == 3:
        return cmd_approve(argv[2])
    if cmd == "promote" and len(argv) == 3:
        return cmd_promote(argv[2])
    if cmd == "list":
        return cmd_list()
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
