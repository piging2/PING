"""Post-restart live event: one fresh authenticated OBSERVATION_CREATED with
locally predicted deterministic ID, then persistence verification."""
import hashlib, json, os, subprocess, sys, urllib.request, urllib.error

GW = "http://127.0.0.1:8080"
T1 = os.environ.get("P12_Bearer", "")
if not T1:
    print("FATAL: P12_Bearer not set"); sys.exit(2)

def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def canon(o): return json.dumps(o, separators=(",", ":"), ensure_ascii=True)
def ev_id(t, source, ns, payload):
    return sha(canon({"eventType": t, "source": source, "namespace": ns,
                      "logical_id": canon(payload)}))

payload = {"check": "post-restart", "correlation_id": "phase12-2026-09-17", "seq": 1}
exp = ev_id("OBSERVATION_CREATED", "api:muse-level-2", "core::owner", payload)
body = {"event_type": "OBSERVATION_CREATED", "aggregate_id": "phase12-postrestart",
        "aggregate_type": "cert-check", "event_data": payload,
        "namespace": "core::owner"}
req = urllib.request.Request(GW + "/events", data=json.dumps(body).encode(), method="POST",
    headers={"Content-Type": "application/json", "Authorization": "Bearer " + T1})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        code, rb = r.status, json.loads(r.read().decode())
except urllib.error.HTTPError as e:
    print(f"FAIL post-restart emit code={e.code}"); sys.exit(1)

ok = code == 200 and rb.get("event_id") == exp
print(f"[{'PASS' if ok else 'FAIL'}] L14 post-restart emit exp={exp[:16]} got={str(rb.get('event_id'))[:16]} code={code}")
if not ok: sys.exit(1)

p = subprocess.run(["docker", "exec", "-i", "ping-postgres", "sh", "-c",
                    "psql -U $POSTGRES_USER -d $POSTGRES_DB -t -A -v ON_ERROR_STOP=1"],
                   input=f"SELECT count(*) FROM ping_events WHERE event_id = '{exp}';".encode(),
                   capture_output=True, timeout=30)
n = p.stdout.decode().strip()
ok2 = n == "1"
print(f"[{'PASS' if ok2 else 'FAIL'}] L14 post-restart persisted rows={n}")
sys.exit(0 if ok2 else 1)
