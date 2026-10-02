const assert = require('assert');
const { ClaimWorker } = require('/home/nolan/worktrees/ping-harvest-12h/ping-runtime/workers/canonical_workers.js');

async function drive(label, payload, check) {
  const emitted = [];
  const stubRuntime = {
    async emit(eventType, source, payloadArg, options) {
      emitted.push({ eventType, source, payload: payloadArg, options });
      return { status: 'ok', eventId: 'evt-' + label };
    },
  };
  const worker = new ClaimWorker({ eventRuntime: stubRuntime });
  const event = {
    event_id: 'obs-evt-' + label,
    event_type: 'OBSERVATION_CREATED',
    source: 'observation-worker',
    payload,
  };
  const ret = await worker.handle(event);
  assert.strictEqual(emitted.length, 1, label + ': one emit');
  assert.strictEqual(emitted[0].eventType, 'CLAIM_CREATED', label + ': event type');
  check(ret, emitted[0].payload, label);
  console.log(label + ': PASS');
}

const evidenceRefs = [{ id: 'ev1', field: 'a' }];
const knowledgeRefs = [{ id: 'kn1', field: 'b' }];

(async () => {
  // (b) full lineage, as ObservationWorker emits (top-level + inside observation)
  await drive('full-lineage', {
    documentId: 'doc1',
    observation: {
      documentId: 'doc1',
      context_pack_id: 'pack-123',
      context_evidence_refs: evidenceRefs,
      context_knowledge_refs: knowledgeRefs,
    },
    upstreamEventId: 'obs-evt-full-lineage',
    context_pack_id: 'pack-123',
    context_evidence_refs: evidenceRefs,
    context_knowledge_refs: knowledgeRefs,
  }, (ret, p) => {
    assert.strictEqual(p.context_pack_id, 'pack-123');
    assert.deepStrictEqual(p.context_evidence_refs, evidenceRefs);
    assert.deepStrictEqual(p.context_knowledge_refs, knowledgeRefs);
    assert.strictEqual(ret.claim.context_pack_id, 'pack-123');
    assert.deepStrictEqual(ret.claim.context_evidence_refs, evidenceRefs);
    assert.deepStrictEqual(ret.claim.context_knowledge_refs, knowledgeRefs);
    assert.strictEqual(p.claim.context_pack_id, 'pack-123');
    assert.strictEqual(p.documentId, 'doc1');
    assert.strictEqual(p.upstreamEventId, 'obs-evt-full-lineage');
    assert.strictEqual(ret.status, 'ok');
  });

  // lineage only inside payload.observation (no top-level copy)
  await drive('obs-only', {
    documentId: 'doc2',
    observation: {
      documentId: 'doc2',
      context_pack_id: 'pack-obs',
      context_evidence_refs: evidenceRefs,
      context_knowledge_refs: knowledgeRefs,
    },
    upstreamEventId: 'x',
  }, (ret, p) => {
    assert.strictEqual(p.context_pack_id, 'pack-obs');
    assert.deepStrictEqual(p.context_evidence_refs, evidenceRefs);
    assert.deepStrictEqual(p.context_knowledge_refs, knowledgeRefs);
    assert.strictEqual(ret.claim.context_pack_id, 'pack-obs');
  });

  // lineage only at payload top-level
  await drive('top-only', {
    documentId: 'doc3',
    observation: { documentId: 'doc3' },
    upstreamEventId: 'x',
    context_pack_id: 'pack-top',
  }, (ret, p) => {
    assert.strictEqual(p.context_pack_id, 'pack-top');
    assert.strictEqual(p.context_evidence_refs, undefined);
    assert.strictEqual(p.context_knowledge_refs, undefined);
    assert.strictEqual('context_evidence_refs' in p, false);
    assert.strictEqual('context_knowledge_refs' in p, false);
    assert.strictEqual(ret.claim.context_pack_id, 'pack-top');
  });

  // (c) no lineage: key-for-key baseline identity
  await drive('no-lineage', {
    documentId: 'doc4',
    observation: { documentId: 'doc4' },
    upstreamEventId: 'x',
  }, (ret, p) => {
    assert.deepStrictEqual(Object.keys(p), ['documentId', 'claim', 'upstreamEventId']);
    assert.deepStrictEqual(Object.keys(ret.claim), ['documentId', 'eventType', 'timestamp', 'source']);
    assert.deepStrictEqual(Object.keys(p.claim), ['documentId', 'eventType', 'timestamp', 'source']);
    assert.strictEqual(p.documentId, 'doc4');
  });

  // (d) malformed lineage ignored
  await drive('malformed', {
    documentId: 'doc5',
    observation: {
      documentId: 'doc5',
      context_pack_id: 12345,
      context_evidence_refs: 'not-an-array',
      context_knowledge_refs: { not: 'an array' },
    },
    upstreamEventId: 'x',
    context_pack_id: ['array-pack'],
    context_evidence_refs: 42,
    context_knowledge_refs: null,
  }, (ret, p) => {
    assert.deepStrictEqual(Object.keys(p), ['documentId', 'claim', 'upstreamEventId']);
    assert.deepStrictEqual(Object.keys(ret.claim), ['documentId', 'eventType', 'timestamp', 'source']);
  });

  // fail-soft: payload.observation is a primitive, top-level lineage still picked up
  await drive('primitive-observation', {
    documentId: 'doc6',
    observation: 'just-a-string',
    upstreamEventId: 'x',
    context_pack_id: 'pack-prim',
  }, (ret, p) => {
    assert.strictEqual(p.context_pack_id, 'pack-prim');
    assert.strictEqual(ret.claim.context_pack_id, 'pack-prim');
  });

  // fail-soft: throwing getter on observation -> no throw, baseline output
  const evil = {
    documentId: 'doc7',
    upstreamEventId: 'x',
  };
  Object.defineProperty(evil, 'observation', {
    get() { throw new Error('boom'); },
    enumerable: true,
  });
  await drive('throwing-getter', evil, (ret, p) => {
    assert.deepStrictEqual(Object.keys(p), ['documentId', 'claim', 'upstreamEventId']);
    assert.strictEqual(ret.status, 'ok');
  });

  console.log('ALL DRIVE CASES PASS');
})().catch((e) => { console.error('DRIVE FAILURE:', e); process.exit(1); });
