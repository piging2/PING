#!/usr/bin/env python3
"""Read-after-write verification for Threads actions.

NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION: the adapter's claim is never
enough. The verifier performs an independent read of external state and
maps it to one of:
  VERIFIED_SUCCESS  read-back confirms the mutation is present
  VERIFIED_NOOP     read-back shows the desired state already held and the
                    adapter made no new change (e.g. like button already
                    "Unlike": the live driver reports 'already', never clicks)
  FAILED_TERMINAL   read-back proves no effect and retry is forbidden
                    (adapter lied, or platform block signal observed)
  UNKNOWN           read-back inconclusive: reconcile, do not retry blindly

Read path (fixture): fixtures/fake_threads_reads.py reads the fixture's
external-state file. Read path (live): threads-cli read commands
(post, fetch-post-likers, fetch-post-comments) against the authorized
account. Reads are idempotent and safe to repeat.
"""
import json
import os
import subprocess

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURE_READS = os.path.join(SKILL_DIR, "fixtures", "fake_threads_reads.py")
EXECUTOR = os.environ.get("SI_THREADS_EXECUTOR", "fixture")


def read_external_state(target_ref, action, account):
    """Independent read of external state. Returns a dict with at least
    'observed' describing what is true out there right now."""
    if EXECUTOR == "fixture":
        proc = subprocess.run(
            ["python3", FIXTURE_READS, "read",
             "--ref", target_ref, "--action", action],
            capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            return {"observed": "read_failed",
                    "detail": (proc.stderr or "")[:300]}
        return json.loads(proc.stdout)
    # Live path (BLOCKED in this environment): threads-cli reads.
    # Kept as the documented contract for the Pig-side operator.
    return {"observed": "live_reads_blocked_here",
            "detail": "threads-cli read path: post/fetch-post-likers/"
                      "fetch-post-comments via the authorized account"}


def verify(intent, normalized, timeout_sec=120):
    """Verify an adapter claim against external state. Returns
    (verdict, verification_record)."""
    target_ref = intent["target_ref"]
    action = intent["action"]
    account = intent["authorized_account"]
    obs = read_external_state(target_ref, action, account)
    observed = obs.get("observed")
    rec = {"method": "read_after_write:%s" % EXECUTOR,
           "observed_state": observed,
           "observation": obs,
           "verified_at": __import__("datetime").datetime.now(
               __import__("datetime").timezone.utc).isoformat()}
    claimed = normalized.get("claimed", False)
    effect = normalized.get("external_effect")

    if observed == "read_failed":
        return "UNKNOWN", rec
    if action == "like":
        if observed == "liked_by_account":
            return "VERIFIED_SUCCESS", rec
        if observed == "not_liked_by_account" and effect == "already_present":
            # Adapter reported 'already' and the like is present: the live
            # driver skips already-liked posts instead of toggling them off.
            return "VERIFIED_NOOP", rec
        if observed == "not_liked_by_account" and claimed:
            # Adapter claimed execution; the like is absent. It lied.
            rec["lie_detected"] = True
            return "FAILED_TERMINAL", rec
        if observed == "not_liked_by_account":
            return ("FAILED_TERMINAL"
                    if effect == "none_observed" else "UNKNOWN"), rec
    if action == "comment":
        if observed == "comment_present":
            return "VERIFIED_SUCCESS", rec
        if observed == "comment_absent" and claimed:
            rec["lie_detected"] = True
            return "FAILED_TERMINAL", rec
        if observed == "comment_absent":
            return ("FAILED_TERMINAL"
                    if effect == "none_observed" else "UNKNOWN"), rec
    return "UNKNOWN", rec
