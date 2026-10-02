#!/usr/bin/env python3
"""Idempotent touch-count backfill for the 2 remaining parked discrepancies
(B&B Plumbing & Heating, WBS Coatings), 2026-09-22.

Different failure mode than the 6-prospect backfill: non-accepted states and
prose re-descriptions counted as touches.

Ground truth verified 2026-09-22 against Gmail sent mail (`in:sent to:<addr>`):

  B & B Plumbing & Heating   rifleplumber@yahoo.com     1 send (cold 2026-09-17
                             20:19 MDT, id 1a0b25022d3383cc); F1 eligible 2026-09-22+
  WBS Coatings               contact@wbscoatings.com    0 sends (draft queued, never sent)

What was wrong per prospect:
  B&B: checker counted 4 touch markers for the 1 verified send --
       pipeline.md line 1226 described it three ways ("SENT 2026-09-17",
       "verified in sent mail", "email sent 2026-09-18 UTC") and the
       dedup-audit line 2128 referenced it again ("[SENT 2026-09-17]").
  WBS: checker counted 1 touch from the prose "not submitted" (2026-09-10
       SKIPPED form) matching the SUBMITTED marker. Gmail: 0 sends.

No JSONL rows are created: the canonical JSONL is at Nolan's 300-active
cap, and the standing procedure tracks cap-overflow prospects in
pipeline.md (as with M1Pro, and as pipeline.md itself notes for WBS).
The reconciliation therefore makes pipeline.md marker-exact against the
Gmail ground truth, and the hardened checker (negation guard + identical
(marker, date) dedup, same commit) counts it correctly.

Method: one GROUND_TRUTH table drives the derived pipeline.md row tails.
The script re-counts with the checker's own touch_markers() and asserts
pipeline_markers == gmail_count for both prospects.

Idempotency: every edit is an exact-substring replacement guarded by
occurrence counts. Re-running after a successful run changes zero bytes.
Atomic writes via temp+rename. Nothing is ever sent.

Marker hygiene: one SENT per real send, Gmail message id cited, never
"verified in sent mail", never "not sent"/"not submitted".
"""

import hashlib
import importlib.util
import json
import os
import sys
import tempfile

HOME = os.path.expanduser("~")
OUTREACH = os.path.join(HOME, "workspace/outreach")
JSONL_PATH = os.path.join(HOME, "workspace/your_files/western-co-prospects.jsonl")
PIPELINE_PATH = os.path.join(OUTREACH, "pipeline.md")
RECONCILE_PATH = os.path.join(OUTREACH, "eligibility-reconciliations.md")
LOG_PATH = os.path.join(OUTREACH, "backfill-touch-counts-bb-wbs-2026-09-22.log")
TODAY = "2026-09-22"

_spec = importlib.util.spec_from_file_location(
    "se", os.path.join(OUTREACH, "send-eligibility.py"))
se = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(se)

