#!/usr/bin/env python3
"""test-distill-pipeline-audit.py: build_queue must surface sibling-lane
audit evidence via pipeline_audit_found (self-audit 2026-10-03).

Production defect: the discovery lane's discovery-2026-10-03-0721 run
audited all 12 businesses in 20261003-030416-d-segment-deep-dive.md and
recorded the audit as a pipeline.md section citing the run_id
('## Meta AI intel distill sweep (d-segment-deep-dive 20261003-030416,
verified 2026-10-03)'), but the next pass's `distill-sweep.py --select`
re-selected the file as a dead letter because the sweep only consulted
ingested.log. The operator burned 12 independent re-verification
searches to reach the identical verdict (zero additional stagings).

Invariant: every queue item carries ``pipeline_audit_found`` -- True
when the run timestamp prefix (YYYYMMDD-HHMMSS) is cited anywhere in
pipeline.md, meaning some lane already wrote audit evidence for that
run. The flag is INFORMATIONAL ONLY: it never changes eligibility (a
cited audit may be partial; absence of a citation never proves the file
unprocessed). A missing/unreadable pipeline.md fails open (empty set).

Runs against fixture dirs via env overrides; never touches production
state.
"""
import importlib.util
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TANDEM = os.path.dirname(HERE)

failures = []


def check(name, cond, detail=""):
    ok = bool(cond)
    print(("PASS " if ok else "FAIL ") + name + ((" -- " + detail) if detail and not ok else ""))
    if not ok:
        failures.append(name)


def load_mod(env):
    """Import distill-sweep.py with fixture env overrides in place."""
    saved = {k: os.environ.get(k) for k in env}
    for k, v in env.items():
        os.environ[k] = v
    try:
        spec = importlib.util.spec_from_file_location(
            "distill_sweep", os.path.join(TANDEM, "distill-sweep.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def audit_ids_for(pipeline_text):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "pipeline.md")
        with open(p, "w", encoding="utf-8") as f:
            f.write(pipeline_text)
        mod = load_mod({"PIPELINE_MD": p,
                        "TANDEM_QUARANTINE_DIR": os.path.join(d, "q")})
        return mod.pipeline_audit_run_ids()


# 1. the production miss: audit section header citing the run_id
ids = audit_ids_for(
    "## Meta AI intel distill sweep (d-segment-deep-dive 20261003-030416, "
    "verified 2026-10-03)\n- NEW | Able Excavation LLC | ...\n")
check("audit section header citing run_id is found",
      "20261003-030416" in ids, repr(ids))

# 2. heuristic is a plain substring cite: a row provenance mention counts too
ids = audit_ids_for(
    "- NEW | Troy Johnson Plumbing | ... | (source=meta-ai-intel "
    "20261002-030423-a-weak-website-hunt; phone route) | 2026-10-02 | NEW\n")
check("row-provenance cite counts (documented heuristic)",
      "20261002-030423" in ids, repr(ids))

# 3. uncited prefix is absent
ids = audit_ids_for("## some other section\nnothing relevant here\n")
check("uncited prefix is absent", ids == set(), repr(ids))

# 4. fail-open: missing pipeline file
with tempfile.TemporaryDirectory() as d:
    mod = load_mod({"PIPELINE_MD": os.path.join(d, "no-such-file.md"),
                    "TANDEM_QUARANTINE_DIR": os.path.join(d, "q")})
    check("missing pipeline.md fails open (empty set)",
          mod.pipeline_audit_run_ids() == set())


# 5. build_queue integration: eligible item carries the flag
def queue_for(pipeline_text):
    with tempfile.TemporaryDirectory() as d:
        intel = os.path.join(d, "intel")
        os.makedirs(intel)
        stem = "20261003-090416-a-weak-website-hunt"
        with open(os.path.join(intel, stem + ".md"), "w",
                  encoding="utf-8") as f:
            f.write("# answer\n1. Some Business - Town - Trade\n")
        with open(os.path.join(intel, stem + ".provenance.json"), "w",
                  encoding="utf-8") as f:
            json.dump({"status": "answer_captured"}, f)
        p = os.path.join(d, "pipeline.md")
        with open(p, "w", encoding="utf-8") as f:
            f.write(pipeline_text)
        mod = load_mod({"META_INTEL_DIR": intel,
                        "PIPELINE_MD": p,
                        "DISTILL_NOW": "2026-10-03T10:00:00Z",
                        "TANDEM_QUARANTINE_DIR": os.path.join(d, "q")})
        return mod.build_queue(intel_dir=intel)


q = queue_for("## Meta AI intel distill sweep (a-weak-website-hunt "
              "20261003-090416, verified 2026-10-03)\n")
item = [i for i in q if i["file"] == "20261003-090416-a-weak-website-hunt.md"]
check("one queue item for the fixture file", len(item) == 1, repr(len(item)))
item = item[0]
check("cited run -> pipeline_audit_found True",
      item["pipeline_audit_found"] is True, repr(item))
check("flag does not change eligibility (still eligible)",
      item["eligible"] is True and item["reason"] == "eligible",
      repr(item))

q = queue_for("## unrelated section\nno run cites here\n")
item = [i for i in q if i["file"] == "20261003-090416-a-weak-website-hunt.md"][0]
check("uncited run -> pipeline_audit_found False",
      item["pipeline_audit_found"] is False, repr(item))
check("uncited run is still eligible",
      item["eligible"] is True, repr(item))

print()
if failures:
    print("FAILURES:", failures)
    sys.exit(1)
print("all distill-pipeline-audit cases pass")
