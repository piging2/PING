'use strict';
/**
 * Lane F harness — refresh/replay parity checks (design §3).
 *
 * Refresh (3A): the read path is re-executed in a FRESH node process over
 * the same journal bytes (the synthetic analog of clearing caches and
 * restarting the reader). Byte-identical output proves no status or
 * evidence value lived only in process memory.
 *
 * Replay (3B): deleting derived state and re-running the projector over the
 * same journal bytes with the same --as-of yields byte-identical output.
 *
 * Negative control: appending one synthetic event to a COPY of the journal
 * must change the projection (proves the replay is sensitive to the
 * journal, not returning a cached document).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { projectJournalFile, stableStringify } = require('./projector');

const LIB_DIR = __dirname;

function projectInFreshProcess(journalPath, asOf) {
  const script = `
const { projectJournalFile, stableStringify } = require(${JSON.stringify(path.join(LIB_DIR, 'projector.js'))});
const doc = projectJournalFile(${JSON.stringify(journalPath)}, ${JSON.stringify(asOf)});
process.stdout.write(stableStringify(doc));
`;
  const r = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 30000 });
  if (r.error) throw new Error('fresh-process projection failed: ' + String(r.error));
  if (r.status !== 0) throw new Error('fresh-process projection exit ' + r.status + ': ' + (r.stderr || '').slice(0, 500));
  return r.stdout;
}

async function refreshReplayParity({ journalPath, bundle, asOf }) {
  // 1. Baseline projection (this process).
  const doc1 = projectJournalFile(journalPath, asOf);
  const s1 = stableStringify(doc1);
  bundle.write('projection.json', JSON.parse(s1));

  // 2. Refresh: fresh process, same journal bytes.
  const s2 = projectInFreshProcess(journalPath, asOf);
  const refreshParity = s1 === s2;
  bundle.write('refresh-parity.json', {
    check: 're-projection in a fresh process over identical journal bytes',
    byte_identical: refreshParity,
    projection_sha256: require('crypto').createHash('sha256').update(s1, 'utf8').digest('hex'),
  });

  // 3. Replay: delete derived state, re-run, byte-compare.
  fs.unlinkSync(path.join(bundle.dir, 'projection.json'));
  const doc3 = projectJournalFile(journalPath, asOf);
  const s3 = stableStringify(doc3);
  bundle.write('projection.json', JSON.parse(s3));
  const replayParity = s1 === s3;

  // 4. Negative control: one appended event on a COPY must change the projection.
  const copyPath = journalPath + '.negctl.jsonl';
  fs.copyFileSync(journalPath, copyPath);
  fs.appendFileSync(copyPath, JSON.stringify({
    event_id: 'mc-d-negative-control-0001',
    timestamp: new Date(Date.parse(asOf) + 60000).toISOString(),
    event_type: 'MC_ARTIFACT_PUBLISHED',
    aggregate_id: 'mc:mission:negative-control-mission',
    aggregate_type: 'mc_mission',
    event_data: {
      mission_id: 'negative-control-mission', backfill: false,
      summary: 'negative control artifact', kind: 'note', path: '/tmp/neg', sha256: 'deadbeef',
    },
  }) + '\n', 'utf8');
  const s4 = stableStringify(projectJournalFile(copyPath, asOf));
  fs.unlinkSync(copyPath);
  const negativeControl = s4 !== s1;

  bundle.write('replay-parity.json', {
    check: 'delete derived state; re-project same journal bytes with same as-of',
    byte_identical: replayParity,
    negative_control_appended_event_changes_projection: negativeControl,
  });

  return { refreshParity, replayParity, negativeControl };
}

module.exports = { refreshReplayParity, projectInFreshProcess };
