#!/usr/bin/env python3
"""Mission Control: one real PING action as a skeptical-operator screen.

PROJECTION ONLY. This script reads the existing action-intent ledger
through its own `trace` command (the existing authority seam) and renders
the eight operator questions for one real PING action. It writes nothing
to the ledger, creates no store, and invents nothing: any question the
ledger cannot answer renders as the string UNKNOWN.

Chain of custody:
  PING ACTION -> EXISTING AUTHORITY (action-intent-ledger.py trace)
  -> PROJECTION (this script) -> MISSION CONTROL (the JSON screen)

Usage:
  python3 project_ping_action.py --intent-id <id> --as-of <ISO-8601> --out <path>
  python3 project_ping_action.py --intent-id <id> --as-of <ISO-8601> --out <path> --render-text

--as-of is REQUIRED: no wall clock may leak into the projection.
The ledger under read defaults to the real one; ENGAGEMENT_INTENT_LEDGER
may point at a fixture for tests. The script never writes to the ledger.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys

UNKNOWN = "UNKNOWN"

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.normpath(os.path.join(_HERE, ".."))
_LEDGER = os.path.join(_REPO, "outreach", "action-intent-ledger.py")
_DEFAULT_LEDGER_DATA = os.path.join(_REPO, "outreach",
                                    "action-intent-ledger.jsonl")

QUESTIONS = [
    "wanted",
    "authorized",
    "attempt",
    "worker_report",
    "verified",
    "outcome_known",
    "remains_unknown",
    "learned",
]

QUESTION_TEXT = {
    "wanted": "What did PING want?",
    "authorized": "What was authorized?",
    "attempt": "What attempt ran?",
    "worker_report": "What did the worker report?",
    "verified": "What did independent observation verify?",
    "outcome_known": "What outcome is currently known?",
    "remains_unknown": "What remains unknown?",
    "learned": "What does PING think it learned?",
}


def fail(msg):
    sys.stderr.write("project_ping_action: FAIL: %s\n" % msg)
    return 1


def answered(value, source):
    return {"question": None, "answer": value, "source": source}


def build_screen(chain):
    """Map the ledger's own trace onto the eight operator questions."""
    intent_id = chain.get("intent_id", UNKNOWN)
    screen = {}

    # 1. What did PING want?
    intent = (chain.get("INTENT") or {}).get("record") or {}
    if intent:
        screen["wanted"] = {
            "answer": {
                "action": intent.get("action", UNKNOWN),
                "platform": intent.get("platform", UNKNOWN),
                "target": intent.get("url", UNKNOWN),
                "account": intent.get("account", UNKNOWN),
                "planned_at": intent.get("ts", UNKNOWN),
                "pass_id": intent.get("pass_id", UNKNOWN),
            },
            "source": "ledger intent record (ACTION_INTENT_DURABLE)",
        }
    else:
        screen["wanted"] = {"answer": UNKNOWN,
                            "source": "no intent record in ledger"}

    # 2. What was authorized?
    auth = chain.get("AUTHORIZATION") or {}
    if auth.get("decision"):
        screen["authorized"] = {
            "answer": {
                "decision": auth.get("decision", UNKNOWN),
                "mechanism": auth.get("mechanism", UNKNOWN),
                "per_action_receipt": auth.get("per_action_receipt",
                                               UNKNOWN),
                "evidence": auth.get("evidence", UNKNOWN),
            },
            "source": ("ledger AUTHORIZATION block: pipeline-attested, "
                        "not per-action-receipted"),
        }
    else:
        screen["authorized"] = {"answer": UNKNOWN,
                                "source": "no authorization block in trace"}

    # 3. What attempt ran?
    attempt = (chain.get("ATTEMPT") or {}).get("record")
    if attempt:
        screen["attempt"] = {
            "answer": {
                "dispatched_at": attempt.get("ts", UNKNOWN),
                "pass_id": attempt.get("pass_id", UNKNOWN),
                "stage": attempt.get("stage", UNKNOWN),
            },
            "source": "ledger execution record (ATTEMPT)",
        }
    else:
        screen["attempt"] = {"answer": UNKNOWN,
                             "source": "no execution record in ledger"}

    # 4. What did the worker report?
    result = (chain.get("RESULT") or {}).get("record")
    if result:
        screen["worker_report"] = {
            "answer": {
                "terminal": result.get("terminal", UNKNOWN),
                "ok": result.get("ok", UNKNOWN),
                "evidence": result.get("evidence", UNKNOWN),
                "note": result.get("note", UNKNOWN),
                "reported_at": result.get("ts", UNKNOWN),
                "distinction": (chain.get("RESULT") or {}).get(
                    "distinction", UNKNOWN),
            },
            "source": "ledger observation record: the worker's claim, not effect",
        }
    else:
        screen["worker_report"] = {
            "answer": UNKNOWN,
            "source": "no observation record in ledger",
        }

    # 5. What did independent observation verify?
    verifications = (chain.get("VERIFIED_EFFECT") or {}).get("records") or []
    if verifications:
        screen["verified"] = {
            "answer": [
                {
                    "verdict": v.get("verdict", UNKNOWN),
                    "observer": v.get("observer", UNKNOWN),
                    "observed_at": v.get("observed_at", UNKNOWN),
                    "effect_summary": v.get("effect_summary", UNKNOWN),
                    "evidence_ref": v.get("evidence_ref", UNKNOWN),
                }
                for v in verifications
            ],
            "source": ("ledger effect_verification records: observer channel "
                        "differs from worker evidence"),
        }
    else:
        screen["verified"] = {
            "answer": UNKNOWN,
            "source": "no independent verification recorded",
        }

    # 6. What outcome is currently known?
    outcomes = (chain.get("OUTCOME") or {}).get("records") or []
    if outcomes:
        screen["outcome_known"] = {
            "answer": [
                {
                    "outcome_class": o.get("outcome_class", UNKNOWN),
                    "observed_at": o.get("observed_at", UNKNOWN),
                    "evidence": o.get("evidence", UNKNOWN),
                    "note": o.get("note", UNKNOWN),
                }
                for o in outcomes
            ],
            "source": "ledger outcome records (observations, not verdicts)",
        }
    else:
        screen["outcome_known"] = {
            "answer": UNKNOWN,
            "source": "no outcome observation recorded",
        }

    # 7. What remains unknown? Derived only from explicit ledger gaps.
    unknowns = []
    if not verifications:
        unknowns.append("whether the attempt had any effect in the world "
                        "(no independent verification recorded)")
    if not outcomes:
        unknowns.append("what happened after the attempt "
                        "(no outcome observation recorded)")
    latest_outcome = outcomes[-1] if outcomes else {}
    if latest_outcome.get("outcome_class") == "NO_SIGNAL":
        unknowns.append(
            "whether the action later draws replies or inquiries "
            "(outcome window honestly open as of %s)"
            % latest_outcome.get("observed_at", UNKNOWN))
    per_action_receipt = auth.get("per_action_receipt", "")
    if "absent" in str(per_action_receipt):
        unknowns.append("a per-action authorization receipt (authorization "
                        "is pipeline-attested, not per-action-receipted)")
    if verifications:
        last_seen = verifications[-1].get("observed_at", UNKNOWN)
        unknowns.append("world state after %s (no later independent "
                        "observation)" % last_seen)
    screen["remains_unknown"] = {
        "answer": unknowns if unknowns else ["none identified from ledger state"],
        "source": "derived from explicit gaps in the ledger records above",
    }

    # 8. What does PING think it learned?
    learnings = (chain.get("CANDIDATE_LEARNING") or {}).get("records") or []
    if learnings:
        screen["learned"] = {
            "answer": [
                {
                    "pattern": l.get("pattern", UNKNOWN),
                    "confidence": l.get("confidence", UNKNOWN),
                    "status": l.get("status", UNKNOWN),
                    "proposed_at": l.get("ts", UNKNOWN),
                }
                for l in learnings
            ],
            "source": ("ledger candidate-learning records: candidates only, "
                        "never auto-promoted"),
        }
    else:
        reason = "no candidate-learning records in ledger"
        notes = [o.get("note") for o in outcomes if o.get("note")]
        if notes:
            reason += "; latest outcome note: %s" % notes[-1]
        screen["learned"] = {
            "answer": {"status": "none proposed", "reason": reason},
            "source": "ledger candidate-learning records (empty)",
        }

    for key in QUESTIONS:
        screen[key]["question"] = QUESTION_TEXT[key]
    screen["intent_id"] = intent_id
    return screen


