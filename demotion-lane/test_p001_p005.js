/**
 * P001-P005 Runtime Contracts Test
 * 
 * Tests for CanonicalEventEnvelope, TenantRegistry, DeploymentRegistry, RuntimeRegistry.
 * 
 * Run: node test_p001_p005.js
 */

const assert = require('assert');
const { CanonicalEventEnvelope } = require('./canonical_event_envelope');
const { TenantRegistry } = require('../ping-runtime/runtime/tenant_registry');
const { DeploymentRegistry } = require('../ping-runtime/runtime/deployment_registry');
const { RuntimeRegistry } = require('../ping-runtime/runtime/runtime_registry');
const { DependencyGraph } = require('./bootstrap/dependency_graph');
const { computePlatformHash } = require('./runtime_hash');

// Mock Storage Adapter (compatible with PostgresAdapter interface)
class MockStorage {
  constructor() {
    this.queries = [];
    this.rows = [];
  }

  async query(sql, params = []) {
    this.queries.push({ sql, params });
    
    // Return mock data based on query type
    if (sql.includes('INSERT INTO canonical_events')) {
      return { rows: [{ event_id: 'test-event-1' }] };
    }
    if (sql.includes('SELECT * FROM canonical_events')) {
      return { rows: [] };
    }
    if (sql.includes('SELECT COALESCE(MAX(sequence)')) {
      return { rows: [{ next_seq: 1 }] };
    }
    if (sql.includes('INSERT INTO tenant_registry')) {
      return { rows: [{ tenant_id: 'test-tenant' }] };
    }
    if (sql.includes('SELECT * FROM tenant_registry')) {
      return { rows: [{ tenant_id: params[0] || 'test-tenant' }] };
    }
    if (sql.includes('INSERT INTO deployment_registry')) {
      return { rows: [{ deployment_id: 'test-deployment' }] };
    }
    if (sql.includes('SELECT * FROM deployment_registry')) {
      return { rows: [{ deployment_id: params[0] || 'test-deployment' }] };
    }
    if (sql.includes('INSERT INTO runtime_registry')) {
      return { rows: [{ component_id: 'test-component' }] };
    }
    if (sql.includes('SELECT * FROM runtime_registry')) {
      return { rows: [{ component_id: params[0] || 'test-component' }] };
    }
    if (sql.includes('SELECT 1')) {
      return { rows: [{ '?column?': 1 }] };
    }
    
    return { rows: [] };
  }

  async transaction(fn) {
    return fn(this);
  }

  async health() {
    return { healthy: true, latency_ms: 1 };
  }

  async close() {}
}

// Test runner
let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn, async: false });
}

function asyncTest(name, fn) {
  tests.push({ name, fn, async: true });
}

