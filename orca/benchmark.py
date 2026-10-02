"""
ORCA Model Benchmark: SAME real task through all 4 free models.

Score mechanically. DO NOT score prose eloquence.
- TASK COMPLETED
- TESTS (pass/fail)
- UNNECESSARY DIFF
- TOOL FAILURES
- RETRIES
- WALL TIME
- TOKENS
- INVALID CLAIMS
- VERIFIER RESULT

The winner for CODING is whichever produces the best verified repository outcome.
"""

import json
import subprocess
import time
import sys
from dataclasses import dataclass, asdict
from typing import List


MODELS = [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "poolside/laguna-s-2.1:free",
    "thinkingmachines/inkling:free",
    "cohere/north-mini-code:free",
]

TASK_PROMPT = """Implement a Python function `parse_model_id(model_id: str) -> dict` that parses
an OpenRouter model ID string into its components.

Examples:
- "nvidia/nemotron-3-ultra-550b-a55b:free" -> {"provider": "nvidia", "model": "nemotron-3-ultra-550b-a55b", "variant": "free"}
- "poolside/laguna-s-2.1" -> {"provider": "poolside", "model": "laguna-s-2.1", "variant": None}
- "cohere/north-mini-code:free" -> {"provider": "cohere", "model": "north-mini-code", "variant": "free"}

Rules:
- provider is the part before the first "/"
- variant is the part after the last ":" (None if no ":")
- model is everything between provider and variant
- Raise ValueError if there is no "/" in the input

Return ONLY the Python function code, no explanation, no markdown fences.
The function must be named `parse_model_id` and be self-contained.
"""

VERIFICATION_TESTS = """
import sys
sys.path.insert(0, '/tmp/orca-bench')
from candidate import parse_model_id

# Test 1: full ID with variant
r = parse_model_id("nvidia/nemotron-3-ultra-550b-a55b:free")
assert r == {"provider": "nvidia", "model": "nemotron-3-ultra-550b-a55b", "variant": "free"}, f"T1: {r}"

# Test 2: no variant
r = parse_model_id("poolside/laguna-s-2.1")
assert r == {"provider": "poolside", "model": "laguna-s-2.1", "variant": None}, f"T2: {r}"

# Test 3: short ID with variant
r = parse_model_id("cohere/north-mini-code:free")
assert r == {"provider": "cohere", "model": "north-mini-code", "variant": "free"}, f"T3: {r}"

# Test 4: no slash raises ValueError
try:
    parse_model_id("no-slash-here")
    raise AssertionError("T4: should have raised ValueError")
except ValueError:
    pass

print("ALL TESTS PASS")
"""


@dataclass
class BenchmarkResult:
    model: str
    task_completed: bool
    tests_pass: bool
    wall_time_sec: float
    tokens_used: int
    retries: int
    tool_failures: int
    invalid_claims: int
    verifier_result: str
    error: str = ""


def run_model(model: str, max_retries: int = 2) -> BenchmarkResult:
    """Run the task through one model. Returns mechanical scores."""
    import os
    os.makedirs("/tmp/orca-bench", exist_ok=True)

    retries = 0
    tool_failures = 0
    start = time.time()
    code = None
    error = ""

    for attempt in range(max_retries + 1):
        try:
            result = subprocess.run(
                ["python3", "/home/hatch/workspace/skills/openrouter/bin/or.py",
                 "chat", "--model", model, "--prompt", TASK_PROMPT,
                 "--max-tokens", "2000"],
                capture_output=True, text=True, timeout=180,
            )
            if result.returncode != 0:
                tool_failures += 1
                error = result.stderr[:200]
                retries += 1
                continue
            code = result.stdout.strip()
            # Strip markdown fences if present
            if code.startswith("```"):
                lines = code.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                code = "\n".join(lines).strip()
            break
        except subprocess.TimeoutExpired:
            tool_failures += 1
            error = "timeout"
            retries += 1
        except Exception as e:
            tool_failures += 1
            error = str(e)[:200]
            retries += 1

    wall_time = time.time() - start

    if not code or "def parse_model_id" not in code:
        return BenchmarkResult(
            model=model, task_completed=False, tests_pass=False,
            wall_time_sec=wall_time, tokens_used=0, retries=retries,
            tool_failures=tool_failures, invalid_claims=0,
            verifier_result="FAIL: no valid function produced", error=error,
        )

    # Write candidate and run verification tests
    with open("/tmp/orca-bench/candidate.py", "w") as f:
        f.write(code)
    with open("/tmp/orca-bench/verify.py", "w") as f:
        f.write(VERIFICATION_TESTS)

    try:
        result = subprocess.run(
            ["python3", "/tmp/orca-bench/verify.py"],
            capture_output=True, text=True, timeout=30,
        )
        tests_pass = result.returncode == 0 and "ALL TESTS PASS" in result.stdout
        verifier = "PASS" if tests_pass else f"FAIL: {result.stderr[:200] or result.stdout[:200]}"
    except Exception as e:
        tests_pass = False
        verifier = f"FAIL: verifier error {e}"

    # Rough token estimate (chars / 4)
    tokens = len(TASK_PROMPT) // 4 + len(code) // 4

    return BenchmarkResult(
        model=model, task_completed=True, tests_pass=tests_pass,
        wall_time_sec=round(wall_time, 1), tokens_used=tokens,
        retries=retries, tool_failures=tool_failures, invalid_claims=0,
        verifier_result=verifier, error=error,
    )


def main():
    print("=" * 70)
    print("ORCA MODEL BENCHMARK: parse_model_id through 4 free models")
    print("=" * 70)
    results: List[BenchmarkResult] = []
    for model in MODELS:
        print(f"\n--- {model} ---")
        r = run_model(model)
        results.append(r)
        short = model.split("/")[-1]
        print(f"  completed={r.task_completed} tests_pass={r.tests_pass} "
              f"time={r.wall_time_sec}s retries={r.retries} verifier={r.verifier_result[:50]}")

    print("\n" + "=" * 70)
    print("MECHANICAL SCORES (no prose eloquence)")
    print("=" * 70)
    for r in results:
        short = r.model.split("/")[-1]
        status = "PASS" if (r.task_completed and r.tests_pass) else "FAIL"
        print(f"{short:35} {status} time={r.wall_time_sec}s retries={r.retries} "
              f"tool_fail={r.tool_failures} tokens~{r.tokens_used}")

    # Save results
    with open("/home/hatch/workspace/orca/benchmark-results.json", "w") as f:
        json.dump([asdict(r) for r in results], f, indent=2)
    print("\nResults saved to ~/workspace/orca/benchmark-results.json")


if __name__ == "__main__":
    main()
