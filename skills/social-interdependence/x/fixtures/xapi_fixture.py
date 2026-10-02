#!/usr/bin/env python3
"""Adapter-boundary fixture for the X autonomy loop.

This is the ONLY fake in the system. It sits exactly at the adapter
boundary and implements the x_adapter.XAdapter contract, shaped like the
bin/xapi.py call contract: cli(argv) returns the same JSON stdout shapes
xapi.py prints ({"ok", "http", "response"}), execute() returns the adapter
result contract, read_state() returns externally observed state.

The simulated platform server state is FILE-BACKED (fixture-server.json) so
it survives process kills: kill-between-transitions tests prove the
reconciler reads real (simulated-external) state instead of replaying the
mutation.

Chaos flags (set via set_chaos):
  timeout_before_execute   adapter raises TimeoutError before any mutation
  timeout_after_success    mutation lands server-side, then TimeoutError
  lie_about_success        returns ok=True http=200 WITHOUT mutating
  http_429                 returns http=429 (rate limit)
  http_401 / http_403      auth-shaped rejection
  read_state_fails        read_state raises (verification impossible)
  slow_read               read_state lags one call behind (propagation race)

Call counts are recorded server-side: mutation_calls counts how many times
the simulated platform actually applied the mutation.
"""
import fcntl
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "bin"))
from x_adapter import XAdapter  # noqa: E402


def _locked(path, mode):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    import contextlib

    @contextlib.contextmanager
    def _cm():
        with open(path, mode) as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                yield f
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)
    return _cm()


# The two fixture candidates. Both were probed against the REAL
# engagement-guard.py eligibility_check on 2026-10-01 and return ELIGIBLE:
# platform x, action like/follow (action-capability.json grants both),
# handles absent from x-engagement.md history, no blocked businesses, no
# out-of-corridor city signals, no class-rule signals.
CANDIDATES = [
    {"handle": "gjroastworks",
     "user_id": "1111111111",
     "url": "https://x.com/gjroastworks/status/1973500000000000001",
     "text": "Fresh roast drop: Ethiopian single origin on the bar all week "
             "in downtown Grand Junction.",
     "action": "like"},
    {"handle": "palisadepeachco",
     "user_id": "2222222222",
     "url": "",
     "text": "",
     "action": "follow"},
]

ME_ID = "9999999999"
ME_HANDLE = "pingsocial"


class FixtureAdapter(XAdapter):
    name = "fixture-xapi"

    def __init__(self, server_path):
        self.server_path = server_path
        self._ensure()

    def _ensure(self):
        if not os.path.isfile(self.server_path):
            self._save({"liked": {}, "following": {}, "commented": {},
                        "mutation_calls": [], "chaos": {},
                        "read_lag": []})

    def _load(self):
        with open(self.server_path, encoding="utf-8") as f:
            return json.load(f)

    def _save(self, data):
        with _locked(self.server_path, "w") as f:
            f.write(json.dumps(data, indent=1, sort_keys=True))

    def _mutate(self, fn):
        with _locked(self.server_path, "a+") as f:
            f.seek(0)
            raw = f.read().strip()
            data = json.loads(raw) if raw else {}
            fn(data)
            f.seek(0)
            f.truncate()
            f.write(json.dumps(data, indent=1, sort_keys=True))
            f.flush()

    def set_chaos(self, **flags):
        def _fn(d):
            d["chaos"] = flags
        self._mutate(_fn)

    def clear_chaos(self):
        self.set_chaos()

    def mutation_count(self):
        return len(self._load().get("mutation_calls", []))

    # -- xapi.py CLI shapes ------------------------------------------------
    def cli(self, argv):
        cmd = argv[0] if argv else ""
        if cmd == "me":
            return json.dumps({"http": 200,
                               "body": {"data": {"id": ME_ID,
                                                 "username": ME_HANDLE}}})
        if cmd == "follow":
            target = argv[1]
            self._apply_follow(target)
            return json.dumps({"ok": True, "http": 200,
                               "response": {"data": {"following": True,
                                                     "pending_follow":
                                                     False}}})
        if cmd == "lookup":
            return json.dumps({"ok": True, "http": 200,
                               "response": {"data": {"id": "1111111111",
                                                     "username": argv[1]}}})
        return json.dumps({"ok": False, "http": 400,
                           "error": "unknown command " + cmd})

    # -- adapter contract ---------------------------------------------------
    def discover(self, query):
        return [dict(c) for c in CANDIDATES]

    def _apply_like(self, tweet_id, intent_id):
        def _fn(d):
            d["liked"][tweet_id] = True
            d["mutation_calls"].append({"intent_id": intent_id,
                                       "action": "like",
                                       "target": tweet_id})
        self._mutate(_fn)

    def _apply_follow(self, user_id, intent_id="cli"):
        def _fn(d):
            d["following"][user_id] = True
            d["mutation_calls"].append({"intent_id": intent_id,
                                       "action": "follow",
                                       "target": user_id})
        self._mutate(_fn)

    def _target(self, intent):
        action = intent["action"]
        if action == "like":
            return intent["target_ref"].split(":", 1)[1]
        return intent.get("user_id")

    def execute(self, intent):
        chaos = self._load().get("chaos", {})
        if chaos.get("http_429"):
            return {"ok": False, "http": 429, "response": None,
                    "note": "simulated 429", "timed_out": False}
        if chaos.get("http_401"):
            return {"ok": False, "http": 401, "response": None,
                    "note": "simulated 401", "timed_out": False}
        if chaos.get("http_403"):
            return {"ok": False, "http": 403, "response": None,
                    "note": "simulated 403", "timed_out": False}
        if chaos.get("timeout_before_execute"):
            raise TimeoutError("simulated timeout before mutation")
        target = self._target(intent)
        action = intent["action"]
        if chaos.get("lie_about_success"):
            return {"ok": True, "http": 200,
                    "response": {"data": {"liked": True}},
                    "note": "CHAOS: adapter claims success without mutating",
                    "timed_out": False}
        if action == "like":
            self._apply_like(target, intent["intent_id"])
        elif action == "follow":
            self._apply_follow(target, intent["intent_id"])
        elif action == "comment":
            def _fn(d):
                d["commented"][target] = True
                d["mutation_calls"].append({"intent_id": intent["intent_id"],
                                           "action": "comment",
                                           "target": target})
            self._mutate(_fn)
        if chaos.get("timeout_after_success"):
            raise TimeoutError("simulated timeout after mutation landed")
        key = {"like": "liked", "follow": "following",
               "comment": "commented"}[action]
        return {"ok": True, "http": 200,
                "response": {"data": {key: True}},
                "note": "mutation applied server-side", "timed_out": False}

    def read_state(self, intent):
        chaos = self._load().get("chaos", {})
        if chaos.get("read_state_fails"):
            raise RuntimeError("simulated verification-read outage")
        data = self._load()
        target = self._target(intent)
        action = intent["action"]
        if chaos.get("slow_read"):
            lag = data.get("read_lag", [])
            if intent["intent_id"] not in lag:
                lag.append(intent["intent_id"])
                self._mutate(lambda d: d.update(read_lag=lag))
                return ({"liked": False, "following": False,
                         "commented": False})
        if action == "like":
            return {"liked": bool(data["liked"].get(target))}
        if action == "follow":
            return {"following": bool(data["following"].get(target))}
        return {"commented": bool(data["commented"].get(target))}
