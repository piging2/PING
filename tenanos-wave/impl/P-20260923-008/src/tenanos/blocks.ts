/**
 * blocks.ts — context budget blocks + typed budget overview (P-20260923-008).
 *
 * Letta ContextBlocks pattern:
 *  - Reserved blocks (persona, identity, standing instructions) carry char
 *    limits and are readOnly by default; editable blocks (task state,
 *    scratch notes) may be written by the agent.
 *  - Char limits are enforced at WRITE time: an over-limit write is
 *    rejected, never silently truncated (silent truncation corrupts
 *    meaning while reporting success).
 *  - readOnly is enforced at write time.
 *  - Memory edits are fail-closed exact-match: an edit applies only when
 *    the supplied expected text matches the current content byte-for-byte.
 *    No fuzzy matching, no best-effort application.
 *  - The ContextBudget overview is computed by the assembler and returned
 *    deeply frozen: it is read-only to the agent, never a write surface.
 *
 * Composition with P-20260923-090 (execution budgets): the overview accepts
 * an optional ceilingChars injected by the caller. That is the seam where
 * 090's run-ledger `context` dimension feeds in. This module never imports
 * budgets.ts; the ledger owns the ceiling, the assembler owns the report.
 *
 * Pure and deterministic. No I/O, no imports.
 */

export type BlockKind = 'reserved' | 'editable';

export interface ContextBlock {
  name: string;
  kind: BlockKind;
  readOnly: boolean;
  charLimit: number;
  content: string;
}

export type BlockErrorCode =
  | 'INVALID_BLOCK'
  | 'UNKNOWN_BLOCK'
  | 'READ_ONLY'
  | 'LIMIT_EXCEEDED'
  | 'EDIT_MISMATCH';

export type BlockResult =
  | { ok: true; blocks: readonly ContextBlock[] }
  | { ok: false; error: BlockErrorCode; detail: string };

function fail(error: BlockErrorCode, detail: string): BlockResult {
  return { ok: false, error, detail };
}

/**
 * Create a block. Reserved blocks default to readOnly; editable blocks
 * default to writable. charLimit must be positive; name non-empty.
 */
export function createBlock(
  name: string,
  kind: BlockKind,
  charLimit: number,
  content = '',
  readOnly?: boolean,
): ContextBlock {
  if (name.length === 0) {
    throw new Error('block name must be non-empty');
  }
  if (!Number.isInteger(charLimit) || charLimit <= 0) {
    throw new Error('charLimit must be a positive integer');
  }
  if (content.length > charLimit) {
    throw new Error('initial content exceeds charLimit');
  }
  return {
    name,
    kind,
    readOnly: readOnly ?? kind === 'reserved',
    charLimit,
    content,
  };
}

function findBlock(
  blocks: readonly ContextBlock[],
  name: string,
): ContextBlock | undefined {
  return blocks.find((b) => b.name === name);
}

function replaceBlock(
  blocks: readonly ContextBlock[],
  next: ContextBlock,
): readonly ContextBlock[] {
  return blocks.map((b) => (b.name === next.name ? next : b));
}

/**
 * Replace a block's content wholesale. readOnly blocks reject; over-limit
 * content rejects (no silent truncation); unknown names reject.
 */
export function writeBlock(
  blocks: readonly ContextBlock[],
  name: string,
  content: string,
): BlockResult {
  const block = findBlock(blocks, name);
  if (!block) {
    return fail('UNKNOWN_BLOCK', `no block named '${name}'`);
  }
  if (block.readOnly) {
    return fail('READ_ONLY', `block '${name}' is read-only`);
  }
  if (content.length > block.charLimit) {
    return fail(
      'LIMIT_EXCEEDED',
      `block '${name}': ${content.length} chars exceeds limit ${block.charLimit}; write rejected, content unchanged`,
    );
  }
  return { ok: true, blocks: replaceBlock(blocks, { ...block, content }) };
}

/**
 * Fail-closed exact-match edit. Applies only when `expected` matches the
 * current content byte-for-byte. A mismatch is a denial, not a search
 * problem: the caller must re-read and retry with the exact text.
 */
export function editBlock(
  blocks: readonly ContextBlock[],
  name: string,
  expected: string,
  replacement: string,
): BlockResult {
  const block = findBlock(blocks, name);
  if (!block) {
    return fail('UNKNOWN_BLOCK', `no block named '${name}'`);
  }
  if (block.readOnly) {
    return fail('READ_ONLY', `block '${name}' is read-only`);
  }
  if (block.content !== expected) {
    return fail(
      'EDIT_MISMATCH',
      `block '${name}': expected text does not match current content byte-for-byte; edit rejected, content unchanged`,
    );
  }
  if (replacement.length > block.charLimit) {
    return fail(
      'LIMIT_EXCEEDED',
      `block '${name}': ${replacement.length} chars exceeds limit ${block.charLimit}; edit rejected, content unchanged`,
    );
  }
  return { ok: true, blocks: replaceBlock(blocks, { ...block, content: replacement }) };
}

export interface BlockUsage {
  name: string;
  kind: BlockKind;
  readOnly: boolean;
  usedChars: number;
  limitChars: number;
}

export interface ContextBudgetOverview {
  blocks: readonly BlockUsage[];
  totalUsedChars: number;
  totalLimitChars: number;
  /** Present only when the caller injected a ledger ceiling (090 seam). */
  ceilingChars: number | null;
  remainingChars: number | null;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * Assemble the typed budget overview. The returned object is deeply frozen:
 * it is read-only to the agent. Pass ceilingChars from the execution-budget
 * ledger (P-20260923-090 `context` dimension) to report remaining headroom.
 */
export function assembleOverview(
  blocks: readonly ContextBlock[],
  ceilingChars?: number,
): ContextBudgetOverview {
  const usage: BlockUsage[] = blocks.map((b) => ({
    name: b.name,
    kind: b.kind,
    readOnly: b.readOnly,
    usedChars: b.content.length,
    limitChars: b.charLimit,
  }));
  const totalUsedChars = usage.reduce((n, u) => n + u.usedChars, 0);
  const totalLimitChars = usage.reduce((n, u) => n + u.limitChars, 0);
  const ceiling = ceilingChars ?? null;
  return deepFreeze({
    blocks: usage,
    totalUsedChars,
    totalLimitChars,
    ceilingChars: ceiling,
    remainingChars: ceiling === null ? null : ceiling - totalUsedChars,
  });
}
