/**
 * Constitutional Validation Tests
 * 
 * P000-P010: Comprehensive validation of all Wave 1 components.
 * 
 * Tests:
 * - P000: Contract schema validation
 * - P003: publishContract() conformance
 * - P004: Persistence verification
 * - P005: Idempotency
 * - P006: Event immutability
 * - P007: Runtime uniqueness
 * - P008: Tenant isolation
 * - P009: Negative/error paths
 * - P010: Migration verification
 * 
 * Run: node test_constitutional_validation.js
 */

const assert = require('assert');
const crypto = require('crypto');
const {
  validateAuthority,
  validateEvent,
  validateRegistry,
  verifyTenantIsolation,
  verifyImmutability,
  computeCanonicalHash,
  verifyHash,
  AUTHORITY_CONTRACT_SCHEMA,
  EVENT_CONTRACT_SCHEMA,
  REGISTRY_CONTRACT_SCHEMA,
} = require('../ping-runtime/authorities/constitutional_validation');
const { CanonicalEventEnvelope } = require('./canonical_event_envelope');
const { TenantRegistry } = require('../ping-runtime/runtime/tenant_registry');
const { DeploymentRegistry } = require('../ping-runtime/runtime/deployment_registry');
const { RuntimeRegistry } = require('../ping-runtime/runtime/runtime_registry');

// ============================================================
// MOCK DATABASE
// ============================================================

class MockDatabase {
  constructor() {
    this.tables = {
      canonical_events: [],
      tenant_registry: [],
      deployment_registry: [],
      runtime_registry: [],
    };
    this.sequences = {
      canonical_events: 0,
    };
  }

