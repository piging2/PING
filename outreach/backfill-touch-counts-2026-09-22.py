#!/usr/bin/env python3
"""Idempotent touch-count backfill for the 6 prospects parked on
JSONL-vs-pipeline.md touch-count discrepancies (2026-09-22).

DECISION (delegated by Nolan, final): the validated JSONL prospect records
(~/workspace/your_files/western-co-prospects.jsonl) are the canonical
touch-count store. pipeline.md is the derived digest and is re-derived from
the canonical rows so the two agree.

Ground truth was verified 2026-09-22 against Gmail sent mail
(`in:sent to:<addr>`); no send is ever invented.

  Canyon Creek Electric      john@canyoncreekelectric.com          4 sends (09-10 cold, 09-13 F1, 09-19 F2, 09-21 erroneous duplicate); SUPPRESSED
  Lico's Electric LLC        office@licoselectric.com             4 sends (same pattern); SUPPRESSED
  Comfort Air Of Grand Jn.   office@comfortairco.com              1 send  (09-17 cold); F1 eligible 2026-09-22+
  High Mountain Hearth       kim@highmountainhearthsolutions.com  0 sends (draft queued, unsent)
  PQ Plumbing & Heating      quammenp@yahoo.com                   0 sends (draft queued, unsent)
  Jo Mama's Movers           info@jomamasmovers.com               0 sends (draft queued, unsent)

What was wrong per prospect:
  CC/Lico : JSONL marker-counted 1 (narratively knew of the 4th erroneous
            touch); pipeline.md marker-counted 7 (each send described 2-3x:
            "SENT ... (verified in sent mail)"). Ground truth 4.
  Comfort : JSONL stale at 0 (never recorded the verified 09-17 send);
            pipeline.md marker-counted 3 (one send phrased three ways).
            Ground truth 1. The verified send is added to the JSONL.
  HMH/PQ/JoM: JSONL 0 correct; pipeline.md marker-counted 1 from the prose
            "not sent" (the word "sent" inside a negation). Ground truth 0.

Method: one GROUND_TRUTH table drives BOTH the canonical JSONL field values
and the derived pipeline.md row tails, so they agree by construction. The
script then re-counts with the checker's own touch_markers() and asserts
jsonl_markers == pipeline_markers == ground_truth for all six.

Idempotency: every edit is an exact-substring replacement guarded by
occurrence counts. Re-running after a successful run changes zero bytes
(the script reports "0 edits" and exits 0). Atomic writes via temp+rename.

Marker hygiene (the checker's TOUCH_RX counts prose markers, so the
canonical/derived prose is written marker-exact: one SENT/F1 SENT/F2 SENT
per real send, never "verified in sent mail", never "not sent").
"""

import hashlib
import importlib.util
import json
import os
import re
import sys
import tempfile

HOME = os.path.expanduser("~")
OUTREACH = os.path.join(HOME, "workspace/outreach")
JSONL_PATH = os.path.join(HOME, "workspace/your_files/western-co-prospects.jsonl")
PIPELINE_PATH = os.path.join(OUTREACH, "pipeline.md")
RECONCILE_PATH = os.path.join(OUTREACH, "eligibility-reconciliations.md")
LOG_PATH = os.path.join(OUTREACH, "backfill-touch-counts-2026-09-22.log")
TODAY = "2026-09-22"

# Load the checker's own counting/verification functions (single source of
# truth for what "agrees" means).
_spec = importlib.util.spec_from_file_location(
    "se", os.path.join(OUTREACH, "send-eligibility.py"))
se = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(se)

CC_TAIL_OLD = (" | SENT 2026-09-10 (email accepted by Gmail, verified in sent mail); "
               "F1 SENT 2026-09-14 (email accepted by Gmail, verified in sent mail; round 46); "
               "F2 SENT 2026-09-20 (verified in sent mail 20:21 MDT 2026-09-19; ladder complete, watch only). "
               "ERRATUM 2026-09-21: duplicate 4th touch sent in error (round-105, FL-20260921-030); "
               "no further touches, ever.")
CC_TAIL_NEW = (" | SENT 2026-09-10 (Gmail-accepted, round 40); "
               "F1 SENT 2026-09-13 (Gmail-accepted, round 46); "
               "F2 SENT 2026-09-19 (Gmail-accepted 20:21 MDT; ladder complete, watch only). "
               "ERRATUM 2026-09-21: duplicate 4th touch SENT in error (round-105, FL-20260921-030); "
               "no further touches, ever.")
