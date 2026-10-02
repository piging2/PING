import { getFydTenantGraph } from './src/fyd/data/fyd-tenant-graph';
import { compileAskContext } from './src/fyd/ask/context-compiler';

async function main() {
  const reader = {
    queryFydSiteOverlays: async (_siteId: string) => [
      {
        eventId: 'evt-beacon-1',
        timestamp: '2026-09-28T12:00:00Z',
        ops: [
          {
            op: 'add_object',
            object: {
              id: 'beacon-nine-plumbing',
              schema: 'ping.social.business@1',
              title: 'Beacon Nine Plumbing',
              description: 'Test plumbing business.',
              fields: { phone: '555-0109' },
              visibility: 'public',
            },
          },
          {
            op: 'add_object',
            object: {
              id: 'beacon-nine-service-drain',
              schema: 'ping.social.service@1',
              title: 'Drain cleaning',
              description: 'Beacon Nine Plumbing drain cleaning service.',
              fields: { price: '$99' },
              visibility: 'public',
            },
          },
          {
            op: 'add_relationship',
            relationship: {
              id: 'rel-beacon-nine-1',
              subject: 'beacon-nine-plumbing',
              predicate: 'offers',
              object: 'beacon-nine-service-drain',
              status: 'active',
            },
          },
        ],
      },
    ],
  };
  const { graph, meta } = await getFydTenantGraph('happy-place', { reader: reader as never });
  console.log('graph rels total:', graph.relationships.length);
  const mine = graph.relationships.find((r) => r.id === 'rel-beacon-nine-1');
  console.log('my rel:', JSON.stringify(mine));
  const packet = compileAskContext({
    question: 'What is the dispatch phone number for Beacon Nine Plumbing?',
    viewer: { id: null, tier: 'agent', grants: [], delegatedTier: 'visitor' },
    siteId: 'happy-place',
    objectId: null,
    graph: { objects: graph.objects, relationships: graph.relationships },
    graphDigest: meta.graphDigest,
  });
  console.log('packet rels:', JSON.stringify(packet.relationships.map((r) => r.id)));
  console.log('evidence ids:', JSON.stringify(packet.evidence.map((e) => e.evidenceId)));
  console.log('excluded:', JSON.stringify(packet.visibility.excluded));
  console.log('object ids:', JSON.stringify(packet.objects.map((o) => o.id)));
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });
