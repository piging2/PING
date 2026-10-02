// dlq-repro.js — minimal repro of the recordDeadLetter serialize failure.
// Uses the REAL DeadLetterAuthority and REAL WitnessAuthority with a stub PG pool.
const { DeadLetterAuthority } = require('/app/gateway/dead_letter_authority.js');

const fakePool = {
  async query(sql, params) {
    console.log('QUERY OK, params=' + params.length);
    return { rows: [] };
  }
};

const dla = new DeadLetterAuthority(fakePool);
const job = {
  job_id: 'phase12-dlq-repro-job',
  job_type: 'PHASE12_RETRY_PROBE',
  mission_id: 'phase12-dlq-repro-mission',
  execution_id: 'exec-1',
  correlation_id: 'phase12-2026-09-17',
  causation_id: null,
  authority: 'MissionScheduler',
  authority_version: '1.0.0',
  created_at: Date.now(),
  retry_count: 2,
  payload: { probe: 'always-fail' }
};

(async () => {
  try {
    const id = await dla.recordDeadLetter(job, new Error('phase12 probe: always fails'));
    console.log('REPRO RESULT: recordDeadLetter SUCCEEDED id=' + id);
  } catch (e) {
    console.log('REPRO RESULT: recordDeadLetter THREW: ' + e.message);
  }
})();
