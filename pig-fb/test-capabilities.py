#!/usr/bin/env python3
"""Contract tests: pig-capabilities.json is a discovery projection, not authority.

Checks the manifest against the implementations it indexes. Fix the manifest
when a test fails, never the reverse. Local-only, no Pig, runs in seconds.
Exit 0 all pass, exit 1 any failure.
"""
import json, os, re, sys

HOME = os.path.expanduser("~")
WS = os.path.join(HOME, "workspace")
PIGFB = os.path.join(WS, "pig-fb")
TANDEM = os.path.join(WS, "tandem")
MANIFEST = os.path.join(PIGFB, "pig-capabilities.json")

fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f" ({detail})" if detail and not cond else ""))
    if not cond:
        fails.append(name)

try:
    m = json.load(open(MANIFEST, encoding="utf-8"))
except Exception as e:
    print("FAIL manifest parses as JSON", e)
    sys.exit(1)

check("manifest parses", True)
check("contract_status is discovery-projection",
      m.get("contract_status") == "discovery-projection", f"got {m.get('contract_status')!r}")
check("8 capabilities present", len(m.get("capabilities", {})) == 8,
      f"got {len(m.get('capabilities', {}))}")

# Every capability names an implementation that exists on disk.
for name, cap in m["capabilities"].items():
    impl = cap.get("implemented_by", "")
    tokens = re.findall(r"(?:pig-fb|tandem)/[\w.\-]+", impl)
    found = any(os.path.exists(os.path.join(WS, t)) for t in tokens)
    check(f"capability {name}: implementation exists", bool(tokens) and found,
          f"implemented_by={impl!r}")

# validation.run numbers must match the validator's own constants.
vsrc = open(os.path.join(TANDEM, "validate-meta-answer.py"), encoding="utf-8").read()
vitems = re.search(r"MIN_NUMBERED_ITEMS\s*=\s*(\d+)", vsrc).group(1)
vchars = re.search(r"MIN_ANSWER_CHARS\s*=\s*(\d+)", vsrc).group(1)
vdesc = json.dumps(m["capabilities"]["validation.run"])
check("validation.run: manifest matches validator constants",
      vitems in vdesc and vchars in vdesc,
      f"validator says {vitems}/{vchars}")

# job.record must not invent a 'signal' outcome; signals are outcome unknown.
jdesc = json.dumps(m["capabilities"]["job.record"])
check("job.record: no phantom 'signal' outcome",
      "capture_failed/infra/signal" not in jdesc)
check("job.record: documents terminated_by_signal_*",
      "terminated_by_signal" in jdesc)
check("job.record: not marked idempotent",
      m["capabilities"]["job.record"].get("idempotent") is not True)

# research.ask stays typed and honest about the capture.
rask = m["capabilities"]["research.ask"]
check("research.ask: output_class unverified-external-research",
      rask.get("output_class") == "unverified-external-research")
check("research.ask: documents new input-failure modes",
      "not-focused" in json.dumps(rask) and "not-delivered" in json.dumps(rask))

# The prompt contract must be codified in meta-pass.sh (named sections),
# not tribal knowledge.
msrc = open(os.path.join(PIGFB, "meta-pass.sh"), encoding="utf-8").read()
for const in ("SEC_OBJECTIVE", "SEC_CONTEXT", "SEC_CONTRACT"):
    check(f"meta-pass.sh codifies {const}", const in msrc)
check("meta-pass.sh single-sources validator constants",
      "MIN_NUMBERED_ITEMS" in msrc and "MIN_ANSWER_CHARS" in msrc)

# Ladder rung 1 must be present in the worker.
jsrc = open(os.path.join(PIGFB, "meta-ask.js"), encoding="utf-8").read()
check("meta-ask.js: ordered locator chain", "LOCATORS" in jsrc)
check("meta-ask.js: prints winning locator id", "console.log('LOCATOR '" in jsrc)
check("meta-ask.js: activeElement closed loop", "activeElement" in jsrc)
# 2026-09-14: meta-ask.js moved from per-keystroke typing to atomic clipboard
# paste with a closed-loop DELIVERED/NOT-DELIVERED assertion; the TYPE-STALL
# marker no longer exists. Check the current markers instead.
check("meta-ask.js: per-chunk delivery verification",
      "per-chunk delivery verification" in jsrc)
