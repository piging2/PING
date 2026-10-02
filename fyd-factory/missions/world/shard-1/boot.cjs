// boot.cjs: register tsx CJS hooks, stub .css (repo's object-circle CSS module),
// then load the harness. Never touches the repo working tree.
const { register } = require("/home/nolan/projects/ping/node_modules/tsx/dist/cjs/api/index.cjs");
register({ tsconfig: "/home/nolan/projects/ping/tsconfig.json" });
// CSS modules are style-only; stub them so plain-node SSR never parses CSS.
require.extensions[".css"] = function (module) {
  module.exports = new Proxy({}, { get: (t, p) => (p === "__esModule" ? false : String(p)) });
};
// The tsx CJS pipeline compiles JSX to React.createElement in some modules;
// provide React globally so classic-runtime output never faults.
globalThis.React = require("/home/nolan/projects/ping/node_modules/react");
require("/home/nolan/shard1/harness.ts");
