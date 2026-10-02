#!/usr/bin/env node
/**
 * arm64-compat.js: Lane C ARM64 / toolchain compatibility gate.
 *
 * Reproduced invariant (FL-20260919-ORACLE-008 deploy): the deploy-time
 * toolchain broke on `node:24-alpine` because tree-sitter@0.21.1's native
 * build is incompatible with node 24; the deploy had to fall back to
 * node:20-alpine. The smoke test then ran under node 20, so the release
 * evidence (smoke PASS) did not cover the node 24 build toolchain. Nothing
 * in the pipeline connects the build toolchain to the tested toolchain.
 *
 * This gate checks, deterministically and statically:
 *   1. The Dockerfile's FROM node version vs the node major version the
 *      smoke test actually ran under (--smoke-node-version). Mismatch FAILS:
 *      the executable evidence does not cover the shipped toolchain.
 *   2. The Dockerfile's FROM node version vs the KNOWN_BAD_TOOLCHAINS table
 *      (native modules with proven build breakage, evidence-linked).
 *      A known-bad pairing FAILS before the image build wastes a cycle.
 *   3. Native modules present in the snapshot's node_modules are enumerated
 *      (binding.gyp present) so the release artifact records exactly which
 *      native surface the image build must compile for linux/arm64.
 *   4. The declared build platform (--platform, default linux/arm64) is
 *      recorded; a Dockerfile without an explicit platform pin is a WARNING,
 *      not a failure (the builder's default is an operational fact, and this
 *      gate does not guess it).
 *
 * Usage:
 *   node arm64-compat.js --snapshot <dir> --dockerfile <path>
 *       --smoke-node-version <major> [--platform linux/arm64]
 *       [--json-out <path>]
 *
 * Exit: 0 PASS, 1 FAIL, 2 usage/tool error.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Evidence-linked known toolchain breakages. Each entry must cite the
// incident or run that proved it; entries without evidence are not added.
const KNOWN_BAD_TOOLCHAINS = [
  {
    id: 'TREE-SITTER-021-NODE24',
    package: 'tree-sitter',
    packageRange: '0.21.x',
    nodeMajor: '>=24',
    evidence: 'FL-20260919-ORACLE-008 deploy: node:24-alpine broke the tree-sitter@0.21.1 native build (toolchain mismatch); deploy fell back to node:20-alpine',
  },
];

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function fail2(msg) {
  process.stderr.write('arm64-compat: ' + msg + '\n');
  process.exit(2);
}

function majorOf(v) {
  const m = /(\d+)/.exec(String(v));
  return m ? m[1] : null;
}

function inRange(major, range) {
  const mj = parseInt(major, 10);
  if (range.startsWith('>=')) return mj >= parseInt(range.slice(2), 10);
  return false;
}

function findNativeModules(snapAbs) {
  const found = [];
  const nm = path.join(snapAbs, 'node_modules');
  let entries = [];
  try {
    entries = fs.readdirSync(nm, { withFileTypes: true });
  } catch (e) {
    return { found, nodeModulesPresent: false };
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const dirs = [];
    if (e.name.startsWith('@') && e.isDirectory()) {
      let scoped = [];
      try { scoped = fs.readdirSync(path.join(nm, e.name), { withFileTypes: true }); } catch (_) { /* ignore */ }
      for (const s of scoped) if (s.isDirectory()) dirs.push(path.join(nm, e.name, s.name));
    } else if (e.isDirectory()) {
      dirs.push(path.join(nm, e.name));
    }
    for (const d of dirs) {
      if (fs.existsSync(path.join(d, 'binding.gyp'))) {
        let version = 'unknown';
        try { version = JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')).version || 'unknown'; } catch (_) { /* ignore */ }
        found.push({ package: path.relative(nm, d), version });
      }
    }
  }
  return { found, nodeModulesPresent: true };
}

