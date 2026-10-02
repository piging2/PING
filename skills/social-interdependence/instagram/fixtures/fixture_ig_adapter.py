#!/usr/bin/env python3
"""fixture_ig_adapter.py: the ADAPTER-BOUNDARY FAKE for Instagram.

Used by the vertical slice and all tests. It is the ONLY fake allowed; the
eligibility function, authority gate, state machine, budgets, leases,
breakers, watchdog, and verifier are all real.

The fixture keeps an internal "platform truth" (what Instagram would show)
separate from its observations (what it reports). Script modes:

  success               execute applies the mutation, returns ok
  timeout-after-success execute applies the mutation, returns timeout
  lie                   execute returns ok but does NOT apply the mutation
  fail                  execute returns failed, no mutation
  noop                  execute returns ok with noop=True (already applied)
  auth-expired          get_identity raises AdapterAuthExpired
  outage                every call raises AdapterOutage
  checkpoint            execute raises AdapterPlatformSignal("checkpoint")
  limited               execute applies the mutation but read_state reports
                        a platform negative-feedback signal
                        ("action_limited"); the verifier records the effect
                        but the watchdog trips the platform breaker

Every execute() call appends to the fixture's execution log so tests can
prove exactly-once external effect (no duplicate canonical mutations).
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "bin"))

from siig_adapter_contract import (IgAdapter, AdapterAuthExpired,
                                   AdapterTimeout, AdapterPlatformSignal,
                                   AdapterOutage, AdapterError)
from siig_common import norm_handle


class FixtureIgAdapter(IgAdapter):
    def __init__(self, script=None, discovery=None, truth=None,
                 identity="nolanpigi"):
        self.script = script or {}
        self.mode = self.script.get("mode", "success")
        self.discovery = discovery or []
        self.truth = truth if truth is not None else {}
        self.identity = identity
        self.executions = []
        self.reads = []

    # -- identity -----------------------------------------------------
    def get_identity(self):
        if self.mode == "auth-expired":
            raise AdapterAuthExpired("fixture: credential expired")
        if self.mode == "outage":
            raise AdapterOutage("fixture: platform unreachable")
        return {"account": self.identity}

    # -- read paths ---------------------------------------------------
    def discover(self, params):
        if self.mode == "outage":
            raise AdapterOutage("fixture: platform unreachable")
        n = (params or {}).get("batch_size", len(self.discovery))
        return [dict(c) for c in self.discovery[:n]]

    def read_profile(self, handle):
        if self.mode == "outage":
            raise AdapterOutage("fixture: platform unreachable")
        for c in self.discovery:
            if norm_handle(c.get("handle")) == norm_handle(handle):
                return {"handle": norm_handle(handle),
                        "country": c.get("country"),
                        "city": c.get("city"),
                        "display_name": c.get("header_name")}
        return {"handle": norm_handle(handle), "country": None,
                "city": None, "display_name": None}

    # -- mutation + verification read ---------------------------------
    def _key(self, action, handle, post_url):
        return "%s|%s|%s" % (action, norm_handle(handle), post_url or "")

    def execute(self, action, handle, post_url, content=None):
        if self.mode == "outage":
            raise AdapterOutage("fixture: platform unreachable")
        if self.mode == "auth-expired":
            raise AdapterAuthExpired("fixture: credential expired")
        key = self._key(action, handle, post_url)
        attempt = {"action": action, "handle": norm_handle(handle),
                   "post_url": post_url, "content": content,
                   "mode": self.mode}
        if self.mode == "checkpoint":
            # the request went out and the platform answered with a
            # checkpoint: record the attempt, then raise the signal
            self.executions.append(attempt)
            raise AdapterPlatformSignal("checkpoint",
                                        "fixture: login checkpoint shown")
        self.executions.append(attempt)
        truth = self.truth.setdefault(key, {"liked": False,
                                            "commented": False})
        if self.mode == "timeout-after-success":
            if action == "like":
                truth["liked"] = True
            else:
                truth["commented"] = True
            raise AdapterTimeout("fixture: request timed out after the "
                                 "mutation was applied")
        if self.mode == "lie":
            return {"outcome": "ok", "platform_signals": [],
                    "detail": "fixture lie: claims ok, mutation not applied"}
        if self.mode == "fail":
            return {"outcome": "failed", "platform_signals": [],
                    "detail": "fixture: action rejected by platform"}
        if self.mode == "noop":
            if action == "like":
                truth["liked"] = True
            else:
                truth["commented"] = True
            return {"outcome": "noop", "platform_signals": [],
                    "detail": "fixture: already applied, no-op"}
        if action == "like":
            truth["liked"] = True
        else:
            truth["commented"] = True
        return {"outcome": "ok", "platform_signals": [],
                "detail": "fixture: mutation applied"}

    def read_state(self, handle, post_url):
        if self.mode == "outage":
            raise AdapterOutage("fixture: platform unreachable")
        self.reads.append({"handle": norm_handle(handle),
                           "post_url": post_url})
        like_key = self._key("like", handle, post_url)
        comment_key = self._key("comment", handle, post_url)
        liked = self.truth.get(like_key, {}).get("liked", False)
        commented = self.truth.get(comment_key, {}).get("commented", False)
        signals = []
        if self.mode == "limited":
            signals = ["action_limited"]
        return {"liked": liked, "commented": commented,
                "platform_signals": signals}

    def execution_count(self, action=None, handle=None):
        n = 0
        for e in self.executions:
            if action and e["action"] != action:
                continue
            if handle and e["handle"] != norm_handle(handle):
                continue
            n += 1
        return n


def adapter_from_script_file(path, discovery, truth=None):
    with open(path, "r", encoding="utf-8") as f:
        script = json.load(f)
    return FixtureIgAdapter(script=script, discovery=discovery, truth=truth)
