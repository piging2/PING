// GitHub issues connector SHAPE: reference consumer of the lab.
// A thin reader implementing the BCQ contract surface (spec/check/discover/
// read) over the lab's replay transport, proving that a contract-shaped
// adapter can be exercised end to end by a fixture with zero live calls.
//
// Lane CONN owns the real GitHub adapter. This file is the lab's proof that
// the fixture format serves that adapter's development: PRODUCTION FAILURE
// -> FIXTURE -> REGRESSION TEST -> GENERIC FIX, replayed here.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ReplayTransport } from './runner/transport.mjs';
import { runPaginatedRead } from './runner/harness.mjs';
import { assertReport } from './runner/assert.mjs';

export class GitHubIssuesReader {
  constructor() {
    this.connectorId = 'github';
    this.version = '0.1.0-lab';
    this.provider = 'github.com';
  }
  // BCQ contract: spec declares config schema; credential refs are vault
  // pointers, never raw secrets. No live credentials exist in the lab.
  spec() {
    return {
      connectorId: this.connectorId,
      version: this.version,
      capabilities: [{ verb: 'read', object: 'issue', scope: 'repo' }],
      configSchema: {
        owner: 'string', repo: 'string',
        credentialRef: 'pingsec-handle (lane-L broker; never a token value)',
      },
    };
  }
  // BCQ contract: check proves reachability against the REPLAY transport.
  check(transport) {
    const probe = transport.request('GET', '/repos/acme/widgets/issues?state=open&per_page=3&page=1');
    return { ok: probe.status === 200, probeStatus: probe.status };
  }
  // BCQ contract: discover returns a deterministic stream list.
  discover() { return ['issues']; }
  // BCQ contract: read emits records interleaved with state checkpoints and
  // one terminal fetch state. Cursor handling, retry, idempotency, and
  // failure classification ride on the shared harness mechanisms.
  async read(fixture, transport, state) {
    return runPaginatedRead(fixture, transport);
  }
}

async function main() {
  const fixturePath = process.argv[2] || 'fixtures/github-issues-paginated.fixture.json';
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const transport = new ReplayTransport(fixture, {});
  const digest = transport.verifyDigest();
  if (!digest.ok) {
    console.error(`digest mismatch: ${digest.recorded} != ${digest.computed}`);
    process.exit(2);
  }
  const reader = new GitHubIssuesReader();
  const checkResult = reader.check(transport);
  // check() consumed the first request; rebuild the transport for a clean read.
  const transport2 = new ReplayTransport(fixture, {});
  const report = await reader.read(fixture, transport2, null);
  const verdict = assertReport(fixture.expect, report);
  mkdirSync('evidence', { recursive: true });
  const out = {
    connector: { connectorId: reader.connectorId, version: reader.version, provider: reader.provider },
    spec: reader.spec(),
    check: checkResult,
    streams: reader.discover(),
    verdict: verdict.pass ? 'PASS' : 'FAIL',
    failures: verdict.failures,
    report,
  };
  writeFileSync('evidence/github-replay-report.json', JSON.stringify(out, null, 2) + '\n');
  console.log(`${verdict.pass ? 'PASS' : 'FAIL'}  github-issues-reader via ${fixture.fixtureId}@v${fixture.fixtureVersion}`);
  console.log(`  check=${JSON.stringify(checkResult)} streams=${reader.discover()}`);
  console.log(`  records=${report.recordsEmitted} terminal=${report.terminalState} codes=[${report.failureCodes.join(',')}]`);
  console.log('  evidence: lab/evidence/github-replay-report.json');
  process.exit(verdict.pass ? 0 : 1);
}

main();
