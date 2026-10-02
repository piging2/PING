/**
 * Lane F boot smoke: GatewayToKernelAdapter boot path (2026-09-19).
 *
 * Caller-adaptation lane. The adapter is boot-wired in
 * gateway/bootstrap/composition/core_event_spine.js:37. Boot = construction +
 * initialize(). No appendEvent happens at boot, so the EventRepository
 * acceptance gate must not throw during boot. This smoke asserts exactly
 * that: initialize() completes with a mock pool and no
 * UnanchoredCanonicalWriteError is raised.
 *
 * Run: node runtime/kernel/test_adapter_boot_smoke_2026-09-19.js (from worktree root)
 */

'use strict';

const assert = require('assert');
const { GatewayToKernelAdapter } = require('./gateway_adapter');

class MockClient {
  async query() { return { rows: [], rowCount: 0 }; }
  release() {}
}
class MockPool {
  async connect() { return new MockClient(); }
  async query() { return { rows: [], rowCount: 0 }; }
}

(async () => {
  let passed = 0;
  try {
    const adapter = new GatewayToKernelAdapter(new MockPool());
    await adapter.initialize();
    assert.ok(adapter.getPipeline(), 'pipeline should be constructed');
    assert.ok(adapter.getEventRepository(), 'event repository should be constructed');
    await adapter.shutdown();
    passed = 1;
    console.log('  PASS BOOT-1 GatewayToKernelAdapter boot completes without gate error');
  } catch (e) {
    console.log('  FAIL BOOT-1 GatewayToKernelAdapter boot :: ' + e.name + ': ' + e.message + (e.code ? ' [' + e.code + ']' : ''));
    if (e.code === 'EVENT_REPOSITORY_UNANCHORED_WRITE') {
      console.log('  GATE ERROR AT BOOT: the acceptance gate fired during boot; caller adaptations incomplete');
    }
    process.exit(1);
  }
  console.log('\n' + passed + ' passed, 0 failed');
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
