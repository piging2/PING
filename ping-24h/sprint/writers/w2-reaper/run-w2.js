'use strict';
/* W2 runner: hostile fixture-02 + targeted predicate tests against a ce002 MissionRuntime. */
const fs = require('fs');
const { f02, targeted, IMPL } = require('./harness/h-ce002.js');

(async () => {
  const src = fs.readFileSync(IMPL, 'utf8');
  const where = src.match(/async reapExpiredLeases\(\)[\s\S]*?WHERE([\s\S]*?)RETURNING/);
  console.log(`IMPL: ${IMPL}`);
  console.log(`reaper WHERE:${where ? where[1].replace(/\s+/g, ' ').trim() : 'NOT FOUND'}`);
  console.log('---');

  const r1 = await f02();
  console.log(`fixture-02 (hostile): ${r1.verdict}`);
  for (const e of r1.evidence) console.log(`  ${e}`);
  console.log('---');
  const r2 = await targeted();
  console.log(`targeted predicate cells: ${r2.verdict}`);
  for (const e of r2.evidence) console.log(`  ${e}`);
  console.log('---');
  const overall = (r1.verdict === 'CORRECT' && r2.verdict === 'CORRECT') ? 'ALL CORRECT' : 'HOSTILE REACHED';
  console.log(`OVERALL: ${overall}`);
  process.exit(0);
})().catch(e => { console.error('RUNNER ERROR', e); process.exit(2); });