  async query(sql, params = []) {
    // Track all queries for persistence verification
    this._lastQuery = { sql, params };

    // INSERT INTO canonical_events
    if (sql.includes('INSERT INTO canonical_events')) {
      const event = {
        event_id: params[0],
        event_type: params[1],
        event_version: params[2],
        tenant_id: params[3],
        timestamp: params[4],
        sequence: params[5],
        source: params[6],
        actor: params[7],
        causation_id: params[8],
        correlation_id: params[9],
        payload: JSON.parse(params[10] || '{}'),
        metadata: JSON.parse(params[11] || '{}'),
        processed: false,
        processed_at: null,
        worker: null,
        retries: 0,
        last_error: null,
        created_at: new Date().toISOString(),
      };

      // Check uniqueness constraint
      const exists = this.tables.canonical_events.find(
        e => e.tenant_id === event.tenant_id && e.sequence === event.sequence
      );
      if (exists) {
        return { rows: [] }; // ON CONFLICT DO NOTHING
      }

      this.tables.canonical_events.push(event);
      return { rows: [event] };
    }

    // SELECT COALESCE(MAX(sequence))
    if (sql.includes('SELECT COALESCE(MAX(sequence)')) {
      const tenantId = params[0];
      const events = this.tables.canonical_events.filter(e => e.tenant_id === tenantId);
      const maxSeq = events.length > 0 ? Math.max(...events.map(e => e.sequence)) : 0;
      return { rows: [{ next_seq: maxSeq + 1 }] };
    }

    // SELECT * FROM canonical_events
    if (sql.includes('SELECT * FROM canonical_events')) {
      let events = [...this.tables.canonical_events];
      
      // Filter by tenant_id
      const tenantMatch = sql.match(/tenant_id = \$(\d+)/);
      if (tenantMatch) {
        const idx = parseInt(tenantMatch[1]) - 1;
        events = events.filter(e => e.tenant_id === params[idx]);
      }

      // Filter by event_type
      const typeMatch = sql.match(/event_type = \$(\d+)/);
      if (typeMatch) {
        const idx = parseInt(typeMatch[1]) - 1;
        events = events.filter(e => e.event_type === params[idx]);
      }

      // Filter by correlation_id
      const corrMatch = sql.match(/correlation_id = \$(\d+)/);
      if (corrMatch) {
        const idx = parseInt(corrMatch[1]) - 1;
        events = events.filter(e => e.correlation_id === params[idx]);
      }

      // Filter by processed status
      if (sql.includes('NOT processed')) {
        events = events.filter(e => !e.processed);
      }

      return { rows: events };
    }

    // UPDATE canonical_events SET processed
    if (sql.includes('UPDATE canonical_events') && sql.includes('processed')) {
      const eventId = params[1];
      const event = this.tables.canonical_events.find(e => e.event_id === eventId);
      if (event) {
        event.processed = true;
        event.processed_at = new Date().toISOString();
        event.worker = params[0];
      }
      return { rows: [] };
    }

    // UPDATE canonical_events SET retries
    if (sql.includes('UPDATE canonical_events') && sql.includes('retries')) {
      const eventId = params[1];
      const event = this.tables.canonical_events.find(e => e.event_id === eventId);
      if (event) {
        event.retries += 1;
        event.last_error = params[0];
      }
      return { rows: [] };
    }

    // INSERT INTO tenant_registry
    if (sql.includes('INSERT INTO tenant_registry')) {
      const tenant = {
        tenant_id: params[0],
        name: params[1],
        domains: params[2],
        health_endpoint: params[3],
        metrics_endpoint: params[4],
        logs_endpoint: params[5],
        traces_endpoint: params[6],
        events_endpoint: params[7],
        capabilities: params[8],
        metadata: JSON.parse(params[9] || '{}'),
        status: 'active',
        registered_at: new Date().toISOString(),
        last_heartbeat: null,
        updated_at: new Date().toISOString(),
      };

      // Upsert behavior
      const existing = this.tables.tenant_registry.findIndex(t => t.tenant_id === tenant.tenant_id);
      if (existing >= 0) {
        this.tables.tenant_registry[existing] = { ...this.tables.tenant_registry[existing], ...tenant };
        return { rows: [this.tables.tenant_registry[existing]] };
      }

      this.tables.tenant_registry.push(tenant);
      return { rows: [tenant] };
    }

    // SELECT * FROM tenant_registry
    if (sql.includes('SELECT * FROM tenant_registry')) {
      let tenants = [...this.tables.tenant_registry];
      
      const tenantMatch = sql.match(/tenant_id = \$(\d+)/);
      if (tenantMatch) {
        const idx = parseInt(tenantMatch[1]) - 1;
        tenants = tenants.filter(t => t.tenant_id === params[idx]);
      }

      return { rows: tenants };
    }

    // INSERT INTO deployment_registry
    if (sql.includes('INSERT INTO deployment_registry')) {
      const deployment = {
        deployment_id: params[0],
        tenant_id: params[1],
        version: params[2],
        git_sha: params[3],
        container_image: params[4],
        oracle_region: params[5],
        environment: params[6],
        status: 'pending',
        health: 'unknown',
        deployed_at: new Date().toISOString(),
      };

      // Upsert behavior (ON CONFLICT (tenant_id, version))
      const existing = this.tables.deployment_registry.findIndex(
        d => d.tenant_id === deployment.tenant_id && d.version === deployment.version
      );
      if (existing >= 0) {
        this.tables.deployment_registry[existing] = {
          ...this.tables.deployment_registry[existing],
          git_sha: deployment.git_sha,
          container_image: deployment.container_image,
          oracle_region: deployment.oracle_region,
          environment: deployment.environment,
        };
        return { rows: [this.tables.deployment_registry[existing]] };
      }

      this.tables.deployment_registry.push(deployment);
      return { rows: [deployment] };
    }

    // SELECT * FROM deployment_registry
    if (sql.includes('SELECT * FROM deployment_registry')) {
      let deployments = [...this.tables.deployment_registry];
      
      const tenantMatch = sql.match(/tenant_id = \$(\d+)/);
      if (tenantMatch) {
        const idx = parseInt(tenantMatch[1]) - 1;
        deployments = deployments.filter(d => d.tenant_id === params[idx]);
      }

      const idMatch = sql.match(/deployment_id = \$(\d+)/);
      if (idMatch) {
        const idx = parseInt(idMatch[1]) - 1;
        deployments = deployments.filter(d => d.deployment_id === params[idx]);
      }

      return { rows: deployments };
    }

    // INSERT INTO runtime_registry
    if (sql.includes('INSERT INTO runtime_registry')) {
      const component = {
        runtime_id: params[0],
        tenant_id: params[1],
        component_type: params[2],
        component_name: params[3],
        version: params[4],
        health_endpoint: params[5],
        metrics_endpoint: params[6],
        metadata: JSON.parse(params[7] || '{}'),
        status: 'unknown',
        health: 'unknown',
        registered_at: new Date().toISOString(),
        last_heartbeat: null,
        updated_at: new Date().toISOString(),
      };

      // Upsert behavior
      const existing = this.tables.runtime_registry.findIndex(
        r => r.tenant_id === component.tenant_id &&
             r.component_type === component.component_type &&
             r.component_name === component.component_name
      );
      if (existing >= 0) {
        this.tables.runtime_registry[existing] = { ...this.tables.runtime_registry[existing], ...component };
        return { rows: [this.tables.runtime_registry[existing]] };
      }

      this.tables.runtime_registry.push(component);
      return { rows: [component] };
    }

    // SELECT * FROM runtime_registry
    if (sql.includes('SELECT * FROM runtime_registry')) {
      let components = [...this.tables.runtime_registry];
      
      const tenantMatch = sql.match(/tenant_id = \$(\d+)/);
      if (tenantMatch) {
        const idx = parseInt(tenantMatch[1]) - 1;
        components = components.filter(c => c.tenant_id === params[idx]);
      }

      const idMatch = sql.match(/runtime_id = \$(\d+)/);
      if (idMatch) {
        const idx = parseInt(idMatch[1]) - 1;
        components = components.filter(c => c.runtime_id === params[idx]);
      }

      return { rows: components };
    }

    // SELECT 1 (health check)
    if (sql.includes('SELECT 1')) {
      return { rows: [{ '?column?': 1 }] };
    }

    return { rows: [] };
  }
}

