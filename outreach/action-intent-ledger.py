#!/usr/bin/env python3
"""Append-only action-intent ledger for PING Social engagement passes.

Closes the highest-priority execution seam: SELECT -> BROWSER ACTION ->
WORKER DIES -> NO LOG -> NEXT PASS SEES NOTHING -> SAME ACTION MAY BE
SELECTED AGAIN. Before this ledger, intent lived in memory or in the job
file handed to the browser worker; a crash between action and logging left
no trace, so the system could not distinguish NOT_ATTEMPTED from
EXECUTED_BUT_UNOBSERVED.

The ledger makes ACTION INTENT durable BEFORE any browser action. It is a
JSONL append-only log (a ledger, not a database) at
~/workspace/outreach/action-intent-ledger.jsonl. Records are never mutated;
readers derive each intent's current stage from the record stream. Each
append is a single small write followed by fsync. If the tail line is ever
found malformed, the ledger is treated as unreadable (fail closed, exit 3)
until an operator inspects the tail bytes; removing torn bytes is file
surgery, never record mutation.

Lifecycle (exact states):
  ACTION_INTENT_DURABLE -> EXECUTION -> OBSERVATION -> FINALIZATION

Terminal states:
  EXECUTED          observed ok=true and durably recorded in history
  FAILED            attempted, did not take effect (observed ok=false)
  NOT_ATTEMPTED     provably never attempted
  UNKNOWN_EXECUTION reached EXECUTION with no OBSERVATION from a pass that
                    is no longer running: the external commitment may or
                    may not have happened. Never silently retried; never
                    auto-reconciled.

Record types (one JSON object per line):
  intent          one per planned action, written before the browser worker
                  is invoked. stage=ACTION_INTENT_DURABLE.
  execution       appended when the action is handed to the worker. From
                  this point a missing observation means UNKNOWN_EXECUTION.
                  Appended BEFORE delivery (scp / task start) so a crash in
                  between still fails closed. stage=EXECUTION.
  observation     appended from worker evidence. stage=OBSERVATION with
                  terminal EXECUTED (ok=true), FAILED (ok=false), or
                  NOT_ATTEMPTED (worker proves it never acted).
  finalize        appended after an EXECUTED outcome is durably recorded in
                  the engagement history (guard record). stage=FINALIZATION,
                  terminal=EXECUTED.
  reconciliation  deliberate human/agent act clearing an intent that never
                  got an observation. outcome=EXECUTED or NOT_ATTEMPTED,
                  always with reason, evidence, resolved_by. EXECUTED
                  requires --history-recorded.
  dispatch_lifecycle
                  pass-level lifecycle, orthogonal to intent outcomes.
                  Currently only RECONCILIATION_REQUIRED: the dispatch is
                  stale (EXECUTION records older than the threshold, zero
                  observations, zero progress evidence) and needs
                  deliberate human/agent reconciliation. Written by
                  sweep-stale-dispatches. Never changes an intent's
                  terminal: intents stay UNKNOWN_EXECUTION. Never infers
                  FAILED, never authorizes a retry.

UNKNOWN_EXECUTION must never silently retry an external commitment (like,
comment, post, DM, email, form submit). The refuse step blocks automatic
re-execution of that (account, platform, action) until an explicit
reconciliation clears it. Reconciliation is deliberate and never automatic.

Dispatch lifecycle (GO item 2, 2026-09-25) is orthogonal to intent
outcomes. A dispatch (one pass's handoff to a worker) that stays stale
long enough with zero evidence moves to RECONCILIATION_REQUIRED so it
stops sitting in the ambiguous bucket forever and enters the deliberate
reconciliation inbox. The transition is about the DISPATCH, never the
intents: every intent's execution outcome stays UNKNOWN, FAILED is never
inferred, nothing becomes retryable, and the original intent and evidence
records are never discarded or altered.

Identity normalization (account names, post ids) is owned by
engagement-guard.py; this module imports its pure helpers so there is one
implementation of identity matching. If the guard module cannot be loaded,
every read path fails closed.

Wiring:
  - Facebook: ~/workspace/pig-fb/run_pass.sh runs `refuse` on the
    guard-filtered job, then `write-intents`, then `mark-execution` BEFORE
    anything is copied to the Pig, then `record-outcomes` when the worker
    result arrives (or --not-attempted when the job provably never reached
    the worker).
  - Instagram: the cron body runs `refuse` after the guard filter,
    `write-intents` before the Phase B browser task, `mark-execution` when
    Phase B starts, and `record-outcomes` after each batch.

Subcommands:
  write-intents   --platform P --in FILE --pass-id ID [--fb-job]
  mark-execution  --platform P --pass-id ID
  refuse          --platform P --in FILE --out FILE --pass-id ID [--fb-job]
  record-outcomes --platform P --pass-id ID
                  (--result-json R | --outcomes-json O | --not-attempted --reason R [--evidence E])
  finalize        --pass-id ID --record-ref REF
  list-unknown    [--platform P] [--exclude-pass-id ID]
  reconcile       --intent-id ID --outcome EXECUTED|NOT_ATTEMPTED
                  --reason R --evidence E --resolved-by WHO [--history-recorded]
  check           --platform P --account A [--action ACT] [--url U]
  sweep-stale-dispatches [--platform P] [--max-age-hours H] [--dry-run]
                  [--jobs-dir D] [--progress-state F] [--collected-results F]
                  append one dispatch_lifecycle RECONCILIATION_REQUIRED
                  record per stale dispatch (EXECUTION older than H hours,
                  zero observation records, zero progress evidence, no
                  existing lifecycle record). Idempotent; intents untouched.
  verify-effect   --intent-id ID --observer CH --verdict
                  EFFECT_CONFIRMED|EFFECT_ABSENT|INCONCLUSIVE
                  --evidence-ref R --effect-summary S [--observed-at T]
                  [--note N]
                  append an effect_verification record: an INDEPENDENT
                  observation that the attempted effect materialized (or did
                  not). Requires terminal EXECUTED. The observer channel
                  must differ from the worker evidence (self-verification
                  refused). RESULT is not EFFECT.
  record-outcome  --intent-id ID --outcome-class C --evidence E
                  [--observed-at T] [--note N]
                  append an outcome record: a measured business consequence.
                  Requires terminal EXECUTED. EFFECT is not SUCCESS; SUCCESS
                  is not BENEFICIAL OUTCOME. NO_SIGNAL is honest.
  propose-learning
                  --intent-id ID --hypothesis H --sample-support N
                  [--evidence-refs R]
                  append a candidate_learning record, status always
                  CANDIDATE. No promote path exists: the ledger records
                  observations, it never rewrites policy. Promotion requires
                  explicit owner (Nolan) authority.
  trace           --intent-id ID
                  print one action's full chain: INTENT -> AUTHORIZATION ->
                  ATTEMPT -> RESULT -> VERIFIED EFFECT -> OUTCOME ->
                  CANDIDATE LEARNING, hard distinctions intact.

Exit codes: 0 = ok; 2 = usage error; 3 = ledger (or guard helpers)
unreadable, fail closed.
"""
import argparse
import importlib.util
import json
import os
import sys
import uuid
from collections import Counter
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEDGER_PATH = os.environ.get(
    "ENGAGEMENT_INTENT_LEDGER",
    os.path.join(BASE_DIR, "action-intent-ledger.jsonl"))
