#!/usr/bin/env node
/**
 * review-drafts.js (Wave H16) - read-only CLI over the H14 social_draft_review surface.
 *
 * Lets an operator look at social_drafts rows without any UI or HTTP wiring:
 *   node scripts/review-drafts.js list [--platform x|facebook] [--variant <name>] [--event <source_event_id>] [--limit <n>]
 *   node scripts/review-drafts.js show <draft_id>
 *   node scripts/review-drafts.js --help
 *
 * Hard constraints (same as H14, enforced not just documented):
 * - READ-ONLY. All reads go through createSocialDraftReview(), whose guard
 *   rejects any non-SELECT statement before it reaches the database. This file
 *   contains no mutation path: no INSERT/UPDATE/DELETE, no status change, no
 *   publish, no new stores, no external sends.
 * - Connection reuses the tree's existing Postgres conventions via
 *   PostgresApprovalStore.fromEnv (PING_APPROVAL_PG_URL or DATABASE_URL win;
 *   otherwise POSTGRES_HOST/PORT/DB/USER/PASSWORD). Only the pool is taken
 *   from the store; initializeSchema() is NEVER called from this file.
 * - Requires 'pg' to be resolvable (install deps or set NODE_PATH).
 *
 * Exit codes: 0 ok | 1 runtime failure (unknown draft, connection error) |
 * 2 usage / bad argument.
 */

const path = require('path');

const {
  createSocialDraftReview,
  REVIEW_PLATFORMS,
  REVIEW_VARIANTS,
  DRAFT_ID_PATTERN,
} = require(path.join(
  __dirname,
  '..',
  'runtime',
  'kernel',
  'projections',
  'social_draft_review.js'
));
const {
  SOCIAL_DRAFT_PLATFORMS,
} = require(path.join(
  __dirname,
  '..',
  'runtime',
  'kernel',
  'projections',
  'social_draft_projection.js'
));
const {
  PostgresApprovalStore,
} = require(path.join(
  __dirname,
  '..',
  'ping-runtime',
  'approval',
  'postgres_approval_store.js'
));

const USAGE =
  'Usage:\n' +
  '  node scripts/review-drafts.js list [--platform <name>] [--variant <name>] [--event <source_event_id>] [--limit <n>]\n' +
  '  node scripts/review-drafts.js show <draft_id>\n' +
  '  node scripts/review-drafts.js --help\n' +
  '\n' +
  'Platforms: ' + REVIEW_PLATFORMS.join(', ') + '\n' +
  'Variants:  ' + REVIEW_VARIANTS.join(', ') + '\n' +
  'Default limit: 50 (max 500).\n' +
  'Connection: PING_APPROVAL_PG_URL, DATABASE_URL, or POSTGRES_HOST/PORT/DB/USER/PASSWORD.\n';

function failUsage(message) {
  if (message) {
    process.stderr.write('error: ' + message + '\n\n');
  }
  process.stderr.write(USAGE);
  process.exit(2);
}

function parseListArgs(argv) {
  const filters = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--platform' || arg === '--variant' || arg === '--event' || arg === '--limit') {
      const value = argv[i + 1];
      if (value === undefined || value.indexOf('--') === 0) {
        failUsage(arg + ' requires a value');
      }
      i++;
      if (arg === '--platform') {
        filters.platform = value;
      } else if (arg === '--variant') {
        filters.variant = value;
      } else if (arg === '--event') {
        filters.source_event_id = value;
      } else {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1) {
          failUsage('--limit must be a positive integer');
        }
        filters.limit = n;
      }
    } else {
      failUsage('unknown argument "' + arg + '"');
    }
  }
  // Bad flag values are usage errors (exit 2) with the allowed sets printed in --help.
  if (filters.platform !== undefined && REVIEW_PLATFORMS.indexOf(filters.platform) === -1) {
    failUsage('unknown platform "' + filters.platform + '" (expected one of: ' + REVIEW_PLATFORMS.join(', ') + ')');
  }
  if (filters.variant !== undefined && REVIEW_VARIANTS.indexOf(filters.variant) === -1) {
    failUsage('unknown variant "' + filters.variant + '" (expected one of: ' + REVIEW_VARIANTS.join(', ') + ')');
  }
  if (filters.platform !== undefined && filters.variant !== undefined &&
      SOCIAL_DRAFT_PLATFORMS[filters.platform].indexOf(filters.variant) === -1) {
    failUsage('variant "' + filters.variant + '" does not exist on platform "' + filters.platform + '"');
  }
  return filters;
}