// ============================================================
// TEST RUNNER
// ============================================================

let passed = 0;
let failed = 0;
let skipped = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn, async: false });
}

function asyncTest(name, fn) {
  tests.push({ name, fn, async: true });
}

function skip(name, reason) {
  tests.push({ name, fn: () => {}, async: false, skip: true, reason });
}

async function runTests() {
  console.log('=== Constitutional Validation Tests ===\n');

  for (const t of tests) {
    if (t.skip) {
      console.log(`○ ${t.name} (SKIPPED: ${t.reason})`);
      skipped++;
      continue;
    }

    try {
      if (t.async) {
        await t.fn();
      } else {
        t.fn();
      }
      console.log(`✓ ${t.name}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${t.name}`);
      console.error(`  ${error.message}`);
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(1, 3);
        stackLines.forEach(line => console.error(`  ${line.trim()}`));
      }
      failed++;
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${passed + failed + skipped}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// ============================================================
// P000: CONTRACT SCHEMA VALIDATION
// ============================================================

console.log('\n--- P000: Contract Schema Validation ---');

test('AUTHORITY_CONTRACT_SCHEMA has all required fields', () => {
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('authority_id'));
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('authority_name'));
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('version'));
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('owner'));
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('consumes'));
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('produces'));
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('guarantees'));
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('invariants'));
  assert.ok(AUTHORITY_CONTRACT_SCHEMA.required.includes('consumers'));
});

test('EVENT_CONTRACT_SCHEMA has all required fields', () => {
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('event_id'));
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('event_type'));
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('event_version'));
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('tenant_id'));
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('timestamp'));
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('sequence'));
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('source'));
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('actor'));
  assert.ok(EVENT_CONTRACT_SCHEMA.required.includes('payload'));
});

test('REGISTRY_CONTRACT_SCHEMA has all required fields', () => {
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('authority_id'));
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('authority_name'));
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('version'));
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('owner'));
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('consumes'));
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('produces'));
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('guarantees'));
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('invariants'));
  assert.ok(REGISTRY_CONTRACT_SCHEMA.required.includes('consumers'));
});

