#!/usr/bin/env python3
"""Determinism probe: two-run byte-compare on a JSON projection.

Implements the Gap-8 substrate determinism-probe contract
(fyd-lane/substrate/determinism-probe/CONTRACT.md):

    normalize declared volatile fields -> run generator twice ->
    canonical-encode -> byte-compare -> exit code

The generator is invoked twice as a subprocess (fresh processes, so
module counters / Date.now-style / random leaks in the generator are
caught). Declared volatile fields are overwritten with a fixed sentinel
before canonical encoding. Undeclared volatiles (timestamp leaks, random
ids) break the byte comparison and are reported as NOT_STABLE.

No defaults point at the Pig. Pig paths are explicit overrides only:

    python3 check-stable.py \
        --gen-cmd "python3 /home/nolan/ping/tools/fyd-site-projection/dump.py" \
        --gen-arg coppersmith-plumbing \
        --projection /home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json \
        --volatile meta.dumpedAt \
        --env FYD_OVERLAY_JOURNAL=demo

Exit codes: 0 = BYTE_STABLE; 1 = NOT_STABLE (divergence named on stdout);
2 = probe usage/config error (stderr).
"""
import argparse
import hashlib
import json
import os
import shlex
import subprocess
import sys

SENTINEL_DEFAULT = "NORMALIZED"


def parse_args(argv):
    p = argparse.ArgumentParser(
        description="Two-run byte-stability probe for JSON projections.")
    p.add_argument("--gen-cmd", required=True,
                   help="Generator command that (re)writes the projection "
                        "(shell-style string, shlex-split). Required; no default.")
    p.add_argument("--gen-arg", action="append", default=[],
                   help="Extra argument appended to the generator command "
                        "(repeatable, e.g. a tenant name).")
    p.add_argument("--projection", required=True,
                   help="Path to the JSON projection file the generator writes. "
                        "Required; no default.")
    p.add_argument("--volatile", action="append", default=[],
                   help="Dotted path of a volatile field to normalize "
                        "(repeatable, e.g. meta.dumpedAt). Also readable from "
                        "DET_PROBE_VOLATILE (comma-separated).")
    p.add_argument("--env", action="append", default=[],
                   help="KEY=VALUE added to the generator's environment "
                        "(repeatable). Nothing Pig-specific is set by default.")
    p.add_argument("--sentinel", default=SENTINEL_DEFAULT,
                   help="Normalization constant for volatile fields "
                        "(default: %(default)s).")
    p.add_argument("--label", default="",
                   help="Optional label printed with the verdict.")
    args = p.parse_args(argv)
    env_vol = os.environ.get("DET_PROBE_VOLATILE", "")
    if env_vol and not args.volatile:
        args.volatile = [v.strip() for v in env_vol.split(",") if v.strip()]
    return args


def set_nested(doc, dotted, value):
    """Overwrite a dotted object path with value. Missing path = probe error."""
    parts = dotted.split(".")
    cur = doc
    for part in parts[:-1]:
        if not isinstance(cur, dict) or part not in cur:
            return False
        cur = cur[part]
    if not isinstance(cur, dict) or parts[-1] not in cur:
        return False
    cur[parts[-1]] = value
    return True


def canonical(doc):
    return json.dumps(doc, sort_keys=True, separators=(",", ":")).encode("utf-8")


def run_generator(cmd, projection, env):
    r = subprocess.run(cmd, check=False, capture_output=True, text=True,
                       env=env)
    if r.returncode != 0:
        sys.stderr.write(
            "determinism-probe: generator failed rc=%d\n%s\n"
            % (r.returncode, r.stderr.strip()[-2000:]))
        sys.exit(2)
    if not os.path.exists(projection):
        sys.stderr.write(
            "determinism-probe: generator did not write %s\n" % projection)
        sys.exit(2)


def snap(args, cmd, gen_env):
    run_generator(cmd, args.projection, gen_env)
    try:
        with open(args.projection, "r", encoding="utf-8") as f:
            doc = json.load(f)
    except (OSError, ValueError) as e:
        sys.stderr.write("determinism-probe: cannot parse %s: %s\n"
                         % (args.projection, e))
        sys.exit(2)
    for field in args.volatile:
        if not set_nested(doc, field, args.sentinel):
            sys.stderr.write(
                "determinism-probe: declared volatile field %r absent from "
                "projection (schema change?)\n" % field)
            sys.exit(2)
    return canonical(doc)


def first_diff(a, b):
    n = min(len(a), len(b))
    for i in range(n):
        if a[i] != b[i]:
            return i
    return n if len(a) != len(b) else -1


def divergent_keys(run1_doc_raw, run2_doc_raw):
    """Name top-level keys whose canonical encodings differ between runs."""
    out = []
    keys = set(run1_doc_raw) | set(run2_doc_raw)
    for k in sorted(keys):
        e1 = canonical(run1_doc_raw.get(k))
        e2 = canonical(run2_doc_raw.get(k))
        if e1 != e2:
            out.append(k)
    return out


def main(argv):
    args = parse_args(argv)
    cmd = shlex.split(args.gen_cmd) + args.gen_arg
    gen_env = dict(os.environ)
    for kv in args.env:
        if "=" not in kv:
            sys.stderr.write("determinism-probe: bad --env %r (want KEY=VALUE)\n" % kv)
            sys.exit(2)
        k, v = kv.split("=", 1)
        gen_env[k] = v

    run1 = snap(args, cmd, gen_env)
    run2 = snap(args, cmd, gen_env)
    h1 = hashlib.sha256(run1).hexdigest()
    h2 = hashlib.sha256(run2).hexdigest()
    label = (" " + args.label) if args.label else ""
    print("run1%s %s" % (label, h1[:16]))
    print("run2%s %s" % (label, h2[:16]))
    if h1 == h2:
        print("BYTE_STABLE")
        return 0
    print("NOT_STABLE")
    off = first_diff(run1, run2)
    print("divergence: first byte difference at offset %d (run1 %d bytes, run2 %d bytes)"
          % (off, len(run1), len(run2)))
    # Re-parse (sentinel values stripped) to name the divergent top-level keys.
    d1 = json.loads(run1.decode("utf-8"))
    d2 = json.loads(run2.decode("utf-8"))
    for field in args.volatile:
        parts = field.split(".")
        cur1, cur2 = d1, d2
        for part in parts[:-1]:
            cur1 = cur1.get(part, {})
            cur2 = cur2.get(part, {})
        cur1.pop(parts[-1], None)
        cur2.pop(parts[-1], None)
    keys = divergent_keys(d1, d2)
    print("divergent top-level keys: %s" % (", ".join(keys) if keys else "(below top level)"))
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
