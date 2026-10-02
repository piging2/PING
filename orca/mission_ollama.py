"""
ORCA seam-falsification mission — Agent #2 (local Ollama) via the worker seam.

TASK (real, bounded, PUBLIC data class): implement a pure function
    merge_intervals(intervals) -> list
merging overlapping [start, end] interval pairs into a sorted canonical list;
raising ValueError on malformed input. (Different micro-task than Agent #1's
parse_duration, so the seam is stressed with fresh semantics.)

LOOP mirrors mission2 semantics:
  attempt -> worker claim (SELF-REPORT; a CLAIM, never evidence)
           -> independent deterministic verifier (no LLM)
           -> NOT_VERIFIED or VERIFIED_SUCCESS.
EPISTEMIC GATE: mission status derives ONLY from the verifier verdict.

PLUS a negative control: the verifier runs against a deliberately broken
artifact and must FAIL it (same invariant as the failure-injection mission).

Attaches the local Ollama model BELOW the router and BELOW verification, with
ZERO changes to mission2.py, model_router.py (frozen), dispatch.py, or any
scheduler/state-machine code. The router is not consulted: the local model is
not in its pool; the worker boundary (call_ollama) is the seam.
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone

sys.path.insert(0, "/home/hatch/workspace/orca")
from ollama_worker import call_ollama, PIGWSL_EXEC, MODEL  # noqa: E402

MISSION_ID = f"orca-mission-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-ollama-agent2"
EVIDENCE_DIR = f"/home/hatch/workspace/orca/missions/{MISSION_ID}"
os.makedirs(EVIDENCE_DIR, exist_ok=True)

TASK_SPEC = """Implement a Python module that defines exactly one public function:

def merge_intervals(intervals):
    '''Merge overlapping [start, end] interval pairs into a sorted list.'''

Rules:
- Input is a list of [start, end] pairs. Each pair is a list or tuple of exactly 2 numbers (int or float, never bool).
- If ANY pair is malformed (not a 2-element list/tuple, non-numeric endpoint, bool endpoint, or start > end), raise ValueError. If the input itself is not a list, raise ValueError.
- Merge rule: sort pairs by start; merge whenever the next start <= current end (overlapping OR touching).
- Return a NEW list of [start, end] LISTS (not tuples), sorted by start. Empty input returns [].
- Do NOT mutate the input list.

Examples:
merge_intervals([[1,3],[2,6],[8,10],[15,18]]) -> [[1,6],[8,10],[15,18]]
merge_intervals([[1,4],[4,5]]) -> [[1,5]]
merge_intervals([]) -> []
merge_intervals([[3,2]]) raises ValueError

Your ENTIRE response must be valid Python code: imports (if needed), then the function.
No prose, no explanation, no markdown fences.
End your response with the line: SELF-REPORT: implementation complete, all checks pass."""


def extract_self_report(text):
    """Worker's own success claim. This is a CLAIM, never evidence."""
    for line in text.split("\n"):
        if "SELF-REPORT" in line.upper():
            return line.strip()[:200]
    return "implicit: worker delivered artifact (claims success by delivery)"


def model_digest():
    """Best-effort identity of the exact local model blob. Non-fatal."""
    try:
        script = ("curl -s --max-time 15 http://127.0.0.1:11434/api/tags\n")
        r = subprocess.run([PIGWSL_EXEC], input=script,
                           capture_output=True, text=True, timeout=60)
        for m in json.loads(r.stdout or "{}").get("models", []):
            if m.get("name") == MODEL:
                return m.get("digest", "")
    except Exception:
        pass
    return ""


def run_mission():
    print("=" * 70)
    print(f"MISSION: {MISSION_ID}")
    print("TASK: merge_intervals(intervals) -> list, executed by Agent #2 "
          "(local Ollama qwen2.5-coder:1.5b)")
    print("SEAM: ollama_worker.call_ollama; zero changes to mission semantics")
    print("=" * 70)
    evidence = {
        "mission_id": MISSION_ID,
        "agent": f"ollama/{MODEL} (local inference on the Pig, WSL)",
        "seam": "worker-execution boundary below router and below independent verification",
        "task": "implement merge_intervals(intervals) -> list",
        "model_digest": model_digest(),
        "router_consulted": False,
        "router_reason": "model_router.py is FROZEN and the local Ollama model is not in its pool; "
                         "Agent #2 attaches at the worker boundary, which is the seam "
                         "being falsified.",
        "attempts": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    # ---- ATTEMPT 1: local worker executes ----
    print("\n--- STEP 1: WORKER EXECUTION (local Ollama) ---")
    raw, attempts_used = call_ollama(
        "You are implementing a small, deterministic utility function.\n\n" + TASK_SPEC)
    worker_claim = extract_self_report(raw)
    print(f"Worker claim: {worker_claim[:100]}")
    print(f"Response: {len(raw)} chars, transport attempts used: {attempts_used}")

    if not raw:
        evidence["mission_status"] = "WORKER_UNREACHABLE"
        evidence["note"] = ("Local Ollama unreachable; empty result is honest, "
                            "never simulated.")
        with open(f"{EVIDENCE_DIR}/evidence.json", "w") as f:
            json.dump(evidence, f, indent=2)
        print("Local worker unreachable. Mission status: WORKER_UNREACHABLE.")
        return evidence

    # Strip the SELF-REPORT line before admission (claim is recorded, not compiled)
    code_lines = [l for l in raw.split("\n") if "SELF-REPORT" not in l]
    clean_code = "\n".join(code_lines).strip()
    attempt_path = f"{EVIDENCE_DIR}/merge_intervals_attempt1.py"
    with open(attempt_path, "w") as f:
        f.write(clean_code)

    # ---- STEP 2: INDEPENDENT VERIFICATION ----
    print("\n--- STEP 2: INDEPENDENT VERIFICATION (deterministic, no LLM) ---")
    sys.path.insert(0, EVIDENCE_DIR)
    from verify_merge_intervals import verify_merge_intervals
    passed, details = verify_merge_intervals(attempt_path, "attempt_1_ollama")
    failed = [c["name"] for c in details["checks"] if not c["ok"]]
    print(f"Verifier: {'PASS' if passed else 'FAIL'} "
          f"({len(details['checks'])} checks); failed: {failed}")
    evidence["attempts"].append({
        "n": 1,
        "worker": f"ollama/{MODEL} (pig WSL, local)",
        "transport_attempts_used": attempts_used,
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
    broken_path = f"{EVIDENCE_DIR}/merge_intervals_broken_control.py"
    with open(broken_path, "w") as f:
        f.write('"""Deliberately broken control: sorts pairs but never merges."""\n'
                '\n'
                'def merge_intervals(intervals):\n'
                '    return sorted([list(iv) for iv in intervals], key=lambda p: p[0])\n')
    passed_b, details_b = verify_merge_intervals(broken_path, "negative_control")
    failed_b = [c["name"] for c in details_b["checks"] if not c["ok"]]
    print(f"Verifier on broken control: {'PASS' if passed_b else 'FAIL'}; "
          f"failed checks: {failed_b}")
    evidence["negative_control"] = {
        "artifact": broken_path,
        "description": "merge_intervals that sorts but never merges",
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