GROUND_TRUTH = [
    {
        "business": "B & B Plumbing & Heating",
        "email": "rifleplumber@yahoo.com",
        "gmail_count": 1, "expected_touches": 1,
        "parked_action": "followup-f1",
        "discrepancy_id": "DISC-20260921231955-daa243",
        "pipeline_edits": [
            ("- SENT 2026-09-17 (email accepted by Gmail, verified in sent mail "
             "~02:31 UTC 2026-09-18; F1 eligible 2026-09-22+)",
             "- SENT 2026-09-17 (Gmail-accepted 2026-09-18 ~02:20 UTC, "
             "id 1a0b25022d3383cc; F1 eligible 2026-09-22+)"),
            ("(source=meta-ai-intel, weak-website; email sent 2026-09-18 UTC)",
             "(source=meta-ai-intel, weak-website)"),
        ],
        "reconcile_text": (
            "Touch-count discrepancy resolved 2026-09-22. Gmail verifies exactly "
            "1 accepted send (cold 2026-09-17 20:19 MDT, id 1a0b25022d3383cc). "
            "The checker's 4-touch count came from prose re-descriptions of that "
            "single send ('verified in sent mail', 'email sent 2026-09-18 UTC') "
            "plus a dedup-audit line referencing it again. Pipeline.md re-derived "
            "marker-exact to 1; the checker now dedups identical (marker, date) "
            "pairs. No canonical JSONL row (300-active cap; tracked in pipeline.md "
            "per standing procedure, as with M1Pro). Stale leads.md DRAFTED notes "
            "do not override the Gmail-verified send (notes never resurrect). "
            "Parked followup-f1 re-evaluated against reconciled counts: ELIGIBLE "
            "(1 touch, F1 window day 4-7, round-100 cheap-verify/chain PASS stands)."),
    },
    {
        "business": "WBS Coatings",
        "email": "contact@wbscoatings.com",
        "gmail_count": 0, "expected_touches": 0,
        "parked_action": "cold-email",
        "discrepancy_id": "DISC-20260921232122-263f6c",
        "pipeline_edits": [
            # line-scoped: the "not submitted" tail is shared by several
            # form-prospect lines; scope to the WBS row by unique prefix.
            ("- WBS Coatings |", "no B2B/vendor invitation, not submitted",
             "no B2B/vendor invitation, left unsubmitted"),
        ],
        "reconcile_text": (
            "Touch-count discrepancy resolved 2026-09-22. Gmail verifies 0 sends. "
            "The checker's 1-touch count came from the prose 'not submitted' "
            "(2026-09-10 SKIPPED form) matching the SUBMITTED marker. Pipeline.md "
            "re-derived marker-exact to 0; the checker now ignores negated markers. "
            "No canonical JSONL row (300-active cap; tracked in pipeline.md per "
            "standing procedure). Parked cold send re-evaluated against reconciled "
            "counts: ELIGIBLE (0 touches; draft round68-wbs-coatings-email.md)."),
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
    """Pipeline marker count via the checker's own hardened counter."""
    rows = se.read_jsonl_rows(JSONL_PATH)
    row = se.find_jsonl_row(rows, business, email)
    hits = se.find_pipeline_rows(PIPELINE_PATH, business, email)
    p = se.touch_markers(" ".join(r for _, r in hits))[0]
    return p, len(hits), row is not None


def main():
    report = []
    report.append("touch-count backfill B&B/WBS 2026-09-22")
    report.append("pipeline sha256 before: %s" % sha256_file(PIPELINE_PATH))

    before = {}
    for g in GROUND_TRUTH:
        p, nlines, found = count_state(g["business"], g["email"])
        before[g["business"]] = p
        report.append("BEFORE %-28s pipeline=%d (pipeline lines=%d, jsonl row found=%s)"
                      % (g["business"], p, nlines, found))
        assert not found, \
            "JSONL row unexpectedly present for %s; cap procedure changed?" % g["business"]
        assert nlines >= 1, "no pipeline.md row for %s" % g["business"]

    # ---- Derived digest: re-derive pipeline.md touch tails (marker-exact) ----
    with open(PIPELINE_PATH, encoding="utf-8") as fh:
        plines = fh.readlines()
    pipe_edits = 0
    for g in GROUND_TRUTH:
        for item in g["pipeline_edits"]:
            if len(item) == 3:
                # Line-scoped edit: (unique line anchor, old, new).
                line_anchor, old, new = item
                locs = [i for i, l in enumerate(plines) if line_anchor in l]
                assert len(locs) == 1, \
                    "line anchor not unique for %s" % g["business"]
                i = locs[0]
                if new in plines[i]:
                    continue  # already applied: idempotent no-op
                assert plines[i].count(old) == 1, \
                    "edit target not unique on line for %s" % g["business"]
                plines[i] = plines[i].replace(old, new)
                pipe_edits += 1
                continue
            old, new = item
            locs = [i for i, l in enumerate(plines) if old in l]
            if not locs:
                assert any(new in l for l in plines), \
                    "neither old nor new text present for %s" % g["business"]
                continue  # already applied: idempotent no-op
            assert len(locs) == 1 and plines[locs[0]].count(old) == 1, \
                "anchor not unique for %s" % g["business"]
            plines[locs[0]] = plines[locs[0]].replace(old, new)
            pipe_edits += 1
    if pipe_edits:
        atomic_write(PIPELINE_PATH, "".join(plines))
    report.append("pipeline tail edits applied: %d" % pipe_edits)

    # ---- Verify agreement with the checker's own hardened counter ----
    ok = True
    for g in GROUND_TRUTH:
        p, _, _ = count_state(g["business"], g["email"])
        bp = before[g["business"]]
        match = (p == g["expected_touches"] == g["gmail_count"])
        ok = ok and match
        report.append("AFTER  %-28s pipeline=%d (was %d) gmail=%d %s"
                      % (g["business"], p, bp, g["gmail_count"],
                         "AGREE" if match else "** STILL DISAGREES **"))
    assert ok, "post-backfill counts do not all agree"

    # ---- Reconciliation records (guarded: never duplicate) ----
    try:
        with open(RECONCILE_PATH, encoding="utf-8") as fh:
            existing = fh.read()
    except OSError:
        existing = ""
    rec_added = 0
    rec_lines = []
    paths = {"leads": se.LEADS_DEFAULT, "learnings": se.LEARNINGS_DEFAULT}
    for g in GROUND_TRUTH:
        if g["discrepancy_id"] in existing:
            continue
        hits = se.find_pipeline_rows(PIPELINE_PATH, g["business"], g["email"])
        sv = se.structured_verdict(None, hits, g["parked_action"], TODAY)
        state_hash = se.sha1(sv["state_blob"] + "|gmail=%s" % g["gmail_count"])
        suggesting, _ = se.notes_scan(g["business"], g["email"], paths)
        note_hashes = ",".join(sorted({se.sha1(se.norm(l)) for l in suggesting}))
        rec_lines.append("%s | %s | %s | %s | %s | %s\n" % (
            TODAY, g["discrepancy_id"], g["business"], state_hash, note_hashes,
            g["reconcile_text"].replace("|", "/")))
        rec_added += 1
    if rec_lines:
        with open(RECONCILE_PATH, "a", encoding="utf-8") as fh:
            fh.writelines(rec_lines)
    report.append("reconciliation lines appended: %d" % rec_added)

    report.append("pipeline sha256 after: %s" % sha256_file(PIPELINE_PATH))
    text = "\n".join(report) + "\n"
    print(text)
    with open(LOG_PATH, "a", encoding="utf-8") as fh:
        fh.write(text + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
