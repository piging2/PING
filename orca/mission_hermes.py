"""
ORCA seam-falsification mission — Agent #1 (Hermes) via the worker seam.

TASK (real, bounded, PUBLIC data class): implement a pure function
    parse_duration(spec: str) -> int
parsing duration strings ("30s", "5m", "2h", "1h30m", "1d2h") into total
seconds; raising ValueError on invalid input.

LOOP mirrors mission2 semantics:
  attempt -> worker claim (SELF-REPORT; a CLAIM, never evidence)
           -> independent deterministic verifier (no LLM)
           -> NOT_VERIFIED or VERIFIED_SUCCESS.
EPISTEMIC GATE: mission status derives ONLY from the verifier verdict.

PLUS a negative control: the verifier runs against a deliberately broken
artifact and must FAIL it (same invariant as the failure-injection mission).

Attaches Hermes BELOW the router and BELOW verification, with ZERO changes
to mission2.py, model_router.py (frozen), dispatch.py, or any
scheduler/state-machine code. The router is not consulted: Hermes is not
in its pool; the worker boundary (call_hermes) is the seam.
"""

import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, "/home/hatch/workspace/orca")
from hermes_worker import call_hermes  # noqa: E402

MISSION_ID = f"orca-mission-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-hermes-agent1"
EVIDENCE_DIR = f"/home/hatch/workspace/orca/missions/{MISSION_ID}"
os.makedirs(EVIDENCE_DIR, exist_ok=True)

TASK_SPEC = """Implement a Python module that defines exactly one public function:

def parse_duration(spec: str) -> int:
    '''Parse a duration string into total seconds.'''

Rules:
- Accept one or more concatenated segments: <integer><unit>, e.g. "30s", "5m", "2h", "1h30m", "1d2h".
- Units: s (seconds), m (minutes), h (hours), d (days). Case-insensitive ("1H30M" is valid).
- Leading/trailing whitespace around the whole string is allowed.
- Return the total number of seconds as an int.
- Raise ValueError for: empty/whitespace-only strings, strings with no valid segment,
  unknown units ("2x"), decimal numbers ("1.5h"), negative signs ("-5m"), or bare
  numbers without a unit ("5"). For non-string input, raising TypeError is also acceptable.

Return ONLY the complete file contents: imports, then the function.
No explanation, no markdown fences.
End your response with the line: SELF-REPORT: implementation complete, all checks pass."""


def extract_self_report(text):
    """Worker's own success claim. This is a CLAIM, never evidence."""
    for line in text.split("\n"):
        if "SELF-REPORT" in line.upper():
            return line.strip()[:200]
    return "implicit: worker delivered artifact (claims success by delivery)"


