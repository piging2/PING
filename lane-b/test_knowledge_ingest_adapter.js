/**
 * Tests for the PING Knowledge Ingest Adapter (Lane B).
 * Pure unit tests: no Postgres, no gateway boot.
 * Run: node gateway/test_knowledge_ingest_adapter.js
 */
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

const adapterPath = path.join(__dirname, 'knowledge_ingest_adapter.js');
const adapter = require(adapterPath);
const VOCAB = require(path.join(__dirname, 'constitutional-dist', 'ping-vocabulary.js'));

let passed = 0;
function ok(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ok - ${name}`);
    })
    .catch((e) => {
      console.error(`  FAIL - ${name}: ${e.message}`);
      console.error(e.stack);
      process.exitCode = 1;
    });
}

/** Build a signed envelope exactly as the extractor signer does. */
function signEnvelope(privatePem, publicPem, type, payload, metadata) {
  const canonical = adapter.knowledgeCanonicalize({ type, payload, metadata });
  const sig = crypto.sign(null, Buffer.from(canonical, 'utf8'), crypto.createPrivateKey(privatePem));
  return {
    type,
    payload,
    metadata,
    proof: {
      algorithm: 'ed25519',
      signature: sig.toString('base64'),
      publicKey: publicPem,
    },
  };
}

function freshKeypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  return {
    privatePem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  };
}

const PROV = {
  provenance: {
    source_url: 'https://happy-place-platform.vercel.app/',
    source_type: 'website_text_extraction',
    observed_at: '2026-09-21T02:45:00.000Z',
    evidence_ref: 'lane-b-observation-001',
  },
};

(async () => {
  console.log('knowledge_ingest_adapter tests');

  const kp = freshKeypair();

  await ok('accepts a valid signed knowledge OBJECT_CREATED with deterministic id', async () => {
    const env = signEnvelope(
      kp.privatePem,
      kp.publicPem,
      'OBJECT_CREATED',
      {
        schema: 'ping.knowledge.business@1',
        controller: 'identity_nolan',
        key: 'happy-place-carpentry',
        content: { claim_basis: 'website_statement', name: 'Happy Place Carpentry' },
      },
      PROV
    );
    const a = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(a.eventType, 'OBJECT_CREATED');
    assert.strictEqual(a.aggregateType, 'ping_object');
    assert.ok(/^object_[0-9a-f]{16}$/.test(a.aggregateId), `bad object id ${a.aggregateId}`);
    const b = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(b.aggregateId, a.aggregateId, 'object id must be deterministic');
    assert.ok(/^[0-9a-f]{64}$/.test(a.eventData.payload_hash), 'payload_hash must be sha256 hex');
    assert.strictEqual(a.eventData.proof.signature_construction, 'knowledge-envelope@1');
    assert.strictEqual(a.eventData.proof.payload_hash, a.eventData.payload_hash);
    assert.strictEqual(a.eventData.metadata.provenance.source_url, PROV.provenance.source_url);
  });

  await ok('rejects tampered payload with INVALID_SIGNATURE', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'OBJECT_CREATED',
      { schema: 'ping.knowledge.business@1', controller: 'identity_nolan', content: { claim_basis: 'website_statement', name: 'X' } },
      PROV
    );
    env.payload.content.name = 'Tampered';
    await assert.rejects(adapter.normalizeKnowledgeEnvelope(env), /INVALID_SIGNATURE/);
  });

  await ok('VEIN-5: unknown schema at import is preserved, marked UNRESOLVED, warned, not promoted', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'OBJECT_CREATED',
      { schema: 'ping.social.post@1', controller: 'identity_nolan', content: { claim_basis: 'website_statement', text: 'hi' } },
      PROV
    );
    // Must NOT throw: the import boundary preserves, it does not fail closed.
    const warned = [];
    const origWarn = console.warn;
    console.warn = (m) => warned.push(String(m));
    let a;
    try {
      a = await adapter.normalizeKnowledgeEnvelope(env);
    } finally {
      console.warn = origWarn;
    }
    // Preserved: raw value kept verbatim on the payload.
    assert.strictEqual(a.eventData.schema, 'ping.social.post@1');
    // Marked UNRESOLVED at both result and payload level.
    assert.strictEqual(a.vocabStatus, 'UNRESOLVED');
    assert.strictEqual(a.eventData._vocab.status, 'UNRESOLVED');
    assert.strictEqual(a.eventData._vocab.kind, 'schema');
    assert.strictEqual(a.eventData._vocab.raw, 'ping.social.post@1');
    assert.strictEqual(a.eventData._vocab.canonical, null);
    assert.ok(VOCAB.isUnresolved(a.eventData), 'isUnresolved must see the marker');
    // Warned: structured warning in the result and on the console.
    assert.ok(a.warnings.length >= 1, 'warnings[] must be non-empty');
    assert.ok(a.warnings[0].includes('VOCAB_WARN'), 'warning must carry the VOCAB_WARN code');
    assert.ok(warned.some((m) => m.includes('VOCAB_WARN')), 'console.warn must fire');
    // Not promoted: the write/transition boundary fails closed on the marker.
    assert.throws(() => VOCAB.assertWriteAllowed(a.eventData), /VOCAB_UNRESOLVED/);
    // Deterministic: same envelope -> same id, same marker. (payload_hash also
    // covers created_at, which is intentionally time-varying, so compare the
    // hash with created_at stripped: this proves the marker is hash-covered
    // deterministically.)
    const b = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(b.aggregateId, a.aggregateId, 'unresolved observation id must be deterministic');
    assert.deepStrictEqual(b.eventData._vocab, a.eventData._vocab, 'marker must be deterministic');
    const hashSansTime = (e) => {
      const c = { ...e };
      delete c.created_at;
      c.metadata = { ...(c.metadata || {}) };
      delete c.metadata._ingest; // _ingest.received_at is wall-clock by design
      return adapter.computePayloadHash(c);
    };
    assert.strictEqual(
      hashSansTime(b.eventData),
      hashSansTime(a.eventData),
      'marker must be covered by the payload hash deterministically'
    );
  });

  await ok('rejects knowledge object without provenance (MISSING_PROVENANCE)', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'OBJECT_CREATED',
      { schema: 'ping.knowledge.business@1', controller: 'identity_nolan', content: { claim_basis: 'website_statement', name: 'X' } },
      { source: 'no-provenance' }
    );
    await assert.rejects(adapter.normalizeKnowledgeEnvelope(env), /MISSING_PROVENANCE/);
  });

  await ok('rejects knowledge object without claim_basis (INVALID_CLAIM_BASIS)', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'OBJECT_CREATED',
      { schema: 'ping.knowledge.business@1', controller: 'identity_nolan', content: { name: 'X' } },
      PROV
    );
    await assert.rejects(adapter.normalizeKnowledgeEnvelope(env), /INVALID_CLAIM_BASIS/);
  });

  await ok('rejects private-key-looking material (SECRET_REJECTED)', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'OBJECT_CREATED',
      {
        schema: 'ping.knowledge.business@1', controller: 'identity_nolan',
        content: { claim_basis: 'website_statement', name: 'X' },
        private_key: 'never-in-a-payload',
      },
      PROV
    );
    await assert.rejects(adapter.normalizeKnowledgeEnvelope(env), /SECRET_REJECTED/);
  });

  await ok('accepts a valid knowledge RELATIONSHIP_CREATED with deterministic id', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'RELATIONSHIP_CREATED',
      { subject: 'object_b1', predicate: 'has_website', object: 'object_w1' },
      PROV
    );
    const a = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(a.eventType, 'RELATIONSHIP_CREATED');
    assert.ok(/^relationship_[0-9a-f]{16}$/.test(a.aggregateId), `bad relationship id ${a.aggregateId}`);
    const b = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(b.aggregateId, a.aggregateId, 'relationship id must be deterministic');
    assert.strictEqual(a.eventData.status, 'active');
  });

  await ok('accepts all seven knowledge predicates', async () => {
    for (const predicate of adapter.KNOWLEDGE_PREDICATES) {
      const env = signEnvelope(
        kp.privatePem, kp.publicPem, 'RELATIONSHIP_CREATED',
        { subject: 'object_b1', predicate, object: 'object_x' },
        PROV
      );
      const r = await adapter.normalizeKnowledgeEnvelope(env);
      assert.strictEqual(r.eventData.predicate, predicate);
    }
    assert.strictEqual(adapter.KNOWLEDGE_PREDICATES.length, 7);
  });

  await ok('VEIN-5: unknown predicate at import is preserved, marked UNRESOLVED, warned, not promoted', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'RELATIONSHIP_CREATED',
      { subject: 'object_b1', predicate: 'follows', object: 'object_w1' },
      PROV
    );
    const a = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(a.eventData.predicate, 'follows', 'raw predicate must be preserved verbatim');
    assert.strictEqual(a.vocabStatus, 'UNRESOLVED');
    assert.strictEqual(a.eventData._vocab.status, 'UNRESOLVED');
    assert.strictEqual(a.eventData._vocab.kind, 'predicate');
    assert.strictEqual(a.eventData._vocab.raw, 'follows');
    assert.strictEqual(a.eventData._vocab.canonical, null);
    assert.ok(a.warnings.length >= 1 && a.warnings[0].includes('VOCAB_WARN'));
    // Not promoted: write/transition boundary fails closed on the marker.
    assert.throws(() => VOCAB.assertWriteAllowed(a.eventData), /VOCAB_UNRESOLVED/);
    const b = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(b.aggregateId, a.aggregateId, 'unresolved relationship id must be deterministic');
    assert.deepStrictEqual(b.eventData._vocab, a.eventData._vocab);
  });

  await ok('VEIN-5: forbidden predicates still fail closed at import (FORBIDDEN_PREDICATE)', async () => {
    for (const predicate of ['unfollows', 'unlikes']) {
      const env = signEnvelope(
        kp.privatePem, kp.publicPem, 'RELATIONSHIP_CREATED',
        { subject: 'object_b1', predicate, object: 'object_w1' },
        PROV
      );
      // FORBIDDEN is not UNKNOWN: banned terms are rejected, never preserved.
      await assert.rejects(adapter.normalizeKnowledgeEnvelope(env), /FORBIDDEN_PREDICATE/);
    }
  });

  await ok('accepts revocation as status inactive on the same predicate', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'RELATIONSHIP_CREATED',
      { subject: 'object_b1', predicate: 'offers', object: 'object_s1', status: 'inactive' },
      PROV
    );
    const r = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(r.eventData.status, 'inactive');
    assert.strictEqual(r.eventData.predicate, 'offers');
  });

  await ok('rejects OBJECT_UPDATED (knowledge ingest is create/relate only)', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'OBJECT_UPDATED',
      { object_id: 'object_b1', changes: { name: 'Y' } },
      PROV
    );
    await assert.rejects(adapter.normalizeKnowledgeEnvelope(env), /UNSUPPORTED_EVENT_TYPE/);
  });

  await ok('rejects unknown event type', async () => {
    const env = signEnvelope(kp.privatePem, kp.publicPem, 'OBJECT_DELETED', {}, PROV);
    await assert.rejects(adapter.normalizeKnowledgeEnvelope(env), /UNKNOWN_EVENT_TYPE/);
  });

  // ---------------- VEIN-5 hostile fixtures ----------------

  await ok('HOSTILE: write gate fails closed on raw unknown vocabulary with no marker', async () => {
    // A write path that never saw the import marker still fails closed.
    assert.throws(() => VOCAB.assertWriteAllowed({ predicate: 'frobnicate' }), /UNKNOWN_VOCABULARY/);
    assert.throws(() => VOCAB.assertWriteAllowed({ schema: 'ping.nope@9' }), /UNKNOWN_VOCABULARY/);
    assert.throws(() => VOCAB.assertWriteAllowed({ predicate: 'unfollows' }), /FORBIDDEN_VOCABULARY/);
    assert.throws(() => VOCAB.assertWriteAllowed({ visibility: 'PING_ONLY' }), /UNKNOWN_VISIBILITY/);
    // (projector operations are gated separately by assertProjectorOperation, tested below)
  });

  await ok('HOSTILE: write gate passes fully canonical payloads', async () => {
    const env = signEnvelope(
      kp.privatePem, kp.publicPem, 'OBJECT_CREATED',
      { schema: 'ping.knowledge.business@1', controller: 'identity_nolan', content: { claim_basis: 'website_statement', name: 'X' } },
      PROV
    );
    const a = await adapter.normalizeKnowledgeEnvelope(env);
    assert.strictEqual(a.vocabStatus, 'RESOLVED');
    assert.strictEqual(a.eventData._vocab.status, 'RESOLVED');
    assert.deepStrictEqual(a.warnings, []);
    VOCAB.assertWriteAllowed(a.eventData); // must not throw
    const rel = signEnvelope(
      kp.privatePem, kp.publicPem, 'RELATIONSHIP_CREATED',
      { subject: 'object_b1', predicate: 'offers', object: 'object_s1' },
      PROV
    );
    const r = await adapter.normalizeKnowledgeEnvelope(rel);
    assert.strictEqual(r.vocabStatus, 'RESOLVED');
    VOCAB.assertWriteAllowed(r.eventData); // must not throw
  });

  await ok('HOSTILE: projector operation gate still fails closed on unknown operations', async () => {
    for (const op of ['create', 'update', 'relate']) VOCAB.assertProjectorOperation(op); // must not throw
    assert.throws(() => VOCAB.assertProjectorOperation('delete'), /unknown projector operation/);
    assert.throws(() => VOCAB.assertProjectorOperation('upsert'), /unknown projector operation/);
    assert.throws(() => VOCAB.assertProjectorOperation(''), /unknown projector operation/);
  });

  await ok('HOSTILE: UNRESOLVED marker survives hostile tampering attempts at the gate', async () => {
    // Marker removed but term still unknown -> still fails closed (defense in depth).
    const stripped = { predicate: 'frobnicate', subject: 'a', object: 'b' };
    assert.throws(() => VOCAB.assertWriteAllowed(stripped), /UNKNOWN_VOCABULARY/);
    // Marker present but status field tampered to RESOLVED with unknown term -> fails closed.
    const tampered = { predicate: 'frobnicate', _vocab: { status: 'RESOLVED', kind: 'predicate', raw: 'frobnicate', canonical: null } };
    assert.throws(() => VOCAB.assertWriteAllowed(tampered), /UNKNOWN_VOCABULARY/);
    // Canonical term with a forged UNRESOLVED marker -> fails closed (marker is authoritative).
    const forged = { predicate: 'offers', _vocab: { status: 'UNRESOLVED', kind: 'predicate', raw: 'offers', canonical: null, reason: 'forged' } };
    assert.throws(() => VOCAB.assertWriteAllowed(forged), /VOCAB_UNRESOLVED/);
  });

  await ok('HOSTILE: display renders safe generic representation, never canonicalizes unknown', async () => {
    // Unknown predicate: bracketed, raw visible, not presented as canonical.
    const u = VOCAB.renderVocabTermSafe('frobnicate', 'predicate');
    assert.ok(u.includes('unresolved'), 'must be marked unresolved');
    assert.ok(u.includes('frobnicate'), 'raw value must stay visible for debugging');
    assert.notStrictEqual(u, 'frobnicate', 'must not render as the bare term');
    // Unknown schema likewise.
    const s = VOCAB.renderVocabTermSafe('ping.nope@9', 'schema');
    assert.ok(s.includes('unresolved') && s.includes('ping.nope@9'));
    // Forbidden: generic marker, no behavioral echo.
    assert.strictEqual(VOCAB.renderVocabTermSafe('unfollows', 'predicate'), '[forbidden predicate]');
    // Known terms render as themselves.
    assert.strictEqual(VOCAB.renderVocabTermSafe('offers', 'predicate'), 'offers');
    assert.strictEqual(VOCAB.renderVocabTermSafe('ping.knowledge.business@1', 'schema'), 'ping.knowledge.business@1');
    assert.strictEqual(VOCAB.renderVocabTermSafe('create', 'operation'), 'create');
    // Garbage never throws.
    assert.doesNotThrow(() => VOCAB.renderVocabTermSafe(null, 'predicate'));
    assert.doesNotThrow(() => VOCAB.renderVocabTermSafe(12345, 'schema'));
    assert.doesNotThrow(() => VOCAB.renderVocabTermSafe(undefined, undefined));
    assert.doesNotThrow(() => VOCAB.renderVocabTermSafe({ toString: () => { throw new Error('x'); } }, 'predicate'));
  });

  await ok('HOSTILE: classifier separates KNOWN / UNKNOWN / FORBIDDEN without collapsing', async () => {
    assert.strictEqual(VOCAB.classifyPredicate('offers').status, 'KNOWN');
    assert.strictEqual(VOCAB.classifyPredicate('offers').canonical, 'offers');
    assert.strictEqual(VOCAB.classifyPredicate('frobnicate').status, 'UNKNOWN');
    assert.strictEqual(VOCAB.classifyPredicate('frobnicate').canonical, null);
    assert.strictEqual(VOCAB.classifyPredicate('unfollows').status, 'FORBIDDEN');
    assert.strictEqual(VOCAB.classifyPredicate('unlikes').status, 'FORBIDDEN');
    assert.strictEqual(VOCAB.classifySchema('ping.knowledge.business@1').status, 'KNOWN');
    // Canonical at the registry level is the union of social + knowledge:
    // ping.social.post@1 is KNOWN here (it is only "unknown" relative to the
    // knowledge adapter's narrower scope, which uses isKnowledgeSchema).
    assert.strictEqual(VOCAB.classifySchema('ping.social.post@1').status, 'KNOWN');
    assert.strictEqual(VOCAB.classifySchema('ping.nope@9').status, 'UNKNOWN');
    assert.strictEqual(VOCAB.classifySchema('ping.nope@9').canonical, null);
    assert.strictEqual(VOCAB.classifyTerm('delete', 'operation').status, 'UNKNOWN');
    assert.strictEqual(VOCAB.classifyTerm('relate', 'operation').status, 'KNOWN');
    assert.strictEqual(VOCAB.classifyTerm('PING_ONLY', 'visibility').status, 'UNKNOWN');
    assert.strictEqual(VOCAB.classifyTerm('public', 'visibility').status, 'KNOWN');
  });

  console.log(`\n${passed} knowledge adapter tests passed${process.exitCode ? ' (WITH FAILURES)' : ''}`);
})();
