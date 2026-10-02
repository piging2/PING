const { validateAuthority } = require('./ping-runtime/authorities/constitutional_validation');
const { CanonicalEventEnvelope } = require('./gateway/canonical_event_envelope');
const c = new CanonicalEventEnvelope(null).publishContract();
const r = validateAuthority(c);
console.log(JSON.stringify(r, null, 1));