async function runTests() {
  for (const t of tests) {
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
      failed++;
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// P001: CanonicalEventEnvelope Tests
console.log('\n=== P001: CanonicalEventEnvelope ===');

asyncTest('generateEventId returns deterministic UUID', async () => {
  const storage = new MockStorage();
  const envelope = new CanonicalEventEnvelope(storage);
  
  const id1 = envelope.generateEventId('tenant-1', 'test.event', '2026-01-01T00:00:00Z', 1);
  const id2 = envelope.generateEventId('tenant-1', 'test.event', '2026-01-01T00:00:00Z', 1);
  
  assert.strictEqual(id1, id2, 'Event IDs should be deterministic');
  assert.ok(id1.match(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/), 'Should be UUID v5');
});

asyncTest('executeEmitEvent returns valid envelope', async () => {
  const storage = new MockStorage();
  const envelope = new CanonicalEventEnvelope(storage);
  
  const event = await envelope.executeEmitEvent({
    tenantId: 'tenant-1',
    eventType: 'test.event',
    source: 'test-service',
    actor: 'user-1',
    payload: { data: 'test' },
  });
  
  assert.ok(event.event_id, 'Should have event_id');
  assert.strictEqual(event.event_type, 'test.event');
  assert.strictEqual(event.tenant_id, 'tenant-1');
  assert.strictEqual(event.source, 'test-service');
  assert.strictEqual(event.actor, 'user-1');
  assert.deepStrictEqual(event.payload, { data: 'test' });
  assert.strictEqual(event.processed, false);
});

asyncTest('executeValidateEvent passes valid event', async () => {
  const storage = new MockStorage();
  const envelope = new CanonicalEventEnvelope(storage);
  
  const event = {
    event_id: 'test-id',
    event_type: 'test.event',
    event_version: '1.0.0',
    tenant_id: 'tenant-1',
    timestamp: '2026-01-01T00:00:00Z',
    sequence: 1,
    source: 'test',
    actor: 'user',
    payload: {},
  };
  
  const result = envelope.executeValidateEvent(event);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

asyncTest('executeValidateEvent fails missing fields', async () => {
  const pool = new MockStorage();
  const envelope = new CanonicalEventEnvelope(pool);
  
  const event = {
    event_id: 'test-id',
    // Missing event_type, tenant_id, etc.
  };
  
  const result = envelope.executeValidateEvent(event);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

asyncTest('executeEmitEvent creates and persists event', async () => {
  const pool = new MockStorage();
  const envelope = new CanonicalEventEnvelope(pool);
  
  const event = await envelope.executeEmitEvent({
    tenantId: 'tenant-1',
    eventType: 'test.event',
    source: 'test-service',
    actor: 'user-1',
    payload: { data: 'test' },
  });
  
  assert.ok(event.event_id);
  assert.strictEqual(pool.queries.length, 2); // getNextSequence + persistEvent
});

asyncTest('publishContract returns valid contract', async () => {
  const pool = new MockStorage();
  const envelope = new CanonicalEventEnvelope(pool);
  
  const contract = envelope.publishContract();
  assert.strictEqual(contract.authority_id, 'canonical-event-envelope');
  // Post-demotion: the envelope is an ingress producer, not an identity or
  // ordering authority. It must not claim deterministic_id or immutability.
  assert.ok(!contract.guarantees.includes('deterministic_id'));
  assert.ok(!contract.guarantees.includes('immutable'));
  assert.ok(contract.guarantees.includes('ingress_shaping'));
  assert.ok(contract.guarantees.includes('receipt_identifiers'));
  assert.ok(contract.guarantees.includes('tenant_isolated'));
  assert.ok(contract.invariants.some(i => /NOT a canonical event identity/.test(i)));
});

// P003: TenantRegistry Tests
console.log('\n=== P003: TenantRegistry ===');

asyncTest('executeRegisterTenant creates tenant', async () => {
  const pool = new MockStorage();
  const registry = new TenantRegistry(pool);
  
  const tenant = await registry.executeRegisterTenant({
    tenantId: 'tenant-1',
    name: 'Test Tenant',
    domains: ['test.example.com'],
    capabilities: ['auth', 'api'],
  });
  
  assert.ok(tenant);
  assert.strictEqual(pool.queries.length, 1);
});

asyncTest('executeResolveTenant returns tenant', async () => {
  const pool = new MockStorage();
  const registry = new TenantRegistry(pool);
  
  const tenant = await registry.executeResolveTenant('tenant-1');
  assert.ok(tenant);
});

asyncTest('executeListTenants returns tenants', async () => {
  const pool = new MockStorage();
  const registry = new TenantRegistry(pool);
  
  const tenants = await registry.executeListTenants();
  assert.ok(Array.isArray(tenants));
});

asyncTest('publishContract returns valid contract', async () => {
  const pool = new MockStorage();
  const registry = new TenantRegistry(pool);
  
  const contract = registry.publishContract();
  assert.strictEqual(contract.authority_id, 'tenant-registry');
  assert.ok(contract.guarantees.includes('single_source_of_truth'));
  assert.ok(contract.guarantees.includes('tenant_isolated'));
});

// P004: DeploymentRegistry Tests
console.log('\n=== P004: DeploymentRegistry ===');

asyncTest('executeRegisterDeployment creates deployment', async () => {
  const pool = new MockStorage();
  const registry = new DeploymentRegistry(pool);
  
  const deployment = await registry.executeRegisterDeployment({
    tenantId: 'tenant-1',
    version: '1.0.0',
    gitSha: 'abc123',
    containerImage: 'registry.example.com/app:1.0.0',
  });
  
  assert.ok(deployment);
  assert.strictEqual(pool.queries.length, 1);
});

asyncTest('executeResolveDeployment returns deployment', async () => {
  const pool = new MockStorage();
  const registry = new DeploymentRegistry(pool);
  
  const deployment = await registry.executeResolveDeployment('deployment-1');
  assert.ok(deployment);
});

asyncTest('executeListDeployments returns deployments', async () => {
  const pool = new MockStorage();
  const registry = new DeploymentRegistry(pool);
  
  const deployments = await registry.executeListDeployments('tenant-1');
  assert.ok(Array.isArray(deployments));
});

asyncTest('publishContract returns valid contract', async () => {
  const pool = new MockStorage();
  const registry = new DeploymentRegistry(pool);
  
  const contract = registry.publishContract();
  assert.strictEqual(contract.authority_id, 'deployment-registry');
  assert.ok(contract.guarantees.includes('single_source_of_truth'));
  assert.ok(contract.guarantees.includes('deterministic'));
});

// P005: RuntimeRegistry Tests
console.log('\n=== P005: RuntimeRegistry ===');

asyncTest('executeRegisterComponent creates component', async () => {
  const pool = new MockStorage();
  const registry = new RuntimeRegistry(pool);
  
  const component = await registry.executeRegisterComponent({
    tenantId: 'tenant-1',
    componentType: 'service',
    componentName: 'api-gateway',
    version: '1.0.0',
  });
  
  assert.ok(component);
  assert.strictEqual(pool.queries.length, 1);
});

asyncTest('executeResolveComponent returns component', async () => {
  const pool = new MockStorage();
  const registry = new RuntimeRegistry(pool);
  
  const component = await registry.executeResolveComponent('component-1');
  assert.ok(component);
});

asyncTest('executeListComponents returns components', async () => {
  const pool = new MockStorage();
  const registry = new RuntimeRegistry(pool);
  
  const components = await registry.executeListComponents('tenant-1');
  assert.ok(Array.isArray(components));
});

asyncTest('publishContract returns valid contract', async () => {
  const storage = new MockStorage();
  const registry = new RuntimeRegistry(storage);
  
  const contract = registry.publishContract();
  assert.strictEqual(contract.authority_id, 'runtime-registry');
  assert.ok(contract.guarantees.includes('single_source_of_truth'));
  assert.ok(contract.guarantees.includes('tenant_isolated'));
});

// Dependency Graph Tests
console.log('\n=== P001.5: Dependency Graph ===');

test('DependencyGraph registers authorities', () => {
  const graph = new DependencyGraph();
  graph.register('a', { dependencies: [] });
  graph.register('b', { dependencies: ['a'] });
  
  const report = graph.validate();
  assert.strictEqual(report.valid, true);
  assert.strictEqual(report.nodeCount, 2);
  assert.strictEqual(report.edgeCount, 1);
});

test('DependencyGraph detects cycle', () => {
  const graph = new DependencyGraph();
  graph.register('a', { dependencies: ['b'] });
  graph.register('b', { dependencies: ['a'] });
  
  const report = graph.validate();
  assert.strictEqual(report.valid, false);
  assert.ok(report.errors.some(e => e.type === 'DEPENDENCY_CYCLE'));
});

test('DependencyGraph detects missing dependency', () => {
  const graph = new DependencyGraph();
  graph.register('a', { dependencies: ['nonexistent'] });
  
  const report = graph.validate();
  assert.strictEqual(report.valid, false);
  assert.ok(report.errors.some(e => e.type === 'MISSING_DEPENDENCY'));
});

test('DependencyGraph computes topological order', () => {
  const graph = new DependencyGraph();
  graph.register('c', { dependencies: ['b'] });
  graph.register('b', { dependencies: ['a'] });
  graph.register('a', { dependencies: [] });
  
  const report = graph.validate();
  assert.strictEqual(report.valid, true);
  assert.deepStrictEqual(report.startupOrder, ['a', 'b', 'c']);
});

test('DependencyGraph computes hash', () => {
  const graph = new DependencyGraph();
  graph.register('a', { dependencies: [] });
  graph.register('b', { dependencies: ['a'] });
  
  const report = graph.validate();
  assert.ok(report.graphHash);
  assert.ok(typeof report.graphHash === 'string');
  assert.ok(report.graphHash.length === 64); // SHA-256
});

test('DependencyGraph detects duplicate authority ID', () => {
  const graph = new DependencyGraph();
  const authorityA = { dependencies: [], publishContract: () => ({ authority_id: 'same-id' }) };
  const authorityB = { dependencies: [], publishContract: () => ({ authority_id: 'same-id' }) };
  graph.register('a', authorityA);
  graph.register('b', authorityB);
  
  const report = graph.validate();
  assert.strictEqual(report.valid, false);
  assert.ok(report.errors.some(e => e.type === 'DUPLICATE_AUTHORITY_ID'));
});

// Platform Hash Tests
console.log('\n=== Priority 5: Platform Hash ===');

test('computePlatformHash is deterministic', () => {
  const input = {
    contracts: { a: 'hash1', b: 'hash2' },
    startupOrder: ['a', 'b'],
    graphHash: 'abc123',
    compilerVersion: '1.0.0',
  };
  
  const hash1 = computePlatformHash(input);
  const hash2 = computePlatformHash(input);
  assert.strictEqual(hash1, hash2);
});

test('computePlatformHash changes with different contracts', () => {
  const input1 = {
    contracts: { a: 'hash1' },
    startupOrder: ['a'],
    graphHash: 'abc',
    compilerVersion: '1.0.0',
  };
  
  const input2 = {
    contracts: { a: 'hash2' },
    startupOrder: ['a'],
    graphHash: 'abc',
    compilerVersion: '1.0.0',
  };
  
  const hash1 = computePlatformHash(input1);
  const hash2 = computePlatformHash(input2);
  assert.notStrictEqual(hash1, hash2);
});

test('computePlatformHash is order-independent for contracts', () => {
  const input1 = {
    contracts: { a: 'hash1', b: 'hash2' },
    startupOrder: ['a', 'b'],
    graphHash: 'abc',
    compilerVersion: '1.0.0',
  };
  
  const input2 = {
    contracts: { b: 'hash2', a: 'hash1' },
    startupOrder: ['a', 'b'],
    graphHash: 'abc',
    compilerVersion: '1.0.0',
  };
  
  const hash1 = computePlatformHash(input1);
  const hash2 = computePlatformHash(input2);
  assert.strictEqual(hash1, hash2);
});

// Run all tests
runTests();
