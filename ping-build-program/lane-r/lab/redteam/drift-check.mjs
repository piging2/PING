// drift-check.mjs: detect when a recorded fixture no longer matches provider
// reality. Compares a fixture's recordSchema against a fresh live sample
// (records array) and reports field-level drift: added / removed / retyped.
// Any drift maps to lane-K SCHEMA_CHANGED: quarantine, halt the stream,
// never silently coerce, never auto-accept the new shape.
//
// Tonight there is no live provider access (standing decision: fixtures
// only), so the "live sample" is supplied as a JSON file. After the morning
// connect flow is authorized, this runs on the provider-contract revalidation
// cadence (see lab/redteam/DRIFT-DETECTION.md).
//
//   node drift-check.mjs <fixture.json> <live-sample.json> [--report <out>]
// Exit 0: no drift. Exit 1: drift detected (report written if requested).

import { readFileSync, writeFileSync } from 'node:fs';

function typeOf(v) {
  if (v === null || v === undefined) return 'missing';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

export function diffSchema(recordSchema, liveRecords) {
  const expected = recordSchema?.fields || {};
  const observed = {};
  for (const rec of liveRecords) {
    if (!rec || typeof rec !== 'object') continue;
    for (const [k, v] of Object.entries(rec)) {
      const t = typeOf(v);
      if (t === 'missing') continue;
      if (!observed[k]) observed[k] = new Set();
      observed[k].add(t);
    }
  }
  const added = Object.keys(observed).filter(k => !(k in expected));
  const removed = Object.keys(expected).filter(k => !(k in observed));
  const retyped = Object.keys(expected).filter(k => {
    if (!(k in observed)) return false;
    const types = [...observed[k]];
    return types.length !== 1 || types[0] !== expected[k];
  }).map(k => ({ field: k, expected: expected[k], observed: [...observed[k]] }));
  return { added, removed, retyped, drift: added.length > 0 || removed.length > 0 || retyped.length > 0 };
}

export function driftReport(fixture, liveRecords) {
  const diff = diffSchema(fixture.recordSchema, liveRecords);
  return {
    fixtureId: fixture.fixtureId,
    fixtureVersion: fixture.fixtureVersion,
    recordSchemaVersion: fixture.recordSchema ? 'declared' : 'none-declared',
    sampleSize: liveRecords.length,
    drift: diff.drift,
    added: diff.added,
    removed: diff.removed,
    retyped: diff.retyped,
    classification: diff.drift ? 'SCHEMA_CHANGED' : null,
    action: diff.drift
      ? 'quarantine new-shape records; halt stream; mint new fixture version from a fresh sanitized capture; flag contract update (lane K 2.7). Never auto-accept.'
      : 'recorded shape still matches provider reality',
  };
}

const isCLI = process.argv[1] && process.argv[1].endsWith('drift-check.mjs');
if (isCLI) {
  const args = process.argv.slice(2);
  const [fixturePath, samplePath] = args.filter(a => !a.startsWith('--'));
  const ri = args.indexOf('--report');
  const reportPath = ri >= 0 ? args[ri + 1] : null;
  if (!fixturePath || !samplePath) {
    console.error('usage: node drift-check.mjs <fixture.json> <live-sample.json> [--report <out>]');
    process.exit(2);
  }
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const sample = JSON.parse(readFileSync(samplePath, 'utf8'));
  const report = driftReport(fixture, Array.isArray(sample) ? sample : [sample]);
  if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  if (report.drift) {
    console.log(`DRIFT-DETECTED  ${report.fixtureId}@v${report.fixtureVersion} -> SCHEMA_CHANGED`);
    if (report.added.length) console.log(`  added: ${report.added.join(', ')}`);
    if (report.removed.length) console.log(`  removed: ${report.removed.join(', ')}`);
    for (const r of report.retyped) console.log(`  retyped: ${r.field} expected ${r.expected}, observed ${r.observed.join('|')}`);
    process.exit(1);
  }
  console.log(`NO-DRIFT  ${report.fixtureId}@v${report.fixtureVersion}`);
  process.exit(0);
}
