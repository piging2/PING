"""
ONE REAL MISSION: Orca decomposes, router selects, workers execute, MC verifies.

MISSION: Integrate parse_model_id into orca/model_router.py
- Step 1 (CODING): Worker implements parse_model_id() in model_router.py
- Step 2 (TESTING): Different worker writes unit tests
- Mission Control independently verifies: runs tests, inspects diff

MISSION -> DECOMPOSE -> ROUTE -> EXECUTE -> VERIFY -> EVIDENCE -> RESULT
"""

import json
import subprocess
import time
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, "/home/hatch/workspace/orca")
from model_router import route, StepSpec, DATA_CLASS_PUBLIC


MISSION_ID = f"orca-mission-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
EVIDENCE_DIR = f"/home/hatch/workspace/orca/missions/{MISSION_ID}"
os.makedirs(EVIDENCE_DIR, exist_ok=True)


def call_model(model: str, prompt: str, max_tokens: int = 2000) -> tuple[str, int, str]:
    """Call a model. Returns (output, retries, error). Treats failures as routing events."""
    for attempt in range(3):
        try:
            result = subprocess.run(
                ["python3", "/home/hatch/workspace/skills/openrouter/bin/or.py",
                 "chat", "--model", model, "--prompt", prompt,
                 "--max-tokens", str(max_tokens)],
                capture_output=True, text=True, timeout=180,
            )
            if result.returncode != 0:
                continue
            output = result.stdout.strip()
            if output and output != "None":
                # Strip markdown fences
                if output.startswith("```"):
                    lines = output.split("\n")
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    output = "\n".join(lines).strip()
                return output, attempt, ""
        except subprocess.TimeoutExpired:
            continue
        except Exception:
            continue
    return "", 3, "all attempts failed (timeout/error/empty)"


