/**
 * mc-context-pack tests (decision-fabric lane, 2026-09-28).
 *
 * The dispatch ContextPack is the evidence-bound packet the executor
 * receives: one call to compileAskContext() over the live tenant graph +
 * journal evidence, with the dispatch params envelope preserved as packet
 * metadata. These tests cover the three required properties:
 *
 * 1. Evidence + epistemic state: context.json carries per-claim obj:/field:/
 *    rel: evidence refs with provenance-derived classifications.
 * 2. Metadata regression: mission/run/execution ids and prompt digest are
 *    still present; context_pack_id stays mc-ctx-<missionId>.
 * 3. Attack-9: retract an overlay op, recompile, and the claim surfaces
 *    UNKNOWN instead of asserted.
 */

import { buildDispatchContextPacket } from '../mc-context-pack';
import type { FydOverlayReader } from '../../../../../fyd/data/fyd-tenant-graph';
import type { FydJournalOverlay } from '../../../../../lib/ping/ping-object-reader';

const readerWith = (overlays: FydJournalOverlay[]): FydOverlayReader => ({
  queryFydSiteOverlays: async (_siteId: string) => overlays,
});

const overlay = (eventId: string, ops: unknown[]): FydJournalOverlay => ({
  eventId,
  timestamp: '2026-09-28T12:00:00Z',
  ops,
});

const baseDispatch = (promptDigest: string): Record<string, unknown> => ({
  mission_id: 'mc-m-test1',
  run_id: 'mc-m-test1-r1',
  execution_id: 'mc-m-test1-x1',
  agent: 'ollama',
  tenant: 'happy-place',
  capability: 'code',
  namespace: 'tenant::happy-place',
  prompt_digest: promptDigest,
  principal: 'mission-control-dispatch',
});

