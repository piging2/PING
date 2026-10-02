#!/usr/bin/env python3
"""Light-mode wrapper: runs threads-discovery-sweep.py at half breadth (every
other query of the standing 26-query set) without touching the original file.
Usage: threads-discovery-sweep-light-wrap.py <timestamp> <outdir>"""
import importlib.util, sys

ts, outdir = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location(
    "sweep", "/home/hatch/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/threads-discovery-sweep.py")
sweep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sweep)
sweep.QUERIES = sweep.QUERIES[::2]
sys.argv = ["threads-discovery-sweep.py", ts, outdir]
sweep.main()
