"""Convert the 13 remaining orchestration generators from hardcoded Windows
orchestration paths to module-relative resolution via artifact_paths.js.

Pattern (matches Codex's representative patch 2c656513b on generate_uuid_registry.js):
  fs.readFileSync('c:\\Users\\nolan\\PING\\orchestration\\X.json', ...)
    -> fs.readFileSync(resolveArtifactPath('X.json'), ...)
plus: const { resolveArtifactPath } = require('./artifact_paths');
"""
import io
import sys

FILES = [
    "generate_architecture_manifest.js",
    "generate_authority_resolver.js",
    "generate_capability_registry.js",
    "generate_context_packets.js",
    "generate_cross_reference_matrix.js",
    "generate_dependency_graph.js",
    "generate_execution_graphs.js",
    "generate_execution_router.js",
    "generate_hygiene_report.js",
    "generate_law_router.js",
    "generate_routing_cache.js",
    "generate_routing_index.js",
    "generate_symbol_router.js",
]

OLD_PREFIX = "'c:\\\\Users\\\\nolan\\\\PING\\\\orchestration\\\\"
NEW_PREFIX = "resolveArtifactPath('"
REQUIRE_LINE = "const { resolveArtifactPath } = require('./artifact_paths');"
ANCHOR = "const path = require('path');"

for fname in FILES:
    with io.open(fname, "r", encoding="utf-8") as fh:
        content = fh.read()
    if REQUIRE_LINE in content:
        print("SKIP (already converted): " + fname)
        continue
    n = content.count(OLD_PREFIX)
    if n == 0:
        print("BLOCKED (no hardcoded prefix found): " + fname)
        sys.exit(1)
    content = content.replace(OLD_PREFIX, NEW_PREFIX)
    if ANCHOR not in content:
        print("BLOCKED (anchor not found): " + fname)
        sys.exit(1)
    content = content.replace(ANCHOR, ANCHOR + "\n" + REQUIRE_LINE, 1)
    with io.open(fname, "w", encoding="utf-8", newline="") as fh:
        fh.write(content)
    print("OK %s: %d path(s) converted" % (fname, n))
