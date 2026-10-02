#!/bin/bash
cd /home/nolan/projects/ping || exit 1
# Vendor the CSS-stub loader pattern (provenance: /home/nolan/fyd-proof-run/css-loader.mjs
# + register-css.mjs, 2026-09-22) so the tracer can import renderer.tsx under tsx.
cat > src/fyd/lineage/css-loader.mjs <<'MJS'
// Node module customization hooks: stub out .css imports (CSS modules)
// so server-side execution of .tsx components works under tsx/node.
// Pattern vendored from /home/nolan/fyd-proof-run/css-loader.mjs.
export async function resolve(specifier, context, next) {
  const res = await next(specifier, context);
  if (res.url.endsWith(".css")) return { ...res, shortCircuit: true };
  return res;
}
export async function load(url, context, next) {
  if (url.endsWith(".css")) {
    return { format: "module", source: "export default {};", shortCircuit: true };
  }
  return next(url, context);
}
MJS
cat > src/fyd/lineage/register-css.mjs <<'MJS'
// Registers the CSS stub hooks for both ESM (tsx) and CJS require paths.
// Pattern vendored from /home/nolan/fyd-proof-run/register-css.mjs.
import { register, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(here, "css-loader.mjs")).href);
createRequire(import.meta.url).extensions[".css"] = (m) => {
  m.exports = {};
};
MJS
echo "loaders staged"
npx tsx --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/spike-trace.ts 2>&1 | head -70
