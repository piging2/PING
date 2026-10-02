#!/usr/bin/env python3
"""Push staged files to the Pig via pigwsl-run.sh with chunked base64 + md5 verify.

Usage: push.py <local> <remote> [<local> <remote> ...]
Each pair is transferred: base64 in 2000-char chunks, 2 chunks per bridge
call (bridge command-line limit), then decoded and md5-verified remotely.
"""
import base64
import hashlib
import os
import subprocess
import sys

BRIDGE = os.path.expanduser("~/workspace/pig/pigwsl-run.sh")
STAGE_DIR = "/home/nolan/.fyd-stage"


def bridge(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [BRIDGE, cmd],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def push(local: str, dest: str) -> None:
    raw = open(local, "rb").read()
    b64 = base64.b64encode(raw).decode()
    digest = hashlib.md5(raw).hexdigest()
    name = dest.replace("/", "_").replace(".", "_")
    stage = f"{STAGE_DIR}/{name}.b64"

    r = bridge(f"mkdir -p {STAGE_DIR} && rm -f {stage}")
    if r.returncode != 0:
        raise RuntimeError(f"stage setup failed: {r.stderr}")

    chunks = [b64[i : i + 2000] for i in range(0, len(b64), 2000)]
    for i in range(0, len(chunks), 2):
        pair = "".join(chunks[i : i + 2])
        script = f'python3 << "PYEOF"\nopen("{stage}","a").write("{pair}")\nPYEOF'
        r = bridge(script)
        if r.returncode != 0:
            raise RuntimeError(f"chunk {i} failed: {r.stderr}")

    r = bridge(f"base64 -d {stage} > {dest} && md5sum {dest} && rm -f {stage}")
    if r.returncode != 0:
        raise RuntimeError(f"decode failed: {r.stderr}")
    if digest not in r.stdout:
        raise RuntimeError(f"md5 mismatch for {dest}: {r.stdout.strip()}")
    print(f"OK {dest} md5={digest} ({len(raw)} bytes)")


def main() -> None:
    args = sys.argv[1:]
    if len(args) % 2 != 0 or not args:
        print("usage: push.py <local> <remote> [<local> <remote> ...]")
        sys.exit(2)
    for local, dest in zip(args[0::2], args[1::2]):
        push(local, dest)


if __name__ == "__main__":
    main()
