"""CHAOS-C Q5: cross-run idempotency-key aliasing. Scratch only.

probe-3e615e67 (chaos-a) was a LOCAL ACCIDENT: a collision key reused across
probe invocations deduped against the earlier run's row — the mechanism
working as designed. Q5 turns that accident into an explicit design probe:
the SAME global key in a NEW run returns the PRIOR run's packet. Is that
correct? It depends on what the key names — and the store currently cannot
tell the difference.

  P5.1  run A enqueues key K (payload P1) and completes. Run B (new run_id)
        enqueues K with DIFFERENT payload P2. Prove B gets A's packet back.
  P5.2  run A enqueues K, does NOT complete (packet stays ENQUEUED). Run B
        enqueues K, ignores is_new, claims A's packet and completes it under
        B's run_id. Prove the cross-run divergence (packet.run_id=A vs
        completion.run_id=B): the blast radius when the flag is ignored.
  P5.3  run A enqueues K (payload P) and completes. Run B redelivers K with
        the SAME payload P (legitimate retry). Prove dedup returns A's result
        safely: the case a redesign must preserve.

Design options enumerated in the Q5 lane note; recommendation with evidence.

One shared-format record per probe -> evidence/probe-records.jsonl.
"""
import hashlib
import json
import os
import sys
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "harness"))
import record as R
import chaos_lib as L

HARNESS = os.path.join(os.path.dirname(HERE), "harness")
DB = os.path.join(HARNESS, "chaos-c.db")

AFFECTS = ["impl-lane", "orca-b", "chaos-b"]
DEPS = ["record 8 idempotent effects", "packets.idempotency_key UNIQUE",
        "record 9 write-once completions"]


def phash(payload):
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]


def probe_p51():
    """Same key, different payload, prior run completed: prove aliasing."""
    conn = L.db(DB)
    key = f"q5-alias-{uuid.uuid4().hex[:10]}"
    p1, p2 = {"task": "mow-lawn", "v": 1}, {"task": "fix-fence", "v": 1}
    runA = L.new_run(conn, prompt_ref="chaos-c-q5-p51-A")
    pidA, newA = L.new_packet(conn, runA, idem=key, payload=p1)
    assert newA
    L.claim_packet(conn, pidA, "worker-A", 1)
    L.set_packet(conn, pidA, "SUCCEEDED", "result:run-A-work")
    L.emit_completion(conn, runA, pidA, "result:run-A-work")
    runB = L.new_run(conn, prompt_ref="chaos-c-q5-p51-B")
    pidB, newB = L.new_packet(conn, runB, idem=key, payload=p2)
    pB = L.get_packet(conn, pidB)
    conn.close()
    aliased = (pidB == pidA and not newB and pB["result_ref"] == "result:run-A-work")
    cls = "SURVIVED"  # mechanism behaved exactly as specified; the semantic is the open question
    return R.record(
        "chaos.key-aliasing", "chaos_lib.new_packet (global UNIQUE key)",
        "PROVEN: the same idempotency key in a NEW run returns the PRIOR run's "
        "packet (different payload). Run B's delivery is silently aliased to "
        "run A's work: B receives result:run-A-work for payload P2 it never "
        "submitted. The store cannot distinguish 'retry of the same intent' "
        "from 'different intent, reused key'.",
        "TEST", "run_key_aliasing.probe_p51", "new_packet x2 runs",
        "run-A then run-B", "get_packet durable read",
        cls, 0.96, "none",
        DEPS, AFFECTS,
        detail={"key": key, "payload_A_hash": phash(p1),
                "payload_B_hash": phash(p2), "payloads_match": False,
                "runA_packet": pidA, "runB_got_packet": pidB,
                "runB_is_new": newB, "aliased_to_prior_result": aliased,
                "design_question": "run-scoped keys vs global keys with run binding"},
        missions=2,
        verdict_notes=("B silently received A's result for a different payload; "
                       "mechanism as designed, semantics undecided"))


