'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCopilotTask } from '../src/cli-runner.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

// Fake child_process.spawn: emits canned stdout lines, then closes.
function fakeSpawnFactory(stdoutLines, exitCode) {
  const seen = { cmd: null, args: null, opts: null };
  function spawnFn(cmd, args, opts) {
    seen.cmd = cmd;
    seen.args = args;
    seen.opts = opts;
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    setImmediate(() => {
      for (const line of stdoutLines) child.stdout.emit('data', Buffer.from(line + '\n'));
      child.emit('close', exitCode);
    });
    return child;
  }
  return { spawnFn, seen };
}

test('per-task ceiling propagates as --max-ai-credits; stream classified', async () => {
  const lines = readFileSync(join(FIXTURES, 'exhausted.jsonl'), 'utf8').split('\n');
  const { spawnFn, seen } = fakeSpawnFactory(lines, 1);
  const out = await runCopilotTask({
    prompt: 'do work',
    workdir: '/tmp',
    maxAiCredits: 75,
    spawnFn,
  });
  assert.equal(seen.cmd, 'copilot');
  const i = seen.args.indexOf('--max-ai-credits');
  assert.ok(i >= 0, '--max-ai-credits must be passed');
  assert.equal(seen.args[i + 1], '75');
  assert.ok(seen.args.includes('--output-format'));
  assert.equal(seen.args[seen.args.indexOf('--output-format') + 1], 'json');
  assert.equal(out.classification, 'EXHAUSTED');
  assert.equal(out.requested_credit_ceiling, 75);
  assert.equal(out.classification_source, 'jsonl event stream');
});

test('success path carries usage separately from ceiling', async () => {
  const { spawnFn } = fakeSpawnFactory(
    ['{"type":"result","exitCode":0,"result":"ok","usage":{"total":7}}'],
    0,
  );
  const out = await runCopilotTask({ prompt: 'x', workdir: '/tmp', maxAiCredits: 75, spawnFn });
  assert.equal(out.classification, 'SUCCESS');
  assert.equal(out.requested_credit_ceiling, 75);
  assert.deepEqual(out.actual_reported_usage, { total: 7 });
  assert.equal(out.result_text, 'ok');
});

test('spawned env never carries ambient token overrides', async () => {
  process.env.GH_TOKEN = 'ghp_testtoken1234567890';
  const { spawnFn, seen } = fakeSpawnFactory(['{"type":"result","exitCode":0}'], 0);
  try {
    await runCopilotTask({ prompt: 'x', workdir: '/tmp', maxAiCredits: 10, spawnFn });
  } finally {
    delete process.env.GH_TOKEN;
  }
  assert.ok(!('GH_TOKEN' in seen.opts.env));
  assert.ok(!('GITHUB_TOKEN' in seen.opts.env));
  assert.ok(!('COPILOT_GITHUB_TOKEN' in seen.opts.env));
});

test('missing ceiling is rejected; ceiling is mandatory', async () => {
  const { spawnFn } = fakeSpawnFactory([], 0);
  await assert.rejects(
    runCopilotTask({ prompt: 'x', workdir: '/tmp', spawnFn }),
    /maxAiCredits must be a positive number/,
  );
});

test('stderr is redacted in the result', async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  const spawnFn = () => {
    setImmediate(() => {
      child.stderr.emit('data', Buffer.from('oops ghp_abcdefghij1234567890 leaked\n'));
      child.emit('close', 1);
    });
    return child;
  };
  const out = await runCopilotTask({ prompt: 'x', workdir: '/tmp', maxAiCredits: 10, spawnFn });
  assert.ok(!String(out.stderr_tail).includes('ghp_abcdefghij1234567890'));
});
