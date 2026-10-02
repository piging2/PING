/**
 * Identity Routes
 *
 * Governed PING identity creation and sanitized identity reads.
 *
 * POST /identities mints a PING identity through the ONE IdentityAuthority
 * (compiled from runtime/constitutional/src at Docker build time; never
 * reimplemented here) and emits it as a canonical OBJECT_CREATED with
 * schema ping.identity@1. The caller supplies display name, handle, bio,
 * and an Ed25519 public key (PEM or SPKI DER hex); the private key never
 * crosses this boundary and the gateway never holds one.
 *
 * Minting is idempotent: the same (display_name, public_key) always mints
 * the same identity id (verified against the live Nolan identity
 * identity_cc3383c868f96fc1), and a repeat submission returns the existing
 * identity instead of a conflict.
 *
 * The emitted identity event carries a gateway-genesis attestation proof,
 * not a self-signature: the holder's key is bound in content.public_key and
 * the holder proves control by signing every subsequent event with it.
 *
 * GET /identities returns only public identity fields (identity id, display
 * name, public key, creation time). No private material exists on this path.
 */

const crypto = require('crypto');
const { Router } = require('express');
const { asyncHandler } = require('../route_middleware');
const { IdentityAuthority } = require('../constitutional-dist/identity-authority.js');
const { HashAuthority } = require('../constitutional-dist/hash-authority.js');

const IDENTITY_SCHEMA = 'ping.identity@1';
const HANDLE_RE = /^[a-z0-9_]{2,24}$/;

function badRequest(res, code, message) {
  res.status(400).json({ error: code, message });
}

function normalizePublicKeyToDerHex(input) {
  const t = (input || '').trim();
  if (!t) throw new Error('INVALID_PUBLIC_KEY: publicKey (Ed25519, PEM or SPKI DER hex) is required');
  let der;
  if (t.includes('BEGIN PUBLIC KEY')) {
    der = crypto.createPublicKey({ key: t, format: 'pem' }).export({ format: 'der', type: 'spki' });
  } else if (/^[0-9a-fA-F]+$/.test(t)) {
    der = Buffer.from(t, 'hex');
    crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
  } else {
    throw new Error('INVALID_PUBLIC_KEY: expected PEM ("-----BEGIN PUBLIC KEY-----") or SPKI DER hex');
  }
  return der.toString('hex');
}

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes, 'utf8').digest('hex');
}

function canonicalPayloadHash(payload) {
  const stripped = { ...payload };
  delete stripped.proof;
  delete stripped.payload_hash;
  return sha256Hex(JSON.stringify(HashAuthority.canonicalizeObject(stripped)));
}

function createIdentityRoutes(eventRuntime, pool) {
  const router = Router();

  /**
   * GET /identities
   * Sanitized list: public fields only, canonical acceptance order.
   */
  router.get(
    '/',
    asyncHandler('/identities', async (req, res) => {
      const r = await pool.query(
        `SELECT payload->>'object_id' AS identity_id,
                payload->'content'->>'display_name' AS display_name,
                payload->'content'->>'public_key' AS public_key,
                payload->>'created_at' AS created_at
         FROM ping_events
         WHERE event_type = 'OBJECT_CREATED' AND payload->>'schema' = $1
         ORDER BY sequence ASC NULLS LAST`,
        [IDENTITY_SCHEMA]
      );
      return {
        identities: r.rows.map((row) => ({
          identityId: row.identity_id,
          displayName: row.display_name,
          publicKey: row.public_key,
          createdAt: row.created_at,
        })),
      };
    })
  );

  /**
   * POST /identities
   * Governed creation. Body: { displayName|display_name, handle, bio,
   * publicKey|public_key (PEM or SPKI DER hex), algorithm? }.
   */
  router.post(
    '/',
    asyncHandler('/identities', async (req, res) => {
      const displayName = (req.body.displayName || req.body.display_name || '').trim();
      const handle = (req.body.handle || '').trim().toLowerCase();
      const bio = (req.body.bio || '').trim();
      const algorithm = (req.body.algorithm || 'ed25519').toLowerCase();

      if (!displayName || displayName.length > 80) {
        return badRequest(res, 'INVALID_DISPLAY_NAME', 'displayName is required (1-80 characters)');
      }
      if (!HANDLE_RE.test(handle)) {
        return badRequest(res, 'INVALID_HANDLE', 'handle is required and must match /^[a-z0-9_]{2,24}$/');
      }
      if (bio.length > 280) {
        return badRequest(res, 'INVALID_BIO', 'bio must be 280 characters or fewer');
      }
      if (algorithm !== 'ed25519') {
        return badRequest(res, 'UNSUPPORTED_ALGORITHM', 'only ed25519 keys are accepted');
      }

      let publicKeyDerHex;
      try {
        publicKeyDerHex = normalizePublicKeyToDerHex(req.body.publicKey || req.body.public_key);
      } catch (e) {
        return badRequest(res, 'INVALID_PUBLIC_KEY', e.message.replace(/^[^:]+: /, ''));
      }

      const identityId = IdentityAuthority.generateId('identity', {
        display_name: displayName,
        public_key: publicKeyDerHex,
      });

      // Idempotent: the same (display_name, public_key) returns the existing identity.
      const existing = await pool.query(
        `SELECT payload->>'object_id' AS identity_id,
                payload->'content'->>'display_name' AS display_name,
                payload->>'created_at' AS created_at
         FROM ping_events
         WHERE event_type = 'OBJECT_CREATED' AND payload->>'object_id' = $1
         LIMIT 1`,
        [identityId]
      );
      if (existing.rows.length) {
        return {
          identityId,
          displayName: existing.rows[0].display_name,
          handle,
          bio,
          created: false,
          eventId: null,
        };
      }

      const createdAt = new Date().toISOString();
      const stripped = {
        schema: IDENTITY_SCHEMA,
        object_id: identityId,
        controller: identityId,
        created_at: createdAt,
        content: { display_name: displayName, public_key: publicKeyDerHex },
        refs: [],
        visibility: 'public',
        status: 'active',
        metadata: { source: 'ping-gateway-identities', patch: '7B-continuation' },
      };
      const payload = {
        ...stripped,
        payload_hash: canonicalPayloadHash(stripped),
        proof: {
          verification_method: 'gateway-genesis',
          attested_at: createdAt,
          algorithm: 'ed25519',
          note: 'Minted by the governed POST /identities path. The holder key is bound in content.public_key; the holder proves control by signing subsequent events.',
        },
      };

      const result = await eventRuntime.emit('OBJECT_CREATED', 'api', payload, {
        metadata: { aggregate_id: identityId, aggregate_type: 'ping_identity' },
      });
      if (result.status !== 'ok') {
        throw new Error(result.error || 'Event runtime rejected the identity event');
      }

      return {
        identityId,
        displayName,
        handle,
        bio,
        created: true,
        eventId: result.eventId || result.event_id || null,
      };
    })
  );

  return router;
}

module.exports = createIdentityRoutes;