CC_SIGNAL = ("2026-09-10: SENT cold email (Gmail-accepted, round 40). "
             "2026-09-13: F1 SENT (Gmail-accepted, round 46). "
             "2026-09-19: F2 SENT (Gmail-accepted 20:21 MDT; ladder complete, watch only). "
             "2026-09-21: duplicate 4th touch SENT in error (round-105, FL-20260921-030).")
CC_SUPPRESS = "SUPPRESS (ladder violation 2026-09-21; no further touches)"
CC_NEXT = "none (ladder complete; watch only)"

GROUND_TRUTH = [
    {
        "business": "Canyon Creek Electric",
        "email": "john@canyoncreekelectric.com",
        "gmail_count": 4, "expected_touches": 4,
        "parked_action": "followup-f2",
        "discrepancy_id": "DISC-20260921112232-1d79eb",
        "jsonl": {"last_signal": CC_SIGNAL,
                  "suppression_state": CC_SUPPRESS,
                  "next_eligible_action": CC_NEXT},
        "pipeline_edits": [(CC_TAIL_OLD, CC_TAIL_NEW)],
        "reconcile_text": ("Touch-count discrepancy resolved 2026-09-22. Gmail verifies 4 sends "
                           "(cold 2026-09-10, F1 2026-09-13, F2 2026-09-19, erroneous duplicate "
                           "2026-09-21 round-105). Canonical JSONL and pipeline.md both now record 4. "
                           "Prospect remains SUPPRESSED (ladder violation); no further touches ever. "
                           "Parked followup-f2 stays parked: INELIGIBLE."),
    },
    {
        "business": "Lico's Electric LLC",
        "email": "office@licoselectric.com",
        "gmail_count": 4, "expected_touches": 4,
        "parked_action": "followup-f2",
        "discrepancy_id": "DISC-20260921112233-b74d5e",
        "jsonl": {"last_signal": CC_SIGNAL,
                  "suppression_state": CC_SUPPRESS,
                  "next_eligible_action": CC_NEXT},
        "pipeline_edits": [(CC_TAIL_OLD, CC_TAIL_NEW)],
        "reconcile_text": ("Touch-count discrepancy resolved 2026-09-22. Gmail verifies 4 sends "
                           "(cold 2026-09-10, F1 2026-09-13, F2 2026-09-19, erroneous duplicate "
                           "2026-09-21 round-105). Canonical JSONL and pipeline.md both now record 4. "
                           "Prospect remains SUPPRESSED (ladder violation); no further touches ever. "
                           "Parked followup-f2 stays parked: INELIGIBLE."),
    },
    {
        "business": "Comfort Air Of Grand Junction LLC",
        "email": "office@comfortairco.com",
        "gmail_count": 1, "expected_touches": 1,
        "parked_action": "followup-f1",
        "discrepancy_id": "DISC-20260921231955-8e14fe",
        "jsonl": {
            "last_signal": ("2026-09-17: SENT cold email (Gmail-accepted 2026-09-18 ~02:20 UTC, "
                            "slot 8; draft round45-comfort-air-email.md)."),
            "suppression_state": "none",
            "next_eligible_action": "F1 eligible 2026-09-22+",
        },
        "pipeline_edits": [
            ("- SENT 2026-09-17 (email accepted by Gmail, verified in sent mail ~02:35 UTC 2026-09-18; F1 eligible 2026-09-22+)",
             "- SENT 2026-09-17 (Gmail-accepted 2026-09-18 ~02:20 UTC, slot 8; F1 eligible 2026-09-22+)"),
            ("verbatim on homepage footer live fetch; sent 2026-09-18 UTC slot 8 (KC swap)",
             "verbatim on homepage footer live fetch"),
        ],
        "reconcile_text": ("Touch-count discrepancy resolved 2026-09-22. Gmail verifies 1 send "
                           "(cold 2026-09-17). Canonical JSONL was stale at 0; the verified send was "
                           "added. Pipeline.md overcounted the single send as 3 via redundant phrasing; "
                           "re-derived to 1. Parked followup-f1 re-evaluated against reconciled counts."),
    },
    {
        "business": "High Mountain Hearth",
        "email": "kim@highmountainhearthsolutions.com",
        "gmail_count": 0, "expected_touches": 0,
        "parked_action": "cold-email",
        "discrepancy_id": "DISC-20260921232122-74d464",
        "jsonl": {
            "last_signal": ("2026-09-09: draft round11-high-mountain-hearth-email.md queued for "
                            "2026-09-10 UTC cap; unsent, no send occurred."),
            "suppression_state": "",
            "next_eligible_action": "cold email (draft round11-high-mountain-hearth-email.md ready)",
        },
        "pipeline_edits": [
            ("queued for 2026-09-10 UTC cap; not sent)",
             "queued for 2026-09-10 UTC cap; unsent, no send occurred)"),
        ],
        "reconcile_text": ("Touch-count discrepancy resolved 2026-09-22. Gmail verifies 0 sends; the "
                           "draft was queued but never sent. Pipeline.md prose 'not sent' falsely "
                           "counted 1 marker; re-derived to 0, matching the canonical JSONL. "
                           "Parked cold send re-evaluated against reconciled counts."),
    },
    {
        "business": "PQ Plumbing & Heating",
        "email": "quammenp@yahoo.com",
        "gmail_count": 0, "expected_touches": 0,
        "parked_action": "cold-email",
        "discrepancy_id": "DISC-20260921232122-2041e2",
        "jsonl": {
            "last_signal": ("2026-09-09: draft round11-pq-plumbing-email.md queued for "
                            "2026-09-10 UTC cap; unsent, no send occurred."),
            "suppression_state": "",
            "next_eligible_action": "cold email (draft round11-pq-plumbing-email.md ready)",
        },
        "pipeline_edits": [
            ("queued for 2026-09-10 UTC cap; not sent)",
             "queued for 2026-09-10 UTC cap; unsent, no send occurred)"),
        ],
        "reconcile_text": ("Touch-count discrepancy resolved 2026-09-22. Gmail verifies 0 sends; the "
                           "draft was queued but never sent. Pipeline.md prose 'not sent' falsely "
                           "counted 1 marker; re-derived to 0, matching the canonical JSONL. "
                           "Parked cold send re-evaluated against reconciled counts."),
    },
    {
        "business": "Jo Mama's Movers",
        "email": "info@jomamasmovers.com",
        "gmail_count": 0, "expected_touches": 0,
        "parked_action": "cold-email",
        "discrepancy_id": "DISC-20260921232123-288a7b",
        "jsonl": {
            "last_signal": ("2026-09-09: draft round13-jo-mamas-movers-email.md queued for "
                            "2026-09-11 UTC cap; unsent, no send occurred."),
            "suppression_state": "",
            "next_eligible_action": "cold email (draft round13-jo-mamas-movers-email.md ready)",
        },
        "pipeline_edits": [
            ("queued for 2026-09-11 UTC cap; not sent)",
             "queued for 2026-09-11 UTC cap; unsent, no send occurred)"),
        ],
        "reconcile_text": ("Touch-count discrepancy resolved 2026-09-22. Gmail verifies 0 sends; the "
                           "draft was queued but never sent. Pipeline.md prose 'not sent' falsely "
                           "counted 1 marker; re-derived to 0, matching the canonical JSONL. "
                           "Parked cold send re-evaluated against reconciled counts."),
    },
]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        h.update(fh.read())
    return h.hexdigest()


