#!/usr/bin/env node
'use strict';
// Standalone Windows pid liveness probe: argv[2] = pid to check.
const { spawn } = require('child_process');
const WIN_PY = '/mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe';
const pid = process.argv[2];
const code = 'import os,sys,json\n'
  + 'pid=int(sys.argv[1])\n'
  + 'alive=True\n'
  + 'try:\n    os.kill(pid,0)\n'
  + 'except OSError:\n    alive=False\n'
  + 'print(json.dumps({"wpid":pid,"alive":alive}))\n';
const p = spawn(WIN_PY, ['-c', code, String(pid)], { stdio: ['ignore', 'pipe', 'pipe'] });
p.stdout.on('data', (d) => process.stdout.write('PROBE-OUT: ' + d));
p.stderr.on('data', (d) => process.stdout.write('PROBE-ERR: ' + d));
p.on('close', (c) => console.log('probe exit=' + c));
p.on('error', (e) => console.log('probe spawn error: ' + e.message));
