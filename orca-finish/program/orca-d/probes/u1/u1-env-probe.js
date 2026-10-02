#!/usr/bin/env node
'use strict';
// Diagnostic: does a custom env var survive WSL node spawn -> Windows python?
const { spawn } = require('child_process');
const WIN_PY = '/mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe';
const env = Object.assign({}, process.env, { U1_PROBE_VAR: 'hello-from-wsl-node' });
const p = spawn(WIN_PY, ['-c', 'import os; print("U1_PROBE_VAR=" + str(os.environ.get("U1_PROBE_VAR")))'], { env });
p.stdout.on('data', (d) => process.stdout.write('STDOUT: ' + d));
p.stderr.on('data', (d) => process.stdout.write('STDERR: ' + d));
p.on('close', (c) => console.log('close code=' + c));
