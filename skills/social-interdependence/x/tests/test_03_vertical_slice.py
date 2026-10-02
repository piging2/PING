#!/usr/bin/env python3
"""Test 3: the vertical slice, end to end.

authorized account -> discovery/read -> candidate -> deterministic
eligibility (REAL guard) -> durable intent -> autonomous scheduling ->
authorized execution (FIXTURE adapter at the boundary only, shaped like the
xapi.py call contract) -> read-after-write verification -> canonical
evidence (ok boolean) -> relationship update.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import si_testlib as T
from x_orchestrator import PassHarness, load_envelope
from xapi_fixture import FixtureAdapter
from x_store import Journal

T.make_outreach_root()
scratch = T.make_scratch()
env_path = T.write_envelope(scratch)
envelope = load_envelope(env_path)
adapter = FixtureAdapter(os.path.join(scratch, "fixture-server.json"))

h = PassHarness(envelope, scratch, adapter, worker_id="worker-1")
res = h.run_pass("batch-vs-001")
T.check("vertical slice: pass COMPLETE", res["verdict"] == "COMPLETE", res)

journal = Journal(os.path.join(scratch, "journal.jsonl"))
derived = journal.derive()
ok_chain, bad = journal.verify_chain()
T.check("journal hash chain verifies", ok_chain, bad)

like_iid = "x:like:post:1973500000000000001:batch-vs-001"
follow_iid = "x:follow:user:2222222222:batch-vs-001"
T.check("like intent reached VERIFIED_SUCCESS",
        derived.get(like_iid, {}).get("state") == "VERIFIED_SUCCESS",
        derived.get(like_iid))
T.check("follow intent reached VERIFIED_SUCCESS",
        derived.get(follow_iid, {}).get("state") == "VERIFIED_SUCCESS",
        derived.get(follow_iid))

receipts = T.read_jsonl(os.path.join(scratch, "outcome-receipts.jsonl"))
by_iid = {r["intent_id"]: r for r in receipts}
for iid in (like_iid, follow_iid):
    r = by_iid.get(iid, {})
    T.check("receipt %s carries explicit boolean ok=True" % iid,
            r.get("ok") is True, r)
    T.check("receipt %s has read-after-write verification" % iid,
            (r.get("verification") or {}).get("method") == "read-after-write"
            and (r.get("verification") or {}).get("observed_at"), r)
    T.check("receipt %s declares canonical success only when verified"
            % iid, r.get("canonical_success") is True, r)

decisions = T.read_jsonl(os.path.join(scratch, "decision-records.jsonl"))
T.check("two decision records persisted", len(decisions) == 2,
        len(decisions))
for d in decisions:
    T.check("decision %s proceeded on guard ELIGIBLE" % d["candidate_id"],
            d["decision"] == "PROCEED" and
            d["policy_result"]["decision"] == "ELIGIBLE", d["reason"])
    T.check("decision record has identity confidence parts for %s"
            % d["candidate_id"],
            d["identity_confidence"]["score"] >= 0.5 and
            d["identity_confidence"]["parts"], d["identity_confidence"])

rels = T.read_jsonl(os.path.join(scratch, "relationship-ledger.jsonl"))
T.check("relationship ledger updated with 2 verified touches",
        len(rels) == 2, len(rels))

T.check("fixture server applied exactly 2 mutations",
        adapter.mutation_count() == 2, adapter.mutation_count())

# Replay: re-derive decisions from the journal; they must match.
rederived = journal.derive()
T.check("replay re-derives identical terminal state",
        all(rederived[i]["state"] == derived[i]["state"]
            for i in derived), None)

# Never-reengage: a second pass must not re-engage the same identities.
h2 = PassHarness(envelope, scratch,
                 FixtureAdapter(os.path.join(scratch, "fixture-server.json")),
                 worker_id="worker-1")
res2 = h2.run_pass("batch-vs-002")
T.check("second pass COMPLETE", res2["verdict"] == "COMPLETE", res2)
T.check("no new mutations on second pass (never-reengage)",
        h2.adapter.mutation_count() == 2, h2.adapter.mutation_count())
T.check("second pass rejected both as already engaged",
        h2.stats["rejected"] == 2, h2.stats)

sys.exit(T.summary())
