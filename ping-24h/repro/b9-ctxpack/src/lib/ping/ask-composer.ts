// B9 repro stub (faithful). The real @/lib/ping/ask-composer.ts re-exports
// canonicalize from ./digest (verified: ask-composer.ts:17
// `import { canonicalize, sha256Hex } from "./digest"`). This stub delegates
// to the REAL digest module, so canonicalization behavior is unchanged.
export { canonicalize } from "./digest";
