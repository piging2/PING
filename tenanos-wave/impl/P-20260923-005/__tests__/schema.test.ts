import {
  validateCheckpointRecord,
  isNextCheckpointId,
  versionsSeenCover,
  canonicalJson,
  CheckpointRecord,
  CheckpointSchemaError,
} from '../schema';

function goodRecord(): CheckpointRecord {
  return {
    checkpoint_id: '7',
    run_id: 'run_abc123',
    step_id: 'step_plan',
    values: {
      plan: { $ref: 'sha256:9f2c00112233445566778899aabbccddeeff00112233445566778899aabbccdd' },
      draft: { $ref: 's3://tenant-bucket/checkpoints/run_abc123/7/draft.bin' },
    },
    channel_versions: { plan: 3, draft: 1 },
    versions_seen: {
      plan: { '5': 2, '6': 3 },
      draft: { '6': 1 },
    },
  };
}

describe('validateCheckpointRecord', () => {
  test('accepts a well-formed LangGraph-shape record', () => {
    expect(() => validateCheckpointRecord(goodRecord())).not.toThrow();
  });

  test('rejects an inline string value (no inline secrets)', () => {
    const rec = goodRecord();
    (rec.values as Record<string, unknown>).api_key = 'sk-live-abcdef123456';
    expect(() => validateCheckpointRecord(rec)).toThrow(CheckpointSchemaError);
  });

  test('rejects an inline object that is not a payload ref', () => {
    const rec = goodRecord();
    (rec.values as Record<string, unknown>).config = { retries: 3 };
    expect(() => validateCheckpointRecord(rec)).toThrow(/not a payload ref/);
  });

  test('rejects a ref with extra keys (must be exactly {$ref})', () => {
    const rec = goodRecord();
    (rec.values as Record<string, unknown>).plan = {
      $ref: 'sha256:abc',
      value: 'smuggled-inline-state',
    };
    expect(() => validateCheckpointRecord(rec)).toThrow(CheckpointSchemaError);
  });

  test('rejects a malformed $ref scheme', () => {
    const rec = goodRecord();
    rec.values.plan = { $ref: 'not a ref at all' };
    expect(() => validateCheckpointRecord(rec)).toThrow(CheckpointSchemaError);
  });

  test('rejects non-monotonic-shaped checkpoint_id', () => {
    const rec = goodRecord();
    rec.checkpoint_id = '007x';
    expect(() => validateCheckpointRecord(rec)).toThrow(/checkpoint_id/);
  });

  test('rejects non-integer channel versions', () => {
    const rec = goodRecord();
    rec.channel_versions.plan = 2.5;
    expect(() => validateCheckpointRecord(rec)).toThrow(/channel_versions/);
  });

  test('rejects a non-object record (fail-closed)', () => {
    expect(() => validateCheckpointRecord(null)).toThrow(CheckpointSchemaError);
    expect(() => validateCheckpointRecord('checkpoint')).toThrow(CheckpointSchemaError);
  });
});

describe('isNextCheckpointId', () => {
  test('strictly increasing decimal ids pass', () => {
    expect(isNextCheckpointId('7', '8')).toBe(true);
    expect(isNextCheckpointId('9', '10')).toBe(true); // numeric, not lexicographic
  });

  test('equal or decreasing ids fail', () => {
    expect(isNextCheckpointId('8', '8')).toBe(false);
    expect(isNextCheckpointId('10', '9')).toBe(false);
  });

  test('malformed ids fail closed', () => {
    expect(isNextCheckpointId('7', 'x')).toBe(false);
    expect(isNextCheckpointId('', '8')).toBe(false);
  });
});

describe('versionsSeenCover', () => {
  test('lineage preserved when every version is observed somewhere', () => {
    const prev = goodRecord();
    const next = goodRecord();
    next.checkpoint_id = '8';
    next.versions_seen = { plan: { '7': 3 }, draft: { '7': 1 } };
    expect(versionsSeenCover(prev, next)).toBe(true);
  });

  test('fails when a channel version is forgotten', () => {
    const prev = goodRecord();
    const next = goodRecord();
    next.versions_seen = { plan: { '7': 2 }, draft: { '7': 1 } }; // plan regressed 3 -> 2
    expect(versionsSeenCover(prev, next)).toBe(false);
  });

  test('fails when a channel is missing from versions_seen', () => {
    const prev = goodRecord();
    const next = goodRecord();
    delete next.versions_seen.draft;
    expect(versionsSeenCover(prev, next)).toBe(false);
  });
});

describe('canonicalJson', () => {
  test('key order does not affect output (hash-stable)', () => {
    const a = goodRecord();
    const b: CheckpointRecord = {
      versions_seen: a.versions_seen,
      channel_versions: a.channel_versions,
      values: a.values,
      step_id: a.step_id,
      run_id: a.run_id,
      checkpoint_id: a.checkpoint_id,
    };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  test('different records hash differently', () => {
    const a = goodRecord();
    const b = goodRecord();
    b.checkpoint_id = '8';
    expect(canonicalJson(a)).not.toBe(canonicalJson(b));
  });
});
