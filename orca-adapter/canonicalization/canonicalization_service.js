'use strict';
/**
 * SHIM — NOT the canonicalization authority.
 *
 * This file exists ONLY to satisfy the relative require in the vendored,
 * byte-identical external_agent_adapter.js (`require('../canonicalization/
 * canonicalization_service.js')`). In the proven Pig deployment the adapter
 * lives at ping-runtime/external-agent/, next to ping-runtime/canonicalization/.
 *
 * It exports NAMESPACE_RE with exactly the value of the adapter's own
 * fallback ("the contract pattern"), so adapter behavior here is
 * byte-for-byte identical to the proven fallback path. The real
 * CanonicalizationService (identity authority) lives Pig-side and is not
 * replicated, replaced, or competed with here.
 */
const NAMESPACE_RE = /^(core|tenant)::[a-z0-9_.-]+$/;

module.exports = { NAMESPACE_RE };
