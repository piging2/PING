#!/usr/bin/env node
/**
 * release-certify.js: the ONE release-certification sequence (Lane C).
 *
 * Nolan's release doctrine: "A release is not the set of files changed since
 * the previous release. A release is a complete, certified closure of the
 * runtime represented by a specific source revision."
 *
 * This script runs the pre-promotion gates in ONE fixed order against the
 * EXACT distribution snapshot, then emits a release-certification artifact
 * (release-artifact.schema.json v1). A non-zero exit blocks promotion.
 *
 * Pre-promotion sequence (each gate is a standalone script; this file only
 * orders them and assembles the artifact (it refactors nothing):
 *   0. sourceSha            git SHA + branch; dirty worktree FAILS
 *   1. snapshotManifest      distribution manifest + digest
 *   2. distributionClosure  closure-certify.js (local module closure)
 *   3. runtimeDepsClosure   runtime-deps-closure.js (npm closure)
 *   4. arm64Compat           arm64-compat.js (toolchain compatibility)
 *   5. executableSmoke       gateway-smoke.js (real boot to safe boundary)
 *   6. migrationTrigger      migration-trigger-gate.js (fixture: BLOCKED
 *                            until Lane A's fixture gate lands)
 *   7. securityNegatives     security-negatives.js (no secret material)
 *
 * Deployment-phase gates (container build -> rollback proof) are defined in
 * RELEASE-SEQUENCE.md and recorded as NOT_RUN slots in the artifact. They
 * are executed by the deploy lane on the target plane AFTER image build;
 * a second artifact (same schema) is emitted after the runtime proof. This
 * lane performs no Oracle mutation, so it does not run them.
 *
 * Usage:
 *   node release-certify.js --root <repoRoot> --snapshot <dir>
 *       --classify <json> --entrypoints <csv> [--dynamic-targets <csv>]
 *       --migrations <csv> --trigger-policy <json> --dockerfile <path>
 *       --smoke-node-version <major> [--fixture-result <json>]
 *       [--test-evidence <json>] [--provenance-chain ping-runtime|agent-ops]
 *       [--workdir <dir>] [--json-out <path>]
 *
 * Exit: 0 CERTIFIED, 1 FAILED, 2 tool error, 3 BLOCKED.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const DIST = __dirname;

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function fail2(msg) {
  process.stderr.write('release-certify: ' + msg + '\n');
  process.exit(2);
}

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function sha256File(p) {
  return sha256(fs.readFileSync(p));
}

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 30000 });
  if (r.status !== 0) return null;
  return (r.stdout || '').trim();
}

function runGate(name, script, args, timeoutMs, workdir) {
  const jsonOut = path.join(workdir, name + '.json');
  const fullArgs = args.concat(['--json-out', jsonOut]);
  const r = spawnSync(process.execPath, [path.join(DIST, script)].concat(fullArgs), {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  let report = null;
  let reportDigest = null;
  if (fs.existsSync(jsonOut)) {
    try {
      report = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
      reportDigest = sha256File(jsonOut);
    } catch (e) { /* report unreadable; status from exit code */ }
  }
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  return {
    name,
    exitCode: timedOut ? null : r.status,
    timedOut,
    stdoutTail: (r.stdout || '').split('\n').slice(-8).join('\n'),
    stderrTail: (r.stderr || '').split('\n').slice(-4).join('\n'),
    report,
    reportDigest,
  };
}

function gateStatus(res) {
  if (res.timedOut) return 'FAIL';
  if (res.exitCode === 0) return 'PASS';
  if (res.exitCode === 3) return 'BLOCKED';
  return 'FAIL';
}

// Declared versions are source truth (regex over the authority files).
// Certification status is the derived claim, read from CERTIFICATION.md
// markers; UNDEFINED when no marker exists. Never conflated.
function declaredVersions(root, files, patterns) {
  const out = [];
  for (const f of files) {
    const abs = path.join(root, f);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    for (const p of patterns) {
      const m = p.re.exec(text);
      if (m) out.push({ file: f, version: m[1] });
    }
  }
  return out;
}

