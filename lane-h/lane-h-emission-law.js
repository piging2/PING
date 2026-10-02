// lane-h-emission-law.js
// Falsification test for: "absence from eventTypes blocks only DISPATCH ROUTING, not EMISSION"
// No database needed: UER.emit steps 1-5 + 7-8 run without a pool (step 6 skips when no pool).
const path = require('path');
const R = '/home/nolan/worktrees/constitutional-convergence-authority-law';
const { UnifiedEventRuntime } = require(path.join(R, 'ping-runtime/events/unified_event_runtime.js'));
const { EventGovernance } = require(path.join(R, 'ping-runtime/events/event_governance.js'));
const { EventValidator } = require(path.join(R, 'ping-runtime/events/event_validator.js'));

const SIX = ['review.flagged','project.artifact_added','CUSTOMER_IMPORTED','CUSTOMER_EMAIL_SYNCED','CUSTOMER_CALENDAR_SYNCED','AI_WORKSPACE_RESULT_CREATED'];

async function main() {
  const validator = new EventValidator(R); validator.load();
  const governance = new EventGovernance(R); governance.load();
  // No pool, no legacyIngressCapability, no handlers registered.
  const uer = new UnifiedEventRuntime({ eventValidator: validator, eventGovernance: governance });

  console.log('--- A: direct UER.emit of each of the six unregistered types (expect rejection) ---');
  for (const t of SIX) {
    const r = await uer.emit(t, 'lane-h-probe', { probe: true }, { namespace: 'tenant::probe' });
    console.log(t, '=>', JSON.stringify({ status: r.status, code: r.code, error: r.error }));
  }

  console.log('--- B: direct UER.emit of REGISTERED type with ZERO handlers (expect ok) ---');
  const ok1 = await uer.emit('LEAD_CREATED', 'lane-h-probe', { probe: true }, { namespace: 'tenant::probe' });
  console.log('LEAD_CREATED (no handlers) =>', JSON.stringify({ status: ok1.status, event_id: ok1.eventId, event_type: ok1.event && ok1.event.event_type }));

  console.log('--- C: registered type WITH a dispatch handler (expect handler fired) ---');
  let fired = 0;
  uer.on('LEAD_CREATED', async () => { fired++; });
  const ok2 = await uer.emit('LEAD_CREATED', 'lane-h-probe', { probe: true }, { namespace: 'tenant::probe' });
  console.log('LEAD_CREATED (1 handler) =>', JSON.stringify({ status: ok2.status, handlerFired: fired }));

  console.log('--- D: stats ---');
  console.log(JSON.stringify(uer.getStats()));
}
main().catch(e => { console.error('FATAL', e); process.exit(2); });