test('validateAuthority passes valid contract', () => {
  const result = validateAuthority({
    authority_id: 'test-authority',
    authority_name: 'TestAuthority',
    version: '1.0.0',
    owner: 'ping',
    consumes: ['input'],
    produces: ['output'],
    guarantees: ['deterministic'],
    invariants: ['invariant1'],
    consumers: ['consumer1'],
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('validateAuthority fails missing required fields', () => {
  const result = validateAuthority({
    authority_id: 'test',
    // Missing all other required fields
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.some(e => e.includes('Missing required field')));
});

test('validateAuthority fails invalid authority_id format', () => {
  const result = validateAuthority({
    authority_id: 'Invalid_ID',
    authority_name: 'Test',
    version: '1.0.0',
    owner: 'ping',
    consumes: [],
    produces: [],
    guarantees: [],
    invariants: [],
    consumers: [],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('kebab-case')));
});

test('validateAuthority fails invalid version format', () => {
  const result = validateAuthority({
    authority_id: 'test-authority',
    authority_name: 'Test',
    version: '1.0',
    owner: 'ping',
    consumes: [],
    produces: [],
    guarantees: [],
    invariants: [],
    consumers: [],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('semver')));
});

test('validateEvent passes valid event', () => {
  const result = validateEvent({
    event_id: '12345678-1234-1234-1234-123456789abc',
    event_type: 'test.event',
    event_version: '1.0.0',
    tenant_id: 'tenant-1',
    timestamp: '2026-01-01T00:00:00Z',
    sequence: 1,
    source: 'test',
    actor: 'user',
    payload: {},
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('validateEvent fails missing required fields', () => {
  const result = validateEvent({
    event_id: '12345678-1234-1234-1234-123456789abc',
    // Missing all other required fields
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('validateEvent fails invalid timestamp', () => {
  const result = validateEvent({
    event_id: '12345678-1234-1234-1234-123456789abc',
    event_type: 'test.event',
    event_version: '1.0.0',
    tenant_id: 'tenant-1',
    timestamp: 'not-a-date',
    sequence: 1,
    source: 'test',
    actor: 'user',
    payload: {},
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('timestamp')));
});

test('validateEvent fails negative sequence', () => {
  const result = validateEvent({
    event_id: '12345678-1234-1234-1234-123456789abc',
    event_type: 'test.event',
    event_version: '1.0.0',
    tenant_id: 'tenant-1',
    timestamp: '2026-01-01T00:00:00Z',
    sequence: -1,
    source: 'test',
    actor: 'user',
    payload: {},
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('sequence')));
});

test('validateRegistry passes valid contract', () => {
  const result = validateRegistry({
    authority_id: 'test-registry',
    authority_name: 'TestRegistry',
    version: '1.0.0',
    owner: 'ping',
    consumes: ['input'],
    produces: ['output'],
    guarantees: ['deterministic'],
    invariants: ['invariant1'],
    consumers: ['consumer1'],
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('validateRegistry fails missing required fields', () => {
  const result = validateRegistry({
    authority_id: 'test',
    // Missing all other required fields
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

// ============================================================
// P003: PUBLISH CONTRACT CONFORMANCE
// ============================================================

console.log('\n--- P003: Publish Contract Conformance ---');

asyncTest('CanonicalEventEnvelope contract validates', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);
  const contract = envelope.publishContract();
  const result = validateAuthority(contract);
  assert.strictEqual(result.valid, true, `Contract invalid: ${result.errors.join(', ')}`);
});

asyncTest('TenantRegistry contract validates', async () => {
  const db = new MockDatabase();
  const registry = new TenantRegistry(db);
  const contract = registry.publishContract();
  const result = validateRegistry(contract);
  assert.strictEqual(result.valid, true, `Contract invalid: ${result.errors.join(', ')}`);
});

asyncTest('DeploymentRegistry contract validates', async () => {
  const db = new MockDatabase();
  const registry = new DeploymentRegistry(db);
  const contract = registry.publishContract();
  const result = validateRegistry(contract);
  assert.strictEqual(result.valid, true, `Contract invalid: ${result.errors.join(', ')}`);
});

asyncTest('RuntimeRegistry contract validates', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);
  const contract = registry.publishContract();
  const result = validateRegistry(contract);
  assert.strictEqual(result.valid, true, `Contract invalid: ${result.errors.join(', ')}`);
});

asyncTest('All contracts have owner field', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);
  const tenantReg = new TenantRegistry(db);
  const deployReg = new DeploymentRegistry(db);
  const runtimeReg = new RuntimeRegistry(db);

  assert.strictEqual(envelope.publishContract().owner, 'ping');
  assert.strictEqual(tenantReg.publishContract().owner, 'ping');
  assert.strictEqual(deployReg.publishContract().owner, 'ping');
  assert.strictEqual(runtimeReg.publishContract().owner, 'ping');
});

asyncTest('All contracts have invariants array', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);
  const tenantReg = new TenantRegistry(db);
  const deployReg = new DeploymentRegistry(db);
  const runtimeReg = new RuntimeRegistry(db);

  assert.ok(Array.isArray(envelope.publishContract().invariants));
  assert.ok(Array.isArray(tenantReg.publishContract().invariants));
  assert.ok(Array.isArray(deployReg.publishContract().invariants));
  assert.ok(Array.isArray(runtimeReg.publishContract().invariants));
});

asyncTest('All contracts have consumers array', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);
  const tenantReg = new TenantRegistry(db);
  const deployReg = new DeploymentRegistry(db);
  const runtimeReg = new RuntimeRegistry(db);

  assert.ok(Array.isArray(envelope.publishContract().consumers));
  assert.ok(Array.isArray(tenantReg.publishContract().consumers));
  assert.ok(Array.isArray(deployReg.publishContract().consumers));
  assert.ok(Array.isArray(runtimeReg.publishContract().consumers));
});

asyncTest('Registry contracts have uniqueness field', async () => {
  const db = new MockDatabase();
  const tenantReg = new TenantRegistry(db);
  const deployReg = new DeploymentRegistry(db);
  const runtimeReg = new RuntimeRegistry(db);

  assert.ok(Array.isArray(tenantReg.publishContract().uniqueness));
  assert.ok(Array.isArray(deployReg.publishContract().uniqueness));
  assert.ok(Array.isArray(runtimeReg.publishContract().uniqueness));
});

asyncTest('Registry contracts have tenant_isolation field', async () => {
  const db = new MockDatabase();
  const tenantReg = new TenantRegistry(db);
  const deployReg = new DeploymentRegistry(db);
  const runtimeReg = new RuntimeRegistry(db);

  assert.strictEqual(tenantReg.publishContract().tenant_isolation, true);
  assert.strictEqual(deployReg.publishContract().tenant_isolation, true);
  assert.strictEqual(runtimeReg.publishContract().tenant_isolation, true);
});

// ============================================================
// P004: PERSISTENCE VERIFICATION
// ============================================================

console.log('\n--- P004: Persistence Verification ---');

asyncTest('Event persists and can be retrieved', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  const event = await envelope.executeEmitEvent({
    tenantId: 'tenant-1',
    eventType: 'test.event',
    source: 'test-service',
    actor: 'user-1',
    payload: { data: 'test' },
  });

  // Verify row exists in database
  const rows = db.tables.canonical_events;
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].event_id, event.event_id);
  assert.strictEqual(rows[0].tenant_id, 'tenant-1');
  assert.strictEqual(rows[0].event_type, 'test.event');
  assert.deepStrictEqual(rows[0].payload, { data: 'test' });
});

asyncTest('Tenant persists and can be retrieved', async () => {
  const db = new MockDatabase();
  const registry = new TenantRegistry(db);

  await registry.executeRegisterTenant({
    tenantId: 'tenant-1',
    name: 'Test Tenant',
    domains: ['test.example.com'],
    capabilities: ['auth', 'api'],
  });

  // Verify row exists in database
  const rows = db.tables.tenant_registry;
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].tenant_id, 'tenant-1');
  assert.strictEqual(rows[0].name, 'Test Tenant');
  assert.deepStrictEqual(rows[0].domains, ['test.example.com']);
  assert.deepStrictEqual(rows[0].capabilities, ['auth', 'api']);
});

asyncTest('Deployment persists and can be retrieved', async () => {
  const db = new MockDatabase();
  const registry = new DeploymentRegistry(db);

  await registry.executeRegisterDeployment({
    tenantId: 'tenant-1',
    version: '1.0.0',
    gitSha: 'abc123',
    containerImage: 'registry.example.com/app:1.0.0',
  });

  // Verify row exists in database
  const rows = db.tables.deployment_registry;
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].tenant_id, 'tenant-1');
  assert.strictEqual(rows[0].version, '1.0.0');
  assert.strictEqual(rows[0].git_sha, 'abc123');
});

asyncTest('Runtime component persists and can be retrieved', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  await registry.executeRegisterComponent({
    tenantId: 'tenant-1',
    componentType: 'service',
    componentName: 'api-gateway',
    version: '1.0.0',
  });

  // Verify row exists in database
  const rows = db.tables.runtime_registry;
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].tenant_id, 'tenant-1');
  assert.strictEqual(rows[0].component_type, 'service');
  assert.strictEqual(rows[0].component_name, 'api-gateway');
});

asyncTest('Event query returns correct results', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  await envelope.executeEmitEvent({
    tenantId: 'tenant-1',
    eventType: 'event.a',
    source: 'test',
    actor: 'user',
    payload: { a: 1 },
  });

  await envelope.executeEmitEvent({
    tenantId: 'tenant-1',
    eventType: 'event.b',
    source: 'test',
    actor: 'user',
    payload: { b: 2 },
  });

  // Query all events
  const all = await envelope.executeQueryEvents({ tenantId: 'tenant-1' });
  assert.strictEqual(all.length, 2);

  // Query by type
  const typeA = await envelope.executeQueryEvents({ tenantId: 'tenant-1', eventType: 'event.a' });
  assert.strictEqual(typeA.length, 1);
  assert.strictEqual(typeA[0].event_type, 'event.a');
});

