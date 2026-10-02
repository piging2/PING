// Runtime @/ alias for the compiled proof (same pattern as fyd-product-lane/proof/run.sh).
const path = require("node:path");
const Module = require("node:module");
const base = path.join(__dirname, "dist", "src");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(base, request.slice(2));
  }
  return orig.call(this, request, parent, ...rest);
};
