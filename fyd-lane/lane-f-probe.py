#!/usr/bin/env python3
"""Lane F journal probe (Pig-side): list FYD_SITE_OVERLAY events for happy-place
in BOTH the main journal (8080 gateway PG via ping-gateway container) and the
demo journal (ping-test-pg). Decides which journal the live projection's
overlayEventIds came from. Prints event ids + timestamps only; never secrets.
"""
import json
import os
import subprocess
import sys
import tempfile

QJS = r"""
const {Client}=require('PGMOD');
(async()=>{
 const c=new Client({host:process.env.PH,port:parseInt(process.env.PP||'5432',10),
  user:process.env.PU,password:process.env.PW, database:process.env.PD,
  connectionTimeoutMillis:8000});
 try{await c.connect();}catch(e){console.error('CONNECT:'+e.message);process.exit(2);}
 try{
  const r=await c.query(
   "SELECT event_id, timestamp FROM ping_events "+
   "WHERE event_type='FYD_SITE_OVERLAY' AND payload->>'siteId'=$1 "+
   "ORDER BY timestamp ASC, event_id ASC",["happy-place"]);
  for(const row of r.rows){
   const ts=row.timestamp instanceof Date?row.timestamp.toISOString():row.timestamp;
   console.log(JSON.stringify({event_id:row.event_id,timestamp:ts}));
  }
 }catch(e){console.error('QUERY:'+e.message);process.exit(2);}
 await c.end();
})().catch(e=>{console.error('FATAL:'+e.message);process.exit(2);});
"""


def run_query(js_path, env, label):
    cp = subprocess.run(["node", js_path], capture_output=True, timeout=60, env=env)
    out = {"label": label, "rc": cp.returncode, "events": []}
    if cp.returncode != 0:
        out["error"] = cp.stderr.decode("utf-8", "replace")[:200]
        return out
    for line in cp.stdout.decode("utf-8").splitlines():
        line = line.strip()
        if line:
            out["events"].append(json.loads(line))
    return out


def demo_password():
    pw = os.environ.get("FYD_DEMO_PG_PASSWORD")
    if pw:
        return pw
    cp = subprocess.run(
        ["docker", "inspect", "ping-test-pg", "--format",
         "{{range .Config.Env}}{{println .}}{{end}}"],
        capture_output=True, timeout=30)
    if cp.returncode != 0:
        raise RuntimeError("docker inspect ping-test-pg failed")
    for line in cp.stdout.decode("utf-8", "replace").splitlines():
        if line.startswith("POSTGRES_PASSWORD="):
            return line.split("=", 1)[1]
    raise RuntimeError("POSTGRES_PASSWORD not found in ping-test-pg env")


def main():
    results = []
    # main journal via the gateway container (its own env)
    js = QJS.replace("PGMOD", "/app/node_modules/pg")
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js)
        main_js = f.name
    cname = "/tmp/lane-f-qm-%d.js" % os.getpid()
    try:
        cp = subprocess.run(["docker", "cp", main_js, "ping-gateway:" + cname],
                            capture_output=True, timeout=60)
        if cp.returncode != 0:
            results.append({"label": "main", "rc": 2,
                            "error": "docker cp failed: " +
                            cp.stderr.decode("utf-8", "replace")[:200]})
        else:
            cp = subprocess.run(["docker", "exec", "ping-gateway", "node", cname],
                                capture_output=True, timeout=60)
            out = {"label": "main", "rc": cp.returncode, "events": []}
            if cp.returncode != 0:
                out["error"] = cp.stderr.decode("utf-8", "replace")[:200]
            else:
                for line in cp.stdout.decode("utf-8").splitlines():
                    line = line.strip()
                    if line:
                        out["events"].append(json.loads(line))
            results.append(out)
    finally:
        os.unlink(main_js)
        subprocess.run(["docker", "exec", "ping-gateway", "rm", "-f", cname],
                       capture_output=True, timeout=30)
    # demo journal via node on the Pig host
    js2 = QJS.replace("PGMOD", "/home/nolan/ping/gateway/node_modules/pg")
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js2)
        demo_js = f.name
    try:
        env = dict(os.environ, PH="127.0.0.1", PP="55433", PU="postgres",
                   PD="ping-fyd-demo")
        results.append(run_query(demo_js, dict(env, PW=demo_password()), "demo"))
    finally:
        os.unlink(demo_js)
    print(json.dumps(results, indent=1))


if __name__ == "__main__":
    sys.exit(main())
