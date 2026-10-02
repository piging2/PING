#!/usr/bin/env python3
"""F7-B surgical edits. Applies only if EVERY anchor matches exactly once.
Usage: python3 f7b_edits.py (run from the worktree root on the Pig).
Aborts without writing if any anchor fails."""
import sys

ROOT = '/home/nolan/worktrees/constitutional-convergence'

def replace_once(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    n = text.count(old)
    if n != 1:
        print(f'ABORT: anchor "{label}" matched {n}x (expected 1) in {path}')
        sys.exit(1)
    text = text.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'OK: {label}')

# ---------------------------------------------------------------- canonical_authority.js
p1 = ROOT + '/runtime/kernel/authorities/canonical_authority.js'

# 1a. Require the pinned RFC-8785 artifact after the crypto require.
replace_once(p1,
"""const crypto = require('crypto');
""",
"""const crypto = require('crypto');

// F7/D2: the single pinned canonicalization implementation. CanonicalBytes
// delegates all canonical serialization to the RFC-8785 CanonicalJson authority.
// The artifact is rebuilt from runtime/kernel/replay/canonical_json.ts via
// scripts/rebuild-canonical-json.sh; never hand-edit the compiled artifact.
const { CanonicalJson } = require('../../../gateway/replay/kernel/canonical_json.js');
""",
    'canonical_authority: require CanonicalJson')

