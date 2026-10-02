'use strict';
//
// Post-authorization finalizer. Runs AFTER the human completes `copilot login`.
// Zero AI generation: only auth status, quota query, and model discovery.
// Writes state/identities.json marking the given identity (default identity_1)
// ACTIVE with the live quota snapshot. Non-secret metadata only.
// snapshot. Never handles token material.

import { CopilotClient } from '@github/copilot-sdk';
import { loadStore, createIdentity, markAuthorized } from '../src/identity-state.js';
import { applyQuotaSnapshot } from '../src/quota-model.js';

function pickQuotaNumbers(quotaValue) {
  if (!quotaValue || typeof quotaValue !== 'object') return null;
  const flat = JSON.stringify(quotaValue);
  // Direct remaining field (legacy shape)
  let remainingMatch = flat.match(/"remaining"\s*:\s*(\d+)/);
  let remaining = remainingMatch ? Number(remainingMatch[1]) : null;
  // entitlementRequests/usedRequests shape (current API): remaining = entitlement - used
  if (remaining === null) {
    const entMatch = flat.match(/"entitlementRequests"\s*:\s*(\d+)/);
    const usedMatch = flat.match(/"usedRequests"\s*:\s*(\d+)/);
    if (entMatch) {
      const ent = Number(entMatch[1]);
      const used = usedMatch ? Number(usedMatch[1]) : 0;
      remaining = Math.max(0, ent - used);
    }
  }
  const resetMatch = flat.match(/"resetDate"\s*:\s*"([^"]+)"|"reset_at"\s*:\s*"([^"]+)"|"resetAt"\s*:\s*"([^"]+)"/);
  const resetAt = resetMatch ? resetMatch[1] || resetMatch[2] || resetMatch[3] : null;
  return { remaining, resetAt };
}

const client = new CopilotClient();
await client.start();

let auth;
try {
  auth = await client.getAuthStatus();
} catch (err) {
  console.error('FAIL: getAuthStatus did not succeed:', String(err.message || err).slice(0, 200));
  process.exit(1);
}
const authStr = JSON.stringify(auth);
const loginMatch = authStr.match(/"login"\s*:\s*"([^"]+)"/);
const github_login = loginMatch ? loginMatch[1] : null;

let quotaValue = null;
try {
  quotaValue = await client.rpc.account.getQuota({});
} catch (err) {
  console.error('FAIL: account.getQuota did not succeed:', String(err.message || err).slice(0, 200));
  process.exit(1);
}

let modelCount = null;
try {
  const models = await client.listModels();
  modelCount = Array.isArray(models) ? models.length : null;
} catch {
  modelCount = null;
}

await client.stop().catch(() => {});

const IDENTITY_ID = process.argv[2] || 'identity_1';

const snapshot = pickQuotaNumbers(quotaValue);
const store = loadStore();
let identity = store.get(IDENTITY_ID) || createIdentity(IDENTITY_ID);
markAuthorized(identity, { github_login });
if (snapshot) {
  applyQuotaSnapshot(identity, {
    remaining: snapshot.remaining,
    resetAt: snapshot.resetAt,
  });
}
store.put(identity);

console.log('AUTHORIZED');
console.log(`identity_id: ${IDENTITY_ID}`);
console.log(`github_login: ${github_login || '(not reported)'}`);
console.log(`quota_remaining: ${identity.quota_remaining}`);
console.log(`quota_reset_at: ${identity.quota_reset_at}`);
console.log(`models_discovered: ${modelCount}`);
console.log('status: ACTIVE');
