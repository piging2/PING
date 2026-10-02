#!/usr/bin/env python3
"""Phase 7 gateway wiring patch (real anchors, verified 2026-09-19).

Applies minimal handle wiring in gateway_runtime.js:
  1. import ProducerEventPort
  2. declare let producerEventPort
  3. create the port after the envelope initializes (lazy UER resolution)
  4-7. inject the port into the four business authorities
  8. expose the port on the services object
  9. pass the port as second dependency to createCanonicalEventRoutes

Every replacement asserts a unique anchor. Exits nonzero on any miss.
"""
import pathlib, sys

p = pathlib.Path('/home/nolan/worktrees/constitutional-convergence-authority-law/gateway/bootstrap/gateway_runtime.js')
src = p.read_text()

def rep(old, new, tag):
    global src
    n = src.count(old)
    if n != 1:
        print('ANCHOR MISS [%s]: found %d (expected 1)' % (tag, n))
        sys.exit(1)
    src = src.replace(old, new)

# E1: import
rep(
    "const { CanonicalEventEnvelope } = require('../canonical_event_envelope');",
    "const { CanonicalEventEnvelope } = require('../canonical_event_envelope');\n"
    "const { ProducerEventPort } = require('../../ping-runtime/events/producer_event_port.js');",
    'E1 import')

# E2: declare
rep(
    "    let canonicalEventEnvelope = null;",
    "    let canonicalEventEnvelope = null;\n    let producerEventPort = null;",
    'E2 declare')

# E3: create the port after the envelope initializes
rep(
    "        canonicalEventEnvelope = new CanonicalEventEnvelope(this._storage, { repoRoot });\n"
    "        await canonicalEventEnvelope.initialize();",
    "        canonicalEventEnvelope = new CanonicalEventEnvelope(this._storage, { repoRoot });\n"
    "        await canonicalEventEnvelope.initialize();\n"
    "\n"
    "        // Phase 7: producer event handle. Business authorities emit through\n"
    "        // this port rather than the envelope receipt surface. The port\n"
    "        // classifies each producer event type and routes it along the\n"
    "        // converged seam (direct UER acceptance for registered/mapped types,\n"
    "        // explicit receipt for domain envelope types). Lazy runtime\n"
    "        // resolution: authorities are constructed before unifiedEventRuntime\n"
    "        // exists, so the port resolves it at call time.\n"
    "        producerEventPort = new ProducerEventPort({\n"
    "          envelope: canonicalEventEnvelope,\n"
    "          governance: eventGovernance,\n"
    "          getEventRuntime: () => unifiedEventRuntime,\n"
    "        });",
    'E3 create port')

# E4-E7: inject into the four authorities
rep(
    "aiWorkspaceAuthority = new AIWorkspaceAuthority(this._storage, huggingfaceAdapter, canonicalEventEnvelope);",
    "aiWorkspaceAuthority = new AIWorkspaceAuthority(this._storage, huggingfaceAdapter, producerEventPort);",
    'E4 ai')
rep(
    "reviewAuthority = new ReviewAuthority(this._storage, canonicalEventEnvelope, businessProfileAdapter);",
    "reviewAuthority = new ReviewAuthority(this._storage, producerEventPort, businessProfileAdapter);",
    'E5 review')
rep(
    "customerAuthority = new CustomerAuthority(this._storage, canonicalEventEnvelope, {",
    "customerAuthority = new CustomerAuthority(this._storage, producerEventPort, {",
    'E6 customer')
rep(
    "projectAuthority = new ProjectAuthority(this._storage, canonicalEventEnvelope);",
    "projectAuthority = new ProjectAuthority(this._storage, producerEventPort);",
    'E7 project')

# E8: expose on services
rep(
    "      eventReadAuthority, repoStore, kernelAdapter, canonicalEventEnvelope,",
    "      eventReadAuthority, repoStore, kernelAdapter, canonicalEventEnvelope, producerEventPort,",
    'E8 services')

# E9: pass the port to the route factory
rep(
    "this._app.use('/canonical-events', createCanonicalEventRoutes(services.canonicalEventEnvelope));",
    "this._app.use('/canonical-events', createCanonicalEventRoutes(services.canonicalEventEnvelope, services.producerEventPort));",
    'E9 routes')

p.write_text(src)
print('gateway_runtime.js patched: E1-E9 ok')