with open(p1, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1b. Locate `static serialize(obj) {` and its docblock, replace both by line surgery.
start = next(i for i, l in enumerate(lines) if l.strip() == 'static serialize(obj) {')
# scan back over the docblock
doc_start = start - 1
while doc_start >= 0 and (lines[doc_start].strip().startswith('*')
                          or lines[doc_start].strip().startswith('/**')
                          or lines[doc_start].strip() == ''):
    doc_start -= 1
doc_start += 1
# brace-count to the method end
depth = 0
end = start
for i in range(start, len(lines)):
    depth += lines[i].count('{') - lines[i].count('}')
    if i > start and depth == 0:
        end = i
        break
else:
    print('ABORT: could not find end of serialize method')
    sys.exit(1)
print(f'OK: serialize method spans lines {start+1}-{end+1}, docblock starts line {doc_start+1}')

new_doc_and_method = '''  /**
   * Serialize object to canonical bytes
   *
   * Constitutional Constraint: Only accepts structured data, never raw bytes.
   *
   * F7/D2: delegates to the single pinned RFC-8785 implementation
   * (CanonicalJson). The canonical serialization rules are the F7/D1 identity
   * domain: legal-injective over arrays (grouping significant), strict
   * cross-type distinction, null, mutually-distinct empty object/array/string,
   * Unicode preserved as supplied (NFC != NFD); normalized-equivalent over
   * object key order, -0 == 0, 1.0 == 1; fail-closed typed rejection of NaN,
   * +/-Infinity, undefined anywhere, sparse arrays, circular references,
   * Buffer, functions, symbols, bigint; maximum canonicalization depth 64.
   *
   * For unordered collections, use serializeSet() instead.
   */
  static serialize(obj) {
    // Validate input is structured data, not raw bytes
    if (Buffer.isBuffer(obj)) {
      throw new Error('CanonicalBytes.serialize() does not accept raw Buffer. Use fromBuffer() instead.');
    }

    // F7/D2: delegate to the single pinned RFC-8785 implementation.
    // CanonicalJson.canonicalize() enforces the F7/D1 identity domain: values
    // outside the domain throw a typed deterministic error BEFORE any bytes
    // are produced. Fail-closed: rejected values never yield canonical bytes,
    // so no identity can be minted from them.
    const canonical = CanonicalJson.canonicalize(obj);
    return Buffer.from(canonical, 'utf8');
  }
'''
lines[doc_start:end+1] = [new_doc_and_method]
with open(p1, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('OK: canonical_authority: serialize delegates to CanonicalJson')

# ---------------------------------------------------------------- identity_authority.js
p2 = ROOT + '/runtime/kernel/authorities/identity_authority.js'
replace_once(p2,
"""    this._identityVersion = '1.0.0';""",
"""    // F7/D2: V2 identity domain. The version is inside the hash preimage
    // (see generateId), so V2 IDs are domain-separated from V1. Era H (stored
    // 64-hex IDs) and V1 (zero persisted rows) are never rewritten.
    this._identityVersion = '2.0.0';""",
    'identity_authority: _identityVersion 2.0.0')

# ---------------------------------------------------------------- unified_event_runtime.js
p3 = ROOT + '/ping-runtime/events/unified_event_runtime.js'

# 3a. Head comment: build material first, mint later.
replace_once(p3,
"""    // 1. Generate canonical event_id via the constitutional identity authority.
    //    IdentityAuthority.generateId('event', material) ->
    //    CanonicalBytes.serialize -> CanonicalAuthority.hashBytes -> `event_<16hex>`.
    //    Identity material = { event_type, source, namespace, [logical_id|payload] }.
    //    The namespace default is resolved BEFORE identity (C-007 fix): explicit vs
    //    default 'core::system' now produce the same identity for the same event.
    //    Timestamp is deliberately excluded: wall-clock is observation metadata assigned
    //    after identity; logical_id is the timestamp-stripped logical identity - two
    //    emissions of the same logical event (even with different timestamps in payload)
    //    hash identically, preserving idempotent retries.
    //    New IDs are `event_`-prefixed (self-identifying identity era); historical 64-hex
    //    IDs remain immutable and are never recomputed.
    const namespace = options.namespace || 'core::system';
    const identityData = { event_type: eventType, source, namespace };
    identityData[options.logical_id ? 'logical_id' : 'payload'] = options.logical_id || payload;
    const eventId = identityAuthority.generateId('event', identityData);

    // 2. Validate event type
""",
"""    // 1. Build identity material (no ID is minted yet).
    //    Identity material = { event_type, source, namespace, [logical_id|payload] }.
    //    The namespace default is resolved BEFORE identity (C-007 fix): explicit vs
    //    default 'core::system' now produce the same identity for the same event.
    //    Timestamp is deliberately excluded: wall-clock is observation metadata assigned
    //    after identity; logical_id is the timestamp-stripped logical identity - two
    //    emissions of the same logical event (even with different timestamps in payload)
    //    hash identically, preserving idempotent retries.
    const namespace = options.namespace || 'core::system';
    const identityData = { event_type: eventType, source, namespace };
    identityData[options.logical_id ? 'logical_id' : 'payload'] = options.logical_id || payload;

    // 2. Validate event type BEFORE identity minting (F7/D1): a rejected event
    //    receives NO canonical event ID, NO persistence, NO acceptance claim.
""",
    'emit: validate-before-mint head')

# 3b/3c. Typed rejections without eventId.
replace_once(p3,
"""          return { status: 'error', error: validation.error, eventId };""",
"""          return { status: 'error', code: 'UNKNOWN_EVENT_TYPE', error: validation.error };""",
    'emit: event-type validation rejection')
replace_once(p3,
"""          return { status: 'error', error: `Unknown event_type: ${eventType}`, eventId };""",
"""          return { status: 'error', code: 'UNKNOWN_EVENT_TYPE', error: `Unknown event_type: ${eventType}` };""",
    'emit: unknown event-type rejection')
replace_once(p3,
"""        return { status: 'error', error: reason, code: governance.code, eventId };""",
"""        return { status: 'error', error: reason, code: governance.code || 'GOVERNANCE_VIOLATION' };""",
    'emit: governance rejection')

# 3d. Mint AFTER all rejections, inside the value-domain boundary.
replace_once(p3,
"""    // 4. Build canonical event (namespace resolved in step 3)
""",
"""    // 4. Mint canonical event_id via the constitutional identity authority (V2).
    //    IdentityAuthority.generateId('event', material) ->
    //    CanonicalJson.canonicalize (RFC-8785, F7/D1 domain) ->
    //    CanonicalAuthority.hashBytes -> `event_<16hex>`.
    //    `identity_version: 2.0.0` is inside the preimage (domain separation from
    //    V1; Era H 64-hex IDs remain immutable and are never recomputed).
    //    The F7/D1 value-domain boundary throws a typed deterministic error for
    //    rejected values BEFORE any ID exists: rejected events receive NO
    //    canonical event ID, NO persistence, NO acceptance claim.
    //    New IDs are `event_`-prefixed (self-identifying identity era).
    let eventId;
    try {
      eventId = identityAuthority.generateId('event', identityData);
    } catch (err) {
      this._stats.failed++;
      const df = err && err.deterministicFailure;
      return {
        status: 'error',
        code: 'IDENTITY_VALUE_REJECTED',
        error: (df && df.context && df.context.reason) || err.message,
        deterministicCode: df && df.code,
      };
    }

    // 5. Build canonical event (namespace resolved in step 1)
""",
    'emit: mint inside value-domain boundary')

# 3e. Renumber downstream steps.
replace_once(p3, "    // 5. Persist\n", "    // 6. Persist\n", 'emit: renumber persist')
replace_once(p3, "    // 6. Dispatch to handlers\n", "    // 7. Dispatch to handlers\n", 'emit: renumber dispatch')
replace_once(p3, "    // 7. Route to integrations\n", "    // 8. Route to integrations\n", 'emit: renumber integrations')

print('ALL F7-B EDITS APPLIED')
