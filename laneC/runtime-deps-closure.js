#!/usr/bin/env node
/**
 * runtime-deps-closure.js: Lane C runtime external-dependency closure gate.
 *
 * closure-certify.js proves every LOCAL module the entrypoints reach is in
 * the snapshot. This gate proves every EXTERNAL (npm) specifier those
 * modules require actually resolves inside the snapshot's node_modules,
 * with a recorded version. It closes the "smoke needs node_modules
 * installed as the image build does, but nothing verifies the install is
 * complete" gap: an incomplete `npm ci` (or a pruned node_modules) would
 * otherwise surface only as a MODULE_NOT_FOUND at container start.
 *
 * Input: the closure-certify JSON report (--closure-report), which lists
 * externalNpm specifiers collected from the real require walk.
 *
 * For each external specifier, require.resolve(spec, { paths: [snapshot] })
 * is attempted against the snapshot directory (real Node resolution, no
 * mocking). The resolved package.json version is recorded. Native modules
 * (package dir contains binding.gyp) are flagged for the arm64-compat gate.
 *
 * Usage:
 *   node runtime-deps-closure.js --snapshot <dir> --closure-report <json>
 *       [--json-out <path>]
 *
 * Exit: 0 CERTIFIED (all externals resolve), 1 FAILED, 2 usage/tool error.
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
  process.stderr.write('runtime-deps-closure: ' + msg + '\n');
  process.exit(2);
}

// Top-level package name from a specifier: "@scope/pkg/sub" -> "@scope/pkg".
function pkgName(spec) {
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.length >= 2 ? parts[0] + '/' + parts[1] : spec;
  }
  return spec.split('/')[0];
}

function packageVersion(pkgDir) {
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
    return pj.version || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

function findPackageDir(resolved) {
  let dir = path.dirname(resolved);
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv);
  const snapshot = args.snapshot;
  const closureReport = args['closure-report'];
  if (!snapshot || !closureReport) {
    fail2('usage: --snapshot <dir> --closure-report <json> [--json-out <path>]');
  }
  const snapAbs = path.resolve(snapshot);
  let report;
  try {
    report = JSON.parse(fs.readFileSync(path.resolve(closureReport), 'utf8'));
  } catch (e) {
    fail2('cannot read closure report: ' + e.message);
  }
  const externals = report.externalNpm || [];

  const defects = [];
  const resolved = [];
  const seen = new Set();
  for (const spec of externals) {
    const name = pkgName(spec);
    if (seen.has(name)) continue;
    seen.add(name);
    let resolvedPath = null;
    try {
      resolvedPath = require.resolve(name, { paths: [snapAbs] });
    } catch (e) {
      defects.push({
        type: 'EXTERNAL_UNRESOLVABLE',
        package: name,
        detail: 'required by the runtime require graph but does not resolve from the snapshot node_modules: ' + (e.code || e.message),
      });
      continue;
    }
    const pkgDir = findPackageDir(resolvedPath);
    const version = pkgDir ? packageVersion(pkgDir) : 'unknown';
    const native = pkgDir ? fs.existsSync(path.join(pkgDir, 'binding.gyp')) : false;
    resolved.push({ package: name, version, native, resolvedPath: path.relative(snapAbs, resolvedPath) });
  }

  const out = {
    tool: 'runtime-deps-closure',
    snapshot: snapAbs,
    externalsSeen: externals.length,
    packagesChecked: resolved.length + defects.length,
    resolved,
    nativeModules: resolved.filter((r) => r.native).map((r) => r.package + '@' + r.version),
    defects,
    certified: defects.length === 0,
  };
  if (args['json-out']) fs.writeFileSync(path.resolve(args['json-out']), JSON.stringify(out, null, 2) + '\n');

  const lines = [];
  lines.push('runtime-deps-closure: ' + out.packagesChecked + ' external package(s) checked against snapshot node_modules');
  lines.push('  native modules: ' + (out.nativeModules.length ? out.nativeModules.join(', ') : 'none detected'));
  for (const d of defects) lines.push('  DEFECT [' + d.type + '] ' + d.package + ' - ' + d.detail);
  lines.push(defects.length === 0 ? 'CERTIFIED: external dependency closure complete' : 'FAILED: ' + defects.length + ' unresolvable external(s)');
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(defects.length === 0 ? 0 : 1);
}

main();
