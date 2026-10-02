#!/usr/bin/env python3
"""Phase 7 route patch for gateway/routes/canonical_events.js (real anchors).

  C1. createCanonicalEventRoutes takes the producer port as a second dependency
  C2. POST / routes through the port (ingestion seam); every other route
      (GET list/stats/unprocessed, POST :id/processed, POST :id/failed) stays
      on the envelope untouched.

Every replacement asserts a unique anchor. Exits nonzero on any miss.
"""
import pathlib, sys

p = pathlib.Path('/home/nolan/worktrees/constitutional-convergence-authority-law/gateway/routes/canonical_events.js')
src = p.read_text()

def rep(old, new, tag):
    global src
    n = src.count(old)
    if n != 1:
        print('ANCHOR MISS [%s]: found %d (expected 1)' % (tag, n))
        sys.exit(1)
    src = src.replace(old, new)

# C1: second dependency
rep(
    "function createCanonicalEventRoutes(canonicalEventEnvelope) {",
    "function createCanonicalEventRoutes(canonicalEventEnvelope, producerEventPort = null) {",
    'C1 signature')

# C2: POST ingestion seam (real block: snake_case body, camelCase envelope call)
rep(
    "    const event = await canonicalEventEnvelope.executeEmitEvent({\n"
    "      tenantId: tenant_id,\n"
    "      eventType: event_type,\n"
    "      source,\n"
    "      actor,\n"
    "      payload,\n"
    "      causationId: causation_id,\n"
    "      correlationId: correlation_id,\n"
    "      metadata,\n"
    "    });\n"
    "\n"
    "    return { event };",
    "    // Phase 7: ingestion seam. The producer port classifies the event\n"
    "    // type: registered types are accepted directly by UnifiedEventRuntime;\n"
    "    // unregistered (legacy) types take the explicit receipt path through\n"
    "    // the envelope. Every other route below stays on the envelope\n"
    "    // (representation + receipt history read surface).\n"
    "    if (producerEventPort) {\n"
    "      const result = await producerEventPort.emitProducerEvent({\n"
    "        tenantId: tenant_id,\n"
    "        eventType: event_type,\n"
    "        source,\n"
    "        actor,\n"
    "        payload,\n"
    "        causationId: causation_id,\n"
    "        correlationId: correlation_id,\n"
    "        metadata,\n"
    "      });\n"
    "      return { event: result };\n"
    "    }\n"
    "\n"
    "    const event = await canonicalEventEnvelope.executeEmitEvent({\n"
    "      tenantId: tenant_id,\n"
    "      eventType: event_type,\n"
    "      source,\n"
    "      actor,\n"
    "      payload,\n"
    "      causationId: causation_id,\n"
    "      correlationId: correlation_id,\n"
    "      metadata,\n"
    "    });\n"
    "\n"
    "    return { event };",
    'C2 POST seam')

p.write_text(src)
print('canonical_events.js patched: C1-C2 ok')
