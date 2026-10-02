#!/usr/bin/env python3
"""test-event-spool-idempotency.py -- prove the 2026-09-27 D4 defect fixes.

  IDEMPOTENCY: spool() reuses the spool_id for a repeated idempotency_key
    (local uq_outbox_event_id); same key + different bytes raises.
  ACCEPTED RECORD: the durable log opens with an explicit ACCEPTED record
    before DURABLY SPOOLED (every transition in the required contract is
    observable).
  THREE-STATE PROBE: an UNCHECKABLE probe holds DELIVERY_PENDING and never
    POSTs; a later checkable probe ships normally.
  SUBPROCESS CRASH: a real child process POSTs then os._exit()s before the
    local ack; a FRESH child process reopens the spool and reconciles via
    the probe with no second POST.
  DEAD-LETTER RESPOOL: spooling a dead-lettered key requeues the same
    spool_id with attempts reset.
"""
import importlib.util
import json
import os
import subprocess
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
    def __init__(self):
        self.rows = {}
        self.posts = []

    def deliver(self, payload):
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


# --- 1. ACCEPTED record opens the durable lineage -------------------------
fresh_spool()
body = mkbody(100)
sid = spool_body(body)
recs = [r for r in es._read_all() if r['spool_id'] == sid]
check('ACCEPTED record is explicit and first',
      len(recs) == 2 and recs[0]['state'] == 'ACCEPTED'
      and recs[1]['state'] == 'DURABLY SPOOLED'
      and recs[0]['accepted_at'] and recs[0]['digest'] == recs[1]['digest'],
      str([r['state'] for r in recs]))
check('current_state folds to DURABLY SPOOLED',
      es.current_state(sid)['state'] == 'DURABLY SPOOLED')

# --- 2. IDEMPOTENCY: repeated key reuses the spool_id ----------------------
fresh_spool()
r = FakeRemote()
b1 = mkbody(101)
sid1 = spool_body(b1)
sid2 = spool_body(mkbody(101))  # byte-identical body, same key
check('same key reuses spool_id', sid1 == sid2, '%s vs %s' % (sid1, sid2))
check('no duplicate pending lineage', len(es.pending()) == 1,
      str(len(es.pending())))
recs = [x for x in es._read_all() if x['spool_id'] == sid1]
check('reuse appends no new lineage records', len(recs) == 2,
      str(len(recs)))
es.ship(r.deliver, r.probe)
check('reused key ships exactly once',
      len(r.posts) == 1 and es.current_state(sid1)['state'] == 'ACKNOWLEDGED',
      'posts=%d' % len(r.posts))

# --- 3. same key + different bytes -> ValueError ---------------------------
fresh_spool()
spool_body(mkbody(102))
try:
    spool_body(mkbody(103, key='k102'))  # different payload, same key
    check('digest mismatch refused', False)
except ValueError:
    check('digest mismatch refused', True)

# --- 4. THREE-STATE PROBE: UNCHECKABLE never POSTs -------------------------
fresh_spool()
r = FakeRemote()
sid = spool_body(mkbody(104))
posts_before = len(r.posts)
rec = es.ship_one(sid, r.deliver, lambda key: es.PROBE_UNCHECKABLE)
check('UNCHECKABLE probe holds DELIVERY_PENDING, zero POSTs',
      rec['state'] == 'DELIVERY_PENDING' and len(r.posts) == posts_before
      and 'uncheckable' in (rec.get('error') or ''),
      'state=%s posts=%d err=%s' % (rec['state'], len(r.posts), rec.get('error')))
# probe transport blows up entirely -> also UNCHECKABLE, still no POST
def boom_probe(key):
    raise OSError('probe transport dead')
rec = es.ship_one(sid, r.deliver, boom_probe)
check('probe exception holds DELIVERY_PENDING, zero POSTs',
      rec['state'] == 'DELIVERY_PENDING' and len(r.posts) == posts_before,
      'state=%s posts=%d' % (rec['state'], len(r.posts)))
# later the probe is checkable and absent -> ships normally
rec = es.ship_one(sid, r.deliver, r.probe)
check('reconciled probe ships to ACKNOWLEDGED, one POST',
      rec['state'] == 'ACKNOWLEDGED' and len(r.posts) == posts_before + 1,
      'state=%s posts=%d' % (rec['state'], len(r.posts)))

