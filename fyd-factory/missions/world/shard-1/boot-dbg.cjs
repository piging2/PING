// boot-dbg.cjs: load debug.ts instead of the main harness.
const { register } = require("/home/nolan/projects/ping/node_modules/tsx/dist/cjs/api/index.cjs");
register({ tsconfig: "/home/nolan/projects/ping/tsconfig.json" });
globalThis.React = require("/home/nolan/projects/ping/node_modules/react");
require.extensions[".css"] = function (module) {
  module.exports = new Proxy({}, { get: (t, p) => (p === "__esModule" ? false : String(p)) });
};
require("/home/nolan/shard1/debug.ts");
