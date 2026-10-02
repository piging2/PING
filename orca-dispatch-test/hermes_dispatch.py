#!/usr/bin/env python3
"""ORCA control-loop Hermes dispatcher (Pig-side).

Mirrors the proven prompt-hermes.sh / hermes-launch.py invocation exactly:
same venv python, same hermes_cli/main.py, same -z oneshot flag, same
working directory. The ONLY difference: the prompt file path comes from
argv[1] instead of the hardcoded C:\\Windows\\Temp\\hermes-prompt.txt, so
concurrent dispatchers never clobber each other's prompt.

Usage: hermes_dispatch.py <prompt-file>   (prints model stdout, exit code mirrors hermes)
"""
import subprocess
import sys

VENV_PY = r'C:\Users\nolan\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe'
AGENT_DIR = r'C:\Users\nolan\AppData\Local\hermes\hermes-agent'

prompt_file = sys.argv[1]
prompt = open(prompt_file, encoding='utf-8').read()
r = subprocess.run(
    [VENV_PY, 'hermes_cli/main.py', '-z', prompt],
    cwd=AGENT_DIR, capture_output=True, text=True, timeout=600)
sys.stdout.write(r.stdout)
sys.stderr.write(r.stderr)
sys.exit(r.returncode)