def run_mission():
    print("=" * 70)
    print(f"MISSION: {MISSION_ID}")
    print("TASK: parse_duration(spec) -> int, executed by Agent #1 (Hermes)")
    print("SEAM: hermes_worker.call_hermes; zero changes to mission semantics")
    print("=" * 70)
    evidence = {
        "mission_id": MISSION_ID,
        "agent": "hermes",
        "seam": "worker-execution boundary below router and below independent verification",
        "task": "implement parse_duration(spec) -> int",
        "router_consulted": False,
        "router_reason": "model_router.py is FROZEN and Hermes is not in its pool; "
                         "Agent #1 attaches at the worker boundary, which is the seam "
                         "being falsified.",
        "attempts": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    # ---- ATTEMPT 1: Hermes executes ----
    print("\n--- STEP 1: WORKER EXECUTION (Hermes) ---")
    raw, attempts_used = call_hermes(
        "You are implementing a small, deterministic utility function.\n\n" + TASK_SPEC)
    worker_claim = extract_self_report(raw)
    print(f"Worker claim: {worker_claim[:100]}")
    print(f"Response: {len(raw)} chars, bridge attempts used: {attempts_used}")

    if not raw:
        evidence["mission_status"] = "BRIDGE_UNREACHABLE"
        evidence["note"] = "Hermes bridge unreachable; empty result is honest, never simulated."
        with open(f"{EVIDENCE_DIR}/evidence.json", "w") as f:
            json.dump(evidence, f, indent=2)
        print("Bridge unreachable. Mission status: BRIDGE_UNREACHABLE.")
        return evidence

    # Strip the SELF-REPORT line before admission (claim is recorded, not compiled)
    code_lines = [l for l in raw.split("\n") if "SELF-REPORT" not in l]
    clean_code = "\n".join(code_lines).strip()
    attempt_path = f"{EVIDENCE_DIR}/parse_duration_attempt1.py"
    with open(attempt_path, "w") as f:
        f.write(clean_code)

    # ---- STEP 2: INDEPENDENT VERIFICATION ----
    print("\n--- STEP 2: INDEPENDENT VERIFICATION (deterministic, no LLM) ---")
    sys.path.insert(0, EVIDENCE_DIR)
    from verify_parse_duration import verify_parse_duration
    passed, details = verify_parse_duration(attempt_path, "attempt_1_hermes")
    failed = [c["name"] for c in details["checks"] if not c["ok"]]
    print(f"Verifier: {'PASS' if passed else 'FAIL'}; failed checks: {failed}")
    evidence["attempts"].append({
        "n": 1,
        "worker": "hermes (pig bridge, safe mode)",
        "bridge_attempts_used": attempts_used,
        "worker_claim": worker_claim,
        "verifier_passed": passed,
        "failed_checks": failed,
        "artifact_path": attempt_path,
    })

    # ---- EPISTEMIC GATE ----
    print("\n--- EPISTEMIC GATE ---")
    evidence["epistemic_gate"] = {
        "worker_claim": "SUCCESS",
        "verifier_result": "PASS" if passed else "FAIL",
        "mission_becomes_verified_success": bool(passed),
        "statement": "WORKER CLAIM != VERIFIED RESULT. Mission status derives ONLY from the verifier.",
    }
    evidence["mission_status"] = "VERIFIED_SUCCESS" if passed else "NOT_VERIFIED"
    print(f"Worker claim: SUCCESS | Verifier: {'PASS' if passed else 'FAIL'}")
    print(f"=> mission_status = {evidence['mission_status']}")

    # ---- STEP 3: NEGATIVE CONTROL ----
    print("\n--- STEP 3: NEGATIVE CONTROL (deliberately broken artifact) ---")
    broken_path = f"{EVIDENCE_DIR}/parse_duration_broken_control.py"
    with open(broken_path, "w") as f:
        f.write('"""Deliberately broken control: always returns 60."""\n'
                '\n'
                'def parse_duration(spec):\n'
                '    return 60\n')
    passed_b, details_b = verify_parse_duration(broken_path, "negative_control")
    failed_b = [c["name"] for c in details_b["checks"] if not c["ok"]]
    print(f"Verifier on broken control: {'PASS' if passed_b else 'FAIL'}; "
          f"failed checks: {failed_b}")
    evidence["negative_control"] = {
        "artifact": broken_path,
        "description": "parse_duration that always returns 60",
        "verifier_passed": passed_b,
        "failed_checks": failed_b,
        "control_holds": not passed_b,
    }
    assert not passed_b, "NEGATIVE CONTROL FAILED: verifier passed a broken artifact"
    print("Negative control holds: broken artifact does NOT verify.")

    evidence["completed_at"] = datetime.now(timezone.utc).isoformat()
    with open(f"{EVIDENCE_DIR}/evidence.json", "w") as f:
        json.dump(evidence, f, indent=2)

    print("\n" + "=" * 70)
    print("MISSION:", evidence["mission_status"])
    print(f"EVIDENCE: {EVIDENCE_DIR}/evidence.json")
    print("=" * 70)
    return evidence


if __name__ == "__main__":
    run_mission()
