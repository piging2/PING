// Synthetic sequence proof for the release-certification artifact (Lane C).
// Assembles three artifact variants with stubbed gate results and hands each
// to validate-artifact.js, which asserts schema shape, gate ordering, and
// verdict propagation. This proves artifact mechanics; it does not claim a
// synthetic tree passes PING's executable smoke (that gate is PING-specific).
'use strict';
const fs = require('fs');
const schema = JSON.parse(fs.readFileSync(process.env.SCHEMA, 'utf8'));
const preOrder = schema.properties.prePromotionGates.required;
const depRequired = schema.properties.deploymentPhase.properties.gates.required;

function gate(tool, status) {
  return { tool, status, exitCode: status === 'PASS' ? 0 : 1, summary: tool + ' ' + status, detail: 'synthetic proof', reportDigest: null };
}
function build(statuses) {
  const pre = {};
  for (const k of preOrder) pre[k] = gate(k, statuses[k] || 'PASS');
  const dep = {};
  const PROVENANCE_REQUIREMENT = 'REQUIREMENT (deployment agent implements; design only in this lane): every PING image carries org.opencontainers.image.revision=<git SHA>, org.opencontainers.image.source=<repository>, org.opencontainers.image.created=<build timestamp>; /health or a build-info surface exposes non-secret source_sha / image identity / runtime version.';
  for (const k of depRequired) dep[k] = { tool: k, status: 'NOT_RUN', exitCode: null, summary: 'not run', detail: k === 'provenanceLabels' ? PROVENANCE_REQUIREMENT : 'synthetic', reportDigest: null };
  const blocking = preOrder.filter(k => ['FAIL', 'BLOCKED'].includes(pre[k].status));
  const verdict = blocking.some(k => pre[k].status === 'FAIL') ? 'FAILED' : (blocking.length ? 'BLOCKED' : 'CERTIFIED');
  return {
    artifactVersion: 'release-certification/1',
    source: { sha: '099927152b93e0de7c1a120bc88d73fb939c1502', branch: 'constitutional-convergence-v2', dirty: false, repository: 'ngesk2/crx-runtime', provenanceChain: 'ping-runtime', confidence: 'HIGH', confidenceNote: 'synthetic proof' },
    baseline: { sourceSha: '099927152b93e0de7c1a120bc88d73fb939c1502', branch: 'constitutional-convergence-v2', repository: 'ngesk2/crx-runtime', certifiedImage: '8400deecf2a9', confidence: 'HIGH' },
    distribution: { snapshotRoot: '/tmp/synth', manifestDigest: 'synthetic', manifestEntries: 1, nodeModules: { present: false, digest: 'absent' } },
    prePromotionGates: pre,
    deploymentPhase: { status: 'NOT_RUN', containerImageDigest: null, architecture: null, gates: dep, rollbackImageDigest: null, provenance: { capturedAtBuild: false, ociLabels: { revision: null, source: null, created: null }, buildInfoExposed: false, note: 'synthetic' } },
    verdict: { status: verdict, blockingGates: blocking, note: 'synthetic proof' },
    provenance: { producedAt: '2026-09-19', producedBy: 'synthetic-proof', tool: 'synthetic-proof' },
  };
}
const dir = '/tmp/synth-proof';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dir + '/all-pass.json', JSON.stringify(build({}), null, 1) + '\n');
fs.writeFileSync(dir + '/one-fail.json', JSON.stringify(build({ migrationTrigger: 'FAIL' }), null, 1) + '\n');
fs.writeFileSync(dir + '/one-blocked.json', JSON.stringify(build({ migrationTrigger: 'BLOCKED' }), null, 1) + '\n');
console.log('wrote', dir);
