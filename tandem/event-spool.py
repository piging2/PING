#!/usr/bin/env python3
"""event-spool.py -- durable local outbox for PING observation emission.

Harvest-first reuse (2026-09-27): this ports two proven-but-unwired gateway
primitives to the transport edge, where this machine loses Tailscale/SSH/
gateway/Pig connectivity and accepted work must not be lost:

- gateway/event_outbox.js (Phase 21, 296 lines, on the Pig at
  /home/nolan/ping/gateway/event_outbox.js): write-in-transaction,
  uq_outbox_event_id, 1s relay publisher (LIMIT 10, ORDER BY created_at),
  publish_attempts < 5, dead-letter at >= 5 attempts, retryFailedEvent
  resets attempts, canonical_event JSONB, published/published_at.
- gateway/advisory_lock.js (Phase A1.5, 266 lines): "Every mutable
  aggregate must have one writer. Application mutexes prohibited."
  The shipper holds an exclusive flock on the spool lockfile (the local
  analog of pg_try_advisory_lock keyed on the spool); a second shipper
  exits without touching rows.

State machine: ACCEPTED -> DURABLY SPOOLED -> DELIVERY_PENDING ->
DELIVERED -> ACKNOWLEDGED.

ACCEPTED is an explicit durable record (the local authorization decision:
gates passed), written before the fsync'd DURABLY SPOOLED record. Every
transition in the required contract is therefore observable in the log;
a crash between the two still leaves shippable work.

Probe outcomes are THREE-STATE, never collapsed (Nolan 2026-09-27: UNKNOWN
is a legitimate state). probe(key) returns:
  event_id (str)  -> the remote already has this observation (found)
  None            -> confirmed absent on the remote
  'UNCHECKABLE'   -> outcome unknown (probe transport failed)
An UNCHECKABLE probe NEVER leads to a POST: a prior attempt may have
POSTed with an unknown outcome, so the item holds DELIVERY_PENDING until
a later ship reconciles the probe. UNKNOWN must reconcile before retry.

Idempotency: spool() reuses the existing spool_id for a repeated
idempotency_key (the local analog of uq_outbox_event_id) instead of
appending a duplicate lineage. Same key + different payload bytes is a
caller bug and raises ValueError.

The canonical event store stays PING (ping_events via the gateway). This
file is a transport buffer, not an event authority and not a new event
store: nothing here is queried as truth, it only guarantees accepted work
reaches the gateway exactly once.

Identity: idempotency_key is caller-chosen (for observations it is the
observation-text sha256, the same key emit-observation.py's duplicate
guard and crash-recovery probe use). The shipper ALWAYS probes the remote
by idempotency_key before POSTing, so a crash between POST and the local
DELIVERED record can never double-emit: recovery finds the orphaned event
and marks ACKNOWLEDGED without re-POSTing.

Usage:
  event-spool.py ship                 # drain pending via observation transport
  event-spool.py retry <spool_id>     # reset attempts (mirrors retryFailedEvent)
  event-spool.py status [<spool_id>]  # show state(s)
  event-spool.py pending              # list unshipped spool_ids
"""
import fcntl
import hashlib
import json
import os
import sys
import time
import uuid

SPOOL_DIR = os.path.expanduser('~/workspace/tandem')
SPOOL_PATH = os.path.join(SPOOL_DIR, 'event-spool.jsonl')
LOCK_PATH = os.path.join(SPOOL_DIR, 'event-spool.lock')
# Module directory is immutable: derived from __file__, never from the
# mutable SPOOL_DIR, so a redirected spool dir can never relocate the
# emit-observation module lookup.
_MODULE_DIR = os.path.dirname(os.path.abspath(__file__))

# Mirrors event_outbox.js: publish_attempts < 5, dead-letter at >= 5.
MAX_ATTEMPTS = 5
# Mirrors the 1s relay publisher's LIMIT 10 per sweep.
SHIP_LIMIT = 10

STATES = ('ACCEPTED', 'DURABLY SPOOLED', 'DELIVERY_PENDING', 'DELIVERED',
          'ACKNOWLEDGED', 'DEAD_LETTER')

# Probe outcome: the remote state could not be determined. Never collapsed
# into "absent": _deliver_one holds the item DELIVERY_PENDING on this.
PROBE_UNCHECKABLE = 'UNCHECKABLE'

# States that still need shipping (an ACCEPTED record whose DURABLY SPOOLED
# follow-up never landed after a crash is still unshipped work).
PENDING_STATES = ('ACCEPTED', 'DURABLY SPOOLED', 'DELIVERY_PENDING')


