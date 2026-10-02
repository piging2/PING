"""hermes-launch.py — feed a prompt file to Hermes oneshot mode, print the reply.

Pig-side launcher, PERSISTENT PATH (moved out of C:\\Windows\\Temp 2026-09-26;
Temp is volatile — the originals were silently lost 2026-09-25).
Runs under the Hermes venv Windows python. Prompt via file argv (no shell
quoting issues). Always runs main.py with --safe-mode: the bridge never grants
the worker the plugin/config surface (matches the documented invocation in the
orca-adapter agent profile).
"""
import subprocess
import sys

BASE = r"C:\Users\nolan\AppData\Local\hermes\hermes-agent"
VENV_PY = BASE + r"\venv\Scripts\python.exe"
MAIN_PY = BASE + r"\hermes_cli\main.py"


def main() -> int:
    if len(sys.argv) < 2:
        sys.stderr.write("usage: hermes-launch.py <prompt-file>\n")
        return 2
    prompt_file = sys.argv[1]
    with open(prompt_file, "r", encoding="utf-8") as f:
        prompt = f.read()
    if not prompt.strip():
        sys.stderr.write("hermes-launch: empty prompt\n")
        return 2
    p = subprocess.run(
        [VENV_PY, MAIN_PY, "--safe-mode", "-z", prompt],
        capture_output=True,
        text=True,
        cwd=BASE,
        timeout=600,
    )
    sys.stdout.write(p.stdout)
    sys.stderr.write(p.stderr)
    return p.returncode


if __name__ == "__main__":
    sys.exit(main())
