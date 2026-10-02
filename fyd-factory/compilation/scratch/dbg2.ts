import * as fs from "node:fs";
const PING = "/home/nolan/projects/ping/src";
async function main() {
  for (const p of ["/fyd/proceduralize/generator.ts", "/fyd/sitespec/validator.ts", "/fyd/components/renderer.tsx"]) {
    try {
      const m = await import(PING + p);
      console.log("IMPORT_OK", p, Object.keys(m).slice(0,4).join(","));
    } catch (e:any) {
      console.log("IMPORT_FAIL", p, e.message);
      console.log((e.stack||"").split("\n").slice(0,6).join("\n"));
    }
  }
}
main();
