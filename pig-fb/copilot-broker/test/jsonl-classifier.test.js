'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyStream, isRetryable, CLASSIFICATIONS } from '../src/jsonl-classifier.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
function lines(name) {
  return readFileSync(join(FIXTURES, name), 'utf8').split('\n');
}

test('all eight classifications are covered by fixtures', () => {
  const expected = {
    'success.jsonl': 'SUCCESS',
    'exhausted.jsonl': 'EXHAUSTED',
    'rate_limited.jsonl': 'RATE_LIMITED',
    'auth_failed.jsonl': 'AUTH_FAILED',
    'temporary.jsonl': 'TEMPORARY_FAILURE',
    'policy_blocked.jsonl': 'POLICY_BLOCKED',
    'tool_failure.jsonl': 'TOOL_FAILURE',
    'unknown.jsonl': 'UNKNOWN',
  };
  const exitFor = { 'success.jsonl': 0, 'unknown.jsonl': null };
  for (const [file, want] of Object.entries(expected)) {
    const exitCode = file in exitFor ? exitFor[file] : 1;
    const got = classifyStream(lines(file), exitCode).classification;
    assert.equal(got, want, file);
  }
  assert.deepEqual([...CLASSIFICATIONS].sort(), Object.values(expected).sort());
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.jsonl'));
  assert.equal(files.length, 8, 'exactly one fixture per classification');
});

test('402/quota is never confused with 429/rate_limit', () => {
  const exhausted = classifyStream(lines('exhausted.jsonl'), 1);
  assert.equal(exhausted.classification, 'EXHAUSTED');
  assert.ok(!isRetryable('EXHAUSTED'));
  const limited = classifyStream(lines('rate_limited.jsonl'), 1);
  assert.equal(limited.classification, 'RATE_LIMITED');
  assert.ok(isRetryable('RATE_LIMITED'));
});

test('retry policy: only rate_limited and temporary_failure', () => {
  assert.ok(isRetryable('TEMPORARY_FAILURE'));
  for (const c of ['SUCCESS', 'EXHAUSTED', 'AUTH_FAILED', 'POLICY_BLOCKED', 'TOOL_FAILURE', 'UNKNOWN']) {
    assert.ok(!isRetryable(c), c);
  }
});

test('unknown stays unknown: no blind retry, no invented signal', () => {
  const r = classifyStream([], null);
  assert.equal(r.classification, 'UNKNOWN');
  const garbage = classifyStream(['{{{', '', '   '], null);
  assert.equal(garbage.classification, 'UNKNOWN');
});

test('exit code alone never decides: exit 1 without signal is TOOL_FAILURE', () => {
  const r = classifyStream(['{"type":"assistant","message":"x"}'], 1);
  assert.equal(r.classification, 'TOOL_FAILURE');
});

test('usage and result text are extracted when present', () => {
  const r = classifyStream([
    '{"type":"assistant","usage":{"total":12}}',
    '{"type":"result","exitCode":0,"result":"hello world"}',
  ], 0);
  assert.equal(r.classification, 'SUCCESS');
  assert.deepEqual(r.usage, { total: 12 });
  assert.equal(r.resultText, 'hello world');
});

test('transient rate_limit that recovers to success stays SUCCESS', () => {
  const r = classifyStream([
    '{"type":"session.error","error":{"errorType":"rate_limit"}}',
    '{"type":"result","exitCode":0,"result":"ok"}',
  ], 0);
  assert.equal(r.classification, 'SUCCESS');
  assert.deepEqual(r.signals.transient, ['RATE_LIMITED']);
});
