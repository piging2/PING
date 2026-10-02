#!/usr/bin/env python3
"""Pin swap for ping-fyd: dump-era pin -> acquisition-rebuild pin.

Exact-text replacements only. Fails loudly if any anchor is missing.
"""
import sys

PATH = "/home/nolan/worktrees/fyd-i07-acquisition/src/fyd/data/fyd-tenant-graph.ts"
NEW_DIGEST = "728757b0d736b1c710634bff9bcaf791004ba37a379e330b2d97c8f33d1fa4fd"
NEW_GENERATED_AT = "2026-09-29T18:07:00.000Z"

src = open(PATH, encoding="utf-8").read()

edits = [
    (
        """   * PING Social (the dogfood tenant): the owner-asserted knowledge base the
   * PING-side dump recorded 2026-09-21, pinned here as a fixture exactly as
   * happy-place and coppersmith-plumbing are pinned. The digest below is
   * sha256 over the repo-canonical JSON of the fixture base; it matches the
   * dump's recorded graphDigest (bd56fbed...2d982ec1562), so the pin locks
   * the same base the dump verified.
""",
        """   * PING Social (the exploratory tenant): the owner-asserted knowledge base
   * rebuilt 2026-09-29 by the acquisition driver
   * (src/fyd/acquisition/rebuild-ping.ts, driver fyd-acquisition-rebuild@1,
   * manifest src/fyd/acquisition/ping-sources.json). The digest below is
   * sha256 over the repo-canonical JSON of the rebuilt fixture base (the
   * seam's exact digest rule); the prior dump-era pin was
   * bd56fbed...2d982ec1562. The rebuild's diffTwin verdict was no-op (zero
   * semantic change; only provenance.derivedAt re-stamped to the
   * re-observation time), so the pin locks the same facts the dump
   * verified, re-observed.
""",
    ),
    (
        """   * Epistemic honesty: this base is owner-asserted only (hand-authored,
   * stale since 2026-09-21; all four service objects carry empty fields).
   * Ask FYD answers from it with USER_OVERRIDE-ranked owner assertions and
   * refuses what is not there (UNSUPPORTED). Improving knowledge quality
   * belongs at the PING source, never inside this pin.
""",
        """   * Epistemic honesty: this base is owner-asserted only (hand-authored;
   * re-observed 2026-09-29 with zero semantic change from the 2026-09-21
   * baseline; all four service objects still carry empty fields). Ask FYD
   * answers from it with USER_OVERRIDE-ranked owner assertions and refuses
   * what is not there (UNSUPPORTED). Improving knowledge quality belongs at
   * the PING source, never inside this pin.
""",
    ),
    (
        '''  "ping-fyd": {
    graph: PING_FYD_GRAPH,
    baseDigest:
      "bd56fbed1e7ed91729e6671d5e1d9b94560fb7dff800dbc6d40322d982ec1562",
    generatedAt: "2026-09-21T00:00:00.000Z",
    eventSequences: null,
  },''',
        f'''  "ping-fyd": {{
    graph: PING_FYD_GRAPH,
    baseDigest:
      "{NEW_DIGEST}",
    generatedAt: "{NEW_GENERATED_AT}",
    eventSequences: null,
  }},''',
    ),
]

for old, new in edits:
    if src.count(old) != 1:
        print(f"ANCHOR PROBLEM (count={src.count(old)}): {old[:90]!r}")
        sys.exit(1)
    src = src.replace(old, new)

open(PATH, "w", encoding="utf-8").write(src)
print("pin swap ok")
