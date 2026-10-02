/**
 * Lane B emitter: website observation -> signed canonical journal POST bodies.
 *
 * Reads observation-001.json, mints deterministic object/relationship ids via
 * the ONE IdentityAuthority (compiled constitutional module), computes
 * payload_hash via the Patch 7B construction, and Ed25519-signs each event
 * with the Nolan dev key (transient read; the key NEVER enters outputs).
 *
 * Output bodies target the governed POST /events canonical-spine path:
 *   { event_type, aggregate_id, aggregate_type, event_data }
 * with event_data.proof carrying the offline-verifiable Ed25519 proof
 * (signature_construction 'lane-b-direct@1').
 *
 * Governance delta (reported, not hidden): the live gateway image predates
 * the knowledge adapter, so knowledge BFF envelopes are rejected there
 * (proven by boundary.json -> expect 400 UNSUPPORTED_SCHEMA). These bodies
 * therefore travel the direct canonical-spine path of the SAME governed
 * POST /events route (UnifiedEventRuntime acceptance, same journal).
 * Vocabulary enforcement + provenance gating happen here, client-side,
 * against the repo's canonical vocabulary. The gateway redeploy that wires
 * the knowledge adapter into the envelope path is a flagged operator
 * decision.
 *
 * Usage: node emit.js
 *   writes bodies.json (19 POST bodies) and boundary.json (1 envelope)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { IdentityAuthority } = require('./identity-authority.js');
const { HashAuthority } = require('./hash-authority.js');
const VOCAB = require('./ping-vocabulary.js');

const DIR = __dirname;
const OBS = JSON.parse(fs.readFileSync(path.join(DIR, 'observation-001.json'), 'utf8'));
const F = OBS.facts;
const PROV = {
  source_url: OBS.provenance.source_url,
  source_type: OBS.provenance.source_type,
  observed_at: OBS.provenance.observed_at,
  evidence_ref: OBS.provenance.evidence_ref,
};
const CONTROLLER = 'identity_cc3383c868f96fc1'; // Nolan (nolan.json); owns the site + the ingest
const CREATED_AT = OBS.provenance.observed_at; // fixed: identical logical events hash identically

// ---- key custody: transient read, never printed, never embedded ----
const KEYDIR = '/home/hatch/.ping-dev-keys';
const privDer = Buffer.from(fs.readFileSync(path.join(KEYDIR, 'nolan.private.hex'), 'utf8').trim(), 'hex');
const pubDer = Buffer.from(fs.readFileSync(path.join(KEYDIR, 'nolan.public.hex'), 'utf8').trim(), 'hex');
const privateKey = crypto.createPrivateKey({ key: privDer, format: 'der', type: 'pkcs8' });
const publicPem = crypto.createPublicKey({ key: pubDer, format: 'der', type: 'spki' })
  .export({ format: 'pem', type: 'spki' }).toString();
privDer.fill(0);

function canonicalize(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
    return `{${entries.join(',')}}`;
  }
  const s = JSON.stringify(value);
  return s === undefined ? 'null' : s;
}
function sha256Hex(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function payloadHash(eventData) {
  const stripped = { ...eventData };
  delete stripped.proof;
  delete stripped.payload_hash;
  return sha256Hex(JSON.stringify(HashAuthority.canonicalizeObject(stripped)));
}
function sign(eventType, aggregateId, aggregateType, eventDataStripped) {
  const bytes = canonicalize({ event_type: eventType, aggregate_id: aggregateId, aggregate_type: aggregateType, event_data: eventDataStripped });
  return crypto.sign(null, Buffer.from(bytes, 'utf8'), privateKey).toString('base64');
}

function objectEvent(schema, key, content) {
  if (!VOCAB.isKnowledgeSchema(schema)) throw new Error(`not a knowledge schema: ${schema}`);
  if (content.claim_basis !== 'website_statement' && content.claim_basis !== 'extractor_inference') {
    throw new Error('claim_basis required');
  }
  const objectId = IdentityAuthority.generateId('object', { schema, controller: CONTROLLER, key });
  const eventData = {
    schema, object_id: objectId, controller: CONTROLLER, created_at: CREATED_AT,
    content, refs: [], visibility: 'public', status: 'active',
    metadata: { provenance: PROV, _lane: 'lane-b', _evidence: OBS.evidence_ref },
  };
  // VEIN-5 write boundary: fail closed on unknown/unresolved/forbidden
  // vocabulary before a canonical body is minted.
  VOCAB.assertWriteAllowed(eventData);
  eventData.payload_hash = payloadHash(eventData);
  const stripped = { ...eventData }; delete stripped.proof; delete stripped.payload_hash;
  eventData.proof = {
    algorithm: 'ed25519',
    signature: sign('OBJECT_CREATED', objectId, 'ping_object', stripped),
    publicKey: publicPem,
    signer_identity: CONTROLLER,
    signature_construction: 'lane-b-direct@1',
    signed_bytes: 'canonical-json(event_type,aggregate_id,aggregate_type,event_data-minus-proof-minus-hash)',
    payload_hash: eventData.payload_hash,
  };
  return { event_type: 'OBJECT_CREATED', aggregate_id: objectId, aggregate_type: 'ping_object', event_data: eventData, _label: `${schema.split('.')[2]}:${key}` };
}

function relEvent(subject, predicate, object, meta) {
  if (!VOCAB.isKnowledgePredicate(predicate)) throw new Error(`not a knowledge predicate: ${predicate}`);
  const relationshipId = IdentityAuthority.generateId('relationship', { subject, predicate, object });
  const eventData = {
    relationship_id: relationshipId, subject, predicate, object,
    status: 'active', created_at: CREATED_AT,
    metadata: { provenance: PROV, _lane: 'lane-b', _evidence: OBS.evidence_ref, ...(meta || {}) },
  };
  // VEIN-5 write boundary: fail closed on unknown/unresolved/forbidden
  // vocabulary before a canonical body is minted.
  VOCAB.assertWriteAllowed(eventData);
  eventData.payload_hash = payloadHash(eventData);
  const stripped = { ...eventData }; delete stripped.proof; delete stripped.payload_hash;
  eventData.proof = {
    algorithm: 'ed25519',
    signature: sign('RELATIONSHIP_CREATED', relationshipId, 'ping_relationship', stripped),
    publicKey: publicPem,
    signer_identity: CONTROLLER,
    signature_construction: 'lane-b-direct@1',
    signed_bytes: 'canonical-json(event_type,aggregate_id,aggregate_type,event_data-minus-proof-minus-hash)',
    payload_hash: eventData.payload_hash,
  };
  return { event_type: 'RELATIONSHIP_CREATED', aggregate_id: relationshipId, aggregate_type: 'ping_relationship', event_data: eventData, _label: `${predicate}` };
}

// ---------------- objects ----------------
const objs = [];
const B1 = objectEvent('ping.knowledge.business@1', 'happy-place-carpentry', {
  claim_basis: 'website_statement',
  name: F.business_name,
  tagline: F.tagline,
  description: F.description,
  claimed_projects_completed: F.projects_completed_claim,
  claimed_license: F.license_claim,
  claimed_licensed: F.licensed_claim,
  claimed_bonded: F.bonded_claim,
  claimed_insured: F.insured_claim,
  price_range: F.price_range,
  phone: F.contact_phone,
  confidence: 0.95,
  note: 'Portfolio demo site of Nolan Geske (TenantOS pipeline asset). All business claims are website statements, not verified facts.',
});
const W1 = objectEvent('ping.knowledge.website@1', F.page_url || PROV.source_url, {
  claim_basis: 'website_statement',
  url: PROV.source_url,
  title: F.page_title,
  page_sections: F.page_sections,
  image_count: OBS.extraction.images.length,
  image_alts: OBS.extraction.images.map((i) => i.alt),
  confidence: 0.98,
});
const L1 = objectEvent('ping.knowledge.location@1', 'mid-willamette-valley', {
  claim_basis: 'website_statement',
  label: F.service_area,
  kind: 'service_area',
  counties: F.counties,
  state: { value: 'Oregon', basis: 'extractor_inference', reason: 'Oregon CCB license claim + Willamette Valley geography' },
  note: 'Service area as claimed by the site; not a street address. No precise personal addresses are recorded.',
  confidence: 0.9,
});
const S = F.services.map((name, i) =>
  objectEvent('ping.knowledge.service@1', name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), {
    claim_basis: 'website_statement', name, confidence: 0.95,
  })
);
const P1 = objectEvent('ping.knowledge.person@1', 'taylor-happy', {
  claim_basis: 'website_statement',
  name: F.owner_1.name, role: 'owner', site_description: F.owner_1.site_description,
  persona_note: 'Persona presented on the portfolio demo site; not a verified real person. No personal addresses recorded.',
  confidence: 0.9,
});
const P2 = objectEvent('ping.knowledge.person@1', 'lanie-happy', {
  claim_basis: 'website_statement',
  name: F.owner_2.name, role: 'owner', site_description: F.owner_2.site_description,
  persona_note: 'Persona presented on the portfolio demo site; not a verified real person. No personal addresses recorded.',
  confidence: 0.9,
});
objs.push(B1, W1, L1, ...S, P1, P2);

// ---------------- relationships ----------------
const rels = [
  relEvent(B1.aggregate_id, 'has_website', W1.aggregate_id),
  relEvent(B1.aggregate_id, 'located_at', L1.aggregate_id, { basis: 'website_statement', note: 'service area' }),
  ...S.map((s) => relEvent(B1.aggregate_id, 'offers', s.aggregate_id)),
  relEvent(B1.aggregate_id, 'employs', P1.aggregate_id, { role: 'owner' }),
  relEvent(B1.aggregate_id, 'employs', P2.aggregate_id, { role: 'owner' }),
  relEvent(P1.aggregate_id, 'member_of', B1.aggregate_id, { role: 'owner' }),
  relEvent(P2.aggregate_id, 'member_of', B1.aggregate_id, { role: 'owner' }),
];

const bodies = [...objs, ...rels].map(({ _label, ...b }) => ({ ...b, _label }));
fs.writeFileSync(path.join(DIR, 'bodies.json'), JSON.stringify(bodies, null, 2));

// boundary.json: knowledge BFF envelope -> live gateway must reject (old adapter)
const boundaryPayload = {
  schema: 'ping.knowledge.business@1', controller: CONTROLLER, key: 'boundary-probe',
  content: { claim_basis: 'website_statement', name: 'Boundary Probe' },
};
const boundaryMeta = { provenance: PROV };
const boundaryBytes = canonicalize({ type: 'OBJECT_CREATED', payload: boundaryPayload, metadata: boundaryMeta });
const boundarySig = crypto.sign(null, Buffer.from(boundaryBytes, 'utf8'), privateKey).toString('base64');
fs.writeFileSync(path.join(DIR, 'boundary.json'), JSON.stringify({
  type: 'OBJECT_CREATED', payload: boundaryPayload, metadata: boundaryMeta,
  proof: { algorithm: 'ed25519', signature: boundarySig, publicKey: publicPem },
}, null, 2));

console.log(`objects=${objs.length} relationships=${rels.length} total=${bodies.length}`);
for (const b of bodies) console.log(`  ${b.event_type} ${b._label} -> ${b.aggregate_id}`);
const preds = {}; for (const r of rels) preds[r._label] = (preds[r._label] || 0) + 1;
console.log('predicates:', JSON.stringify(preds));
const schemas = {}; for (const o of objs) schemas[o.event_data.schema] = (schemas[o.event_data.schema] || 0) + 1;
console.log('schemas:', JSON.stringify(schemas));
console.log('boundary envelope written (expect HTTP 400 UNSUPPORTED_SCHEMA from live gateway)');
