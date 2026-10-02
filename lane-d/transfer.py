#!/usr/bin/env python3
"""Transfer Lane D files from this sandbox to the Pig (~/projects/ping).

Chunked base64 through pigwsl-run.sh (2000-char chunks; the bridge folds
above ~2000 columns). Each file is md5-verified after decode. New files
only; surgical edits run separately via apply-edits.py / patch-dump.py.
"""
import base64
import hashlib
import os
import subprocess
import sys

BRIDGE = os.path.expanduser("~/workspace/pig/pigwsl-run.sh")
REPO = "/home/nolan/projects/ping"
STAGING = os.path.expanduser("~/workspace/lane-d/staging")

FILES = [
    "src/fyd/customize/types.ts",
    "src/fyd/customize/intent.ts",
    "src/fyd/customize/propose.ts",
    "src/fyd/customize/apply-layer.ts",
    "src/fyd/customize/server.ts",
    "src/fyd/customize/README.md",
    "src/fyd/customize/jest.config.cjs",
    "src/fyd/customize/__tests__/intent.test.ts",
    "src/fyd/customize/__tests__/apply-layer.test.ts",
    "src/fyd/owner-mode/customize-panel.tsx",
    "src/fyd/owner-mode/capability.ts",
    "src/app/api/fyd/customize/route.ts",
]

SCRIPTS = [
    ("~/workspace/lane-d/apply-edits.py", "/tmp/lane-d-apply-edits.py"),
    ("~/workspace/lane-d/patch-dump.py", "/tmp/lane-d-patch-dump.py"),
]


def bridge(cmd, data=None):
    r = subprocess.run(
        [BRIDGE, cmd],
        input=data,
        capture_output=True,
    )
    return r


def send_file(local, remote):
    with open(local, "rb") as f:
        raw = f.read()
    md5local = hashlib.md5(raw).hexdigest()
    b64 = base64.b64encode(raw).decode()
    d = os.path.dirname(remote)
    r = bridge(f"mkdir -p {d} && rm -f {remote}.b64part")
    assert r.returncode == 0, r.stderr.decode()[-500:]
    # Chunks ride inside the command as a quoted heredoc (base64 has no
    # shell-special characters). Stdin is the bridge's own script channel
    # and must not be used for data.
    for i in range(0, len(b64), 2000):
        chunk = b64[i : i + 2000]
        r = bridge(
            f"cat >> {remote}.b64part <<'LANDEOF'\n{chunk}\nLANDEOF"
        )
        assert r.returncode == 0, r.stderr.decode()[-500:]
    r = bridge(
        f"base64 -d {remote}.b64part > {remote} && rm {remote}.b64part "
        f"&& md5sum {remote} && wc -c {remote}"
    )
    assert r.returncode == 0, r.stderr.decode()[-500:]
    out = r.stdout.decode()
    assert md5local in out, f"md5 mismatch for {remote}: {out}"
    print(f"OK {remote} ({len(raw)} bytes, md5 {md5local[:12]}..)")


def main():
    for rel in FILES:
        send_file(os.path.join(STAGING, rel), REPO + "/" + rel)
    for local, remote in SCRIPTS:
        send_file(os.path.expanduser(local), remote)
    print("ALL TRANSFERS VERIFIED")


if __name__ == "__main__":
    sys.exit(main())
