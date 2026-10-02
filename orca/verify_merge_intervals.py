"""
Deterministic verifier for the Ollama (Agent #2) seam-falsification mission.

Checks the artifact's merge_intervals(intervals) -> list independently of any
worker claim. No LLM. Returns (passed: bool, details: dict).

Contract under test:
  def merge_intervals(intervals) -> list
  - Input: list of [start, end] pairs; each pair a list/tuple of exactly
    2 numbers (int/float; bool endpoints are malformed).
  - Raises ValueError on ANY malformed input: non-list input, non-pair,
    wrong-length pair, non-numeric endpoint, bool endpoint, start > end.
  - Merges overlapping OR touching intervals (next start <= current end),
    after sorting by start.
  - Returns a NEW list of [start, end] LISTS (canonical form, not tuples),
    sorted by start. Empty input -> [].
  - Must not mutate the input.
"""

import copy
import importlib.util
import os
import sys

VALID_CASES = [
    ([], []),
    ([[1, 3], [2, 6], [8, 10], [15, 18]], [[1, 6], [8, 10], [15, 18]]),
    ([[1, 4], [4, 5]], [[1, 5]]),                       # touching merges
    ([[1, 4], [2, 3]], [[1, 4]]),                       # contained
    ([[5, 7], [1, 3], [4, 6]], [[1, 3], [4, 7]]),       # unsorted input
    ([[7, 9]], [[7, 9]]),                               # single
    ([[3, 3]], [[3, 3]]),                               # zero-length
    ([(1, 3), (2, 4)], [[1, 4]]),                       # tuples accepted
    ([[1.5, 2.5], [2.0, 3.5]], [[1.5, 3.5]]),           # floats
    ([[2, 5], [2, 5]], [[2, 5]]),                       # duplicates
    ([[-5, -1], [-3, 2]], [[-5, 2]]),                   # negatives
    ([[1, 2], [2, 3], [3, 4]], [[1, 4]]),               # merge chain
    ([[10, 12], [1, 2]], [[1, 2], [10, 12]]),           # sorted output
]

# NaN endpoints are out of scope for this micro-task (comparison undefined);
# the invalid list stays on well-defined malformed shapes.
INVALID_CASES = [
    [[3, 2]],          # start > end
    [[1]],             # not a pair
    [[1, 2, 3]],       # not a pair
    [["a", "b"]],      # non-numeric endpoints
    [[True, 5]],       # bool endpoint
    [[5, False]],      # bool endpoint
    "not a list",      # non-list input
    None,              # non-list input
    42,                # non-list input
    [[1, 2], None],    # None pair
    [[1, None]],       # None endpoint
    [(1,)],            # tuple wrong length
    [[1, "2"]],        # mixed types
]


def verify_merge_intervals(path, label):
    details = {"label": label, "checks": []}

    def check(name, ok, info=""):
        details["checks"].append({"name": name, "ok": ok, "info": info[:200]})
        return ok

    if not check("file_exists", os.path.exists(path)):
        return False, details
    try:
        spec = importlib.util.spec_from_file_location(
            "merge_intervals_under_test", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    except Exception as e:
        check("imports_cleanly", False, str(e))
        return False, details
    check("imports_cleanly", True)

    fn = getattr(mod, "merge_intervals", None)
    if not check("callable_present", callable(fn)):
        return False, details

    # Valid cases
    for inp, expected in VALID_CASES:
        try:
            got = fn(copy.deepcopy(inp))
        except Exception as e:
            if not check(f"valid:{inp!r}", False,
                         f"raised {type(e).__name__}: {e}"):
                return False, details
            continue
        if not check(f"valid:{inp!r}", got == expected, f"got={got!r}"):
            return False, details

    # Canonical output form: list of 2-element lists
    try:
        out = fn([[1, 3], [2, 6]])
    except Exception as e:
        if not check("canonical_form", False, f"raised {type(e).__name__}: {e}"):
            return False, details
    else:
        ok = (isinstance(out, list)
              and all(isinstance(iv, list) and len(iv) == 2 for iv in out))
        if not check("canonical_form", ok, f"got={out!r}"):
            return False, details

    # Invalid cases must raise ValueError (strict: no other exception type)
    for inp in INVALID_CASES:
        try:
            got = fn(inp)
        except ValueError:
            check(f"invalid:{inp!r}", True)
            continue
        except Exception as e:
            check(f"invalid:{inp!r}", False,
                  f"wrong exception {type(e).__name__}: {e}")
            return False, details
        if not check(f"invalid:{inp!r}", False,
                     f"returned {got!r} instead of raising"):
            return False, details

    # Input must not be mutated
    case = [[3, 5], [1, 2], [4, 6]]
    snapshot = copy.deepcopy(case)
    try:
        fn(case)
    except Exception as e:
        if not check("input_not_mutated", False, f"raised {type(e).__name__}: {e}"):
            return False, details
    else:
        if not check("input_not_mutated", case == snapshot, f"input became {case!r}"):
            return False, details

    # Deterministic across calls
    try:
        probe = [[1, 3], [2, 6], [8, 10]]
        if not check("deterministic", fn(probe) == fn(probe)):
            return False, details
    except Exception as e:
        check("deterministic", False, str(e))
        return False, details

    return True, details


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: verify_merge_intervals.py <artifact_path>")
        sys.exit(2)
    passed, details = verify_merge_intervals(sys.argv[1], "cli")
    failed = [c["name"] for c in details["checks"] if not c["ok"]]
    print(f"verifier={'PASS' if passed else 'FAIL'} "
          f"checks={len(details['checks'])} failed={failed}")
    sys.exit(0 if passed else 1)
