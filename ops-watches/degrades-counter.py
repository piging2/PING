#!/usr/bin/env python3
"""degrades-counter.py — consecutive-failure counter for gateway-health-degrades.

State: consecutive_non_healthy in state.json. Typed-class aware (Nolan
2026-09-27: UNKNOWN is a legitimate state):

  SERVICE_HEALTHY                       -> reset counter to 0 (a real healthy
                                           observation clears the trend)
  SERVICE_UNHEALTHY / SERVICE_UNREACHABLE -> increment (observed degradation)
  UNKNOWN classes (PROBE_TRANSPORT_FAILED, PROXY_FAILED, TAILNET_UNREACHABLE,
    SSH_FAILED, AUTH_FAILED, WSL_UNREACHABLE, HOST_UNREACHABLE, DNS_FAILED,
    PROBE_TIMEOUT)
                                        -> HOLD the counter: no health
                                           observation was made, so the trend
                                           neither advances nor resets.
                                           Transport failure must never wear
                                           the mask of consecutive non-healthy.

Usage: degrades-counter.py <state-file> <class>
Prints one result line: RESET <class> | HOLD <n> <class> | FAIL <n> <class>
Exit: always 0 (counter bookkeeping never fails the check; the caller maps
the printed line to OK/WARN).
"""
import json
import sys
from datetime import datetime, timezone

UNKNOWN_CLASSES = {
    "PROBE_TRANSPORT_FAILED", "PROXY_FAILED", "TAILNET_UNREACHABLE",
    "SSH_FAILED", "AUTH_FAILED", "WSL_UNREACHABLE", "HOST_UNREACHABLE",
    "DNS_FAILED", "PROBE_TIMEOUT",
}
UNHEALTHY_CLASSES = {"SERVICE_UNHEALTHY", "SERVICE_UNREACHABLE"}


def update(state_file, cls):
    """Update the counter for one classified observation.

    Returns (action, count, cls) where action is RESET/HOLD/FAIL.
    Pure apart from the state-file read/write; raises on unreadable state
    (fail-closed: the caller must not guess the counter).
    """
    with open(state_file) as f:
        s = json.load(f)
    g = s["gateway_health_degrades"]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    g["last_probe_class"] = cls
    g["last_probe_at"] = now
    if cls == "SERVICE_HEALTHY":
        g["consecutive_non_healthy"] = 0
        g["last_ok_at"] = now
        action = "RESET"
    elif cls in UNKNOWN_CLASSES:
        # No observation: hold. Deliberately not reset (nothing proved
        # healthy) and not incremented (nothing proved unhealthy).
        g["consecutive_non_healthy"] = g.get("consecutive_non_healthy", 0)
        action = "HOLD"
    elif cls in UNHEALTHY_CLASSES:
        g["consecutive_non_healthy"] = g.get("consecutive_non_healthy", 0) + 1
        action = "FAIL"
    else:
        raise ValueError("unknown gateway class: %r" % cls)
    with open(state_file, "w") as f:
        json.dump(s, f, indent=2)
    return action, g["consecutive_non_healthy"], cls


def main(argv):
    if len(argv) != 3:
        print("usage: degrades-counter.py <state-file> <class>", file=sys.stderr)
        return 2
    action, n, cls = update(argv[1], argv[2])
    print(action, n, cls)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
