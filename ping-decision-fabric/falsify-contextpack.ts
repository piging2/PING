/**
 * Independent falsifier for the ContextPack wire lane (decision-fabric, 2026-09-28).
 *
 * Run from a pristine worktree with tsx, cwd = the worktree root:
 *   tsx falsify-contextpack.ts <worktreeRoot> <pre|post|no-reader>
 *
 * Modes:
 *   pre       Rebuild the pre-patch context.json mint VERBATIM from
 *             src/app/api/mc/dispatch/route.ts @ base HEAD and assert it
 *             carries ZERO obj:/field:/rel: evidence references.
 *   post      Call the patched buildDispatchContextPacket() with a journal
 *             overlay and assert the artifact carries evidence references.
 *   no-reader Call it with a throwing journal reader and assert it REJECTS
 *             (a dispatch ContextPack must never be produced without the
 *             graph reader).
 *
 * Exit 0 = falsifier claim holds. Non-zero = FALSIFIED, with the reason on
 * stderr. This script is verification tooling; it is not committed to the
 * repo.
 */

const EVIDENCE_RE = /(?:["\s])(obj|field|rel):[A-Za-z0-9_.-]+/g;

function countEvidenceRefs(artifact: unknown): { total: number; byPrefix: Record<string, number> } {
  const text = JSON.stringify(artifact);
  const byPrefix: Record<string, number> = { obj: 0, field: 0, rel: 0 };
  let total = 0;
  for (const m of text.matchAll(EVIDENCE_RE)) {
    total++;
    byPrefix[m[1]]++;
  }
  return { total, byPrefix };
}

function fail(msg: string): never {
  console.error(`FALSIFIED: ${msg}`);
  process.exit(1);
}

async function modePre(): Promise<void> {
  // VERBATIM mint from src/app/api/mc/dispatch/route.ts @ 0264d517
  // (the params-only context.json; values are test doubles).
  const prePatchArtifact = {
    context_pack_id: 'mc-ctx-mc-m-abc123',
    mission_id: 'mc-m-abc123',
    run_id: 'mc-m-abc123-r1',
    execution_id: 'mc-m-abc123-x1',
    agent: 'ollama',
    tenant: 'happy-place',
    capability: 'code',
    namespace: 'tenant::happy-place',
    constraints: ['bounded'],
    deadline: '2026-09-28T13:00:00Z',
    deadline_seconds: 600,
    prompt_digest: 'deadbeef',
    principal: 'mission-control-dispatch',
  };
  const { total } = countEvidenceRefs(prePatchArtifact);
  if (total !== 0) fail(`pre-patch artifact carries ${total} evidence refs; expected 0`);
  console.log('pre: PASS - pre-patch context.json carries zero obj:/field:/rel: evidence references');
}

async function modePost(root: string): Promise<void> {
  const mod = await import(`${root}/src/app/api/mc/_lib/mc-context-pack`);
  const buildDispatchContextPacket = mod.buildDispatchContextPacket as (p: Record<string, unknown>) => Promise<Record<string, unknown>>;
  if (typeof buildDispatchContextPacket !== 'function') fail('buildDispatchContextPacket not exported');

  const reader = {
    queryFydSiteOverlays: async (_siteId: string) => [
      {
        eventId: 'evt-fals-1',
        timestamp: '2026-09-28T12:00:00Z',
        ops: [
          {
            op: 'add_object',
            object: {
              id: 'falsifier-biz',
              schema: 'ping.social.business@1',
              title: 'Falsifier Contracting',
              description: 'Falsifier probe object.',
              fields: { phone: '555-0199' },
              visibility: 'public',
            },
          },
          {
            op: 'add_object',
            object: {
              id: 'falsifier-plan',
              schema: 'ping.social.service@1',
              title: 'Falsifier support plan',
              description: 'Support plan from Falsifier Contracting.',
              fields: { code: 'F1' },
              visibility: 'public',
            },
          },
          {
            op: 'add_relationship',
            relationship: {
              id: 'rel-falsifier-1',
              subject: 'falsifier-biz',
              predicate: 'offers',
              object: 'falsifier-plan',
              status: 'active',
            },
          },
        ],
      },
    ],
  };

  const packet = await buildDispatchContextPacket({
    tenant: 'happy-place',
    question: 'What is the dispatch code for Falsifier?',
    contextPackId: 'mc-ctx-mc-m-fals',
    dispatch: {
      mission_id: 'mc-m-fals',
      run_id: 'mc-m-fals-r1',
      execution_id: 'mc-m-fals-x1',
      prompt_digest: 'falsdigest',
      principal: 'mission-control-dispatch',
    },
    reader,
  });

  const { total, byPrefix } = countEvidenceRefs(packet);
  if (byPrefix.obj < 1) fail('post-patch artifact has no obj: evidence refs');
  if (byPrefix.field < 1) fail('post-patch artifact has no field: evidence refs');
  if (byPrefix.rel < 1) fail('post-patch artifact has no rel: evidence refs');
  if ((packet as { context_pack_id?: unknown }).context_pack_id !== 'mc-ctx-mc-m-fals') {
    fail('post-patch artifact lost context_pack_id');
  }
  const dispatch = (packet as { dispatch?: Record<string, unknown> }).dispatch ?? {};
  for (const k of ['mission_id', 'run_id', 'execution_id', 'prompt_digest']) {
    if (dispatch[k] === undefined) fail(`post-patch artifact lost dispatch.${k}`);
  }
  console.log(
    `post: PASS - post-patch context.json carries ${total} evidence refs ` +
      `(obj:${byPrefix.obj} field:${byPrefix.field} rel:${byPrefix.rel}); metadata intact`,
  );
}

async function modeNoReader(root: string): Promise<void> {
  const mod = await import(`${root}/src/app/api/mc/_lib/mc-context-pack`);
  const buildDispatchContextPacket = mod.buildDispatchContextPacket as (p: Record<string, unknown>) => Promise<Record<string, unknown>>;
  let readerInvoked = false;
  const reader = {
    queryFydSiteOverlays: async (_siteId: string) => {
      readerInvoked = true;
      throw new Error('journal_unreachable');
    },
  };
  let rejected = false;
  try {
    await buildDispatchContextPacket({
      tenant: 'happy-place',
      question: 'anything',
      contextPackId: 'mc-ctx-mc-m-nr',
      dispatch: { mission_id: 'mc-m-nr' },
      reader,
    });
  } catch {
    rejected = true;
  }
  if (!readerInvoked) fail('graph reader was never invoked');
  if (!rejected) fail('a dispatch ContextPack was produced despite graph reader failure');
  console.log('no-reader: PASS - graph reader invoked and failure is fail-closed (no packet produced)');
}

async function main(): Promise<void> {
  const [root, mode] = process.argv.slice(2);
  if (!root || !mode) {
    console.error('usage: tsx falsify-contextpack.ts <worktreeRoot> <pre|post|no-reader>');
    process.exit(2);
  }
  if (mode === 'pre') return modePre();
  if (mode === 'post') return modePost(root);
  if (mode === 'no-reader') return modeNoReader(root);
  console.error(`unknown mode: ${mode}`);
  process.exit(2);
}

main().catch((e) => {
  console.error(`FALSIFIER ERROR: ${String(e && (e as Error).stack || e).slice(0, 2000)}`);
  process.exit(1);
});
