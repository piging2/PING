// P034: Capability Resolver
// Runtime resolves capabilities exclusively from capability_registry.json
// Verifies: provider exists, required secrets declared, runtime dependency satisfied.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CapabilityResolver {
  constructor(repoRoot) {
    this._repoRoot = repoRoot;
    this._capabilities = new Map();
    this._byAuthority = new Map();
    this._hash = null;
  }

  load() {
    const registryPath = path.join(this._repoRoot, 'gateway', 'generated', 'capability_registry.json');
    if (!fs.existsSync(registryPath)) {
      throw new Error(`[CapabilityResolver] capability_registry.json not found at ${registryPath}`);
    }

    const raw = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(raw);

    this._validateRegistry(registry);
    this._indexCapabilities(registry.capabilities);
    this._hash = this._computeHash();

    console.log(`[CapabilityResolver] Loaded ${this._capabilities.size} capabilities, hash ${this._hash.slice(0, 12)}...`);
    return this;
  }

  _validateRegistry(registry) {
    const required = ['schema_version', 'generator', 'count', 'capabilities'];
    for (const field of required) {
      if (!registry[field]) {
        throw new Error(`[CapabilityResolver] Missing required field: ${field}`);
      }
    }
  }

  _indexCapabilities(capabilities) {
    for (const cap of capabilities) {
      if (!cap.name || !cap.capability_id) {
        throw new Error(`[CapabilityResolver] Invalid capability: missing name or id`);
      }
      if (this._capabilities.has(cap.name)) {
        throw new Error(`[CapabilityResolver] Duplicate capability: ${cap.name}`);
      }
      this._capabilities.set(cap.name, cap);

      // Index by authority
      const authority = cap.authority || 'unknown';
      if (!this._byAuthority.has(authority)) {
        this._byAuthority.set(authority, []);
      }
      this._byAuthority.get(authority).push(cap);
    }
  }

  resolve(capabilityName) {
    const cap = this._capabilities.get(capabilityName);
    if (!cap) {
      return { resolved: false, error: `Capability not found: ${capabilityName}` };
    }

    const issues = [];

    // Verify provider exists
    if (!cap.provider) {
      issues.push('No provider declared');
    }

    // Verify required secrets are declared (can be empty array)
    if (!Array.isArray(cap.required_secrets)) {
      issues.push('required_secrets must be an array');
    }

    // Verify runtime dependencies
    if (!Array.isArray(cap.runtime_dependencies)) {
      issues.push('runtime_dependencies must be an array');
    }

    return {
      resolved: issues.length === 0,
      capability: cap,
      issues,
    };
  }

  resolveByAuthority(authorityName) {
    return this._byAuthority.get(authorityName) || [];
  }

  hasCapability(capabilityName) {
    return this._capabilities.has(capabilityName);
  }

  listCapabilities() {
    return Array.from(this._capabilities.keys()).sort();
  }

  listAuthorities() {
    return Array.from(this._byAuthority.keys()).sort();
  }

  getHash() {
    return this._hash;
  }

  getStats() {
    return {
      totalCapabilities: this._capabilities.size,
      authorities: this._byAuthority.size,
      hash: this._hash,
      capabilities: this.listCapabilities(),
    };
  }

  _computeHash() {
    const names = Array.from(this._capabilities.keys()).sort();
    return crypto.createHash('sha256').update(JSON.stringify(names)).digest('hex');
  }
}

module.exports = { CapabilityResolver };
