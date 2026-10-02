const Module = require("node:module");
const origJs = require.extensions[".js"];
require.extensions[".css"] = function (m: any) { m.exports = {}; };
const PING = "/home/nolan/projects/ping/src";
async function main() {
  try {
    const m = await import(PING + "/fyd/components/renderer.tsx");
    console.log("RENDERER_OK", typeof m.buildRenderContext);
  } catch (e:any) {
    console.log("RENDERER_FAIL", e.message);
    console.log((e.stack||"").split("\n").slice(0,8).join("\n"));
  }
}
main();
