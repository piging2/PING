'use strict';
// Proof: every converted generator is CWD-independent and its stable payload
// matches the tracked artifact (only generatedAt may vary). Runs each
// generator from /, its own fixture directory, and an unrelated temp dir
// against COPIED fixtures. Never writes into the repo.
// Group B (dependency_graph, execution_graphs, hygiene_report) read secondary
// files via absolute scan paths from their input data, so they are proven
// CWD-independent against synthetic fixtures instead.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REPO = '/home/nolan/worktrees/constitutional-convergence/ping-runtime/orchestration';
const PROOF = '/tmp/genproof';
const UNRELATED = '/tmp/genproof-unrelated-cwd';

function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function stable(o) { const c = Object.assign({}, o); delete c.generatedAt; return JSON.stringify(c, null, 2); }
function rmdir(p) { fs.rmSync(p, { recursive: true, force: true }); }
function cp(a, b) { fs.copyFileSync(a, b); }

function onlyGeneratedAtVaries(trackedRaw, producedRaw) {
  const t = JSON.parse(trackedRaw), p = JSON.parse(producedRaw);
  const keys = new Set([...Object.keys(t), ...Object.keys(p)]);
  for (const k of keys) {
    if (k === 'generatedAt') continue;
    if (JSON.stringify(t[k]) !== JSON.stringify(p[k])) return k;
  }
  return null;
}

function trackedRootJsons() {
  const out = execFileSync('git', ['-C', '/home/nolan/worktrees/constitutional-convergence',
    'ls-files', 'ping-runtime/orchestration/*.json'], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map(f => path.basename(f));
}

const results = [];
fs.mkdirSync(PROOF, { recursive: true });
fs.mkdirSync(UNRELATED, { recursive: true });
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' :: ' + detail : ''));
}

// Snapshot tracked artifacts before proof.
const tracked = trackedRootJsons();
const before = {};
tracked.forEach(f => { before[f] = sha256(path.join(REPO, f)); });

// ---- Group A: real fixtures, compare stable payload to tracked artifact ----
const GROUP_A = [
  ['generate_architecture_manifest.js', 'ArchitectureManifest.json'],
  ['generate_authority_resolver.js', 'AuthorityResolver.json'],
  ['generate_capability_registry.js', 'CapabilityRegistry.json'],
  ['generate_context_packets.js', 'ContextPackets.json'],
  ['generate_execution_router.js', 'ExecutionRouter.json'],
  ['generate_law_router.js', 'LawRouter.json'],
  ['generate_routing_cache.js', 'RoutingCache.json'],
  ['generate_routing_index.js', 'RoutingIndex.json'],
];
// symbol_router / cross_reference_matrix have no tracked output: cross-CWD agreement.
const GROUP_A2 = [
  ['generate_symbol_router.js', 'SymbolRouter.json'],
  ['generate_cross_reference_matrix.js', 'CrossReferenceMatrix.json'],
];

let symbolRouterOutput = null;

function setupFixture(name, extraInputs) {
  const dir = path.join(PROOF, name);
  rmdir(dir);
  fs.mkdirSync(dir, { recursive: true });
  tracked.forEach(f => cp(path.join(REPO, f), path.join(dir, f)));
  if (extraInputs) for (const [src, dest] of extraInputs) cp(src, path.join(dir, dest));
  return dir;
}

function runThreeCwds(dir, genFile) {
  const genPath = path.join(dir, genFile);
  cp(path.join(REPO, genFile), genPath);
  cp(path.join(REPO, 'artifact_paths.js'), path.join(dir, 'artifact_paths.js'));
  const cwds = ['/', dir, UNRELATED];
  cwds.forEach(cwd => {
    execFileSync('node', [genPath], { cwd, timeout: 180000, stdio: 'pipe' });
  });
  return cwds;
}

