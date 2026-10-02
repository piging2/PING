#!/usr/bin/env node
/**
 * security-negatives.js: Lane C distribution security negative tests.
 *
 * Deterministic negative assertions over the EXACT distribution snapshot:
 * things that must NOT be true of a shippable release. A release is a
 * certified closure of the runtime; secret material inside the closure is
 * a distribution defect, not a runtime feature.
 *
 * Checks (each is a small, falsifiable, evidence-graded assertion):
 *   S1  No credential-bearing filenames in the snapshot:
 *       *.pem, *.key, id_rsa*, .env, .env.* (any depth, excluding
 *       node_modules, which is builder-installed and content-scanned
 *       separately by the image build).
 *   S2  No high-confidence secret content in shipped non-source files:
 *       top-level and config-shaped files (*.json, *.yml, *.yaml, *.env,
 *       Dockerfile*) are scanned for private-key blocks and well-known
 *       provider key prefixes. Source (*.js) is NOT content-scanned here:
 *       test fixtures and redaction code legitimately contain key-shaped
 *       strings, and a content scan over source would false-positive.
 *       (P0-6 log redaction is proven by its own regression tests.)
 *
 * Deliberately NOT checked here (owned elsewhere):
 *   - runtime authentication posture (F1/F2/F3, convergence lane);
 *   - dependency vulnerability audit (npm audit, deploy lane);
 *   - container image layer scanning (build lane).
 *
 * Usage:
 *   node security-negatives.js --snapshot <dir> [--json-out <path>]
 *
 * Exit: 0 PASS (no findings), 1 FAIL (findings), 2 usage/tool error.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function fail2(msg) {
  process.stderr.write('security-negatives: ' + msg + '\n');
  process.exit(2);
}

const FILENAME_DENY = [
  /(^|\/)id_rsa[^/]*$/,
  /\.pem$/,
  /\.key$/,
  /(^|\/)\.env(\.|$)/,
];

// .env.example is the conventional checked-in TEMPLATE and is exempt from
// the filename deny rule (its content is still scanned by CONTENT_PATTERNS).
const FILENAME_ALLOW = [
  /(^|\/)\.env\.example$/,
];

const CONTENT_PATTERNS = [
  { id: 'PRIVATE_KEY_BLOCK', re: /BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY/ },
  { id: 'AWS_ACCESS_KEY', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'GITHUB_PAT', re: /ghp_[0-9A-Za-z]{36}/ },
  { id: 'STRIPE_LIVE', re: /sk-live-[0-9A-Za-z]{16,}/ },
  { id: 'SLACK_TOKEN', re: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
];

const SCAN_EXTS = new Set(['.json', '.yml', '.yaml', '.env', '.txt']);
const SCAN_BASENAMES = new Set(['dockerfile', 'docker-compose.yml', 'docker-compose.yaml']);

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(p, out);
    } else if (e.isFile()) {
      out.push(p);
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  const snapshot = args.snapshot;
  if (!snapshot) fail2('usage: --snapshot <dir> [--json-out <path>]');
  const snapAbs = path.resolve(snapshot);
  if (!fs.existsSync(snapAbs)) fail2('snapshot does not exist: ' + snapAbs);

  const defects = [];
  const files = [];
  walk(snapAbs, files);

  for (const f of files) {
    const rel = path.relative(snapAbs, f).split(path.sep).join('/');
    const base = path.basename(f).toLowerCase();
    const allowed = FILENAME_ALLOW.some(re => re.test(rel) || re.test(base));
    if (!allowed) {
      for (const re of FILENAME_DENY) {
        if (re.test(rel) || re.test(base)) {
          defects.push({ check: 'S1', type: 'CREDENTIAL_FILENAME', file: rel, detail: 'credential-bearing filename ships in the snapshot' });
        }
      }
    }
    const ext = path.extname(base);
    const scannable = SCAN_EXTS.has(ext) || SCAN_BASENAMES.has(base) || base.startsWith('dockerfile') || base === '.env.example';
    if (scannable) {
      let text = '';
      try {
        const st = fs.statSync(f);
        if (st.size > 1024 * 1024) continue;
        text = fs.readFileSync(f, 'utf8');
      } catch (e) { continue; }
      for (const p of CONTENT_PATTERNS) {
        if (p.re.test(text)) {
          defects.push({ check: 'S2', type: 'SECRET_CONTENT', file: rel, pattern: p.id, detail: 'high-confidence secret pattern in shipped config-shaped file' });
        }
      }
    }
  }

  const out = {
    tool: 'security-negatives',
    snapshot: snapAbs,
    filesScanned: files.length,
    defects,
    certified: defects.length === 0,
  };
  if (args['json-out']) fs.writeFileSync(path.resolve(args['json-out']), JSON.stringify(out, null, 2) + '\n');

  const lines = [];
  lines.push('security-negatives: ' + files.length + ' file(s) walked (node_modules/.git excluded)');
  for (const d of defects) lines.push('  DEFECT [' + d.check + '/' + d.type + '] ' + d.file + (d.pattern ? ' (' + d.pattern + ')' : '') + ' - ' + d.detail);
  lines.push(defects.length === 0 ? 'PASS: no credential material in snapshot' : 'FAILED: ' + defects.length + ' finding(s)');
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(defects.length === 0 ? 0 : 1);
}

main();
