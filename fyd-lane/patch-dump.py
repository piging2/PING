"""Patch dump.py: add FYD_OVERLAY_JOURNAL=demo support (FYD demo journal).
Runs ON THE PIG. Idempotent.
"""
import sys

P = "/home/nolan/ping/tools/fyd-site-projection/dump.py"
src = open(P, encoding="utf-8").read()
if "FYD_OVERLAY_JOURNAL" in src:
    print("ALREADY-PATCHED")
    sys.exit(0)

# 1. Config block after DUMPER_VERSION/OUT_DIR block.
anchor1 = 'OUT_DIR = "/home/nolan/ping/var/fyd-projections"\n'
assert src.count(anchor1) == 1
config = anchor1 + '''
# Overlay journal selection. "main" (default) reads overlays from the 8080
# deployment gateway's Postgres via the ping-gateway container. "demo" reads
# from FYD's own demo journal: the repo-booted gateway on 127.0.0.1:18199
# backed by ping-test-pg (127.0.0.1:55433, db ping-fyd-demo). The demo journal
# is used until the 8080 deployment lane registers FYD_SITE_OVERLAY in its
# own baked registry (see FAILURE_LEDGER FL-20260921-231).
OVERLAY_JOURNAL = os.environ.get("FYD_OVERLAY_JOURNAL", "main")
DEMO_PG = {
    "host": os.environ.get("FYD_DEMO_PG_HOST", "127.0.0.1"),
    "port": os.environ.get("FYD_DEMO_PG_PORT", "55433"),
    "user": os.environ.get("FYD_DEMO_PG_USER", "postgres"),
    "db": os.environ.get("FYD_DEMO_PG_DB", "ping-fyd-demo"),
}
HOST_PG_MODULE = "/home/nolan/ping/gateway/node_modules/pg"
'''
src = src.replace(anchor1, config)

# 2. Demo query functions + branch, inserted just before query_overlays.
anchor2 = "def query_overlays(site):\n"
assert src.count(anchor2) == 1
helpers = '''def demo_pg_password():
    """Resolve the demo Postgres password: env override, else the
    ping-test-pg container env (same pattern as the gateway boot)."""
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


def query_overlays_demo(site):
    """Read FYD_SITE_OVERLAY events for the site from the FYD demo journal
    (read-only SELECT against ping-fyd-demo via node + the gateway's pg
    module on the Pig host). Same row contract as the main path."""
    js = QUERY_JS.replace("/app/node_modules/pg", HOST_PG_MODULE, 1)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js)
        js_path = f.name
    try:
        env = dict(os.environ,
                   POSTGRES_HOST=DEMO_PG["host"],
                   POSTGRES_PORT=DEMO_PG["port"],
                   POSTGRES_USER=DEMO_PG["user"],
                   POSTGRES_PASSWORD=demo_pg_password(),
                   POSTGRES_DB=DEMO_PG["db"])
        cp = subprocess.run(["node", js_path, site], capture_output=True,
                            timeout=60, env=env)
    finally:
        os.unlink(js_path)
    if cp.returncode != 0:
        sys.stderr.write("demo overlay query failed:\\n%s\\n"
                         % cp.stderr.decode("utf-8", "replace"))
        sys.exit(2)
    events = []
    for line in cp.stdout.decode("utf-8").splitlines():
        line = line.strip()
        if line:
            events.append(json.loads(line))
    return events


'''
src = src.replace(anchor2, helpers + anchor2)

# 3. Branch inside query_overlays: insert after the docstring's closing quotes.
# The docstring ends with: 'script piped through `docker exec -i ... node /dev/stdin`)."""\n'
anchor3 = 'script piped through `docker exec -i ... node /dev/stdin`)."""\n'
assert src.count(anchor3) == 1
branch = anchor3 + '    if OVERLAY_JOURNAL == "demo":\n        return query_overlays_demo(site)\n'
src = src.replace(anchor3, branch)

open(P, "w", encoding="utf-8").write(src)
print("DUMP-PATCH-OK")
