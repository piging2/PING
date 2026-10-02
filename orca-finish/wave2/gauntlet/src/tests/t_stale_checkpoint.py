#!/usr/bin/env python3
"""T-STALE-CHECKPOINT: restoring an older checkpoint when a newer exists
(record 7: checkpoints are versioned and monotonic).

Expected: restore(older) raises StaleCheckpointError and is audited; a
digest-tampered checkpoint is refused; restoring the latest works.
"""
import sys

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g


def main():
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-stale-checkpoint")
    c1 = g.checkpoint(conn, run, {"step": 1})
    c2 = g.checkpoint(conn, run, {"step": 2})
    c3 = g.checkpoint(conn, run, {"step": 3})

    stale_refused = False
    try:
        g.restore_checkpoint(conn, run, c2)
    except g.StaleCheckpointError:
        stale_refused = True

    missing_refused = False
    try:
        g.restore_checkpoint(conn, run, 99)
    except g.StaleCheckpointError:
        missing_refused = True

    # tamper: rewrite state without updating the digest -> must be refused
    conn.execute(
        "UPDATE gauntlet.checkpoints SET state='{\"step\": 999}'::jsonb "
        "WHERE run_id=%s AND checkpoint_id=%s", (str(run), c3))
    tamper_refused = False
    try:
        g.restore_checkpoint(conn, run, c3)
    except g.StaleCheckpointError:
        tamper_refused = True
    # restore the untampered row for the latest-restore check
    conn.execute(
        "UPDATE gauntlet.checkpoints SET state=%s::jsonb, state_digest=%s "
        "WHERE run_id=%s AND checkpoint_id=%s",
        ('{"step": 3}', g._sha(g._canon({"step": 3})), str(run), c3))
    latest = g.restore_checkpoint(conn, run, c3)

    c2b = g.db()
    refused_audit = c2b.execute(
        "SELECT COUNT(*) FROM gauntlet.audit_events WHERE run_id=%s AND kind='checkpoint.stale_refused'",
        (str(run),)).fetchone()[0]
    mismatch_audit = c2b.execute(
        "SELECT COUNT(*) FROM gauntlet.audit_events WHERE run_id=%s AND kind='checkpoint.digest_mismatch'",
        (str(run),)).fetchone()[0]

    evidence = {
        "checkpoints": [c1, c2, c3],
        "stale_restore_refused": stale_refused,
        "missing_restore_refused": missing_refused,
        "tampered_restore_refused": tamper_refused,
        "latest_restore_ok": latest == {"step": 3},
        "stale_refused_audited": refused_audit >= 1,
        "digest_mismatch_audited": mismatch_audit >= 1,
    }
    ok = all([stale_refused, missing_refused, tamper_refused,
              latest == {"step": 3}, refused_audit >= 1, mismatch_audit >= 1])
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
