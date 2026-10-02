"""Phase 12 full-certification driver: ordinary-wiring probes on live Oracle.

Legs: L1 auth matrix, L2 deterministic identity, L4 registry, L6 JS mission,
L9 knowledge promotion, L10 direct REPLAY_VERIFY + idempotency,
L11 replay of completed mission, L12 witness, L13 lineage,
L15 credential-health probe, plus do-not-touch verifications.
Correlation: phase12-2026-09-17. Event namespace: core::owner (implicit/explicit).
Knowledge node namespace: tenant::phase12-knowledge (node data only).
Tokens come from env P12_Bearer <redacted> (api:muse-level-2) and P12_BEARER2 (api:muse).
"""
import hashlib, json, os, subprocess, sys, time, urllib.request, urllib.error

GW = "http://127.0.0.1:8080"
CORR = "phase12-2026-09-17"
NS_EVT = "core::owner"
NS_KNOW = "tenant::phase12-knowledge"
SRC_ML2 = "api:muse-level-2"
SRC_MUSE = "api:muse"
T1 = os.environ.get("P12_BEARER", "")
T2 = os.environ.get("P12_BEARER2", "")
if not T1 or not T2:
    print("FATAL: P12_Bearer <redacted> and P12_BEARER2 must be set", flush=True)
    sys.exit(2)

VOLATILE = {"timestamp", "created_at", "updated_at", "paid_at", "accepted_at",
            "completed_at", "occurred_at", "received_at", "sent_at", "started_at",
            "ended_at", "recorded_at", "processed_at"}

def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def canon(o): return json.dumps(o, separators=(",", ":"), ensure_ascii=True)
def logical(payload): return canon({k: v for k, v in payload.items() if k not in VOLATILE})
def ev_id(t, source, ns, payload):
    return sha(canon({"eventType": t, "source": source, "namespace": ns,
                      "logical_id": logical(payload)}))
def mid(mtype, eid): return sha(mtype + ":" + eid)[:16]

PASS = 0
FAIL = 0
LOG = []
def log(step, status, detail=""):
    global PASS, FAIL
    line = f"[{status}] {step} {detail}"
    print(line, flush=True)
    if status == "PASS": PASS += 1
    elif status == "FAIL": FAIL += 1
    LOG.append({"step": step, "status": status, "detail": str(detail)[:400]})

def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(GW + path, data=data, method=method,
        headers={"Content-Type": "application/json",
                 "Authorization": "Bearer " + (token if token is not None else T1)})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return {"code": r.status, "body": json.loads(r.read().decode())}
    except urllib.error.HTTPError as e:
        return {"code": e.code, "body": e.read().decode()[:500]}

def emit(t, agg, aggtype, event_data, token=None, source=SRC_ML2, namespace=None):
    body = {"event_type": t, "aggregate_id": agg, "aggregate_type": aggtype,
            "event_data": event_data}
    if namespace is not None:
        body["namespace"] = namespace
    ns_used = namespace if namespace is not None else NS_EVT
    exp = ev_id(t, source, ns_used, event_data)
    r = api("POST", "/events", body, token=token)
    ok = r["code"] == 200 and isinstance(r["body"], dict) \
        and r["body"].get("event_id") == exp and r["body"].get("status") == "ok"
    log(f"emit {t}", "PASS" if ok else "FAIL",
        f"exp={exp[:16]} got={str(r['body'].get('event_id') if isinstance(r['body'], dict) else r['body'])[:16]} code={r['code']}")
    assert ok, f"emit failed: {r}"
    return r["body"]["event_id"]

def knode(body):
    r = api("POST", "/knowledge/nodes", body)
    ok = isinstance(r["body"], dict) and r["body"].get("status") == "ok" \
        and r["body"].get("nodeId") == body["nodeId"]
    log("knowledge/nodes", "PASS" if ok else "FAIL",
        f"nodeId={body['nodeId']} code={r['code']} resp={str(r['body'])[:120]}")
    assert ok, f"knode failed: {r}"
    return r["body"]["nodeId"]

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
    row = dpsql(f"SELECT status || '|' || COALESCE(assigned_to,'') || '|' || COALESCE(retries::text,'')"
                f" FROM ping_missions WHERE mission_id = '{mission_id}'")
    if not row: return None
    parts = row.split("|")
    return {"mission_id": mission_id, "status": parts[0], "assigned_to": parts[1],
            "retries": parts[2]}