describe('buildDispatchContextPacket', () => {
  test('carries obj:/field:/rel: evidence refs with provenance-derived classifications', async () => {
    // Note: the question avoids service-intent keywords (plumb, drain,
    // clean, ...) so the fixture's service objects stay below the
    // relevance floor; the 32-item evidence budget then has room for the
    // relationship evidence entries.
    const packet = await buildDispatchContextPacket({
      tenant: 'happy-place',
      question: 'What is the dispatch code for Beacon Nine?',
      contextPackId: 'mc-ctx-mc-m-test1',
      dispatch: baseDispatch('abc123'),
      reader: readerWith([
        overlay('evt-beacon-1', [
          {
            op: 'add_object',
            object: {
              id: 'beacon-nine-plumbing',
              schema: 'ping.social.business@1',
              title: 'Beacon Nine Plumbing',
              description: 'Test business for the dispatch ContextPack test.',
              fields: { phone: '555-0109' },
              visibility: 'public',
            },
          },
          {
            op: 'add_object',
            object: {
              id: 'beacon-nine-support',
              schema: 'ping.social.service@1',
              title: 'Beacon Nine support plan',
              description: 'Support plan from Beacon Nine.',
              fields: { code: 'B9-PLAN' },
              visibility: 'public',
            },
          },
          {
            op: 'add_relationship',
            relationship: {
              id: 'rel-beacon-nine-1',
              subject: 'beacon-nine-plumbing',
              predicate: 'offers',
              object: 'beacon-nine-support',
              status: 'active',
            },
          },
        ]),
      ]),
    });

    const ids = packet.evidence.map((e) => e.evidenceId);
    expect(ids.some((id) => id.startsWith('obj:'))).toBe(true);
    expect(ids.some((id) => id.startsWith('field:'))).toBe(true);
    expect(ids.some((id) => id.startsWith('rel:'))).toBe(true);

    // Journal-authored claims classify as DIRECT_FACT: provenance-derived,
    // not hardcoded.
    const objEv = packet.evidence.find((e) => e.evidenceId === 'obj:beacon-nine-plumbing');
    expect(objEv).toBeDefined();
    expect(objEv!.classification).toBe('DIRECT_FACT');
    const fieldEv = packet.evidence.find(
      (e) => e.evidenceId === 'field:beacon-nine-plumbing:phone',
    );
    expect(fieldEv).toBeDefined();
    expect(fieldEv!.classification).toBe('DIRECT_FACT');
    const relEv = packet.evidence.find((e) => e.evidenceId === 'rel:rel-beacon-nine-1');
    expect(relEv).toBeDefined();

    // Every evidence id cited by an object exists in the registry.
    const registry = new Set(ids);
    for (const o of packet.objects) {
      for (const ref of o.evidenceRefIds) {
        expect(registry.has(ref)).toBe(true);
      }
    }

    // Fixture claims keep their own provenance classification.
    const fixtureEv = packet.evidence.find(
      (e) => e.evidenceId === 'obj:website-business-6fa5ebd99d72c4cb',
    );
    expect(fixtureEv).toBeDefined();
    expect(fixtureEv!.classification).toBe('website_statement');
  });

  test('preserves the params envelope as packet metadata', async () => {
    const packet = await buildDispatchContextPacket({
      tenant: 'happy-place',
      question: 'What services does Happy Place Carpentry offer?',
      contextPackId: 'mc-ctx-mc-m-regress1',
      dispatch: {
        ...baseDispatch('deadbeef'),
        mission_id: 'mc-m-regress1',
        run_id: 'mc-m-regress1-r1',
        execution_id: 'mc-m-regress1-x1',
      },
      reader: readerWith([]),
    });

    expect(packet.context_pack_id).toBe('mc-ctx-mc-m-regress1');
    expect(packet.dispatch.mission_id).toBe('mc-m-regress1');
    expect(packet.dispatch.run_id).toBe('mc-m-regress1-r1');
    expect(packet.dispatch.execution_id).toBe('mc-m-regress1-x1');
    expect(packet.dispatch.prompt_digest).toBe('deadbeef');
    // The compiler's own content id is separate and intact.
    expect(typeof packet.packetId).toBe('string');
    expect(packet.packetId.length).toBeGreaterThan(0);
    expect(packet.digests.packet).toBe(packet.packetId);
    expect(packet.digests.graph).toBeTruthy();
  });

  test('attack-9: a retracted overlay claim recompiles as UNKNOWN, never retained as fact', async () => {
    const attackOp = {
      op: 'add_object',
      object: {
        id: 'retraction-nine',
        schema: 'ping.social.business@1',
        title: 'Retraction Nine Plumbing',
        description: 'Claim asserted by a journal overlay, then retracted.',
        fields: { claim_code: 'A9-ASSERTED' },
        visibility: 'public',
      },
    };
    const question = 'What is the claim code for Retraction Nine Plumbing?';
    const params = (reader: FydOverlayReader) => ({
      tenant: 'happy-place',
      question,
      contextPackId: 'mc-ctx-mc-m-attack9',
      dispatch: {
        ...baseDispatch('a9digest'),
        mission_id: 'mc-m-attack9',
        run_id: 'mc-m-attack9-r1',
        execution_id: 'mc-m-attack9-x1',
      },
      reader,
    });

    // With the overlay present the claim is asserted with journal evidence.
    const before = await buildDispatchContextPacket(
      params(readerWith([overlay('evt-a9-1', [attackOp])])),
    );
    const beforeIds = before.evidence.map((e) => e.evidenceId);
    expect(beforeIds).toContain('obj:retraction-nine');
    expect(beforeIds).toContain('field:retraction-nine:claim_code');
    expect(before.objects.some((o) => o.id === 'retraction-nine')).toBe(true);
    expect(before.unknowns).not.toContain('retraction');

    // The overlay op is retracted: recompile through the same seam.
    const after = await buildDispatchContextPacket(params(readerWith([])));
    const afterIds = after.evidence.map((e) => e.evidenceId);
    expect(afterIds).not.toContain('obj:retraction-nine');
    expect(afterIds).not.toContain('field:retraction-nine:claim_code');
    expect(after.objects.some((o) => o.id === 'retraction-nine')).toBe(false);
    // The targeted lookup surfaces UNKNOWN, not the retracted fact.
    expect(after.unknowns).toContain('retraction');
  });

  test('fails closed when the graph read fails: no packet without the reader', async () => {
    const failing: FydOverlayReader = {
      queryFydSiteOverlays: async (_siteId: string) => {
        throw new Error('journal_unreachable');
      },
    };
    await expect(
      buildDispatchContextPacket({
        tenant: 'happy-place',
        question: 'anything',
        contextPackId: 'mc-ctx-mc-m-fail1',
        dispatch: baseDispatch('fail'),
        reader: failing,
      }),
    ).rejects.toThrow();
  });
});
