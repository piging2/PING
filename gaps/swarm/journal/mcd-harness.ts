import { journalPath, appendDispatchEvent } from '/home/nolan/projects/ping-fyd-converged/src/app/api/mc/_lib/mc-dispatch';

const mode = process.argv[2];
if (mode === 'unset') {
  try {
    journalPath();
    console.log('RESULT: NO_THROW');
  } catch (e: any) {
    console.log('RESULT: THROW: ' + e.message.slice(0, 60));
  }
} else if (mode === 'set') {
  console.log('RESULT: RESOLVED=' + journalPath());
} else if (mode === 'append') {
  const r = appendDispatchEvent('MC_DISPATCH_PROBE', 'jsw-q1-mcd', 'swarm probe append', { probe: 'jsw-q1' });
  console.log('RESULT: ' + r.disposition + ' ' + r.event.event_id);
  const r2 = appendDispatchEvent('MC_DISPATCH_PROBE', 'jsw-q1-mcd', 'swarm probe append', { probe: 'jsw-q1' });
  console.log('RESULT2: ' + r2.disposition + ' ' + r2.event.event_id);
}
