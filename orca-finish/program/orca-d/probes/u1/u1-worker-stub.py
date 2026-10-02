#!/usr/bin/env python3
"""ORCA-D U1 experiment: stub worker (the Hermes stand-in).

Sleeps (simulating long exterior work), then:
  1. writes a completion marker FILE (ground truth: the orphan ran to
     completion even though its stdout pipe died with the dispatcher);
  2. attempts a stdout print (expected to raise BrokenPipeError after the
     dispatcher is SIGKILLed — recorded in the marker, never fatal).
"""
import json
import os
import sys
import time

# argv: <marker-dir> <attempt> <sleep-s>  (env does not cross the WSL/Windows spawn boundary)
marker_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
attempt = sys.argv[2] if len(sys.argv) > 2 else 'a1'
sleep_s = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0

# 'started' marker: ground truth that the worker launched (pid for liveness probes)
with open(os.path.join(marker_dir, 'u1-worker-started-%s.marker' % attempt), 'w') as f:
    json.dump({'attempt': attempt, 'worker_pid': os.getpid(),
               'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time()))}, f)

time.sleep(sleep_s)

marker = {
    'attempt': attempt,
    'worker_pid': os.getpid(),
    'completed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time())),
    'stdout_write': None,
}
try:
    sys.stdout.write(json.dumps({'u1': 'orphan-effect', 'attempt': attempt}) + '\n')
    sys.stdout.flush()
    marker['stdout_write'] = 'ok'
except BrokenPipeError:
    marker['stdout_write'] = 'BrokenPipeError (pipe died with dispatcher)'
except Exception as e:
    marker['stdout_write'] = 'error: ' + str(e)[:100]

with open(os.path.join(marker_dir, 'u1-worker-finished-%s.marker' % attempt), 'w') as f:
    json.dump(marker, f)