class TransportError(RuntimeError):
    """The remote is unreachable or refused the delivery. Retryable."""


def _now():
    return time.strftime('%Y-%m-%dT%H:%M:%S+00:00', time.gmtime())


def _canonical_bytes(payload):
    return json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')


def _append(record):
    """The local write-in-transaction: append + flush + fsync."""
    os.makedirs(SPOOL_DIR, exist_ok=True)
    line = json.dumps(record, sort_keys=True, separators=(',', ':')) + '\n'
    with open(SPOOL_PATH, 'a', encoding='utf-8') as fh:
        fh.write(line)
        fh.flush()
        os.fsync(fh.fileno())


def _read_all():
    if not os.path.exists(SPOOL_PATH):
        return []
    out = []
    with open(SPOOL_PATH, 'r', encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def current_state(spool_id):
    """Fold the append-only log: last record per spool_id wins."""
    state = None
    for rec in _read_all():
        if rec.get('spool_id') == spool_id:
            state = rec
    return state


def pending(limit=SHIP_LIMIT):
    """Unshipped items in spool order (mirrors ORDER BY created_at ASC)."""
    latest = {}
    order = []
    for rec in _read_all():
        sid = rec.get('spool_id')
        if sid not in latest:
            order.append(sid)
        latest[sid] = rec
    out = [latest[sid] for sid in order
           if latest[sid]['state'] in PENDING_STATES]
    return out[:limit]


def _latest_by_idempotency_key():
    """Last record per idempotency_key (the local uq_outbox_event_id)."""
    latest = {}
    for rec in _read_all():
        key = rec.get('idempotency_key')
        if key:
            latest[key] = rec
    return latest


def spool(payload, *, event_type, aggregate_id, aggregate_type,
          idempotency_key):
    """ACCEPTED -> DURABLY SPOOLED. Returns spool_id.

    Validates, canonicalizes, and fsync-appends the ACCEPTED record (the
    local authorization decision) followed by the DURABLY SPOOLED record.
    When this returns, the work survives process crash and transport loss.

    Idempotency (local uq_outbox_event_id): a repeated idempotency_key
    reuses the existing spool_id instead of appending a duplicate
    lineage. A DEAD_LETTER key is requeued (attempts reset, like retry()).
    Same key with different payload bytes raises ValueError (caller bug:
    fail closed rather than silently aliasing two different observations).

    Raises ValueError on invalid input (fail closed before durability).
    """
    if not isinstance(payload, dict) or not payload:
        raise ValueError('payload must be a non-empty dict')
    for name, val in (('event_type', event_type),
                      ('aggregate_id', aggregate_id),
                      ('aggregate_type', aggregate_type),
                      ('idempotency_key', idempotency_key)):
        if not val or not isinstance(val, str):
            raise ValueError('%s must be a non-empty string' % name)
    canon = _canonical_bytes(payload)
    digest = hashlib.sha256(canon).hexdigest()
    existing = _latest_by_idempotency_key().get(idempotency_key)
    if existing is not None:
        if existing.get('digest') != digest:
            raise ValueError(
                'idempotency_key %r already spooled with different payload '
                'bytes; refusing to alias' % idempotency_key)
        sid = existing['spool_id']
        if existing['state'] == 'DEAD_LETTER':
            _transition(sid, 'DURABLY SPOOLED', attempts=0, error=None)
        return sid
    spool_id = 'spl_' + uuid.uuid4().hex[:16]
    base = {
        'spool_id': spool_id,
        'event_id': 'evt_' + digest[:16],  # local analog of uq_outbox_event_id
        'event_type': event_type,
        'aggregate_id': aggregate_id,
        'aggregate_type': aggregate_type,
        'idempotency_key': idempotency_key,
        'digest': digest,
        'canonical': canon.decode('utf-8'),
        'attempts': 0,
        'error': None,
    }
    # ACCEPTED first (explicit authorization record), then the fsync'd
    # DURABLY SPOOLED. _transition carries the ACCEPTED fields forward.
    _append(dict(base, state='ACCEPTED', accepted_at=_now(), ts=_now()))
    _transition(spool_id, 'DURABLY SPOOLED')
    return spool_id


def _transition(spool_id, state, **fields):
    if state not in STATES:
        raise ValueError('unknown state %r' % state)
    rec = current_state(spool_id) or {}
    rec.update({
        'spool_id': spool_id,
        'state': state,
        'ts': _now(),
    })
    rec.update(fields)
    _append(rec)
    return rec


def _deliver_one(item, deliver, probe, on_probe_hit=None):
    """Ship one item: probe-before-post makes every delivery idempotent.

    The probe has three outcomes, never collapsed: event_id (found),
    None (confirmed absent), PROBE_UNCHECKABLE (unknown). On UNCHECKABLE
    the item holds DELIVERY_PENDING and NO POST is made: a prior attempt
    may have POSTed with an unknown outcome, and UNKNOWN must reconcile
    before retry. on_probe_hit(item, event_id), when given, runs after a
    probe-hit ACKNOWLEDGE (e.g. healing a sidecar the crash skipped).
    """
    sid = item['spool_id']
    key = item['idempotency_key']
    # Crash-recovery probe first: a previous attempt may have POSTed
    # successfully before dying. A hit means ACKNOWLEDGED without re-POSTing.
    try:
        found = probe(key)
    except Exception:
        found = PROBE_UNCHECKABLE  # probe transport blew up: outcome unknown
    if found == PROBE_UNCHECKABLE:
        return _transition(sid, 'DELIVERY_PENDING',
                           attempts=item.get('attempts', 0),
                           error='probe uncheckable; holding for '
                                 'reconciliation before retry')
    if found:
        rec = _transition(sid, 'ACKNOWLEDGED', remote_event_id=found,
                          recovered_via_probe=True,
                          attempts=item.get('attempts', 0))
        if on_probe_hit is not None:
            on_probe_hit(item, found)
        return rec
    payload = json.loads(item['canonical'])
    try:
        remote_event_id = deliver(payload)
    except TransportError as e:
        attempts = item.get('attempts', 0) + 1
        state = 'DEAD_LETTER' if attempts >= MAX_ATTEMPTS else 'DELIVERY_PENDING'
        return _transition(sid, state, attempts=attempts, error=str(e))
    _transition(sid, 'DELIVERED', remote_event_id=remote_event_id,
                attempts=item.get('attempts', 0))
    return _transition(sid, 'ACKNOWLEDGED', remote_event_id=remote_event_id,
                       attempts=item.get('attempts', 0))


def ship(deliver, probe, limit=SHIP_LIMIT, on_probe_hit=None):
    """Drain pending items under the single-writer lock.

    Returns (shipped, skipped_locked). shipped is a list of
    (spool_id, final_state) tuples.
    """
    os.makedirs(SPOOL_DIR, exist_ok=True)
    shipped = []
    with open(LOCK_PATH, 'w') as lockfh:
        try:
            fcntl.flock(lockfh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except (IOError, OSError):
            # Another shipper holds the lock: one writer per spool.
            return ([], True)
        try:
            for item in pending(limit):
                rec = _deliver_one(item, deliver, probe, on_probe_hit)
                shipped.append((item['spool_id'], rec['state']))
        finally:
            fcntl.flock(lockfh.fileno(), fcntl.LOCK_UN)
    return (shipped, False)


def retry(spool_id):
    """Reset attempts so a dead-lettered item ships again.

    Mirrors event_outbox.js retryFailedEvent.
    """
    cur = current_state(spool_id)
    if not cur:
        raise ValueError('unknown spool_id %r' % spool_id)
    return _transition(spool_id, 'DURABLY SPOOLED', attempts=0, error=None)


def mark_delivery_pending(spool_id, error):
    """Record a failed delivery attempt (attempts+1, dead-letter at cap)."""
    cur = current_state(spool_id) or {}
    attempts = cur.get('attempts', 0) + 1
    state = 'DEAD_LETTER' if attempts >= MAX_ATTEMPTS else 'DELIVERY_PENDING'
    return _transition(spool_id, state, attempts=attempts, error=str(error))


def mark_acknowledged(spool_id, remote_event_id):
    """DELIVERED -> ACKNOWLEDGED once the remote accepted the payload."""
    cur = current_state(spool_id) or {}
    _transition(spool_id, 'DELIVERED', remote_event_id=remote_event_id,
                attempts=cur.get('attempts', 0))
    return _transition(spool_id, 'ACKNOWLEDGED',
                       remote_event_id=remote_event_id,
                       attempts=cur.get('attempts', 0))


def ship_one(spool_id, deliver, probe, on_probe_hit=None):
    """Ship exactly one spooled item (used by the emit path)."""
    cur = current_state(spool_id)
    if not cur:
        raise ValueError('unknown spool_id %r' % spool_id)
    if cur['state'] == 'ACKNOWLEDGED':
        return cur
    os.makedirs(SPOOL_DIR, exist_ok=True)
    with open(LOCK_PATH, 'w') as lockfh:
        try:
            fcntl.flock(lockfh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except (IOError, OSError):
            raise TransportError('spool locked by another shipper')
        try:
            # Re-read under the lock: another shipper may have finished it.
            cur = current_state(spool_id)
            if cur['state'] == 'ACKNOWLEDGED':
                return cur
            return _deliver_one(cur, deliver, probe, on_probe_hit)
        finally:
            fcntl.flock(lockfh.fileno(), fcntl.LOCK_UN)


def purge(days=30):
    """Drop ACKNOWLEDGED/DEAD_LETTER items older than `days`.

    Mirrors event_outbox.js cleanOldEvents. Rewrites the log compactly;
    only terminal states are eligible, pending work is never touched.
    """
    cutoff = time.time() - days * 86400
    keep = []
    drop_sids = set()
    latest = {}
    records = _read_all()
    for rec in records:
        latest[rec['spool_id']] = rec
    for sid, rec in latest.items():
        try:
            ts = time.mktime(time.strptime(rec['ts'][:19], '%Y-%m-%dT%H:%M:%S'))
        except Exception:
            continue
        if rec['state'] in ('ACKNOWLEDGED', 'DEAD_LETTER') and ts < cutoff:
            drop_sids.add(sid)
    for rec in records:
        if rec['spool_id'] not in drop_sids:
            keep.append(rec)
    if drop_sids:
        tmp = SPOOL_PATH + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as fh:
            for rec in keep:
                fh.write(json.dumps(rec, sort_keys=True,
                                    separators=(',', ':')) + '\n')
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, SPOOL_PATH)
    return sorted(drop_sids)


def _observation_transport():
    """Wire the real observation delivery path (emit-observation.py).

    Dash in the filename: load via importlib, not import.
    Returns (deliver, probe, on_probe_hit). The probe keeps all three
    outcomes distinct: event_id | None | PROBE_UNCHECKABLE, never
    collapsed. on_probe_hit heals the sidecar's accepted_by_ping
    transition for an orphaned emission (crash between POST and the
    sidecar write); it never raises.
    """
    import importlib.util
    p = os.path.join(_MODULE_DIR, 'emit-observation.py')
    spec = importlib.util.spec_from_file_location('emit_observation', p)
    eo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(eo)

    def deliver(payload):
        try:
            return eo.deliver_observation(payload)
        except Exception as e:
            raise TransportError(str(e))

    def probe(idempotency_key):
        try:
            return eo.find_event_in_ping(idempotency_key)
        except Exception:
            return PROBE_UNCHECKABLE

    def on_probe_hit(item, remote_event_id):
        try:
            payload = json.loads(item['canonical'])
            brief = (payload.get('event_data') or {}).get('brief_id')
            if brief:
                eo._mark_accepted(brief, remote_event_id,
                                  item['idempotency_key'])
        except Exception:
            pass

    return deliver, probe, on_probe_hit


def main(argv):
    if len(argv) < 2:
        print('usage: event-spool.py ship|retry <id>|status [id]|pending')
        return 2
    cmd = argv[1]
    if cmd == 'ship':
        deliver, probe, on_probe_hit = _observation_transport()
        shipped, locked = ship(deliver, probe, on_probe_hit=on_probe_hit)
        if locked:
            print('SPOOL_LOCKED another shipper holds the lock; no work done')
            return 0
        for sid, state in shipped:
            print('SPOOL %s %s' % (sid, state))
        if not shipped:
            print('SPOOL_EMPTY nothing pending')
        return 0
    if cmd == 'retry':
        if len(argv) < 3:
            print('usage: event-spool.py retry <spool_id>', file=sys.stderr)
            return 2
        rec = retry(argv[2])
        print('SPOOL %s %s attempts=%d' % (rec['spool_id'], rec['state'],
                                           rec['attempts']))
        return 0
    if cmd == 'status':
        if len(argv) >= 3:
            rec = current_state(argv[2])
            print(json.dumps(rec, indent=1) if rec else 'SPOOL_UNKNOWN')
        else:
            latest = {}
            for rec in _read_all():
                latest[rec['spool_id']] = rec['state']
            for sid, state in latest.items():
                print('SPOOL %s %s' % (sid, state))
            if not latest:
                print('SPOOL_EMPTY')
        return 0
    if cmd == 'pending':
        for item in pending():
            print('SPOOL %s %s attempts=%d' % (item['spool_id'],
                                               item['state'],
                                               item.get('attempts', 0)))
        return 0
    print('unknown command %r' % cmd, file=sys.stderr)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv))
