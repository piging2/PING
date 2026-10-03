#!/usr/bin/env python3
"""test-distill-sidecar-closure.py: the sweep must exclude answer files the
discovery engine already distill-closed, via the sidecar's distill-closure
transition (self-audit 2026-10-03).

Production defect: on the 2026-10-03 15:04 pass, `distill-sweep.py --select`
re-selected 20261003-150446-b-new-business-radar.md and
20261003-150801-d-segment-deep-dive.md as dead letters, although the
discovery engine had already verified and distill-closed both (sidecar
transitions: verified -> distill_skipped by mark-distill-closed.sh).

Root cause: engine_ingested_prefixes() keys off ingested.log and requires
the run prefix AND the 'mark-distill-closed' marker on the SAME line, but
the discovery lane's prose puts them on DIFFERENT lines of the same
record (prefix on the '- <file> - ANSWER CAPTURED' line, marker on the
'Audit: ... then mark-distill-closed.sh' line). The 2026-10-02 fix added
the marker signal but kept the single-line assumption.

Invariant: a sidecar carrying a distill-closure transition (state
'distill_skipped' or 'distilled', or a 'by' mentioning
'mark-distill-closed') is machine-readable proof the dead letter is
already closed; the sweep excludes it with an auditable reason and never
re-verifies it. Malformed/absent sidecars and plain answer_captured
sidecars keep prior behavior.

Runs against fixture dirs via the intel_dir parameter; never touches
production state.
"""
import importlib.util
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
TANDEM = os.path.dirname(HERE)


def load_mod():
    spec = importlib.util.spec_from_file_location(
        "distill_sweep", os.path.join(TANDEM, "distill-sweep.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


failures = []


def check(name, cond, detail=""):
    ok = bool(cond)
    print((("PASS " if ok else "FAIL ") + name +
           ((" -- " + detail) if detail and not ok else "")))
    if not ok:
        failures.append(name)


mod = load_mod()
closed = mod.sidecar_distill_closed

# --- unit: production-shaped closed sidecar (b-file pattern) ---
closed_sc = {
    "brief_id": "b-new-business-radar",
    "status": "answer_captured",
    "transitions": [
        {"state": "researched", "at": "2026-10-03T15:07:44Z",
         "by": "meta-pass.sh finalize"},
        {"state": "validated", "at": "2026-10-03T15:07:44Z",
         "by": "meta-pass.sh finalize"},
        {"state": "verified", "at": "2026-10-03T19:33:11Z",
         "by": "mark-verified.sh (discovery-research 2026-10-03)"},
        {"state": "distill_skipped", "at": "2026-10-03T19:33:14Z",
         "by": "mark-distill-closed.sh (discovery-research 2026-10-03)",
         "decision": "skipped: 1 new staged"},
    ],
}
check("production closed sidecar -> closed", closed(closed_sc) is True)

# --- unit: fresh answer_captured sidecar stays open ---
open_sc = {
    "brief_id": "a-weak-website-hunt",
    "status": "answer_captured",
    "transitions": [
        {"state": "researched", "at": "2026-10-03T21:06:36Z",
         "by": "meta-pass.sh finalize"},
        {"state": "validated", "at": "2026-10-03T21:06:36Z",
         "by": "meta-pass.sh finalize"},
    ],
}
check("fresh answer_captured sidecar -> not closed", closed(open_sc) is False)

# --- unit: 'distilled' state alone closes ---
check("distilled state closes",
      closed({"transitions": [{"state": "distilled"}]}) is True)

# --- unit: marker in 'by' closes even with odd state ---
check("mark-distill-closed in by closes",
      closed({"transitions": [{"state": "noted",
                               "by": "x mark-distill-closed.sh y"}]}) is True)

# --- unit: missing/malformed sidecars never close, never crash ---
check("no transitions key -> not closed", closed({"status": "x"}) is False)
check("sidecar None -> not closed", closed(None) is False)
check("transitions not a list -> not closed",
      closed({"transitions": "distill_skipped"}) is False)
check("transitions with non-dicts -> not closed",
      closed({"transitions": ["distill_skipped", 42, None]}) is False)
check("empty transitions -> not closed", closed({"transitions": []}) is False)

# --- integration: build_queue excludes closed, keeps open eligible ---
at = datetime(2026, 10, 3, 13, 0, 0, tzinfo=timezone.utc)
with tempfile.TemporaryDirectory() as d:
    stems = {
        "20261003-120000-a-weak-website-hunt": open_sc,
        "20261003-121500-b-new-business-radar": closed_sc,
    }
    for stem, sc in stems.items():
        with open(os.path.join(d, stem + ".md"), "w",
                  encoding="utf-8") as f:
            f.write("# answer\n\n1. Some Business - Town - Trade\n" * 40)
        with open(os.path.join(d, stem + ".provenance.json"), "w",
                  encoding="utf-8") as f:
            json.dump(sc, f)
    queue = mod.build_queue(intel_dir=d, at=at)
    by_file = {i["file"]: i for i in queue}
    open_item = by_file["20261003-120000-a-weak-website-hunt.md"]
    closed_item = by_file["20261003-121500-b-new-business-radar.md"]
    check("integration: closed file excluded",
          closed_item["eligible"] is False, repr(closed_item))
    check("integration: closed reason names distill-closure",
          "distill-closed" in (closed_item["reason"] or ""),
          repr(closed_item["reason"]))
    check("integration: open file stays eligible",
          open_item["eligible"] is True and open_item["reason"] == "eligible",
          repr(open_item))

if failures:
    print(f"\n{len(failures)} FAILURES: {failures}", file=sys.stderr)
    sys.exit(1)
print("\nall green")
