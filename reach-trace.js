const fs = require("fs"), path = require("path");
const ROOT = process.argv[2];
const targets = new Set([
  "canonical_object_generator.js",
  "treesitter_chunker.js",
  "multi_language_parser.js",
  "treesitter_parser_authority.js",
  "adapters/treesitter_adapter.js"
]);
const seen = new Set(), stack = [path.join(ROOT, "server.js")];
while (stack.length) {
  const f = stack.pop();
  if (seen.has(f)) continue; seen.add(f);
  let src; try { src = fs.readFileSync(f, "utf8"); } catch (e) { continue; }
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const r = m[1];
    if (!r.startsWith(".")) continue;
    let p = path.resolve(path.dirname(f), r);
    if (!p.endsWith(".js")) p += ".js";
    const rel = path.relative(ROOT, p);
    for (const t of targets) {
      if (rel === t || rel.endsWith("/" + t)) console.log("REACHABLE:", rel, "<- via", path.relative(ROOT, f));
    }
    stack.push(p);
  }
}
console.log("done; visited", seen.size, "files");
