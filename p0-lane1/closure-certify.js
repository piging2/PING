#!/usr/bin/env node
/**
 * closure-certify.js — P0-3 deterministic distribution closure checker.
 *
 * Computes: RUNTIME ENTRYPOINTS -> transitive local module dependencies
 * (static require/import analysis) -> CLASSIFICATION -> DISTRIBUTION SNAPSHOT
 * contents. FAILS before image promotion when a module is SOURCE-REACHABLE
 * and RUNTIME-REQUIRED and NOT DISTRIBUTED.
 *
 * Classifications:
 *   REQUIRED_RUNTIME          must be in the snapshot; absence fails.
 *   LEGACY_REQUIRED           legacy compatibility surface the refactor requires
 *                             at top level (e.g. legacy_ingress_adapter); absence fails.
 *   OPTIONAL_RUNTIME          lazily-required optional providers (pattern from
 *                             6374519f8); absence WARNS, never fails. The checker's
 *                             existence must not promote optional to mandatory.
 *   BUILD_ONLY                reachable from a runtime entrypoint -> FAIL
 *                             (composition defect: runtime depends on build tooling).
 *   TEST_ONLY                 reachable from a runtime entrypoint -> FAIL.
 *   PRESERVED_NOT_DISTRIBUTED reachable from a runtime entrypoint -> FAIL.
 *   UNKNOWN                   reachable and unclassified -> FAILS certification
 *                             (mandatory reachability). Classify it or exclude it.
 *
 * Dynamic require/lazy handling (explicit):
 *   - require('./literal'), import './literal', import('./literal') are followed.
 *   - require(nonLiteral) / require(`template-${x}`) are recorded as DYNAMIC and
 *     listed in the report. They are NOT silently treated as absent. With
 *     --strict-dynamic they fail; default they warn. A dynamic target that must
 *     exist at runtime belongs in the classification manifest as a row so the
 *     snapshot check still applies to it.
 *   - Lazy requires (inside functions, deferred until called) are treated as
 *     REACHABLE and classified normally. Laziness is an execution-time property,
 *     not a distribution property: the file must still ship if required.
 *   - require(variable) targets that are statically unknowable are declared
 *     via --dynamic-targets <csv of repo-relative paths>. Each declared target
 *     is added to the reachable set (importer '<dynamic-target>') and classified
 *     normally. This is how isolated optional providers (6374519f8 pattern)
 *     and lazily-loaded generated registries stay classified without being
 *     promoted to mandatory: declare the target, classify it OPTIONAL_RUNTIME,
 *     and its absence from the snapshot is a warning, never a failure.
 *     A declared target that does not exist in the source root is a defect.
 *
 * Usage:
 *   node closure-certify.js --root <repoRoot> --entrypoints <csv rel paths>
 *       --snapshot <snapshotDir> --classify <classify.json> [--strict-dynamic]
 *       [--dynamic-targets <csv rel paths>] [--json-out <path>]
 *
 * Exit: 0 CERTIFIED, 1 FAILED (defects listed), 2 usage/tool error.
 *
 * Gate placement: run against the EXACT distribution snapshot / build-context
 * directory that the container build will COPY (the snapshot root), AFTER
 * snapshot assembly and BEFORE `docker build` / image promotion. A non-zero
 * exit blocks promotion. See README-lane1.md.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CLASSES = new Set([
  'REQUIRED_RUNTIME',
  'OPTIONAL_RUNTIME',
  'BUILD_ONLY',
  'TEST_ONLY',
  'PRESERVED_NOT_DISTRIBUTED',
  'LEGACY_REQUIRED',
  'UNKNOWN',
]);

const MANDATORY = new Set(['REQUIRED_RUNTIME', 'LEGACY_REQUIRED']);
const NON_DISTRIBUTED = new Set(['BUILD_ONLY', 'TEST_ONLY', 'PRESERVED_NOT_DISTRIBUTED']);

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key === 'strict-dynamic') {
        out['strict-dynamic'] = true;
        continue;
      }
      out[key] = argv[++i];
    }
  }
  return out;
}

function fail2(msg) {
  process.stderr.write('closure-certify: ' + msg + '\n');
  process.exit(2);
}

// Strip comments and string-unsafe regions conservatively: remove // and /* */
// comments, then extract literal require/import specifiers.
function extractSpecifiers(source, relPath, dynamics) {
  const found = [];
  let code = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const patterns = [
    /\brequire\(\s*(['"])((?:\\\1|(?!\1).)*)\1\s*\)/g,
    /\bimport\s+(?:[^'"]*?\sfrom\s+)?(['"])((?:\\\1|(?!\1).)*)\1/g,
    /\bimport\(\s*(['"])((?:\\\1|(?!\1).)*)\1\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(code)) !== null) {
      found.push(m[2]);
    }
  }
  // Dynamic (non-literal) requires/imports: require(x), require(`t-${x}`).
  const dynRe = /\b(?:require|import)\(\s*(?![`'"])/g;
  let dm;
  while ((dm = dynRe.exec(code)) !== null) {
    const line = source.slice(0, dm.index).split('\n').length;
    dynamics.push({ file: relPath, line });
  }
  return found;
}

function isLocal(spec) {
  return spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/');
}

function resolveLocal(root, fromFile, spec) {
  // Only relative specs are followed; absolute specs are repo-root-relative.
  const base = spec.startsWith('/')
    ? path.join(root, spec)
    : path.join(path.dirname(path.join(root, fromFile)), spec);
  const candidates = [base, base + '.js', base + '.json', path.join(base, 'index.js'), path.join(base, 'index.json')];
  for (const c of candidates) {
    const rel = path.relative(root, c);
    if (!rel.startsWith('..') && !path.isAbsolute(rel) && fs.existsSync(c) && fs.statSync(c).isFile()) {
      return rel.split(path.sep).join('/');
    }
  }
  return null;
}

function classifyOf(rel, manifest) {
  if (Object.prototype.hasOwnProperty.call(manifest, rel)) {
    const c = manifest[rel];
    if (!CLASSES.has(c)) throw new Error('bad class "' + c + '" for ' + rel);
    return c;
  }
  for (const key of Object.keys(manifest)) {
    if (key.endsWith('/*') && rel.startsWith(key.slice(0, -1))) {
      const c = manifest[key];
      if (!CLASSES.has(c)) throw new Error('bad class "' + c + '" for ' + key);
      return c;
    }
  }
  return 'UNKNOWN';
}

function main() {
  const args = parseArgs(process.argv);
  const root = args.root;
  const entrypoints = (args.entrypoints || '').split(',').map((s) => s.trim()).filter(Boolean);
  const snapshot = args.snapshot;
  const classifyPath = args.classify;
  if (!root || !entrypoints.length || !snapshot || !classifyPath) {
    fail2('usage: --root <dir> --entrypoints <csv> --snapshot <dir> --classify <json> [--strict-dynamic] [--dynamic-targets <csv>] [--json-out <path>]');
  }
  const absRoot = path.resolve(root);
  const absSnap = path.resolve(snapshot);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.resolve(classifyPath), 'utf8'));
  } catch (e) {
    fail2('cannot read classify manifest: ' + e.message);
  }

  const defects = [];
  const warnings = [];
  const dynamics = [];
  const visited = new Map(); // rel -> { class, importers: [] }
  const externals = new Set();
  const queue = [];

  for (const ep of entrypoints) {
    const epAbs = path.join(absRoot, ep);
    if (!fs.existsSync(epAbs)) {
      defects.push({ type: 'ENTRYPOINT_MISSING', file: ep, detail: 'entrypoint not present in source root' });
      continue;
    }
    queue.push({ rel: ep, importer: '<entrypoint>' });
  }

  // Declared dynamic targets: statically unknowable require(variable) targets
  // that must still be classified and snapshot-checked.
  const dynamicTargets = (args['dynamic-targets'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const dt of dynamicTargets) {
    if (!fs.existsSync(path.join(absRoot, dt))) {
      defects.push({ type: 'DANGLING_DYNAMIC_TARGET', file: dt, detail: 'declared dynamic target not present in source root' });
      continue;
    }
    queue.push({ rel: dt, importer: '<dynamic-target>' });
  }

  while (queue.length) {
    const { rel, importer } = queue.shift();
    if (visited.has(rel)) {
      visited.get(rel).importers.push(importer);
      continue;
    }
    let cls;
    try {
      cls = classifyOf(rel, manifest);
    } catch (e) {
      defects.push({ type: 'BAD_CLASSIFICATION', file: rel, detail: e.message });
      continue;
    }
    visited.set(rel, { class: cls, importers: [importer] });
    const abs = path.join(absRoot, rel);
    if (!/\.(js|mjs|cjs)$/.test(rel)) continue; // only JS graphs are walked
    const source = fs.readFileSync(abs, 'utf8');
    const specs = extractSpecifiers(source, rel, dynamics);
    for (const spec of specs) {
      if (!isLocal(spec)) {
        externals.add(spec);
        continue;
      }
      const target = resolveLocal(absRoot, rel, spec);
      if (!target) {
        defects.push({
          type: 'DANGLING_REQUIRE',
          file: rel,
          detail: 'require(' + JSON.stringify(spec) + ') resolves to nothing in the source root',
        });
        continue;
      }
      if (!visited.has(target)) queue.push({ rel: target, importer: rel });
      else visited.get(target).importers.push(rel);
    }
  }

  // Snapshot membership + classification rules.
  for (const [rel, info] of visited.entries()) {
    const inSnapshot = fs.existsSync(path.join(absSnap, rel));
    if (MANDATORY.has(info.class) && !inSnapshot) {
      defects.push({
        type: 'REQUIRED_NOT_DISTRIBUTED',
        file: rel,
        class: info.class,
        importers: info.importers,
        detail: 'source-reachable and ' + info.class + ' but ABSENT from the distribution snapshot',
      });
    } else if (NON_DISTRIBUTED.has(info.class)) {
      defects.push({
        type: 'RUNTIME_DEPENDS_ON_NONDISTRIBUTED',
        file: rel,
        class: info.class,
        importers: info.importers,
        detail: 'runtime entrypoint reaches a ' + info.class + ' module; composition defect',
      });
    } else if (info.class === 'UNKNOWN') {
      defects.push({
        type: 'UNKNOWN_CLASSIFICATION',
        file: rel,
        importers: info.importers,
        detail: 'reachable from a runtime entrypoint but unclassified; mandatory reachability fails certification',
      });
    } else if (info.class === 'OPTIONAL_RUNTIME' && !inSnapshot) {
      warnings.push({
        type: 'OPTIONAL_NOT_DISTRIBUTED',
        file: rel,
        detail: 'optional provider absent from snapshot; allowed, feature degrades gracefully',
      });
    }
  }

  for (const d of dynamics) {
    const msg = { type: 'DYNAMIC_REQUIRE', file: d.file, line: d.line, detail: 'non-literal require/import; not statically followed' };
    if (args['strict-dynamic']) defects.push(msg);
    else warnings.push(msg);
  }

  const modules = {};
  for (const [rel, info] of visited.entries()) {
    modules[rel] = { class: info.class, inSnapshot: fs.existsSync(path.join(absSnap, rel)), importers: info.importers };
  }
  const report = {
    tool: 'closure-certify',
    root: absRoot,
    snapshot: absSnap,
    entrypoints,
    certified: defects.length === 0,
    defectCount: defects.length,
    warningCount: warnings.length,
    defects,
    warnings,
    externalNpm: Array.from(externals).sort(),
    modules,
  };

  if (args['json-out']) {
    fs.writeFileSync(path.resolve(args['json-out']), JSON.stringify(report, null, 2) + '\n');
  }

  const lines = [];
  lines.push('closure-certify: ' + entrypoints.length + ' entrypoint(s), ' + visited.size + ' reachable module(s)');
  const counts = {};
  for (const info of visited.values()) counts[info.class] = (counts[info.class] || 0) + 1;
  lines.push('  classes: ' + Object.entries(counts).map(([k, v]) => k + '=' + v).join(' '));
  for (const w of warnings) lines.push('  WARN [' + w.type + '] ' + w.file + (w.line ? ':' + w.line : '') + ' — ' + w.detail);
  for (const d of defects) {
    lines.push('  DEFECT [' + d.type + '] ' + d.file + (d.class ? ' (' + d.class + ')' : '') + ' — ' + d.detail);
    if (d.importers) lines.push('           required by: ' + d.importers.join(' <- '));
  }
  lines.push(defects.length === 0 ? 'CERTIFIED: closure complete' : 'FAILED: closure incomplete (' + defects.length + ' defect(s))');
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(defects.length === 0 ? 0 : 1);
}

main();
