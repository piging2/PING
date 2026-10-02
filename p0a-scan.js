const fs = require('fs');
const path = require('path');
const builtin = new Set(require('module').builtinModules);
const seen = new Set(), missing = new Set();
function walk(f) {
  f = path.resolve(f);
  if (seen.has(f) || !f.endsWith('.js') || !fs.existsSync(f)) return;
  seen.add(f);
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch (e) { return; }
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const req = m[1];
    if (req.startsWith('.') || req.startsWith('/')) {
      try { walk(require.resolve(req, { paths: [path.dirname(f)] })); } catch (e) {}
    } else if (!builtin.has(req) && !req.startsWith('node:')) {
      try { require.resolve(req, { paths: [path.dirname(f), '/tmp/p0a-test/node_modules'] }); }
      catch (e) { missing.add(req); }
    }
  }
}
walk('/home/nolan/worktrees/constitutional-convergence-authority-law/gateway/bootstrap/gateway_runtime.js');
console.log('FILES: ' + seen.size);
console.log('MISSING: ' + Array.from(missing).sort().join(' '));
