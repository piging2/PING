"use strict";
/**
 * PING Social Vocabulary (sprint continuation).
 *
 * ONE canonical registry for the social surface vocabulary. This module is the
 * single source of truth that the TypeScript projector, the SQL schema, and
 * the website BFF adapter must all agree with. Nothing else in the repo may
 * define its own copy of these lists.
 *
 * Predicates (relationships):
 *   follows  - subject follows object        (revoke: status 'inactive')
 *   likes    - subject likes object          (revoke: status 'inactive')
 *   replies_to - subject replies to object   (immutable once active)
 *   approves - subject approves object       (governance workflow)
 *   denies   - subject denies object         (governance workflow)
 * There are NO `unfollows` or `unlikes` predicates. Revocation is a second
 * RELATIONSHIP_CREATED event with the same predicate and status 'inactive'
 * (last-wins by acceptance sequence). Verified live: the Patch 7B unlike is
 * a second `likes` event with status inactive.
 *
 * Object schemas:
 *   ping.identity@1, ping.social.profile@1, ping.social.post@1,
 *   ping.social.circle@1, ping.social.proposal@1
 *
 * Projector operations (ping_objects.operation / ping_transitions.operation):
 *   'create' - from OBJECT_CREATED
 *   'update' - from OBJECT_UPDATED (shallow content merge, right-wins)
 *   'relate' - from RELATIONSHIP_CREATED (current-state upsert, last-wins)
 *
 * Visibility (schema supports): 'public' | 'followers' | 'private'.
 * PING_ONLY is an explicit documented gap (no schema support yet).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_SCHEMAS = exports.KNOWLEDGE_SCHEMAS = exports.CANONICAL_PREDICATES = exports.KNOWLEDGE_PREDICATES = exports.JOURNAL_EVENT_TYPES = exports.VISIBILITY_GAP = exports.SUPPORTED_VISIBILITIES = exports.PROJECTOR_OPERATIONS = exports.SOCIAL_SCHEMAS = exports.FORBIDDEN_PREDICATES = exports.REVOCABLE_PREDICATES = exports.SOCIAL_PREDICATES = void 0;
exports.isSocialPredicate = isSocialPredicate;
exports.isForbiddenPredicate = isForbiddenPredicate;
exports.isRevocablePredicate = isRevocablePredicate;
exports.isSupportedVisibility = isSupportedVisibility;
exports.assertProjectorOperation = assertProjectorOperation;
exports.isKnowledgePredicate = isKnowledgePredicate;
exports.isCanonicalPredicate = isCanonicalPredicate;
exports.isKnowledgeSchema = isKnowledgeSchema;
exports.isCanonicalSchema = isCanonicalSchema;
exports.SOCIAL_PREDICATES = [
    'follows',
    'likes',
    'replies_to',
    'approves',
    'denies',
];
/** Predicates whose rows are current-state (last-wins by sequence). */
exports.REVOCABLE_PREDICATES = new Set([
    'follows',
    'likes',
]);
/** Predicates that must never appear in any payload. */
exports.FORBIDDEN_PREDICATES = ['unfollows', 'unlikes'];
exports.SOCIAL_SCHEMAS = [
    'ping.identity@1',
    'ping.social.profile@1',
    'ping.social.post@1',
    'ping.social.circle@1',
    'ping.social.proposal@1',
];
exports.PROJECTOR_OPERATIONS = ['create', 'update', 'relate'];
exports.SUPPORTED_VISIBILITIES = ['public', 'followers', 'private'];
/**
 * PING_ONLY has no schema support yet. The projector must fail closed
 * (refuse to project) any object whose visibility is not in
 * SUPPORTED_VISIBILITIES rather than silently downgrading it.
 */
