#!/bin/bash
# LANE 13 repro: jev NAMESPACE_OWNERS fix security assessment.
# Hermetic and safe: read-only docker cp of three gateway files, fake pg pool,
# no network sends, no writes to the container, no secrets.
# Usage: ./jev-fix-assessment.sh
# Runs the ACTUAL live-container modules (UnifiedEventRuntime.emit +
# EventGovernance) against a fake pool, comparing CURRENT code (no jev key)
# vs PATCHED code (one-line addition: jev: 'PING').
set -u
PIGWSL=~/workspace/pig-fb/pigwsl-exec.sh

$PIGWSL -s << 'PIGEOF'
set -u
R=/tmp/jev-repro-$$
mkdir -p "$R/ping-runtime/events" "$R/ping-runtime/authorities" "$R/runtime/kernel/authorities" "$R/gateway/generated"
docker cp ping-gateway:/app/ping-runtime/events/unified_event_runtime.js "$R/ping-runtime/events/unified_event_runtime.js"
docker cp ping-gateway:/app/ping-runtime/events/event_governance.js "$R/ping-runtime/events/event_governance.js"
docker cp ping-gateway:/app/ping-runtime/authorities/constitutional_time_authority.js "$R/ping-runtime/authorities/constitutional_time_authority.js"
docker cp ping-gateway:/app/runtime/kernel/authorities/. "$R/runtime/kernel/authorities/"
# PATCHED variant: exactly the proposed fix, one added map line.
sed "s/^  fyd: 'FYD',$/  fyd: 'FYD',\n  jev: 'PING',/" "$R/ping-runtime/events/event_governance.js" > "$R/ping-runtime/events/event_governance_patched.js"
grep -n "jev:" "$R/ping-runtime/events/event_governance_patched.js"
# Minimal registry: the JEV entry as registered in the live image.
cat > "$R/gateway/generated/event_registry.json" << 'REG'
{"events": [
  {"event_type": "JEV_DECISION_EVALUATED", "authority_owner": "JevShadowWorker", "event_class": "verdict", "source": "jev"}
]}
REG
cat > "$R/run.js" << 'RUNJS'
// Stub the time authority: timestamps play no role in verdict/governance
// admission, and this keeps the repro hermetic (no deep container tree).
const Module = require('module');
const stubTime = { constitutionalTimeAuthority: { nowAsISOString: () => new Date().toISOString() } };
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/constitutional_time_authority/.test(request) || /constitutional_clock/.test(request)) return stubTime;
  return origLoad.call(this, request, parent, isMain);
};
const { UnifiedEventRuntime } = require('/tmp/REPL/ping-runtime/events/unified_event_runtime.js');
const { EventGovernance } = require('/tmp/REPL/ping-runtime/events/event_governance.js');
const { EventGovernance: GovPatched } = require('/tmp/REPL/ping-runtime/events/event_governance_patched.js');
const fakePool = () => ({ query: async () => ({ rowCount: 1, rows: [] }) });
const goodPayload = { mode: 'shadow', evaluations: [{ provider: 'rule', decision: { decision: 'grant' } }] };
async function main() {
  const gov = new EventGovernance('/tmp/REPL'); gov.load();
  const govP = new GovPatched('/tmp/REPL'); govP.load();
  const rt = new UnifiedEventRuntime({ pool: fakePool(), eventGovernance: gov });
  const rtP = new UnifiedEventRuntime({ pool: fakePool(), eventGovernance: govP });
  const cases = [
    ['genuine producer', rt, 'JEV_DECISION_EVALUATED', 'jev-shadow', goodPayload, {}],
    ['external-seam forgery (POST /events forces source=api)', rt, 'JEV_DECISION_EVALUATED', 'api', goodPayload, {}],
    ['in-process worker spoof', rt, 'JEV_DECISION_EVALUATED', 'classification', goodPayload, {}],
    ['genuine producer, bad shape', rt, 'JEV_DECISION_EVALUATED', 'jev-shadow', { mode: 'shadow' }, {}],
  ];
  const casesP = [
    ['genuine producer', rtP, 'JEV_DECISION_EVALUATED', 'jev-shadow', goodPayload, {}],
    ['external-seam forgery (POST /events forces source=api)', rtP, 'JEV_DECISION_EVALUATED', 'api', goodPayload, {}],
    ['in-process worker spoof (string source only)', rtP, 'JEV_DECISION_EVALUATED', 'jev-shadow', goodPayload, {}],
    ['in-process forger, wrong source string', rtP, 'JEV_DECISION_EVALUATED', 'classification', goodPayload, {}],
    ['genuine producer, bad shape', rtP, 'JEV_DECISION_EVALUATED', 'jev-shadow', { mode: 'shadow' }, {}],
    ['bridge bypass attempt (_skipGovernance)', rtP, 'JEV_DECISION_EVALUATED', 'repository_events', goodPayload, { _skipGovernance: true }],
  ];
  console.log('=== CURRENT (no jev key) ===');
  for (const [n, r, t, s, p, o] of cases) {
    const res = await r.emit(t, s, p, o);
    console.log(`${res.status === 'ok' ? 'EMITTED ' : 'REJECTED'} ${n}: ${res.status === 'ok' ? res.eventId.slice(0, 12) : res.error}`);
  }
  console.log('=== PATCHED (jev: PING added) ===');
  for (const [n, r, t, s, p, o] of casesP) {
    const res = await r.emit(t, s, p, o);
    console.log(`${res.status === 'ok' ? 'EMITTED ' : 'REJECTED'} ${n}: ${res.status === 'ok' ? res.eventId.slice(0, 12) : res.error}`);
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
RUNJS
sed -i "s|/tmp/REPL|$R|g" "$R/run.js"
node "$R/run.js"
rm -rf "$R"
PIGEOF
