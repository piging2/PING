#!/usr/bin/env python3
"""Stream a local file to Pig WSL over ONE persistent ssh session.

Each base64 chunk (4000 chars, multiple of 4 -> exactly 3000 decoded bytes)
is sent as a single shell line:  echo <chunk> | base64 -d >> DST
This avoids one ssh handshake per chunk (the bottleneck in pigwsl-put.sh).

Resumes from the current remote size (must be a multiple of 3000).
Verifies with sha256 at the end.
"""
import subprocess, sys, hashlib, os

SRC = sys.argv[1]
DST = sys.argv[2]
CHUNK = 4000  # chars; must stay multiple of 4

local_sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()
local_size = os.path.getsize(SRC)
print(f"local size={local_size} sha256={local_sha}", flush=True)

# current remote size via the reliable base64-encoded runner; then start clean
probe = subprocess.run(
    ["/home/hatch/workspace/pig/pigwsl-run.sh",
     f"rm -f {DST} && echo wiped"],
    capture_output=True, text=True, timeout=90)
print("remote: " + probe.stdout.strip().splitlines()[-1], flush=True)
skip_chunks = 0

with open(SRC, 'rb') as f:
    raw = f.read()
b64 = __import__('base64').b64encode(raw).decode()
chunks = [b64[i:i+CHUNK] for i in range(0, len(b64), CHUNK)]
print(f"total chunks={len(chunks)} skip={skip_chunks} remaining={len(chunks)-skip_chunks}", flush=True)

# one persistent ssh; remote bash reads command lines from stdin
p = subprocess.Popen(
    ["ssh", "-F", "/home/hatch/.ssh/pig-config", "pigwsl",
     "wsl", "--", "bash"],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT, text=True, bufsize=1)

def send(line):
    p.stdin.write(line + "\n")

for i, c in enumerate(chunks[skip_chunks:], start=skip_chunks):
    # base64 alphabet has no shell metacharacters needing quotes
    send(f"echo {c} | base64 -d >> {DST} </dev/null")
    if (i + 1) % 200 == 0:
        print(f"  streamed {i+1}/{len(chunks)}", flush=True)

send(f"sha256sum {DST} | cut -d' ' -f1")
send("exit")
out, _ = p.communicate(timeout=600)
lines = [l for l in out.strip().splitlines() if l.strip()]
remote_sha = lines[-1].strip() if lines else "NO_OUTPUT"
print(f"remote sha256={remote_sha}", flush=True)
if remote_sha == local_sha:
    print(f"OK {DST} sha256={local_sha}")
else:
    print(f"MISMATCH local={local_sha} remote={remote_sha}", file=sys.stderr)
    sys.exit(1)