exports.VISIBILITY_GAP = 'PING_ONLY';
exports.JOURNAL_EVENT_TYPES = [
    'OBJECT_CREATED',
    'OBJECT_UPDATED',
    'RELATIONSHIP_CREATED',
];
function isSocialPredicate(p) {
    return exports.SOCIAL_PREDICATES.includes(p);
}
function isForbiddenPredicate(p) {
    return exports.FORBIDDEN_PREDICATES.includes(p);
}
function isRevocablePredicate(p) {
    return exports.REVOCABLE_PREDICATES.has(p);
}
function isSupportedVisibility(v) {
    return exports.SUPPORTED_VISIBILITIES.includes(v);
}
/**
 * Assert the projector operation is one of the canonical three.
 * Throws on anything else (e.g. legacy 'create'/'relate' aliases are fine,
 * but nothing outside this list may reach the projection tables).
 */
function assertProjectorOperation(op) {
    if (!exports.PROJECTOR_OPERATIONS.includes(op)) {
        throw new Error(`PingVocabulary: unknown projector operation '${op}'`);
    }
}
/* ============================================================================
 * PING Knowledge Vocabulary (Lane B, 2026-09-21; ADDITIVE).
 *
 * Website -> object-graph ingest predicates and schemas. This section only
 * ADDS to the canonical vocabulary; every social predicate, schema,
 * operation, and visibility above is untouched.
 *
 * Predicates (relationships):
 *   has_website       - business has_website website        (the site itself)
 *   located_at        - business located_at location        (service area / address)
 *   offers            - business offers service             (services/products)
 *   employs           - business employs person             (role carried in metadata)
 *   member_of         - person member_of business           (inverse view of employs)
 *   published         - business/website published article  (content authored)
 *   external_identity - business external_identity profile (social/other-platform claim)
 *
 * Revocation rule (unchanged, extended): there are NO negative predicates.
 * Revocation is a second RELATIONSHIP_CREATED with the same predicate and
 * status 'inactive' (last-wins by acceptance sequence in the projector).
 * 'unfollows'/'unlikes' remain forbidden and are not knowledge predicates.
 *
 * Object schemas:
 *   ping.knowledge.business@1, ping.knowledge.website@1,
 *   ping.knowledge.location@1, ping.knowledge.service@1,
 *   ping.knowledge.person@1, ping.knowledge.article@1,
 *   ping.knowledge.external_identity@1
 *
 * Provenance rule: knowledge objects are CLAIMS made by the observed source
 * (e.g. "website says X"), never constitutional truth. Every knowledge
 * object carries metadata.provenance { source_url, source_type, observed_at,
 * evidence_ref } and content carries claim_basis: 'website_statement'.
 * ========================================================================== */
exports.KNOWLEDGE_PREDICATES = [
    'has_website',
    'located_at',
    'offers',
    'employs',
    'member_of',
    'published',
    'external_identity',
];
/**
 * Every predicate the projector may write to ping_relationships.
 * database/ping_objects.sql's predicate CHECK must mirror exactly this list
 * (enforced by ping-vocabulary.test.ts, same as the social list before it).
 */
exports.CANONICAL_PREDICATES = [
    ...exports.SOCIAL_PREDICATES,
    ...exports.KNOWLEDGE_PREDICATES,
];
exports.KNOWLEDGE_SCHEMAS = [
    'ping.knowledge.business@1',
    'ping.knowledge.website@1',
    'ping.knowledge.location@1',
    'ping.knowledge.service@1',
    'ping.knowledge.person@1',
    'ping.knowledge.article@1',
    'ping.knowledge.external_identity@1',
];
/** Every object schema the ingest path may accept. */
exports.CANONICAL_SCHEMAS = [
    ...exports.SOCIAL_SCHEMAS,
    ...exports.KNOWLEDGE_SCHEMAS,
];
function isKnowledgePredicate(p) {
    return exports.KNOWLEDGE_PREDICATES.includes(p);
}
function isCanonicalPredicate(p) {
    return exports.CANONICAL_PREDICATES.includes(p);
}
function isKnowledgeSchema(s) {
    return exports.KNOWLEDGE_SCHEMAS.includes(s);
}
function isCanonicalSchema(s) {
    return exports.CANONICAL_SCHEMAS.includes(s);
}

