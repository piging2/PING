#!/usr/bin/env python3
"""Transfer local files to the Pig via pigwsl-run.sh using base64 chunks.

Per AGENTS.md Pig bridge lessons:
- python-based chunking at 2000 chars (fold -w fails silently above ~2000)
- verify per-chunk size in the same call, concatenate on the Pig,
  md5-verify the decoded file.
- stdin redirected from /dev/null on every call.

Usage: transfer-to-pig.py <local-path> <pig-absolute-path> [<local2> <pig2> ...]
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


def transfer(local, remote):
    with open(local, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("ascii")
    chunks = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)] or [""]
    want_md5 = hashlib.md5(data).hexdigest()
    staging = "/tmp/fyd-transfer-%s.b64" % want_md5[:12]
    rdir = os.path.dirname(remote)

    r = sh("mkdir -p '%s' && rm -f '%s' && echo MKDIR-OK" % (rdir, staging))
    if "MKDIR-OK" not in r.stdout:
        raise RuntimeError("mkdir failed: %s %s" % (r.stdout, r.stderr))

    cumulative = 0
    for i, ch in enumerate(chunks):
        cumulative += len(ch)
        # single call: append chunk, verify cumulative size matches
        r = sh("printf '%%s' '%s' >> '%s' && [ $(wc -c < '%s') -eq %d ] && echo CHUNK-%d-OK"
               % (ch, staging, staging, cumulative, i))
        if ("CHUNK-%d-OK" % i) not in r.stdout:
            raise RuntimeError("chunk %d failed for %s: %s %s"
                               % (i, local, r.stdout, r.stderr))

    r = sh("base64 -d '%s' > '%s' && [ \"$(md5sum < '%s' | cut -d' ' -f1)\" = '%s' ]"
           " && rm -f '%s' && echo TRANSFER-OK" % (staging, remote, remote, want_md5, staging))
    if "TRANSFER-OK" not in r.stdout:
        raise RuntimeError("final verify failed for %s: %s %s" % (local, r.stdout, r.stderr))
    print("OK %s -> %s (%d bytes, md5 %s)" % (local, remote, len(data), want_md5[:12]))


def main(argv):
    if len(argv) < 3 or len(argv) % 2 == 0:
        sys.stderr.write("usage: transfer-to-pig.py <local> <remote> [<local> <remote> ...]\n")
        return 1
    pairs = list(zip(argv[1::2], argv[2::2]))
    for local, remote in pairs:
        transfer(local, remote)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
