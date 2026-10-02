#!/usr/bin/env node
'use strict';
/**
 * baselines.cjs — Lane B2 processor tournament, deterministic baseline runner.
 * READ ONLY against production. Runs the ACTUAL baseline functions on replay
 * cases fed as JSON on stdin; prints one JSON result per case on stdout.
 * Reconcile-gate cases use fresh os.tmpdir() evidence dirs only (never
 * production evidence dirs). Runtime profile overrides for authorizeWorkOrder
 * cases are in-process only and recorded as case evidence.
 *
 * Case envelope: {contract, id, input, evidence, overrides}
 * Output: {id, contract, output, baseline_ms, input_digest, evidence_digest, error}
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ORCA = '/home/hatch/workspace/orca-adapter';
const vendor = require(ORCA + '/vendor/external_agent_adapter.js');
const adapter = require(ORCA + '/adapter.js');
const PL = '/home/hatch/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src';

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const canon = (o) => JSON.stringify(o); // inputs are already ordered literals

function nowIso() { return new Date().toISOString(); }

async function runAuthorize(c) {
  // In-process-only profile overrides (recorded as case evidence). Files untouched.
  const originals = {};
  if (c.overrides && c.overrides.profiles) {
    for (const [k, v] of Object.entries(c.overrides.profiles)) {
      originals[k] = (k in vendor.AGENT_PROFILES) ? { ...vendor.AGENT_PROFILES[k] } : null;
      if (v === null) delete vendor.AGENT_PROFILES[k];
      else vendor.AGENT_PROFILES[k] = v;
    }
  }
  const agentId = c.input.agentId;
  const profileFacts = vendor.AGENT_PROFILES[agentId] ? { ...vendor.AGENT_PROFILES[agentId] } : null;
  const t0 = process.hrtime.bigint();
  let r;
  try {
    r = vendor.authorizeWorkOrder(c.input);
  } finally {
    if (c.overrides && c.overrides.profiles) {
      for (const k of Object.keys(c.overrides.profiles)) {
        if (originals[k] === null) delete vendor.AGENT_PROFILES[k];
        else vendor.AGENT_PROFILES[k] = originals[k];
      }
    }
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return {
    output: r.granted ? 'GRANT' : 'DENY',
    reason: r.reason || null,
    evidence_used: { profileFacts, profilesOverridden: Object.keys(c.overrides?.profiles || {}) },
    baseline_ms: ms,
  };
}

async function runGrants(c, mods) {
  const m = mods.grants || (mods.grants = await import(PL + '/lib/ping/grants.ts'));
  const t0 = process.hrtime.bigint();
  const r = m.grantsForViewer(c.input);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { output: r, baseline_ms: ms };
}

async function runPlanActions(c, mods) {
  const m = mods.planner || (mods.planner = await import(PL + '/lib/ping/action-planner.ts'));
  const t0 = process.hrtime.bigint();
  const r = m.planActions(c.input);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { output: { capabilities: r.capabilities, viewerIsOwner: r.viewerIsOwner }, baseline_ms: ms };
}

async function runClassify(c, mods) {
  const m = mods.clf || (mods.clf = await import(PL + '/lib/sentiment/classifier.ts'));
  const t0 = process.hrtime.bigint();
  const r = m.classifyReview(c.input.text, c.input.rating);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return {
    output: r.bucket,
    detail: { sentiment: r.sentiment, confidence: r.confidence, hasProfanity: r.hasProfanity, hasSpam: r.hasSpam, hasQuestion: r.hasQuestion, compoundScore: r.compoundScore },
    baseline_ms: ms,
  };
}

function runReconcile(c) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b2-rg-'));
  const ex = c.input.execution, input = c.input.input, tenant = c.input.tenant_id, cap = c.input.capability;
  const key = adapter.idempotencyKeyFor({ execution: ex, input, tenant_id: tenant, capability: cap });
  const idxPath = path.join(dir, adapter.IDEMPOTENCY_INDEX);
  const seed = c.evidence && c.evidence.seed_records;
  if (seed === '__CORRUPT__') {
    fs.writeFileSync(idxPath, '{"not json at all\n', 'utf8');
  } else if (Array.isArray(seed)) {
    const lines = seed.map((r) => JSON.stringify({ ...r, idempotency_key: key, at: r.at || nowIso() })).join('\n') + '\n';
    fs.writeFileSync(idxPath, lines, 'utf8');
  }
  const t0 = process.hrtime.bigint();
  const r = adapter.reconcileGate({ evidenceDir: dir, execution: ex, input, tenant_id: tenant, capability: cap, reconciliation: c.input.reconciliation ?? null });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  // leave the tmp dir on disk for replay (evidence), record path
  return {
    output: r.allowed ? 'ALLOW' : 'REFUSE',
    reason: r.allowed ? null : (r.refusal && r.refusal.reason),
    reconciliationAccepted: r.reconciliationAccepted || false,
    evidence_dir: dir,
    baseline_ms: ms,
  };
}

async function main() {
  const raw = fs.readFileSync(0, 'utf8');
  const cases = JSON.parse(raw);
  const mods = {};
  const out = [];
  for (const c of cases) {
    const rec = { id: c.id, contract: c.contract };
    try {
      let r;
      if (c.contract === 'mc.authorize_work_order/v1') r = await runAuthorize(c);
      else if (c.contract === 'grantsForViewer/v1') r = await runGrants(c, mods);
      else if (c.contract === 'planActions/v1') r = await runPlanActions(c, mods);
      else if (c.contract === 'classifyReview/v1') r = await runClassify(c, mods);
      else if (c.contract === 'reconcileGate/v1') r = runReconcile(c);
      else throw new Error('unknown contract ' + c.contract);
      rec.output = r.output;
      rec.detail = r.detail || null;
      rec.reason = r.reason === undefined ? null : r.reason;
      rec.extra = {};
      for (const k of ['reconciliationAccepted', 'evidence_dir', 'evidence_used']) if (r[k] !== undefined) rec.extra[k] = r[k];
      rec.baseline_ms = r.baseline_ms;
      rec.input_digest = sha256(canon(c.input)).slice(0, 16);
      rec.evidence_digest = sha256(canon(c.evidence || null)).slice(0, 16);
      rec.error = null;
    } catch (e) {
      rec.output = null; rec.detail = null; rec.reason = null; rec.extra = {};
      rec.baseline_ms = null;
      rec.input_digest = sha256(canon(c.input)).slice(0, 16);
      rec.evidence_digest = sha256(canon(c.evidence || null)).slice(0, 16);
      rec.error = String(e && e.message || e);
    }
    out.push(rec);
  }
  process.stdout.write(JSON.stringify(out) + '\n');
}

main().catch((e) => { console.error('FATAL ' + (e && e.message)); process.exit(1); });
