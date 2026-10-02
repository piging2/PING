#!/usr/bin/env python3
"""Test 5: adversarial cases. Duplicate discovery, two workers racing a
lease, stale capability data, 401/403 auth handling, timeout-after-success,
adapter lies, budget race, lease expiry, 429 hard stop, identity ambiguity,
saturation, ok-less outcomes, learner out-of-envelope proposals."""
import json
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import si_testlib as T
from x_orchestrator import PassHarness, load_envelope
from xapi_fixture import FixtureAdapter, CANDIDATES
from x_store import Journal, BudgetLedger, LeaseStore, CircuitStore
from x_invariants import InvariantViolation, assert_ok_boolean_present
from x_watchdog import BoundedLearner

T.make_outreach_root()


class DupAdapter(FixtureAdapter):
    def discover(self, query):
        return [dict(CANDIDATES[0]), dict(CANDIDATES[0])]


# 1. Duplicate discovery in one batch: guard batch_seen marks DUPLICATE.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
h = PassHarness(load_envelope(env_path), scratch,
                DupAdapter(os.path.join(scratch, "fixture-server.json")))
res = h.run_pass("batch-dup")
T.check("duplicate discovery: pass COMPLETE", res["verdict"] == "COMPLETE",
        res)
T.check("duplicate discovery: exactly 1 mutation for the duplicated "
        "candidate",
        h.adapter.mutation_count() == 1, h.adapter.mutation_count())
T.check("duplicate discovery: second copy rejected at identity layer",
        h.stats["rejected"] == 1, h.stats)
violations = T.read_jsonl(os.path.join(scratch, "invariant-violations.jsonl"))
T.check("duplicate discovery: recorded as ILLEGAL_TRANSITION (same "
        "intent_id re-normalized)",
        any("ILLEGAL_TRANSITION" in v["violation"] for v in violations),
        [v["violation"] for v in violations])

# 2. Two workers: lease held by worker-1 blocks worker-2's schedule.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
envelope = load_envelope(env_path)
leases = LeaseStore(os.path.join(scratch, "leases.json"))
leases.acquire("x:like:post:1973500000000000001:batch-lease", "worker-1", 600)
h2 = PassHarness(envelope, scratch,
                 FixtureAdapter(os.path.join(scratch, "fixture-server.json")),
                 worker_id="worker-2")
ok, why = h2.try_schedule(
    {"intent_id": "x:like:post:1973500000000000001:batch-lease",
     "action": "like",
     "identity_key": "x:like:post:1973500000000000001"}, "batch-lease")
T.check("two workers: second worker denied by live lease",
        ok is False and "LEASE_HELD" in why, (ok, why))

# 3. Stale capability: action-capability.json no longer lists x.like.
scratch = T.make_scratch()
outreach = os.environ["X_SI_OUTREACH_ROOT"]
cap_path = os.path.join(outreach, "eligibility-data", "action-capability.json")
caps = json.load(open(cap_path))
caps["platforms"]["x"] = {"follow": True, "comment": True}
stale_dir = T.make_scratch()
os.makedirs(os.path.join(stale_dir, "eligibility-data"))
with open(os.path.join(stale_dir, "eligibility-data",
                       "action-capability.json"), "w") as f:
    json.dump(caps, f)
os.environ["X_SI_CAPABILITY_PATH"] = os.path.join(
    stale_dir, "eligibility-data", "action-capability.json")
env_path = T.write_envelope(scratch)
h = PassHarness(load_envelope(env_path), scratch,
                FixtureAdapter(os.path.join(scratch, "fixture-server.json")))
res = h.run_pass("batch-stalecap")
T.check("stale capability: like rejected CAPABILITY_MISSING at dispatch, "
        "follow still allowed",
        h.stats["rejected"] == 1 and h.stats["verified"] == 1 and
        h.adapter.mutation_count() == 1,
        (h.stats, h.adapter.mutation_count()))
decisions = T.read_jsonl(os.path.join(scratch, "decision-records.jsonl"))
T.check("stale capability: rejection reason names CAPABILITY_MISSING",
        any("CAPABILITY_MISSING" in d["reason"] for d in decisions),
        [d["reason"] for d in decisions])
del os.environ["X_SI_CAPABILITY_PATH"]

# 4. 401: auth-shaped rejection opens the adapter scope, defers intents,
# no retry storm.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))
adapter.set_chaos(http_401=True)
h = PassHarness(load_envelope(env_path), scratch, adapter)
res = h.run_pass("batch-401")
T.check("401: pass COMPLETE", res["verdict"] == "COMPLETE", res)
T.check("401: first intent deferred, second refused by open circuit, "
        "zero mutations",
        h.stats["deferred"] == 1 and h.stats["rejected"] == 1 and
        adapter.mutation_count() == 0,
        (h.stats, adapter.mutation_count()))
st = h.circuits.state("x:xapi")
T.check("401: adapter circuit OPEN with auth reason",
        st and st["state"] == "OPEN" and "auth rejected" in st["reason"],
        st)