function fmtLine(label, value) {
  return '  ' + label + ': ' + (value === null || value === undefined ? '(none)' : value) + '\n';
}

function printListRow(draft) {
  const subject = draft.derived_subject ? '"' + draft.derived_subject + '"' : '(no subject)';
  process.stdout.write(
    '- ' + draft.draft_id + ' [' + draft.platform + ' / ' + draft.variant + '] ' +
      'subject: ' + subject + '\n' +
      fmtLine('event', draft.source_event_id) +
      fmtLine('created', draft.created_at)
  );
}

function printDraftFull(draft) {
  const out = [];
  out.push('draft_id:   ' + draft.draft_id);
  out.push('platform:   ' + draft.platform);
  out.push('variant:    ' + draft.variant);
  out.push('status:     ' + draft.status);
  out.push('subject:    ' + (draft.derived_subject ? '"' + draft.derived_subject + '"' : '(none)'));
  out.push('event:      ' + draft.source_event_id);
  out.push('pack:       ' + (draft.context_pack_id || '(none)'));
  out.push('created:    ' + draft.created_at);
  out.push('evidence refs:');
  draft.evidence_refs.forEach((ref) => out.push('  - ' + ref));
  const copy = draft.copy || {};
  out.push('copy:');
  if (copy.headline) {
    out.push('  headline: ' + copy.headline);
  }
  out.push('  body:');
  (copy.body || '').split('\n').forEach((line) => out.push('    ' + line));
  if (copy.cta) {
    out.push('  cta: ' + copy.cta);
  }
  process.stdout.write(out.join('\n') + '\n');
}

async function connectReadOnly() {
  // fromEnv picks up PING_APPROVAL_PG_URL / DATABASE_URL / POSTGRES_*.
  // initialize() opens the pg pool only; the approval schema bootstrap
  // (initializeSchema) is intentionally never called here.
  const store = PostgresApprovalStore.fromEnv();
  await store.initialize();
  const review = createSocialDraftReview(store._pool);
  return { store: store, review: review };
}

async function closeStore(store) {
  if (store && store._pool && typeof store._pool.end === 'function') {
    await store._pool.end();
  }
}

async function cmdList(filters) {
  const { store, review } = await connectReadOnly();
  try {
    const drafts = await review.list_drafts(filters);
    if (drafts.length === 0) {
      process.stdout.write('No drafts match these filters.\n');
      return;
    }
    drafts.forEach(printListRow);
    process.stdout.write('\n' + drafts.length + ' draft(s) shown.\n');
  } finally {
    await closeStore(store);
  }
}

async function cmdShow(draftId) {
  const { store, review } = await connectReadOnly();
  try {
    const draft = await review.get_draft(draftId);
    if (!draft) {
      process.stderr.write('error: no draft found with id "' + draftId + '"\n');
      process.exit(1);
    }
    printDraftFull(draft);
  } finally {
    await closeStore(store);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  try {
    if (command === 'list') {
      await cmdList(parseListArgs(argv.slice(1)));
    } else if (command === 'show') {
      const draftId = argv[1];
      if (!draftId) {
        failUsage('show requires a <draft_id>');
      }
      if (argv.length > 2) {
        failUsage('show takes exactly one <draft_id>');
      }
      if (!DRAFT_ID_PATTERN.test(draftId)) {
        failUsage('draft_id must match socialdraft_<16 hex chars>');
      }
      await cmdShow(draftId);
    } else {
      failUsage('unknown command "' + command + '"');
    }
  } catch (error) {
    process.stderr.write('error: ' + (error && error.message ? error.message : String(error)) + '\n');
    process.exit(1);
  }
}

main();
