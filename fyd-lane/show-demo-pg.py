#!/usr/bin/env python3
"""Show full payloads of recent demo-Postgres FYD_SITE_OVERLAY events (read-only)."""
import json, os, subprocess, sys, tempfile

QUERY_JS = r"""
const {Client}=require('/app/node_modules/pg');
(async()=>{
 const c=new Client({host:process.env.POSTGRES_HOST,
  port:parseInt(process.env.POSTGRES_PORT||'5432',10),
  user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,
  database:process.env.POSTGRES_DB,connectionTimeoutMillis:8000});
 try{await c.connect();}catch(e){console.error('QUERY_ERROR connect');process.exit(2);}
 try{
  const r=await c.query(
   "SELECT event_id, timestamp, payload FROM ping_events "+
   "WHERE event_type='FYD_SITE_OVERLAY' "+
   "ORDER BY timestamp ASC, event_id ASC");
  for(const row of r.rows){
   const ts=row.timestamp instanceof Date?row.timestamp.toISOString():row.timestamp;
   console.log(JSON.stringify({event_id:row.event_id,timestamp:ts,payload:row.payload}));
  }
 }catch(e){console.error('QUERY_ERROR query');process.exit(2);}
 await c.end();
})().catch(()=>{console.error('QUERY_ERROR');process.exit(2);});
"""

def demo_pw():
    pw = os.environ.get("FYD_DEMO_PG_PASSWORD")
    if pw:
        return pw
    cp = subprocess.run(["docker", "inspect", "ping-test-pg", "--format",
                         "{{range .Config.Env}}{{println .}}{{end}}"],
                        capture_output=True, timeout=30)
    for line in cp.stdout.decode("utf-8", "replace").splitlines():
        if line.startswith("POSTGRES_PASSWORD="):
            return line.split("=", 1)[1]
    raise RuntimeError("no password")

host = os.environ.get("FYD_DEMO_PG_HOST", "127.0.0.1")
port = os.environ.get("FYD_DEMO_PG_PORT", "55433")
js = QUERY_JS.replace("/app/node_modules/pg", "/home/nolan/ping/gateway/node_modules/pg", 1)
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
    f.write(js); p = f.name
try:
    env = dict(os.environ, POSTGRES_HOST=host, POSTGRES_PORT=port,
               POSTGRES_USER=os.environ.get("FYD_DEMO_PG_USER", "postgres"),
               POSTGRES_PASSWORD=demo_pw(),
               POSTGRES_DB=os.environ.get("FYD_DEMO_PG_DB", "ping-fyd-demo"))
    cp = subprocess.run(["node", p], capture_output=True, timeout=60, env=env)
finally:
    os.unlink(p)
if cp.returncode != 0:
    sys.stderr.write("query failed\n"); sys.exit(2)
events = [json.loads(l) for l in cp.stdout.decode("utf-8").splitlines() if l.strip()]
for ev in events:
    pl = ev["payload"] or {}
    ops = pl.get("ops") or []
    kinds = [o.get("op") for o in ops if isinstance(o, dict)]
    print(ev["event_id"][:16], ev["timestamp"], pl.get("siteId"), kinds)
print("---- full payloads of last 2 ----")
for ev in events[-2:]:
    print(json.dumps(ev, indent=1)[:1500])