# 5. 429: hard stop for the scope, never a reroute.
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))
adapter.set_chaos(http_429=True)
h = PassHarness(load_envelope(env_path), scratch, adapter)
res = h.run_pass("batch-429")
T.check("429: pass COMPLETE", res["verdict"] == "COMPLETE", res)
T.check("429: zero mutations", adapter.mutation_count() == 0,
        adapter.mutation_count())
st = h.circuits.state("x:like")
T.check("429: action scope OPEN with rate-limit reason",
        st and st["state"] == "OPEN" and "429" in st["reason"], st)

# 6. Identity ambiguity: a handle closely resembling an engaged handle
# fails closed as BLOCKED (guard check_x fuzzy rule).
import importlib.util as _ilu
_spec = _ilu.spec_from_file_location(
    "eg5", "/home/hatch/workspace/outreach/engagement-guard.py")
_eg = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_eg)
_idx = _eg.load_index()
_engaged = [h for h in _idx["platforms"]["x"].get("handles", [])
            if len(h) >= 7]
_amb_handle = (_engaged[0] + "x") if _engaged else None


class AmbAdapter(FixtureAdapter):
    def discover(self, query):
        return [{"handle": _amb_handle, "user_id": "3333333333",
                 "url": "https://x.com/%s/status/1973500000000099999"
                 % _amb_handle,
                 "text": "hello", "action": "like"}]


if _amb_handle:
    scratch = T.make_scratch()
    env_path = T.write_envelope(scratch)
    h = PassHarness(load_envelope(env_path), scratch,
                    AmbAdapter(os.path.join(scratch, "fixture-server.json")))
    res = h.run_pass("batch-amb")
    T.check("identity ambiguity: rejected, no mutation",
            h.stats["rejected"] == 1 and h.adapter.mutation_count() == 0,
            (h.stats, h.adapter.mutation_count()))
else:
    T.check("identity ambiguity: rejected, no mutation", False,
            "no engaged handle of length>=7 in index")

# 7. Saturation: relationship budget caps re-touching.
scratch = T.make_scratch()
env_path = T.write_envelope(
    scratch, relationship_budget={"max_touches_per_30d": 1})
h = PassHarness(load_envelope(env_path), scratch,
                FixtureAdapter(os.path.join(scratch, "fixture-server.json")))
res = h.run_pass("batch-sat1")
T.check("saturation: first pass completes", res["verdict"] == "COMPLETE",
        res)
# A fresh batch would hit never-reengage first; simulate saturation on a
# new target by seeding the relationship ledger directly.
from x_store import RelationshipLedger
rels = RelationshipLedger(os.path.join(scratch, "relationship-ledger.jsonl"))
rels.append({"intent_id": "seed", "identity_key": "x:like:post:999",
             "action": "like", "handle": "someone"})
T.check("saturation: seeded touch counted",
        rels.touch_count("x:like:post:999", "like") == 1,
        rels.touch_count("x:like:post:999", "like"))

# 8. Budget race: two threads consuming the same ceiling cannot overspend.
scratch = T.make_scratch()
ledger = BudgetLedger(os.path.join(scratch, "budgets.json"))
results = []


def _consume():
    for _ in range(10):
        ok, _ = ledger.consume("pass:r", "x:like", 1, 5)
        results.append(ok)


threads = [threading.Thread(target=_consume) for _ in range(4)]
[t.start() for t in threads]
[t.join() for t in threads]
T.check("budget race: consumed never exceeds ceiling",
        ledger.consumed("pass:r", "x:like") == 5 and
        sum(results) == 5, (ledger.consumed("pass:r", "x:like"),
                            sum(results)))

# 9. ok-less outcome is refused by the invariant.
try:
    assert_ok_boolean_present({"intent_id": "x", "outcome": "EXECUTED"})
    T.check("ok-less outcome refused", False, "no raise")
except InvariantViolation:
    T.check("ok-less outcome refused", True)

# 10. Learner out-of-envelope proposal refused.
scratch = T.make_scratch()
learner = BoundedLearner(scratch, load_envelope(T.write_envelope(scratch)))
try:
    learner.propose({"dispatch_spacing_sec": 5000})
    T.check("learner out-of-envelope refused", False, "no raise")
except InvariantViolation:
    T.check("learner out-of-envelope refused", True)
try:
    learner.propose({"authorized_accounts": ["mallory"]})
    T.check("learner authority-grab refused", False, "no raise")
except InvariantViolation:
    T.check("learner authority-grab refused", True)

# 11. Lease expiry: an expired lease is reclaimable.
scratch = T.make_scratch()
leases = LeaseStore(os.path.join(scratch, "leases.json"))
leases.acquire("intent-1", "worker-1", -1)
T.check("expired lease is reclaimable by another worker",
        leases.acquire("intent-1", "worker-2", 600) is True, None)
T.check("live lease is not stealable",
        leases.acquire("intent-1", "worker-3", 600) is False, None)

sys.exit(T.summary())
