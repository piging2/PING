"""
ORCA seam falsification — Agent #1 (Hermes) worker adapter (2026-10-02).

Identical contract to mission2.call_model(model, prompt, max_tokens):
    call_hermes(prompt, max_tokens=2000) -> (output_text, attempts_used)

Differences from call_model:
  - execution target is headless Hermes on the Pig, reached ONLY through the
    existing proven transport ~/workspace/bin/prompt-hermes.sh "<prompt>"
    (scp prompt -> Pig hermes-bridge, runs hermes_cli/main.py --safe-mode).
  - safe mode only. The worker boundary never sees mission state, writes no
    events, and is invisible to mission semantics (per SEAM_TRACE.md).
  - the independent verifier (epistemic gate) still stands between the worker
    claim and VERIFIED_SUCCESS: WORKER SAYS SUCCESS != VERIFIED RESULT.

Zero changes to mission2.py, model_router.py, dispatch.py, or any
scheduler/state-machine code. This file only CONSUMES the existing seam.

max_tokens is accepted for contract parity; the bridge's safe-mode CLI
takes no token budget, so it is informational here.

Empty string is returned on total failure (bridge unreachable, non-zero
exit, empty response, or timeout on every attempt). A dead bridge is an
honest empty result, never a simulated worker.
"""

import subprocess

PROMPT_HERMES = "/home/hatch/workspace/bin/prompt-hermes.sh"
_MAX_ATTEMPTS = 3
_BRIDGE_TIMEOUT_SEC = 600


def _extract_response(stdout):
    """Strip PowerShell CLIXML/progress/wake-lease bookkeeping around the
    actual model response. Returns the kept text, stripped."""
    kept = []
    for line in stdout.split("\n"):
        s = line.strip()
        if not s:
            continue
        # PowerShell CLIXML serialization frames the run's stdout
        if s.startswith("#< CLIXML") or s.startswith("<Objs") or s.startswith("</Objs"):
            continue
        # Any line that is purely an XML tag (open, close, or inline) is framing
        if s.startswith("<") and s.endswith(">"):
            continue
        # Wake-lease bookkeeping from the transport wrapper
        if "WAKE_ACQUIRED" in s or "WAKE_RELEASED" in s:
            continue
        # hermes_cli housekeeping notices are not the model's answer
        if s.startswith("\u26a0"):
            continue
        kept.append(line)
    text = "\n".join(kept).strip()
    # Strip code fences the same way mission2.call_model does
    if text.startswith("```"):
        text = "\n".join(
            l for l in text.split("\n") if not l.strip().startswith("```")
        ).strip()
    return text


def call_hermes(prompt, max_tokens=2000):  # noqa: ARG001 - contract parity
    """Returns (output_text, attempts_used). Empty string on total failure."""
    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            r = subprocess.run(
                [PROMPT_HERMES, prompt],
                capture_output=True, text=True, timeout=_BRIDGE_TIMEOUT_SEC)
            if r.returncode != 0:
                continue
            text = _extract_response(r.stdout or "")
            if text and text != "None":
                return text, attempt
        except subprocess.TimeoutExpired:
            continue
        except Exception:
            continue
    return "", _MAX_ATTEMPTS


if __name__ == "__main__":
    # Self-test: trivial prompt against the real bridge (not simulated).
    text, attempts = call_hermes("Reply with the single word: alive")
    print(f"attempts_used={attempts}")
    print(f"response={text!r}")
    assert "alive" in text.lower(), f"self-test FAILED: {text!r}"
    print("SELF-TEST PASS")
