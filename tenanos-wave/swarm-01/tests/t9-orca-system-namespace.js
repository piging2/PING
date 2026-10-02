#!/usr/bin/env node
// SWARM-01 T9: ORCA control loop executes in the system namespace (no tenant).
// REAL code path: static read of the deployed control-loop source.
// Synthetic fixtures only. Read-only: no network, no DB.
const SUBSTRATE = process.env.PING_SUBSTRATE || '/home/nolan/ping';
const path = require('path');
const fs = require('fs');

async function main() {
  const loopPath = process.env.ORCA_LOOP || path.join(SUBSTRATE, '..', 'workspace', 'orca-remediation', 'orca_control_loop.js');
  const src = fs.readFileSync(loopPath, 'utf8');

  const hardcoded = /const NAMESPACE = 'core::system'/.test(src);
  const authorizeUsesNamespace = /authorizeWorkOrder\(\{[^}]*namespace: NAMESPACE/.test(src);
  const tenantThreaded = /(tenantId|tenant_id)[^=]*=.*options|payload\._tenant_id/.test(src);

  console.log('NAMESPACE hardcoded to core::system =>', hardcoded);
  console.log('work-order authorization uses that namespace =>', authorizeUsesNamespace);
  console.log('tenant identity threaded through loop =>', tenantThreaded);

  if (hardcoded && authorizeUsesNamespace && !tenantThreaded) {
    console.log('LEAK DEMONSTRATED T9: the autonomous loop authorizes and executes ALL work as core::system; tenant work is indistinguishable from system work (system-namespace laundering by design).');
  } else {
    console.log('BOUNDARY HOLDS T9: loop carries tenant identity.');
  }
}

main().catch((e) => { console.error('HARNESS ERROR T9:', e.message); process.exit(2); });
