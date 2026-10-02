#!/usr/bin/env python3
"""test-event-spool.py -- prove the durable spool state machine.

Scenarios (each on an isolated spool file, fake remote):
  REMOTE UP / REMOTE DOWN / PROCESS CRASH / RESTART / RETRY /
  DUPLICATE DELIVERY / REMOTE RECOVERY, plus single-writer lock,
  dead-letter + retry, order, validation, and the emit-observation
  spool branch (exit-3 path without touching the network).

State machine: ACCEPTED -> DURABLY SPOOLED -> DELIVERY_PENDING ->
DELIVERED -> ACKNOWLEDGED. Identity: digest = sha256 of canonical bytes,
preserved end to end; the probe-before-post rule means no duplicate
canonical effect even when a POST succeeded before a crash.
"""
import hashlib
import importlib.util
import json
import os
import sys
import tempfile

# Portable: resolve the module from this test's own location so a
# clean-worktree replay tests the checked-out tree, not the dirty root.
_TANDEM = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC = importlib.util.spec_from_file_location(
    'event_spool',
    os.path.join(_TANDEM, 'event-spool.py'))
es = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(es)

PASS = 0
FAIL = 0


def check(name, cond, extra=''):
    global PASS, FAIL
    if cond:
        PASS += 1
        print('ok   %s' % name)
    else:
        FAIL += 1
        print('FAIL %s :: %s' % (name, extra))


def fresh_spool():
    d = tempfile.mkdtemp()
    es.SPOOL_DIR = d
    es.SPOOL_PATH = os.path.join(d, 'event-spool.jsonl')
    es.LOCK_PATH = os.path.join(d, 'event-spool.lock')
    return d


class FakeRemote:
    """In-process stand-in for the gateway: post() ~= POST /events,
    probe() ~= the ping_events observation-hash probe."""

    def __init__(self):
        self.rows = {}      # idempotency_key -> remote event_id
        self.posts = []     # payloads POSTed, in order
        self.failures_left = 0

    def deliver(self, payload):
        if self.failures_left > 0:
            self.failures_left -= 1
            raise es.TransportError('simulated transport down')
        key = payload['test_key']
        eid = 'evt-%04d' % (len(self.rows) + 1)
        self.rows[key] = eid
        self.posts.append(payload)
        return eid

    def probe(self, key):
        return self.rows.get(key)


def mkbody(i, key=None):
    return {'event_type': 'OBSERVATION_CREATED', 'aggregate_id': 'a%d' % i,
            'aggregate_type': 'research_pass', 'n': i,
            'test_key': key or ('k%d' % i)}


def spool_body(body, key=None):
    return es.spool(body, event_type='OBSERVATION_CREATED',
                    aggregate_id=body['aggregate_id'],
                    aggregate_type='research_pass',
                    idempotency_key=key or body['test_key'])


# --- 1. REMOTE UP -------------------------------------------------------
fresh_spool()
r = FakeRemote()
body = mkbody(1)
sid = spool_body(body)
check('spool returns id, state DURABLY SPOOLED',
      es.current_state(sid)['state'] == 'DURABLY SPOOLED')
shipped, locked = es.ship(r.deliver, r.probe)
check('ship drains one item', shipped == [(sid, 'ACKNOWLEDGED')] and not locked,
      str(shipped))
rec = es.current_state(sid)
check('final state ACKNOWLEDGED with remote event id',
      rec['state'] == 'ACKNOWLEDGED' and rec['remote_event_id'] == 'evt-0001',
      str(rec))
canon = json.dumps(body, sort_keys=True, separators=(',', ':')).encode()
check('identity/digest preserved end to end',
      rec['digest'] == hashlib.sha256(canon).hexdigest()
      and r.posts[0] == body,
      rec['digest'])
check('exactly one canonical effect', len(r.rows) == 1 and len(r.posts) == 1)

# --- 2. REMOTE DOWN, then REMOTE RECOVERY --------------------------------
fresh_spool()
r = FakeRemote()
r.failures_left = 999
sid = spool_body(mkbody(2))
shipped, _ = es.ship(r.deliver, r.probe)
rec = es.current_state(sid)
check('REMOTE DOWN: spool() succeeded, ship left DELIVERY_PENDING',
      rec['state'] == 'DELIVERY_PENDING' and rec['attempts'] == 1
      and len(r.rows) == 0, str(rec))
check('payload intact while down',
      json.loads(rec['canonical']) == mkbody(2)
      and rec['digest'] == hashlib.sha256(
          json.dumps(mkbody(2), sort_keys=True,
                     separators=(',', ':')).encode()).hexdigest())
r.failures_left = 0  # transport recovers
shipped, _ = es.ship(r.deliver, r.probe)
check('REMOTE RECOVERY: backlog drains to ACKNOWLEDGED',
      shipped == [(sid, 'ACKNOWLEDGED')]
      and es.current_state(sid)['state'] == 'ACKNOWLEDGED'
      and len(r.rows) == 1, str(shipped))

# --- 3. PROCESS CRASH between POST and local ack, then RESTART -----------
fresh_spool()
r = FakeRemote()
crashed = {'done': False}


def crashy_deliver(payload):
    eid = r.deliver(payload)  # remote accepted...
    if not crashed['done']:
        crashed['done'] = True
        raise es.TransportError('simulated crash after POST, before ack')
    return eid


sid = spool_body(mkbody(3))
es.ship(crashy_deliver, r.probe)  # dies after POST, before DELIVERED record
rec = es.current_state(sid)
check('CRASH: remote holds 1 row, local state DELIVERY_PENDING',
      len(r.rows) == 1 and rec['state'] == 'DELIVERY_PENDING', str(rec))
