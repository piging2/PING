const { UnifiedEventRuntime } = require('/home/nolan/ping/ping-runtime/events/unified_event_runtime');
const { CanonicalizationService } = require('/home/nolan/ping/ping-runtime/canonicalization/canonicalization_service');
class V {
  constructor(t) { this._t = new Set(t); }
  validateEventType(e) {
    return this._t.has(e) ? { valid: true, error: null } : { valid: false, error: 'Unknown: ' + e };
  }
}
(async () => {
  const rt = new UnifiedEventRuntime({ eventValidator: new V(['OBSERVATION_CREATED']) });
  const svc = new CanonicalizationService({ eventRuntime: rt, namespaces: { 'email-connector': 'tenant::hpp' } });
  try {
    const r = await svc.canonicalizeAndEmit({ source: 'email-connector', eventType: 'OBSERVATION_CREATED', payload: { a: 1 } });
    console.log('STATUS:', r.status, 'NS:', r.namespace, 'ERR:', r.error || '(none)');
  } catch (e) {
    console.log('THREW:', e.message);
    console.log(e.stack.split('\n').slice(0, 6).join('\n'));
  }
})();
