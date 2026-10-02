const fs = require("fs");
const path = "/home/nolan/projects/ping/src/app/sites/_shared/site-client.tsx";
let c = fs.readFileSync(path, "utf8");

const oldImport = 'import type { DisplayMedia } from "@/fyd/media/select";';
if (!c.includes("FydMotionFallback")) {
  c = c.replace(oldImport, oldImport + '\nimport { FydMotionFallback } from "@/fyd/components/fyd-motion-fallback";');
  console.log("import added");
}

const oldReturn = "  return (\n    <div>\n      {/* FYD Social demo header.";
const newReturn = "  return (\n    <div>\n      <FydMotionFallback />\n      {/* FYD Social demo header.";
if (c.includes(oldReturn)) {
  c = c.replace(oldReturn, newReturn);
  console.log("component added");
} else {
  console.log("return pattern NOT found");
}

fs.writeFileSync(path, c);
console.log("done");
