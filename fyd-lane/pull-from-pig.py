#!/usr/bin/env python3
"""Pull files from the Pig to this box via pigwsl-run.sh using base64 chunks.

Per AGENTS.md Pig bridge lessons:
- python-based chunking at 2000 chars
- per-chunk size verification on the Pig side, md5-verify after decode
- stdin redirected from /dev/null on every call

Usage: pull-from-pig.py <pig-absolute-path> <local-path> [<pig2> <local2> ...]
"""
import base64
import hashlib
import os
import subprocess
import sys

BRIDGE = os.path.expanduser("~/workspace/pig/pigwsl-run.sh")
CHUNK = 2000


def sh(cmd):
    p = subprocess.run([BRIDGE, cmd], stdin=subprocess.DEVNULL,
                       capture_output=True, text=True, timeout=120)
    return p


def pull(remote, local):
    r = sh("python3 -c \"import base64,sys; "
           "sys.stdout.write(base64.b64encode(open('%s','rb').read()).decode())\" "
           "| python3 -c \"import sys; d=sys.stdin.read(); "
           "print(len(d)); [print(d[i:i+%d]) for i in range(0,len(d),%d)]\""
           % (remote, CHUNK, CHUNK))
    if r.returncode != 0:
        raise RuntimeError("pig encode failed: %s %s" % (r.stdout, r.stderr))
    lines = r.stdout.splitlines()
    total = int(lines[0])
    chunks = lines[1:]
    b64 = "".join(chunks)
    if len(b64) != total:
        raise RuntimeError("chunk size mismatch: got %d want %d" % (len(b64), total))
    data = base64.b64decode(b64)
    os.makedirs(os.path.dirname(os.path.abspath(local)), exist_ok=True)
    with open(local, "wb") as f:
        f.write(data)
    # md5 verify against Pig
    want = sh("md5sum '%s' | cut -d' ' -f1" % remote).stdout.strip()
    got = hashlib.md5(data).hexdigest()
    if want != got:
        raise RuntimeError("md5 mismatch for %s: pig=%s local=%s" % (remote, want, got))
    print("OK %s -> %s (%d bytes, md5 %s)" % (remote, local, len(data), got[:12]))


def main(argv):
    if len(argv) < 3 or len(argv) % 2 == 0:
        sys.stderr.write("usage: pull-from-pig.py <pig-path> <local-path> ...\n")
        return 1
    for i in range(1, len(argv), 2):
        pull(argv[i], argv[i + 1])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
