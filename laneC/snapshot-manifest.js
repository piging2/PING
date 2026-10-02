#!/usr/bin/env node
/**
 * snapshot-manifest.js: deterministic distribution manifest builder.
 *
 * Walks the distribution snapshot (the exact build-context directory the
 * container image is built from), records every file's sha256, and emits a
 * canonical manifest: sorted list of { path, sha256 }. The manifest digest
 * (sha256 of the canonical JSON) is the distribution identity recorded in
 * the release certification artifact. Two snapshots with the same digest
 * have byte-identical distributed content.
 *
 * node_modules and .git are excluded from the content manifest (they are
 * builder-installed / not distributed); node_modules presence and the
 * package-lock digest are recorded separately.
 *
 * Usage:
 *   node snapshot-manifest.js --snapshot <dir> [--json-out <path>]
 *
 * Exit: 0 always on success; 2 on usage/tool error. Prints the digest.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function fail2(msg) {
  process.stderr.write('snapshot-manifest: ' + msg + '\n');
  process.exit(2);
}

function sha256File(abs) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(abs));
  return h.digest('hex');
}

function walk(dir, snapAbs, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(p, snapAbs, out);
    } else if (e.isFile()) {
      const rel = path.relative(snapAbs, p).split(path.sep).join('/');
      out.push({ path: rel, sha256: sha256File(p) });
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  const snapshot = args.snapshot;
  if (!snapshot) fail2('usage: --snapshot <dir> [--json-out <path>]');
  const snapAbs = path.resolve(snapshot);
  if (!fs.existsSync(snapAbs)) fail2('snapshot does not exist: ' + snapAbs);

  const entries = [];
  walk(snapAbs, snapAbs, entries);
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const canonical = JSON.stringify(entries);
  const digest = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');

  const nmPresent = fs.existsSync(path.join(snapAbs, 'node_modules'));
  let lockDigest = 'absent';
  const lockPath = path.join(snapAbs, 'package-lock.json');
  if (fs.existsSync(lockPath)) lockDigest = sha256File(lockPath);
  else {
    const gwLock = path.join(snapAbs, 'gateway', 'package-lock.json');
    if (fs.existsSync(gwLock)) lockDigest = sha256File(gwLock);
  }

  const manifest = {
    tool: 'snapshot-manifest',
    snapshot: snapAbs,
    entries,
    digest,
    nodeModules: { present: nmPresent, packageLockDigest: lockDigest },
  };
  if (args['json-out']) fs.writeFileSync(path.resolve(args['json-out']), JSON.stringify(manifest, null, 2) + '\n');
  process.stdout.write('snapshot-manifest: ' + entries.length + ' file(s) digest=' + digest + ' nodeModules=' + (nmPresent ? 'present' : 'absent') + '\n');
}

main();
