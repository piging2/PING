// ==== T-06 HARNESS COPY — NOT PRODUCT CODE ====
// Source: branch mc/lane-c-reconcile-gate, commit 25e33e9, path orca-adapter/canonicalization/canonicalization_service.js
// Extracted read-only for the T-06 corpus runner (~/workspace/ping-24h/sprint/h02-06/t06-runner).
// Never wired into any product suite. Do not edit, commit, or deploy.
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