GUARD_PY = os.path.join(BASE_DIR, "engagement-guard.py")

ACTION_INTENT_DURABLE = "ACTION_INTENT_DURABLE"
EXECUTION = "EXECUTION"
OBSERVATION = "OBSERVATION"
FINALIZATION = "FINALIZATION"

EXECUTED = "EXECUTED"
FAILED = "FAILED"
UNKNOWN_EXECUTION = "UNKNOWN_EXECUTION"
NOT_ATTEMPTED = "NOT_ATTEMPTED"

TERMINALS = (EXECUTED, FAILED, UNKNOWN_EXECUTION, NOT_ATTEMPTED)

# Dispatch lifecycle (GO item 2, 2026-09-25). Orthogonal to intent
# execution outcomes: a dispatch can move to RECONCILIATION_REQUIRED while
# every intent's outcome stays UNKNOWN. Never infers FAILED, never a retry
# signal; the existing deliberate `reconcile` subcommand clears intents.
DISPATCH_LIFECYCLE = "dispatch_lifecycle"
RECONCILIATION_REQUIRED = "RECONCILIATION_REQUIRED"

# External commitments this ledger covers. Never silently retried while
# UNKNOWN_EXECUTION.
ACTIONS = ("like", "comment", "follow", "post", "dm", "email", "form_submit")

# ---------------------------------------------------------------------------
# P0 OUTCOME LOOP (Interval 08, 2026-09-29). Extends the reached
# intent -> attempt -> RESULT chain with VERIFIED EFFECT and OUTCOME, and
# CANDIDATE LEARNING under the learning law. Hard distinctions, never
# collapsed:
#
#   INTENT          durable plan: this action should happen (ACTION_INTENT_DURABLE)
#   AUTHORIZATION   guard/approval allowed it (pipeline-attested; see cmd_trace)
#   ATTEMPT         handed to the worker (EXECUTION)
#   RESULT          worker's claim about what it did (OBSERVATION: ok=true/false
#                   -> EXECUTED / FAILED). RESULT is not EFFECT.
#   VERIFIED EFFECT independent observation that the effect materialized in
#                   the world (effect_verification). EFFECT is not SUCCESS:
#                   a confirmed effect can still produce no benefit.
#   OUTCOME         measured business consequence (outcome record). SUCCESS
#                   is not BENEFICIAL OUTCOME: a posted comment (success) that
#                   draws no reply is NO_SIGNAL, recorded honestly.
#
# LEARNING LAW: the ledger records observations; it does NOT rewrite policy.
# OBSERVED OUTCOME -> CANDIDATE LEARNING -> EVIDENCE/SAMPLE SUPPORT ->
# PROPOSAL -> PROMOTION AUTHORITY -> DETERMINISTIC POLICY/CAPABILITY.
# Owner assertions never decay. Verified facts never decay with time.
# Learned probabilistic preferences may expire/decay. A model never promotes
# its own inference into authority: there is deliberately NO promote
# subcommand. Promotion authority is the owner (Nolan), by explicit decision.
# ---------------------------------------------------------------------------

EFFECT_VERIFICATION = "effect_verification"
OUTCOME_RECORD = "outcome"
CANDIDATE_LEARNING = "candidate_learning"

VERIFICATION = "VERIFICATION"   # stage for effect_verification records
OUTCOME = "OUTCOME"             # stage for outcome records
LEARNING = "LEARNING"           # stage for candidate_learning records

EFFECT_CONFIRMED = "EFFECT_CONFIRMED"
EFFECT_ABSENT = "EFFECT_ABSENT"
INCONCLUSIVE = "INCONCLUSIVE"
VERDICTS = (EFFECT_CONFIRMED, EFFECT_ABSENT, INCONCLUSIVE)

# Outcome classes: measured business consequence of one EXECUTED action.
# NO_SIGNAL and PENDING_WINDOW_OPEN are honest observations, not failures
# of the ledger. Multiple outcome records per intent are allowed: the
# observation window stays open.
OUTCOME_CLASSES = (
    "QUALIFIED_INQUIRY",   # the action produced a genuine business inquiry
    "REPLY_RECEIVED",      # a reply / response to the action, not yet qualified
    "PROFILE_VISIT",       # measurable profile/page visit attributable to it
    "FOLLOW",              # a follow attributable to it
    "POSITIVE_SIGNAL",     # other measurable positive signal (with evidence)
    "NO_SIGNAL",           # observed: no measurable consequence in window
    "PENDING_WINDOW_OPEN", # too early to judge; re-observe later
)

LEARNING_CANDIDATE = "CANDIDATE"  # the only status; promotion is out of scope


def fail(msg):
    print("action-intent-ledger: %s" % msg, file=sys.stderr)


