"""Repair pass 1 of the generator conversion.

Pass 1 replaced the literal prefix 'c:\\Users\\nolan\\PING\\orchestration\\'
with "resolveArtifactPath('", which swallowed the call's second argument
(e.g. the 'utf8' encoding or the JSON.stringify payload) into
resolveArtifactPath. Every resolveArtifactPath call takes exactly one
argument (the artifact file name), so any occurrence of

    resolveArtifactPath('NAME', <rest>

must become

    resolveArtifactPath('NAME'), <rest>

This is a pure syntactic repair; it does not change which files are read
or written.
"""
import io
import re
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

PATTERN = re.compile(r"resolveArtifactPath\('([^']+)', ")

for fname in FILES:
    with io.open(fname, "r", encoding="utf-8") as fh:
        content = fh.read()
    fixed, n = PATTERN.subn(r"resolveArtifactPath('\1'), ", content)
    if n == 0:
        print("BLOCKED (no repairable call found): " + fname)
        sys.exit(1)
    with io.open(fname, "w", encoding="utf-8", newline="") as fh:
        fh.write(fixed)
    print("OK %s: %d call(s) repaired" % (fname, n))