asyncTest('Tenant query returns correct results', async () => {
  const db = new MockDatabase();
  const registry = new TenantRegistry(db);

  await registry.executeRegisterTenant({ tenantId: 'tenant-1', name: 'Tenant 1' });
  await registry.executeRegisterTenant({ tenantId: 'tenant-2', name: 'Tenant 2' });

  const all = await registry.executeListTenants();
  assert.strictEqual(all.length, 2);

  const one = await registry.executeResolveTenant('tenant-1');
  assert.ok(one);
  assert.strictEqual(one.tenant_id, 'tenant-1');
});

// ============================================================
// P005: IDEMPOTENCY
// ============================================================

console.log('\n--- P005: Idempotency ---');

asyncTest('Tenant register is idempotent (upsert)', async () => {
  const db = new MockDatabase();
  const registry = new TenantRegistry(db);

  await registry.executeRegisterTenant({ tenantId: 'tenant-1', name: 'Tenant 1' });
  await registry.executeRegisterTenant({ tenantId: 'tenant-1', name: 'Tenant 1 Updated' });

  // Should have exactly 1 row (upsert, not duplicate)
  assert.strictEqual(db.tables.tenant_registry.length, 1);
  assert.strictEqual(db.tables.tenant_registry[0].name, 'Tenant 1 Updated');
});

asyncTest('Deployment register is idempotent (upsert)', async () => {
  const db = new MockDatabase();
  const registry = new DeploymentRegistry(db);

  await registry.executeRegisterDeployment({ tenantId: 'tenant-1', version: '1.0.0', gitSha: 'abc' });
  await registry.executeRegisterDeployment({ tenantId: 'tenant-1', version: '1.0.0', gitSha: 'def' });

  // Should have exactly 1 row (upsert, not duplicate)
  assert.strictEqual(db.tables.deployment_registry.length, 1);
  assert.strictEqual(db.tables.deployment_registry[0].git_sha, 'def');
});

asyncTest('Runtime register is idempotent (upsert)', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  await registry.executeRegisterComponent({ tenantId: 'tenant-1', componentType: 'service', componentName: 'api', version: '1.0.0' });
  await registry.executeRegisterComponent({ tenantId: 'tenant-1', componentType: 'service', componentName: 'api', version: '2.0.0' });

  // Should have exactly 1 row (upsert, not duplicate)
  assert.strictEqual(db.tables.runtime_registry.length, 1);
  assert.strictEqual(db.tables.runtime_registry[0].version, '2.0.0');
});

