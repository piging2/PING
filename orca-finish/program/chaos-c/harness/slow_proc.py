"""CHAOS-C Q3 slow-path worker. Scratch only; never production.

Modes (each is one OS process so the controller can kill it mid-window):
  slow-commit <db> <run_id> <packet_id> <worker> <sleep_s> <marker>
      claim packet, then slow_commit_packet_step (sleep INSIDE the txn).
  slow-checkpoint <db> <run_id> <packet_id> <worker> <sleep_s> <marker>
      claim packet, fast checkpoint C1, then slow_checkpoint (sleep before commit).
  slow-finalize <db> <run_id> <packet_id> <worker> <sleep_s> <marker>
      claim packet; fast phase-1 txn (effect + IN_FLIGHT, committed);
      marker; sleep (models a slow external ack / slow logical commit);
      then UNCONDITIONAL final write (set_packet SUCCEEDED) + emit_completion.
      This is the worker whose logical commit spans the supervisor timeout.
  finisher <db> <run_id> <packet_id> <old_worker> <new_worker>
      reclaim_packet(old->new), idempotent apply_effect, set SUCCEEDED,
      emit_completion. Models supervisor timeout recovery.
  finisher-ckpt <db> <run_id> <packet_id> <old_worker> <new_worker> <json_state>
      reclaim + fast checkpoint of the new worker's state + SUCCEEDED.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chaos_lib as L


def main():
    mode = sys.argv[1]
    dbp, run_id, packet_id = sys.argv[2], sys.argv[3], sys.argv[4]
    worker = sys.argv[5]
    conn = L.db(dbp)

    if mode == "slow-commit":
        sleep_s, marker = float(sys.argv[6]), sys.argv[7]
        L.claim_packet(conn, packet_id, worker, 1)
        L.SLOW["commit"] = sleep_s
        L.slow_commit_packet_step(conn, packet_id, 1, worker,
                                  marker_path=marker)
        L.emit_completion(conn, run_id, packet_id, f"result:{worker}")
        print("slow-commit done", flush=True)

    elif mode == "slow-checkpoint":
        sleep_s, marker = float(sys.argv[6]), sys.argv[7]
        L.claim_packet(conn, packet_id, worker, 1)
        L.checkpoint(conn, run_id, {"phase": "fast-C1", "worker": worker})
        L.SLOW["checkpoint"] = sleep_s
        L.slow_checkpoint(conn, run_id, {"phase": "slow-C2", "worker": worker},
                          worker, 1, marker_path=marker)
        L.set_packet(conn, packet_id, "SUCCEEDED", f"result:{worker}")
        L.emit_completion(conn, run_id, packet_id, f"result:{worker}")
        print("slow-checkpoint done", flush=True)

    elif mode == "slow-finalize":
        sleep_s, marker = float(sys.argv[6]), sys.argv[7]
        import time
        L.claim_packet(conn, packet_id, worker, 1)
        # phase 1: fast, committed txn
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            "INSERT OR IGNORE INTO effects(effect_key, packet_id, step, worker_id)"
            " VALUES (?,?,?,?)",
            (f"effect:{packet_id}:1", packet_id, 1, worker))
        conn.execute(
            "UPDATE packets SET status='IN_FLIGHT',"
            " updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"
            " WHERE packet_id=?", (packet_id,))
        conn.commit()
        with open(marker, "w") as f:
            f.write(f"{os.getpid()}:{time.time()}")
        # slow logical commit window: supervisor timeout fires HERE
        time.sleep(sleep_s)
        # late, unconditional final write from the (by now) deposed worker
        L.set_packet(conn, packet_id, "SUCCEEDED", f"result:{worker}")
        L.emit_completion(conn, run_id, packet_id, f"result:{worker}")
        print("slow-finalize done", flush=True)

    elif mode == "finisher":
        old_worker, new_worker = sys.argv[6], sys.argv[7]
        ok = L.reclaim_packet(conn, packet_id, old_worker, new_worker, 2)
        L.apply_effect(conn, packet_id, 1, new_worker)
        L.set_packet(conn, packet_id, "SUCCEEDED", f"result:{new_worker}")
        emitted = L.emit_completion(conn, run_id, packet_id,
                                    f"result:{new_worker}")
        print(f"finisher reclaimed={ok} emitted={emitted}", flush=True)

    elif mode == "finisher-ckpt":
        old_worker, new_worker, state_json = (sys.argv[6], sys.argv[7],
                                              sys.argv[8])
        ok = L.reclaim_packet(conn, packet_id, old_worker, new_worker, 2)
        L.slow_checkpoint(conn, run_id, json.loads(state_json), new_worker, 2)
        L.set_packet(conn, packet_id, "SUCCEEDED", f"result:{new_worker}")
        L.emit_completion(conn, run_id, packet_id, f"result:{new_worker}")
        print(f"finisher-ckpt reclaimed={ok}", flush=True)


if __name__ == "__main__":
    main()
