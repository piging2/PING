#!/usr/bin/env python3
"""Chunked base64 file transfer to the Pig via pigwsl-run.sh.

Per AGENTS.md Pig-bridge rules: bridge scripts under ~6000 chars, 2 x 2000-char
base64 chunks per call, md5 verification per chunk, final sha256 verification.
Idempotent per file: staging is wiped at the start of each file's transfer.
"""
import base64
import hashlib
import json
import os
import subprocess
import sys

BRIDGE = "/home/hatch/workspace/pig/pigwsl-run.sh"
CHUNK = 2000
PER_CALL = 2
STAGE_DIR = "/tmp/fyd-transfer"

WORK = "/home/hatch/workspace/fyd-object-primitive-lane/work-circle"
REPO = "/home/nolan/projects/ping"

FILES = [
    (f"{WORK}/transfer/ObjectCircle.tsx", f"{REPO}/src/fyd/ui/object-layer/ObjectCircle.tsx"),
    (f"{WORK}/MarginObjectLayer.tsx", f"{REPO}/src/fyd/ui/object-layer/MarginObjectLayer.tsx"),
    (f"{WORK}/MobileSheet.tsx", f"{REPO}/src/fyd/ui/object-layer/MobileSheet.tsx"),
    (f"{WORK}/types.ts", f"{REPO}/src/fyd/ui/object-layer/types.ts"),
    (f"{WORK}/object-cards.test.tsx", f"{REPO}/src/fyd/ui/__tests__/object-cards.test.tsx"),
    (f"{WORK}/royal-mirror.test.tsx", f"{REPO}/src/fyd/ui/__tests__/royal-mirror.test.tsx"),
]

LOG = "/home/hatch/workspace/fyd-grill-circle/transfer/transfer-log.txt"

# Optional override: FYD_TRANSFER_FILES='[["/local/a","/pig/b"],...]'
if os.environ.get("FYD_TRANSFER_FILES"):
    FILES = [tuple(p) for p in json.loads(os.environ["FYD_TRANSFER_FILES"])]


def log(msg):
    print(msg, flush=True)
    with open(LOG, "a") as f:
        f.write(msg + "\n")


def bridge(script):
    r = subprocess.run(
        [BRIDGE, script],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=180,
    )
    if r.returncode != 0:
        raise RuntimeError(f"bridge rc={r.returncode} stderr={r.stderr[:600]}")
    return r.stdout


def transfer_one(local, final):
    name = os.path.basename(final)
    data = open(local, "rb").read()
    b64 = base64.b64encode(data).decode()
    local_sha = hashlib.sha256(data).hexdigest()
    chunks = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)]
    stage_b64 = f"{STAGE_DIR}/{name}.b64"
    stage_tmp = f"{STAGE_DIR}/{name}.tmp"
    log(f"== {name}: {len(data)} bytes, {len(chunks)} chunks, local sha256={local_sha}")

    out = bridge(f"mkdir -p {STAGE_DIR} && rm -f {stage_b64} {stage_tmp} && echo READY")
    assert "READY" in out, f"stage init failed: {out}"

    for i in range(0, len(chunks), PER_CALL):
        group = chunks[i:i + PER_CALL]
        expected = [(i + j, hashlib.md5(c.encode()).hexdigest()) for j, c in enumerate(group)]
        parts = []
        for c in group:
            parts.append(f"printf '%s' '{c}' > {stage_tmp}")
            parts.append(f"md5sum {stage_tmp} | cut -d' ' -f1")
            parts.append(f"cat {stage_tmp} >> {stage_b64}")
        parts.append("echo DONE")
        out = bridge(" && ".join(parts))
        lines = [l for l in out.strip().splitlines() if l and l != "DONE"]
        if "DONE" not in out or len(lines) != len(expected):
            raise RuntimeError(f"chunk group {i}: bad output: {out[:400]}")
        for (idx, exp_md5), got in zip(expected, lines):
            if got.strip() != exp_md5:
                raise RuntimeError(f"chunk {idx} md5 mismatch: got {got} want {exp_md5}")
        log(f"   chunks {i}-{i+len(group)-1} md5 OK")

    # Verify staged length, decode, verify sha256 of decoded bytes
    out = bridge(
        f"wc -c < {stage_b64} && base64 -d {stage_b64} > {stage_tmp}.new "
        f"&& sha256sum {stage_tmp}.new"
    )
    lines = out.strip().splitlines()
    staged_len = int(lines[0].strip())
    if staged_len != len(b64):
        raise RuntimeError(f"staged b64 length {staged_len} != {len(b64)}")
    decoded_sha = lines[1].split()[0]
    if decoded_sha != local_sha:
        raise RuntimeError(f"decoded sha mismatch: {decoded_sha} != {local_sha}")
    log(f"   decoded sha256 OK ({decoded_sha[:16]}...)")

    # Install to final path (overwrite untracked file), verify final hash
    out = bridge(f"cp {stage_tmp}.new {final} && sha256sum {final} && rm -f {stage_b64} {stage_tmp} {stage_tmp}.new")
    final_sha = out.strip().splitlines()[0].split()[0]
    if final_sha != local_sha:
        raise RuntimeError(f"final sha mismatch: {final_sha} != {local_sha}")
    log(f"   installed {final} sha256 OK")
    return local_sha


def main():
    open(LOG, "a").write("=== transfer run ===\n")
    results = {}
    for local, final in FILES:
        try:
            results[final] = transfer_one(local, final)
        except Exception as e:
            log(f"FAILED {final}: {e}")
            sys.exit(1)
    log("ALL TRANSFERS OK")
    for final, sha in results.items():
        log(f"  {final}  {sha}")


if __name__ == "__main__":
    main()
