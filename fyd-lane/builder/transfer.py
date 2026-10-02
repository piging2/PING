#!/usr/bin/env python3
"""Transfer staged FYD builder/tenant files to the Pig repo via pigwsl-run.sh.

Mechanism: base64 the file locally, send 2x2000-char chunks per bridge call
(bridge scripts stay under ~6000 chars), append on the Pig, decode, md5-verify.
No shell variables inside bridge scripts; every call redirects stdin from /dev/null.
"""
import base64
import hashlib
import os
import subprocess
import sys

SRC = os.path.expanduser("~/workspace/fyd-lane/builder/staging")
REPO = "/home/nolan/projects/ping"
BRIDGE = os.path.expanduser("~/workspace/pig/pigwsl-run.sh")
CHUNK = 2000

FILES = [
    # (staging relpath, repo dest relpath)
    ("tenant/tenant-context.ts", "src/fyd/tenant/tenant-context.ts"),
    ("tenant/scoped-stores.ts", "src/fyd/tenant/scoped-stores.ts"),
    ("tenant/jest.config.cjs", "src/fyd/tenant/jest.config.cjs"),
    ("tenant/__tests__/a-owner.test.ts", "src/fyd/tenant/__tests__/a-owner.test.ts"),
    ("tenant/__tests__/b-projection.test.ts", "src/fyd/tenant/__tests__/b-projection.test.ts"),
    ("tenant/__tests__/c-ask.test.ts", "src/fyd/tenant/__tests__/c-ask.test.ts"),
    ("tenant/__tests__/d-worker.test.ts", "src/fyd/tenant/__tests__/d-worker.test.ts"),
    ("tenant/__tests__/e-scoped-stores.test.ts", "src/fyd/tenant/__tests__/e-scoped-stores.test.ts"),
    ("tenant/__tests__/helpers.ts", "src/fyd/tenant/__tests__/helpers.ts"),
    ("tenant/__tests__/css-stub.js", "src/fyd/tenant/__tests__/css-stub.js"),
    ("builder/dimensions.ts", "src/fyd/builder/dimensions.ts"),
    ("builder/eligibility.ts", "src/fyd/builder/eligibility.ts"),
    ("builder/owner-intent.ts", "src/fyd/builder/owner-intent.ts"),
    ("builder/confidence.ts", "src/fyd/builder/confidence.ts"),
    ("builder/manifest.ts", "src/fyd/builder/manifest.ts"),
    ("builder/visibility.ts", "src/fyd/builder/visibility.ts"),
    ("builder/generated-presentation.ts", "src/fyd/builder/generated-presentation.ts"),
    ("builder/object-builder.ts", "src/fyd/builder/object-builder.ts"),
    ("builder/planner.ts", "src/fyd/builder/planner.ts"),
    ("builder/canonical.ts", "src/fyd/builder/canonical.ts"),
    ("builder/structural-diff.ts", "src/fyd/builder/structural-diff.ts"),
    ("builder/index.ts", "src/fyd/builder/index.ts"),
    ("builder/jest.config.cjs", "src/fyd/builder/jest.config.cjs"),
    ("builder/__tests__/fixtures.ts", "src/fyd/builder/__tests__/fixtures.ts"),
    ("builder/__tests__/dimensions.test.ts", "src/fyd/builder/__tests__/dimensions.test.ts"),
    ("builder/__tests__/eligibility.test.ts", "src/fyd/builder/__tests__/eligibility.test.ts"),
    ("builder/__tests__/planner.test.ts", "src/fyd/builder/__tests__/planner.test.ts"),
    ("builder/__tests__/verifier.test.ts", "src/fyd/builder/__tests__/verifier.test.ts"),
    ("builder/__tests__/object-builder.test.ts", "src/fyd/builder/__tests__/object-builder.test.ts"),
    ("builder/__tests__/structural-diff.test.ts", "src/fyd/builder/__tests__/structural-diff.test.ts"),
    ("builder/__tests__/structural-proof.test.ts", "src/fyd/builder/__tests__/structural-proof.test.ts"),
    ("builder/dogfood/build-ping-fyd-projection.mjs", "src/fyd/builder/dogfood/build-ping-fyd-projection.mjs"),
    ("builder/site-vectors.ts", "src/fyd/builder/site-vectors.ts"),
]


def bridge(script: str) -> subprocess.CompletedProcess:
    assert len(script) < 6000, f"bridge script too long: {len(script)}"
    # base64 alphabet only inside single quotes: no shell metacharacters
    return subprocess.run(
        [BRIDGE, script],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=180,
    )


def transfer(srel: str, dest: str) -> None:
    src_path = os.path.join(SRC, srel)
    with open(src_path, "rb") as f:
        data = f.read()
    md5 = hashlib.md5(data).hexdigest()
    b64 = base64.b64encode(data).decode("ascii")
    chunks = [b64[i : i + CHUNK] for i in range(0, len(b64), CHUNK)]
    dest_abs = REPO + "/" + dest
    dest_dir = os.path.dirname(dest_abs)

    r = bridge(f"rm -f /tmp/fyd-transfer.b64 && mkdir -p {dest_dir} && echo READY")
    assert r.returncode == 0 and "READY" in r.stdout, (r.returncode, r.stdout, r.stderr)

    for i in range(0, len(chunks), 2):
        pair = chunks[i : i + 2]
        script = " && ".join(
            "printf '%%s' '%s' >> /tmp/fyd-transfer.b64" % c for c in pair
        )
        script += " && wc -c /tmp/fyd-transfer.b64"
        r = bridge(script)
        assert r.returncode == 0, (dest, r.returncode, r.stdout, r.stderr)

    r = bridge(
        f"base64 -d /tmp/fyd-transfer.b64 > {dest_abs} && md5sum {dest_abs} && rm -f /tmp/fyd-transfer.b64"
    )
    assert r.returncode == 0, (dest, r.returncode, r.stdout, r.stderr)
    assert md5 in r.stdout, (dest, md5, r.stdout)
    print(f"OK {dest} md5={md5}", flush=True)


def main() -> None:
    only = sys.argv[1:] or None
    for srel, dest in FILES:
        if only and not any(o in dest for o in only):
            continue
        transfer(srel, dest)
    print("TRANSFER COMPLETE")


if __name__ == "__main__":
    main()
