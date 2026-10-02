// CJS interception for *.css (jest css-stub equivalent).
// Loaded via node --require before tsx registers its hooks.
// Strategy: rewrite CSS requests to a real CJS stub at _resolveFilename
// time, so tsx's transformer compiles the stub (plain JS) instead of CSS.
const Module = require("node:module");
const CSS_STUB = "/home/nolan/fyd-missions/shard-0/css-stub.cjs";
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === "string" && /\.css$/.test(request)) {
    return CSS_STUB;
  }
  return origResolve.call(this, request, parent, isMain, options);
};
// Backup: short-circuit _load too, in case resolution is bypassed.
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (typeof request === "string" && /\.css$/.test(request)) {
    return {};
  }
  return origLoad.call(this, request, parent, isMain);
};
