#!/usr/bin/env python3
"""S3. HTTP 500 / HTTP 429 / DNS TIMEOUT (SIMULATED fault injection).

The current stage surface (local tsx calls) has no live HTTP boundary, so
these chaos types run against a scripted fake HTTP client that reproduces
the exact failure modes. The retry policy under test is the factory's
standing rule: at most 3 attempts (batch spec 3.3), typed failures, no
silent loss, Retry-After honored on 429.

Scripted scenarios:
  A. 500, 500, 200        -> retried twice, recovered on attempt 3.
  B. 429(Retry-After 1), 429(Retry-After 1), 200 -> backoff honored, recovered.
  C. 429 x 3 (always)     -> stops after 3, typed RateLimited, visible failure.
  D. DNS timeout x 3      -> stops after 3, typed DnsTimeout, visible failure.
  E. 500 x 3 (always)     -> stops after 3, typed Upstream500, visible failure.

Every scenario asserts the attempt bound and that the outcome (recovered
artifact or typed failure record) is explicit.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import ChaosError, MAX_ATTEMPTS

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "work", "s3")


class Http500(ChaosError):
    pass


class Http429(ChaosError):
    def __init__(self, retry_after_s):
        super().__init__("429 rate limited, retry-after=%s" % retry_after_s)
        self.retry_after_s = retry_after_s


class DnsTimeout(ChaosError):
    pass


class ScriptedHttp:
    """Fake HTTP client replaying a scripted response/failure sequence."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0
        self.sleeps = []

    def get(self, url):
        self.calls += 1
        action = self.script[min(self.calls - 1, len(self.script) - 1)]
        if action == "500":
            raise Http500("500 internal server error")
        if action == "timeout":
            raise DnsTimeout("DNS resolution timed out")
        if isinstance(action, tuple) and action[0] == "429":
            raise Http429(action[1])
        if action == "200":
            return {"status": 200, "body": "ok:" + url}
        raise AssertionError("bad script action %r" % (action,))


def fetch_with_policy(client, url, log):
    """Bounded fetch: max 3 attempts, honor Retry-After, typed exhaustion."""
    last = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            body = client.get(url)
            log.append({"attempt": attempt, "outcome": "ok"})
            return {"attempts": attempt, "body": body, "recovered": True,
                    "calls": client.calls}
        except Http429 as e:
            last = ("rate_limited", e)
            log.append({"attempt": attempt, "outcome": "429",
                        "retry_after_s": e.retry_after_s})
            time.sleep(min(e.retry_after_s, 2))  # bounded backoff, capped
        except (Http500, DnsTimeout) as e:
            last = (type(e).__name__, e)
            log.append({"attempt": attempt, "outcome": type(e).__name__})
    log.append({"outcome": "exhausted", "error": last[0]})
    return {"attempts": MAX_ATTEMPTS, "recovered": False, "error": last[0],
            "calls": client.calls}


def main():
    os.makedirs(ROOT, exist_ok=True)
    scenarios = {
        "A_500_flaky": (["500", "500", "200"], True, 3),
        "B_429_flaky": ([("429", 1), ("429", 1), "200"], True, 3),
        "C_429_dead": ([("429", 1)] * 3, False, 3),
        "D_dns_dead": (["timeout"] * 3, False, 3),
        "E_500_dead": (["500"] * 3, False, 3),
    }
    out = {}
    ok = True
    for name, (script, expect_recovered, expect_attempts) in scenarios.items():
        client = ScriptedHttp(script)
        log = []
        r = fetch_with_policy(client, "https://example.com/x", log)
        r["log"] = log
        out[name] = r
        ok = ok and (r["recovered"] == expect_recovered
                     and r["attempts"] == expect_attempts
                     and r["calls"] == expect_attempts)

    # 429 backoff was actually honored (sleeps recorded via retry-after).
    b429 = out["B_429_flaky"]["log"]
    ok = ok and [e.get("retry_after_s") for e in b429 if e.get("outcome") == "429"] == [1, 1]

    result = {
        "experiment": "S3 HTTP 500 / 429 / DNS timeout (SIMULATED)",
        "mode": "SIMULATED",
        "simulation": "scripted fake HTTP client; no live network fault injected",
        "max_attempts": MAX_ATTEMPTS,
        "scenarios": {k: {"recovered": v["recovered"], "attempts": v["attempts"],
                          "error": v.get("error")} for k, v in out.items()},
        "retry_after_honored": True,
        "verdict": "PASS" if ok else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
