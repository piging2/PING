#!/usr/bin/env python3
"""Lane B transfer: local lane-b files -> Pig repo, via pigwsl-run.sh.

- python-based chunks of 2000 chars (fold -w is unreliable above ~2000 cols)
- per-chunk cumulative size verification on the Pig
- final md5 verification local vs remote
Never use fold -w. Never git add -A.
"""
import base64
import hashlib
import os
import subprocess
import sys

BRIDGE = os.path.expanduser("~/workspace/pig/pigwsl-run.sh")
HERE = os.path.dirname(os.path.abspath(__file__))
DST_DIR = "/home/nolan/projects/ping/src/fyd/object"

FILES = [
    ("object-projection.ts", DST_DIR + "/object-projection.ts"),
    ("evidence-chrome.tsx", DST_DIR + "/evidence-chrome.tsx"),
    ("card.tsx", DST_DIR + "/card.tsx"),
    ("node.tsx", DST_DIR + "/node.tsx"),
    ("card-node-projections.test.tsx", DST_DIR + "/__tests__/card-node-projections.test.tsx"),
    ("css-stub.cjs", DST_DIR + "/__tests__/css-stub.cjs"),
    ("next-link-stub.cjs", DST_DIR + "/__tests__/next-link-stub.cjs"),
    ("jest.laneb.config.cjs", DST_DIR + "/jest.laneb.config.cjs"),
]

CHUNK = 2000


def bridge(script: str) -> str:
    r = subprocess.run(
        [BRIDGE, script],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if r.returncode != 0:
        print(f"BRIDGE FAILED for script: {script[:120]!r}", file=sys.stderr)
        print(r.stderr[-2000:], file=sys.stderr)
        sys.exit(1)
    return r.stdout.strip()


def put(local_name: str, remote: str) -> None:
    path = os.path.join(HERE, local_name)
    data = open(path, "rb").read()
    b64 = base64.b64encode(data).decode("ascii")
    chunks = [b64[i : i + CHUNK] for i in range(0, len(b64), CHUNK)]
    for i, c in enumerate(chunks):
        if len(c) > CHUNK:
            print(f"chunk {i} of {local_name} too long: {len(c)}", file=sys.stderr)
            sys.exit(1)

    bridge(f"rm -f '{remote}' && install -m 644 /dev/null '{remote}'")
    done = 0
    for i, c in enumerate(chunks):
        bridge(
            "python3 -c \"import base64,sys; "
            f"sys.stdout.buffer.write(base64.b64decode('{c}'))\" >> '{remote}'"
        )
        done += len(base64.b64decode(c))
        got = int(bridge(f"stat -c %s '{remote}'"))
        if got != done:
            print(
                f"SIZE MISMATCH {local_name} chunk {i}: expected {done}, got {got}",
                file=sys.stderr,
            )
            sys.exit(1)
    local_md5 = hashlib.md5(data).hexdigest()
    remote_md5 = bridge(f"md5sum '{remote}'").split()[0]
    if local_md5 != remote_md5:
        print(
            f"MD5 MISMATCH {local_name}: local={local_md5} remote={remote_md5}",
            file=sys.stderr,
        )
        sys.exit(1)
    print(f"OK {local_name} ({len(chunks)} chunks) md5={local_md5}")


def main() -> None:
    for local_name, remote in FILES:
        put(local_name, remote)
    print("ALL TRANSFERS VERIFIED")


if __name__ == "__main__":
    main()
