'use strict';
//
// Credential boundary.
//
// The broker's durable state holds identity_id and non-secret metadata ONLY.
// It must NEVER contain: raw GitHub tokens, raw Copilot tokens, OAuth cookies,
// or credential-store contents.
//
// Investigated boundary (2026-09-17, Pig WSL, Ubuntu 26.04):
// - `copilot login` stores its OAuth token in the OS credential store WHEN
//   AVAILABLE, else in a plaintext config file under ~/.copilot/ (0600). This
//   is GitHub's documented fallback, created by GitHub's own login flow.
// - This WSL has no OS keyring (no libsecret, no secret-service) and no sudo
//   to install one, so the fallback is what `copilot login` will use here.
// - The CLI/SDK exposes NO supported API to extract the stored OAuth token
//   for re-injection. Reading the CLI's private store from the broker would
//   be an invented, unsafe extraction mechanism, so the broker does not do it.
//
// Therefore the default provider below does NOT handle token material at all:
// after the one human `copilot login`, the CLI/SDK resolves its own stored
// credential at runtime. The broker's job at the process boundary is:
//   1. verify that an authorization exists (see sdk-probe.js),
//   2. scrub ambient token overrides (GH_TOKEN/GITHUB_TOKEN/COPILOT_GITHUB_TOKEN)
//      so a stray environment cannot silently become the Copilot identity,
//   3. never read, copy, log, or persist the stored credential.
//
// A token may be injected for a single spawn ONLY when it arrives through an
// explicitly secure channel (parameter, never broker state); the skeleton
// never supplies one from stored state.

export const AMBIENT_TOKEN_VARS = Object.freeze([
  'COPILOT_GITHUB_TOKEN',
  'GH_TOKEN',
  'GITHUB_TOKEN',
]);

// Build the environment for a Copilot child process.
// - Ambient token overrides are always scrubbed, so the stored `copilot login`
//   identity is authoritative and nothing ambient can hijack it.
// - explicitToken: only from a secure out-of-band channel for that one spawn.
//   It is placed in the child env and never persisted, logged, or returned.
export function buildChildEnv({ explicitToken = null } = {}) {
  const env = { ...process.env };
  for (const name of AMBIENT_TOKEN_VARS) delete env[name];
  if (explicitToken) env.COPILOT_GITHUB_TOKEN = explicitToken;
  return env;
}

// Defense in depth: redact token-shaped values before anything hits logs,
// evidence records, or error reports. The broker should never see a real
// token, but if one ever passes through a captured stream, it is scrubbed.
const TOKEN_PATTERNS = [
  /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{16,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{16,}\b/g,
  /\b(COPILOT_GITHUB_TOKEN|GH_TOKEN|GITHUB_TOKEN)\s*=\s*['"]?[^'"\s]+['"]?/g,
];

export function redactSecrets(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const re of TOKEN_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out;
}

// Assert that a broker-state object contains no token material. Used in tests
// and before any state is persisted or reported.
export function assertNoTokenMaterial(obj, label = 'object') {
  const haystack = JSON.stringify(obj);
  for (const name of AMBIENT_TOKEN_VARS) {
    if (haystack.includes(name)) {
      throw new Error(`credential boundary violated: ${label} mentions ${name}`);
    }
  }
  if (/(ghp|gho|ghu|github_pat)_[A-Za-z0-9_]{16,}/.test(haystack)) {
    throw new Error(`credential boundary violated: ${label} contains token-shaped material`);
  }
  return true;
}