asyncTest('Event register fails closed on duplicate receipt serial (no silent drop)', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  // Mock sequence to return same value (forced serial race)
  const originalQuery = db.query.bind(db);
  db.query = async (sql, params) => {
    if (sql.includes('SELECT COALESCE(MAX(sequence)')) {
      return { rows: [{ next_seq: 1 }] };
    }
    return originalQuery(sql, params);
  };

  await envelope.executeEmitEvent({
    tenantId: 'tenant-1',
    eventType: 'test.event',
    source: 'test',
    actor: 'user',
    payload: { a: 1 },
  });

  // Second emit collides on serial 1 on every attempt: it must throw a
  // typed error rather than silently dropping the envelope.
  let err = null;
  try {
    await envelope.executeEmitEvent({
      tenantId: 'tenant-1',
      eventType: 'test.event',
      source: 'test',
      actor: 'user',
      payload: { b: 2 },
    });
  } catch (e) { err = e; }
  assert.ok(err, 'expected INGRESS_RECEIPT_CONFLICT, got silent success');
  assert.strictEqual(err.code, 'INGRESS_RECEIPT_CONFLICT');

  // Exactly 1 row persisted: the first receipt stands; the second was
  // refused loudly, never silently dropped.
  assert.strictEqual(db.tables.canonical_events.length, 1);
});

// ============================================================
// P006: EVENT IMMUTABILITY
// ============================================================

console.log('\n--- P006: Event Immutability ---');

asyncTest('Event fields cannot be changed after creation', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  const event = await envelope.executeEmitEvent({
    tenantId: 'tenant-1',
    eventType: 'test.event',
    source: 'test-service',
    actor: 'user-1',
    payload: { data: 'test' },
  });

  // Store original values
  const originalEventId = event.event_id;
  const originalTenantId = event.tenant_id;
  const originalEventType = event.event_type;
  const originalSource = event.source;
  const originalActor = event.actor;
  const originalPayload = { ...event.payload };

  // Attempt to modify (should not affect stored data)
  event.event_id = 'modified-id';
  event.tenant_id = 'modified-tenant';
  event.event_type = 'modified.type';

  // Verify stored data unchanged
  const stored = db.tables.canonical_events[0];
  assert.strictEqual(stored.event_id, originalEventId);
  assert.strictEqual(stored.tenant_id, originalTenantId);
  assert.strictEqual(stored.event_type, originalEventType);
  assert.strictEqual(stored.source, originalSource);
  assert.strictEqual(stored.actor, originalActor);
  assert.deepStrictEqual(stored.payload, originalPayload);
});

asyncTest('Event has immutable fields defined', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  const event = await envelope.executeEmitEvent({
    tenantId: 'tenant-1',
    eventType: 'test.event',
    source: 'test',
    actor: 'user',
    payload: {},
  });

  const result = verifyImmutability(event, [
    'event_id',
    'event_type',
    'event_version',
    'tenant_id',
    'timestamp',
    'sequence',
    'source',
    'actor',
    'payload',
  ]);

  assert.strictEqual(result.valid, true);
});

asyncTest('Event ID is deterministic UUID v5', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  const id1 = envelope.generateEventId('tenant-1', 'test.event', '2026-01-01T00:00:00Z', 1);
  const id2 = envelope.generateEventId('tenant-1', 'test.event', '2026-01-01T00:00:00Z', 1);

  assert.strictEqual(id1, id2);
  assert.ok(id1.match(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
});

asyncTest('Different inputs produce different event IDs', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  const id1 = envelope.generateEventId('tenant-1', 'event.a', '2026-01-01T00:00:00Z', 1);
  const id2 = envelope.generateEventId('tenant-1', 'event.b', '2026-01-01T00:00:00Z', 1);
  const id3 = envelope.generateEventId('tenant-2', 'event.a', '2026-01-01T00:00:00Z', 1);
  const id4 = envelope.generateEventId('tenant-1', 'event.a', '2026-01-02T00:00:00Z', 1);
  const id5 = envelope.generateEventId('tenant-1', 'event.a', '2026-01-01T00:00:00Z', 2);

  assert.notStrictEqual(id1, id2);
  assert.notStrictEqual(id1, id3);
  assert.notStrictEqual(id1, id4);
  assert.notStrictEqual(id1, id5);
});

// ============================================================
// P007: RUNTIME UNIQUENESS
// ============================================================

console.log('\n--- P007: Runtime Uniqueness ---');

asyncTest('Runtime component is unique by (tenant, type, name)', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  await registry.executeRegisterComponent({ tenantId: 'tenant-1', componentType: 'service', componentName: 'api', version: '1.0.0' });
  await registry.executeRegisterComponent({ tenantId: 'tenant-1', componentType: 'service', componentName: 'api', version: '2.0.0' });

  // Should have exactly 1 row (upsert)
  assert.strictEqual(db.tables.runtime_registry.length, 1);
  assert.strictEqual(db.tables.runtime_registry[0].version, '2.0.0');
});