/* ============================================================================
 * VEIN-5 unknown-vocabulary handling (2026-09-30; Nolan, binding).
 *
 * Boundary rule, enforced by the three helpers below:
 *   - AUTHORITY / WRITE / TRANSITION boundary: UNKNOWN VOCABULARY ->
 *     FAIL CLOSED (assertWriteAllowed throws; assertProjectorOperation
 *     already throws on unknown operations).
 *   - OBSERVATION / IMPORT boundary: UNKNOWN VOCABULARY -> PRESERVE the raw
 *     value -> MARK the payload UNRESOLVED -> WARN -> DO NOT PROMOTE to
 *     canonical semantics (the ingest adapter marks; the write gate refuses).
 *   - DISPLAY boundary: render a safe generic representation
 *     (renderVocabTermSafe never throws and never presents an unknown term
 *     as canonical).
 *
 * FORBIDDEN terms (unfollows/unlikes) are NOT "unknown": they are known and
 * banned, and fail closed at every boundary including import. Do not
 * collapse FORBIDDEN into UNKNOWN.
 *
 * This section only ADDS to the registry. It creates no new authority: the
 * vocabulary module remains the single place that decides what a term means.
 * ========================================================================== */

/** Payload-level resolution marker status. */
exports.UNRESOLVED = 'UNRESOLVED';
exports.RESOLVED = 'RESOLVED';

/** Term classification outcomes. */
exports.VOCAB_STATUS = {
    KNOWN: 'KNOWN',
    UNKNOWN: 'UNKNOWN',
    FORBIDDEN: 'FORBIDDEN',
};

function classifyPredicate(p) {
    if (typeof p === 'string' && isForbiddenPredicate(p)) {
        return { status: exports.VOCAB_STATUS.FORBIDDEN, kind: 'predicate', raw: p, canonical: null };
    }
    if (typeof p === 'string' && isCanonicalPredicate(p)) {
        return { status: exports.VOCAB_STATUS.KNOWN, kind: 'predicate', raw: p, canonical: p };
    }
    return { status: exports.VOCAB_STATUS.UNKNOWN, kind: 'predicate', raw: p, canonical: null };
}

function classifySchema(s) {
    if (typeof s === 'string' && isCanonicalSchema(s)) {
        return { status: exports.VOCAB_STATUS.KNOWN, kind: 'schema', raw: s, canonical: s };
    }
    return { status: exports.VOCAB_STATUS.UNKNOWN, kind: 'schema', raw: s, canonical: null };
}

/**
 * Classify a vocabulary term by kind. kinds: 'predicate' | 'schema' |
 * 'operation' | 'visibility'. Anything else is treated as a predicate.
 * Returns { status: KNOWN|UNKNOWN|FORBIDDEN, kind, raw, canonical }.
 */
function classifyTerm(term, kind) {
    if (kind === 'schema') return classifySchema(term);
    if (kind === 'operation') {
        const known = typeof term === 'string' && exports.PROJECTOR_OPERATIONS.includes(term);
        return {
            status: known ? exports.VOCAB_STATUS.KNOWN : exports.VOCAB_STATUS.UNKNOWN,
            kind: 'operation',
            raw: term,
            canonical: known ? term : null,
        };
    }
    if (kind === 'visibility') {
        const known = isSupportedVisibility(term);
        return {
            status: known ? exports.VOCAB_STATUS.KNOWN : exports.VOCAB_STATUS.UNKNOWN,
            kind: 'visibility',
            raw: term,
            canonical: known ? term : null,
        };
    }
    return classifyPredicate(term);
}

/**
 * Build the UNRESOLVED marker for a payload carrying unknown vocabulary.
 * Deterministic: no timestamps, no randomness. The raw value is preserved
 * verbatim in `raw` so the observation is never lost.
 */
function markUnresolved({ kind, raw, reason }) {
    return {
        status: exports.UNRESOLVED,
        kind: typeof kind === 'string' && kind ? kind : 'term',
        raw: typeof raw === 'string' ? raw : String(raw),
        canonical: null,
        reason: typeof reason === 'string' && reason ? reason : 'unknown vocabulary',
    };
}