check("meta-ask.js: delivery assertion markers",
      "DELIVERED chars=" in jsrc and "NOT-DELIVERED" in jsrc)
check("meta-ask.js: measures input text, not activeElement", "inputText" in jsrc)

# runs.jsonl is shared execution truth (meta-pass.sh writer,
# emit-observation.py reader). Outreach-engine sweep lines (GAP 4, 2026-09-13)
# must be inert to every existing consumer: the rotation jq selects
# outcome=="ok" AND brief_id in the four cycle slugs; emit-observation.py
# resolves by brief_id match AND outcome=="ok". Engine sweep lines carry
# origin:"outreach-engine" and NEVER set brief_id; only LEARN lines set
# brief_id, always with the learn- prefix (not a cycle slug).
import importlib.util, tempfile
_spec = importlib.util.spec_from_file_location(
    "emitobs", os.path.join(TANDEM, "emit-observation.py"))
emitobs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(emitobs)
CYCLE = {"a-weak-website-hunt", "b-new-business-radar",
         "c-review-complaint-signals", "d-segment-deep-dive"}
LEDGER = os.path.join(HOME,
    "workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl")

def rotation_selects(rec):
    """Python mirror of the rotation jq predicate in the
    meta-ai-intel-pass cron doc."""
    return rec.get("outcome") == "ok" and rec.get("brief_id") in CYCLE

fake_sweep = {"origin": "outreach-engine", "run_id": "test-sweep",
              "outcome": "ok", "counts": {"signal": 1}}
fake_learn = {"origin": "outreach-engine", "run_id": "test-learn",
              "brief_id": "learn-test-sweep", "outcome": "ok",
              "artifact_refs": {"sidecar": "learn-test-sweep.provenance.json"}}
check("engine sweep line: no brief_id", "brief_id" not in fake_sweep)
check("engine sweep line: inert to rotation jq", not rotation_selects(fake_sweep))
check("engine learn line: brief_id not a cycle slug",
      fake_learn["brief_id"] not in CYCLE)
check("engine learn line: inert to rotation jq", not rotation_selects(fake_learn))

with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as tf:
    for rec in (fake_sweep, fake_learn):
        tf.write(json.dumps(rec) + "\n")
    tmp_ledger = tf.name
for slug in CYCLE:
    r = emitobs._newest_ok_run(slug, ledger_path=tmp_ledger)
    check(f"_newest_ok_run({slug}) never resolves an engine line",
          r is None or r.get("origin") != "outreach-engine")
r = emitobs._newest_ok_run("learn-test-sweep", ledger_path=tmp_ledger)
check("_newest_ok_run(learn-*) resolves the learn line for the gate",
      r is not None and r.get("brief_id") == "learn-test-sweep")
os.unlink(tmp_ledger)

# The real ledger: every engine line present must honor the contract.
try:
    real = [json.loads(l) for l in open(LEDGER, encoding="utf-8") if l.strip()]
except OSError:
    real = []
n_engine = 0
for rec in real:
    if rec.get("origin") != "outreach-engine":
        continue
    n_engine += 1
    bid = rec.get("brief_id")
    check("real engine line: brief_id absent or learn-prefixed",
          bid is None or (isinstance(bid, str) and bid.startswith("learn-")),
          rec.get("run_id"))
    check("real engine line: inert to rotation jq",
          not rotation_selects(rec), rec.get("run_id"))
print(f"(real ledger: {len(real)} lines, {n_engine} engine lines)")

print()
if fails:
    print(f"{len(fails)} FAILURES")
    sys.exit(1)
print("all contract tests pass")
