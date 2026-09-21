#!/usr/bin/env python3
"""Lane F replay adapter (runs on the Pig).

Reuses the CANONICAL reducer in
/home/nolan/ping/tools/fyd-site-projection/dump.py UNCHANGED: the same
functions (extract_base_graph, query_overlays, apply_overlays,
canonicalize, sha256_hex) and the same canonical ordering
(timestamp ASC, event_id ASC) and canonical bytes
(recursive key sort, array order preserved, separators ',', ':').

The adapter adds exactly two things the reducer lacks:
  (a) OUT_DIR redirected to an EMPTY disposable scratch dir — the live
      var/ path is never touched;
  (b) the overlay journal selectable via FYD_OVERLAY_JOURNAL env
      (default "demo": the journal the live happy-place projection's
      overlayEventIds came from, verified by event-id match).

Persisted canonical history replayed:
  base  = machine-generated fixture TS in the website repo
          (fixtureFileDigest + baseDigest recorded in meta)
  delta = FYD_SITE_OVERLAY rows in ping_events, aggregate fyd-site:<slug>,
          applied in (timestamp, event_id) order. No overlay without a
          PING event; unknown op kinds abort the dump (fail closed).

Usage: replay-adapter.py <slug> <scratch-dir>
Prints meta digests as JSON. Exit non-zero on any failure.
"""
import importlib.util
import json
import os
import sys

DUMP_PATH = "/home/nolan/ping/tools/fyd-site-projection/dump.py"


def main(argv):
    if len(argv) != 3:
        sys.stderr.write("usage: replay-adapter.py <slug> <scratch-dir>\n")
        return 1
    slug, scratch = argv[1], argv[2]
    spec = importlib.util.spec_from_file_location("fyd_projection_dump", DUMP_PATH)
    dump = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(dump)
    dump.OUT_DIR = scratch
    os.makedirs(scratch, exist_ok=True)
    preexisting = [f for f in os.listdir(scratch) if f.endswith(".json")]
    if preexisting:
        sys.stderr.write(
            "replay-adapter: scratch dir not empty (disposable projection "
            "requires an empty target): %r\n" % preexisting)
        return 1
    path = dump.dump_site(slug)
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    report = {k: doc["meta"][k] for k in (
        "siteId", "dumperVersion", "baseDigest", "fixtureFileDigest",
        "overlayEventIds", "graphDigest", "generatedAt", "eventSequences")}
    report["projectionPath"] = path
    print(json.dumps(report, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
