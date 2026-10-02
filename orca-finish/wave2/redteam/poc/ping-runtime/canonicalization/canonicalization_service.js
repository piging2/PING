'use strict';
// Stub of the branch's canonicalization_service.js export used by the adapter.
// The real module lives Pig-side; only NAMESPACE_RE is consumed.
module.exports = { NAMESPACE_RE: /^(core|tenant)::[a-z0-9_.-]+$/ };
