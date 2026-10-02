'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChildEnv,
  redactSecrets,
  assertNoTokenMaterial,
  AMBIENT_TOKEN_VARS,
} from '../src/credential-boundary.js';

test('ambient token overrides are scrubbed from the child env', () => {
  process.env.COPILOT_GITHUB_TOKEN = 'gho_should_not_survive_1234567890';
  process.env.GH_TOKEN = 'ghp_should_not_survive_1234567890';
  process.env.GITHUB_TOKEN = 'github_pat_should_not_survive_1234567890';
  try {
    const env = buildChildEnv();
    for (const name of AMBIENT_TOKEN_VARS) {
      assert.ok(!(name in env), `${name} must be scrubbed`);
    }
    assert.ok(env.PATH, 'unrelated env vars survive');
  } finally {
    delete process.env.COPILOT_GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
  }
});

test('no token is injected by default; broker state never carries one', () => {
  const env = buildChildEnv();
  assert.ok(!('COPILOT_GITHUB_TOKEN' in env));
});

test('explicit one-spawn token goes to the child env only', () => {
  const env = buildChildEnv({ explicitToken: 'gho_single_spawn_use_only' });
  assert.equal(env.COPILOT_GITHUB_TOKEN, 'gho_single_spawn_use_only');
  const env2 = buildChildEnv();
  assert.ok(!('COPILOT_GITHUB_TOKEN' in env2), 'must not persist across spawns');
});

test('redactSecrets scrubs token-shaped values from captured text', () => {
  const dirty =
    'failed with ghp_abcdefghij1234567890 and COPILOT_GITHUB_TOKEN=secret123 "quoted"';
  const clean = redactSecrets(dirty);
  assert.ok(!clean.includes('ghp_abcdefghij1234567890'));
  assert.ok(!clean.includes('secret123'));
  assert.ok(clean.includes('[REDACTED]'));
  assert.equal(redactSecrets(null), null);
});

test('assertNoTokenMaterial rejects state containing token material', () => {
  assert.ok(assertNoTokenMaterial({ identity_id: 'identity_1', status: 'ACTIVE' }));
  assert.throws(
    () => assertNoTokenMaterial({ identity_id: 'x', note: 'token ghp_abcdefghij1234567890 here' }),
    /credential boundary violated/,
  );
  assert.throws(
    () => assertNoTokenMaterial({ COPILOT_GITHUB_TOKEN: 'x' }),
    /credential boundary violated/,
  );
});
