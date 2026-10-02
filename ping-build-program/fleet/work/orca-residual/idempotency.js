/**
 * idempotency.js — ORCA residual lane (2026-09-24)
 *
 * Stable operation/idempotency key for every consequential effect.
 *
 *   op_key = sha256("op:v1:" + mission_id + ":" + effect_name + ":" + canonical(input))
 *
 * Properties (all required by Nolan's order):
 * - STABLE: derived only from the LOGICAL operation (mission, effect name,
 *   canonical input). Never includes attempt number, timestamps, PIDs, or
 *   any runtime ephemera, so retries of the same logical operation resolve
 *   to the same key.
 * - COLLISION-RESISTANT: sha256 over canonical (key-sorted) JSON.
 * - PORTABLE: the same derivation the worker and the coordinator both
 *   compute independently; agreement on the key is what makes duplicate
 *   detection possible across process boundaries and restarts.
 */
'use strict';
const crypto = require('crypto');
const { canonical } = require('./event_journal');

function deriveOpKey({ missionId, effect, input }) {
  if (!missionId || !effect || input === undefined) {
    throw new Error('deriveOpKey requires {missionId, effect, input}');
  }
  const material = 'op:v1:' + missionId + ':' + effect + ':' + canonical(input);
  return crypto.createHash('sha256').update(material, 'utf8').digest('hex');
}

function deriveInputDigest(input) {
  return crypto.createHash('sha256').update(canonical(input), 'utf8').digest('hex');
}

module.exports = { deriveOpKey, deriveInputDigest };
