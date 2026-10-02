#!/usr/bin/env python3
"""Restore the original confidence trace-field carry: canonical event metadata
uses `confidence_source` (see BaseWorker trace contract in canonical_workers.js);
the kernel envelope records it as `confidence_provenance`. The fidelity rewrite
accidentally changed the read side; this restores it."""
import io, sys

PATH = '/home/nolan/worktrees/constitutional-convergence/gateway/kernel_replay_execution_provider.js'
with io.open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

old = "            ...(event.metadata?.confidence_provenance ? { confidence_provenance: event.metadata.confidence_provenance } : {}),\n"
new = "            ...(event.metadata?.confidence_source ? { confidence_provenance: event.metadata.confidence_source } : {}),\n"

count = src.count(old)
if count != 1:
    sys.stderr.write('MISMATCH: found %d (need 1)\n' % count)
    sys.exit(1)
src = src.replace(old, new, 1)
with io.open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)
print('restored confidence_source read')
