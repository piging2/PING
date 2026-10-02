// Deterministic structural validation of a release-certification artifact
// against release-artifact.schema.json v1 (explicit assertions; no AJV).
// Usage: node validate-artifact.js --schema <schema> --artifact <json>
'use strict';
const fs = require('fs');
const path = require('path');
const args = {};
process.argv.slice(2).forEach((a, i, xs) => {
  if (a.startsWith('--')) args[a.slice(2)] = xs[i + 1] && !xs[i + 1].startsWith('--') ? xs[i + 1] : '1';
});
const schema = JSON.parse(fs.readFileSync(path.resolve(args.schema), 'utf8'));
const art = JSON.parse(fs.readFileSync(path.resolve(args.artifact), 'utf8'));
const errs = [];
const ok = (cond, msg) => { if (!cond) errs.push(msg); };
const SHA40 = /^[0-9a-f]{40}$/;

// top-level required
for (const k of schema.required) ok(k in art, 'missing top-level: ' + k);
ok(art.artifactVersion === 'release-certification/1', 'artifactVersion');

// source
ok(SHA40.test(art.source.sha), 'source.sha is 40-hex');
ok(['ping-runtime', 'agent-ops'].includes(art.source.provenanceChain), 'source.provenanceChain');
ok(typeof art.source.repository === 'string' && art.source.repository.length > 0, 'source.repository');
ok(['HIGH', 'MEDIUM', 'LOW'].includes(art.source.confidence), 'source.confidence');

// baseline
ok(SHA40.test(art.baseline.sourceSha), 'baseline.sourceSha is 40-hex');
ok(art.baseline.sourceSha === '099927152b93e0de7c1a120bc88d73fb939c1502', 'baseline is the certified baseline SHA');
ok(typeof art.baseline.certifiedImage === 'string', 'baseline.certifiedImage');

// distribution
ok(typeof art.distribution.manifestDigest === 'string', 'distribution.manifestDigest');

// prePromotionGates: every required gate present, status in enum, order fixed
// (sequence order is the schema's `required` array, not property order).
const preOrder = schema.properties.prePromotionGates.required;
const artPreKeys = Object.keys(art.prePromotionGates);
for (const k of preOrder) ok(k in art.prePromotionGates, 'pre-promotion gate missing: ' + k);
ok(JSON.stringify(artPreKeys) === JSON.stringify(preOrder), 'prePromotionGates sequence order matches schema: ' + JSON.stringify(artPreKeys));
for (const k of artPreKeys) {
  const g = art.prePromotionGates[k];
  ok(['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN', 'NOT_APPLICABLE'].includes(g.status), k + '.status');
  ok(typeof g.tool === 'string', k + '.tool');
}
// gate ordering: sourceSha first, verdict-relevant order preserved
ok(artPreKeys[0] === 'sourceSha', 'first pre-promotion gate is sourceSha');

// deploymentPhase: provenanceLabels present with the OCI requirement
const depKeys = Object.keys(schema.properties.deploymentPhase.properties.gates.required);
for (const k of schema.properties.deploymentPhase.properties.gates.required) {
  ok(k in art.deploymentPhase.gates, 'deployment gate missing: ' + k);
}
const pl = art.deploymentPhase.gates.provenanceLabels;
ok(pl.detail.indexOf('org.opencontainers.image.revision') !== -1, 'provenanceLabels records the OCI label requirement');
const prov = art.deploymentPhase.provenance;
ok(typeof prov.capturedAtBuild === 'boolean', 'provenance.capturedAtBuild boolean');
ok('revision' in prov.ociLabels && 'source' in prov.ociLabels && 'created' in prov.ociLabels, 'provenance.ociLabels keys');

// verdict propagation: blockingGates must equal the FAIL/BLOCKED pre-promotion gates
const blocking = artPreKeys.filter(k => ['FAIL', 'BLOCKED'].includes(art.prePromotionGates[k].status));
ok(JSON.stringify([...art.verdict.blockingGates].sort()) === JSON.stringify([...blocking].sort()),
  'verdict.blockingGates matches FAIL/BLOCKED gates');
const hasFail = blocking.some(k => art.prePromotionGates[k].status === 'FAIL');
const expectVerdict = hasFail ? 'FAILED' : (blocking.length > 0 ? 'BLOCKED' : 'CERTIFIED');
ok(art.verdict.status === expectVerdict, 'verdict.status propagates gate results (expected ' + expectVerdict + ', got ' + art.verdict.status + ')');
ok(['CERTIFIED', 'FAILED', 'BLOCKED', 'NOT_RUN'].includes(art.verdict.status), 'verdict.status enum');

if (errs.length) { console.log('VALIDATION FAILED:'); errs.forEach(e => console.log('  - ' + e)); process.exit(1); }
console.log('VALIDATION PASS: ' + artPreKeys.length + ' pre-promotion gates, ' + Object.keys(art.deploymentPhase.gates).length + ' deployment gates, verdict=' + art.verdict.status);
