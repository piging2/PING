// lib.js — shared harness helpers (rendezvous markers, http, timing).
'use strict';
const fs = require('fs');
const http = require('http');

function mark(rendezvous, marker, extra) {
  const line = JSON.stringify({ ts: Date.now(), pid: process.pid, marker, ...(extra || {}) });
  fs.appendFileSync(rendezvous, line + '\n');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function post(base, p, obj, timeoutMs) {
  return httpJson(base, 'POST', p, obj, timeoutMs);
}
function get(base, p, timeoutMs) {
  return httpJson(base, 'GET', p, null, timeoutMs);
}
function httpJson(base, method, p, obj, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(base + p);
    const body = obj ? JSON.stringify(obj) : null;
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search,
      method, headers: body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {},
    }, (res) => {
      let b = '';
      res.on('data', c => { b += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null }); }
        catch (e) { reject(new Error('bad json: ' + b.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    if (timeoutMs) { req.setTimeout(timeoutMs, () => { req.destroy(new Error('http timeout')); }); }
    if (body) req.write(body);
    req.end();
  });
}

// Read new lines appended to a file since offset.
function readNew(file, offset) {
  const st = fs.statSync(file);
  if (st.size <= offset) return { lines: [], offset };
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(st.size - offset);
  fs.readSync(fd, buf, 0, buf.length, offset);
  fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  return { lines, offset: st.size };
}

// Wait for a marker in the rendezvous file, polling at intervalMs (<=5ms required).
async function waitMarker(file, marker, timeoutMs, intervalMs) {
  intervalMs = intervalMs || 5;
  let offset = 0;
  try { offset = fs.statSync(file).size; } catch (e) { /* not created yet */ }
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    let r;
    try { r = readNew(file, offset); } catch (e) { await sleep(intervalMs); continue; }
    offset = r.offset;
    for (const l of r.lines) if (l.marker === marker) return l;
    await sleep(intervalMs);
  }
  return null;
}

// Wait for the n-th occurrence (1-based) of a marker.
async function waitMarkerNth(file, marker, n, timeoutMs, intervalMs) {
  intervalMs = intervalMs || 5;
  let offset = 0;
  try { offset = fs.statSync(file).size; } catch (e) { /* not created yet */ }
  let seen = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    let r;
    try { r = readNew(file, offset); } catch (e) { await sleep(intervalMs); continue; }
    offset = r.offset;
    for (const l of r.lines) if (l.marker === marker && ++seen >= n) return l;
    await sleep(intervalMs);
  }
  return null;
}

module.exports = { mark, sleep, post, get, readNew, waitMarker, waitMarkerNth };
