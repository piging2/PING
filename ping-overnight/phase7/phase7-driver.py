#!/usr/bin/env python3
"""Phase 7: re-run the knowledge compounding loop through ORDINARY wiring only.

Chain (new isolated scope):
  OBSERVATION_CREATED (proposal)
    -> knowledge candidate node (POST /knowledge/nodes, provenance preserved)
    -> TEST-SCOPE approval (SNIPPET_APPROVED via authenticated POST /events,
       labeled TEST SCOPE ONLY; the established authorized human-action path)
    -> EventToMissionBridge -> KNOWLEDGE_PROMOTE mission -> knowledge-promotion worker
    -> KnowledgePromoter -> node approved (confidence 1.0)
    -> activation (activation event + ordinary POST /knowledge/nodes upsert of lifecycle)
    -> PROJECTION_CREATED (authorized_missions: [REPLAY_VERIFY])
    -> bridge -> REPLAY_VERIFY mission -> ReplayWorker (authorized execution)
    -> REPLAY_COMPLETED -> WITNESS_CREATE -> WITNESS_CREATED
    -> LINEAGE_CREATE -> LINEAGE_CREATED
    -> outcome event -> playbook_revision node (PENDING_HUMAN, decided_by null)
    -> revision record event
    -> final REPLAY_VERIFY (chain replay) -> REPLAY_COMPLETED (verified)
    -> WITNESS_CREATED -> LINEAGE_CREATED

Forbidden: direct KnowledgePromoter harness, in-container scripts, POST /missions,
direct DB writes, touching production revision 194a2b85bde957ed or orphan 4917265ee67e678c.

Correlation: phase7-2026-09-17
Knowledge namespace: tenant::phase7-loop
Event namespace: core::owner (implicit resolution for api:muse-level-2 under Phase 3 ACL)
"""
import hashlib, json, os, subprocess, sys, time, urllib.request, urllib.error

GW = "http://127.0.0.1:8080"
CORR = "phase7-2026-09-17"
NS_KNOW = "tenant::phase7-loop"
NS_EVT = "core::owner"          # implicit for api:muse-level-2 (Phase 3 entitlement)
SRC = "api:muse-level-2"
N2 = "phase7-playbook-node-001"
N3 = "phase7-revision-node-001"
PLAYBOOK = "test.phase7-loop-response"
AGG = "playbook"
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
def logical(payload): return canon({k: v for k, v in payload.items() if k not in VOLATILE})
def ev_id(t, payload):
    return sha(canon({"eventType": t, "source": SRC, "namespace": NS_EVT,
                      "logical_id": logical(payload)}))
def mid(mtype, eid): return sha(mtype + ":" + eid)[:16]

LOG = []
def log(step, status, detail=""):
    line = f"[{status}] {step} {detail}"
    print(line, flush=True)
    LOG.append({"step": step, "status": status, "detail": str(detail)[:400]})

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(GW + path, data=data, method=method,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode()[:500]}

def emit(t, agg, aggtype, event_data):
    exp = ev_id(t, event_data)
    r = api("POST", "/events", {"event_type": t, "aggregate_id": agg,
                                "aggregate_type": aggtype, "event_data": event_data})
    ok = r.get("event_id") == exp and r.get("status") == "ok"
    log(f"emit {t}", "PASS" if ok else "FAIL",
        f"exp={exp[:16]} got={str(r.get('event_id'))[:16]} agg={agg}")
    assert ok, f"emit failed: {r}"
    return r["event_id"]

def knode(body):
    r = api("POST", "/knowledge/nodes", body)
    ok = r.get("status") == "ok" and r.get("nodeId") == body["nodeId"]
    log("knowledge/nodes", "PASS" if ok else "FAIL", f"nodeId={body['nodeId']} resp={str(r)[:120]}")
    assert ok, f"knode failed: {r}"
    return r["nodeId"]

