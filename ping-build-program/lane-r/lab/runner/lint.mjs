// Fixture lint: reject fixtures that cannot be trusted before they run.
// A fixture is REJECTED (exit 1, violations listed) if it is
// nondeterministic, references live hosts, or fails the format contract.
// This is the executable form of FIXTURE-FORMAT.md "kill criteria".

export function lintFixture(fixture, sourceName = '<fixture>') {
  const v = [];
  const fail = (msg) => v.push(`${sourceName}: ${msg}`);

  if (fixture.format !== 'ping.ingest.fixture@1') fail(`unsupported format ${JSON.stringify(fixture.format)}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fixture.fixtureId || '')) fail('fixtureId must be kebab-case');
  if (!Number.isInteger(fixture.fixtureVersion) || fixture.fixtureVersion < 1) fail('fixtureVersion must be integer >= 1');
  if (!fixture.title) fail('title required');

  const replay = fixture.replay || {};
  if (replay.deterministicClock !== true) fail('replay.deterministicClock must be true (no wall-clock)');
  if (!Number.isInteger(replay.seed)) fail('replay.seed must be an integer (seeded PRNG only)');
  if (!replay.baseTime || Number.isNaN(Date.parse(replay.baseTime))) fail('replay.baseTime must be a valid ISO-8601 timestamp pin');
  const lm = replay.latencyMode;
  if (!(lm === 'recorded' || lm === 'none' || (typeof lm === 'string' && /^scaled:\d+(\.\d+)?$/.test(lm)))) {
    fail(`replay.latencyMode must be recorded|none|scaled:<factor>, got ${JSON.stringify(lm)}`);
  }
  if (typeof replay.strictOrder !== 'boolean') fail('replay.strictOrder must be boolean');

  const steps = fixture.steps || [];
  if (!Array.isArray(steps) || steps.length === 0) fail('steps must be a non-empty array');
  const ids = new Set();
  for (const s of steps) {
    if (!s.id) { fail('every step needs an id'); continue; }
    if (ids.has(s.id)) fail(`duplicate step id ${s.id}`);
    ids.add(s.id);
    if (s.kind === 'request') {
      if (!s.request?.method || !s.request?.path) fail(`request step ${s.id} needs method+path`);
      if (!s.response && !s.responses) fail(`request step ${s.id} needs response or responses`);
    } else if (s.kind === 'webhook-delivery') {
      if (!s.delivery?.deliveryId || !s.delivery?.eventId) fail(`webhook step ${s.id} needs deliveryId+eventId`);
    } else if (s.kind === 'control') {
      if (!s.inject?.atStep) fail(`control step ${s.id} needs inject.atStep`);
      else if (!ids.has(s.inject.atStep) && !steps.some(x => x.id === s.inject.atStep)) fail(`control step ${s.id} targets unknown step ${s.inject.atStep}`);
    } else {
      fail(`step ${s.id} has unknown kind ${JSON.stringify(s.kind)}`);
    }
  }

  // No live hosts, no real provider hostnames in REQUEST TARGETS: fixtures
  // replay offline. Notes/titles may name the provider being modeled; only
  // paths, Link headers, and nextPath cursors are request targets.
  const liveHost = /(https?:\/\/)?([a-z0-9-]+\.)*(github\.com|api\.github\.com|gitlab\.com|shopify\.com|myshopify\.com|googleapis\.com|stripe\.com|api\.stripe\.com|amazonaws\.com)([/:]|$)/i;
  const absoluteUrl = /https?:\/\/(?!api\.fixture\.local)/i;
  const targets = [];
  for (const s of steps) {
    if (s.request?.path) targets.push([s.id, 'request.path', s.request.path]);
    const link = s.response?.headers?.link || (s.responses || []).map(r => r.headers?.link).filter(Boolean).join(',');
    if (link) targets.push([s.id, 'response.headers.link', link]);
    const np = s.response?.nextPath || (s.responses || []).map(r => r.nextPath).filter(Boolean).join(',');
    if (np) targets.push([s.id, 'response.nextPath', np]);
  }
  for (const [id, where, val] of targets) {
    if (liveHost.test(val)) fail(`step ${id} ${where} references a live provider hostname (fixtures replay offline against api.fixture.local)`);
    else if (absoluteUrl.test(val)) fail(`step ${id} ${where} is an absolute URL not on api.fixture.local`);
  }

  // No unseeded randomness or wall-clock tokens anywhere in the fixture.
  const bytes = JSON.stringify(fixture);
  if (/(Date\.now|performance\.now|Math\.random|new Date\(\))/.test(bytes)) {
    fail('fixture contains wall-clock/random tokens (Date.now, Math.random, ...): nondeterministic');
  }

  const san = fixture.sanitization || {};
  if (!['synthetic', 'sanitized-production'].includes(san.status)) fail('sanitization.status must be synthetic|sanitized-production');
  if (san.canaryCheck !== 'passed') fail('sanitization.canaryCheck must be "passed"');
  if (san.status === 'sanitized-production' && !(san.redactions || []).length) {
    fail('sanitized-production fixtures must list redactions');
  }

  const digest = fixture.capture?.sourceDigest;
  if (!digest || digest === 'sha256:COMPUTED-BY-RUNNER') fail('capture.sourceDigest must be pinned (run with --pin-digest)');
  if (!fixture.capture?.recordedBy) fail('capture.recordedBy required (provenance)');

  if (!fixture.expect || typeof fixture.expect !== 'object' || Object.keys(fixture.expect).length === 0) {
    fail('expect must declare at least one assertion (a fixture that cannot fail is a tautology)');
  }

  return { pass: v.length === 0, violations: v };
}
