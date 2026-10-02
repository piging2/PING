'use strict';
/**
 * ORCA-D vendor shim. The real branch file
 * (ping-runtime/canonicalization/canonicalization_service.js @ ae55b77ff)
 * does NOT export NAMESPACE_RE (module.exports = { CanonicalizationService,
 * DEFAULT_NAMESPACE, CANONICAL_VERSION } only), so external_agent_adapter.js
 * line 46 always falls back to its own regex. This shim is behaviorally
 * identical for the adapter's purposes and avoids the deep require chain.
 */
module.exports = {};