// symbol_router first: its output feeds routing_cache + cross_reference_matrix fixtures.
for (const [genFile, outFile] of GROUP_A2.filter(([g]) => g === 'generate_symbol_router.js')) {
  const name = genFile.replace('generate_', '').replace('.js', '');
  try {
    const dir = setupFixture(name);
    runThreeCwds(dir, genFile);
    const outs = ['/', dir, UNRELATED].map(() => stable(JSON.parse(fs.readFileSync(path.join(dir, outFile), 'utf8'))));
    // Re-run to get the three outputs distinctly: outputs land in the same dir, so re-run per cwd with cleanup.
    rmdir(dir); fs.mkdirSync(dir, { recursive: true });
    tracked.forEach(f => cp(path.join(REPO, f), path.join(dir, f)));
    const genPath = path.join(dir, genFile);
    cp(path.join(REPO, genFile), genPath);
    cp(path.join(REPO, 'artifact_paths.js'), path.join(dir, 'artifact_paths.js'));
    const stables = [];
    for (const cwd of ['/', dir, UNRELATED]) {
      fs.rmSync(path.join(dir, outFile), { force: true });
      execFileSync('node', [genPath], { cwd, timeout: 180000, stdio: 'pipe' });
      stables.push(stable(JSON.parse(fs.readFileSync(path.join(dir, outFile), 'utf8'))));
    }
    const agree = stables[0] === stables[1] && stables[1] === stables[2];
    const wroteToFixtureDir = fs.existsSync(path.join(dir, outFile));
    if (agree && wroteToFixtureDir) {
      symbolRouterOutput = path.join(dir, outFile);
      record(name, true, '3 CWDs agree (no tracked output; cross-CWD agreement), wrote to fixture dir');
    } else {
      record(name, false, 'CWD disagreement or misplaced write');
    }
  } catch (e) {
    record(name, false, String(e.message || e).slice(0, 300));
  }
}

for (const [genFile, outFile] of GROUP_A) {
  const name = genFile.replace('generate_', '').replace('.js', '');
  try {
    const extra = (genFile === 'generate_routing_cache.js' && symbolRouterOutput)
      ? [[symbolRouterOutput, 'SymbolRouter.json']] : [];
    const dir = setupFixture(name, extra);
    const genPath = path.join(dir, genFile);
    cp(path.join(REPO, genFile), genPath);
    cp(path.join(REPO, 'artifact_paths.js'), path.join(dir, 'artifact_paths.js'));
    const stables = [];
    const raws = [];
    for (const cwd of ['/', dir, UNRELATED]) {
      fs.rmSync(path.join(dir, outFile), { force: true });
      execFileSync('node', [genPath], { cwd, timeout: 180000, stdio: 'pipe' });
      const raw = fs.readFileSync(path.join(dir, outFile), 'utf8');
      raws.push(raw);
      stables.push(stable(JSON.parse(raw)));
    }
    const trackedRaw = fs.readFileSync(path.join(REPO, outFile), 'utf8');
    const trackedStable = stable(JSON.parse(trackedRaw));
    const allMatchTracked = stables.every(s => s === trackedStable);
    const cwdAgree = stables[0] === stables[1] && stables[1] === stables[2];
    const badKey = onlyGeneratedAtVaries(trackedRaw, raws[0]);
    if (allMatchTracked && cwdAgree && badKey === null) {
      record(name, true, 'stable payload == tracked artifact from all 3 CWDs; only generatedAt varied');
    } else {
      record(name, false, `matchTracked=${allMatchTracked} cwdAgree=${cwdAgree} nonGeneratedAtDiff=${badKey}`);
    }
  } catch (e) {
    record(name, false, String(e.message || e).slice(0, 300));
  }
}

// cross_reference_matrix (needs SymbolRouter.json input).
for (const [genFile, outFile] of GROUP_A2.filter(([g]) => g === 'generate_cross_reference_matrix.js')) {
  const name = genFile.replace('generate_', '').replace('.js', '');
  try {
    if (!symbolRouterOutput) throw new Error('no SymbolRouter.json available');
    const dir = setupFixture(name, [[symbolRouterOutput, 'SymbolRouter.json']]);
    const genPath = path.join(dir, genFile);
    cp(path.join(REPO, genFile), genPath);
    cp(path.join(REPO, 'artifact_paths.js'), path.join(dir, 'artifact_paths.js'));
    const stables = [];
    for (const cwd of ['/', dir, UNRELATED]) {
      fs.rmSync(path.join(dir, outFile), { force: true });
      execFileSync('node', [genPath], { cwd, timeout: 180000, stdio: 'pipe' });
      stables.push(stable(JSON.parse(fs.readFileSync(path.join(dir, outFile), 'utf8'))));
    }
    const agree = stables[0] === stables[1] && stables[1] === stables[2];
    record(name, agree, agree
      ? '3 CWDs agree (no tracked output; cross-CWD agreement)'
      : 'CWD disagreement');
  } catch (e) {
    record(name, false, String(e.message || e).slice(0, 300));
  }
}

