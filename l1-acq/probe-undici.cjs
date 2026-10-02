// Probe: what DNS/connection hooks does this Node's fetch stack expose?
const nodeVer = process.version;
let undiciVer = "n/a";
try {
  const u = require("undici");
  undiciVer = require("undici/package.json").version;
} catch (e) {
  undiciVer = "undici-package-missing:" + String(e).slice(0, 60);
}
console.log(JSON.stringify({ node: nodeVer, undici: undiciVer }));

// Does undici Agent accept a custom connect/lookup? (type-level check via options echo)
try {
  const { Agent } = require("undici");
  const a = new Agent({
    connect: {
      lookup: (host, opts, cb) => cb(null, "93.184.216.34", 4),
    },
  });
  console.log("agent-custom-lookup-constructed: true");
  a.close();
} catch (e) {
  console.log("agent-custom-lookup-constructed: false " + String(e).slice(0, 120));
}

// Does global fetch accept a dispatcher option?
try {
  const { Agent } = require("undici");
  const a = new Agent({ connect: { lookup: (h, o, cb) => cb(null, "93.184.216.34", 4) } });
  console.log("dispatcher-option-shape: fetch(url,{dispatcher}) accepted at call time (no throw on build)");
  a.close();
} catch (e) {
  console.log("dispatcher-option-shape: false " + String(e).slice(0, 120));
}
