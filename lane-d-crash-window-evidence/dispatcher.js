'use strict';
// LANE-D TEST-ONLY dispatcher: spawns the mid-flight executor, records the
// executor pid to a pidfile, then idles WITHOUT writing any rendezvous
// result — the crash-window under test (dispatcher dies, result lost).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const scratch = process.argv[2];
const marker = process.argv[3];
const worker = spawn(process.execPath, [path.join(__dirname, 'worker-midflight.js'), marker], { stdio: 'ignore' });
fs.writeFileSync(path.join(scratch, 'worker.pid'), String(worker.pid), 'utf8');
worker.on('exit', () => { setInterval(() => {}, 1000); });
worker.on('error', () => { setInterval(() => {}, 1000); });
setInterval(() => {}, 1000); // idle: never write a rendezvous