// ---- Group B: synthetic fixtures, prove CWD-independence ----
function synthFixture(name, build) {
  const dir = path.join(PROOF, 'synth-' + name);
  rmdir(dir);
  fs.mkdirSync(dir, { recursive: true });
  build(dir);
  return dir;
}
function writeSynthSources(dir) {
  fs.writeFileSync(path.join(dir, 'a.js'), "const b = require('./b');\nmodule.exports = { a: 1 };\n");
  fs.writeFileSync(path.join(dir, 'b.js'), "const c = require('./c');\nmodule.exports = { b: 2 };\n");
  fs.writeFileSync(path.join(dir, 'c.js'), "module.exports = { c: 3 };\n");
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'synth', scripts: { start: 'node a.js', build: 'node b.js' } }, null, 2));
  const idx = ['a.js', 'b.js', 'c.js', 'package.json'].map(n => ({
    AbsolutePath: path.join(dir, n),
    RelativePath: n,
    Language: n.endsWith('.js') ? 'JavaScript' : 'JSON',
    Extension: path.extname(n),
  }));
  fs.writeFileSync(path.join(dir, 'RepositoryKnowledgeIndex_Filesystem.json'), JSON.stringify(idx, null, 2));
  return idx;
}
function proveSynth(name, genFile, outFile, build) {
  try {
    const dir = synthFixture(name, build);
    cp(path.join(REPO, genFile), path.join(dir, genFile));
    cp(path.join(REPO, 'artifact_paths.js'), path.join(dir, 'artifact_paths.js'));
    const stables = [];
    for (const cwd of ['/', dir, UNRELATED]) {
      fs.rmSync(path.join(dir, outFile), { force: true });
      execFileSync('node', [path.join(dir, genFile)], { cwd, timeout: 180000, stdio: 'pipe' });
      stables.push(stable(JSON.parse(fs.readFileSync(path.join(dir, outFile), 'utf8'))));
    }
    const agree = stables[0] === stables[1] && stables[1] === stables[2];
    record(name, agree, agree
      ? 'synthetic fixture: 3 CWDs produce identical stable payload; writes land in fixture dir'
      : 'CWD disagreement on synthetic fixture');
    return agree ? path.join(dir, outFile) : null;
  } catch (e) {
    record(name, false, String(e.message || e).slice(0, 300));
    return null;
  }
}

const depOut = proveSynth('dependency_graph', 'generate_dependency_graph.js',
  'RepositoryKnowledgeIndex_DependencyGraph.json', writeSynthSources);
const execOut = proveSynth('execution_graphs', 'generate_execution_graphs.js',
  'RepositoryKnowledgeIndex_ExecutionGraphs.json', (dir) => {
    writeSynthSources(dir);
    cp(depOut, path.join(dir, 'RepositoryKnowledgeIndex_DependencyGraph.json'));
  });
proveSynth('hygiene_report', 'generate_hygiene_report.js',
  'RepositoryHygieneReport.json', (dir) => {
    writeSynthSources(dir);
    cp(depOut, path.join(dir, 'RepositoryKnowledgeIndex_DependencyGraph.json'));
    cp(execOut, path.join(dir, 'RepositoryKnowledgeIndex_ExecutionGraphs.json'));
    cp(path.join(REPO, 'RepositoryConstitutionManifest.json'),
      path.join(dir, 'RepositoryConstitutionManifest.json'));
  });

// ---- tracked artifacts untouched ----
let untouched = true;
tracked.forEach(f => {
  if (sha256(path.join(REPO, f)) !== before[f]) { untouched = false; console.log('TRACKED ARTIFACT REWRITTEN: ' + f); }
});
record('tracked-artifacts-untouched', untouched, untouched ? 'all ' + tracked.length + ' tracked JSONs byte-identical' : 'REWRITE DETECTED');

const fails = results.filter(r => !r.ok);
console.log('\n==== SUMMARY: ' + (results.length - fails.length) + '/' + results.length + ' passed ====');
if (fails.length) { console.log('FAILURES:'); fails.forEach(f => console.log(' - ' + f.name + ' :: ' + f.detail)); process.exit(1); }
