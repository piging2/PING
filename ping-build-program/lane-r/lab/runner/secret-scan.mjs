// Secret scan: prove a fixture contains no real secret values before it is
// admitted to the lab. Secrets are NEVER values in a fixture (FIXTURE-FORMAT.md):
// captured credentials become redaction entries with method "dropped" or a
// lane-L handle ref (pingsec_1_...), never the value.
//
// Usage: node secret-scan.mjs <fixture.json> [--canary <value>]
// Exit 0: clean. Exit 1: secret-shaped values found (listed with paths).
// A planted canary value (from the capture environment) must never appear
// in the fixture bytes; pass it with --canary to enforce canaryCheck.

const SECRET_PATTERNS = [
  [/sk_live_[A-Za-z0-9]{12,}/, 'stripe-live-secret-key'],
  [/sk_test_[A-Za-z0-9]{12,}/, 'stripe-test-secret-key'],
  [/ghp_[A-Za-z0-9]{20,}/, 'github-personal-access-token'],
  [/github_pat_[A-Za-z0-9_]{20,}/, 'github-fine-grained-token'],
  [/gho_[A-Za-z0-9]{20,}/, 'github-oauth-token'],
  [/xox[bpras]-[A-Za-z0-9-]{10,}/, 'slack-token'],
  [/AKIA[0-9A-Z]{16}/, 'aws-access-key-id'],
  [/-----BEGIN (?:RSA )?PRIVATE KEY-----/, 'private-key-block'],
  [/["']?authorization["']?\s*:\s*["']Bearer [A-Za-z0-9\-._~+/=]{16,}["']/, 'bearer-token-header'],
  [/["']?api[_-]?key["']?\s*:\s*["'][A-Za-z0-9\-_]{20,}["']/i, 'api-key-field'],
  [/["']?client[_-]?secret["']?\s*:\s*["'][^"']{8,}["']/i, 'client-secret-field'],
  [/webhook[_-]?secret["']?\s*:\s*["']whsec_[A-Za-z0-9\-_]{16,}["']/i, 'webhook-signing-secret'],
];

// Lane-L handle refs are audit pointers, never secret values: always allowed.
const HANDLE_RE = /pingsec_1_[A-Za-z0-9_-]+/g;

function findSecrets(fixture, canaryValue) {
  const hits = [];
  const seen = new Set();
  const bytes = JSON.stringify(fixture);
  const redacted = bytes.replace(HANDLE_RE, '␡'); // handles are not secrets
  for (const [re, label] of SECRET_PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    while ((m = g.exec(redacted)) !== null) {
      const sample = m[0].slice(0, 24);
      const key = label + ':' + sample;
      if (seen.has(key)) continue;
      seen.add(key);
      // Locate the JSON path approximately: find the nearest preceding key.
      const before = redacted.slice(0, m.index);
      const keyMatch = before.match(/"([^"]{1,40})"\s*:\s*"?[^"]{0,60}$/);
      hits.push({ label, near: keyMatch ? keyMatch[1] : '(unknown path)', sample: sample + '...' });
    }
  }
  if (canaryValue && bytes.includes(canaryValue)) {
    hits.push({ label: 'planted-canary', near: '(fixture bytes)', sample: 'canary value present: sanitization failed' });
  }
  return hits;
}

export { findSecrets, SECRET_PATTERNS };

const isCLI = process.argv[1] && process.argv[1].endsWith('secret-scan.mjs');
if (isCLI) {
  const { readFileSync } = await import('node:fs');
  const args = process.argv.slice(2);
  const path = args.find(a => !a.startsWith('--'));
  const ci = args.indexOf('--canary');
  const canary = ci >= 0 ? args[ci + 1] : null;
  if (!path) { console.error('usage: node secret-scan.mjs <fixture.json> [--canary <value>]'); process.exit(2); }
  const fixture = JSON.parse(readFileSync(path, 'utf8'));
  const hits = findSecrets(fixture, canary);
  if (hits.length === 0) {
    console.log(`secret-scan CLEAN  ${fixture.fixtureId || path}`);
    process.exit(0);
  }
  console.log(`secret-scan REJECTED  ${fixture.fixtureId || path}  (${hits.length} hits)`);
  for (const h of hits) console.log(`  - [${h.label}] near "${h.near}": ${h.sample}`);
  process.exit(1);
}