# --- 5. SUBPROCESS CRASH then FRESH-PROCESS RECOVERY -----------------------
d = fresh_spool()
post_log = os.path.join(d, 'posts.log')
heal_log = os.path.join(d, 'healed.log')
driver = os.path.join(d, 'driver.py')
with open(driver, 'w') as f:
    f.write('''
import importlib.util, os, sys
spec = importlib.util.spec_from_file_location(
    'event_spool_drv', %r)
es = importlib.util.module_from_spec(spec)
spec.loader.exec_module(es)
spool_dir, mode, sid, post_log, heal_log = sys.argv[1:6]
es.SPOOL_DIR = spool_dir
es.SPOOL_PATH = os.path.join(spool_dir, 'event-spool.jsonl')
es.LOCK_PATH = os.path.join(spool_dir, 'event-spool.lock')

def crashy_deliver(payload):
    with open(post_log, 'a') as fh:
        fh.write('POST\\n')
    os._exit(1)  # dies AFTER the remote accepted, BEFORE the local ack

def counting_deliver(payload):
    with open(post_log, 'a') as fh:
        fh.write('POST-AGAIN\\n')
    return 'evt-should-never-happen'

def probe_none(key):
    return None

def probe_hit(key):
    return 'evt-remote-0001'

def healed(item, event_id):
    with open(heal_log, 'a') as fh:
        fh.write('HEALED:' + event_id + '\\n')

if mode == 'crash':
    es.ship_one(sid, crashy_deliver, probe_none)
elif mode == 'recover':
    es.ship_one(sid, counting_deliver, probe_hit, on_probe_hit=healed)
''' % os.path.join(_TANDEM, 'event-spool.py'))

sid = spool_body(mkbody(105))
cp = subprocess.run([sys.executable, driver, d, 'crash', sid, post_log, heal_log],
                    capture_output=True, text=True, timeout=60)
posts = open(post_log).read().split() if os.path.exists(post_log) else []
st = es.current_state(sid)['state']
check('SUBPROCESS CRASH: exactly one POST side effect, child died',
      cp.returncode != 0 and posts == ['POST'],
      'rc=%d posts=%s' % (cp.returncode, posts))
check('SUBPROCESS CRASH: local state never reached DELIVERED/ACKNOWLEDGED',
      st in ('DURABLY SPOOLED', 'DELIVERY_PENDING', 'ACCEPTED'), st)

# FRESH process reopens the same spool file and reconciles.
cp = subprocess.run([sys.executable, driver, d, 'recover', sid, post_log, heal_log],
                    capture_output=True, text=True, timeout=60)
posts = open(post_log).read().split()
rec = es.current_state(sid)
healed = open(heal_log).read().split() if os.path.exists(heal_log) else []
check('FRESH RECOVERY: no second POST from the new process',
      cp.returncode == 0 and posts == ['POST'],
      'rc=%d posts=%s err=%s' % (cp.returncode, posts, cp.stderr[:200]))
check('FRESH RECOVERY: ACKNOWLEDGED via probe, sidecar heal ran',
      rec['state'] == 'ACKNOWLEDGED' and rec.get('recovered_via_probe')
      and rec.get('remote_event_id') == 'evt-remote-0001'
      and healed == ['HEALED:evt-remote-0001'],
      'state=%s healed=%s' % (rec['state'], healed))

# --- 6. DEAD-LETTER RESPOOL -------------------------------------------------
fresh_spool()
r = FakeRemote()
def down_deliver(payload):
    raise es.TransportError('simulated down')
sid = spool_body(mkbody(107))
for _ in range(6):
    es.ship(down_deliver, r.probe)
check('item dead-lettered after 5 attempts',
      es.current_state(sid)['state'] == 'DEAD_LETTER', es.current_state(sid)['state'])
sid2 = spool_body(mkbody(107))  # same key: requeue, not duplicate
rec = es.current_state(sid2)
check('dead-lettered key requeues the same spool_id',
      sid2 == sid and rec['state'] == 'DURABLY SPOOLED' and rec['attempts'] == 0,
      '%s state=%s attempts=%s' % (sid2, rec['state'], rec['attempts']))
check('requeued item not duplicated in pending',
      len(es.pending()) == 1, str(len(es.pending())))
es.ship(r.deliver, r.probe)
check('requeued item ships after recovery',
      es.current_state(sid)['state'] == 'ACKNOWLEDGED' and len(r.posts) == 1,
      'posts=%d' % len(r.posts))

# --- 7. _observation_transport finds emit-observation.py in the module dir,
# not in the (redirectable) spool dir ---------------------------------------
fresh_spool()
empty = tempfile.mkdtemp()  # contains no emit-observation.py
es.SPOOL_DIR = empty
es.SPOOL_PATH = os.path.join(empty, 'event-spool.jsonl')
es.LOCK_PATH = os.path.join(empty, 'event-spool.lock')
try:
    deliver, probe, on_probe_hit = es._observation_transport()
    check('_observation_transport resolves via module dir, not SPOOL_DIR',
          callable(deliver) and callable(probe) and callable(on_probe_hit))
except FileNotFoundError:
    check('_observation_transport resolves via module dir, not SPOOL_DIR',
          False, 'looked inside the redirected spool dir')

print('---')
print('pass=%d fail=%d' % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
