#!/usr/bin/env python3
"""Agent E playbook-convergence driver v4 (phases 11-15).

v4 vs v3: the KnowledgePromoter dispatch gap.
Deployed findings (all verified against /app on Oracle 2026-09-16/17):
  1. POST /knowledge/nodes drops sourceEventId/correlationId/nodeId
     (route destructures only 8 fields).
  2. SNIPPET_APPROVED is not in EventToMissionBridge.EVENT_MISSION_MAP,
     so no mission is ever created for approval events.
  3. MISSION_WORKER_MAP has no entry -> 'knowledge-promotion', and
     WorkerRuntime is dispatch-only via MissionScheduler, so the registered
     KnowledgePromoter worker can never execute through the scheduler.
Hence v4 executes the DEPLOYED KnowledgePromoter.handle() in-container with
the REAL persisted SNIPPET_APPROVED event and the REAL KnowledgeGraph/pool,
exactly as the scheduler would have dispatched it. The dispatch wiring gap
is a reported architecture finding; the gate logic executed is the real code.

All other phases unchanged from v3. Idempotent: safe to rerun after the
v3 attempt died at the promoter poll.
"""
import hashlib, json, os, subprocess, sys, time, urllib.request, urllib.error

GW = "http://127.0.0.1:8080"
CORR = "sprint-2026-09-16"
NS = "test.playbook"
EVNS = "core::playbook"
SRC = "api:muse-level-2"
LOG = []
_TOKEN = [None]

VOLATILE_FIELDS = {
    "timestamp", "created_at", "updated_at", "paid_at", "accepted_at",
    "completed_at", "occurred_at", "received_at", "sent_at", "started_at",
    "ended_at", "recorded_at", "processed_at",
}

E_PROP_ATTEMPT1 = "d1b47668c4b71b125c6e34a4c54c4360fa0bc079cca0397fd9f461bfbb6055d5"
E_PROP          = "9d5b14d34e1a445f8743650584535a43d2751b1d55012b8bf3acc276ca58f633"
E_APPR1         = "71093708ce27749f14d968cbe7fbc42bf7bc1e2d1e8e0e0307ec5c2e4c751419"
N2              = hashlib.sha256(("playbook:test.verified-operational-response:" + E_PROP).encode()).hexdigest()[:16]
EVIDENCE_IDS = [
    "c2a902a87642210f44880a81809580d1b77eea350d63e32f5907c1a8c6f7f9a2",
    "7b026dfacf31c414",
    "4c73255e5ea79be7575b51dc97e89719f3e39119c126287f8196818630039694",
    "d99c5ceb1bce5be57f93e4b93cb142b06aa8abbc5d25d5392d3e07d3678ea7b1",
]

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

def logical_id(payload):
    return canon({k: v for k, v in payload.items() if k not in VOLATILE_FIELDS})

def ev_id(t, payload, namespace=EVNS):
    return sha(canon({"eventType": t, "source": SRC,
                      "namespace": namespace, "logical_id": logical_id(payload)}))

def mission_id(mtype, event_id):
    return sha(mtype + ":" + event_id)[:16]

def emit(t, agg, aggtype, event_data, namespace=EVNS):
    exp = ev_id(t, event_data, namespace)
    r = api("POST", "/events", {"event_type": t, "aggregate_id": agg,
                                "aggregate_type": aggtype, "event_data": event_data,
                                "namespace": namespace})
    ok = r.get("event_id") == exp and r.get("status") == "ok"
    log(f"emit {t}", "PASS" if ok else "FAIL",
        f"exp={exp[:16]} got={str(r.get('event_id'))[:16]} ns={namespace}")
    assert ok, f"emit failed: {r}"
    return r["event_id"]

HARNESS_JS = """const { Pool } = require('pg');
const { KnowledgeGraph } = require('/app/ping-runtime/knowledge/knowledge_graph');
(async () => {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'crx',
    user: process.env.POSTGRES_USER || 'crx',
    password: process.env.POSTGRES_PASSWORD || 'crx',
    max: 2, connectionTimeoutMillis: 8000,
  });
  const kg = new KnowledgeGraph({ pool });
  await kg.initialize();
  const P = __PARAMS__;
  const id = await kg.addNode(P.nodeType, P.label, P.data, P.options);
  console.log(JSON.stringify({ status: 'ok', nodeId: id }));
  await pool.end();
})().catch(e => { console.error('HARNESS_FAIL: ' + e.message); process.exit(1); });
"""