# RESTART: brand-new interpreter state, same spool file.
shipped, _ = es.ship(crashy_deliver, r.probe)
rec = es.current_state(sid)
check('RESTART: probe found orphan, ACKNOWLEDGED without re-POST',
      rec['state'] == 'ACKNOWLEDGED' and rec.get('recovered_via_probe')
      and len(r.posts) == 1 and len(r.rows) == 1,
      'posts=%d rows=%d rec=%s' % (len(r.posts), len(r.rows), rec))

# --- 4. RETRY ------------------------------------------------------------
fresh_spool()
r = FakeRemote()
r.failures_left = 2
sid = spool_body(mkbody(4))
es.ship(r.deliver, r.probe)
es.ship(r.deliver, r.probe)
rec = es.current_state(sid)
check('two failures -> DELIVERY_PENDING attempts=2',
      rec['state'] == 'DELIVERY_PENDING' and rec['attempts'] == 2, str(rec))
es.ship(r.deliver, r.probe)
rec = es.current_state(sid)
check('RETRY: third attempt ACKNOWLEDGED, one POST total',
      rec['state'] == 'ACKNOWLEDGED' and rec['attempts'] == 2
      and len(r.posts) == 1, str(rec))

# --- 5. DUPLICATE DELIVERY -----------------------------------------------
fresh_spool()
r = FakeRemote()
sid = spool_body(mkbody(5))
es.ship(r.deliver, r.probe)
n_posts = len(r.posts)
es.ship(r.deliver, r.probe)          # second sweep
es.ship_one(sid, r.deliver, r.probe)  # explicit re-ship
check('DUPLICATE DELIVERY: no second POST, still one row',
      len(r.posts) == n_posts == 1 and len(r.rows) == 1
      and es.current_state(sid)['state'] == 'ACKNOWLEDGED',
      'posts=%d' % len(r.posts))

# --- 6. ORDER -------------------------------------------------------------
fresh_spool()
r = FakeRemote()
sids = [spool_body(mkbody(10 + i)) for i in range(3)]
shipped, _ = es.ship(r.deliver, r.probe)
check('ships in spool order',
      [p['n'] for p in r.posts] == [10, 11, 12]
      and [s for s, _ in shipped] == sids,
      str([p['n'] for p in r.posts]))

# --- 7. DEAD LETTER + retry ----------------------------------------------
fresh_spool()
r = FakeRemote()
r.failures_left = 999
sid = spool_body(mkbody(7))
for _ in range(6):
    es.ship(r.deliver, r.probe)
rec = es.current_state(sid)
check('5 failed attempts -> DEAD_LETTER (mirrors event_outbox.js)',
      rec['state'] == 'DEAD_LETTER' and rec['attempts'] == 5, str(rec))
check('dead letter excluded from pending', es.pending() == [])
es.retry(sid)
rec = es.current_state(sid)
check('retry() resets to DURABLY_SPOOLED attempts=0',
      rec['state'] == 'DURABLY SPOOLED' and rec['attempts'] == 0, str(rec))
r.failures_left = 0
es.ship(r.deliver, r.probe)
check('retried item ships after recovery',
      es.current_state(sid)['state'] == 'ACKNOWLEDGED')

# --- 8. SINGLE WRITER ------------------------------------------------------
fresh_spool()
r = FakeRemote()
sid = spool_body(mkbody(8))
import fcntl
lockfh = open(es.LOCK_PATH, 'w')
fcntl.flock(lockfh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
try:
    shipped, locked = es.ship(r.deliver, r.probe)
finally:
    fcntl.flock(lockfh.fileno(), fcntl.LOCK_UN)
    lockfh.close()
check('second shipper exits without touching rows',
      locked and shipped == [] and len(r.posts) == 0
      and es.current_state(sid)['state'] == 'DURABLY SPOOLED',
      str((shipped, locked)))

# --- 9. VALIDATION ---------------------------------------------------------
fresh_spool()
try:
    es.spool({}, event_type='E', aggregate_id='a',
             aggregate_type='t', idempotency_key='k')
    check('spool rejects empty payload', False)
except ValueError:
    check('spool rejects empty payload', True)
try:
    es.spool({'a': 1}, event_type='E', aggregate_id='a',
             aggregate_type='t', idempotency_key='')
    check('spool rejects empty idempotency key', False)
except ValueError:
    check('spool rejects empty idempotency key', True)

# --- 10. emit-observation spool branch (no network) ------------------------
fresh_spool()
r = FakeRemote()
body = mkbody(9)
sid = es.spool(body, event_type='OBSERVATION_CREATED',
               aggregate_id='agg9', aggregate_type='research_pass',
               idempotency_key='k9')
# transport down: the exit-3 path (mark_delivery_pending)
r.failures_left = 999
try:
    es.ship_one(sid, r.deliver, r.probe)
except es.TransportError:
    es.mark_delivery_pending(sid, 'simulated down')
rec = es.current_state(sid)
check('exit-3 path: DELIVERY_PENDING, work safe',
      rec['state'] == 'DELIVERY_PENDING'
      and json.loads(rec['canonical']) == body, str(rec))
# transport up: ship_one delivers exactly once
r.failures_left = 0
rec = es.ship_one(sid, r.deliver, r.probe)
check('ship_one delivers to ACKNOWLEDGED, one POST',
      rec['state'] == 'ACKNOWLEDGED' and len(r.posts) == 1, str(rec))

print('---')
print('pass=%d fail=%d' % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
