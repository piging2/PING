// Runtime @/ alias for the compiled proof (tsc does not rewrite path
// aliases in emitted JS). Loaded with node -r before the proof bundle.
const path = require("node:path");
const Module = require("node:module");

const DIST_ROOT = path.resolve(__dirname, "src"); // @/ -> repo src/
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === "@" || request.startsWith("@/")) {
    request = path.join(DIST_ROOT, request.slice(2));
  }
  return origResolve.call(this, request, parent, ...rest);
};