/** Build the RESOLVED marker for a payload whose vocabulary all classified KNOWN. */
function markResolved({ kind, raw }) {
    return {
        status: exports.RESOLVED,
        kind: typeof kind === 'string' && kind ? kind : 'term',
        raw: typeof raw === 'string' ? raw : String(raw),
        canonical: typeof raw === 'string' ? raw : String(raw),
    };
}

/** True when the payload carries an UNRESOLVED vocabulary marker. */
function isUnresolved(payload) {
    return !!(payload && payload._vocab && payload._vocab.status === exports.UNRESOLVED);
}

/**
 * AUTHORITY / WRITE / TRANSITION boundary gate: FAIL CLOSED on unknown
 * vocabulary. Throws on:
 *   - an UNRESOLVED marker (import saw unknown vocabulary; the observation
 *     is preserved but must never be written, projected, or transitioned),
 *   - a FORBIDDEN term (banned everywhere, including import),
 *   - a raw UNKNOWN term with no marker (defense in depth for write paths
 *     that never passed the import boundary),
 *   - an unsupported visibility (the documented PING_ONLY gap: refuse to
 *     project rather than silently downgrade).
 * Passes silently for fully canonical payloads.
 */
function assertWriteAllowed(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('VOCAB_GATE: write-boundary payload must be an object');
    }
    if (isUnresolved(payload)) {
        const m = payload._vocab;
        throw new Error(
            `VOCAB_UNRESOLVED: refusing write/transition for UNRESOLVED ${m.kind} '${m.raw}': ${m.reason}. ` +
            'Unknown vocabulary never acquires canonical semantics.'
        );
    }
    if (payload.predicate !== undefined) {
        const c = classifyPredicate(payload.predicate);
        if (c.status === exports.VOCAB_STATUS.FORBIDDEN) {
            throw new Error(
                `FORBIDDEN_VOCABULARY: predicate '${payload.predicate}' must never appear in any payload`
            );
        }
        if (c.status === exports.VOCAB_STATUS.UNKNOWN) {
            throw new Error(
                `UNKNOWN_VOCABULARY: predicate '${payload.predicate}' is not canonical; write refused (fail closed)`
            );
        }
    }
    if (payload.schema !== undefined) {
        const c = classifySchema(payload.schema);
        if (c.status === exports.VOCAB_STATUS.UNKNOWN) {
            throw new Error(
                `UNKNOWN_VOCABULARY: schema '${payload.schema}' is not canonical; write refused (fail closed)`
            );
        }
    }
    if (payload.visibility !== undefined && !isSupportedVisibility(payload.visibility)) {
        throw new Error(
            `UNKNOWN_VISIBILITY: visibility '${payload.visibility}' is not supported; write refused (fail closed, no silent downgrade)`
        );
    }
}

/**
 * DISPLAY boundary: render a safe generic representation of a vocabulary
 * term. Never throws (coerces garbage), never presents an unknown term as
 * canonical: unknown terms render bracketed as unresolved, forbidden terms
 * render as a generic forbidden marker without echoing behavior.
 */
function renderVocabTermSafe(term, kind) {
    const k = typeof kind === 'string' && kind ? kind : 'term';
    let coerced;
    try {
        coerced = typeof term === 'string' ? term : String(term);
    } catch (e) {
        return `[unresolved ${k}: <unrenderable>]`;
    }
    const c = classifyTerm(term, k === 'term' ? 'predicate' : k);
    if (c.status === exports.VOCAB_STATUS.KNOWN) return coerced;
    if (c.status === exports.VOCAB_STATUS.FORBIDDEN) return `[forbidden ${k}]`;
    return `[unresolved ${k}: ${JSON.stringify(coerced)}]`;
}

exports.classifyPredicate = classifyPredicate;
exports.classifySchema = classifySchema;
exports.classifyTerm = classifyTerm;
exports.markUnresolved = markUnresolved;
exports.markResolved = markResolved;
exports.isUnresolved = isUnresolved;
exports.assertWriteAllowed = assertWriteAllowed;
exports.renderVocabTermSafe = renderVocabTermSafe;
