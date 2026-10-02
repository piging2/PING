#!/bin/sh
# scripts/rebuild-canonical-json.sh
#
# F7/D2: the ONLY sanctioned way to produce
#   gateway/replay/kernel/canonical_json.js
# from its authoritative source
#   runtime/kernel/replay/canonical_json.ts
#
# Never hand-edit the compiled artifact: edit the TS source and rebuild.
# The build is fail-closed: any tsc error aborts before the artifact is copied.
#
# Build mechanism (established 2026-09-18; no repository build previously
# covered this artifact): TypeScript compiler in CommonJS/ES2020 mode,
# compiling the single authoritative source file. Its dependency closure is
# canonical_json.js plus the pre-existing gateway deterministic_failure.js
# (API-verified against the fresh compile; a NOTE is printed if a fresh
# compile of deterministic_failure.ts differs from the checked-in gateway
# copy, which is a separate unit and is not overwritten here).

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if command -v tsc >/dev/null 2>&1; then
  TSC="$(command -v tsc)"
elif [ -x /mnt/c/Users/nolan/AppData/Local/hermes/node/tsc ]; then
  TSC=/mnt/c/Users/nolan/AppData/Local/hermes/node/tsc
else
  echo "ERROR: tsc not found (tried PATH, then the hermes node install)." >&2
  echo "Install TypeScript (npm i -g typescript) and re-run." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

"$TSC" --module commonjs --target es2020 --outDir "$TMP/out" \
  "$ROOT/runtime/kernel/replay/canonical_json.ts"

if ! cmp -s "$TMP/out/deterministic_failure.js" "$ROOT/gateway/replay/kernel/deterministic_failure.js"; then
  echo "NOTE: fresh tsc output for deterministic_failure.js differs from the" >&2
  echo "checked-in gateway copy (known older-revision drift, frozen in" >&2
  echo "evidence/f7-freeze-2026-09-18/01-ts-js-drift.md). Not overwriting:" >&2
  echo "out of F7 scope. The rebuilt canonical_json.js only uses" >&2
  echo "DeterministicFailureFactory.create/toError/executionLimitExceeded," >&2
  echo "all of which are present in the gateway copy (verified 2026-09-18)." >&2
fi

cp "$TMP/out/canonical_json.js" "$ROOT/gateway/replay/kernel/canonical_json.js"

echo "rebuilt: gateway/replay/kernel/canonical_json.js"
echo "source : runtime/kernel/replay/canonical_json.ts"
