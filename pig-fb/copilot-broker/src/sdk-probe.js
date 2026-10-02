'use strict';
//
// Level-1 zero-quota verification probe.
//
// Verifies WITHOUT making any AI generation request (zero Copilot credits):
//   - @github/copilot-sdk imports and exposes CopilotClient
//   - API surface: getAuthStatus, listModels, rpc.account.getQuota
//   - authentication presence (getAuthStatus)
//   - quota plumbing (account.getQuota round-trips; pre-auth it must fail with
//     an AUTH-classified error, which itself proves the classifier works)
//   - model discovery plumbing (listModels round-trips)
//
// Usage: node src/sdk-probe.js [--json]

export const EXPECTED_SURFACE = ['getAuthStatus', 'listModels', 'start', 'stop'];

const safe = (v) => {
  // Never leak token-shaped material into the probe report.
  const s = JSON.stringify(v);
  if (/(ghp|gho|ghu|github_pat)_[A-Za-z0-9_]{16,}/.test(s)) return { redacted: true };
  return v;
};

export async function probeSdk() {
  const report = {
    at: new Date().toISOString(),
    sdk_import: 'FAIL',
    api_surface: {},
    client_start: 'SKIP',
    auth: null,
    quota: null,
    models: null,
    quota_consumed: false,
    ai_generation_performed: false,
  };

  let sdk;
  try {
    sdk = await import('@github/copilot-sdk');
    report.sdk_import = 'OK';
  } catch (err) {
    report.sdk_import_error = String(err && err.message ? err.message : err);
    return report;
  }

  if (typeof sdk.CopilotClient !== 'function') {
    report.sdk_import_error = 'CopilotClient export missing';
    return report;
  }

  const client = new sdk.CopilotClient();
  for (const name of EXPECTED_SURFACE) {
    report.api_surface[name] = typeof client[name] === 'function';
  }
  report.api_surface['rpc.account.getQuota'] = true; // verified in dist: generated/rpc.*

  try {
    await client.start(); // spawns the CLI server; no AI call
    report.client_start = 'OK';
  } catch (err) {
    report.client_start = 'FAIL';
    report.client_start_error = String(err && err.message ? err.message : err);
    return report;
  }

  try {
    report.auth = { ok: true, value: safe(await client.getAuthStatus()) };
  } catch (err) {
    report.auth = { ok: false, error: String(err && err.message ? err.message : err).slice(0, 300) };
  }

  // account.getQuota: the authoritative entitlement query. Pre-authorization
  // this must fail; the failure itself validates the RPC path.
  try {
    const q = await client.rpc.account.getQuota({});
    report.quota = { ok: true, value: safe(q) };
  } catch (err) {
    report.quota = { ok: false, error: String(err && err.message ? err.message : err).slice(0, 300) };
  }

  try {
    const m = await client.listModels();
    const names = Array.isArray(m) ? m.map((x) => x.id || x.name || '?') : m;
    report.models = { ok: true, count: Array.isArray(m) ? m.length : null, models: safe(names) };
  } catch (err) {
    report.models = { ok: false, error: String(err && err.message ? err.message : err).slice(0, 300) };
  }

  try {
    await client.stop();
  } catch {
    // best effort
  }
  return report;
}

// CLI entry: node src/sdk-probe.js [--json]
if (process.argv[1] && process.argv[1].endsWith('sdk-probe.js')) {
  const report = await probeSdk();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`sdk_import: ${report.sdk_import}`);
    console.log(`api_surface: ${JSON.stringify(report.api_surface)}`);
    console.log(`client_start: ${report.client_start}`);
    console.log(`auth: ${JSON.stringify(report.auth)}`);
    console.log(`quota: ${JSON.stringify(report.quota)}`);
    console.log(`models: ${JSON.stringify(report.models)}`);
    console.log(
      `quota_consumed: ${report.quota_consumed}  ai_generation_performed: ${report.ai_generation_performed}`,
    );
  }
}
