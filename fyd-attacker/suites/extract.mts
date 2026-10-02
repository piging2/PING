// Extract named function declarations from a TS source file using the real
// TypeScript parser: exact positions, no brace-counting, no silent
// truncation. Extracted functions are loud-verified on import.
// Usage: node extract.mts <source.ts> <fn1> <fn2> ...
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("/home/hatch/workspace/fyd-attacker/node_modules/typescript");

const [src, ...names] = process.argv.slice(2);
const text = readFileSync(src, "utf8");
const sf = ts.createSourceFile(src, text, ts.ScriptTarget.Latest, true);

function findFunction(node: any, name: string): any | null {
  if (ts.isFunctionDeclaration(node) && node.name && node.name.text === name) return node;
  let found: any | null = null;
  ts.forEachChild(node, (child: any) => {
    if (!found) found = findFunction(child, name);
  });
  return found;
}

const out: string[] = [];
for (const name of names) {
  const fn = findFunction(sf, name);
  if (!fn || !fn.body) {
    console.error(`NOT FOUND (or no body): ${name} in ${src}`);
    process.exit(1);
  }
  // fn.getStart() skips leading trivia; slice the exact original text.
  let decl = text.slice(fn.getStart(sf), fn.end).replace(/^export\s+/, "");
  out.push(decl);
}

const dest = `/tmp/fyd-attacker-extract-${names.join("-")}.mts`;
writeFileSync(dest, out.join("\n\n") + `\nexport { ${names.join(", ")} };\n`);
console.log(dest);

// Loud verification: a bad extract must never become silent evidence.
const mod = await import(dest).catch((e) => ({ __extractError: String((e && e.message) || e) }));
if ((mod as any).__extractError) {
  console.error(`EXTRACT FAILED for ${names.join(",")}: ${(mod as any).__extractError}`);
  process.exit(2);
}
for (const n of names) {
  if (typeof (mod as any)[n] !== "function") {
    console.error(`EXTRACT FAILED: ${n} is not a function in ${dest}`);
    process.exit(2);
  }
}
