#!/usr/bin/env python3
"""Lane media-b transfer: local lane-media-b files -> Pig repo, via pigwsl-run.sh.

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
REPO = "/home/nolan/projects/ping"

FILES = [
    ("src/types.ts", REPO + "/src/fyd/media/types.ts"),
    ("src/discover.ts", REPO + "/src/fyd/media/discover.ts"),
    ("src/ingest.ts", REPO + "/src/fyd/media/ingest.ts"),
    ("src/derivatives.ts", REPO + "/src/fyd/media/derivatives.ts"),
    ("src/provenance.ts", REPO + "/src/fyd/media/provenance.ts"),
    ("src/bundle-media.ts", REPO + "/src/fyd/media/bundle-media.ts"),
    ("src/site-bundle.ts", REPO + "/src/fyd/media/site-bundle.ts"),
    ("src/attach.ts", REPO + "/src/fyd/media/attach.ts"),
    ("src/circle-background.ts", REPO + "/src/fyd/media/circle-background.ts"),
    ("src/derive-presence.ts", REPO + "/src/fyd/presence/derive-presence.ts"),
    ("src/view.ts", REPO + "/src/fyd/object/view.ts"),
    ("src/object-types.ts", REPO + "/src/fyd/object/types.ts"),
    ("src/api-media-route.ts", REPO + "/src/app/api/fyd/media/route.ts"),
    ("tests/discover.test.ts", REPO + "/src/fyd/media/__tests__/discover.test.ts"),
    ("tests/provenance.test.ts", REPO + "/src/fyd/media/__tests__/provenance.test.ts"),
    ("tests/derivatives.test.ts", REPO + "/src/fyd/media/__tests__/derivatives.test.ts"),
    ("tests/view.test.ts", REPO + "/src/fyd/object/__tests__/view.test.ts"),
]

CHUNK = 2000


def bridge(script: str) -> str:
    r = subprocess.run(
        [BRIDGE, script],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=180,
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

    bridge(f"mkdir -p '{os.path.dirname(remote)}' && rm -f '{remote}' && install -m 644 /dev/null '{remote}'")
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
    print(f"OK {local_name} -> {remote}")


def main() -> int:
    only = sys.argv[1:]
    for local_name, remote in FILES:
        if only and local_name not in only and os.path.basename(local_name) not in only:
            continue
        put(local_name, remote)
    print("transfer complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
