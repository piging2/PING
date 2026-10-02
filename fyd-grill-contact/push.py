#!/usr/bin/env python3
"""Push local files to the Pig via chunked base64 through pigwsl-run.sh.
Chunks at 2000 chars (cmd.exe command-line limit lesson), one chunk per
bridge call, md5-verified per file. Usage: push.py <local> <pigpath> ..."""
import base64, hashlib, subprocess, sys

BRIDGE = "/home/hatch/workspace/pig/pigwsl-run.sh"
CHUNK = 2000

def bridge(script: str) -> str:
    r = subprocess.run([BRIDGE, script], stdin=subprocess.DEVNULL,
                       capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(f"bridge failed: {r.stderr[:300]}")
    return r.stdout.strip()

def push(local: str, pigpath: str):
    data = open(local, "rb").read()
    md5 = hashlib.md5(data).hexdigest()
    b64 = base64.b64encode(data).decode()
    bridge(f"rm -f '{pigpath}.b64' && touch '{pigpath}.b64' < /dev/null")
    for i in range(0, len(b64), CHUNK):
        chunk = b64[i:i + CHUNK]
        assert len(chunk) <= CHUNK, f"chunk too big: {len(chunk)}"
        # base64 alphabet has no single quotes: safe to single-quote
        bridge(f"printf '%s' '{chunk}' >> '{pigpath}.b64' < /dev/null")
    out = bridge(
        f"base64 -d '{pigpath}.b64' > '{pigpath}' && rm -f '{pigpath}.b64' "
        f"&& md5sum '{pigpath}' < /dev/null"
    )
    remote_md5 = out.split()[0]
    status = "OK" if remote_md5 == md5 else "MISMATCH"
    print(f"{status} {pigpath} local={md5} remote={remote_md5}")
    if remote_md5 != md5:
        raise SystemExit(f"md5 mismatch for {pigpath}")

pairs = sys.argv[1:]
assert len(pairs) % 2 == 0
for i in range(0, len(pairs), 2):
    push(pairs[i], pairs[i + 1])
print("all pushed and verified")
