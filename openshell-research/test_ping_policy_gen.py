#!/usr/bin/env python3
"""Tests for ping_policy_gen.py."""
import subprocess
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ping_policy_gen import (
    generate_policy, WorkerCapabilities, NetworkEndpoint, LINKEDIN_WORKER,
)


def test_deterministic():
    a = generate_policy(LINKEDIN_WORKER)
    b = generate_policy(LINKEDIN_WORKER)
    assert a == b, "generator must be deterministic"
    print("PASS deterministic")


def test_deny_by_default():
    # Empty declaration -> no network groups, no binaries beyond default.
    caps = WorkerCapabilities(worker_name="empty", network_groups=())
    y = generate_policy(caps)
    assert "network_policies:\n" in y
    # No endpoints emitted.
    assert "host:" not in y, "deny by default: no undeclared endpoints"
    print("PASS deny_by_default")


def test_evil_endpoint_present():
    caps = WorkerCapabilities(
        worker_name="evil",
        network_groups=(("evil", (NetworkEndpoint("evil.example.com", 443),)),))
    y = generate_policy(caps)
    assert "evil.example.com" in y
    print("PASS evil_endpoint_present")


def test_prover_within_boundary():
    here = os.path.dirname(os.path.abspath(__file__))
    gen = os.path.join("/tmp", "test-gen-policy.yaml")
    with open(gen, "w") as f:
        f.write(generate_policy(LINKEDIN_WORKER))
    r = subprocess.run(
        [os.path.join(here, "bin", "openshell-prover"), "check",
         "--boundary", os.path.join(here, "policies", "prover",
                                    "ping-operator-boundary.yaml"),
         gen],
        capture_output=True, text=True)
    assert r.returncode == 0, f"prover failed: {r.stdout} {r.stderr}"
    assert "within_boundary" in r.stdout
    print("PASS prover_within_boundary")


if __name__ == "__main__":
    test_deterministic()
    test_deny_by_default()
    test_evil_endpoint_present()
    test_prover_within_boundary()
    print("4/4 green")
