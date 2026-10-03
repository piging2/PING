#!/usr/bin/env python3
"""distill-sweep.py: dead-letter-queue recovery for Meta AI research answers.

Every cycle the cron runs a DISTILL SWEEP over captured answer files that
were never processed (extracted/verified/distilled). Staleness bands:
  <24h  normal | 24-48h elevated | 48-72h high | 72-96h urgent | >96h STALE BREACH
Selection order: stale breach first, then urgent/high/elevated/normal;
within a band, cycle briefs before experiments, then oldest first.

Eligibility (derived from authoritative files, never hand lists):
  - file <run_id>.md exists and is a plain answer
  - <run_id>.md.CAPTURE_FAILED files are listed as terminal execution
    outcomes (eligible=False, never selected): the run failed to capture
    evidence, so there is nothing to distill
  - matching sidecar <run_id>.provenance.json has status == "answer_captured"
  - brief is not out of scope (j/k clowning briefs, per standing rule)
  - brief is not QUARANTINED (fail-closed: its answers are evidence only)
  - no terminal entry in distill.jsonl (distilled/distill_failed/excluded_*)
  - outreach engine has NOT already ingested it (run timestamp prefix
    YYYYMMDD-HHMMSS appears in ingested.log on a line that also contains
    'ingest'; the engine is the primary ingest path, so re-verifying its
    files here would double-process)

The sweep never starves fresh research: the caller caps the selection
(--cap, default 5). Stale-breach overflow is reported, not silently dropped.

Usage:
  python3 distill-sweep.py --queue [--now ISO]      # full queue as JSON
  python3 distill-sweep.py --select [--cap N]      # this cycle's selection (dry run, no writes)
  python3 distill-sweep.py --mark <file> <status> [note]
      # append distill.jsonl entry; status in
      # distilled|distill_failed|excluded_brief_quarantined|excluded_out_of_scope
Env overrides (tests): META_INTEL_DIR, TANDEM_QUARANTINE_DIR, DISTILL_NOW.
"""
import fcntl
import importlib.util
import json
import os
import re
import sys
from datetime import datetime, timezone

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "brief_lifecycle", os.path.join(_HERE, "brief-lifecycle.py"))
_lifecycle = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_lifecycle)

INTEL_DIR = os.environ.get("META_INTEL_DIR", os.path.expanduser(
    "~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel"))
DISTILL_LEDGER = os.path.join(INTEL_DIR, "distill.jsonl")

# Briefs permanently out of the distill scope (standing rule, not a hand list
# that drifts: these are the live-clowning marketing-machinery briefs).
OUT_OF_SCOPE_BRIEFS = {"j-clowning-pattern-mining", "k-clowning-distribution"}

BANDS = [
    (96, float("inf"), "stale_breach", 0),
    (72, 96, "urgent", 1),
    (48, 72, "high", 2),
    (24, 48, "elevated", 3),
    (0, 24, "normal", 4),
]

TERMINAL_DISTILL = {"distilled", "distill_failed",
                    "excluded_brief_quarantined", "excluded_out_of_scope"}

RUN_TS = re.compile(r"^(\d{8})-(\d{6})-(.+)$")
RUN_PREFIX_RE = re.compile(r"(\d{8})-(\d{6})")


def engine_ingested_prefixes(intel_dir=INTEL_DIR):
    """Run timestamp prefixes (YYYYMMDD-HHMMSS) the outreach engine already
    ingested, derived from ingested.log.

    A line counts as an engine-ingest record only if it contains a
    YYYYMMDD-HHMMSS run prefix AND, case-insensitive, any of:
      - the word 'ingest' (legacy format: "ingested after independent
        verification gate");
      - a completed-audit marker pair ('audited' AND 'verdicts';
        round-124 format: "N businesses audited; verdicts: VERIFIED-NEW 2,
        ...");
      - the distill-closed marker 'mark-distill-closed' (current writer
        format: "mark-verified.sh then mark-distill-closed.sh run";
        self-audit 2026-10-02: completed-distill records carry neither
        legacy signal, so without this the sweep re-selects already
        distilled files as dead letters).
    Lines that merely mention a run without any of these (e.g.
    CAPTURE_FAILED records that say 'recorded, NOT extracted') do NOT
    count: the sweep must not close a dead letter that was never
    extracted. The 'verdicts'-without-'audited' combination alone does
    not count, so a pending-review note never closes a dead letter.

    Fail-open: a missing or unreadable log returns the empty set, leaving
    selection unchanged.
    """
    path = os.path.join(intel_dir, "ingested.log")
    prefixes = set()
    try:
        with open(path, errors="replace") as f:
            for line in f:
                low = line.lower()
                if "ingest" not in low and "mark-distill-closed" not in low \
                        and not ("audited" in low and "verdicts" in low):
                    continue
                for m in RUN_PREFIX_RE.finditer(line):
                    prefixes.add(m.group(0))
    except OSError:
        pass
    return prefixes