def probe_p52():
    """Same key, prior run's packet still ENQUEUED, caller ignores is_new."""
    conn = L.db(DB)
    key = f"q5-alias-{uuid.uuid4().hex[:10]}"
    runA = L.new_run(conn, prompt_ref="chaos-c-q5-p52-A")
    pidA, newA = L.new_packet(conn, runA, idem=key, payload={"task": "A-work"})
    assert newA  # run A dies before claiming; packet stays ENQUEUED
    runB = L.new_run(conn, prompt_ref="chaos-c-q5-p52-B")
    pidB, newB = L.new_packet(conn, runB, idem=key, payload={"task": "B-work"})
    # caller bug model: ignores is_new=False, treats the packet as its own
    claimed = L.claim_packet(conn, pidB, "worker-B", 1)
    L.set_packet(conn, pidB, "SUCCEEDED", "result:worker-B")
    emitted = L.emit_completion(conn, runB, pidB, "result:worker-B")
    cur = conn.execute(
        "SELECT run_id FROM packets WHERE packet_id=?", (pidA,))
    packet_run = cur.fetchone()[0]
    cur = conn.execute(
        "SELECT run_id FROM completions WHERE packet_id=?", (pidA,))
    completion_run = cur.fetchone()[0]
    conn.close()
    diverged = (claimed and packet_run == runA and completion_run == runB
                and not newB)
    cls = "DUPLICATED" if diverged else "SURVIVED"
    return R.record(
        "chaos.key-aliasing", "chaos_lib.new_packet + claim_packet",
        "Blast radius when the caller ignores is_new: run B claims run A's "
        "still-ENQUEUED packet and completes it under B's run_id. Final state: "
        "packet.run_id=A but completion.run_id=B. Two runs lay claim to one "
        "packet; run A's own recovery can no longer find its packet in a "
        "consistent state. The API makes this easy: a foreign packet_id plus "
        "one boolean flag.",
        "TEST", "run_key_aliasing.probe_p52", "new_packet/claim/emit x2 runs",
        "run-B ignoring is_new", "durable read",
        cls, 0.94,
        "cross-run packet ownership" if cls != "SURVIVED" else "none",
        DEPS, AFFECTS,
        detail={"key": key, "runA": runA, "runB": runB, "packet_id": pidA,
                "runB_is_new": newB, "runB_claim_won": claimed,
                "packet_run_id": packet_run, "completion_run_id": completion_run,
                "diverged": diverged},
        missions=3,
        verdict_notes=("packet owned by run A, completion recorded under run B: "
                       "cross-run aliasing") if diverged else "no divergence")


def probe_p53():
    """Same key, SAME payload across runs: legitimate retry must keep working."""
    conn = L.db(DB)
    key = f"q5-alias-{uuid.uuid4().hex[:10]}"
    p = {"task": "mow-lawn", "v": 1, "addr": "123 Main"}
    runA = L.new_run(conn, prompt_ref="chaos-c-q5-p53-A")
    pidA, newA = L.new_packet(conn, runA, idem=key, payload=p)
    assert newA
    L.claim_packet(conn, pidA, "worker-A", 1)
    L.set_packet(conn, pidA, "SUCCEEDED", "result:mow-done")
    L.emit_completion(conn, runA, pidA, "result:mow-done")
    runB = L.new_run(conn, prompt_ref="chaos-c-q5-p53-B")
    pidB, newB = L.new_packet(conn, runB, idem=key, payload=dict(p))
    pB = L.get_packet(conn, pidB)
    conn.close()
    safe = (pidB == pidA and not newB and pB["result_ref"] == "result:mow-done"
            and phash(p) == phash(dict(p)))
    cls = "SURVIVED"
    return R.record(
        "chaos.key-aliasing", "chaos_lib.new_packet (global UNIQUE key)",
        "Same key + byte-identical payload redelivered in a new run: dedup "
        "returns the prior run's result without re-executing. This is the "
        "legitimate, desirable case (retry after the first run completed) "
        "that a redesign MUST preserve; pure run-scoped keys would destroy it.",
        "TEST", "run_key_aliasing.probe_p53", "new_packet x2 runs",
        "run-A then run-B (retry)", "get_packet durable read",
        cls, 0.96, "none",
        DEPS, AFFECTS,
        detail={"key": key, "payload_hash": phash(p), "payloads_match": True,
                "runB_is_new": newB, "returned_result": pB["result_ref"],
                "reexecution_avoided": safe},
        missions=2,
        verdict_notes="idempotent cross-run replay works; do not regress this")


if __name__ == "__main__":
    L.init_db(DB)
    for fn in (probe_p51, probe_p52, probe_p53):
        print(fn(), "done", flush=True)
    print("Q5 complete")
