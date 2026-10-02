const { KernelReplayExecutionProvider } = require('/home/nolan/ping/worktrees/jev-surgical/gateway/kernel_replay_execution_provider.js');
(async () => {
  const p = new KernelReplayExecutionProvider();
  const transcript = {
    state: {
      replay_events: [
        {
          event_id: 'evt-c1',
          event_type: 'CLAIM_CREATED',
          payload: { documentId: 'doc-golden', claim: { text: 'test claim' } },
          metadata: { correlation_id: 'corr-golden', causation_id: null },
          timestamp: '2026-09-23T00:00:00.000Z',
        },
      ],
    },
  };
  const r = await p.executeReplay(transcript);
  console.log(JSON.stringify({ status: r.status, violations: r.violations, fingerprint: r.fingerprint ? String(r.fingerprint).slice(0, 40) : r.fingerprint, keys: Object.keys(r) }, null, 2));
})().catch((e) => { console.error('PROBE FAILED', e.message); process.exit(1); });