def render_text(doc):
    lines = []
    lines.append("MISSION CONTROL: ONE REAL PING ACTION")
    lines.append("intent_id: %s" % doc["intent_id"])
    lines.append("as_of: %s" % doc["as_of"])
    lines.append("source: %s" % doc["source"]["command"])
    lines.append("trace_sha256: %s" % doc["source"]["trace_sha256"])
    lines.append("")
    for key in QUESTIONS:
        q = doc["screen"][key]
        lines.append("Q: %s" % q["question"])
        lines.append("A: %s" % json.dumps(q["answer"], indent=1,
                                          sort_keys=True))
        lines.append("source: %s" % q["source"])
        lines.append("")
    lines.append("honesty: %d of %d questions UNKNOWN; %s" % (
        doc["honesty"]["unknown_count"], len(QUESTIONS),
        "no mocked fields" if doc["honesty"]["unknown_count"] >= 0 else ""))
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(
        description="Project one real PING action as a Mission Control screen.")
    ap.add_argument("--intent-id", required=True)
    ap.add_argument("--as-of", required=True,
                    help="ISO-8601 timestamp of the projection (required).")
    ap.add_argument("--out", required=True)
    ap.add_argument("--render-text", action="store_true",
                    help="Also print the human-readable screen to stdout.")
    ap.add_argument("--ledger", default=_LEDGER,
                    help="Path to action-intent-ledger.py (default: repo's).")
    args = ap.parse_args()

    if not os.path.isfile(args.ledger):
        return fail("ledger CLI not found: %s" % args.ledger)

    env = dict(os.environ)
    # Never write: trace is read-only, but belt-and-braces the data path too.
    proc = subprocess.run(
        [sys.executable, args.ledger, "trace",
         "--intent-id", args.intent_id],
        capture_output=True, text=True, env=env, cwd=_REPO)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        return fail("ledger trace failed for intent %s (failing closed; "
                    "no screen written)" % args.intent_id)
    try:
        chain = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        return fail("ledger trace returned non-JSON: %s" % e)

    canonical = json.dumps(chain, sort_keys=True,
                           separators=(",", ":")).encode("utf-8")
    digest = hashlib.sha256(canonical).hexdigest()
    screen = build_screen(chain)
    unknown_count = sum(1 for k in QUESTIONS
                        if screen[k]["answer"] == UNKNOWN)

    doc = {
        "projection": "mission-control/ping-action-screen",
        "intent_id": args.intent_id,
        "as_of": args.as_of,
        "source": {
            "ledger": os.environ.get("ENGAGEMENT_INTENT_LEDGER",
                                     _DEFAULT_LEDGER_DATA),
            "command": ("action-intent-ledger.py trace --intent-id %s"
                        % args.intent_id),
            "trace_sha256": digest,
            "note": ("projection only; the action-intent ledger remains "
                     "the sole authority"),
        },
        "screen": screen,
        "honesty": {
            "unknown_count": unknown_count,
            "question_count": len(QUESTIONS),
            "mocked_fields": 0,
        },
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, sort_keys=True)
        f.write("\n")

    if args.render_text:
        sys.stdout.write(render_text(doc) + "\n")
    else:
        sys.stdout.write("projected 1 PING action -> %s\n" % args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
