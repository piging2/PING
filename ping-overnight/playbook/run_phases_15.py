#!/usr/bin/env python3
"""Agent E driver v6: phase 14 evidence verification + phase 15 (gateway-only
restart, durability, post-restart execution).

Context: v5 completed the mission-driven chain replay (mission 945689817fdad075
-> REPLAY_COMPLETED ead4be8a..., verified=True) and the bridge+witness path
fired (WITNESS_CREATED 4aa7b0eb..., attestation witness-ead4be8a1eaaa77c,
documentId N2). v5's witness poll used an over-strict filter (correlation id
in payload; the witness payload carries documentId/upstreamEventId instead),
so it timed out after the evidence already existed. v6 verifies that evidence
directly, then executes phase 15.
"""
import hashlib, json, subprocess, sys, time, urllib.request, urllib.error

GW = "http://127.0.0.1:8080"
CORR = "sprint-2026-09-16"
NS = "test.playbook"
EVNS = "core::playbook"
SRC = "api:muse-level-2"
LOG = []
_TOKEN = [None]

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
M14 = "945689817fdad075"

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

def main():
    t_start = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    log("git-state", "INFO", "driver v6 (phase 14 verify + phase 15)")

    h = api("GET", "/health")
    assert h.get("status") == "healthy" or h.get("overall") == "healthy", f"gateway not healthy: {h}"
    log("gateway-health", "PASS", "healthy")

    ids = {}
    for label, agg in AGG.items():
        rows = qjson(
            "SELECT row_to_json(t) FROM (SELECT event_id FROM ping_events"
            f" WHERE metadata->>'aggregate_id'='{agg}' ORDER BY created_at DESC LIMIT 1) t")
        assert rows, f"missing event for aggregate {agg}"
        ids[label] = rows[0]["event_id"]
    log("resolve", "PASS", f"{len(ids)} chain event ids resolved")
    e_replay = ids["E_replay"]

    # ---------- PHASE 14 verification (evidence produced by v5 run) ----------
    m14 = get_mission(M14)
    assert m14 and m14["status"] == "completed", f"replay mission not completed: {m14}"
    log("replay-mission", "PASS", f"M14={M14} status=completed result={str(m14['result'])[:120]}")

    rc_rows = qjson(
        "SELECT row_to_json(t) FROM (SELECT event_id, payload FROM ping_events"
        f" WHERE event_type='REPLAY_COMPLETED' AND payload->>'upstreamEventId'='{e_replay}'"
        " ORDER BY created_at DESC LIMIT 1) t")
    assert rc_rows, "no REPLAY_COMPLETED for the chain replay"
    e_rc = rc_rows[0]["event_id"]
    verified = (rc_rows[0]["payload"] or {}).get("replay", {}).get("verified")
    log("replay-completed", "PASS", f"E_rc={e_rc[:16]} verified={verified}")
    assert verified is True, f"replay not verified: {verified}"

    wit_rows = qjson(
        "SELECT row_to_json(t) FROM (SELECT event_id, payload FROM ping_events"
        f" WHERE event_type='WITNESS_CREATED' AND payload->>'upstreamEventId'='{e_rc}'"
        " ORDER BY created_at DESC LIMIT 1) t")
    assert wit_rows, "no WITNESS_CREATED for the chain replay"
    e_wit = wit_rows[0]["event_id"]
    wdoc = (wit_rows[0]["payload"] or {}).get("documentId")
    watt = ((wit_rows[0]["payload"] or {}).get("witness") or {}).get("attestation")
    log("witness-created", "PASS", f"E_wit={e_wit[:16]} documentId={wdoc} attestation={watt}")
    assert wdoc == N2, f"witness documentId mismatch: {wdoc}"
    log("phase14 COMPLETE", "PASS",
        f"M14={M14} E_rc={e_rc[:16]} verified=True E_wit={e_wit[:16]} attestation={watt}")

    chain = {"correlation_id": CORR, "playbook": "test.verified-operational-response",
             "proposal_event": ids["E_prop"], "playbook_node": N2,
             "approval_event": ids["E_appr"], "activation_event": ids["E_act"],
             "projection_event": ids["E_proj"], "mission_id": M12,
             "outcome_event": ids["E_out"], "revision_node": N3,
             "revision_event": ids["E_rev"], "replay_event": e_replay,
             "replay_mission": M14, "replay_completed": e_rc, "witness": e_wit}
    with open("/tmp/e-chain.json", "w") as f:
        json.dump(chain, f, indent=2)

    # ---------- PHASE 15 ----------
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
    log("durable-node", "PASS" if surv_ok else "FAIL", f"N2 status={n2['status'] if n2 else None}")
    assert surv_ok, "playbook node did not survive restart"
    n3 = get_node(N3)
    rev_ok = (n3 and (n3["data"] or {}).get("decision") == "PENDING_HUMAN"
              and (n3["data"] or {}).get("decided_by") is None)
    log("durable-revision", "PASS" if rev_ok else "FAIL", "N3 still PENDING_HUMAN, decided_by null")
    assert rev_ok, "revision node changed across restart"

    chain_ids = [ids["E_prop"], ids["E_appr"], ids["E_act"], ids["E_proj"],
                 ids["E_out"], ids["E_rev"], e_replay, e_rc, e_wit]
    id_list = ",".join("'" + i + "'" for i in chain_ids)
    n_present = int(qscalar(f"SELECT COUNT(*) FROM ping_events WHERE event_id IN ({id_list})"))
    log("durable-events", "PASS" if n_present == len(chain_ids) else "FAIL",
        f"{n_present}/{len(chain_ids)} chain events present")
    assert n_present == len(chain_ids), "chain events missing after restart"

    for mid, want in [(M12, "completed"), (M14, "completed")]:
        m = get_mission(mid)
        ok = m and m["status"] == want
        log(f"durable-mission-{mid[:8]}", "PASS" if ok else "FAIL", f"status={m['status'] if m else None}")
        assert ok, f"mission {mid} not durable"

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
    log("phase15 COMPLETE", "PASS", "gateway-only restart survived; new work executes")

    with open("/tmp/e-runlog.jsonl", "w") as f:
        for e in LOG:
            f.write(canon(e) + "\n")
    log("ALL PHASES COMPLETE", "PASS",
        f"started={t_start} N2={N2} M12={M12} M14={M14} E_wit={e_wit[:16]}")

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
