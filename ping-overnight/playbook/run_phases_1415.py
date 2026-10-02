#!/usr/bin/env python3
"""Agent E driver v5: phases 14b (mission-driven chain replay + witness) and 15
(gateway-only restart, durability, post-restart execution).

Context: v4 completed phases 11-13 (all PASS). Its phase 14 emitted a bare
REPLAY_VERIFY event, which produced no REPLAY_COMPLETED because REPLAY_VERIFY
is not in EventToMissionBridge.EVENT_MISSION_MAP, so no mission was created
and the dispatch-only WorkerRuntime never ran the replay worker (same
architectural pattern as the promoter dispatch gap, now a documented finding).

v5 drives replay the way the architecture intends: a REPLAY_VERIFY *mission*
created via POST /missions. MISSION_WORKER_MAP[REPLAY_VERIFY]='replay', so the
MissionScheduler claims it and dispatches the replay worker with the chain
payload; the worker emits REPLAY_COMPLETED, the bridge creates the
WITNESS_CREATE mission, and the witness worker emits WITNESS_CREATED.
This exact path was verified live during v4 phase 12 (mission 0405c01805096690
-> REPLAY_COMPLETED 408247b6... -> WITNESS_CREATED 2c75c8da...).

Then phase 15 restarts ONLY ping-gateway, proves the playbook node + chain
events survived, and proves new post-restart work executes.

Every identifier below is resolved live from Postgres; nothing is invented.
"""
import hashlib, json, subprocess, sys, time, urllib.request, urllib.error

GW = "http://127.0.0.1:8080"
CORR = "sprint-2026-09-16"
NS = "test.playbook"
EVNS = "core::playbook"
SRC = "api:muse-level-2"
LOG = []
_TOKEN = [None]

# Aggregate ids (stable, chosen by the drivers); full event ids resolved live.
AGG = {
    "E_prop":   "test-playbook-proposal-001",
    "E_appr":   "test-playbook-approval-001",
    "E_act":    "test-playbook-activation-001",
    "E_proj":   "test-playbook-projection-001",
    "E_out":    "test-playbook-outcome-001",
    "E_rev":    "test-playbook-revision-001",
    "E_replay": "test-playbook-replay-001",
}
N2 = "94043c0eb1d3918d"
N3 = "194a2b85bde957ed"
M12 = "0405c01805096690"

def log(step, status, detail=""):
    line = f"[{status}] {step} {detail}"
    print(line, flush=True)
    LOG.append({"step": step, "status": status, "detail": str(detail)[:300]})

def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def canon(o): return json.dumps(o, separators=(",", ":"))

def dpsql(query):
    p = subprocess.run(
        ["docker", "exec", "-i", "ping-postgres", "sh", "-c",
         "psql -U $POSTGRES_USER -d $POSTGRES_DB -t -A -v ON_ERROR_STOP=1"],
        input=(query if query.rstrip().endswith(";") else query + ";").encode(),
        capture_output=True, timeout=30)
    if p.returncode != 0:
        raise RuntimeError("psql failed: " + p.stderr.decode()[:200])
    return p.stdout.decode()

def qjson(query):
    return [json.loads(line) for line in dpsql(query).strip().splitlines() if line.strip()]

def qscalar(query):
    return dpsql(query).strip().splitlines()[0].strip()

def token():
    if _TOKEN[0] is None:
        _TOKEN[0] = qscalar(
            "SELECT api_key FROM exterior_agent_credentials WHERE agent_id='muse-level-2' AND is_active LIMIT 1")
        assert _TOKEN[0], "no level-2 credential row"
    return _TOKEN[0]

def api(method, path, body=None, retries=6):
    data = canon(body).encode() if body is not None else None
    for i in range(retries):
        req = urllib.request.Request(GW + path, data=data, method=method,
            headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode() or "{}")
        except urllib.error.HTTPError as e:
            emsg = e.read().decode()[:200]
            if e.code in (502, 503, 504) and i < retries - 1:
                time.sleep(2 ** i); continue
            return {"http_error": e.code, "body": emsg}
        except Exception as e:
            if i < retries - 1:
                time.sleep(2 ** i); continue
            return {"transport_error": str(e)[:200]}
    return {"transport_error": "retries exhausted"}

def events_of(etype, since_min=180):
    return qjson(
        "SELECT row_to_json(t) FROM (SELECT event_id, event_type, namespace, payload, metadata, created_at"
        f" FROM ping_events WHERE event_type='{etype}' AND created_at >= NOW() - ({since_min} || ' minutes')::interval"
        " ORDER BY created_at DESC LIMIT 200) t")

def wait_for(cond, timeout_s, poll_s, desc):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        v = cond()
        if v: return v
        time.sleep(poll_s)
    log(desc, "FAIL", f"timeout after {timeout_s}s")
    return None

