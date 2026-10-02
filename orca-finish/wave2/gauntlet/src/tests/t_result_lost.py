#!/usr/bin/env python3
"""T-RESULT-LOST: the effect happened (ack observed) but the result record was
lost before the worker could record completion.

Expected recovery: reconcile finds an ACKED tool call with no recorded result
-> packet becomes OUTCOME_UNKNOWN with cited evidence. The result must NEVER
be invented (no fabricated result_ref, no SUCCEEDED).
"""
import sys

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g


def reconcile_lost_result(conn, run_id, packet_id):
    """Recovery scan: ACKED effect, no result recorded -> OUTCOME_UNKNOWN."""
    cur = conn.execute(
        """SELECT call_id, effect_ack_at FROM gauntlet.tool_calls
           WHERE packet_id=%s AND status='ACKED'""", (str(packet_id),))
    acked = cur.fetchall()
    pkt = g.get_packet(conn, packet_id)
    if acked and pkt["result_ref"] is None and pkt["status"] in ("IN_FLIGHT", "CLAIMED"):
        ack_at = acked[0][1]
        g.set_packet(conn, packet_id, "OUTCOME_UNKNOWN")
        g.audit(conn, run_id, "packet.outcome_unknown", {
            "packet": str(packet_id),
            "reason": "effect ack observed but result record lost before completion",
            "effect_ack_at": str(ack_at),
            "result_invented": False})
        return True
    return False


def main():
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-result-lost")
    packet = g.new_packet(conn, run, kind="external-effect", effect_class="EXTERNAL")
    g.claim_packet(conn, packet, "worker-rl", 11)
    g.set_packet(conn, packet, "IN_FLIGHT")
    call = g.tool_submit(conn, run, packet, "external.send", "EXTERNAL", "idem-rl-1")
    g.tool_ack(conn, call)  # the effect really happened (externally observable)
    # ... then the result record is lost (worker died before writing it).
    # Nothing is written: result_ref stays NULL, packet stays IN_FLIGHT.

    reconciled = reconcile_lost_result(conn, run, packet)
    pkt = g.get_packet(conn, packet)
    tc = g.get_tool_call(conn, call)

    evidence = {
        "effect_was_acked": tc["status"] == "ACKED",
        "reconcile_ran": reconciled,
        "packet_status": pkt["status"],
        "result_ref": pkt["result_ref"],
        "result_not_invented": pkt["result_ref"] is None,
        "not_marked_success": pkt["status"] != "SUCCEEDED",
    }
    ok = (reconciled and pkt["status"] == "OUTCOME_UNKNOWN"
          and pkt["result_ref"] is None)
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
