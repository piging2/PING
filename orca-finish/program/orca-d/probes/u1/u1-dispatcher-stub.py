#!/usr/bin/env python3
"""ORCA-D U1 experiment: stub dispatcher mirroring hermes_dispatch.py topology.

Windows python process. Runs a worker grandchild via subprocess.run with
capture_output (same as the real dispatcher), then atomically writes a
rendezvous record AFTER the worker settles (temp file + os.replace).

Modes (argv U1_MODE):
  normal    - coordinator kills dispatcher mid-worker-sleep.
  slow-exit - worker sleeps 1s (drop written early), dispatcher then sleeps
              8s before exiting; coordinator kill lands in the sleep
              window -> T2 race: drop on disk + timedOut=true.
  abort     - dispatcher Popen-spawns the worker, then os._exit(3) (crash
              simulation): does the worker survive a dispatcher death that
              does NOT go through the coordinator kill path?

argv: <prompt-file> <result-file> <metadata-json> <marker-dir> <mode> <worker-sleep-s>
NOTE: parameters travel via argv, not env: WSL node spawn() does NOT forward
custom env vars to Windows interop processes (proven by u1-env-probe.js).
"""
import json
import os
import subprocess
import sys
import tempfile
import time

WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'u1-worker-stub.py')
prompt_file = sys.argv[1]
result_file = sys.argv[2] if len(sys.argv) > 2 else None
metadata = {}
if len(sys.argv) > 3:
    try:
        metadata = json.loads(sys.argv[3])
    except Exception:
        metadata = {'metadata_parse_error': True}
marker_dir = sys.argv[4] if len(sys.argv) > 4 else tempfile.gettempdir()
mode = sys.argv[5] if len(sys.argv) > 5 else 'normal'
worker_sleep = sys.argv[6] if len(sys.argv) > 6 else '6'
attempt_id = metadata.get('attempt_id') or 'a1'
started_at = time.time()
# dispatcher-started marker: exposes the WINDOWS pid for external kill experiments
try:
    with open(os.path.join(marker_dir, 'u1-dispatcher-started-%s.marker' % attempt_id), 'w') as f:
        json.dump({'attempt': attempt_id, 'dispatcher_pid': os.getpid(),
                   'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(started_at))}, f)
except Exception:
    pass
record = {
    'schema': 'orca-rendezvous/1',
    'attempt_id': metadata.get('attempt_id'),
    'work_order_id': metadata.get('work_order_id'),
    'objective_id': metadata.get('objective_id'),
    'dispatch_started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(started_at)),
    'dispatch_finished_at': None,
    'timed_out': False,
    'returncode': None,
    'stdout': '',
    'stderr': '',
    'error': None,
}
env = dict(os.environ)
if mode == 'abort':
    # Simulate dispatcher crash AFTER spawning the worker: Popen without wait,
    # brief settle, then os._exit (no cleanup, no drop write). The worker keeps
    # its (now readerless) pipes; its file marker is the ground truth.
    proc = subprocess.Popen([sys.executable, WORKER, marker_dir, attempt_id, worker_sleep],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(1.5)
    os._exit(3)
try:
    r = subprocess.run([sys.executable, WORKER, marker_dir, attempt_id, worker_sleep],
                       capture_output=True, text=True, timeout=600)
    record['stdout'] = r.stdout or ''
    record['stderr'] = r.stderr or ''
    record['returncode'] = r.returncode
    exit_code = r.returncode
except subprocess.TimeoutExpired as e:
    record['timed_out'] = True
    record['error'] = 'worker timeout after 600s'
    exit_code = 124
except Exception as e:
    record['error'] = 'dispatcher failure: ' + str(e)[:200]
    exit_code = 125

record['dispatch_finished_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time()))

if result_file:
    directory = os.path.dirname(os.path.abspath(result_file)) or '.'
    os.makedirs(directory, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=directory, prefix='.rendezvous-', suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(record, f)
        os.replace(tmp, result_file)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise

if mode == 'slow-exit':
    # Simulate slow dispatcher exit/flush AFTER the drop was written.
    time.sleep(8)

sys.exit(exit_code if 'exit_code' in dir() else 0)
