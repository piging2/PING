// db.js — env-based pool for the TEST postgres only.
// Password is resolved at runtime from the ping-test-pg container env and held
// in memory only. Never logged, never passed as a CLI arg, never written to files.
'use strict';
const { execSync } = require('child_process');

let cached = null;
function testPgEnv() {
  if (cached) return cached;
  const out = execSync(
    "docker inspect ping-test-pg --format '{{range .Config.Env}}{{println .}}{{end}}'",
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  const env = {};
  for (const line of out.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  }
  const pw = env.POSTGRES_PASSWORD;
  if (!pw) throw new Error('could not resolve test pg password from container env');
  cached = {
    POSTGRES_HOST: '127.0.0.1',
    POSTGRES_PORT: '55433',
    POSTGRES_DB: process.env.A6_TEST_DB || 'ping_orca_a6',
    POSTGRES_USER: env.POSTGRES_USER || 'postgres',
    POSTGRES_PASSWORD: pw,
  };
  return cached;
}

function applyEnv() {
  const e = testPgEnv();
  for (const k of Object.keys(e)) process.env[k] = e[k];
  return e;
}

module.exports = { testPgEnv, applyEnv };
