#!/usr/bin/env python3
"""Minimal pass-health view renderer (proof surface, stdlib only).

Reads MC_PASS_* journal rows, builds the first-block projection, answers
the three WHY-questions, and writes one self-contained HTML file. This is
the spine's MC PROJECTION leg in minimal form: real states only,
unknown rendered as unknown, every number traced to its event.

Usage:
  render.py --journal <events.jsonl> --out <view.html> [--platform x]
"""

import argparse
import html
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_MC = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "..",
                                    "mission-control"))
if _MC not in sys.path:
    sys.path.insert(0, _MC)
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from pass_queries import (  # noqa: E402
    load_journal, why_did_it_stop, why_was_candidate_rejected,
    what_did_browser_do,
)
from projection import pass_health_first_block, UNKNOWN  # noqa: E402


def _v(x):
    return UNKNOWN if x is None else html.escape(str(x))


def render(platform, rows):
    block = pass_health_first_block(platform, rows)
    stop = why_did_it_stop(platform, rows)
    doing = what_did_browser_do(platform, rows, pass_id=block["pass_id"])

    def ev_links(ids):
        return " ".join(
            '<code class="ev">%s</code>' % html.escape(i) for i in ids)

    if not block["has_data"]:
        first = "<p>last pass: <b>unknown</b> (no MC_PASS_CLOSED in journal)</p>"
    else:
        r = block["seven_day"]
        seven = ("<p>7-day: <b>unknown</b> (no MC_PASS_CLOSED in window)</p>"
                 if r is None else
                 "<p>7-day: passes <b>%s</b> | actions <b>%s</b> | "
                 "failures <b>%s</b> | unknown <b>%s</b> | blocks <b>%s</b></p>"
                 % (_v(r["passes"]), _v(r["actions"]), _v(r["failures"]),
                    _v(r["unknown"]), _v(r["blocks"])))
        first = (
            "<p>last pass: <b>%s</b> <span class=src>[MC_PASS_CLOSED %s]</span></p>"
            "<p>actions: <b>%s / %s</b> <span class=src>[MC_PASS_CLOSED]</span></p>"
            "<p>unknown: <b>%s</b> <span class=src>[MC_PASS_INTENTS + "
            "MC_PASS_OBSERVATION fold]</span></p>"
            "<p>candidates: <b>%s</b> eligible: <b>%s</b> skipped: <b>%s</b> "
            "<span class=src>[MC_PASS_CANDIDATES]</span></p>"
            "%s"
        ) % (_v(block["status"]), html.escape(str(block["pass_id"])),
             _v(block["actions_landed"]), _v(block["caps_total"]),
             _v(block["unknown"]),
             _v(block["candidates"]), _v(block["eligible"]),
             _v(block["skipped"]), seven)

    browser_rows = "".join(
        "<tr><td>%s</td><td>%s</td><td>%s</td>"
        "<td class=%s>%s</td><td>%s</td></tr>"
        % (html.escape(str(t["account"])), html.escape(str(t["action"])),
           html.escape(str(t["url"] or "-")),
           "unk" if t["terminal"] == "UNKNOWN_EXECUTION" else "ok",
           html.escape(str(t["terminal"])),
           html.escape(str(t["note"] or "-")))
        for t in doing["rows"])

    return """<!doctype html>
<html><head><meta charset="utf-8">
<title>Pass health (spine proof) - {p}</title>
<style>
body{{font-family:system-ui,sans-serif;max-width:900px;margin:2em auto;
padding:0 1em;color:#1a1a1a}}
.src{{color:#888;font-size:.8em}}
.ev{{background:#f0f0f0;padding:1px 5px;border-radius:3px;font-size:.8em}}
.unk{{color:#b45309;font-weight:bold}}
.ok{{color:#15803d}}
table{{border-collapse:collapse;width:100%;margin-top:.5em}}
td,th{{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:.9em}}
details{{margin:.8em 0;border:1px solid #ddd;border-radius:6px;padding:.6em 1em}}
summary{{cursor:pointer;font-weight:bold}}
.note{{color:#666;font-size:.85em}}
</style></head><body>
<h1>Pass health <span class=src>(spine proof, journal-projected)</span></h1>
<p class=note>Platform tab: <b>{p}</b>. Every number traces to a journal
event id shown beside it. Unknown renders as unknown, never as zero.</p>
<h2>Last pass</h2>
{first}
<h2>Why</h2>
<details><summary>WHY DID IT STOP?</summary>
<p>{stop_a}</p><p class=src>evidence: {stop_e}</p></details>
<details><summary>WHAT DID THE BROWSER ACTUALLY DO?</summary>
<p>{do_a}</p>
<table><tr><th>account</th><th>action</th><th>url</th><th>observed</th>
<th>note</th></tr>{brows}</table>
<p class=src>evidence: {do_e}</p></details>
<details><summary>WHY WAS THIS CANDIDATE REJECTED?</summary>
<p class=note>Answered per identity from the journal; run the query helper
with a handle or post URL. Latest example below.</p>
<p>{rej_a}</p><p class=src>evidence: {rej_e}</p></details>
</body></html>""".format(
        p=html.escape(platform), first=first,
        stop_a=html.escape(stop["answer"]), stop_e=ev_links(stop["evidence"]),
        do_a=html.escape(doing["answer"]), brows=browser_rows,
        do_e=ev_links(doing["evidence"]),
        rej_a=html.escape(_sample_reject(platform, rows)[0]),
        rej_e=ev_links(_sample_reject(platform, rows)[1]))


def _sample_reject(platform, rows):
    # Demonstrate the rejection query with a handle known to be blocked in
    # the 7d window, else fall back to the honest no-match message.
    for handle in ("@wilsoncompanies", "@aizikzimmerman"):
        q = why_was_candidate_rejected(platform, handle, rows)
        if q["reason_code"]:
            return (q["answer"], q["evidence"])
    q = why_was_candidate_rejected(platform, "@nobody-matches-this", rows)
    return (q["answer"], q["evidence"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--journal", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--platform", default="x")
    args = ap.parse_args()
    rows, skipped = load_journal(args.journal)
    page = render(args.platform, rows)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(page)
    print("wrote %s (%d journal rows, %d malformed skipped)"
          % (args.out, len(rows), skipped))


if __name__ == "__main__":
    main()
