#!/usr/bin/env python3
"""Pull PNG captures from the Pig to the local workspace.

Protocol (per lane instructions): python-based base64 chunking at 2000
chars per chunk with md5 verification per chunk, plus whole-file md5.
The Pig side emits FILE/C/ENDFILE lines through pigwsl-run.sh stdout;
this script verifies every chunk, reassembles, verifies the file, and
writes it under the local shots-rail tree.

Usage:
  pull-shots.py <manifest.json>   # pulls every row's file
  pull-shots.py --batch N <manifest.json>

Env: PIG_BASE (default /tmp/rail-proof/shots-rail),
     LOCAL_OUT (default ~/workspace/fyd-portal-proof/shots-rail)
"""
import base64
import hashlib
import json
import os
import subprocess
import sys

BRIDGE = os.path.expanduser("~/workspace/pig/pigwsl-run.sh")
CHUNK = 2000

EMITTER = r"""
import base64, hashlib, os, sys
base = os.environ.get("PIG_BASE", "/tmp/rail-proof/shots-rail")
CH = 2000
for rel in sys.argv[1:]:
    p = os.path.join(base, rel)
    data = open(p, "rb").read()
    md5 = hashlib.md5(data).hexdigest()
    b64 = base64.b64encode(data).decode()
    n = (len(b64) + CH - 1) // CH
    print(f"FILE {rel} {len(data)} {md5} {n}", flush=True)
    for i in range(0, len(b64), CH):
        chunk = b64[i:i+CH]
        print(f"C {hashlib.md5(chunk.encode()).hexdigest()} {chunk}", flush=True)
    print("ENDFILE", flush=True)
print("DONE", flush=True)
"""


def run_bridge(script):
    proc = subprocess.run(
        [BRIDGE, script],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=300,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"bridge failed rc={proc.returncode}: {proc.stderr[-2000:]}")
    try:
        env = json.loads(proc.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"bridge stdout was not JSON: {proc.stdout[-500:]}")
    return env.get("stdout", "")


def pull_batch(relpaths, pig_base, local_out):
    script = f'PIG_BASE={pig_base} python3 - {" ".join(relpaths)} <<\'PYEOF\'\n{EMITTER}\nPYEOF'
    # argv must carry the rel paths: use env instead to avoid quoting pain
    arg_str = " ".join(f'"{r}"' for r in relpaths)
    script = (
        f'PIG_BASE={pig_base} python3 - {arg_str} <<\'PYEOF\'\n{EMITTER}\nPYEOF'
    )
    out = run_bridge(script)
    files = {}
    cur = None
    chunks = []
    for line in out.splitlines():
        if line.startswith("FILE "):
            _, rel, size, md5, n = line.split(" ", 4)
            cur = {"rel": rel, "size": int(size), "md5": md5, "n": int(n)}
            chunks = []
        elif line.startswith("C ") and cur is not None:
            _, csum, data = line.split(" ", 2)
            if hashlib.md5(data.encode()).hexdigest() != csum:
                raise RuntimeError(f"chunk md5 mismatch in {cur['rel']}")
            chunks.append(data)
        elif line == "ENDFILE" and cur is not None:
            if len(chunks) != cur["n"]:
                raise RuntimeError(
                    f"chunk count mismatch in {cur['rel']}: got {len(chunks)}, want {cur['n']}"
                )
            raw = base64.b64decode("".join(chunks).encode())
            if len(raw) != cur["size"]:
                raise RuntimeError(f"size mismatch in {cur['rel']}")
            if hashlib.md5(raw).hexdigest() != cur["md5"]:
                raise RuntimeError(f"file md5 mismatch in {cur['rel']}")
            dest = os.path.join(local_out, cur["rel"])
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as f:
                f.write(raw)
            files[cur["rel"]] = len(raw)
            cur = None
            chunks = []
        elif line == "DONE":
            break
    missing = [r for r in relpaths if r not in files]
    if missing:
        raise RuntimeError(f"incomplete transfer, missing: {missing}")
    return files


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--batch")]
    batch = 2
    for i, a in enumerate(sys.argv[1:]):
        if a == "--batch":
            batch = int(sys.argv[1:][i + 1])
    manifest_path = args[0]
    pig_base = os.environ.get("PIG_BASE", "/tmp/rail-proof/shots-rail")
    local_out = os.path.expanduser(
        os.environ.get("LOCAL_OUT", "~/workspace/fyd-portal-proof/shots-rail")
    )
    with open(manifest_path) as f:
        manifest = json.load(f)
    relpaths = []
    for row in manifest["rows"]:
        if row.get("file") and row["file"] not in relpaths:
            relpaths.append(row["file"])
    print(f"{len(relpaths)} unique files, batch={batch}")
    total = 0
    for i in range(0, len(relpaths), batch):
        chunk = relpaths[i : i + batch]
        got = pull_batch(chunk, pig_base, local_out)
        total += len(got)
        print(f"  batch {i//batch + 1}: {len(got)} files ok ({sum(got.values())} bytes)")
    print(f"DONE: {total} files verified into {local_out}")


if __name__ == "__main__":
    main()
