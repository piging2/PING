#!/usr/bin/env node
// Extract first balanced-brace JSON object from stdin (adapter's stdout-scan shape).
'use strict';
let s = ''; process.stdin.on('data', d => s += d).on('end', () => {
  const i = s.indexOf('{');
  if (i < 0) { console.error('NO_JSON'); process.exit(1); }
  let depth = 0, inStr = false, esc = false, j = i;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
    else { if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) break; } }
  }
  if (depth !== 0) { console.error('UNBALANCED'); process.exit(1); }
  const obj = JSON.parse(s.slice(i, j + 1));
  console.log(JSON.stringify(obj));
});