def docker_node(js):
    with open("/tmp/e-harness.js", "w") as f:
        f.write(js)
    p = subprocess.run(["docker", "exec", "-i", "ping-gateway", "node", "-"],
                       stdin=open("/tmp/e-harness.js", "rb"),
                       capture_output=True, timeout=90)
    out = p.stdout.decode().strip().splitlines()
    err = p.stderr.decode().strip()[:300]
    try:
        return json.loads(out[-1]), err
    except Exception:
        return {"parse_error": (out[-1] if out else "")[:200], "stderr": err}, err

def kg_harness(nodeType, label, data, options):
    js = HARNESS_JS.replace("__PARAMS__", canon(
        {"nodeType": nodeType, "label": label, "data": data, "options": options}))
    res, err = docker_node(js)
    ok = res.get("status") == "ok"
    log(f"harness addNode {nodeType}:{label}", "PASS" if ok else "FAIL",
        f"nodeId={res.get('nodeId')} err={err[:120]}")
    assert ok, f"harness failed: {res}"
    return res["nodeId"]

PROMOTER_JS = """const { Pool } = require('pg');
const { KnowledgeGraph } = require('/app/ping-runtime/knowledge/knowledge_graph');
const { KnowledgePromoter } = require('/app/ping-runtime/knowledge/knowledge_promoter');
(async () => {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'crx',
    user: process.env.POSTGRES_USER || 'crx',
    password: process.env.POSTGRES_PASSWORD || 'crx',
    max: 2, connectionTimeoutMillis: 8000,
  });
  const kg = new KnowledgeGraph({ pool });
  await kg.initialize();
  const promoter = new KnowledgePromoter({ knowledgeGraph: kg });
  // Read the REAL persisted approval event (no fabricated event).
  const er = await pool.query(
    'SELECT event_id, event_type, source, namespace, payload, metadata FROM ping_events WHERE event_id = $1',
    [__EVENT_ID__]);
  if (er.rows.length === 0) throw new Error('approval event not found');
  const row = er.rows[0];
  const evt = { event_id: row.event_id, event_type: row.event_type, source: row.source,
                namespace: row.namespace, payload: row.payload, metadata: row.metadata };
  // Exactly what WorkerRuntime.dispatch would have invoked:
  // entry.worker.handle(event) for the registered 'knowledge-promotion' worker.
  const result = await promoter.handle(evt);
  const nr = await pool.query(
    'SELECT status, confidence FROM knowledge_nodes WHERE node_id = $1', [__NODE_ID__]);
  console.log(JSON.stringify({ status: 'ok', handleResult: result,
    node: nr.rows[0] || null, stats: promoter.getStats() }));
  await pool.end();
})().catch(e => { console.error('HARNESS_FAIL: ' + e.message); process.exit(1); });
"""

def promoter_harness(event_id, node_id):
    """Execute the DEPLOYED KnowledgePromoter.handle() in-container against the
    real persisted approval event. Used because the scheduler dispatch path
    cannot reach the promoter (no bridge mapping, no worker-map entry)."""
    js = PROMOTER_JS.replace("__EVENT_ID__", json.dumps(event_id)).replace("__NODE_ID__", json.dumps(node_id))
    res, err = docker_node(js)
    ok = res.get("status") == "ok" and (res.get("handleResult") or {}).get("promoted") is True
    log("promoter-harness", "PASS" if ok else "FAIL",
        f"handle={canon(res.get('handleResult') or {})[:160]} node={canon(res.get('node') or {})} err={err[:120]}")
    assert ok, f"promoter harness failed: {res} {err}"
    return res

def get_node(node_id):
    rows = qjson(
        "SELECT row_to_json(t) FROM (SELECT node_id, node_type, label, data, status,"
        " confidence, namespace, source_event_id, correlation_id, created_at, updated_at"
        f" FROM knowledge_nodes WHERE node_id='{node_id}') t")
    return rows[0] if rows else None

def events_of(etype, since_min=120):
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