def run_mission():
    print("=" * 70)
    print(f"MISSION: {MISSION_ID}")
    print("TASK: Integrate parse_model_id into orca/model_router.py")
    print("=" * 70)

    evidence = {
        "mission_id": MISSION_ID,
        "task": "Integrate parse_model_id into orca/model_router.py",
        "steps": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    # STEP 1: Implement the function (CODING -> Laguna S)
    print("\n--- STEP 1: Implement parse_model_id ---")
    step1 = StepSpec(
        task_type="code_implementation",
        required_capabilities=["coding"],
        data_class=DATA_CLASS_PUBLIC,
        verification_strategy="unit tests run by Mission Control",
    )
    decision1 = route(step1)
    print(f"Router: {decision1.selected_model.split('/')[-1]}")
    print(f"Reason: {decision1.reason[:80]}")

    prompt1 = """Add a function `parse_model_id(model_id: str) -> dict` to a Python file.
The function parses OpenRouter model IDs:
- "nvidia/nemotron-3-ultra-550b-a55b:free" -> {"provider": "nvidia", "model": "nemotron-3-ultra-550b-a55b", "variant": "free"}
- "poolside/laguna-s-2.1" -> {"provider": "poolside", "model": "laguna-s-2.1", "variant": None}
- Raise ValueError if no "/" in input.

Return ONLY the function code, no explanation, no markdown fences."""

    code, retries1, err1 = call_model(decision1.selected_model, prompt1)
    step1_evidence = {
        "step": 1,
        "action": "implement parse_model_id",
        "model": decision1.selected_model,
        "router_reason": decision1.reason,
        "retries": retries1,
        "success": bool(code and "def parse_model_id" in code),
        "error": err1,
    }
    evidence["steps"].append(step1_evidence)

    if not step1_evidence["success"]:
        # Fallback to next eligible model
        if decision1.fallback_order:
            fb_model = decision1.fallback_order[0]
            print(f"Fallback to: {fb_model.split('/')[-1]}")
            code, retries1b, err1b = call_model(fb_model, prompt1)
            step1_evidence["fallback_model"] = fb_model
            step1_evidence["fallback_retries"] = retries1b
            step1_evidence["success"] = bool(code and "def parse_model_id" in code)
        if not step1_evidence["success"]:
            print("STEP 1 FAILED")
            evidence["status"] = "FAILED"
            save_evidence(evidence)
            return

    print(f"Step 1 complete: {decision1.selected_model.split('/')[-1]} (retries={retries1})")

    # STEP 2: Write unit tests (different worker)
    print("\n--- STEP 2: Write unit tests ---")
    # Force a different model for step 2 to prove multi-worker
    step2 = StepSpec(
        task_type="code_implementation",
        required_capabilities=["coding"],
        data_class=DATA_CLASS_PUBLIC,
        verification_strategy="tests run by Mission Control",
    )
    decision2 = route(step2)
    # Use fallback if same as step 1, to ensure TWO different workers
    if decision2.selected_model == decision1.selected_model and decision2.fallback_order:
        model2 = decision2.fallback_order[0]
        reason2 = f"forced different worker for multi-model proof (primary was {decision1.selected_model.split('/')[-1]})"
    else:
        model2 = decision2.selected_model
        reason2 = decision2.reason

    print(f"Router: {model2.split('/')[-1]}")
    print(f"Reason: {reason2[:80]}")

    prompt2 = """Write Python unit tests for a function `parse_model_id(model_id: str) -> dict`.
The function parses OpenRouter model IDs into {"provider", "model", "variant"}.
Test: full ID with variant, ID without variant, ValueError on missing "/".

Return ONLY test code using assert statements, no explanation, no markdown fences.
Assume `from model_router import parse_model_id` works."""

    test_code, retries2, err2 = call_model(model2, prompt2)
    step2_evidence = {
        "step": 2,
        "action": "write unit tests",
        "model": model2,
        "router_reason": reason2,
        "retries": retries2,
        "success": bool(test_code and "parse_model_id" in test_code),
        "error": err2,
    }
    evidence["steps"].append(step2_evidence)

    if not step2_evidence["success"]:
        print("STEP 2 FAILED")
        evidence["status"] = "FAILED"
        save_evidence(evidence)
        return

    print(f"Step 2 complete: {model2.split('/')[-1]} (retries={retries2})")

    # MISSION CONTROL VERIFICATION (independent, not the worker)
    print("\n--- MISSION CONTROL: Independent Verification ---")

    # 1. Integrate the function into model_router.py
    router_path = "/home/hatch/workspace/orca/model_router.py"
    with open(router_path) as f:
        original = f.read()

    # Append the function (simple integration for this bounded task)
    with open(router_path, "a") as f:
        f.write("\n\n# Added by ORCA mission " + MISSION_ID + "\n")
        f.write(code + "\n")

    # 2. Write and run tests
    test_path = f"{EVIDENCE_DIR}/test_parse_model_id.py"
    with open(test_path, "w") as f:
        f.write("import sys\nsys.path.insert(0, '/home/hatch/workspace/orca')\n")
        f.write(test_code)

    try:
        result = subprocess.run(
            ["python3", test_path], capture_output=True, text=True, timeout=30,
        )
        tests_pass = result.returncode == 0
        test_output = result.stdout + result.stderr
    except Exception as e:
        tests_pass = False
        test_output = str(e)

    # 3. Inspect diff
    with open(router_path) as f:
        modified = f.read()
    diff_lines = len(modified.split("\n")) - len(original.split("\n"))

    verification = {
        "tests_pass": tests_pass,
        "test_output": test_output[:500],
        "diff_lines_added": diff_lines,
        "function_present": "def parse_model_id" in modified,
    }
    evidence["verification"] = verification

    if tests_pass and verification["function_present"]:
        evidence["status"] = "COMPLETE"
        print("VERIFICATION: PASS")
    else:
        evidence["status"] = "VERIFICATION_FAILED"
        # Rollback on failure
        with open(router_path, "w") as f:
            f.write(original)
        print("VERIFICATION: FAIL - rolled back")

    evidence["completed_at"] = datetime.now(timezone.utc).isoformat()
    save_evidence(evidence)

    # Final screen
    print("\n" + "=" * 70)
    print("MISSION COMPLETE" if evidence["status"] == "COMPLETE" else "MISSION FAILED")
    print("=" * 70)
    workers = list(set(s["model"].split("/")[-1] for s in evidence["steps"]))
    print(f"MISSION: {MISSION_ID}")
    print(f"WORKERS: {', '.join(workers)}")
    print(f"CHANGES: +{diff_lines} lines in orca/model_router.py")
    print(f"TESTS: {'PASS' if tests_pass else 'FAIL'}")
    print(f"EVIDENCE: {EVIDENCE_DIR}/evidence.json")
    total_retries = sum(s.get("retries", 0) for s in evidence["steps"])
    print(f"RETRIES/FALLBACKS: {total_retries}")
    print(f"COST: $0 (free endpoints)")


def save_evidence(evidence: dict):
    with open(f"{EVIDENCE_DIR}/evidence.json", "w") as f:
        json.dump(evidence, f, indent=2)


if __name__ == "__main__":
    run_mission()