def parse_run_id(stem):
    m = RUN_TS.match(stem)
    if not m:
        return None, None
    ts = datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S"
                           ).replace(tzinfo=timezone.utc)
    return ts, m.group(3)


def now_utc():
    override = os.environ.get("DISTILL_NOW")
    if override:
        return datetime.fromisoformat(override.replace("Z", "+00:00"))
    return datetime.now(timezone.utc)


def band_for(age_hours):
    for lo, hi, name, rank in BANDS:
        if lo <= age_hours < hi or (hi == float("inf") and age_hours >= lo):
            return name, rank
    return "normal", 4


def load_distill_ledger():
    entries = {}
    if os.path.exists(DISTILL_LEDGER):
        for line in open(DISTILL_LEDGER):
            if line.strip():
                e = json.loads(line)
                if e.get("status") in TERMINAL_DISTILL:
                    entries[e["file"]] = e
    return entries


def build_queue(intel_dir=INTEL_DIR, at=None):
    at = at or now_utc()
    quarantined = _lifecycle.quarantined_briefs()
    ledger = load_distill_ledger()
    eng_ingested = engine_ingested_prefixes(intel_dir)
    items = []
    for name in sorted(os.listdir(intel_dir)):
        if not name.endswith(".md"):
            continue
        stem = name[:-3]
        ts, slug = parse_run_id(stem)
        if ts is None or slug is None:
            continue
        age_h = (at - ts).total_seconds() / 3600.0
        if age_h < 0:
            continue  # clock skew; never distill the future
        band, rank = band_for(age_h)
        sidecar_path = os.path.join(intel_dir, stem + ".provenance.json")
        try:
            sidecar = json.load(open(sidecar_path))
            sc_status = sidecar.get("status")
        except Exception:
            sc_status = None
        run_prefix = "-".join(stem.split("-")[:2])
        item = {"file": name, "brief_id": slug, "run_id": stem,
                "age_hours": round(age_h, 1), "band": band, "band_rank": rank,
                "sidecar_status": sc_status, "eligible": False, "reason": None,
                "engine_ingested": run_prefix in eng_ingested}
        if name in ledger:
            item["reason"] = f"distill ledger: {ledger[name]['status']}"
        elif sc_status != "answer_captured":
            item["reason"] = (f"sidecar status is {sc_status!r}, "
                              f"not answer_captured")
        elif slug in OUT_OF_SCOPE_BRIEFS:
            item["reason"] = "out of scope (clowning marketing-machinery brief)"
        elif slug in quarantined:
            item["reason"] = (f"brief {slug} is QUARANTINED; answers are "
                              f"evidence only (fail-closed)")
        elif item["engine_ingested"]:
            item["reason"] = ("outreach engine already ingested (ingested.log); "
                              "dead-letter closed by the engine's primary "
                              "ingest path, never re-verify in the sweep")
        else:
            item["eligible"] = True
            item["reason"] = "eligible"
        items.append(item)
    # CAPTURE_FAILED files are terminal execution outcomes, never dead
    # letters: the run failed to capture evidence, so there is nothing to
    # distill. They are listed (auditable) but never eligible, and the sweep
    # never touches them. (2026-09-23: generic classification; the 18-file
    # backlog is closed via mark-distill-closed.sh --decision capture_failed
    # plus the reconciler's R7 rule, not by hand-editing this queue.)
    for name in sorted(os.listdir(intel_dir)):
        if not name.endswith(".md.CAPTURE_FAILED"):
            continue
        stem = name[:-len(".md.CAPTURE_FAILED")]
        ts, slug = parse_run_id(stem)
        if ts is None or slug is None:
            continue
        age_h = (at - ts).total_seconds() / 3600.0
        if age_h < 0:
            continue
        band, rank = band_for(age_h)
        sidecar_path = os.path.join(intel_dir, stem + ".provenance.json")
        try:
            sc_status = json.load(open(sidecar_path)).get("status")
        except Exception:
            sc_status = None
        items.append({"file": name, "brief_id": slug, "run_id": stem,
                      "age_hours": round(age_h, 1), "band": band,
                      "band_rank": rank, "sidecar_status": sc_status,
                      "eligible": False,
                      "reason": "capture_failed: terminal execution outcome "
                                "(failed capture, not evidence; never enters "
                                "extraction)",
                      "engine_ingested": False})
    return items


