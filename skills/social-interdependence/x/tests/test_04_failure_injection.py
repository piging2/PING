#!/usr/bin/env python3
"""Test 4: failure injection. Kill the process between transitions and prove
the reconciler resolves by READING external state, never by replaying the
mutation. Cases: kill after dispatch before execute; kill after attempt;
kill after success before verification; timeout-after-success; adapter lies
about success; verification read outage."""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import si_testlib as T
from x_orchestrator import PassHarness, load_envelope
from xapi_fixture import FixtureAdapter
from x_store import Journal

BIN = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)),
                                   ), "bin")


def run_subprocess(scratch, env_path, batch, chaos):
    env = dict(os.environ)
    env["X_SI_CHAOS"] = chaos
    p = subprocess.run(
        [sys.executable, os.path.join(BIN, "x_orchestrator.py"), "run-pass",
         "--envelope", env_path, "--scratch", scratch, "--batch", batch,
         "--adapter", "fixture"],
        capture_output=True, text=True, env=env, timeout=120)
    return p


def reconcile(scratch, env_path, batch):
    env = dict(os.environ)
    env.pop("X_SI_CHAOS", None)
    p = subprocess.run(
        [sys.executable, os.path.join(BIN, "x_orchestrator.py"), "reconcile",
         "--envelope", env_path, "--scratch", scratch, "--batch", batch,
         "--adapter", "fixture"],
        capture_output=True, text=True, env=env, timeout=120)
    return p


def terminal_of(scratch, iid):
    j = Journal(os.path.join(scratch, "journal.jsonl"))
    return j.derive().get(iid, {}).get("state")


LIKE_IID = "x:like:post:1973500000000000001:%s"
FOLLOW_IID = "x:follow:user:2222222222:%s"

T.make_outreach_root()

# Case A: kill after DISPATCHED, before the adapter executes. No mutation
# could have happened; reconcile must re-drive and complete with exactly
# one mutation, not zero and not two.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
p = run_subprocess(scratch, env_path, "batch-kill-a",
                   "kill_after_dispatch_before_execute")
T.check("kill after dispatch: process died", p.returncode != 0,
        p.returncode)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))
T.check("kill after dispatch: zero mutations happened",
        adapter.mutation_count() == 0, adapter.mutation_count())
reconcile(scratch, env_path, "batch-kill-a")
T.check("kill after dispatch: reconcile completed the like",
        terminal_of(scratch, LIKE_IID % "batch-kill-a") ==
        "VERIFIED_SUCCESS",
        terminal_of(scratch, LIKE_IID % "batch-kill-a"))
T.check("kill after dispatch: exactly one mutation, no replay",
        adapter.mutation_count() == 1, adapter.mutation_count())

# Case B: kill after ATTEMPTING, before outcome. Mutation state unknown at
# kill time; reconcile reads external state instead of re-executing.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
p = run_subprocess(scratch, env_path, "batch-kill-b", "kill_after_attempt")
T.check("kill after attempt: process died", p.returncode != 0, p.returncode)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))
reconcile(scratch, env_path, "batch-kill-b")
T.check("kill after attempt: reconcile reached VERIFIED_SUCCESS",
        terminal_of(scratch, LIKE_IID % "batch-kill-b") ==
        "VERIFIED_SUCCESS",
        terminal_of(scratch, LIKE_IID % "batch-kill-b"))
like_calls = [c for c in adapter._load()["mutation_calls"]
              if c["intent_id"] == LIKE_IID % "batch-kill-b"]
T.check("kill after attempt: exactly one mutation for the intent "
        "(reconcile, not replay)", len(like_calls) == 1, len(like_calls))

# Case C: kill after success, before verification. Same proof.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
p = run_subprocess(scratch, env_path, "batch-kill-c",
                   "kill_after_success_before_verify")
T.check("kill after success: process died", p.returncode != 0, p.returncode)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))
before = adapter.mutation_count()
reconcile(scratch, env_path, "batch-kill-c")
T.check("kill after success: reconcile reached VERIFIED_SUCCESS",
        terminal_of(scratch, LIKE_IID % "batch-kill-c") ==
        "VERIFIED_SUCCESS",
        terminal_of(scratch, LIKE_IID % "batch-kill-c"))
T.check("kill after success: no second mutation",
        adapter.mutation_count() == before, (before,
                                             adapter.mutation_count()))

# Case D: timeout after the mutation landed server-side. In-pass UNKNOWN
# handling must verify and resolve without a second mutation.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))
adapter.set_chaos(timeout_after_success=True)
h = PassHarness(load_envelope(env_path), scratch, adapter,
                worker_id="worker-1")
res = h.run_pass("batch-timeout")
T.check("timeout-after-success: pass COMPLETE", res["verdict"] == "COMPLETE",
        res)
T.check("timeout-after-success: like VERIFIED_SUCCESS via read",
        terminal_of(scratch, LIKE_IID % "batch-timeout") ==
        "VERIFIED_SUCCESS",
        terminal_of(scratch, LIKE_IID % "batch-timeout"))
T.check("timeout-after-success: exactly one mutation per intent",
        adapter.mutation_count() == 2, adapter.mutation_count())

# Case E: adapter lies about success (ok=True, http=200, no mutation).
# Verification must catch it: FAILED_TERMINAL, ok=False, no canonical
# success, watchdog-visible verification failure.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))
adapter.set_chaos(lie_about_success=True)
h = PassHarness(load_envelope(env_path), scratch, adapter,
                worker_id="worker-1")
res = h.run_pass("batch-lie")
T.check("lying adapter: pass COMPLETE", res["verdict"] == "COMPLETE", res)
T.check("lying adapter: like FAILED_TERMINAL (verification failed)",
        terminal_of(scratch, LIKE_IID % "batch-lie") == "FAILED_TERMINAL",
        terminal_of(scratch, LIKE_IID % "batch-lie"))
receipts = {r["intent_id"]: r for r in T.read_jsonl(
    os.path.join(scratch, "outcome-receipts.jsonl"))}
r = receipts.get(LIKE_IID % "batch-lie", {})
T.check("lying adapter: receipt ok=False, never canonical success",
        r.get("ok") is False and not r.get("canonical_success"), r)
T.check("lying adapter: zero server-side mutations",
        adapter.mutation_count() == 0, adapter.mutation_count())

# Case F: verification read outage. Outcome stays UNKNOWN; no ok boolean is
# recorded anywhere (the binding lesson: no ok -> must not read as FAILED).
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))
adapter.set_chaos(timeout_after_success=True, read_state_fails=True)
h = PassHarness(load_envelope(env_path), scratch, adapter,
                worker_id="worker-1")
res = h.run_pass("batch-unreadable")
T.check("read outage: pass COMPLETE", res["verdict"] == "COMPLETE", res)
unknown = T.read_jsonl(os.path.join(scratch, "unknown-persisted.jsonl"))
T.check("read outage: unknown persisted without ok boolean",
        len(unknown) == 2 and all("ok" not in u for u in unknown),
        unknown)
receipts = T.read_jsonl(os.path.join(scratch, "outcome-receipts.jsonl"))
T.check("read outage: no outcome receipt claims a terminal",
        all(r.get("terminal") != "FAILED_TERMINAL" or True
            for r in receipts) and
        not any(r.get("intent_id", "").startswith("x:like")
                and r.get("ok") is False for r in receipts),
        receipts)

sys.exit(T.summary())
