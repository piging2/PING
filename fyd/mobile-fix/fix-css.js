const fs = require("fs");
const path = "/home/nolan/projects/ping/src/fyd/components/renderer.tsx";
let c = fs.readFileSync(path, "utf8");

// Replace the unconditional opacity:0 with a pending class that JS adds
// only to below-fold elements. Base state is always visible.
const old1 = `".fyd-io [data-motion='enter'] { opacity: 0; transform: translateY(16px); transition: opacity 480ms ease, transform 480ms ease; }",`;
const new1 = `// Base state is VISIBLE. JS adds .fyd-io-pending only to below-fold elements.\n        ".fyd-io [data-motion='enter'] { transition: opacity 480ms ease, transform 480ms ease; }",\n        ".fyd-io [data-motion='enter'].fyd-io-pending { opacity: 0; transform: translateY(16px); }",`;

const old2 = `".fyd-io [data-motion='enter'].fyd-inview { opacity: 1; transform: none; }",`;
const new2 = `".fyd-io [data-motion='enter'].fyd-inview, .fyd-io [data-motion='enter']:not(.fyd-io-pending) { opacity: 1; transform: none; }",`;

if (c.includes(old1)) {
  c = c.replace(old1, new1);
  console.log("replaced base rule");
} else {
  console.log("base rule not found");
}

if (c.includes(old2)) {
  c = c.replace(old2, new2);
  console.log("replaced inview rule");
} else {
  console.log("inview rule not found");
}

fs.writeFileSync(path, c);
console.log("done");
