#!/usr/bin/env python3
"""Shared harness for the Threads social-interdependence tests.

Every test runs against a SCRATCH state dir and a SCRATCH fixture
external-state file. The production guard (engagement-guard.py), the
production eligibility data files, and the production durable logs are
read but NEVER written: the harness never calls the guard's record
path, and SI_THREADS_EXECUTOR stays "fixture".
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(SKILL_DIR, "bin")


class ScratchEnv:
    def __init__(self):
        self.root = tempfile.mkdtemp(prefix="th-si-test-")
        self.state_dir = os.path.join(self.root, "state")
        self.workdir = os.path.join(self.root, "work")
        os.makedirs(self.state_dir)
        os.makedirs(self.workdir)
        self.fake_state = os.path.join(self.root, "fake-external-state.json")
        with open(self.fake_state, "w") as f:
            json.dump({"likes": {}, "comments": {},
                       "mutation_count": 0}, f)
        self.env = dict(os.environ)
        self.env["SI_THREADS_STATE_DIR"] = self.state_dir
        self.env["FAKE_THREADS_STATE"] = self.fake_state
        self.env["SI_THREADS_EXECUTOR"] = "fixture"
        self.env.pop("TH_SI_CRASH_AFTER", None)

    def set(self, **kw):
        self.env.update({k: str(v) for k, v in kw.items()})

    def unset(self, *keys):
        for k in keys:
            self.env.pop(k, None)

    def run_cycle(self, batch_id, candidates, crash_after="",
                  extra_env=None):
        cand_path = os.path.join(self.root, "cands-%s.json" % batch_id)
        with open(cand_path, "w") as f:
            json.dump(candidates, f)
        env = dict(self.env)
        if extra_env:
            env.update(extra_env)
        if crash_after:
            env["TH_SI_CRASH_AFTER"] = crash_after
        proc = subprocess.run(
            [sys.executable, os.path.join(BIN_DIR, "th-si-cycle.py"),
             "--batch-id", batch_id, "--candidates", cand_path,
             "--workdir", self.workdir],
            capture_output=True, text=True, env=env, timeout=300)
        try:
            report = json.loads(proc.stdout[proc.stdout.find("{"):])
        except (ValueError, IndexError):
            report = {"_raw_stdout": proc.stdout, "_stderr": proc.stderr}
        return proc.returncode, report

    def run_reconcile(self):
        proc = subprocess.run(
            [sys.executable, os.path.join(BIN_DIR, "th-si-reconcile.py"),
             "--json"],
            capture_output=True, text=True, env=self.env, timeout=120)
        try:
            report = json.loads(proc.stdout[proc.stdout.find("{"):])
        except (ValueError, IndexError):
            report = {"_raw_stdout": proc.stdout, "_stderr": proc.stderr}
        return proc.returncode, report

    def mutation_count(self):
        with open(self.fake_state) as f:
            return json.load(f).get("mutation_count", 0)

    def jsonl(self, name):
        path = os.path.join(self.state_dir, name)
        if not os.path.isfile(path):
            return []
        return [json.loads(l) for l in open(path)
                if l.strip()]

    def intents(self):
        return {r["intent_id"]: r for r in self.jsonl("intents.jsonl")}

    def cleanup(self):
        shutil.rmtree(self.root, ignore_errors=True)


FRESH = [
    {"url": "https://www.threads.com/@fixturebuilder/post/CANDL1K3AAA/",
     "type": "like",
     "text": "Shipping a deterministic replay story for small teams."},
    {"url": "https://www.threads.com/@fixturemaker/post/CANDL1K3BBB/",
     "type": "like",
     "text": "Hot take: your CRM is a database wearing a trench coat."},
]
