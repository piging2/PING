const fs = require("fs");
const path = "/home/nolan/projects/ping/src/fyd/components/renderer.tsx";
let c = fs.readFileSync(path, "utf8");

const oldRule = `".fyd-io [data-motion='enter'].fyd-inview { opacity: 1; transform: none; }",`;
const newRule = oldRule + `\n        ".fyd-io [data-motion='enter'].fyd-force-visible { opacity: 1 !important; transform: none !important; animation: none !important; }",`;

if (c.includes(oldRule) && !c.includes("fyd-force-visible")) {
  c = c.replace(oldRule, newRule);
  console.log("CSS rule added");
} else {
  console.log("already present or pattern not found");
}

fs.writeFileSync(path, c);
console.log("done");