def wait_mission(mission_id, timeout_s, label):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        m = get_mission(mission_id)
        if m and m["status"] in ("completed", "failed"):
            log(label, "PASS" if m["status"] == "completed" else "FAIL",
                f"M={mission_id[:16]} status={m['status']} assigned={m['assigned_to']} retries={m['retries']}")
            return m
        time.sleep(4)
    m = get_mission(mission_id)
    log(label, "FAIL", f"M={mission_id[:16]} never terminal; last={m}")
    raise AssertionError(f"mission {mission_id} did not reach terminal state")

def find_event(event_type, upstream_id, timeout_s=180):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        row = dpsql(f"SELECT event_id || '|' || COALESCE(payload->>'documentId','')"
                    f" FROM ping_events WHERE event_type = '{event_type}'"
                    f" AND payload->>'upstreamEventId' = '{upstream_id}'"
                    f" ORDER BY 1 LIMIT 1")
        if row:
            eid, doc = row.split("|", 1)
            return {"event_id": eid, "documentId": doc}
        time.sleep(4)
    raise AssertionError(f"no {event_type} with upstreamEventId={upstream_id[:16]} within {timeout_s}s")

def event_payload(eid):
    return json.loads(dpsql(f"SELECT payload::text FROM ping_events WHERE event_id = '{eid}'"))

def get_node(nid):
    row = dpsql(f"SELECT row_to_json(t)::text FROM (SELECT node_id, node_type, namespace, status,"
                f" confidence, source_event_id, correlation_id, data FROM knowledge_nodes"
                f" WHERE node_id = '{nid}') t")
    return json.loads(row) if row else None

