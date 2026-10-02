#!/usr/bin/env python3
"""T-ACK-LOST: the worker's completion ack never reaches the coordinator.

Variant: the completion IS durable (packet SUCCEEDED, attempt 1), but the
coordinator process that dispatched it died before seeing the ack. A fresh
coordinator re-runs its dispatch scan from durable state alone.

Expected: the scan sees SUCCEEDED and dispatches nothing; no new attempt is
created; a second claim on the terminal packet fails. The durable record, not
coordinator memory, is the source of truth (record 14: controller holds no
private durable state).
"""
import sys

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g


def dispatch_scan(conn, run_id, coordinator):
    """A coordinator's dispatch scan, derived purely from durable state."""
    cur = conn.execute(
        """SELECT packet_id, status, attempt_seq FROM gauntlet.packets
           WHERE run_id=%s AND status IN ('ENQUEUED','CLAIMED','IN_FLIGHT')""",
        (str(run_id),))
    rows = cur.fetchall()
    for packet_id, status, attempt_seq in rows:
        g.audit(conn, run_id, "coord.scan_dispatch",
                {"coordinator": coordinator, "packet": str(packet_id)})
    cur = conn.execute(
        "SELECT COUNT(*) FROM gauntlet.packets WHERE run_id=%s AND status='SUCCEEDED'",
        (str(run_id),))
    skipped = cur.fetchone()[0]
    g.audit(conn, run_id, "coord.scan_skipped_terminal",
            {"coordinator": coordinator, "skipped_succeeded": skipped})
    return len(rows), skipped


def main():
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-ack-lost")
    packet = g.new_packet(conn, run, kind="ackable-work")
    # worker completes fully and durably...
    assert g.claim_packet(conn, packet, "worker-ack", 21)
    g.set_packet(conn, packet, "IN_FLIGHT")
    for i in (1, 2, 3):
        g.audit(conn, run, "effect.step", {"worker": "worker-ack", "step": i})
        g.checkpoint(conn, run, {"step": i})
    g.set_packet(conn, packet, "SUCCEEDED", result_ref="sha256:done")
    # ...but its completion ack never reaches the (now-dead) coordinator.
    # Fresh coordinator scans from durable state alone:
    dispatched, skipped = dispatch_scan(conn, run, "coord-fresh")
    # and a stale duplicate claim attempt must fail:
    dup_claim = g.claim_packet(conn, packet, "worker-dupe", 22)
    pkt = g.get_packet(conn, packet)

    evidence = {
        "fresh_coordinator_dispatched": dispatched,
        "terminal_packets_skipped": skipped,
        "duplicate_claim_on_succeeded": dup_claim,
        "packet_status": pkt["status"],
        "packet_attempt_seq": pkt["attempt_seq"],
        "result_ref_preserved": pkt["result_ref"],
    }
    ok = (dispatched == 0 and skipped == 1 and dup_claim is False
          and pkt["status"] == "SUCCEEDED" and pkt["attempt_seq"] == 1
          and pkt["result_ref"] == "sha256:done")
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