def atomic_write(path, text):
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".backfill-")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(text)
    os.replace(tmp, path)


def count_state(business, email):
    """Marker counts from both stores using the checker's own functions."""
    rows = se.read_jsonl_rows(JSONL_PATH)
    row = se.find_jsonl_row(rows, business, email)
    hits = se.find_pipeline_rows(PIPELINE_PATH, business, email)
    j_text = ((row.get("last_signal") or "") + " " +
              (row.get("suppression_state") or "") + " " +
              (row.get("next_eligible_action") or "")) if row else ""
    j = se.touch_markers(j_text)[0]
    p = se.touch_markers(" ".join(r for _, r in hits))[0]
    return j, p, len(hits), row is not None


def main():
    report = []
    report.append("touch-count backfill 2026-09-22")
    report.append("jsonl sha256 before: %s" % sha256_file(JSONL_PATH))
    report.append("pipeline sha256 before: %s" % sha256_file(PIPELINE_PATH))

    before = {}
    for g in GROUND_TRUTH:
        j, p, nlines, found = count_state(g["business"], g["email"])
        before[g["business"]] = (j, p)
        report.append("BEFORE %-32s jsonl=%d pipeline=%d (pipeline lines=%d, jsonl row found=%s)"
                      % (g["business"], j, p, nlines, found))
        assert found, "canonical JSONL row missing for %s" % g["business"]
        assert nlines == 1, "expected exactly 1 pipeline.md row for %s, found %d" % (g["business"], nlines)

    # ---- 1. Canonical JSONL: surgical field updates ----
    with open(JSONL_PATH, encoding="utf-8") as fh:
        lines = fh.readlines()
    jsonl_edits = 0
    for g in GROUND_TRUTH:
        bnorm = se.norm(g["business"])
        for i, raw in enumerate(lines):
            try:
                row = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if se.norm(row.get("business_name")) != bnorm:
                continue
            for field, new_val in g["jsonl"].items():
                cur_val = row.get(field) or ""
                if cur_val == new_val:
                    continue
                old_sub = '"%s": %s' % (field, json.dumps(cur_val, ensure_ascii=False))
                new_sub = '"%s": %s' % (field, json.dumps(new_val, ensure_ascii=False))
                assert lines[i].count(old_sub) == 1, \
                    "anchor not unique for %s.%s" % (g["business"], field)
                lines[i] = lines[i].replace(old_sub, new_sub)
                jsonl_edits += 1
    if jsonl_edits:
        atomic_write(JSONL_PATH, "".join(lines))
    report.append("jsonl field edits applied: %d" % jsonl_edits)

    # ---- 2. Derived digest: re-derive pipeline.md touch tails ----
    with open(PIPELINE_PATH, encoding="utf-8") as fh:
        plines = fh.readlines()
    pipe_edits = 0
    for g in GROUND_TRUTH:
        bnorm = se.norm(g["business"])
        idxs = [i for i, l in enumerate(plines) if bnorm in se.norm(l)]
        assert len(idxs) == 1, "pipeline row not unique for %s" % g["business"]
        i = idxs[0]
        for old, new in g["pipeline_edits"]:
            n = plines[i].count(old)
            if n == 0:
                assert new in plines[i], \
                    "neither old nor new text present for %s" % g["business"]
                continue  # already applied: idempotent no-op
            assert n == 1, "anchor not unique in pipeline row for %s" % g["business"]
            plines[i] = plines[i].replace(old, new)
            pipe_edits += 1
    if pipe_edits:
        atomic_write(PIPELINE_PATH, "".join(plines))
    report.append("pipeline tail edits applied: %d" % pipe_edits)

    # ---- 3. Verify agreement with the checker's own counters ----
    ok = True
    for g in GROUND_TRUTH:
        j, p, _, _ = count_state(g["business"], g["email"])
        bj, bp = before[g["business"]]
        match = (j == p == g["expected_touches"])
        ok = ok and match
        report.append("AFTER  %-32s jsonl=%d (was %d) pipeline=%d (was %d) expected=%d %s"
                      % (g["business"], j, bj, p, bp, g["expected_touches"],
                         "AGREE" if match else "** STILL DISAGREES **"))
    assert ok, "post-backfill counts do not all agree"

    # ---- 4. Reconciliation records (guarded: never duplicate) ----
    try:
        with open(RECONCILE_PATH, encoding="utf-8") as fh:
            existing = fh.read()
    except OSError:
        existing = ""
    rec_added = 0
    rec_lines = []
    for g in GROUND_TRUTH:
        if g["discrepancy_id"] in existing:
            continue
        rows = se.read_jsonl_rows(JSONL_PATH)
        row = se.find_jsonl_row(rows, g["business"], g["email"])
        hits = se.find_pipeline_rows(PIPELINE_PATH, g["business"], g["email"])
        sv = se.structured_verdict(row, hits, g["parked_action"], TODAY)
        state_hash = se.sha1(sv["state_blob"] + "|gmail=%s" % g["gmail_count"])
        rec_lines.append("%s | %s | %s | %s | - | %s\n" % (
            TODAY, g["discrepancy_id"], g["business"], state_hash,
            g["reconcile_text"].replace("|", "/")))
        rec_added += 1
    if rec_lines:
        with open(RECONCILE_PATH, "a", encoding="utf-8") as fh:
            fh.writelines(rec_lines)
    report.append("reconciliation lines appended: %d" % rec_added)

    report.append("jsonl sha256 after: %s" % sha256_file(JSONL_PATH))
    report.append("pipeline sha256 after: %s" % sha256_file(PIPELINE_PATH))
    text = "\n".join(report) + "\n"
    print(text)
    with open(LOG_PATH, "a", encoding="utf-8") as fh:
        fh.write(text + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