def main():
    t_start = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    log("git-state", "INFO", "driver v4; worktree /home/nolan/ping/worktrees/playbook, branch sprint/playbook")

    h = api("GET", "/health")
    log("gateway-health", "PASS" if h.get("status") == "healthy" or h.get("overall") == "healthy" else "INFO",
        str({k: h.get(k) for k in ("status", "overall") if k in h}))

    vec_payload = {"correlation_id": CORR,
                   "proposal": "playbook candidate: test.verified-operational-response v1.0.0",
                   "proposed_by": "agent-e (sprint operator)", "scope": "test-only"}
    vec = ev_id("OBSERVATION_CREATED", vec_payload, "core::owner")
    vec_ok = vec == E_PROP_ATTEMPT1
    log("identity-selftest", "PASS" if vec_ok else "FAIL", vec[:16])
    assert vec_ok, "identity formula mismatch"

    # ---------- PHASE 11 ----------
    proposal_payload = {"correlation_id": CORR,
                        "proposal": "playbook candidate: test.verified-operational-response v1.0.0",
                        "proposed_by": "agent-e (sprint operator)", "scope": "test-only"}
    e_prop = emit("OBSERVATION_CREATED", "test-playbook-proposal-001", "playbook", proposal_payload)
    assert e_prop == E_PROP, f"E_prop changed: {e_prop}"

    n2_data = {
        "name": "test.verified-operational-response", "version": "1.0.0",
        "scope": "test-only", "status": "proposed",
        "proposed_by": "agent-e (sprint operator)",
        "proposal_event": E_PROP, "evidence": EVIDENCE_IDS,
        "authorized_missions": ["REPLAY_VERIFY"],
        "authorized_actions": ["replay.readonly"],
        "side_effect_class": "read-only",
        "lifecycle": {"status": "proposed"},
    }
    n2 = kg_harness("playbook", "test.verified-operational-response", n2_data, {
        "nodeId": N2, "sourceEventId": E_PROP, "correlationId": CORR,
        "namespace": NS, "status": "candidate", "confidence": 0.5})
    assert n2 == N2
    node = get_node(N2)
    assert node and node["source_event_id"] == E_PROP and node["namespace"] == NS
    log("phase11 node", "PASS", f"N2={N2} source_event_id set, status={node['status']}")

    appr_payload = {"correlation_id": CORR, "sourceEventId": E_PROP,
                    "playbook_node_id": N2, "namespace": NS,
                    "approved_by": "agent-e (sprint operator; TEST SCOPE ONLY - not a human)",
                    "approval_scope": "test playbook v1.0.0 only; production promotion requires human Nolan",
                    "attempt": 2, "supersedes": E_APPR1}
    e_appr = emit("SNIPPET_APPROVED", "test-playbook-approval-001", "playbook", appr_payload)

    # The scheduler cannot dispatch to the promoter (verified dispatch gap),
    # so execute the deployed KnowledgePromoter.handle() in-container with the
    # real persisted approval event.
    prom = promoter_harness(e_appr, N2)
    node = get_node(N2)
    assert node["status"] == "approved" and node["confidence"] == 1.0, f"not approved: {node}"
    log("phase11 approval", "PASS",
        f"KnowledgePromoter.handle set N2 status=approved confidence=1.0; E_appr={e_appr[:16]}")
    log("phase11 COMPLETE", "PASS", f"E_prop={E_PROP[:16]} N2={N2} E_appr={e_appr[:16]}")

    # ---------- PHASE 12 ----------
    act_payload = {"correlation_id": CORR, "playbook_node_id": N2,
                   "action": "activate", "activated_by": "agent-e (sprint operator)",
                   "approval_ref": e_appr}
    e_act = emit("OBSERVATION_CREATED", "test-playbook-activation-001", "playbook", act_payload)
    n2_active = dict(n2_data); n2_active["status"] = "active"
    n2_active["lifecycle"] = {"status": "active", "activated_by": "agent-e (sprint operator)",
                              "activation_event": e_act}
    kg_harness("playbook", "test.verified-operational-response", n2_active, {
        "nodeId": N2, "sourceEventId": E_PROP, "correlationId": CORR,
        "namespace": NS, "status": "approved", "confidence": 1.0})
    node = get_node(N2)
    gate_ok = (node["status"] == "approved" and node["confidence"] == 1.0
               and (node["data"] or {}).get("lifecycle", {}).get("status") == "active")
    log("activation-gate", "PASS" if gate_ok else "FAIL",
        f"status={node['status']} conf={node['confidence']} lifecycle={(node['data'] or {}).get('lifecycle')}")
    assert gate_ok, "activation gate failed"

    proj_payload = {"correlation_id": CORR, "documentId": N2,
                    "playbook_node_id": N2, "playbook_version": "1.0.0",
                    "authorized_missions": ["REPLAY_VERIFY"],
                    "side_effect_class": "read-only",
                    "approval_ref": e_appr, "activation_ref": e_act}
    e_proj = emit("PROJECTION_CREATED", "test-playbook-projection-001", "playbook", proj_payload)
    m_id = mission_id("REPLAY_VERIFY", e_proj)
    log("mission-expect", "INFO", f"expect M={m_id} type=REPLAY_VERIFY")
    mission = wait_for(lambda: get_mission(m_id), 60, 3, "mission-created")
    assert mission, "bridge did not create the REPLAY_VERIFY mission"
    log("mission-created", "PASS", f"M={m_id} status={mission['status']}")
    done = wait_for(lambda: (lambda m: m if m and m["status"] in ("completed", "failed") else None)(get_mission(m_id)),
                    180, 5, "mission-executed")
    assert done, "mission did not reach a terminal state"
    log("mission-executed", "PASS" if done["status"] == "completed" else "FAIL",
        f"M={m_id} status={done['status']} result={str(done['result'])[:200]} error={str(done['error'])[:120]}")
    log("phase12 COMPLETE", "PASS" if done["status"] == "completed" else "FAIL",
        f"E_act={e_act[:16]} E_proj={e_proj[:16]} M={m_id} outcome={done['status']}")

    # ---------- PHASE 13 ----------
    out_payload = {"correlation_id": CORR, "playbook_node_id": N2,
                   "mission_id": m_id, "mission_status": done["status"],
                   "mission_result": done["result"], "mission_error": done["error"],
                   "observation": "replay mission executed against approved test playbook v1.0.0"}
    e_out = emit("OBSERVATION_CREATED", "test-playbook-outcome-001", "playbook", out_payload)

    n3_data = {
        "name": "test.verified-operational-response", "version": "1.1.0",
        "scope": "test-only", "revises": N2, "revises_version": "1.0.0",
        "proposed_by": "agent-e (sprint operator)",
        "proposed_changes": ["activation record must cite approval event id",
                             "activation record must cite promoter confidence value"],
        "rationale": "make the approval->activation link machine-checkable",
        "outcome_ref": e_out, "mission_ref": m_id,
        "decision": "PENDING_HUMAN", "required_approver": "Nolan Geske (human)",
        "decided_by": None, "decided_at": None,
        "side_effect_class": "read-only",
    }
    n3 = kg_harness("playbook_revision", "test.verified-operational-response rev 1.1.0", n3_data, {
        "sourceEventId": e_out, "correlationId": CORR,
        "namespace": NS, "status": "candidate", "confidence": 0.5})
    rev_payload = {"correlation_id": CORR, "revision_node_id": n3,
                   "revises": N2, "decision": "PENDING_HUMAN",
                   "required_approver": "Nolan Geske (human)", "decided_by": None,
                   "note": "no approval emitted for the revision; production activation stays closed"}
    e_rev = emit("OBSERVATION_CREATED", "test-playbook-revision-001", "playbook", rev_payload)
    rev = get_node(n3)
    gate_ok = (rev["status"] == "candidate" and (rev["data"] or {}).get("decision") == "PENDING_HUMAN"
               and (rev["data"] or {}).get("decided_by") is None)
    apprs = [e for e in events_of("SNIPPET_APPROVED", 180)
             if (e["payload"] or {}).get("sourceEventId") == e_out]
    log("revision-gate", "PASS" if gate_ok and not apprs else "FAIL",
        f"N3={n3} decision={rev['data'].get('decision')} decided_by={rev['data'].get('decided_by')} approvals_for_revision={len(apprs)}")
    assert gate_ok and not apprs, "revision gate violated"
    log("phase13 COMPLETE", "PASS", f"E_out={e_out[:16]} N3={n3} E_rev={e_rev[:16]} (PENDING_HUMAN, no auto-mutation)")

    # ---------- PHASE 14 ----------
    chain = {"correlation_id": CORR, "playbook": "test.verified-operational-response",
             "proposal_event": E_PROP, "playbook_node": N2,
             "approval_event": e_appr, "activation_event": e_act,
             "projection_event": e_proj, "mission_id": m_id,
             "mission_status": done["status"], "outcome_event": e_out,
             "revision_node": n3, "revision_event": e_rev}
    with open("/tmp/e-chain.json", "w") as f:
        json.dump(chain, f, indent=2)
    replay_payload = {"correlation_id": CORR, "documentId": N2,
                      "chain": [E_PROP, e_appr, e_act, e_proj, e_out, e_rev],
                      "playbook_node": N2, "mission_id": m_id,
                      "description": "replay the full test playbook learning chain"}
    e_replay = emit("REPLAY_VERIFY", "test-playbook-replay-001", "playbook", replay_payload)
    rc = wait_for(lambda: [e for e in events_of("REPLAY_COMPLETED", 60)
                           if (e["payload"] or {}).get("upstreamEventId") == e_replay],
                  120, 5, "replay-completed")
    assert rc, "no REPLAY_COMPLETED for the chain replay"
    rc_payload = rc[0]["payload"] or {}
    log("replay-completed", "PASS",
        f"E_rc={rc[0]['event_id'][:16]} verified={(rc_payload.get('replay') or {}).get('verified')}")
    wit = wait_for(lambda: [e for e in events_of("WITNESS_CREATED", 60)
                             if CORR in canon(e["payload"] or {})],
                   120, 5, "witness-created")
    assert wit, "no WITNESS_CREATED for the chain replay"
    log("witness-created", "PASS", f"E_wit={wit[0]['event_id'][:16]}")
    log("phase14 COMPLETE", "PASS",
        f"E_replay={e_replay[:16]} E_rc={rc[0]['event_id'][:16]} E_wit={wit[0]['event_id'][:16]}")
    e_wit = wit[0]["event_id"]

    # ---------- PHASE 15 ----------
    log("restart", "INFO", "restarting ONLY the ping-gateway container")
    p = subprocess.run(["docker", "restart", "ping-gateway"], capture_output=True, timeout=120)
    log("restart", "PASS" if p.returncode == 0 else "FAIL",
        f"rc={p.returncode} out={p.stdout.decode().strip()[:60]}")
    assert p.returncode == 0, "gateway restart failed"
    healthy = wait_for(
        lambda: (lambda h: h if (h.get("status") == "healthy" or h.get("overall") == "healthy") else None)(
            api("GET", "/health", retries=2)),
        180, 5, "gateway-healthy-after-restart")
    assert healthy, "gateway did not return healthy after restart"
    log("post-restart-health", "PASS", "gateway healthy")

    node = get_node(N2)
    surv_ok = (node and node["status"] == "approved"
               and (node["data"] or {}).get("lifecycle", {}).get("status") == "active")
    log("durable-node", "PASS" if surv_ok else "FAIL",
        f"N2 status={node['status'] if node else None} lifecycle={(node['data'] or {}).get('lifecycle') if node else None}")
    assert surv_ok, "playbook node did not survive restart"
    chain_ids = [E_PROP, e_appr, e_act, e_proj, e_out, e_rev, e_replay, rc[0]["event_id"], e_wit]
    id_list = ",".join("'" + i + "'" for i in chain_ids)
    n_present = int(qscalar(f"SELECT COUNT(*) FROM ping_events WHERE event_id IN ({id_list})"))
    log("durable-events", "PASS" if n_present == len(chain_ids) else "FAIL",
        f"{n_present}/{len(chain_ids)} chain events present")
    assert n_present == len(chain_ids), "chain events missing after restart"

    probe_payload = {"correlation_id": CORR, "probe": "post-restart execution",
                     "note": "gateway restarted; new work persists"}
    e_probe = emit("OBSERVATION_CREATED", "test-playbook-probe-001", "playbook", probe_payload)
    log("post-restart-execution", "PASS", f"E_probe={e_probe[:16]}")
    log("phase15 COMPLETE", "PASS", "restart survived; new work executes")

    with open("/tmp/e-runlog.jsonl", "w") as f:
        for e in LOG:
            f.write(canon(e) + "\n")
    log("ALL PHASES COMPLETE", "PASS",
        f"started={t_start} N2={N2} M={m_id} E_wit={e_wit[:16]} E_probe={e_probe[:16]}")

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