asyncTest('Different components are not merged', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  await registry.executeRegisterComponent({ tenantId: 'tenant-1', componentType: 'service', componentName: 'api', version: '1.0.0' });
  await registry.executeRegisterComponent({ tenantId: 'tenant-1', componentType: 'worker', componentName: 'api', version: '1.0.0' });
  await registry.executeRegisterComponent({ tenantId: 'tenant-1', componentType: 'service', componentName: 'web', version: '1.0.0' });

  // Should have 3 rows (different types/names)
  assert.strictEqual(db.tables.runtime_registry.length, 3);
});

asyncTest('Different tenants are not merged', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  await registry.executeRegisterComponent({ tenantId: 'tenant-1', componentType: 'service', componentName: 'api', version: '1.0.0' });
  await registry.executeRegisterComponent({ tenantId: 'tenant-2', componentType: 'service', componentName: 'api', version: '1.0.0' });

  // Should have 2 rows (different tenants)
  assert.strictEqual(db.tables.runtime_registry.length, 2);
});

// ============================================================
// P008: TENANT ISOLATION
// ============================================================

console.log('\n--- P008: Tenant Isolation ---');

asyncTest('Tenant A cannot read Tenant B events', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  // Emit events for both tenants
  await envelope.executeEmitEvent({
    tenantId: 'tenant-a',
    eventType: 'test.event',
    source: 'test',
    actor: 'user',
    payload: { secret: 'a-data' },
  });

  await envelope.executeEmitEvent({
    tenantId: 'tenant-b',
    eventType: 'test.event',
    source: 'test',
    actor: 'user',
    payload: { secret: 'b-data' },
  });

  // Query as tenant A
  const aEvents = await envelope.executeQueryEvents({ tenantId: 'tenant-a' });
  assert.strictEqual(aEvents.length, 1);
  assert.strictEqual(aEvents[0].tenant_id, 'tenant-a');
  assert.deepStrictEqual(aEvents[0].payload, { secret: 'a-data' });

  // Query as tenant B
  const bEvents = await envelope.executeQueryEvents({ tenantId: 'tenant-b' });
  assert.strictEqual(bEvents.length, 1);
  assert.strictEqual(bEvents[0].tenant_id, 'tenant-b');
  assert.deepStrictEqual(bEvents[0].payload, { secret: 'b-data' });
});

asyncTest('Tenant A cannot read Tenant B tenants', async () => {
  const db = new MockDatabase();
  const registry = new TenantRegistry(db);

  await registry.executeRegisterTenant({ tenantId: 'tenant-a', name: 'Tenant A' });
  await registry.executeRegisterTenant({ tenantId: 'tenant-b', name: 'Tenant B' });

  // Query as tenant A
  const aTenant = await registry.executeResolveTenant('tenant-a');
  assert.ok(aTenant);
  assert.strictEqual(aTenant.tenant_id, 'tenant-a');

  // Query as tenant B
  const bTenant = await registry.executeResolveTenant('tenant-b');
  assert.ok(bTenant);
  assert.strictEqual(bTenant.tenant_id, 'tenant-b');

  // Non-existent tenant returns null
  const noTenant = await registry.executeResolveTenant('tenant-c');
  assert.strictEqual(noTenant, null);
});

asyncTest('Tenant A cannot read Tenant B deployments', async () => {
  const db = new MockDatabase();
  const registry = new DeploymentRegistry(db);

  await registry.executeRegisterDeployment({ tenantId: 'tenant-a', version: '1.0.0', gitSha: 'aaa' });
  await registry.executeRegisterDeployment({ tenantId: 'tenant-b', version: '1.0.0', gitSha: 'bbb' });

  // Query as tenant A
  const aDeployments = await registry.executeListDeployments('tenant-a');
  assert.strictEqual(aDeployments.length, 1);
  assert.strictEqual(aDeployments[0].tenant_id, 'tenant-a');

  // Query as tenant B
  const bDeployments = await registry.executeListDeployments('tenant-b');
  assert.strictEqual(bDeployments.length, 1);
  assert.strictEqual(bDeployments[0].tenant_id, 'tenant-b');
});

asyncTest('Tenant A cannot read Tenant B runtime components', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  await registry.executeRegisterComponent({ tenantId: 'tenant-a', componentType: 'service', componentName: 'api', version: '1.0.0' });
  await registry.executeRegisterComponent({ tenantId: 'tenant-b', componentType: 'service', componentName: 'api', version: '1.0.0' });

  // Query as tenant A
  const aComponents = await registry.executeListComponents('tenant-a');
  assert.strictEqual(aComponents.length, 1);
  assert.strictEqual(aComponents[0].tenant_id, 'tenant-a');

  // Query as tenant B
  const bComponents = await registry.executeListComponents('tenant-b');
  assert.strictEqual(bComponents.length, 1);
  assert.strictEqual(bComponents[0].tenant_id, 'tenant-b');
});

// ============================================================
// P009: NEGATIVE/ERROR PATHS
// ============================================================

console.log('\n--- P009: Negative/Error Paths ---');

