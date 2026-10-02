#!/usr/bin/env node
'use strict';
/**
 * ORCA-D U1 experiment driver (runs on the Pig, WSL node).
 * Replicates vendor-orca_control_loop.js dispatchHermes timeout mechanics:
 *   spawn(WIN_PY, [dispatcher, prompt, resultPath, metadata])
 *   setTimeout(KILL_AFTER_MS) -> child.kill('SIGKILL') -> timedOut=true
 *   then collect the rendezvous drop if present.
 *
 * Reports: dispatcher killed? orphan worker marker present? (survived +
 * completed after the timeout classification) rendezvous drop present?
 * worker's stdout_write state? (pipe death evidence)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const DIR = __dirname;
const WIN_PY = '/mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe';
const KILL_AFTER_MS = parseInt(process.env.U1_KILL_AFTER_MS || '2500', 10);
const NO_KILL = process.env.U1_NO_KILL === '1';
const TOTAL_WAIT_MS = parseInt(process.env.U1_TOTAL_WAIT_MS || '11000', 10);

const mode = process.env.U1_MODE || 'normal';
const attempt = 'u1-' + mode + '-' + Date.now().toString(36);
// Marker dir must be visible to BOTH the WSL driver and the Windows worker:
// use C:\Windows\Temp (Windows form for the worker, /mnt/c form for WSL).
const markerDirWin = 'C:\\Windows\\Temp\\u1-markers-' + attempt;
const markerDirWsl = '/mnt/c/Windows/Temp/u1-markers-' + attempt;
fs.mkdirSync(markerDirWsl, { recursive: true });
const resultPath = 'C:\\Windows\\Temp\\u1-rendezvous-' + attempt + '.json';
const resultPathWsl = '/mnt/c/Windows/Temp/u1-rendezvous-' + attempt + '.json';
const promptPath = 'C:\\Windows\\Temp\\u1-prompt-' + attempt + '.txt';
const promptPathWsl = '/mnt/c/Windows/Temp/u1-prompt-' + attempt + '.txt';
const dispatcher = 'C:\\Windows\\Temp\\u1-dispatcher-stub.py';

fs.writeFileSync(promptPathWsl, 'u1 experiment prompt', 'utf8');
const metadata = JSON.stringify({ attempt_id: attempt, work_order_id: 'wo-u1', objective_id: 'obj-u1' });
// NOTE: custom env does NOT cross the WSL node -> Windows spawn boundary
// (proven by u1-env-probe.js), so all parameters travel via argv.
const workerSleep = process.env.U1_WORKER_SLEEP || (mode === 'slow-exit' ? '1' : '6');

const startedAt = Date.now();
const child = spawn(WIN_PY,
  [dispatcher, promptPath, resultPath, metadata, markerDirWin, mode, String(workerSleep)],
  { stdio: ['ignore', 'pipe', 'pipe'] });
const pid = child.pid;
let stdout = '';
child.stdout.on('data', (d) => { stdout += d.toString('utf8'); });

const outcome = { timedOut: false, signal: null, exitCode: null };
const done = new Promise((resolve) => {
  let timer = null;
  if (!NO_KILL) {
    timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      outcome.timedOut = true;
      outcome.signal = 'SIGKILL';
    }, KILL_AFTER_MS);
  }
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    if (!outcome.timedOut) { outcome.exitCode = code; outcome.signal = signal || null; }
    resolve();
  });
});

(async () => {
  await done;
  const killedAt = Date.now() - startedAt;
  // collect rendezvous (verbatim loop semantics: exists -> would be collected)
  const dropPresent = fs.existsSync(resultPathWsl);
  // mid-window liveness probe: is the orphan worker PID alive on Windows?
  // (checked at ~kill+1.5s, before its 6s sleep elapses)
  // mid-window liveness probe: ask Windows itself whether the orphan worker
  // pid is alive (os.kill(pid,0) in the Windows pid namespace), ~1.5s after
  // the dispatcher kill and before the worker's 6s sleep elapses.
  let orphanAliveMid = null;
  let workerPid = null;
  try {
    const startedMarker = path.join(markerDirWsl, 'u1-worker-started-' + attempt + '.marker');
    // the started marker may not exist yet at kill time (slow worker spawn);
    // poll briefly for it.
    for (let i = 0; i < 10 && !fs.existsSync(startedMarker); i++) {
      await new Promise((r) => setTimeout(r, 300));
    }
    if (fs.existsSync(startedMarker)) {
      workerPid = JSON.parse(fs.readFileSync(startedMarker, 'utf8')).worker_pid;
      const probeCode = 'import os,sys,json\n'
        + 'pid=int(sys.argv[1])\n'
        + 'alive=True\n'
        + 'try:\n    os.kill(pid,0)\n'
        + 'except OSError:\n    alive=False\n'
        + 'open(sys.argv[2],"w").write(json.dumps({"wpid":pid,"alive":alive}))\n';
      const probeOut = markerDirWsl + '/u1-probe-' + attempt + '.json';
      await new Promise((resolve) => {
        const p = spawn(WIN_PY, ['-c', probeCode, String(workerPid), markerDirWin + '\\u1-probe-' + attempt + '.json'], { stdio: 'ignore' });
        p.on('close', resolve);
      });
      if (fs.existsSync(probeOut)) orphanAliveMid = JSON.parse(fs.readFileSync(probeOut, 'utf8')).alive;
    }
  } catch (_) {}
  // wait for the orphan window to elapse
  await new Promise((r) => setTimeout(r, TOTAL_WAIT_MS - killedAt));
  const markerPath = path.join(markerDirWsl, 'u1-worker-finished-' + attempt + '.marker');
  const markerPresent = fs.existsSync(markerPath);
  let marker = null;
  if (markerPresent) marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  // cleanup temp artifacts (keep markers dir for inspection)
  if (process.env.U1_KEEP_ARTIFACTS !== '1') {
    for (const f of [promptPathWsl, resultPathWsl]) { try { fs.unlinkSync(f); } catch (_) {} }
  } else {
    console.log('ARTIFACTS KEPT: markerDir=' + markerDirWsl + ' drop=' + resultPathWsl);
  }

  console.log(JSON.stringify({
    mode, attempt, dispatcherPid: pid,
    killedAtMs: killedAt, timedOut: outcome.timedOut,
    dropPresentAfterKill: dropPresent,
    workerPid,
    orphanAliveMidWindow: orphanAliveMid,
    orphanWorkerMarkerPresent: markerPresent,
    workerStdoutWrite: marker && marker.stdout_write,
  }, null, 2));
})();
