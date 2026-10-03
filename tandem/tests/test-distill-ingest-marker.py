#!/usr/bin/env python3
"""test-distill-ingest-marker.py: engine_ingested_prefixes must recognize the
distill-closed record format (self-audit 2026-10-02).

Production defect: the 2026-10-02 15:10 pass fully distilled
20261002-210450-a-weak-website-hunt.md (18 searches, 3 staged, tally
written, mark-verified.sh then mark-distill-closed.sh run), but the next
pass's `distill-sweep.py --select` re-selected it as a dead letter.
Root cause: the completed-distill record contains neither the legacy
'ingest' word nor the round-124 'audited'+'verdicts' marker pair, so
engine_ingested_prefixes() missed it.

Invariant: an ingested.log line counts as a completed-ingest record when it
contains a YYYYMMDD-HHMMSS run prefix AND, case-insensitive, any of:
  (a) the word 'ingest' (legacy), or
  (b) BOTH 'audited' AND 'verdicts' (round-124 audit format), or
  (c) the distill-closed marker 'mark-distill-closed' (current writer
      format: "mark-verified.sh then mark-distill-closed.sh run").

Lines that merely mention a run without any of these (e.g. CAPTURE_FAILED
'recorded, NOT extracted', or 'verdicts' without 'audited') must NOT count:
the sweep must never close a dead letter that was never extracted.
A missing/unreadable log fails open (empty set).

Runs against fixture dirs via the intel_dir parameter; never touches
production state.
"""
import importlib.util
import os
import sys
import tempfile

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
    print(("PASS " if ok else "FAIL ") + name + ((" -- " + detail) if detail and not ok else ""))
    if not ok:
        failures.append(name)


def prefixes_for(lines):
    mod = load_mod()
    with tempfile.TemporaryDirectory() as d:
        with open(os.path.join(d, "ingested.log"), "w", encoding="utf-8") as f:
            f.writelines(l + "\n" for l in lines)
        return mod.engine_ingested_prefixes(d)


# (a) legacy format
p = prefixes_for([
    "- 20261001-030423-a-weak-website-hunt.md - ingested after independent verification gate; 4 staged to pipeline.md"])
check("legacy 'ingest' line counts", "20261001-030423" in p, repr(p))

# (b) round-124 audit format
p = prefixes_for([
    "- 20260924-030441-a-weak-website-hunt.md - 22 businesses audited; verdicts: VERIFIED-NEW 2, COLLISION 20"])
check("round-124 'audited'+'verdicts' line counts", "20260924-030441" in p, repr(p))

# (c) current distill-closed writer format (the production miss)
p = prefixes_for([
    "- 20261002-210450-a-weak-website-hunt.md - ANSWER CAPTURED (14 numbered items + 2 supplemental, 16,128 bytes). "
    "Tally: 10 COLLISIONS already tracked; 3 VERIFIED-NEW staged to pipeline.md. "
    "mark-verified.sh then mark-distill-closed.sh run; no canonical JSONL merge (300-active cap full)."])
check("distill-closed 'mark-distill-closed' line counts", "20261002-210450" in p, repr(p))

# (c) case-insensitive
p = prefixes_for([
    "- 20261002-210655-b-new-business-radar.md - MARK-VERIFIED.SH then MARK-DISTILL-CLOSED.SH run"])
check("distill-closed marker is case-insensitive", "20261002-210655" in p, repr(p))

# fail-closed: CAPTURE_FAILED recorded but never extracted
p = prefixes_for([
    "- 20261001-150443-b-new-business-radar.md - CAPTURE_FAILED recorded, NOT extracted; evidence kept as .md.CAPTURE_FAILED"])
check("CAPTURE_FAILED-not-extracted does NOT count", "20261001-150443" not in p, repr(p))

# fail-closed: 'verdicts' without 'audited' never closes a dead letter
p = prefixes_for([
    "- 20261002-030711-d-segment-deep-dive.md - verdicts pending review, holding for human"])
check("'verdicts' without 'audited' does NOT count", "20261002-030711" not in p, repr(p))

# fail-closed: a bare mention with no completion signal
p = prefixes_for([
    "- 20261002-210450-a-weak-website-hunt.md - run started"])
check("bare mention does NOT count", "20261002-210450" not in p, repr(p))

# fail-open: missing log
mod = load_mod()
with tempfile.TemporaryDirectory() as d:
    check("missing log fails open (empty set)", mod.engine_ingested_prefixes(d) == set())

# multi-line: one matching line suffices, others ignored
p = prefixes_for([
    "- 20261002-210450-a-weak-website-hunt.md - run started",
    "- 20261002-210450-a-weak-website-hunt.md - mark-distill-closed.sh run"])
check("later distill-closed line retro-covers the run", "20261002-210450" in p, repr(p))

print()
if failures:
    print("FAILURES:", failures)
    sys.exit(1)
print("all distill-ingest-marker cases pass")
