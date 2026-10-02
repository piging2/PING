#!/usr/bin/env python3
"""Canonical-to-mirror prospect digest preflight (2026-09-23, CEO MODE).

The canonical prospect list lives in ~/workspace/your_files/; the goal's
files/ tree carries a derived mirror. The outreach engine consumes the
mirror, so drift between canonical and mirror must be caught before a
sweep starts. This preflight runs FIRST at sweep start and re-syncs the
mirror FROM canonical, one direction only:

  1. sha256(canonical jsonl) vs sha256(mirror jsonl), and byte-equality of
     the digest + provenance mirrors. All equal: print clean, exit 0,
     no writes.
  2. Otherwise: atomically copy canonical jsonl -> mirror jsonl, rebuild
     the canonical digest with prospect-digest.py (content-hashed, skips
     when the source is unchanged), then atomically copy the digest and
     its provenance to the goal mirror, and verify post-copy equality.
  3. Fail closed: a missing canonical, or any post-copy verification
     mismatch, exits nonzero and the engine must not start on a
     diverged mirror.

One direction only. This script NEVER merges mirror data back into
canonical. Deterministic, idempotent. No em dashes in output.
"""
import hashlib
import os
import shutil
import subprocess
import sys

HOME = os.path.expanduser("~")
OUTREACH = HOME + "/workspace/outreach"
GOAL_FILES = HOME + "/workspace/goals/ping-social-outreach-campaign/files"

CANONICAL_JSONL = HOME + "/workspace/your_files/western-co-prospects.jsonl"
CANONICAL_DIGEST = HOME + "/workspace/your_files/prospect-digest.md"
CANONICAL_PROV = HOME + "/workspace/your_files/prospect-digest.provenance.json"
MIRROR_JSONL = GOAL_FILES + "/western-co-prospects.jsonl"
MIRROR_DIGEST = GOAL_FILES + "/prospect-digest.md"
MIRROR_PROV = GOAL_FILES + "/prospect-digest.provenance.json"
DIGEST_PY = OUTREACH + "/prospect-digest.py"

CLEAN = 0
FAILED = 2


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def files_equal(a, b):
    """Byte equality; False when either side is missing."""
    try:
        return sha256_file(a) == sha256_file(b)
    except OSError:
        return False


def atomic_copy(src, dst):
    """Copy bytes to dst atomically (tmp + fsync + os.replace)."""
    tmp = dst + ".preflight.tmp"
    with open(src, "rb") as fsrc, open(tmp, "wb") as fdst:
        shutil.copyfileobj(fsrc, fdst, 65536)
        fdst.flush()
        os.fsync(fdst.fileno())
    os.replace(tmp, dst)


def run_digest_builder():
    """Rebuild the canonical digest (content-hashed, skips when unchanged)."""
    r = subprocess.run([sys.executable, DIGEST_PY], cwd=OUTREACH,
                       capture_output=True, text=True, timeout=300)
    sys.stdout.write(r.stdout)
    sys.stderr.write(r.stderr)
    return r.returncode


def preflight(canonical_jsonl=CANONICAL_JSONL,
              canonical_digest=CANONICAL_DIGEST,
              canonical_prov=CANONICAL_PROV,
              mirror_jsonl=MIRROR_JSONL,
              mirror_digest=MIRROR_DIGEST,
              mirror_prov=MIRROR_PROV,
              digest_runner=run_digest_builder,
              copy_fn=atomic_copy):
    """Run the preflight. Returns CLEAN (0) or FAILED (2)."""
    if not os.path.isfile(canonical_jsonl):
        print("preflight: FAILED: canonical missing: %s" % canonical_jsonl)
        return FAILED
    ch = sha256_file(canonical_jsonl)

    jsonl_ok = files_equal(canonical_jsonl, mirror_jsonl)
    digest_ok = files_equal(canonical_digest, mirror_digest)
    prov_ok = files_equal(canonical_prov, mirror_prov)
    if jsonl_ok and digest_ok and prov_ok:
        print("preflight: clean: mirror matches canonical "
              "(jsonl sha256:%s, digest and provenance byte-equal); no writes"
              % ch[:12])
        return CLEAN

    if not jsonl_ok:
        try:
            mh = sha256_file(mirror_jsonl)
            state = "mismatched (mirror sha256:%s)" % mh[:12]
        except OSError:
            state = "absent"
        print("preflight: mirror jsonl %s; copying canonical (sha256:%s)"
              % (state, ch[:12]))
        copy_fn(canonical_jsonl, mirror_jsonl)
        if not files_equal(canonical_jsonl, mirror_jsonl):
            print("preflight: FAILED: post-copy jsonl verification mismatch")
            return FAILED
    else:
        print("preflight: mirror jsonl matches canonical (sha256:%s)"
              % ch[:12])

    rc = digest_runner()
    if rc != 0:
        print("preflight: FAILED: digest builder exited %d" % rc)
        return FAILED
    for src, dst, label in ((canonical_digest, mirror_digest, "digest"),
                            (canonical_prov, mirror_prov, "provenance")):
        if not os.path.isfile(src):
            print("preflight: FAILED: canonical %s missing after rebuild: %s"
                  % (label, src))
            return FAILED
        if not files_equal(src, dst):
            print("preflight: copying canonical %s to mirror" % label)
            copy_fn(src, dst)
        if not files_equal(src, dst):
            print("preflight: FAILED: post-copy %s verification mismatch"
                  % label)
            return FAILED

    if not files_equal(canonical_jsonl, mirror_jsonl):
        print("preflight: FAILED: final jsonl verification mismatch")
        return FAILED
    print("preflight: repaired: mirror re-synced from canonical "
          "(jsonl sha256:%s); post-copy verification passed" % ch[:12])
    return CLEAN


def main():
    sys.exit(preflight())


if __name__ == "__main__":
    main()
