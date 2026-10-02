#!/usr/bin/env python3
"""Transfer staged circle-reset files to the Pig via the bridge (2x2000-char chunks per call)."""
import base64, hashlib, subprocess, sys, os

BRIDGE = os.path.expanduser("~/workspace/pig/pigwsl-run.sh")
STAGE = "/tmp/circle-staging"
FILES = ["portal-circle.tsx", "portal-host.tsx", "global-ask-dock.tsx", "home-circles.tsx"]
SRC = os.path.expanduser("~/workspace/circle-reset")

def run_bridge(script):
    r = subprocess.run([BRIDGE, script], capture_output=True, text=True, timeout=120)
    out = (r.stdout or "") + (r.stderr or "")
    return r.returncode, out

def chunks_of(data: bytes, n=2000):
    b64 = base64.b64encode(data).decode("ascii")
    return [b64[i:i+n] for i in range(0, len(b64), n)]

rc, out = run_bridge(f"mkdir -p {STAGE} < /dev/null")
assert rc == 0, f"mkdir failed: {out}"

for name in FILES:
    path = os.path.join(SRC, name)
    with open(path, "rb") as f:
        data = f.read()
    local_md5 = hashlib.md5(data).hexdigest()
    chunks = chunks_of(data)
    print(f"{name}: {len(data)} bytes, md5 {local_md5}, {len(chunks)} chunks", flush=True)
    # clear any previous partial
    rc, out = run_bridge(f"rm -f {STAGE}/{name}.b64 < /dev/null")
    assert rc == 0, f"rm failed: {out}"
    for i in range(0, len(chunks), 2):
        pair = chunks[i:i+2]
        # one echo per chunk, appended
        lines = " && ".join(f"printf '%s' '{c}' >> {STAGE}/{name}.b64" for c in pair)
        script = f"{lines} < /dev/null"
        assert len(script) < 6000, f"script too long: {len(script)}"
        rc, out = run_bridge(script)
        if rc != 0:
            print(f"CHUNK FAIL {name} offset {i}: {out[:500]}", flush=True)
            sys.exit(1)
    print(f"{name}: all chunks sent", flush=True)

# decode + verify
verify_script = " && ".join(
    f"base64 -d {STAGE}/{n}.b64 > {STAGE}/{n}" for n in FILES
) + " && " + " && ".join(f"md5sum {STAGE}/{n}" for n in FILES) + " < /dev/null"
rc, out = run_bridge(verify_script)
print(out)
assert rc == 0, "verify failed"

expected = {}
for n in FILES:
    with open(os.path.join(SRC, n), "rb") as f:
        expected[n] = hashlib.md5(f.read()).hexdigest()
ok = True
for n in FILES:
    if expected[n] in out:
        print(f"OK {n}")
    else:
        print(f"MD5 MISMATCH {n}: expected {expected[n]}")
        ok = False
sys.exit(0 if ok else 1)