def main():
    chain = {"correlation_id": CORR}
    h = api("GET", "/health")
    log("gateway-health", "PASS" if h["code"] == 200 else "FAIL", f"code={h['code']}")

    # ============ L1: /events authorization matrix ============
    # 1. invalid token -> 401
    r = api("POST", "/events", {"event_type": "OBSERVATION_CREATED", "aggregate_id": "x",
            "aggregate_type": "t", "event_data": {"correlation_id": CORR}}, token="Bearer <redacted>")
    log("L1 invalid-token", "PASS" if r["code"] == 401 else "FAIL", f"code={r['code']}")
    assert r["code"] == 401, f"expected 401, got {r['code']}"
    # 2. malformed namespace -> 403
    r = api("POST", "/events", {"event_type": "OBSERVATION_CREATED", "aggregate_id": "x",
            "aggregate_type": "t", "namespace": "test.rotation",
            "event_data": {"correlation_id": CORR}}, token=T2)
    log("L1 malformed-ns", "PASS" if r["code"] == 403 else "FAIL", f"code={r['code']}")
    assert r["code"] == 403, f"expected 403, got {r['code']}"
    # 3. muse + explicit core::owner -> 200, predicted id, persisted ns
    p3 = {"correlation_id": CORR, "probe": "l1-muse-owner"}
    e3 = emit("OBSERVATION_CREATED", "phase12-l1-003", "probe", p3, token=T2,
              source=SRC_MUSE, namespace="core::owner")
    ns3 = dpsql(f"SELECT namespace FROM ping_events WHERE event_id = '{e3}'")
    log("L1 muse+owner", "PASS" if ns3 == "core::owner" else "FAIL", f"E={e3[:16]} ns={ns3}")
    assert ns3 == "core::owner"
    chain["l1_muse_owner"] = e3
    # 4. muse + explicit tenant::hpp -> denied
    r = api("POST", "/events", {"event_type": "OBSERVATION_CREATED", "aggregate_id": "x",
            "aggregate_type": "t", "namespace": "tenant::hpp",
            "event_data": {"correlation_id": CORR}}, token=T2)
    log("L1 muse+hpp-denied", "PASS" if r["code"] in (400, 403) else "FAIL", f"code={r['code']}")
    assert r["code"] in (400, 403), f"expected denial, got {r['code']}"
    # 5. muse-level-2 + explicit core::owner -> 200, predicted id
    p5 = {"correlation_id": CORR, "probe": "l1-ml2-owner"}
    e5 = emit("OBSERVATION_CREATED", "phase12-l1-005", "probe", p5, token=T1,
              source=SRC_ML2, namespace="core::owner")
    ns5 = dpsql(f"SELECT namespace FROM ping_events WHERE event_id = '{e5}'")
    log("L1 ml2+owner", "PASS" if ns5 == "core::owner" else "FAIL", f"E={e5[:16]} ns={ns5}")
    assert ns5 == "core::owner"
    chain["l1_ml2_owner"] = e5
    # 6. muse-level-2 + explicit tenant::hpp -> denied
    r = api("POST", "/events", {"event_type": "OBSERVATION_CREATED", "aggregate_id": "x",
            "aggregate_type": "t", "namespace": "tenant::hpp",
            "event_data": {"correlation_id": CORR}}, token=T1)
    log("L1 ml2+hpp-denied", "PASS" if r["code"] in (400, 403) else "FAIL", f"code={r['code']}")
    assert r["code"] in (400, 403), f"expected denial, got {r['code']}"
    # 7. implicit namespace -> persisted as core::owner
    p7 = {"correlation_id": CORR, "probe": "l1-implicit"}
    e7 = emit("OBSERVATION_CREATED", "phase12-l1-007", "probe", p7)
    ns7 = dpsql(f"SELECT namespace FROM ping_events WHERE event_id = '{e7}'")
    log("L1 implicit-ns", "PASS" if ns7 == "core::owner" else "FAIL", f"E={e7[:16]} ns={ns7}")
    assert ns7 == "core::owner"
    # 8. idempotent replay -> same event id, single row
    r = api("POST", "/events", {"event_type": "OBSERVATION_CREATED",
            "aggregate_id": "phase12-l1-007", "aggregate_type": "probe", "event_data": p7})
    same = isinstance(r["body"], dict) and r["body"].get("event_id") == e7
    cnt = dpsql(f"SELECT COUNT(*) FROM ping_events WHERE event_id = '{e7}'")
    log("L1 idempotent-replay", "PASS" if same and cnt == "1" else "FAIL",
        f"same_id={same} rows={cnt}")
    assert same and cnt == "1"

    # ============ L2: deterministic identity (fresh event) ============
    p2 = {"correlation_id": CORR, "probe": "l2-identity",
          "note": "phase12 known-vector recomputation"}
    e2 = emit("OBSERVATION_CREATED", "phase12-l2-001", "probe", p2)
    row2 = dpsql(f"SELECT event_type || '|' || namespace FROM ping_events WHERE event_id = '{e2}'")
    log("L2 identity", "PASS" if row2 == "OBSERVATION_CREATED|core::owner" else "FAIL",
        f"E={e2[:16]} row={row2}")
    assert row2 == "OBSERVATION_CREATED|core::owner"
    chain["l2_identity"] = e2

    # ============ L4: event-type registry ============
    r = api("POST", "/events", {"event_type": "PHASE12_BOGUS_TYPE", "aggregate_id": "x",
            "aggregate_type": "t", "event_data": {"correlation_id": CORR}})
    log("L4 unknown-type-422", "PASS" if r["code"] == 422 else "FAIL", f"code={r['code']}")
    assert r["code"] == 422, f"expected 422, got {r['code']}"

    # ============ L15: credential-health probe (fresh authenticated event) ============
    p15 = {"correlation_id": CORR, "probe": "l15-health",
           "note": "phase12 credential-rotation health probe"}
    e15 = emit("OBSERVATION_CREATED", "phase12-l15-001", "probe", p15)
    ok15 = dpsql(f"SELECT COUNT(*) FROM ping_events WHERE event_id = '{e15}'") == "1"
    log("L15 health-probe", "PASS" if ok15 else "FAIL", f"E={e15[:16]} persisted={ok15}")
    assert ok15
    chain["l15_probe"] = e15

    # ============ L6: ordinary JS mission via PROJECTION_CREATED ============
    proj6 = {"correlation_id": CORR, "documentId": "phase12-l6-doc-001",
             "authorized_missions": ["REPLAY_VERIFY"], "side_effect_class": "read-only",
             "note": "phase12 ordinary JS mission probe"}
    e6 = emit("PROJECTION_CREATED", "phase12-l6-proj-001", "probe", proj6)
    m6 = mid("REPLAY_VERIFY", e6)
    chain["l6_projection"] = e6; chain["l6_mission"] = m6
    m6r = wait_mission(m6, 300, "L6 replay-mission")
    assert m6r["assigned_to"] == "replay", f"wrong worker: {m6r}"
    rc6 = find_event("REPLAY_COMPLETED", e6)
    v6 = (event_payload(rc6["event_id"]).get("replay") or {}).get("verified") is True
    log("L6 replay-completed", "PASS" if v6 else "FAIL",
        f"E_rc={rc6['event_id'][:16]} verified={v6}")
    assert v6

    # ============ L9: ordinary knowledge promotion (fresh test namespace) ============
    prop9 = {"correlation_id": CORR, "proposal": "phase12 promotion probe",
             "playbook": "test.phase12-promote", "scope": "TEST SCOPE ONLY"}
    e9p = emit("OBSERVATION_CREATED", "phase12-l9-proposal-001", "probe", prop9)
    n9 = "phase12-promote-node-001"
    knode({"nodeId": n9, "nodeType": "playbook",
           "label": "test.phase12-promote v1.0.0 (TEST SCOPE ONLY)",
           "namespace": NS_KNOW, "status": "candidate", "confidence": 0.5,
           "sourceEventId": e9p, "correlationId": CORR,
           "data": {"name": "test.phase12-promote", "version": "1.0.0",
                    "scope": "test-only", "lifecycle": {"status": "candidate"},
                    "proposed_by": "phase12 operator",
                    "approval_gate": "TEST-SCOPE SNIPPET_APPROVED only; production requires human Nolan"}})
    node9 = get_node(n9)
    assert node9 and node9["status"] == "candidate" and node9["source_event_id"] == e9p, f"candidate bad: {node9}"
    log("L9 candidate", "PASS", f"N={n9} provenance intact")
    appr9 = {"correlation_id": CORR, "sourceEventId": e9p, "playbook_node_id": n9,
             "namespace": NS_KNOW,
             "approved_by": "phase12 operator; TEST SCOPE ONLY - not a human",
             "approval_scope": "test-only node; production promotion requires human Nolan"}
    e9a = emit("SNIPPET_APPROVED", "phase12-l9-approval-001", "probe", appr9)
    m9 = mid("KNOWLEDGE_PROMOTE", e9a)
    chain["l9_proposal"] = e9p; chain["l9_node"] = n9
    chain["l9_approval"] = e9a; chain["l9_mission"] = m9
    m9r = wait_mission(m9, 300, "L9 promote-mission")
    assert m9r["assigned_to"] == "knowledge-promotion", f"wrong worker: {m9r}"
    node9b = get_node(n9)
    ok9 = node9b["status"] == "approved" and float(node9b["confidence"]) == 1.0
    log("L9 promoted", "PASS" if ok9 else "FAIL",
        f"N={n9} status={node9b['status']} confidence={node9b['confidence']}")
    assert ok9

    # ============ L10: direct REPLAY_VERIFY dispatch + idempotency ============
    rv10 = {"correlation_id": CORR, "documentId": n9, "chain": [e9p, e9a],
            "playbook_node": n9, "mission_id": m9,
            "description": "phase12 direct REPLAY_VERIFY dispatch probe"}
    e10 = emit("REPLAY_VERIFY", "phase12-l10-replay-001", "probe", rv10)
    m10 = mid("REPLAY_VERIFY", e10)
    chain["l10_replay_event"] = e10; chain["l10_mission"] = m10
    m10r = wait_mission(m10, 300, "L10 replay-mission")
    assert m10r["assigned_to"] == "replay", f"wrong worker: {m10r}"
    rc10 = find_event("REPLAY_COMPLETED", e10)
    v10 = (event_payload(rc10["event_id"]).get("replay") or {}).get("verified") is True
    log("L10 replay-completed", "PASS" if v10 else "FAIL",
        f"E_rc={rc10['event_id'][:16]} verified={v10}")
    assert v10
    # idempotent re-emit: same event id, mission count 1, REPLAY_COMPLETED count 1
    r = api("POST", "/events", {"event_type": "REPLAY_VERIFY",
            "aggregate_id": "phase12-l10-replay-001", "aggregate_type": "probe",
            "event_data": rv10})
    same10 = isinstance(r["body"], dict) and r["body"].get("event_id") == e10
    time.sleep(12)
    mc10 = dpsql(f"SELECT COUNT(*) FROM ping_missions WHERE mission_id = '{m10}'")
    rcc10 = dpsql(f"SELECT COUNT(*) FROM ping_events WHERE event_type = 'REPLAY_COMPLETED'"
                  f" AND payload->>'upstreamEventId' = '{e10}'")
    log("L10 idempotent", "PASS" if same10 and mc10 == "1" and rcc10 == "1" else "FAIL",
        f"same_id={same10} missions={mc10} replay_completed={rcc10}")
    assert same10 and mc10 == "1" and rcc10 == "1"
    chain["l10_replay_completed"] = rc10["event_id"]

    # ============ L11: deterministic replay of the completed KNOWLEDGE_PROMOTE mission ============
    m9s = get_mission(m9)
    assert m9s and m9s["status"] == "completed", f"L9 mission not completed: {m9s}"
    rv11 = {"correlation_id": CORR, "documentId": m9, "mission_id": m9,
            "mission_type": "KNOWLEDGE_PROMOTE", "chain": [e9p, e9a],
            "description": "phase12 replay of completed KNOWLEDGE_PROMOTE mission"}
    e11 = emit("REPLAY_VERIFY", "phase12-l11-replay-001", "probe", rv11)
    m11 = mid("REPLAY_VERIFY", e11)
    chain["l11_replay_event"] = e11; chain["l11_mission"] = m11
    m11r = wait_mission(m11, 300, "L11 replay-mission")
    assert m11r["assigned_to"] == "replay"
    rc11 = find_event("REPLAY_COMPLETED", e11)
    pay11 = event_payload(rc11["event_id"])
    v11 = (pay11.get("replay") or {}).get("verified") is True
    log("L11 mission-replay", "PASS" if v11 else "FAIL",
        f"E_rc={rc11['event_id'][:16]} verified={v11} mission={m9[:16]}")
    assert v11
    chain["l11_replay_completed"] = rc11["event_id"]

    # ============ L12: witness ============
    wit12 = find_event("WITNESS_CREATED", rc11["event_id"])
    wpay = event_payload(wit12["event_id"])
    att = (wpay.get("witness") or {}).get("attestation")
    ok12 = isinstance(att, str) and att.startswith("witness-") and wit12["documentId"] == m9
    log("L12 witness", "PASS" if ok12 else "FAIL",
        f"E_wit={wit12['event_id'][:16]} attestation={att} documentId={wit12['documentId'][:16]}")
    assert ok12
    chain["l12_witness"] = wit12["event_id"]

    # ============ L13: lineage ============
    lin13 = find_event("LINEAGE_CREATED", wit12["event_id"])
    log("L13 lineage", "PASS", f"E_lin={lin13['event_id'][:16]} upstream=witness")
    chain["l13_lineage"] = lin13["event_id"]

    # ============ do-not-touch verifications ============
    rev = dpsql("SELECT status || '|' || (data->>'version') || '|' || (data->>'decision')"
                " || '|' || COALESCE(data->>'decided_by','NULL')"
                " FROM knowledge_nodes WHERE node_id = '194a2b85bde957ed'")
    okrev = rev == "candidate|1.1.0|PENDING_HUMAN|NULL"
    log("guard revision", "PASS" if okrev else "FAIL", f"row={rev}")
    assert okrev, f"revision changed: {rev}"
    orph = dpsql("SELECT status FROM knowledge_nodes WHERE node_id = '4917265ee67e678c'")
    okorph = orph == "candidate"
    log("guard orphan", "PASS" if okorph else "FAIL", f"status={orph}")
    assert okorph, f"orphan changed: {orph}"

    with open("/tmp/phase12/chain.json", "w") as f:
        json.dump(chain, f, indent=2)
    with open("/tmp/phase12/driver-runlog.jsonl", "w") as f:
        for e in LOG:
            f.write(json.dumps(e) + "\n")
    print(f"DRIVER DONE pass={PASS} fail={FAIL}", flush=True)
    if FAIL:
        sys.exit(1)

if __name__ == "__main__":
    main()