def _utcnow():
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------- ledger io
def _append(record):
    line = json.dumps(record, sort_keys=True)
    with open(LEDGER_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")
        f.flush()
        os.fsync(f.fileno())


def _read_records():
    if not os.path.isfile(LEDGER_PATH):
        return []
    records = []
    with open(LEDGER_PATH, "r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as e:
                raise ValueError(
                    "ledger line %d is not valid JSON: %s" % (lineno, e))
    return records


def _derive(records):
    """Fold the append-only stream into per-intent stage/terminal. The
    first record of each kind wins; later duplicates never overwrite."""
    intents = {}
    for r in records:
        t = r.get("record_type")
        if t == "intent":
            iid = r.get("intent_id")
            if iid and iid not in intents:
                intents[iid] = {"intent": r, "execution": None,
                                "observation": None, "finalize": None,
                                "reconciliation": None,
                                "verifications": [], "outcomes": [],
                                "learnings": [],
                                "stage": ACTION_INTENT_DURABLE,
                                "terminal": None, "provenance": "ledger"}
        elif t in ("execution", "observation", "finalize", "reconciliation"):
            s = intents.get(r.get("intent_id"))
            if s is None:
                continue
            if t == "execution" and s["execution"] is None:
                s["execution"] = r
                s["stage"] = EXECUTION
            elif t == "observation" and s["observation"] is None:
                s["observation"] = r
                s["stage"] = OBSERVATION
                s["terminal"] = r.get("terminal")
            elif t == "finalize" and s["finalize"] is None:
                s["finalize"] = r
                s["stage"] = FINALIZATION
                s["terminal"] = EXECUTED
            elif t == "reconciliation" and s["reconciliation"] is None:
                s["reconciliation"] = r
                s["stage"] = FINALIZATION
                s["terminal"] = r.get("outcome")
                s["provenance"] = "reconciliation"
        elif t == EFFECT_VERIFICATION:
            s = intents.get(r.get("intent_id"))
            if s is not None:
                # Append-only: every independent verification is kept.
                # Verified facts never decay; a later verification adds,
                # never overwrites.
                s["verifications"].append(r)
        elif t == OUTCOME_RECORD:
            s = intents.get(r.get("intent_id"))
            if s is not None:
                # Outcomes accumulate over the observation window. Each
                # record is one observation, not a final verdict.
                s["outcomes"].append(r)
        elif t == CANDIDATE_LEARNING:
            s = intents.get(r.get("intent_id"))
            if s is not None:
                s["learnings"].append(r)
    return intents


def _open_intents(states, platform=None):
    """Intents with no observation, finalize, or reconciliation."""
    return [s for s in states.values()
            if s["observation"] is None and s["finalize"] is None
            and s["reconciliation"] is None
            and (platform is None or s["intent"].get("platform") == platform)]


def _is_unknown(s, live_pass_ids):
    """UNKNOWN_EXECUTION: reached EXECUTION, no observation, pass dead."""
    if s["terminal"] is not None:
        return False
    if s["observation"] or s["finalize"] or s["reconciliation"]:
        return False
    if s["stage"] != EXECUTION:
        return False
    return s["intent"].get("pass_id") not in live_pass_ids


def _dispatch_lifecycles(records):
    """pass_id -> first dispatch_lifecycle record. First record wins, same
    as the per-intent fold; later duplicates never overwrite. _derive
    ignores these records: they describe the dispatch, not any intent."""
    seen = {}
    for r in records:
        if r.get("record_type") == DISPATCH_LIFECYCLE:
            pid = r.get("pass_id")
            if pid and pid not in seen:
                seen[pid] = r
    return seen


def _pig_fb_state_dir():
    d = os.environ.get("FB_COLLECT_STATE_DIR")
    if d:
        return d
    return os.path.normpath(os.path.join(BASE_DIR, "..", "pig-fb"))


def _progress_evidence(pass_id, jobs_dir, progress_state, collected_results):
    """Check the collector's local sidecars for any evidence that pass_id's
    worker produced output. Returns (has_evidence, detail).

    Raises on any unreadable input: the caller must fail closed (skip the
    pass) rather than mark a dispatch whose evidence state is unknown.
    A collected result file or any recorded progress line counts as
    evidence, even if it carried no per-action observations."""
    try:
        names = os.listdir(jobs_dir)
    except OSError as e:
        raise ValueError("cannot list jobs dir %s: %s" % (jobs_dir, e))
    ts = None
    for name in names:
        if not (name.startswith("fb-") and name.endswith(".json")):
            continue
        path = os.path.join(jobs_dir, name)
        try:
            with open(path, "r", encoding="utf-8") as f:
                job = json.load(f)
        except Exception:
            continue
        if job.get("pass_id") == pass_id:
            ts = job.get("ts")
            break
    if not ts:
        raise ValueError("no job file for pass %s in %s" % (pass_id, jobs_dir))
    result_name = "job-%s.json.result.json" % ts
    progress_name = "job-%s.json.progress.jsonl" % ts
    try:
        with open(collected_results, "r", encoding="utf-8") as f:
            collected = {line.strip() for line in f if line.strip()}
    except OSError as e:
        raise ValueError("cannot read collected-results %s: %s"
                         % (collected_results, e))
    offsets = {}
    try:
        with open(progress_state, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        offsets[parts[0]] = int(parts[1])
                    except ValueError:
                        continue
    except OSError as e:
        raise ValueError("cannot read progress state %s: %s"
                         % (progress_state, e))
    has_result = result_name in collected
    prog_lines = offsets.get(progress_name, 0)
    detail = ("result_collected=%s progress_lines=%d"
              % (has_result, prog_lines))
    return (has_result or prog_lines > 0), detail


# ---------------------------------------------------------------- identity
_guard_mod = None


def guard_helpers():
    """Import engagement-guard.py's pure identity helpers (one
    implementation of normalization). Raises on any problem; callers fail
    closed."""
    global _guard_mod
    if _guard_mod is None:
        if not os.path.isfile(GUARD_PY):
            raise FileNotFoundError(
                "engagement-guard.py not found at %s" % GUARD_PY)
        spec = importlib.util.spec_from_file_location(
            "engagement_guard_intent_mod", GUARD_PY)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        for name in ("norm_ig_handle", "norm_fb_name", "FB_PERMALINK_RE",
                     "FB_POSTS_RE", "FB_FBID_RE", "FB_MEDIA_RE",
                     "FB_WATCH_RE", "FB_PFBID_RE", "IG_URL_RE",
                     "THREADS_POST_RE", "X_URL_RE", "TT_URL_RE"):
            if not hasattr(mod, name):
                raise AttributeError(
                    "engagement-guard.py no longer exposes %s" % name)
        _guard_mod = mod
    return _guard_mod


def _norm_account(g, platform, account):
    if platform in ("instagram", "threads", "x", "tiktok"):
        return g.norm_ig_handle(account or "")
    return g.norm_fb_name(account or "")


def _post_ids(g, platform, url):
    ids = set()
    if not url:
        return ids
    if platform == "facebook":
        # FB URL shapes live in engagement-guard.py (FB_URL_ID_RES); the
        # ledger mirrors the tuple via the imported regexes. 2026-09-29:
        # FB_PFBID_RE added for the pass-143 pfbid blind spot.
        for rx in (g.FB_PERMALINK_RE, g.FB_POSTS_RE, g.FB_FBID_RE,
                   g.FB_MEDIA_RE, g.FB_WATCH_RE, g.FB_PFBID_RE):
            for m in rx.finditer(url):
                ids.add("post:%s" % m.group(1))
    elif platform == "threads":
        for m in g.THREADS_POST_RE.finditer(url):
            ids.add("threads:%s" % m.group(2))
    elif platform == "x":
        for m in g.X_URL_RE.finditer(url):
            ids.add("x:%s" % m.group(2))
    elif platform == "tiktok":
        for m in g.TT_URL_RE.finditer(url):
            ids.add("tiktok:%s" % m.group(2))
    else:
        m = g.IG_URL_RE.search(url)
        if m:
            ids.add("ig:%s" % m.group(1))
    return ids


def _matches(g, intent, platform, account, action, url):
    """Does an unresolved intent cover this candidate? Same platform, and
    either the normalized (account, action) tuple matches (action=None on
    the candidate means any action), or a post id overlaps (fail closed at
    the post level regardless of action)."""
    if intent.get("platform") != platform:
        return False
    ia = _norm_account(g, platform, intent.get("account"))
    ca = _norm_account(g, platform, account)
    if ia and ca and ia == ca:
        if action is None or action == intent.get("action"):
            return True
    ip = _post_ids(g, platform, intent.get("url"))
    cp = _post_ids(g, platform, url)
    if ip and cp and (ip & cp):
        return True
    return False


# ---------------------------------------------------------------- candidates
def _load_candidates(args):
    try:
        with open(args.in_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        raise ValueError("cannot read candidates: %s" % e)
    if args.fb_job:
        actions = raw.get("actions", []) if isinstance(raw, dict) else []
        cands = [{"account": a.get("page") or a.get("account"),
                  "url": a.get("url"), "action": a.get("type"),
                  "_raw": a} for a in actions]
        return raw, cands
    items = raw if isinstance(raw, list) else raw.get("candidates", [])
    cands = [{"account": c.get("account") or c.get("handle"),
              "url": c.get("url") or c.get("post_url"),
              "action": c.get("action"), "_raw": c} for c in items]
    return raw, cands


# ---------------------------------------------------------------- commands
def cmd_write_intents(args):
    """Append one intent record per planned action. Must run BEFORE the
    browser worker is invoked. Idempotent per pass_id."""
    try:
        _raw, candidates = _load_candidates(args)
    except ValueError as e:
        fail(str(e))
        return 2
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    existing = set()
    for s in states.values():
        i = s["intent"]
        if i.get("pass_id") == args.pass_id and i.get("platform") == args.platform:
            existing.add((i.get("account"), i.get("action"), i.get("url")))
    written, skipped, ids = 0, 0, []
    for c in candidates:
        if not c["account"] and not c["url"]:
            fail("candidate missing both account and url; refusing to write intent")
            return 2
        if c["action"] not in ACTIONS:
            fail("candidate %s has unknown action %r (expected one of %s); "
                 "refusing to write intent"
                 % (c["account"] or c["url"], c["action"], ",".join(ACTIONS)))
            return 2
        key = (c["account"], c["action"], c["url"])
        if key in existing:
            skipped += 1
            continue
        iid = uuid.uuid4().hex
        _append({"record_type": "intent", "intent_id": iid, "ts": _utcnow(),
                 "platform": args.platform, "account": c["account"],
                 "action": c["action"], "url": c["url"],
                 "pass_id": args.pass_id, "stage": ACTION_INTENT_DURABLE})
        written += 1
        ids.append(iid)
        existing.add(key)
    print(json.dumps({"platform": args.platform, "pass_id": args.pass_id,
                      "written": written, "skipped_existing": skipped,
                      "intent_ids": ids}))
    return 0


def cmd_mark_execution(args):
    """Move this pass's ACTION_INTENT_DURABLE intents to EXECUTION. Run when
    the actions are handed to the worker, BEFORE delivery (scp / task
    start), so a crash in between still fails closed as UNKNOWN_EXECUTION.
    Idempotent."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    marked = 0
    for s in _open_intents(states, args.platform):
        i = s["intent"]
        if i.get("pass_id") == args.pass_id and s["stage"] == ACTION_INTENT_DURABLE:
            _append({"record_type": "execution", "intent_id": i["intent_id"],
                     "ts": _utcnow(), "stage": EXECUTION,
                     "pass_id": args.pass_id})
            marked += 1
    print(json.dumps({"platform": args.platform, "pass_id": args.pass_id,
                      "marked_execution": marked}))
    return 0


def cmd_refuse(args):
    """Pre-action filter: drop candidates covered by an UNKNOWN_EXECUTION
    intent from a dead pass. Reports them truthfully with the full state;
    never silently skips, never auto-retries."""
    try:
        g = guard_helpers()
    except Exception as e:
        fail("cannot load engagement-guard helpers, failing closed: %s" % e)
        return 3
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    try:
        raw, candidates = _load_candidates(args)
    except ValueError as e:
        fail(str(e))
        return 2
    live = {args.pass_id}
    unknown = [s for s in _open_intents(states, args.platform)
               if _is_unknown(s, live)]
    eligible, refused = [], []
    for c in candidates:
        hits = [s for s in unknown
                if _matches(g, s["intent"], args.platform,
                            c["account"], c["action"], c["url"])]
        if hits:
            h = hits[0]["intent"]
            refused.append({
                "account": c["account"], "action": c["action"],
                "url": c["url"], "decision": "BLOCKED",
                "state": UNKNOWN_EXECUTION,
                "stage": EXECUTION,
                "intent_id": h["intent_id"], "intent_ts": h["ts"],
                "intent_pass_id": h.get("pass_id"),
                "reason": ("UNKNOWN_EXECUTION: intent %s reached EXECUTION "
                           "in pass %s at %s with no OBSERVATION; the "
                           "external commitment may or may not have "
                           "happened. Will not auto-retry. Reconcile "
                           "deliberately before any re-execution."
                           % (h["intent_id"][:8], h.get("pass_id"),
                              h["ts"]))})
        else:
            eligible.append(c["_raw"])
    if args.fb_job:
        out = dict(raw) if isinstance(raw, dict) else {}
        out["actions"] = eligible
    else:
        out = {"candidates": eligible}
    out_dir = os.path.dirname(os.path.abspath(args.out_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(args.out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
        f.write("\n")
    print(json.dumps({"platform": args.platform, "pass_id": args.pass_id,
                      "checked": len(candidates),
                      "eligible": len(eligible), "refused": refused},
                     indent=1))
    return 0


def cmd_record_outcomes(args):
    """Append observation records from worker evidence. Anything left
    without an observation stays open: UNKNOWN_EXECUTION if it reached
    EXECUTION (fail closed), ACTION_INTENT_DURABLE if it never did."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    targets = [s for s in _open_intents(states)
               if s["intent"].get("pass_id") == args.pass_id
               and (not args.platform or
                    s["intent"].get("platform") == args.platform)]
    observed = 0
    if args.not_attempted:
        if not args.reason:
            fail("--reason is required with --not-attempted")
            return 2
        for s in targets:
            _append({"record_type": "observation",
                     "intent_id": s["intent"]["intent_id"], "ts": _utcnow(),
                     "stage": OBSERVATION, "terminal": NOT_ATTEMPTED,
                     "ok": False, "reason": args.reason,
                     "evidence": args.evidence or "operator assertion",
                     "pass_id": args.pass_id})
            observed += 1
    elif args.result_json:
        try:
            with open(args.result_json, "r", encoding="utf-8") as f:
                res = json.load(f)
        except Exception as e:
            fail("cannot read result json: %s" % e)
            return 2
        results = res.get("results") or []
        by_key = {(r.get("type"), r.get("url")): r for r in results
                  if r.get("type") != "abort"}
        aborted = any(r.get("type") == "abort" for r in results)
        note = res.get("note") or ""
        for s in targets:
            i = s["intent"]
            r = by_key.get((i.get("action"), i.get("url")))
            rec = {"record_type": "observation",
                   "intent_id": i["intent_id"], "ts": _utcnow(),
                   "stage": OBSERVATION, "pass_id": args.pass_id}
            if r is not None:
                rec.update({"terminal": EXECUTED if r.get("ok") else FAILED,
                            "ok": bool(r.get("ok")), "note": r.get("note"),
                            "evidence": "engage.js worker result"})
                observed += 1
            elif res.get("logged_in") is False:
                rec.update({"terminal": NOT_ATTEMPTED, "ok": False,
                            "reason": "worker verified logged-out session "
                                      "before acting; no action could have "
                                      "executed",
                            "evidence": "engage.js worker result"})
                observed += 1
            elif not results and "CDP attach failed" in note:
                rec.update({"terminal": NOT_ATTEMPTED, "ok": False,
                            "reason": "worker could not attach to the "
                                      "browser; never acted",
                            "evidence": "engage.js worker result"})
                observed += 1
            elif aborted:
                rec.update({"terminal": NOT_ATTEMPTED, "ok": False,
                            "reason": "worker aborted on checkpoint/block "
                                      "before reaching this action",
                            "evidence": "engage.js worker result"})
                observed += 1
            else:
                continue  # no evidence: stays open, fail closed
            _append(rec)
    elif args.outcomes_json:
        try:
            g = guard_helpers()
        except Exception as e:
            fail("cannot load engagement-guard helpers, failing closed: %s" % e)
            return 3
        try:
            with open(args.outcomes_json, "r", encoding="utf-8") as f:
                items = json.load(f)
        except Exception as e:
            fail("cannot read outcomes json: %s" % e)
            return 2
        items = items if isinstance(items, list) else items.get("outcomes", [])

        def tkey(s):
            i = s["intent"]
            return (_norm_account(g, i.get("platform"), i.get("account")),
                    i.get("url"), i.get("action"))

        tmap = {tkey(s): s for s in targets}
        for o in items:
            k = (_norm_account(g, args.platform, o.get("account")),
                 o.get("url"), o.get("action"))
            s = tmap.get(k)
            if s is None:
                fail("outcome matches no open intent of pass %s: %s"
                     % (args.pass_id, {kk: o.get(kk) for kk in
                                       ("account", "url", "action")}))
                return 2
            _append({"record_type": "observation",
                     "intent_id": s["intent"]["intent_id"], "ts": _utcnow(),
                     "stage": OBSERVATION,
                     "terminal": EXECUTED if o.get("ok") else FAILED,
                     "ok": bool(o.get("ok")), "note": o.get("note"),
                     "evidence": o.get("evidence") or "browser task report",
                     "pass_id": args.pass_id})
            observed += 1
    else:
        fail("one of --result-json, --outcomes-json, --not-attempted is required")
        return 2
    print(json.dumps({"pass_id": args.pass_id, "targets": len(targets),
                      "observed": observed,
                      "left_open": len(targets) - observed}))
    return 0


def cmd_finalize(args):
    """Move EXECUTED observations to FINALIZATION after their outcome is
    durably recorded in the engagement history (guard record)."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    targets = [s for s in states.values()
               if s["terminal"] == EXECUTED and s["finalize"] is None
               and s["reconciliation"] is None
               and s["intent"].get("pass_id") == args.pass_id]
    for s in targets:
        _append({"record_type": "finalize",
                 "intent_id": s["intent"]["intent_id"], "ts": _utcnow(),
                 "stage": FINALIZATION, "record_ref": args.record_ref})
    print(json.dumps({"pass_id": args.pass_id, "finalized": len(targets),
                      "record_ref": args.record_ref}))
    return 0


def cmd_list_unknown(args):
    """Reconciliation inbox: open intents with their evidence. Intents that
    reached EXECUTION in a dead pass are UNKNOWN_EXECUTION; intents that
    never reached EXECUTION are ACTION_INTENT_DURABLE (safe to re-attempt,
    no reconciliation required)."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    live = {args.exclude_pass_id} if args.exclude_pass_id else set()
    out = []
    for s in _open_intents(states, args.platform):
        i = s["intent"]
        state = (UNKNOWN_EXECUTION if _is_unknown(s, live)
                 else s["stage"])
        out.append({"intent_id": i["intent_id"], "state": state,
                    "stage": s["stage"], "platform": i.get("platform"),
                    "account": i.get("account"), "action": i.get("action"),
                    "url": i.get("url"), "pass_id": i.get("pass_id"),
                    "intent_ts": i.get("ts")})
    out.sort(key=lambda d: d["intent_ts"])
    print(json.dumps({"open": len(out), "intents": out}, indent=1))
    return 0


def cmd_reconcile(args):
    """Deliberate clearing of one open intent. Never called automatically
    by any script; always a human/agent act with stated provenance.
    Refuses intents that already have an observation, finalize, or
    reconciliation record."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    s = states.get(args.intent_id)
    if s is None:
        fail("unknown intent_id %s" % args.intent_id)
        return 2
    for field in ("reason", "evidence", "resolved_by"):
        if not getattr(args, field):
            fail("reconcile requires a non-empty --%s" % field.replace("_", "-"))
            return 2
    if s["observation"] or s["finalize"] or s["reconciliation"]:
        fail("intent %s already has terminal %s (provenance %s); "
             "reconciliation refuses to overwrite observed history"
             % (args.intent_id[:8], s["terminal"], s["provenance"]))
        return 2
    if args.outcome == EXECUTED and not args.history_recorded:
        fail("reconciling as EXECUTED requires --history-recorded: the "
             "action must already be durably recorded in the engagement "
             "history (guard record), or the next pass will re-engage it")
        return 2
    rec = {"record_type": "reconciliation", "intent_id": args.intent_id,
           "ts": _utcnow(), "outcome": args.outcome,
           "reason": args.reason, "evidence": args.evidence,
           "resolved_by": args.resolved_by,
           "history_recorded": bool(args.history_recorded)}
    _append(rec)
    print(json.dumps(rec, indent=1))
    return 0


def cmd_check(args):
    """Show derived stage/terminal for intents matching the given
    identity."""
    try:
        g = guard_helpers()
    except Exception as e:
        fail("cannot load engagement-guard helpers, failing closed: %s" % e)
        return 3
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    live = set()
    hits = []
    for s in states.values():
        i = s["intent"]
        if _matches(g, i, args.platform, args.account, args.action,
                    args.url):
            state = (UNKNOWN_EXECUTION if _is_unknown(s, live)
                       else s["terminal"] or s["stage"])
            hits.append({"intent_id": i["intent_id"], "state": state,
                         "stage": s["stage"], "terminal": s["terminal"],
                         "provenance": s["provenance"],
                         "account": i.get("account"),
                         "action": i.get("action"), "url": i.get("url"),
                         "pass_id": i.get("pass_id"), "intent_ts": i.get("ts")})
    hits.sort(key=lambda d: d["intent_ts"])
    print(json.dumps({"matches": len(hits), "intents": hits}, indent=1))
    return 0


def cmd_sweep_stale_dispatches(args):
    """GO item 2 (2026-09-25): move long-stale dispatches to
    RECONCILIATION_REQUIRED without touching intent outcomes.

    A dispatch qualifies iff ALL hold:
      - it has EXECUTION records older than --max-age-hours,
      - zero observation records carry its pass_id,
      - the collector sidecars show zero progress evidence (no collected
        result, no recorded progress lines),
      - no dispatch_lifecycle record exists for the pass yet.
    Appends exactly one dispatch_lifecycle record per qualifying pass.
    Idempotent: re-running skips passes that already have a lifecycle
    record. Fail closed: unreadable ledger (exit 3) or unverifiable
    evidence for a pass (skip that pass, never mark it).

    This never infers FAILED, never marks anything retryable, and never
    alters or discards intent/evidence records. Intents stay
    UNKNOWN_EXECUTION and stay refused until deliberate reconciliation."""
    try:
        records = _read_records()
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    lifecycles = _dispatch_lifecycles(records)
    states = _derive(records)

    dispatches = {}
    for r in records:
        if r.get("record_type") != "execution":
            continue
        pid = r.get("pass_id")
        if not pid:
            continue
        d = dispatches.get(pid)
        ts = r.get("ts")
        if d is None:
            dispatches[pid] = {"first_ts": ts, "platform": None}
        elif ts and (not d["first_ts"] or ts < d["first_ts"]):
            d["first_ts"] = ts
    for r in records:
        if r.get("record_type") != "intent":
            continue
        pid = r.get("pass_id")
        if pid in dispatches and dispatches[pid]["platform"] is None:
            dispatches[pid]["platform"] = r.get("platform")

    obs_counts = Counter()
    for r in records:
        if r.get("record_type") == "observation" and r.get("pass_id"):
            obs_counts[r["pass_id"]] += 1

    per_pass_open = Counter()
    per_pass_unknown = Counter()
    for s in states.values():
        i = s["intent"]
        pid = i.get("pass_id")
        if not pid:
            continue
        if (s["observation"] is None and s["finalize"] is None
                and s["reconciliation"] is None):
            per_pass_open[pid] += 1
            if s["stage"] == EXECUTION:
                per_pass_unknown[pid] += 1

    now = datetime.now(timezone.utc)
    marked, skipped = [], []
    for pid in sorted(dispatches,
                      key=lambda p: dispatches[p]["first_ts"] or ""):
        d = dispatches[pid]
        if args.platform and d["platform"] != args.platform:
            continue
        if pid in lifecycles:
            skipped.append({"pass_id": pid,
                            "reason": "dispatch_lifecycle already recorded"})
            continue
        if obs_counts.get(pid, 0) > 0:
            skipped.append({"pass_id": pid,
                            "reason": "has observation records"})
            continue
        try:
            first = datetime.fromisoformat(d["first_ts"])
        except Exception:
            skipped.append({"pass_id": pid,
                            "reason": "unparseable dispatch ts, fail closed"})
            continue
        if first.tzinfo is None:
            first = first.replace(tzinfo=timezone.utc)
        age_h = (now - first).total_seconds() / 3600.0
        if age_h < args.max_age_hours:
            skipped.append({"pass_id": pid,
                            "reason": "age %.1fh < threshold %.1fh"
                                      % (age_h, args.max_age_hours)})
            continue
        try:
            has_ev, detail = _progress_evidence(
                pid, args.jobs_dir, args.progress_state,
                args.collected_results)
        except Exception as e:
            skipped.append({"pass_id": pid,
                            "reason": "progress evidence unverifiable, "
                                      "fail closed: %s" % e})
            continue
        if has_ev:
            skipped.append({"pass_id": pid,
                            "reason": "progress evidence present: %s" % detail})
            continue
        rec = {
            "record_type": DISPATCH_LIFECYCLE,
            "pass_id": pid,
            "platform": d["platform"] or args.platform,
            "lifecycle": RECONCILIATION_REQUIRED,
            "ts": _utcnow(),
            "reason": ("dispatch stale with zero evidence: EXECUTION "
                       "records %.1f h old, 0 observation records, "
                       "0 progress lines, no collected result; worker "
                       "produced nothing" % age_h),
            "evidence": {
                "dispatch_ts": d["first_ts"],
                "age_hours": round(age_h, 2),
                "observation_records": 0,
                "progress_lines": 0,
                "result_collected": False,
                "open_intents": per_pass_open.get(pid, 0),
                "unknown_execution_intents": per_pass_unknown.get(pid, 0),
            },
            "policy": ("GO item 2 2026-09-25: dispatch lifecycle only; "
                       "intent execution outcomes stay UNKNOWN; never "
                       "infer FAILED; never retry; deliberate "
                       "reconciliation only"),
        }
        if not args.dry_run:
            _append(rec)
        marked.append({"pass_id": pid, "age_hours": round(age_h, 2),
                       "open_intents": per_pass_open.get(pid, 0),
                       "dry_run": bool(args.dry_run)})
    print(json.dumps({"marked": marked, "skipped": skipped,
                      "dry_run": bool(args.dry_run)}, indent=1))
    return 0


def _require_executed(states, intent_id):
    """Return the intent state iff it exists with terminal EXECUTED.
    VERIFIED EFFECT and OUTCOME are meaningful only for actions the worker
    reports as executed. Anything else fails closed."""
    s = states.get(intent_id)
    if s is None:
        return None, "unknown intent_id %s" % intent_id
    if s.get("terminal") != EXECUTED:
        return None, ("intent %s terminal is %s, not EXECUTED: "
                      "effect/outcome records require EXECUTED"
                      % (intent_id, s.get("terminal")))
    return s, None


def cmd_verify_effect(args):
    """Append an effect_verification record: an INDEPENDENT observation that
    the attempted effect materialized (or did not) in the world.

    Independence rule: the observer channel must be declared and must differ
    from the worker evidence that produced the RESULT. A worker may not
    verify its own effect: self-verification fails closed. Verdicts are
    EFFECT_CONFIRMED / EFFECT_ABSENT / INCONCLUSIVE."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    s, err = _require_executed(states, args.intent_id)
    if err:
        fail(err)
        return 2
    worker_evidence = (s.get("observation") or {}).get("evidence") or ""
    if args.observer.strip() == worker_evidence.strip():
        fail("observer channel %r matches the worker evidence that produced "
             "the RESULT: independent observation required, self-verification "
             "refused" % args.observer)
        return 2
    if not args.evidence_ref:
        fail("--evidence-ref is required")
        return 2
    if not args.effect_summary:
        fail("--effect-summary is required (paraphrase; never paste verbatim "
             "third-party content into the ledger)")
        return 2
    rec = {"record_type": EFFECT_VERIFICATION,
           "intent_id": args.intent_id, "ts": _utcnow(),
           "stage": VERIFICATION,
           "observer": args.observer,
           "verdict": args.verdict,
           "evidence_ref": args.evidence_ref,
           "effect_summary": args.effect_summary,
           "observed_at": args.observed_at or _utcnow(),
           "pass_id": s["intent"].get("pass_id")}
    if args.note:
        rec["note"] = args.note
    _append(rec)
    print(json.dumps({"verified": True, "intent_id": args.intent_id,
                      "verdict": args.verdict}, indent=1))
    return 0


def cmd_record_outcome(args):
    """Append an outcome record: a measured business consequence of one
    EXECUTED action. Each record is one observation with evidence, not a
    final verdict; the observation window stays open. RESULT is not EFFECT;
    EFFECT is not SUCCESS; SUCCESS is not BENEFICIAL OUTCOME. NO_SIGNAL is
    an honest observation."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    s, err = _require_executed(states, args.intent_id)
    if err:
        fail(err)
        return 2
    if not args.evidence:
        fail("--evidence is required: an outcome without evidence is an "
             "assertion, not an observation")
        return 2
    rec = {"record_type": OUTCOME_RECORD,
           "intent_id": args.intent_id, "ts": _utcnow(),
           "stage": OUTCOME,
           "outcome_class": args.outcome_class,
           "evidence": args.evidence,
           "observed_at": args.observed_at or _utcnow(),
           "pass_id": s["intent"].get("pass_id")}
    if args.note:
        rec["note"] = args.note
    _append(rec)
    print(json.dumps({"recorded": True, "intent_id": args.intent_id,
                      "outcome_class": args.outcome_class}, indent=1))
    return 0


def cmd_propose_learning(args):
    """Append a candidate_learning record under the learning law. Status is
    always CANDIDATE. There is deliberately no promote/apply path: the
    ledger records observations; it never rewrites policy. Promotion
    requires explicit owner (Nolan) authority via a separate, deliberate
    decision. A model never promotes its own inference into authority."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    if args.intent_id not in states:
        fail("unknown intent_id %s" % args.intent_id)
        return 2
    try:
        n = int(args.sample_support)
    except (TypeError, ValueError):
        fail("--sample-support must be an integer")
        return 2
    if n < 1:
        fail("--sample-support must be >= 1: a learning with no sample "
             "support is not a candidate")
        return 2
    rec = {"record_type": CANDIDATE_LEARNING,
           "intent_id": args.intent_id, "ts": _utcnow(),
           "stage": LEARNING,
           "status": LEARNING_CANDIDATE,
           "hypothesis": args.hypothesis,
           "sample_support": n,
           "evidence_refs": args.evidence_refs or "",
           "promotion": ("REQUIRES owner authority (Nolan), explicit "
                         "decision; no automatic promotion path exists")}
    _append(rec)
    print(json.dumps({"proposed": True, "intent_id": args.intent_id,
                      "status": LEARNING_CANDIDATE}, indent=1))
    return 0


def cmd_trace(args):
    """Print one action's full chain, hard distinctions intact:
    INTENT -> AUTHORIZATION -> ATTEMPT -> RESULT -> VERIFIED EFFECT ->
    OUTCOME -> CANDIDATE LEARNING.

    AUTHORIZATION is pipeline-attested, not per-action-receipted: the
    engagement pipeline runs engagement-guard.py cmd_filter + refuse BEFORE
    write-intents, so every intent in this ledger passed authorization.
    The trace says so explicitly rather than inventing a receipt."""
    try:
        states = _derive(_read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    s = states.get(args.intent_id)
    if s is None:
        fail("unknown intent_id %s" % args.intent_id)
        return 2
    intent = s["intent"]
    chain = {
        "intent_id": args.intent_id,
        "INTENT": {"stage": "INTENT (plan)",
                   "record": intent},
        "AUTHORIZATION": {
            "stage": "AUTHORIZATION (allowed)",
            "decision": "allowed",
            "mechanism": ("engagement-guard.py cmd_filter + refuse, "
                          "run pre-dispatch in the pass pipeline; "
                          "write-intents only sees guard-passed jobs"),
            "evidence": ("intent recorded post-filter in pass %s; dispatch "
                         "to worker recorded (execution record present: %s)"
                         % (intent.get("pass_id"),
                            s["execution"] is not None)),
            "per_action_receipt": ("absent: pipeline-attested, not "
                                   "per-action-receipted"),
        },
        "ATTEMPT": {"stage": "ATTEMPT (handed to worker)",
                    "record": s["execution"]},
        "RESULT": {"stage": "RESULT (worker's claim, not effect)",
                   "record": s["observation"],
                   "distinction": ("RESULT is not EFFECT: ok=true is the "
                                   "worker's claim about what it did, not an "
                                   "independent observation of the world")},
        "VERIFIED_EFFECT": {"stage": "VERIFIED EFFECT (independent observation)",
                            "records": s["verifications"],
                            "distinction": ("EFFECT is not SUCCESS: a "
                                            "confirmed effect can still "
                                            "produce no benefit; the observer "
                                            "channel must differ from the "
                                            "worker's evidence")},
        "OUTCOME": {"stage": "OUTCOME (measured consequence)",
                    "records": s["outcomes"],
                    "distinction": ("SUCCESS is not BENEFICIAL OUTCOME: a "
                                    "posted comment (success) that draws no "
                                    "reply is NO_SIGNAL, recorded honestly")},
        "CANDIDATE_LEARNING": {"stage": "CANDIDATE LEARNING (never auto-promoted)",
                               "records": s["learnings"],
                               "distinction": ("ledger records observations; "
                                               "promotion requires owner "
                                               "authority")},
    }
    print(json.dumps(chain, indent=1, sort_keys=True))
    return 0


def main():
    p = argparse.ArgumentParser(description="append-only action-intent ledger")
    sub = p.add_subparsers(dest="cmd", required=True)

    w = sub.add_parser("write-intents")
    w.add_argument("--platform", required=True,
                   choices=["instagram", "facebook", "threads", "x", "tiktok"])
    w.add_argument("--in", dest="in_path", required=True)
    w.add_argument("--pass-id", required=True)
    w.add_argument("--fb-job", action="store_true")
    w.set_defaults(fn=cmd_write_intents)

    m = sub.add_parser("mark-execution")
    m.add_argument("--platform", required=True,
                   choices=["instagram", "facebook", "threads", "x", "tiktok"])
    m.add_argument("--pass-id", required=True)
    m.set_defaults(fn=cmd_mark_execution)

    r = sub.add_parser("refuse")
    r.add_argument("--platform", required=True,
                   choices=["instagram", "facebook", "threads", "x", "tiktok"])
    r.add_argument("--in", dest="in_path", required=True)
    r.add_argument("--out", dest="out_path", required=True)
    r.add_argument("--pass-id", required=True)
    r.add_argument("--fb-job", action="store_true")
    r.set_defaults(fn=cmd_refuse)

    o = sub.add_parser("record-outcomes")
    o.add_argument("--platform", required=False,
                   choices=["instagram", "facebook", "threads", "x", "tiktok"], default=None)
    o.add_argument("--pass-id", required=True)
    o.add_argument("--result-json", default=None)
    o.add_argument("--outcomes-json", default=None)
    o.add_argument("--not-attempted", action="store_true")
    o.add_argument("--reason", default=None)
    o.add_argument("--evidence", default=None)
    o.set_defaults(fn=cmd_record_outcomes)

    f = sub.add_parser("finalize")
    f.add_argument("--pass-id", required=True)
    f.add_argument("--record-ref", required=True)
    f.set_defaults(fn=cmd_finalize)

    l = sub.add_parser("list-unknown")
    l.add_argument("--platform", required=False,
                   choices=["instagram", "facebook", "threads", "x", "tiktok"], default=None)
    l.add_argument("--exclude-pass-id", default=None)
    l.set_defaults(fn=cmd_list_unknown)

    c = sub.add_parser("reconcile")
    c.add_argument("--intent-id", required=True)
    c.add_argument("--outcome", required=True,
                   choices=[EXECUTED, NOT_ATTEMPTED])
    c.add_argument("--reason", required=True)
    c.add_argument("--evidence", required=True)
    c.add_argument("--resolved-by", required=True)
    c.add_argument("--history-recorded", action="store_true")
    c.set_defaults(fn=cmd_reconcile)

    k = sub.add_parser("check")
    k.add_argument("--platform", required=True,
                   choices=["instagram", "facebook", "threads", "x", "tiktok"])
    k.add_argument("--account", required=True)
    k.add_argument("--action", default=None, choices=ACTIONS)
    k.add_argument("--url", default=None)
    k.set_defaults(fn=cmd_check)

    s = sub.add_parser("sweep-stale-dispatches")
    s.add_argument("--platform", required=False, default=None,
                   choices=["instagram", "facebook", "threads", "x", "tiktok"])
    s.add_argument("--max-age-hours", type=float, default=8.0)
    s.add_argument("--dry-run", action="store_true")
    s.add_argument("--jobs-dir", default=None)
    s.add_argument("--progress-state", default=None)
    s.add_argument("--collected-results", default=None)
    s.set_defaults(fn=cmd_sweep_stale_dispatches)

    v = sub.add_parser("verify-effect")
    v.add_argument("--intent-id", required=True)
    v.add_argument("--observer", required=True,
                   help="independent observation channel; must differ from "
                        "the worker evidence that produced the RESULT")
    v.add_argument("--verdict", required=True, choices=VERDICTS)
    v.add_argument("--evidence-ref", required=True,
                   help="URL or durable ref backing the verification")
    v.add_argument("--effect-summary", required=True,
                   help="paraphrase of what was observed; never paste "
                        "verbatim third-party content")
    v.add_argument("--observed-at", default=None)
    v.add_argument("--note", default=None)
    v.set_defaults(fn=cmd_verify_effect)

    oc = sub.add_parser("record-outcome")
    oc.add_argument("--intent-id", required=True)
    oc.add_argument("--outcome-class", required=True, choices=OUTCOME_CLASSES)
    oc.add_argument("--evidence", required=True,
                    help="evidence backing the outcome observation")
    oc.add_argument("--observed-at", default=None)
    oc.add_argument("--note", default=None)
    oc.set_defaults(fn=cmd_record_outcome)

    pl = sub.add_parser("propose-learning")
    pl.add_argument("--intent-id", required=True)
    pl.add_argument("--hypothesis", required=True)
    pl.add_argument("--sample-support", required=True,
                    help="integer >= 1: observations backing the candidate")
    pl.add_argument("--evidence-refs", default="")
    pl.set_defaults(fn=cmd_propose_learning)

    t = sub.add_parser("trace")
    t.add_argument("--intent-id", required=True)
    t.set_defaults(fn=cmd_trace)

    args = p.parse_args()
    if args.cmd == "sweep-stale-dispatches":
        state_dir = _pig_fb_state_dir()
        if args.jobs_dir is None:
            args.jobs_dir = os.environ.get(
                "FB_JOBS_DIR", os.path.join(state_dir, "jobs"))
        if args.progress_state is None:
            args.progress_state = os.path.join(state_dir,
                                               ".collected-progress")
        if args.collected_results is None:
            args.collected_results = os.path.join(state_dir,
                                                  ".collected-results")
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