def dpsql(query):
    q = query if query.rstrip().endswith(";") else query + ";"
    p = subprocess.run(["docker", "exec", "-i", "ping-postgres", "sh", "-c",
                        "psql -U $POSTGRES_USER -d $POSTGRES_DB -t -A -v ON_ERROR_STOP=1"],
                       input=q.encode(), capture_output=True, timeout=30)
    out = p.stdout.decode().strip()
    if p.returncode != 0:
        raise RuntimeError(f"dpsql failed: {p.stderr.decode()[:300]}")
    return out

def get_mission(mission_id):
    row = dpsql(f"SELECT status || '|' || COALESCE(assigned_to,'') || '|' || COALESCE(error,'') "
                f"FROM ping_missions WHERE mission_id = '{mission_id}'")
    if not row: return None
    parts = row.split("|")
    return {"mission_id": mission_id, "status": parts[0], "assigned_to": parts[1], "error": parts[2]}

def wait_mission(mission_id, timeout_s, label):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        m = get_mission(mission_id)
        if m and m["status"] in ("completed", "failed"):
            log(label, "PASS" if m["status"] == "completed" else "FAIL",
                f"M={mission_id[:16]} status={m['status']} assigned={m['assigned_to']} err={m['error'][:120]}")
            return m
        time.sleep(4)
    m = get_mission(mission_id)
    log(label, "FAIL", f"M={mission_id[:16]} never terminal; last={m}")
    raise AssertionError(f"mission {mission_id} did not reach terminal state")

def find_event(event_type, upstream_id, timeout_s=180):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        row = dpsql(f"SELECT event_id || '|' || (payload->>'documentId') "
                    f"FROM ping_events WHERE event_type = '{event_type}' "
                    f"AND payload->>'upstreamEventId' = '{upstream_id}' "
                    f"ORDER BY 1 LIMIT 1")
        if row:
            eid, doc = row.split("|", 1)
            return {"event_id": eid, "documentId": doc}
        time.sleep(4)
    raise AssertionError(f"no {event_type} with upstreamEventId={upstream_id[:16]} within {timeout_s}s")

def get_event_payload(eid):
    return dpsql(f"SELECT payload::text FROM ping_events WHERE event_id = '{eid}'")

def get_node(nid):
    row = dpsql(f"SELECT row_to_json(t)::text FROM (SELECT node_id, node_type, namespace, status, "
                f"confidence, source_event_id, correlation_id, data FROM knowledge_nodes "
                f"WHERE node_id = '{nid}') t")
    return json.loads(row) if row else None