def select(queue, cap=5):
    elig = [i for i in queue if i["eligible"]]
    elig.sort(key=lambda i: (i["band_rank"],
                             0 if i["brief_id"] in _lifecycle.CYCLE else 1,
                             -i["age_hours"]))
    chosen, deferred = elig[:cap], elig[cap:]
    stale_deferred = [i for i in deferred if i["band"] == "stale_breach"]
    return chosen, deferred, stale_deferred


def mark_distill(filename, status, note="", require_validation=None):
    if status not in TERMINAL_DISTILL and status not in {"attempted"}:
        print(f"unknown distill status: {status}", file=sys.stderr)
        return 2
    if require_validation and status == "distilled":
        # BACKLOG_NOLAN item 3: the worker-deliverable validator is invoked by
        # this real acceptance path. A "distilled" mark is the acceptance
        # decision; it may not be recorded when the deliverable fails the
        # gate. The file is marked distill_failed instead, with the failing
        # check lines in the note, so the failure is visible and retryable.
        import subprocess
        validator = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "..", "outreach", "scripts",
                                 "validate-worker-deliverable.py")
        try:
            proc = subprocess.run([sys.executable, validator,
                                   require_validation],
                                  capture_output=True, text=True, timeout=120)
        except (OSError, subprocess.SubprocessError) as e:
            print(f"validator could not run: {e}; failing closed",
                  file=sys.stderr)
            return mark_distill(filename, "distill_failed",
                                "validator unrunnable: %s" % e)
        if proc.returncode != 0:
            fails = [l for l in proc.stdout.splitlines()
                     if l.startswith("FAIL")]
            return mark_distill(
                filename, "distill_failed",
                "worker-deliverable validator FAIL: %s" % "; ".join(fails))
    entry = {"at": now_utc().strftime("%Y-%m-%dT%H:%M:%SZ"),
             "file": filename, "status": status, "note": note}
    # Race fix 2026-09-29 (v2): the first attempt kept read-modify-write +
    # os.replace under flock, but that is still racy: the lock lives on the
    # inode while os.replace swaps the inode out from under the path, so a
    # waiter that opened the path pre-replace locks the STALE inode, reads
    # stale content, and its replace silently drops the winner's entry
    # (proven: 2 concurrent marks, both exit 0, only 1 entry landed).
    # Append-under-lock has no rename and no stale inode: O_APPEND always
    # writes at the true end, and the exclusive lock serializes writers.
    line = (json.dumps(entry) + "\n").encode("utf-8")
    fd = os.open(DISTILL_LEDGER,
                 os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        os.write(fd, line)
        os.fsync(fd)
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
    print(json.dumps(entry))
    return 0


def main(argv):
    if "--mark" in argv:
        i = argv.index("--mark")
        try:
            filename, status = argv[i + 1], argv[i + 2]
        except IndexError:
            print("usage: --mark <file> <status> [note] "
                  "[--require-validation MANIFEST]", file=sys.stderr)
            return 2
        note = argv[i + 3] if len(argv) > i + 3 and \
            not argv[i + 3].startswith("--") else ""
        require_validation = None
        if "--require-validation" in argv:
            j = argv.index("--require-validation")
            try:
                require_validation = argv[j + 1]
            except IndexError:
                print("usage: --require-validation MANIFEST", file=sys.stderr)
                return 2
        return mark_distill(filename, status, note, require_validation)
    cap = 5
    if "--cap" in argv:
        cap = int(argv[argv.index("--cap") + 1])
    queue = build_queue()
    if "--queue" in argv:
        print(json.dumps(queue, indent=1))
        return 0
    if "--select" in argv:
        chosen, deferred, stale_deferred = select(queue, cap)
        print(json.dumps({"cap": cap, "selected": chosen,
                          "deferred_count": len(deferred),
                          "stale_breach_deferred": stale_deferred,
                          "engine_ingested_excluded": len(
                              [i for i in queue
                               if i.get("engine_ingested")]),
                          "queue_total": len(queue),
                          "eligible_total": len([i for i in queue
                                                 if i["eligible"]])}, indent=1))
        return 0
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
