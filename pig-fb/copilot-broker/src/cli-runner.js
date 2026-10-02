'use strict';
//
// CLI runner: spawn `copilot -p` with --output-format json and a per-task
// --max-ai-credits ceiling, parse the JSONL stream, return an ExecutionResult.
//
// --max-ai-credits is a SOFT ceiling (the CLI documents it can overshoot).
// The record keeps requested_credit_ceiling and actual_reported_usage as two
// separate fields and never conflates them.

import { spawn } from 'node:child_process';
import { classifyStream } from './jsonl-classifier.js';
import { buildChildEnv, redactSecrets } from './credential-boundary.js';

function defaultSpawn(cmd, args, opts) {
  return spawn(cmd, args, opts);
}

// opts: { prompt, workdir, maxAiCredits, model?, timeoutMs?, env?, spawnFn? }
export async function runCopilotTask(opts) {
  const {
    prompt,
    workdir,
    maxAiCredits,
    model = null,
    timeoutMs = 300_000,
    env = null,
    spawnFn = defaultSpawn,
  } = opts;
  if (!prompt || typeof prompt !== 'string') throw new Error('prompt is required');
  if (!workdir) throw new Error('workdir is required');
  if (!Number.isFinite(maxAiCredits) || maxAiCredits <= 0) {
    throw new Error('maxAiCredits must be a positive number (soft per-task ceiling)');
  }

  // 2026-09-25: --allow-all-tools granted. Root-caused: in non-interactive -p
  // mode there is no user to confirm tool permissions, so every write/exec
  // call auto-denied ("Permission denied and could not request permission
  // from user"). Conservative boundary remains: disposable worktree cwd per
  // task, per-task --max-ai-credits ceiling, timeout, prompts authored by us.
  // Scoped --allow-tool list possible later; tool names not enumerated
  // without CLI reference, so the proven flag ships now (Nolan's order).
  const args = ['-p', prompt, '--output-format', 'json', '--max-ai-credits', String(maxAiCredits), '--allow-all-tools'];
  if (model) args.push('--model', model);

  const startedAt = new Date().toISOString();
  const childEnv = env || buildChildEnv();

  return new Promise((resolve) => {
    const child = spawnFn('copilot', args, { cwd: workdir, env: childEnv });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        status: 'SPAWN_ERROR',
        classification: 'TOOL_FAILURE',
        classification_source: 'spawn error, not the JSONL stream',
        requested_credit_ceiling: maxAiCredits,
        actual_reported_usage: null,
        result_text: null,
        model,
        timed_out: false,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        spawn_error: redactSecrets(String(err && err.message ? err.message : err)),
        stderr_tail: null,
        event_summary: null,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const lines = stdout.split('\n');
      const parsed = classifyStream(lines, timedOut ? null : code);
      resolve({
        status: timedOut ? 'TIMEOUT' : 'COMPLETED',
        classification: timedOut ? 'TEMPORARY_FAILURE' : parsed.classification,
        classification_source: 'jsonl event stream',
        requested_credit_ceiling: maxAiCredits,
        actual_reported_usage: parsed.usage, // null when the stream reports none
        result_text: parsed.resultText,
        model,
        timed_out: timedOut,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        spawn_error: null,
        stderr_tail: redactSecrets(stderr.slice(-2000)) || null,
        event_summary: {
          terminal_signals: parsed.signals.terminal,
          transient_signals: parsed.signals.transient,
          saw_result: parsed.signals.sawResult,
          result_exit_code: parsed.signals.resultExitCode,
          stream_exit_code: timedOut ? null : code,
        },
      });
    });
  });
}
