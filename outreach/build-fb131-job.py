#!/usr/bin/env python3
"""RETIRED 2026-09-28: thin shim delegating to the canonical build-fb-job.py.

Pass-131's original 236-line builder was byte-identical to every other
pass builder except for the pass number. It is superseded by
~/workspace/outreach/build-fb-job.py (canonical, pass-parameterized, with
the evidence-trained CURATED_DROP_RE). This shim preserves the historical
invocation interface: `python3 build-fb131-job.py` == `python3 build-fb-job.py 131`.
"""
import os, runpy, sys
sys.argv = ["build-fb-job.py", "131"]
runpy.run_path(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "build-fb-job.py"),
    run_name="__main__",
)
