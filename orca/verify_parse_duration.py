"""
Deterministic verifier for the Hermes seam-falsification mission.

Checks the artifact's parse_duration(spec) -> int independently of any
worker claim. No LLM. Returns (passed: bool, details: dict).
"""

import importlib.util
import os
import sys

VALID_CASES = {
    "30s": 30,
    "5m": 300,
    "2h": 7200,
    "1h30m": 5400,
    "1d2h": 93600,
    "0s": 0,
    "2d": 172800,
    "1m30s": 90,
    "1H30M": 5400,   # case-insensitive units
    "  10s  ": 10,   # surrounding whitespace
    "1d1h1m1s": 90061,
}

INVALID_CASES = ["", "   ", "abc", "2x", "1.5h", "-5m", "5", "h30", "1h 30m", None]


def verify_parse_duration(path, label):
    details = {"label": label, "checks": []}

    def check(name, ok, info=""):
        details["checks"].append({"name": name, "ok": ok, "info": info[:200]})
        return ok

    if not check("file_exists", os.path.exists(path)):
        return False, details
    try:
        spec = importlib.util.spec_from_file_location("parse_duration_under_test", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    except Exception as e:
        check("imports_cleanly", False, str(e))
        return False, details
    check("imports_cleanly", True)

    fn = getattr(mod, "parse_duration", None)
    if not check("callable_present", callable(fn)):
        return False, details

    # Valid cases
    for inp, expected in VALID_CASES.items():
        try:
            got = fn(inp)
        except Exception as e:
            if not check(f"valid:{inp!r}", False, f"raised {type(e).__name__}: {e}"):
                return False, details
            continue
        if not check(f"valid:{inp!r}", got == expected and isinstance(got, int),
                     f"got={got!r} expected={expected!r}"):
            return False, details

    # Invalid cases must raise (ValueError or TypeError accepted)
    for inp in INVALID_CASES:
        try:
            got = fn(inp)
        except (ValueError, TypeError):
            check(f"invalid:{inp!r}", True)
            continue
        except Exception as e:
            check(f"invalid:{inp!r}", False, f"wrong exception {type(e).__name__}")
            return False, details
        if not check(f"invalid:{inp!r}", False, f"returned {got!r} instead of raising"):
            return False, details

    # Deterministic across calls
    try:
        if not check("deterministic", fn("1h30m") == fn("1h30m") == 5400):
            return False, details
    except Exception as e:
        check("deterministic", False, str(e))
        return False, details

    return True, details


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: verify_parse_duration.py <artifact_path>")
        sys.exit(2)
    passed, details = verify_parse_duration(sys.argv[1], "cli")
    failed = [c["name"] for c in details["checks"] if not c["ok"]]
    print(f"verifier={'PASS' if passed else 'FAIL'} checks={len(details['checks'])} failed={failed}")
    sys.exit(0 if passed else 1)