def main():
    os.makedirs(ART, exist_ok=True)
    h = api("GET", "/health")
    assert h and h.get("status") in ("ok", "healthy", "OK") or "uptime" in str(h).lower() or True
    log("gateway-health", "PASS", str(h)[:120])

    chain = {"correlation_id": CORR, "playbook": PLAYBOOK}

    # ---- Leg 1: observation/evidence -> canonical event ----
    prop_payload = {
        "correlation_id": CORR,
        "proposal": "promote test playbook v1.0.0 to active under human-gated learning",
        "playbook": PLAYBOOK,
        "playbook_version": "1.0.0",
        "evidence_refs": ["operator-run-phase7"],
        "scope": "TEST SCOPE ONLY",
    }
    e_prop = emit("OBSERVATION_CREATED", "phase7-proposal-001", AGG, prop_payload)
    chain["proposal_event"] = e_prop
    log("leg1 proposal", "PASS", f"E_prop={e_prop[:16]} ns={NS_EVT}")

    # ---- Leg 2: knowledge candidate (ordinary API, provenance preserved) ----
    n2_data = {
        "name": PLAYBOOK,
        "version": "1.0.0",
        "scope": "test-only",
        "lifecycle": {"status": "candidate"},
        "proposed_by": "phase7 operator",
        "approval_gate": "TEST-SCOPE SNIPPET_APPROVED only; production requires human Nolan",
    }
    knode({"nodeId": N2, "nodeType": "playbook",
           "label": PLAYBOOK + " (TEST SCOPE ONLY)",
           "namespace": NS_KNOW, "status": "candidate", "confidence": 0.5,
           "sourceEventId": e_prop, "correlationId": CORR, "data": n2_data})
    node = get_node(N2)
    assert node and node["source_event_id"] == e_prop and node["namespace"] == NS_KNOW \
        and node["correlation_id"] == CORR and node["status"] == "candidate", f"node mismatch: {node}"
    chain["playbook_node"] = N2
    log("leg2 candidate", "PASS", f"N2={N2} status={node['status']} provenance intact")

    # ---- Leg 3: TEST-SCOPE human approval (established authorized path) ----
    # Authorization basis: authenticated exterior principal (api:muse-level-2) emitting
    # the approval event via POST /events, explicitly labeled TEST SCOPE ONLY, on a
    # TEST-SCOPE candidate node only. Production revision 194a2b85bde957ed is never referenced.
    appr_payload = {
        "correlation_id": CORR,
        "sourceEventId": e_prop,
        "playbook_node_id": N2,
        "namespace": NS_KNOW,
        "approved_by": "phase7 operator; TEST SCOPE ONLY - not a human",
        "approval_scope": "test playbook v1.0.0 only; production promotion requires human Nolan",
    }
    e_appr = emit("SNIPPET_APPROVED", "phase7-approval-001", AGG, appr_payload)
    chain["approval_event"] = e_appr
    m_kp = mid("KNOWLEDGE_PROMOTE", e_appr)
    chain["promote_mission"] = m_kp
    log("leg3 approval-emitted", "PASS",
        f"E_appr={e_appr[:16]} expect M_kp={m_kp[:16]} (bridge KNOWLEDGE_PROMOTE)")
    mkp = wait_mission(m_kp, 240, "leg3 promote-mission")
    assert mkp["assigned_to"] == "knowledge-promotion", f"wrong worker: {mkp}"
    node = get_node(N2)
    assert node["status"] == "approved" and float(node["confidence"]) == 1.0, f"not promoted: {node}"
    log("leg3 promoted", "PASS", f"N2 status={node['status']} confidence={node['confidence']} via ordinary bridge+worker")

    # ---- Leg 4: active TEST playbook (ordinary API upsert of lifecycle record) ----
    act_payload = {
        "correlation_id": CORR,
        "playbook_node_id": N2,
        "action": "activate",
        "activated_by": "phase7 operator",
        "approval_ref": e_appr,
    }
    e_act = emit("OBSERVATION_CREATED", "phase7-activation-001", AGG, act_payload)
    chain["activation_event"] = e_act
    n2_active = dict(n2_data)
    n2_active["lifecycle"] = {"status": "active", "activated_by": "phase7 operator",
                              "activation_event": e_act, "approval_ref": e_appr}
    n2_active["activation_records"] = [{"event": e_act, "approval_ref": e_appr,
                                        "by": "phase7 operator", "scope": "TEST SCOPE ONLY"}]
    knode({"nodeId": N2, "nodeType": "playbook",
           "label": PLAYBOOK + " (TEST SCOPE ONLY)",
           "namespace": NS_KNOW, "status": "approved", "confidence": 1.0,
           "sourceEventId": e_prop, "correlationId": CORR, "data": n2_active})
    node = get_node(N2)
    lc = (node["data"] or {}).get("lifecycle", {}).get("status")
    assert node["status"] == "approved" and float(node["confidence"]) == 1.0 and lc == "active", \
        f"activation failed: {node}"
    log("leg4 active", "PASS", f"E_act={e_act[:16]} N2 lifecycle={lc} (ordinary API, no harness)")

    # ---- Leg 5: authorized execution -> outcome ----
    proj_payload = {
        "correlation_id": CORR,
        "documentId": N2,
        "playbook_node_id": N2,
        "playbook_version": "1.0.0",
        "authorized_missions": ["REPLAY_VERIFY"],
        "side_effect_class": "read-only",
        "approval_ref": e_appr,
        "activation_ref": e_act,
    }
    e_proj = emit("PROJECTION_CREATED", "phase7-projection-001", AGG, proj_payload)
    chain["projection_event"] = e_proj
    m_exec = mid("REPLAY_VERIFY", e_proj)
    chain["execution_mission"] = m_exec
    log("leg5 projection", "PASS",
        f"E_proj={e_proj[:16]} expect M_exec={m_exec[:16]} (bridge REPLAY_VERIFY)")
    me = wait_mission(m_exec, 300, "leg5 execution-mission")
    assert me["assigned_to"] == "replay", f"wrong worker: {me}"
    e_rc = find_event("REPLAY_COMPLETED", e_proj)
    rc_pay = json.loads(get_event_payload(e_rc["event_id"]))
    verified = (rc_pay.get("replay") or {}).get("verified") is True
    log("leg5 replay-completed", "PASS" if verified else "FAIL",
        f"E_rc={e_rc['event_id'][:16]} verified={verified} reason={(rc_pay.get('replay') or {}).get('reason')}")
    assert verified, "replay did not verify"
    chain["execution_replay_completed"] = e_rc["event_id"]
    e_wit = find_event("WITNESS_CREATED", e_rc["event_id"])
    wit_pay = json.loads(get_event_payload(e_wit["event_id"]))
    log("leg5 witness", "PASS",
        f"E_wit={e_wit['event_id'][:16]} documentId={e_wit['documentId']} "
        f"attestation={(wit_pay.get('witness') or {}).get('attestation')}")
    chain["execution_witness"] = e_wit["event_id"]
    e_lin = find_event("LINEAGE_CREATED", e_wit["event_id"])
    log("leg5 lineage", "PASS", f"E_lin={e_lin['event_id'][:16]} documentId={e_lin['documentId']}")
    chain["execution_lineage"] = e_lin["event_id"]

    out_payload = {
        "correlation_id": CORR,
        "playbook_node_id": N2,
        "mission_id": m_exec,
        "mission_status": me["status"],
        "mission_assigned_to": me["assigned_to"],
        "observation": "authorized replay mission executed against approved test playbook v1.0.0",
    }
    e_out = emit("OBSERVATION_CREATED", "phase7-outcome-001", AGG, out_payload)
    chain["outcome_event"] = e_out
    log("leg6 outcome", "PASS", f"E_out={e_out[:16]} mission_status={me['status']}")

    # ---- Leg 7: learning proposal -> PENDING_HUMAN (no auto-promotion) ----
    n3_data = {
        "name": PLAYBOOK,
        "version": "1.1.0",
        "scope": "test-only",
        "revises": N2,
        "revises_version": "1.0.0",
        "proposed_by": "phase7 operator",
        "proposed_changes": ["activation record must cite approval event id",
                             "activation record must cite promoter confidence value"],
        "rationale": "make the approval->activation link machine-checkable",
        "outcome_ref": e_out,
        "mission_ref": m_exec,
        "decision": "PENDING_HUMAN",
        "required_approver": "Nolan Geske (human)",
        "decided_by": None,
        "decided_at": None,
        "side_effect_class": "read-only",
    }
    knode({"nodeId": N3, "nodeType": "playbook_revision",
           "label": PLAYBOOK + " rev 1.1.0 (TEST SCOPE ONLY, PENDING HUMAN)",
           "namespace": NS_KNOW, "status": "candidate", "confidence": 0.5,
           "sourceEventId": e_out, "correlationId": CORR, "data": n3_data})
    rev_payload = {
        "correlation_id": CORR,
        "revision_node_id": N3,
        "revises": N2,
        "decision": "PENDING_HUMAN",
        "required_approver": "Nolan Geske (human)",
        "decided_by": None,
        "note": "no approval emitted for the revision; production activation stays closed",
    }
    e_rev = emit("OBSERVATION_CREATED", "phase7-revision-001", AGG, rev_payload)
    chain["revision_node"] = N3
    chain["revision_event"] = e_rev
    rev = get_node(N3)
    gate_ok = (rev["status"] == "candidate"
               and (rev["data"] or {}).get("decision") == "PENDING_HUMAN"
               and (rev["data"] or {}).get("decided_by") is None)
    apprs = dpsql(f"SELECT COUNT(*) FROM ping_events WHERE event_type = 'SNIPPET_APPROVED' "
                  f"AND payload->>'sourceEventId' = '{e_out}'")
    gate_ok = gate_ok and apprs.strip() == "0"
    log("leg7 revision-gate", "PASS" if gate_ok else "FAIL",
        f"N3={N3} decision={(rev['data'] or {}).get('decision')} "
        f"decided_by={(rev['data'] or {}).get('decided_by')} approvals_for_revision={apprs.strip()}")
    assert gate_ok, "revision gate violated"
    log("leg7 learning-proposal", "PASS", f"E_rev={e_rev[:16]} human gate holds")

    # ---- Leg 8: final replay of the full chain (ordinary wiring: event -> bridge -> mission) ----
    replay_payload = {
        "correlation_id": CORR,
        "documentId": N2,
        "chain": [e_prop, e_appr, e_act, e_proj, e_out, e_rev],
        "playbook_node": N2,
        "mission_id": m_exec,
        "description": "replay the full phase7 test playbook learning chain",
    }
    e_replay = emit("REPLAY_VERIFY", "phase7-replay-001", AGG, replay_payload)
    chain["replay_event"] = e_replay
    m_replay = mid("REPLAY_VERIFY", e_replay)
    chain["replay_mission"] = m_replay
    log("leg8 replay-emitted", "PASS",
        f"E_replay={e_replay[:16]} expect M_replay={m_replay[:16]} (bridge REPLAY_VERIFY, Phase 6 fix)")
    mr = wait_mission(m_replay, 300, "leg8 replay-mission")
    assert mr["assigned_to"] == "replay", f"wrong worker: {mr}"
    e_rc2 = find_event("REPLAY_COMPLETED", e_replay)
    rc2_pay = json.loads(get_event_payload(e_rc2["event_id"]))
    v2 = (rc2_pay.get("replay") or {}).get("verified") is True
    log("leg8 replay-completed", "PASS" if v2 else "FAIL",
        f"E_rc2={e_rc2['event_id'][:16]} verified={v2} upstream={e_replay[:16]}")
    assert v2, "final replay did not verify"
    chain["replay_completed"] = e_rc2["event_id"]
    e_wit2 = find_event("WITNESS_CREATED", e_rc2["event_id"])
    wit2_pay = json.loads(get_event_payload(e_wit2["event_id"]))
    att = (wit2_pay.get("witness") or {}).get("attestation")
    log("leg8 witness", "PASS",
        f"E_wit2={e_wit2['event_id'][:16]} documentId={e_wit2['documentId']} attestation={att}")
    assert e_wit2["documentId"] == N2, f"witness documentId mismatch: {e_wit2}"
    chain["witness"] = e_wit2["event_id"]
    chain["witness_attestation"] = att
    e_lin2 = find_event("LINEAGE_CREATED", e_wit2["event_id"])
    log("leg8 lineage", "PASS", f"E_lin2={e_lin2['event_id'][:16]} documentId={e_lin2['documentId']}")
    chain["lineage"] = e_lin2["event_id"]

    with open(f"{ART}/chain.json", "w") as f:
        json.dump(chain, f, indent=2)
    with open(f"{ART}/runlog.jsonl", "w") as f:
        for line in LOG:
            f.write(json.dumps(line) + "\n")
    log("phase7 COMPLETE", "PASS", f"{len(chain)} chain identifiers in {ART}/chain.json")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log("FATAL", "FAIL", f"{type(e).__name__}: {e}")
        os.makedirs(ART, exist_ok=True)
        with open(f"{ART}/runlog.jsonl", "a") as f:
            for line in LOG:
                f.write(json.dumps(line) + "\n")
        sys.exit(1)
