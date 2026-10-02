/**
 * P-20260923-002: Run identity + journal vocabulary tests.
 * Run: jest --config src/tenanos/jest.config.cjs src/tenanos/__tests__/runs-schema.test.ts
 */
import { describe, expect, test } from '@jest/globals';
import {
  JournalEntryKind,
  RUN_IDENTITY_SCHEMA_SQL,
  RUN_JOURNAL_SCHEMA_SQL,
  RunOutcome,
  isJournalEntryKind,
  mintJournalRef,
  nextJournalSeq,
  validateJournalEntry,
  validateRunRow,
} from '../runs/schema';

describe('RUN_IDENTITY_SCHEMA_SQL', () => {
  test('creates the base attempt table idempotently', () => {
    expect(RUN_IDENTITY_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS tenanos_run_attempts');
    expect(RUN_IDENTITY_SCHEMA_SQL).toContain('attempt_id   TEXT PRIMARY KEY');
  });

  test('carries the columns 103 assumes and the 002-novel columns', () => {
    for (const col of [
      'attempt_id',
      'tenant_id',
      'mission_id',
      'attempt_number',
      'worker_name',
      'started_at',
      'ended_at',
      'outcome',
      'evidence_refs',
      'journal_ref',
    ]) {
      expect(RUN_IDENTITY_SCHEMA_SQL).toContain(col);
    }
    expect(RUN_IDENTITY_SCHEMA_SQL).toContain('UNIQUE (mission_id, attempt_number)');
  });

  test('keeps 095 outcome vocabulary as the CHECK backstop', () => {
    expect(RUN_IDENTITY_SCHEMA_SQL).toContain(
      "CHECK (outcome IN ('started','succeeded','failed','unknown'))",
    );
  });

  test('does NOT define 103-owned mechanics columns (single ownership)', () => {
    for (const col of ['fencing_token', 'lease_until', 'checkpoint_seq', 'input_digest']) {
      expect(RUN_IDENTITY_SCHEMA_SQL).not.toContain(col);
    }
    // 'status' as a column definition must not appear; the word may occur in prose only.
    expect(RUN_IDENTITY_SCHEMA_SQL).not.toMatch(/^\s*status\s+TEXT/m);
  });
});

describe('RUN_JOURNAL_SCHEMA_SQL', () => {
  test('creates the journal table with the six-kind vocabulary', () => {
    expect(RUN_JOURNAL_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS tenanos_run_journal');
    expect(RUN_JOURNAL_SCHEMA_SQL).toContain(
      "CHECK (kind IN ('input','output','state','call','sleep','awaitable'))",
    );
    expect(RUN_JOURNAL_SCHEMA_SQL).toContain('PRIMARY KEY (journal_ref, seq)');
  });

  test('all six kinds are represented in the TS enum', () => {
    expect(Object.values(JournalEntryKind)).toHaveLength(6);
    for (const k of ['input', 'output', 'state', 'call', 'sleep', 'awaitable']) {
      expect(isJournalEntryKind(k)).toBe(true);
    }
    expect(isJournalEntryKind('dream')).toBe(false);
  });
});

describe('mintJournalRef', () => {
  test('deterministic per attempt', () => {
    expect(mintJournalRef('a1')).toBe('jrnl:a1');
    expect(mintJournalRef('a1')).toBe(mintJournalRef('a1'));
  });
  test('rejects empty attempt id (fail-closed)', () => {
    expect(() => mintJournalRef('')).toThrow();
  });
});

describe('validateJournalEntry', () => {
  const good = {
    journal_ref: 'jrnl:a1',
    seq: 0,
    kind: 'call',
    payload: { tool: 'send_sms' },
  };

  test('accepts a valid entry', () => {
    const e = validateJournalEntry(good);
    expect(e.kind).toBe(JournalEntryKind.CALL);
    expect(e.seq).toBe(0);
  });

  test.each(['input', 'output', 'state', 'call', 'sleep', 'awaitable'])(
    'accepts kind %s',
    (kind: string) => {
      expect(validateJournalEntry({ ...good, kind }).kind).toBe(kind);
    },
  );

  test('rejects unknown kind (fail-closed)', () => {
    expect(() => validateJournalEntry({ ...good, kind: 'teleport' })).toThrow();
  });

  test('rejects negative / non-integer seq', () => {
    expect(() => validateJournalEntry({ ...good, seq: -1 })).toThrow();
    expect(() => validateJournalEntry({ ...good, seq: 1.5 })).toThrow();
  });

  test('rejects non-object payload and missing journal_ref', () => {
    expect(() => validateJournalEntry({ ...good, payload: 'nope' })).toThrow();
    expect(() => validateJournalEntry({ ...good, payload: ['x'] })).toThrow();
    expect(() => validateJournalEntry({ ...good, journal_ref: '' })).toThrow();
  });
});

describe('nextJournalSeq', () => {
  test('monotonic from -1 (empty journal)', () => {
    expect(nextJournalSeq(-1)).toBe(0);
    expect(nextJournalSeq(41)).toBe(42);
  });
  test('rejects invalid cursors', () => {
    expect(() => nextJournalSeq(-2)).toThrow();
    expect(() => nextJournalSeq(1.5)).toThrow();
  });
});

describe('validateRunRow', () => {
  const good = {
    attempt_id: 'a1',
    tenant_id: 'tenant::a',
    mission_id: 'm1',
    attempt_number: 1,
    outcome: 'started',
  };

  test('accepts a minimal valid row with defaults', () => {
    const r = validateRunRow(good);
    expect(r.attempt_id).toBe('a1');
    expect(r.tenant_id).toBe('tenant::a');
    expect(r.outcome).toBe(RunOutcome.STARTED);
    expect(r.evidence_refs).toEqual([]);
    expect(r.journal_ref).toBeNull();
  });

  test('rejects unknown outcome and missing identity fields', () => {
    expect(() => validateRunRow({ ...good, outcome: 'vibing' })).toThrow();
    expect(() => validateRunRow({ ...good, attempt_id: '' })).toThrow();
    expect(() => validateRunRow({ ...good, tenant_id: '' })).toThrow();
    expect(() => validateRunRow({ ...good, attempt_number: 1.5 })).toThrow();
  });
});
