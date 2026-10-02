#!/usr/bin/env python3
"""Phase 7 survival verification: run AFTER the gateway-only restart.

Re-reads every chain artifact from Postgres (bypassing the gateway), confirms
the chain is intact, confirms production revision 194a2b85bde957ed and orphan
4917265ee67e678c are untouched, and emits a post-restart probe event whose ID
is predicted before emission.
"""
import hashlib, json, os, subprocess, sys, time, urllib.request, urllib.error

GW = "http://127.0.0.1:8080"
CORR = "phase7-2026-09-17"
NS_EVT = "core::owner"
SRC = "api:muse-level-2"
N2 = "phase7-playbook-node-001"
N3 = "phase7-revision-node-001"
ART = "/tmp/phase7-artifacts"
TOKEN = os.environ.get("PING_BEARER") or ""
if not TOKEN:
    print("FATAL: PING_BEARER env not set", flush=True)
    sys.exit(2)

VOLATILE = {"timestamp", "created_at", "updated_at", "paid_at", "accepted_at",
            "completed_at", "occurred_at", "received_at", "sent_at", "started_at",
            "ended_at", "recorded_at", "processed_at"}

def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def canon(o): return json.dumps(o, separators=(",", ":"), ensure_ascii=True)
def ev_id(t, payload):
    stripped = canon({k: v for k, v in payload.items() if k not in VOLATILE})
    return sha(canon({"eventType": t, "source": SRC, "namespace": NS_EVT, "logical_id": stripped}))

LOG = []
def log(step, status, detail=""):
    print(f"[{status}] {step} {detail}", flush=True)
    LOG.append({"step": step, "status": status, "detail": str(detail)[:400]})

def dpsql(query):
    q = query if query.rstrip().endswith(";") else query + ";"
    p = subprocess.run(["docker", "exec", "-i", "ping-postgres", "sh", "-c",
                        "psql -U $POSTGRES_USER -d $POSTGRES_DB -t -A -v ON_ERROR_STOP=1"],
                       input=q.encode(), capture_output=True, timeout=30)
    out = p.stdout.decode().strip()
    if p.returncode != 0:
        raise RuntimeError(f"dpsql failed: {p.stderr.decode()[:300]}")
    return out

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(GW + path, data=data, method=method,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode()[:500]}

def main():
    with open(f"{ART}/chain.json") as f:
        chain = json.load(f)
    ok = True

    # gateway health after restart
    for _ in range(20):
        try:
            r = api("GET", "/health")
            if r: break
        except Exception:
            time.sleep(5)
    log("post-restart-health", "PASS", str(r)[:100])

    # nodes
    n2 = json.loads(dpsql(f"SELECT row_to_json(t)::text FROM (SELECT node_id, status, confidence, "
                          f"source_event_id, namespace, correlation_id, data FROM knowledge_nodes "
                          f"WHERE node_id = '{N2}') t") or "null")
    n2_ok = (n2 and n2["status"] == "approved" and float(n2["confidence"]) == 1.0
             and (n2["data"] or {}).get("lifecycle", {}).get("status") == "active")
    log("survive-node-N2", "PASS" if n2_ok else "FAIL",
        f"status={n2['status']} conf={n2['confidence']} lifecycle={(n2['data'] or {}).get('lifecycle', {}).get('status')}")
    ok = ok and n2_ok

    n3 = json.loads(dpsql(f"SELECT row_to_json(t)::text FROM (SELECT node_id, status, data FROM knowledge_nodes "
                          f"WHERE node_id = '{N3}') t") or "null")
    n3_ok = (n3 and n3["status"] == "candidate"
             and (n3["data"] or {}).get("decision") == "PENDING_HUMAN"
             and (n3["data"] or {}).get("decided_by") is None)
    log("survive-node-N3", "PASS" if n3_ok else "FAIL",
        f"decision={(n3['data'] or {}).get('decision')} decided_by={(n3['data'] or {}).get('decided_by')}")
    ok = ok and n3_ok

    # production revision untouched (read-only check)
    prod = json.loads(dpsql("SELECT row_to_json(t)::text FROM (SELECT node_id, status, data FROM knowledge_nodes "
                            "WHERE node_id = '194a2b85bde957ed') t") or "null")
    prod_ok = (prod and prod["status"] == "candidate"
               and (prod["data"] or {}).get("decision") == "PENDING_HUMAN"
               and (prod["data"] or {}).get("decided_by") is None)
    log("untouched-production-revision", "PASS" if prod_ok else "FAIL",
        f"194a2b85bde957ed status={prod['status']} decision={(prod['data'] or {}).get('decision')}")
    ok = ok and prod_ok

    orph = json.loads(dpsql("SELECT row_to_json(t)::text FROM (SELECT node_id, status FROM knowledge_nodes "
                            "WHERE node_id = '4917265ee67e678c') t") or "null")
    orph_ok = orph and orph["status"] == "candidate"
    log("untouched-orphan-node", "PASS" if orph_ok else "FAIL", f"4917265ee67e678c status={orph['status']}")
    ok = ok and orph_ok

    # chain events present
    eids = [chain[k] for k in ("proposal_event", "approval_event", "activation_event",
                               "projection_event", "outcome_event", "revision_event",
                               "replay_event", "execution_replay_completed", "execution_witness",
                               "execution_lineage", "replay_completed", "witness", "lineage")]
    missing = []
    for eid in eids:
        c = dpsql(f"SELECT COUNT(*) FROM ping_events WHERE event_id = '{eid}'").strip()
        if c != "1":
            missing.append(eid[:16])
    log("survive-chain-events", "PASS" if not missing else "FAIL",
        f"{len(eids) - len(missing)}/{len(eids)} present" + (f" missing={missing}" if missing else ""))
    ok = ok and not missing

    # missions still completed
    mids = [chain[k] for k in ("promote_mission", "execution_mission", "replay_mission")]
    bad = []
    for m in mids:
        s = dpsql(f"SELECT status || '|' || COALESCE(assigned_to,'') FROM ping_missions "
                  f"WHERE mission_id = '{m}'").strip()
        if not s.startswith("completed"):
            bad.append(f"{m[:16]}={s}")
    log("survive-missions", "PASS" if not bad else "FAIL",
        f"{len(mids) - len(bad)}/{len(mids)} completed" + (f" bad={bad}" if bad else ""))
    ok = ok and not bad

    # post-restart probe: predicted ID must persist exactly
    probe_payload = {"correlation_id": CORR, "probe": "post-restart execution check",
                     "scope": "TEST SCOPE ONLY"}
    exp = ev_id("OBSERVATION_CREATED", probe_payload)
    r = api("POST", "/events", {"event_type": "OBSERVATION_CREATED",
                                "aggregate_id": "phase7-probe-001",
                                "aggregate_type": "playbook", "event_data": probe_payload})
    probe_ok = r.get("event_id") == exp and r.get("status") == "ok"
    log("post-restart-probe", "PASS" if probe_ok else "FAIL",
        f"exp={exp[:16]} got={str(r.get('event_id'))[:16]}")
    ok = ok and probe_ok
    chain["probe_event"] = r.get("event_id")

    with open(f"{ART}/chain.json", "w") as f:
        json.dump(chain, f, indent=2)
    with open(f"{ART}/verify-runlog.jsonl", "w") as f:
        for line in LOG:
            f.write(json.dumps(line) + "\n")
    log("phase7-verify COMPLETE", "PASS" if ok else "FAIL", "survival verification done")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