function certificationMarker(root, subject) {
  const cert = path.join(root, 'CERTIFICATION.md');
  if (!fs.existsSync(cert)) return { status: 'UNDEFINED', note: 'CERTIFICATION.md absent' };
  const text = fs.readFileSync(cert, 'utf8');
  if (subject === 'eventIdentity') {
    if (/Event Identity certification WITHDRAWN/.test(text)) {
      return { status: 'WITHDRAWN', note: 'CERTIFICATION.md: Event Identity certification WITHDRAWN (F7 falsified 2026-09-18)' };
    }
    return { status: 'UNDEFINED', note: 'no machine-readable event-identity certification marker in CERTIFICATION.md' };
  }
  if (subject === 'witnessReplay') {
    if (/witness: 9 implementations/.test(text) || /witness[^.]{0,80}NOT CERTIFIED/i.test(text)) {
      return { status: 'UNDEFINED', note: 'CERTIFICATION.md: witness NOT CERTIFIED (9 implementations, 3 live/reachable, incompatible formats, zero persisted)' };
    }
    return { status: 'UNDEFINED', note: 'no machine-readable witness/replay certification marker in CERTIFICATION.md' };
  }
  return { status: 'UNDEFINED', note: 'unknown subject' };
}

function main() {
  const args = parseArgs(process.argv);
  const root = args.root;
  const snapshot = args.snapshot;
  const classify = args.classify;
  const entrypoints = args.entrypoints;
  const migrations = args.migrations;
  const triggerPolicy = args['trigger-policy'];
  const dockerfile = args.dockerfile;
  const smokeNode = args['smoke-node-version'];
  if (!root || !snapshot || !classify || !entrypoints || !migrations || !triggerPolicy || !dockerfile || !smokeNode) {
    fail2('usage: --root <dir> --snapshot <dir> --classify <json> --entrypoints <csv> --migrations <csv> --trigger-policy <json> --dockerfile <path> --smoke-node-version <major> [--dynamic-targets <csv>] [--fixture-result <json>] [--test-evidence <json>] [--provenance-chain ping-runtime|agent-ops] [--workdir <dir>] [--json-out <path>]');
  }
  const absRoot = path.resolve(root);
  const absSnap = path.resolve(snapshot);
  const workdir = path.resolve(args.workdir || path.join('/tmp', 'release-certify-' + Date.now()));
  fs.mkdirSync(workdir, { recursive: true });

  const gates = {};
  function record(key, res, summary) {
    gates[key] = {
      tool: res.name,
      status: gateStatus(res),
      exitCode: res.exitCode,
      summary: summary || res.stdoutTail.split('\n')[0],
      detail: res.stdoutTail + (res.stderrTail ? '\nSTDERR: ' + res.stderrTail : ''),
      reportDigest: res.reportDigest,
    };
  }

  // Phase 0: source identity. A release is a specific revision; dirty fails.
  // Provenance is captured at certification time from git (HIGH confidence).
  // Forensic reconstruction afterward gets MEDIUM/LOW with a note; the
  // release process must close that gap going forward (see baseline).
  const sha = git(absRoot, ['rev-parse', 'HEAD']);
  const branch = git(absRoot, ['branch', '--show-current']) || 'detached';
  const porcelain = git(absRoot, ['status', '--porcelain']) || '';
  const dirty = porcelain.trim().length > 0;
  const repository = git(absRoot, ['config', '--get', 'remote.origin.url']) || 'unknown';
  const provenanceChain = args['provenance-chain'] || 'ping-runtime';
  gates.sourceSha = {
    tool: 'sourceSha',
    status: sha && !dirty ? 'PASS' : 'FAIL',
    exitCode: sha && !dirty ? 0 : 1,
    summary: sha ? (sha.slice(0, 12) + ' ' + branch + ' ' + repository + (dirty ? ' DIRTY' : ' clean')) : 'not a git revision',
    detail: sha ? 'sha=' + sha + ' branch=' + branch + ' dirty=' + dirty + ' repository=' + repository + ' chain=' + provenanceChain + ' confidence=HIGH (captured at certification time from git)' : 'git rev-parse failed',
    reportDigest: null,
  };

  const dynamicTargets = args['dynamic-targets'] || '';
  const fixtureResult = args['fixture-result'] || null;

  // Phase 1: distribution manifest.
  record('distributionManifest', runGate('manifest', 'snapshot-manifest.js', ['--snapshot', absSnap], 120000, workdir));

  // Phase 2: local module closure.
  const closureArgs = ['--root', absRoot, '--entrypoints', entrypoints, '--snapshot', absSnap, '--classify', path.resolve(classify)];
  if (dynamicTargets) closureArgs.push('--dynamic-targets', dynamicTargets);
  const closureRes = runGate('closure', 'closure-certify.js', closureArgs, 180000, workdir);
  record('distributionClosure', closureRes);

  // Phase 3: external dependency closure (consumes the closure report).
  const closureReportPath = path.join(workdir, 'closure.json');
  record('runtimeDepsClosure', runGate('deps', 'runtime-deps-closure.js',
    ['--snapshot', absSnap, '--closure-report', closureReportPath], 120000, workdir));

  // Phase 4: ARM64 / toolchain compatibility.
  record('arm64Compat', runGate('arm64', 'arm64-compat.js',
    ['--snapshot', absSnap, '--dockerfile', path.resolve(dockerfile), '--smoke-node-version', smokeNode], 60000, workdir));

  // Phase 5: executable smoke (real boot to the declared safe boundary).
  record('executableSmoke', runGate('smoke', 'gateway-smoke.js', ['--snapshot', absSnap], 180000, workdir));

  // Phase 6: migration/trigger compatibility (fixture portion BLOCKED until Lane A).
  const mtArgs = ['--root', absRoot, '--migrations', migrations, '--trigger-policy', path.resolve(triggerPolicy)];
  if (fixtureResult) mtArgs.push('--fixture-result', path.resolve(fixtureResult));
  const mtRes = runGate('migration-trigger', 'migration-trigger-gate.js', mtArgs, 120000, workdir);
  record('migrationTrigger', mtRes);

  // Phase 7: security negatives.
  record('securityNegatives', runGate('security', 'security-negatives.js', ['--snapshot', absSnap], 120000, workdir));

  // Assemble the artifact.
  const manifestPath = path.join(workdir, 'manifest.json');
  const manifestReport = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { digest: 'unavailable', entries: [], nodeModules: { present: false, packageLockDigest: 'absent' } };
  const mtReport = fs.existsSync(path.join(workdir, 'migration-trigger.json'))
    ? JSON.parse(fs.readFileSync(path.join(workdir, 'migration-trigger.json'), 'utf8')) : null;

  const identityFiles = [
    'runtime/kernel/authorities/identity_authority.js',
    'runtime/kernel/authorities/replay_identity_authority.js',
    'runtime/kernel/authorities/runtime_identity_authority.js',
  ];
  const witnessFiles = ['runtime/kernel/authorities/witness_authority.js'];
  const idMarker = certificationMarker(absRoot, 'eventIdentity');
  const witMarker = certificationMarker(absRoot, 'witnessReplay');

  let testManifest = { suites: [] };
  if (args['test-evidence']) {
    try {
      testManifest = JSON.parse(fs.readFileSync(path.resolve(args['test-evidence']), 'utf8'));
    } catch (e) {
      fail2('cannot read test evidence: ' + e.message);
    }
  }

  const deploymentGates = {};
  const deploymentGateNotes = {
    containerBuild: 'image builds for linux/arm64 from the exact snapshot; digest recorded',
    candidateStartup: 'candidate container starts with no crash-loop; MODULE_NOT_FOUND class absent',
    provenanceLabels: 'REQUIREMENT (deployment agent implements; design only in this lane): every PING image carries org.opencontainers.image.revision=<git SHA>, org.opencontainers.image.source=<repository>, org.opencontainers.image.created=<build timestamp>; /health or a build-info surface exposes non-secret source_sha / image identity / runtime version. Closes the baseline gap: the certified image was built from a non-git tarball with no labels, forcing forensic SHA reconstruction.',
    readiness: '/health READY within the bounded startup window; no silent endless retry',
    canonicalEventWrite: 'authenticated POST /events persists one canonical event to ping_events',
    dedup: 're-POST returns the identical event_id with no new row',
    missionPath: 'event drives the mission chain CREATED to COMPLETED with evidence',
    workerResultPath: 'where live: worker executes and result/evidence lands canonically',
    restart: 'container restarts cleanly',
    postRestartRead: 'gates 11-14 outputs recoverable after restart',
    rollbackProof: 'rollback image retagged and verified healthy BEFORE the candidate swap',
  };
  for (const k of Object.keys(deploymentGateNotes)) {
    deploymentGates[k] = {
      tool: k,
      status: 'NOT_RUN',
      exitCode: null,
      summary: 'deployment-phase gate; executed by the deploy lane on the target plane after image build',
      detail: deploymentGateNotes[k],
      reportDigest: null,
    };
  }

  const blocking = Object.entries(gates).filter(([, g]) => g.status !== 'PASS').map(([k]) => k);
  const failed = blocking.filter((k) => gates[k].status === 'FAIL');
  const verdictStatus = failed.length ? 'FAILED' : (blocking.length ? 'BLOCKED' : 'CERTIFIED');

  const artifact = {
    artifactVersion: 'release-certification/1',
    source: {
      sha: sha || 'unknown',
      branch,
      dirty,
      repository,
      provenanceChain,
      confidence: sha && !dirty ? 'HIGH' : 'LOW',
      confidenceNote: sha && !dirty
        ? 'captured at certification time from git on a clean tree'
        : 'SHA not captured at build time from a clean revision; forensic reconstruction only',
    },
    baseline: {
      sourceSha: '099927152b93e0de7c1a120bc88d73fb939c1502',
      branch: 'constitutional-convergence-v2',
      repository: 'ngesk2/crx-runtime',
      certifiedImage: '8400deecf2a9',
      certifiedAt: '2026-09-19',
      confidence: 'HIGH',
      note: 'Certified baseline: the Oracle running image was fingerprinted to this commit by the provenance lane (container files EXACT sha256 match to the Oracle release tarball; tarball STRONG_MATCH to the commit after CRLF normalization). Rollback target of record. Gap: the image was built from a non-git snapshot tarball with no OCI/git provenance labels and unknown build/deploy commands; its SHA was reconstructed by forensics afterward. Going forward the source SHA must be captured at build time (see deploymentPhase.provenance).',
    },
    distribution: {
      snapshotRoot: absSnap,
      manifestDigest: manifestReport.digest,
      manifestEntries: manifestReport.entries.length,
      nodeModules: manifestReport.nodeModules,
    },
    prePromotionGates: gates,
    schemaState: {
      migrationEngineVersion: null,
      registeredMigrations: [],
      migrationSources: (migrations || '').split(',').map((s) => s.trim()).filter(Boolean),
      statements: mtReport ? mtReport.statements.map((s) => ({
        file: s.file, keyword: s.keyword, table: s.table, statementDigest: s.statementDigest, verdict: s.verdict,
      })) : [],
    },
    eventIdentity: {
      declaredVersions: declaredVersions(absRoot, identityFiles, [{ re: /_identityVersion\s*=\s*['"]([^'"]+)['"]/ }]),
      certificationStatus: idMarker.status,
      certificationNote: idMarker.note,
    },
    witnessReplay: {
      declaredVersions: declaredVersions(absRoot, witnessFiles, [
        { re: /authority_version:\s*['"]([^'"]+)['"]/ },
        { re: /constitutional_version:\s*['"]([^'"]+)['"]/ },
      ]),
      certificationStatus: witMarker.status,
      certificationNote: witMarker.note,
    },
    testManifest,
    deploymentPhase: {
      status: 'NOT_RUN',
      containerImageDigest: null,
      architecture: null,
      gates: deploymentGates,
      rollbackImageDigest: null,
      provenance: {
        capturedAtBuild: false,
        ociLabels: { revision: null, source: null, created: null },
        buildInfoExposed: false,
        note: 'NOT_RUN in the pre-promotion artifact. Deployment requirement (Phase 9): the deployment agent adds OCI labels org.opencontainers.image.revision/.source/.created at build time and exposes non-secret source_sha / image identity / runtime version on /health or a build-info surface. Design only in this lane; do not implement here.',
      },
    },
    verdict: {
      status: verdictStatus,
      blockingGates: blocking,
      note: verdictStatus === 'CERTIFIED'
        ? 'all pre-promotion gates PASS; cleared for image build and deployment-phase gates'
        : (failed.length ? 'promotion BLOCKED by failed gates: ' + failed.join(', ') : 'promotion BLOCKED pending: ' + blocking.join(', ')),
    },
    provenance: {
      producedAt: new Date().toISOString(),
      producedBy: 'lane-c/release-certify',
      tool: 'release-certify',
    },
  };

  const outPath = path.resolve(args['json-out'] || path.join(workdir, 'release-certification.json'));
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2) + '\n');

  const lines = [];
  lines.push('release-certify: ' + (sha || 'unknown').slice(0, 12) + ' ' + branch + (dirty ? ' DIRTY' : ''));
  for (const [k, g] of Object.entries(gates)) lines.push('  [' + g.status + '] ' + k + ' - ' + g.summary);
  lines.push('verdict: ' + verdictStatus + (blocking.length ? ' (blocking: ' + blocking.join(', ') + ')' : ''));
  lines.push('artifact: ' + outPath);
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(verdictStatus === 'CERTIFIED' ? 0 : (failed.length ? 1 : 3));
}

main();
