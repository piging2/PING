// Prove the 5 boundary-suite failures are environmental (no DB pool),
// by running the ORIGINAL (pre-fix) service from git HEAD.
const { CanonicalizationService } = require('/tmp/orig-svc.js');
const { UnifiedEventRuntime } = require('/home/nolan/ping/ping-runtime/events/unified_event_runtime');
class V { validateEventType() { return { valid: true, error: null }; } }
(async () => {
  const s = new CanonicalizationService({
    eventRuntime: new UnifiedEventRuntime({ eventValidator: new V() }),
  });
  const r = await s.canonicalizeAndEmit({ source: 's', eventType: 'T', payload: {} });
  console.log('ORIGINAL-CODE status:', r.status, '| namespace:', r.namespace, '| error:', r.error);
})();
