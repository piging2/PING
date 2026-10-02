#!/usr/bin/env python3
"""ORCA control-loop Hermes dispatcher (Pig-side).

Mirrors the proven prompt-hermes.sh / hermes-launch.py invocation exactly:
same venv python, same hermes_cli/main.py, same -z oneshot flag, same
working directory. The ONLY difference: the prompt file path comes from
argv[1] instead of the hardcoded C:\\Windows\\Temp\\hermes-prompt.txt, so
concurrent dispatchers never clobber each other's prompt.

Crash-safe rendezvous: argv[2] (optional) is a result-file path. After the
worker settles (or on timeout/failure), the dispatcher atomically writes a
rendezvous record (temp file + os.replace in the same directory) carrying
the full stdout/stderr, so a killed coordinator can reconcile the attempt
on restart instead of losing the worker's output with its own stdout.
argv[3] (optional) is a JSON string with attempt metadata
(attempt_id, work_order_id, objective_id) recorded in the rendezvous file.

Usage: hermes_dispatch.py <prompt-file> [result-file] [metadata-json]
(prints model stdout, exit code mirrors hermes)
"""
import json
import os
import subprocess
import sys
import tempfile
import time

VENV_PY = r'C:\Users\nolan\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe'
AGENT_DIR = r'C:\Users\nolan\AppData\Local\hermes\hermes-agent'

prompt_file = sys.argv[1]
result_file = sys.argv[2] if len(sys.argv) > 2 else None
metadata = {}
if len(sys.argv) > 3:
    try:
        metadata = json.loads(sys.argv[3])
    except Exception:
        metadata = {'metadata_parse_error': True}

prompt = open(prompt_file, encoding='utf-8').read()
started_at = time.time()
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
exit_code = 0
try:
    r = subprocess.run(
        [VENV_PY, 'hermes_cli/main.py', '-z', prompt],
        cwd=AGENT_DIR, capture_output=True, text=True, timeout=600)
    record['stdout'] = r.stdout or ''
    record['stderr'] = r.stderr or ''
    record['returncode'] = r.returncode
    sys.stdout.write(r.stdout)
    sys.stderr.write(r.stderr)
    exit_code = r.returncode
except subprocess.TimeoutExpired as e:
    record['timed_out'] = True
    record['stdout'] = e.stdout if isinstance(e.stdout, str) else ''
    record['stderr'] = e.stderr if isinstance(e.stderr, str) else ''
    record['error'] = 'worker timeout after 600s'
    sys.stdout.write(record['stdout'])
    sys.stderr.write('hermes_dispatch: worker timeout after 600s\n')
    exit_code = 124
except Exception as e:  # noqa: BLE001 - the rendezvous must survive any failure
    record['error'] = 'dispatcher failure: ' + str(e)[:500]
    sys.stderr.write('hermes_dispatch: ' + record['error'] + '\n')
    exit_code = 125

record['dispatch_finished_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time()))

if result_file:
    # Atomic rendezvous write: temp file in the same directory, then
    # os.replace. A crash can only ever leave the previous complete record
    # or nothing, never a torn file.
    try:
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
    except Exception as e:  # noqa: BLE001 - stdout path already delivered
        sys.stderr.write('hermes_dispatch: rendezvous write failed: ' + str(e)[:300] + '\n')
        # The stdout envelope was still printed, so the coordinator's live
        # read path is unaffected. Restart reconciliation may miss this
        # attempt; the attempt record stays honest about it.

sys.exit(exit_code)
