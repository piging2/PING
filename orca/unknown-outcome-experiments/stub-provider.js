// stub-provider.js — queryable fake external effect provider (TEST INFRASTRUCTURE).
// Observable stages: accepted vs receipt_delivered. Commit log persisted to JSONL.
// AMNESIA mode: accepts the dispatch (worker sees accepted) but then loses the
// record, so query() can no longer prove the outcome.
// Gates: dispatch / receipt / query responses can be held open to widen kill windows.
// The stub is NEVER killed; it simulates the external world, which survives our crashes.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '18311', 10);
const LOG_FILE = process.argv[3] || path.join(__dirname, 'stub-commit-log.jsonl');

// in-memory truth: opKey -> {accepted, receiptDelivered, outcome, proof, count, amnesia}
const state = new Map();
// pending held responses: `${opKey}:${name}` -> [{req, res}]
const held = new Map();

function appendLog(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify({ ts: Date.now(), ...entry }) + '\n');
}

function get(opKey) {
  if (!state.has(opKey)) state.set(opKey, { accepted: false, receiptDelivered: false, outcome: null, proof: 'none', count: 0, amnesia: false });
  return state.get(opKey);
}

function holdKey(opKey, name) { return opKey + ':' + name; }

function maybeHold(opKey, name, req, res, respond) {
  const cfg = get(opKey);
  if (cfg['hold_' + name]) {
    const k = holdKey(opKey, name);
    if (!held.has(k)) held.set(k, []);
    held.get(k).push({ req, res, respond });
    req.on('close', () => {
      const arr = held.get(k) || [];
      const i = arr.findIndex(p => p.res === res);
      if (i >= 0) arr.splice(i, 1);
    });
    return true;
  }
  respond();
  return false;
}

function release(opKey, name) {
  const k = holdKey(opKey, name);
  const arr = held.get(k) || [];
  held.set(k, []);
  for (const p of arr) { try { p.respond(); } catch (e) { /* worker died */ } }
  return arr.length;
}

function body(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => { b += c; });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/configure') {
      const b = await body(req);
      const s = get(b.opKey);
      for (const k of ['hold_dispatch', 'hold_receipt', 'hold_query', 'receiptMode', 'outcome', 'amnesia', 'receiptDelayMs']) {
        if (b[k] !== undefined) s[k] = b[k];
      }
      if (s.receiptMode == null) s.receiptMode = 'inline';
      if (s.outcome == null) s.outcome = 'success';
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && u.pathname === '/dispatch') {
      const b = await body(req);
      const s = get(b.opKey);
      // The external effect executes HERE (accepted = provider committed).
      s.accepted = true;
      s.proof = 'record';
      s.count += 1;
      appendLog({ event: 'effect_executed', opKey: b.opKey, count: s.count });
      const respond = () => {
        if (s.amnesia) {
          // Record lost AFTER acceptance: provider can no longer prove anything.
          appendLog({ event: 'record_lost', opKey: b.opKey });
          s.accepted = false; s.receiptDelivered = false; s.outcome = null; s.proof = 'none';
          return json(res, 200, { accepted: true, receiptPending: s.receiptMode === 'separate' });
        }
        if (s.receiptMode === 'inline') {
          s.receiptDelivered = true;
          appendLog({ event: 'receipt_delivered', opKey: b.opKey });
          return json(res, 200, { accepted: true, receipt: { opKey: b.opKey, outcome: s.outcome } });
        }
        return json(res, 200, { accepted: true, receiptPending: true });
      };
      if (maybeHold(b.opKey, 'dispatch', req, res, respond)) return;
      return;
    }
    if (req.method === 'POST' && u.pathname === '/receipt') {
      const b = await body(req);
      const s = get(b.opKey);
      const respond = () => {
        if (!s.accepted && s.proof === 'none') return json(res, 404, { error: 'no record' });
        s.receiptDelivered = true;
        appendLog({ event: 'receipt_delivered', opKey: b.opKey });
        return json(res, 200, { receipt: { opKey: b.opKey, outcome: s.outcome } });
      };
      const delayed = () => {
        if (s.receiptDelayMs) return setTimeout(() => respond(), s.receiptDelayMs);
        return respond();
      };
      if (maybeHold(b.opKey, 'receipt', req, res, delayed)) return;
      return;
    }
    if (req.method === 'GET' && u.pathname === '/query') {
      const opKey = u.searchParams.get('opKey');
      const s = get(opKey);
      const respond = () => json(res, 200, {
        accepted: s.proof === 'record' ? s.accepted : null,
        receiptDelivered: s.proof === 'record' ? s.receiptDelivered : null,
        outcome: s.proof === 'record' ? s.outcome : null,
        proof: s.proof,
      });
      if (maybeHold(opKey, 'query', req, res, respond)) return;
      return;
    }
    if (req.method === 'POST' && (u.pathname === '/release' || u.pathname === '/gate')) {
      const b = await body(req);
      if (u.pathname === '/release') return json(res, 200, { released: release(b.opKey, b.name) });
      const s = get(b.opKey);
      s['hold_' + b.name] = !!b.hold;
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET' && u.pathname === '/log') {
      const out = [];
      for (const [opKey, s] of state) out.push({ opKey, ...s });
      return json(res, 200, { entries: out });
    }
    if (req.method === 'GET' && u.pathname === '/health') return json(res, 200, { ok: true });
    return json(res, 404, { error: 'not found' });
  } catch (e) {
    return json(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(JSON.stringify({ stub: 'up', port: PORT }));
});