def get_mission(mid):
    rows = qjson(
        "SELECT row_to_json(t) FROM (SELECT mission_id, mission_type, status, result, error, created_at, completed_at"
        f" FROM ping_missions WHERE mission_id='{mid}') t")
    return rows[0] if rows else None

def get_node(node_id):
    rows = qjson(
        "SELECT row_to_json(t) FROM (SELECT node_id, node_type, label, data, status,"
        " confidence, namespace, source_event_id, correlation_id, created_at, updated_at"
        f" FROM knowledge_nodes WHERE node_id='{node_id}') t")
    return rows[0] if rows else None

def resolve_ids():
    ids = {}
    for label, agg in AGG.items():
        rows = qjson(
            "SELECT row_to_json(t) FROM (SELECT event_id FROM ping_events"
            f" WHERE metadata->>'aggregate_id'='{agg}' ORDER BY created_at DESC LIMIT 1) t")
        assert rows, f"missing event for aggregate {agg}"
        ids[label] = rows[0]["event_id"]
        log("resolve", "PASS", f"{label}={ids[label][:16]} agg={agg}")
    return ids

def main():
    t_start = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    log("git-state", "INFO", "driver v5 (phases 14b+15); continues v4 phases 11-13")

    h = api("GET", "/health")
    assert h.get("status") == "healthy" or h.get("overall") == "healthy", f"gateway not healthy: {h}"
    log("gateway-health", "PASS", "healthy")

    ids = resolve_ids()
    e_replay = ids["E_replay"]

    # Pre-flight: v4 artifacts present (node approved+active, revision gated).
    n2 = get_node(N2)
    assert n2 and n2["status"] == "approved" and (n2["data"] or {}).get("lifecycle", {}).get("status") == "active", \
        f"v4 playbook node not in expected state: {n2}"
    n3 = get_node(N3)
    assert n3 and (n3["data"] or {}).get("decision") == "PENDING_HUMAN", "v4 revision node missing"
    log("preflight", "PASS", "v4 phases 11-13 artifacts present (N2 approved+active, N3 PENDING_HUMAN)")

    # ---------- PHASE 14b: mission-driven replay + witness of the full chain ----------
    chain_payload = {
        "correlation_id": CORR, "documentId": N2,
        "chain": [ids["E_prop"], ids["E_appr"], ids["E_act"], ids["E_proj"], ids["E_out"], ids["E_rev"]],
        "playbook_node": N2, "mission_id": M12,
        "description": "replay the full test playbook learning chain (proposal, approval, activation, mission, outcome, revision)",
    }
    m_payload = {"event_id": e_replay, "event_type": "REPLAY_VERIFY", "source": SRC,
                 "namespace": EVNS, "correlation_id": CORR, "payload": chain_payload}
    exp_mid = sha("REPLAY_VERIFY:" + e_replay)[:16]
    r = api("POST", "/missions", {"missionType": "REPLAY_VERIFY", "payload": m_payload,
                                  "priority": 1, "createdBy": "agent-e (sprint operator)"})
    ok = r.get("status") == "ok" and r.get("missionId") == exp_mid
    log("replay-mission-create", "PASS" if ok else "FAIL",
        f"exp={exp_mid} got={r.get('missionId')} resp={str(r)[:120]}")
    assert ok, f"mission create failed: {r}"
    m_id = r["missionId"]
    done = wait_for(lambda: (lambda m: m if m and m["status"] in ("completed", "failed") else None)(get_mission(m_id)),
                    180, 5, "replay-mission-executed")
    assert done, "replay mission did not reach a terminal state"
    log("replay-mission-executed", "PASS" if done["status"] == "completed" else "FAIL",
        f"M={m_id} status={done['status']} result={str(done['result'])[:200]}")

    rc = wait_for(lambda: [e for e in events_of("REPLAY_COMPLETED", 60)
                           if (e["payload"] or {}).get("upstreamEventId") == e_replay],
                  120, 5, "replay-completed")
    assert rc, "no REPLAY_COMPLETED for the chain replay mission"
    rc_payload = rc[0]["payload"] or {}
    log("replay-completed", "PASS",
        f"E_rc={rc[0]['event_id'][:16]} verified={(rc_payload.get('replay') or {}).get('verified')}")
    wit = wait_for(lambda: [e for e in events_of("WITNESS_CREATED", 60)
                             if CORR in canon(e["payload"] or {})],
                   180, 5, "witness-created")
    assert wit, "no WITNESS_CREATED for the chain replay"
    log("witness-created", "PASS", f"E_wit={wit[0]['event_id'][:16]}")
    log("phase14 COMPLETE", "PASS",
        f"M={m_id} E_rc={rc[0]['event_id'][:16]} E_wit={wit[0]['event_id'][:16]}")
    e_wit = wit[0]["event_id"]
    e_rc = rc[0]["event_id"]

    chain = {"correlation_id": CORR, "playbook": "test.verified-operational-response",
             "proposal_event": ids["E_prop"], "playbook_node": N2,
             "approval_event": ids["E_appr"], "activation_event": ids["E_act"],
             "projection_event": ids["E_proj"], "mission_id": M12,
             "outcome_event": ids["E_out"], "revision_node": N3,
             "revision_event": ids["E_rev"], "replay_event": e_replay,
             "replay_mission": m_id, "replay_completed": e_rc, "witness": e_wit}
    with open("/tmp/e-chain.json", "w") as f:
        json.dump(chain, f, indent=2)

    # ---------- PHASE 15: gateway-only restart, durability, post-restart work ----------
    log("restart", "INFO", "restarting ONLY the ping-gateway container")
    p = subprocess.run(["docker", "restart", "ping-gateway"], capture_output=True, timeout=180)
    log("restart", "PASS" if p.returncode == 0 else "FAIL", f"rc={p.returncode}")
    assert p.returncode == 0, "gateway restart failed"
    healthy = wait_for(
        lambda: (lambda hh: hh if (hh.get("status") == "healthy" or hh.get("overall") == "healthy") else None)(
            api("GET", "/health", retries=2)),
        240, 5, "gateway-healthy-after-restart")
    assert healthy, "gateway did not return healthy after restart"
    log("post-restart-health", "PASS", "gateway healthy")

    n2 = get_node(N2)
    surv_ok = (n2 and n2["status"] == "approved"
               and (n2["data"] or {}).get("lifecycle", {}).get("status") == "active")
    log("durable-node", "PASS" if surv_ok else "FAIL",
        f"N2 status={n2['status'] if n2 else None}")
    assert surv_ok, "playbook node did not survive restart"
    n3 = get_node(N3)
    rev_ok = n3 and (n3["data"] or {}).get("decision") == "PENDING_HUMAN" and (n3["data"] or {}).get("decided_by") is None
    log("durable-revision", "PASS" if rev_ok else "FAIL", "N3 still PENDING_HUMAN, decided_by null")
    assert rev_ok, "revision node changed across restart"

    chain_ids = [ids["E_prop"], ids["E_appr"], ids["E_act"], ids["E_proj"],
                 ids["E_out"], ids["E_rev"], e_replay, e_rc, e_wit]
    id_list = ",".join("'" + i + "'" for i in chain_ids)
    n_present = int(qscalar(f"SELECT COUNT(*) FROM ping_events WHERE event_id IN ({id_list})"))
    log("durable-events", "PASS" if n_present == len(chain_ids) else "FAIL",
        f"{n_present}/{len(chain_ids)} chain events present")
    assert n_present == len(chain_ids), "chain events missing after restart"

    m12 = get_mission(M12)
    log("durable-mission", "PASS" if m12 and m12["status"] == "completed" else "FAIL",
        f"M12 status={m12['status'] if m12 else None}")
    assert m12 and m12["status"] == "completed", "phase-12 mission record missing after restart"

    # Post-restart execution: brand-new event persists with the expected id.
    probe_data = {"correlation_id": CORR, "probe": "post-restart execution",
                  "note": "gateway restarted; new work persists"}
    exp_probe = sha(canon({"eventType": "OBSERVATION_CREATED", "source": SRC, "namespace": EVNS,
                           "logical_id": canon(probe_data)}))
    r = api("POST", "/events", {"event_type": "OBSERVATION_CREATED",
                                "aggregate_id": "test-playbook-probe-001",
                                "aggregate_type": "playbook", "event_data": probe_data,
                                "namespace": EVNS})
    ok = r.get("event_id") == exp_probe and r.get("status") == "ok"
    log("post-restart-execution", "PASS" if ok else "FAIL", f"E_probe={str(r.get('event_id'))[:16]}")
    assert ok, f"post-restart probe failed: {r}"
    log("phase15 COMPLETE", "PASS", "restart survived; new work executes")

    with open("/tmp/e-runlog.jsonl", "w") as f:
        for e in LOG:
            f.write(canon(e) + "\n")
    log("ALL PHASES COMPLETE", "PASS",
        f"started={t_start} N2={N2} M12={M12} M14={m_id} E_wit={e_wit[:16]}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log("DRIVER", "FATAL", f"{type(e).__name__}: {e}")
        try:
            with open("/tmp/e-runlog.jsonl", "w") as f:
                for e2 in LOG:
                    f.write(canon(e2) + "\n")
        except Exception:
            pass
        sys.exit(1)