asyncTest('Event emit fails with missing tenant_id', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  try {
    await envelope.executeEmitEvent({
      // tenantId missing
      eventType: 'test.event',
      source: 'test',
      actor: 'user',
      payload: {},
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Event emit fails with missing event_type', async () => {
  const db = new MockDatabase();
  const envelope = new CanonicalEventEnvelope(db);

  try {
    await envelope.executeEmitEvent({
      tenantId: 'tenant-1',
      // eventType missing
      source: 'test',
      actor: 'user',
      payload: {},
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Tenant register fails with missing tenant_id', async () => {
  const db = new MockDatabase();
  const registry = new TenantRegistry(db);

  try {
    await registry.executeRegisterTenant({
      // tenantId missing
      name: 'Test',
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Tenant register fails with missing name', async () => {
  const db = new MockDatabase();
  const registry = new TenantRegistry(db);

  try {
    await registry.executeRegisterTenant({
      tenantId: 'tenant-1',
      // name missing
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Deployment register fails with missing tenant_id', async () => {
  const db = new MockDatabase();
  const registry = new DeploymentRegistry(db);

  try {
    await registry.executeRegisterDeployment({
      // tenantId missing
      version: '1.0.0',
      gitSha: 'abc',
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Deployment register fails with missing version', async () => {
  const db = new MockDatabase();
  const registry = new DeploymentRegistry(db);

  try {
    await registry.executeRegisterDeployment({
      tenantId: 'tenant-1',
      // version missing
      gitSha: 'abc',
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Deployment register fails with missing git_sha', async () => {
  const db = new MockDatabase();
  const registry = new DeploymentRegistry(db);

  try {
    await registry.executeRegisterDeployment({
      tenantId: 'tenant-1',
      version: '1.0.0',
      // gitSha missing
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Runtime register fails with missing tenant_id', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  try {
    await registry.executeRegisterComponent({
      // tenantId missing
      componentType: 'service',
      componentName: 'api',
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Runtime register fails with missing component_type', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  try {
    await registry.executeRegisterComponent({
      tenantId: 'tenant-1',
      // componentType missing
      componentName: 'api',
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('Runtime register fails with missing component_name', async () => {
  const db = new MockDatabase();
  const registry = new RuntimeRegistry(db);

  try {
    await registry.executeRegisterComponent({
      tenantId: 'tenant-1',
      componentType: 'service',
      // componentName missing
    });
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('required'));
  }
});

asyncTest('validateAuthority fails with null input', () => {
  const result = validateAuthority(null);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

asyncTest('validateEvent fails with null input', () => {
  const result = validateEvent(null);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

asyncTest('validateRegistry fails with null input', () => {
  const result = validateRegistry(null);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

asyncTest('validateAuthority fails with wrong types', () => {
  const result = validateAuthority({
    authority_id: 'test',
    authority_name: 123, // Should be string
    version: '1.0.0',
    owner: 'ping',
    consumes: 'not-an-array', // Should be array
    produces: [],
    guarantees: [],
    invariants: [],
    consumers: [],
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('expected string') || e.includes('expected array')));
});

// ============================================================
// P010: MIGRATION VERIFICATION
// ============================================================

console.log('\n--- P010: Migration Verification ---');

skip('Migration verification requires Docker (Postgres)', 'Docker not running');

// ============================================================
// HASH VERIFICATION
// ============================================================

console.log('\n--- Hash Verification ---');

test('computeCanonicalHash is deterministic', () => {
  const obj = { a: 1, b: 'test', c: { nested: true } };
  const hash1 = computeCanonicalHash(obj);
  const hash2 = computeCanonicalHash(obj);
  assert.strictEqual(hash1, hash2);
});

test('computeCanonicalHash changes with content', () => {
  const obj1 = { a: 1 };
  const obj2 = { a: 2 };
  const hash1 = computeCanonicalHash(obj1);
  const hash2 = computeCanonicalHash(obj2);
  assert.notStrictEqual(hash1, hash2);
});

test('computeCanonicalHash is key-order independent', () => {
  const obj1 = { a: 1, b: 2 };
  const obj2 = { b: 2, a: 1 };
  const hash1 = computeCanonicalHash(obj1);
  const hash2 = computeCanonicalHash(obj2);
  assert.strictEqual(hash1, hash2);
});

test('verifyHash passes matching hash', () => {
  const entity = {
    id: 'test',
    name: 'Test',
    hash: computeCanonicalHash({ id: 'test', name: 'Test' }),
  };
  const result = verifyHash(entity, 'hash', ['id', 'name']);
  assert.strictEqual(result.valid, true);
});

test('verifyHash fails mismatched hash', () => {
  const entity = {
    id: 'test',
    name: 'Test',
    hash: 'wrong-hash',
  };
  const result = verifyHash(entity, 'hash', ['id', 'name']);
  assert.strictEqual(result.valid, false);
  assert.ok(result.details.includes('Hash mismatch'));
});

test('verifyHash fails missing hash field', () => {
  const entity = { id: 'test' };
  const result = verifyHash(entity, 'hash', ['id']);
  assert.strictEqual(result.valid, false);
  assert.ok(result.details.includes('Hash field missing'));
});

// ============================================================
// RUN ALL TESTS
// ============================================================

runTests();