function main() {
  const args = parseArgs(process.argv);
  const snapshot = args.snapshot;
  const dockerfile = args.dockerfile;
  const smokeNode = args['smoke-node-version'];
  const platform = args.platform || 'linux/arm64';
  if (!snapshot || !dockerfile || !smokeNode) {
    fail2('usage: --snapshot <dir> --dockerfile <path> --smoke-node-version <major> [--platform linux/arm64] [--json-out <path>]');
  }
  const snapAbs = path.resolve(snapshot);
  let dfText;
  try {
    dfText = fs.readFileSync(path.resolve(dockerfile), 'utf8');
  } catch (e) {
    fail2('cannot read Dockerfile: ' + e.message);
  }

  const defects = [];
  const warnings = [];

  const fromM = /^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)/im.exec(dfText);
  const fromImage = fromM ? fromM[1] : null;
  const nodeM = fromImage ? /^node:(\d+)/i.exec(fromImage) : null;
  const dockerNodeMajor = nodeM ? nodeM[1] : null;
  const platformPin = /^\s*FROM\s+--platform=(\S+)/im.exec(dfText);
  if (!platformPin) {
    warnings.push({ type: 'NO_PLATFORM_PIN', detail: 'Dockerfile FROM has no --platform pin; builder default applies (declared target: ' + platform + ')' });
  }

  if (!dockerNodeMajor) {
    defects.push({ type: 'NODE_VERSION_UNDECLARED', detail: 'Dockerfile FROM (' + fromImage + ') does not declare a node major version' });
  } else if (majorOf(dockerNodeMajor) !== majorOf(smokeNode)) {
    defects.push({
      type: 'TOOLCHAIN_MISMATCH',
      detail: 'Dockerfile builds on node ' + dockerNodeMajor + ' but the executable smoke evidence ran under node ' + smokeNode + '; smoke does not cover the shipped toolchain',
    });
  }

  const { found: nativeModules, nodeModulesPresent } = findNativeModules(snapAbs);
  if (!nodeModulesPresent) {
    warnings.push({ type: 'NO_NODE_MODULES', detail: 'snapshot has no node_modules; native-module enumeration skipped (image build installs deps)' });
  }
  for (const nm of nativeModules) {
    for (const bad of KNOWN_BAD_TOOLCHAINS) {
      const pkgMatch = nm.package === bad.package || nm.package.endsWith('/' + bad.package);
      const verMatch = bad.packageRange === '0.21.x' ? /^0\.21\./.test(nm.version) : false;
      if (pkgMatch && verMatch && dockerNodeMajor && inRange(dockerNodeMajor, bad.nodeMajor)) {
        defects.push({
          type: 'KNOWN_BAD_TOOLCHAIN',
          id: bad.id,
          detail: nm.package + '@' + nm.version + ' on node ' + dockerNodeMajor + ': ' + bad.evidence,
        });
      }
    }
  }

  const out = {
    tool: 'arm64-compat',
    snapshot: snapAbs,
    dockerfile: path.resolve(dockerfile),
    fromImage,
    dockerNodeMajor,
    smokeNodeMajor: majorOf(smokeNode),
    declaredPlatform: platform,
    platformPinned: Boolean(platformPin),
    nodeModulesPresent,
    nativeModules,
    knownBadToolchains: KNOWN_BAD_TOOLCHAINS.map((k) => k.id),
    defects,
    warnings,
    certified: defects.length === 0,
  };
  if (args['json-out']) fs.writeFileSync(path.resolve(args['json-out']), JSON.stringify(out, null, 2) + '\n');

  const lines = [];
  lines.push('arm64-compat: FROM=' + fromImage + ' smoke-node=' + smokeNode + ' platform=' + platform + (platformPin ? ' (pinned)' : ' (unpinned)'));
  lines.push('  native modules in snapshot: ' + (nativeModules.length ? nativeModules.map((n) => n.package + '@' + n.version).join(', ') : 'none detected'));
  for (const w of warnings) lines.push('  WARN [' + w.type + '] ' + w.detail);
  for (const d of defects) lines.push('  DEFECT [' + d.type + '] ' + d.detail);
  lines.push(defects.length === 0 ? 'PASS: toolchain compatible' : 'FAILED: toolchain incompatibility');
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(defects.length === 0 ? 0 : 1);
}

main();
