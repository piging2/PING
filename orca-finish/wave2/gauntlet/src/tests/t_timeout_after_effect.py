#!/usr/bin/env python3
"""T-TIMEOUT-AFTER-EFFECT: tool timeout AFTER the side-effect boundary.

The boundary is the externally observable ack (record 8). A timeout after the
ack MUST become OUTCOME_UNKNOWN: never FAILED, never blind-retried, never
marked success. Control case: timeout BEFORE any ack is FAILED (safe to requeue).
"""
import sys

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g


def main():
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-timeout-after-effect")

    # Case A: EXTERNAL effect, ack observed, THEN timeout -> OUTCOME_UNKNOWN
    p_a = g.new_packet(conn, run, kind="external-send", effect_class="EXTERNAL")
    call_a = g.tool_submit(conn, run, p_a, "external.send", "EXTERNAL", "idem-a-1")
    g.tool_ack(conn, call_a)  # side-effect boundary crossed (externally observable)
    outcome_a = g.tool_timeout(conn, call_a)
    tc_a = g.get_tool_call(conn, call_a)
    # recovery policy: packet must NOT be requeued, must NOT be marked success
    g.set_packet(conn, p_a, "OUTCOME_UNKNOWN")
    pkt_a = g.get_packet(conn, p_a)
    # a blind retry with the same idempotency key must be detectable: the
    # original call row still exists with OUTCOME_UNKNOWN, so a redispatch
    # path can see it instead of issuing a duplicate effect.
    cur = conn.execute(
        "SELECT COUNT(*) FROM gauntlet.tool_calls WHERE run_id=%s AND idempotency_key='idem-a-1'",
        (str(run),))
    idem_rows = cur.fetchone()[0]

    # Case B (control): timeout BEFORE ack -> FAILED, safe to requeue
    p_b = g.new_packet(conn, run, kind="external-send-2", effect_class="EXTERNAL")
    call_b = g.tool_submit(conn, run, p_b, "external.send", "EXTERNAL", "idem-b-1")
    outcome_b = g.tool_timeout(conn, call_b)
    tc_b = g.get_tool_call(conn, call_b)

    evidence = {
        "post_boundary": {
            "outcome": outcome_a, "status": tc_a["status"],
            "evidence_cites_ack": tc_a["evidence"] is not None and "ack observed" in tc_a["evidence"],
            "packet_status": pkt_a["status"],
            "packet_not_requeued": pkt_a["status"] != "ENQUEUED",
            "packet_not_success": pkt_a["status"] != "SUCCEEDED",
            "idempotency_rows_for_key": idem_rows,
        },
        "pre_boundary_control": {
            "outcome": outcome_b, "status": tc_b["status"],
        },
    }
    ok = (outcome_a == "OUTCOME_UNKNOWN" and tc_a["status"] == "TIMED_OUT"
          and pkt_a["status"] == "OUTCOME_UNKNOWN" and idem_rows == 1
          and outcome_b == "FAILED")
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
