#!/usr/bin/env python3
"""
reconcile.py: EXPECTED vs ACTUAL reconciliation for the PING pipeline.

Reads ONLY existing machinery (run ledger, provenance sidecars, ingest log,
sweep summaries, ping_events table). Creates no database, no authority, no
event store. Produces a durable gap report; the absence of an expected
transition becomes detectable evidence.

Typed state vocabulary (canonical for gap records):
  NOT_REQUIRED  step correctly not applicable (e.g. distill rule predates sweep)
  NOT_RUN       step never attempted, no record of attempt
  SKIPPED       deliberate skip with recorded reason
  FAILED        attempted, terminal failure, will not retry on its own
  BLOCKED       cannot proceed until an external condition clears
  NO_VALUE      ran correctly but produced nothing (e.g. boundary-rule skip)
  DEGRADED      partial function, core promise not kept
  UNCHECKED     could not verify (infra unreachable); NOT the same as clean
  GAP           expected transition has no corresponding actual transition

Exit codes: 0 = no actionable gaps, 2 = actionable gaps found, 3 = checks could not run.

Gap lifecycle (2026-09-21, closure-aware): each detected gap carries a
lifecycle state OPEN / KNOWN_PERMANENT / RESOLVED / REOPENED, tracked in
tandem/reconciliation/gap-lifecycle.json with timestamped transitions citing
evidence. A gap becomes KNOWN_PERMANENT only with a valid closure
disposition (*-closure-*.md: rule scope + closure authority + CLOSED status +
cited identifiers) AND independently verifiable ingestion evidence (artifact
on disk or ingested.log reference). KNOWN_PERMANENT gaps stay auditable but
leave the actionable gap_count. See the lifecycle block in this file.

Usage: python3 reconcile.py [--json-only] [--out-dir DIR]
"""

import json, glob, os, re, sys, subprocess, base64, hashlib
from datetime import datetime, timezone, timedelta

HOME = os.path.expanduser("~")
INTEL = os.path.join(HOME, "workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel")
OUT_DIR = os.path.join(HOME, "workspace/tandem/reconciliation")
TERMINAL_DECISION_AGE_H = 12   # answer_captured older than this must have a terminal distill decision
STALE_INFLIGHT_H = 6           # started/requested older than this with no completion is stale
DISTILL_RULE_CUTOFF = datetime(2026, 9, 14, 16, 0, tzinfo=timezone.utc)  # PING-DISTILL line requirement

NOW = datetime.now(timezone.utc)

def parse_ts(s):
    if not s: return None
    try:
        # handles 2026-09-13T22:57:54Z and 2026-09-14T08:12:00-06:00; naive assumed UTC
        t = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return t if t.tzinfo else t.replace(tzinfo=timezone.utc)
    except Exception:
        return None

def age_h(ts):
    t = parse_ts(ts)
    return (NOW - t).total_seconds() / 3600 if t else None

def load_runs():
    runs = []
    p = os.path.join(INTEL, "runs.jsonl")
    if not os.path.exists(p): return runs
    with open(p) as f:
        for line in f:
            line = line.strip()
            if line:
                try: runs.append(json.loads(line))
                except Exception: pass
    return runs

def load_sidecars():
    out = {}
    for f in glob.glob(os.path.join(INTEL, "*.provenance.json")):
        try:
            d = json.load(open(f))
            out[os.path.basename(f)] = d
        except Exception:
            out[os.path.basename(f)] = {"_unreadable": True, "_path": f}
    return out

def pg_event_ids(event_ids):
    """Best-effort check that accepted event_ids exist in ping_events.
    Returns (found:set, unchecked:bool, reason:str).
    Uses the file-based Pig probe pattern (write .ps1, scp, execute).

    Queries the gateway-connected Postgres by running node INSIDE the
    ping-gateway container with its own POSTGRES_* env, the same endpoint
    the gateway itself writes to. (2026-09-18 fix: the old probe read
    credentials from ping-gateway but ran psql inside ping-postgres against
    localhost, a different store with different roles; the inner psql died
    with FATAL role "postgres" does not exist, the wrapper swallowed the
    failure, and every ID was misreported as absent.) Any probe failure
    returns unchecked=True, never an empty found set.
    (2026-09-25 fix: the pg module path is probed at runtime
    (/app/gateway/node_modules/pg first, /app/node_modules/pg fallback)
    because the rebuilt ping-gateway container moved the app to /app/gateway;
    same pattern as emit-observation.py.)
    """
    if not event_ids:
        return set(), False, ""
    safe = [e for e in event_ids if re.fullmatch(r"[0-9a-f]{64}", e)]
    if not safe:
        return set(), True, "no well-formed event_ids to check"
    node_js = (
        "const {Client}=((()=>{let _m;try{_m=require('/app/gateway/node_modules/pg');}catch(_e){_m=require('/app/node_modules/pg');}return _m;})());\n"
        "(async()=>{\n"
        " const c=new Client({host:process.env.POSTGRES_HOST,"
        "port:parseInt(process.env.POSTGRES_PORT||'5432',10),"
        "user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,"
        "database:process.env.POSTGRES_DB,connectionTimeoutMillis:8000});\n"
        " try{await c.connect();}catch(e){console.log('PROBE_ERROR connect:'+e.message);process.exit(2);}\n"
        " const ids=process.argv.slice(2);\n"
        " try{\n"
        "  const r=await c.query('SELECT event_id FROM ping_events WHERE event_id = ANY($1)',[ids]);\n"
        "  r.rows.forEach(function(x){console.log('FOUND:'+x.event_id);});\n"
        " }catch(e){console.log('PROBE_ERROR query:'+e.message);process.exit(2);}\n"
        " await c.end();\n"
        "})();\n"
    )
    b64 = base64.b64encode(node_js.encode()).decode()
    ps1 = (
        "$b64 = \"" + b64 + "\"\n"
        "$tmp = \"$env:TEMP\\reconcile-pg-probe.js\"\n"
        "[IO.File]::WriteAllBytes($tmp, [Convert]::FromBase64String($b64))\n"
        "docker cp $tmp ping-gateway:/tmp/reconcile-pg-probe.js\n"
        "if ($LASTEXITCODE -ne 0) { Write-Output 'PROBE_ERROR dockercp failed'; exit 2 }\n"
        "$idArgs = \"" + " ".join(safe) + "\"\n"
        "$out = docker exec ping-gateway node /tmp/reconcile-pg-probe.js $idArgs.Split(' ')\n"
        "$ec = $LASTEXITCODE\n"
        "Write-Output ($out -join \"`n\")\n"
        "exit $ec\n"
    )
    local = "/tmp/reconcile-pg-probe.ps1"
    try:
        with open(local, "w") as f: f.write(ps1)
        cp = subprocess.run(
            ["bash", "-lc",
             "source ~/workspace/pig-fb/pig-ssh.sh && "
             "pig_scp %s \"muse-ssh@100.79.154.43:C:/Users/nolan/.local/share/pigi/reconcile-pg-probe.ps1\"" % local],
            capture_output=True, text=True, timeout=60)
        if cp.returncode != 0:
            return set(), True, "scp to Pig failed"
        r = subprocess.run(
            ["bash", "-lc",
             "source ~/workspace/pig-fb/pig-ssh.sh && "
             "PIG_TIMEOUT=60 pig_ssh \"powershell -NoProfile -ExecutionPolicy Bypass -File "
             "C:/Users/nolan/.local/share/pigi/reconcile-pg-probe.ps1\""],
            capture_output=True, text=True, timeout=120)
        out = r.stdout or ""
        m = re.search(r"PROBE_ERROR[^\r\n]*", out)
        if m or r.returncode != 0:
            reason = m.group(0) if m else ("pig probe rc=%d" % r.returncode)
            return set(), True, "event-store probe failed: %s" % reason[:160]
        found = set(x[6:] for x in out.split() if x.startswith("FOUND:")
                    and re.fullmatch(r"[0-9a-f]{64}", x[6:]))
        return found, False, ""
    except Exception as e:
        return set(), True, "probe exception: %s" % str(e)[:120]

# ---------------------------------------------------------------------------
# Closure-aware gap lifecycle (2026-09-21).
#
# Problem: the reconciler never consumed closure dispositions or ingested.log,
# so disposition-closed gaps (e.g. the R2 DISTILL and R3 EMIT items closed by
# Nolan directive on 2026-09-20) recurred identically in every report and were
# counted as actionable drift. The reconciler was measuring its own failure to
# consume disposition state, not system drift.
#
# Gap lifecycle states (distinct from the typed detection vocabulary
# NOT_RUN/GAP/FAILED/... which describes what a single run observed):
#   OPEN            detected, actionable
#   KNOWN_PERMANENT disposition-closed with a VALID closure disposition AND
#                   independently verifiable ingestion evidence; remains
#                   queryable/auditable but is not actionable and does not
#                   retrigger identical alerts
#   RESOLVED        closed by actual remediation (condition no longer detected)
#   REOPENED        was closed but a reopen condition fired; actionable again
#
# OPEN -> KNOWN_PERMANENT requires BOTH:
#   1. a valid closure disposition covering the gap's rule + identifiers, and
#   2. the required ingestion evidence still exists (artifact on disk or an
#      ingested.log reference). A disposition that merely claims closure
#      without surviving evidence does NOT suppress. Nothing is hardcoded:
#      any gap with valid disposition + evidence qualifies.
# REOPEN when: the disposition is removed or invalidated, it no longer cites
#   the gap's identifiers, the evidence disappeared, the evidence changed
#   since closure, the gap's signature changed, or a RESOLVED gap recurs.
# Nothing is ever deleted: every transition is a timestamped record citing
# evidence, in gap-lifecycle.json (atomic write, same pattern as LATEST.json).
# ---------------------------------------------------------------------------

LIFECYCLE_STORE = os.path.join(OUT_DIR, "gap-lifecycle.json")
DISPOSITION_GLOB = "*-closure-*.md"

LC_OPEN = "OPEN"
LC_KNOWN_PERMANENT = "KNOWN_PERMANENT"
LC_RESOLVED = "RESOLVED"
LC_REOPENED = "REOPENED"
LC_ACTIONABLE = (LC_OPEN, LC_REOPENED)


def _sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_dispositions(out_dir):
    """Parse closure disposition records generically (no hardcoded gaps).

    A valid disposition file matches *-closure-*.md and must contain:
      - a rule-scope heading (e.g. '# R2 Closure Record')
      - explicit closure authority (e.g. 'Nolan directive' / 'Closure Authority')
      - an explicit CLOSED status
      - at least one cited identifier (provenance filename or 64-hex event_id)
    Returns a list of dicts; files failing validity come back valid=False so
    callers can distinguish 'no disposition' from 'invalid disposition'.
    """
    disps = []
    for path in sorted(glob.glob(os.path.join(out_dir, DISPOSITION_GLOB))):
        try:
            text = open(path).read()
        except Exception:
            continue
        d = {"path": path, "valid": False, "rule": None, "items": set(),
             "event_sources": {}, "authority": "", "closed": False,
             "tokens": set(), "closed_date": None}
        m = re.search(r"(?im)^#+\s*(R\d+)\b.*$", text)
        if m:
            d["rule"] = m.group(1)
        auth = re.search(r"(?im)^(nolan directive|closure authority)\b[^\n]*", text)
        if auth:
            d["authority"] = auth.group(0).strip()[:200]
        if re.search(r"(?im)^.*\bCLOSED\b", text):
            d["closed"] = True
        d["items"] |= set(re.findall(r"[A-Za-z0-9][\w.\-]*\.provenance\.json", text))
        d["items"] |= set(re.findall(r"\b[0-9a-f]{64}\b", text))
        # event_id -> cited source sidecar ("Source: `x.provenance.json`")
        for em in re.finditer(
                r"\b([0-9a-f]{64})\b[\s\S]{0,400}?Source:\s*`([A-Za-z0-9][\w.\-]*\.provenance\.json)`",
                text):
            d["event_sources"][em.group(1)] = em.group(2)
        d["tokens"] = set(re.findall(r"[A-Za-z0-9][\w.\-]*", text))
        mc = re.search(r"closure-(\d{8})", os.path.basename(path))
        d["closed_date"] = mc.group(1) if mc else None
        d["valid"] = bool(d["rule"] and d["authority"] and d["closed"] and d["items"])
        disps.append(d)
    return disps


def gap_key(g):
    """Stable identity for a gap across runs (no volatile fields like age)."""
    parts = [str(g.get("rule", "")), str(g.get("step", "")),
             str(g.get("run_id", "")), str(g.get("input", ""))]
    return "|".join(p for p in parts if p)


def match_disposition(gap, disps):
    """Return (disp, matched_identifiers) for the first VALID disposition
    covering this gap's rule and at least one of its identifiers. Generic:
    any cited identifier (provenance filename, event_id, or full token)
    qualifies; no hardcoded gap list."""
    idents = set()
    for field in (gap.get("input"), gap.get("run_id")):
        if field:
            idents.add(str(field))
            idents.add(os.path.basename(str(field)))
    for d in disps:
        if not d["valid"] or d["rule"] != gap.get("rule"):
            continue
        matched = set(idents) & d["items"]
        if not matched:
            for ident in idents:
                if ident in d["tokens"]:
                    matched.add(ident)
        if matched:
            return d, matched
    return None, set()


def evidence_for_gap(gap, disp, matched, intel_dir, ingested_log_path):
    """Independently verify the required ingestion evidence still exists.

    A disposition's claim alone is not enough: at least one cited artifact
    must exist on disk (provenance sidecar in the intel dir) or be referenced
    in ingested.log. Returns (ok, artifacts) with artifacts mapping each
    evidence path to its sha256 (used later for change detection).
    """
    artifacts = {}
    log_text = ""
    try:
        with open(ingested_log_path) as f:
            log_text = f.read()
    except Exception:
        pass
    for ident in matched:
        cands = []
        if ident.endswith(".provenance.json"):
            cands.append(os.path.join(intel_dir, ident))
        elif re.fullmatch(r"[0-9a-f]{64}", ident):
            src = disp["event_sources"].get(ident)
            if src:
                cands.append(os.path.join(intel_dir, src))
            # any sidecar the disposition cites as preserved source evidence
            for s in disp["items"]:
                if s.endswith(".provenance.json"):
                    cands.append(os.path.join(intel_dir, s))
        for c in cands:
            if os.path.isfile(c):
                try:
                    artifacts[c] = _sha256_file(c)
                except Exception:
                    pass
        if ident in log_text:
            artifacts.setdefault("ingested.log:%s" % ident, "logref")
    return (bool(artifacts), artifacts)


def normalize_reason(reason):
    # the R2 reason embeds the current age ("for 312.4h"); strip it so the
    # signature is stable across runs for the same underlying condition.
    return re.sub(r"\sfor\s[\d.]+\s*h\b", " for <age>h", str(reason or ""))


def gap_signature(gap):
    return "|".join([str(gap.get("rule", "")), str(gap.get("step", "")),
                     str(gap.get("state", "")), normalize_reason(gap.get("reason"))])


def load_lifecycle(path):
    try:
        d = json.load(open(path))
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def save_lifecycle(path, data):
    # atomic write, same crash-consistency pattern as LATEST.json
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def run_lifecycle(detected, disps, store, intel_dir, ingested_log_path,
                  rule_health, now_iso):
    """Apply closure-aware lifecycle transitions.

    detected: gaps from this run. store: prior records keyed by gap_key.
    rule_health: {rule: bool} whether the rule's check ran healthy this run;
      an UNCHECKED probe must neither suppress nor resolve anything (absence
      of evidence is not evidence of absence).
    Returns events = {"suppressed": [...], "resolved": [...], "reopened": [...]}
    for the report. Each gap dict is annotated with its lifecycle state.
    """
    events = {"suppressed": [], "resolved": [], "reopened": []}
    seen = set()

    def transition(rec, to, reason, extra=None):
        frm = rec["state"]
        rec["state"] = to
        t = {"ts": now_iso, "from": frm, "to": to, "reason": reason}
        if extra:
            t.update(extra)
        rec.setdefault("transitions", []).append(t)
        return frm != to

    for g in detected:
        key = gap_key(g)
        seen.add(key)
        rec = store.get(key)
        just_reopened = False
        if rec is None:
            rec = {"key": key, "rule": g.get("rule"), "state": LC_OPEN,
                   "first_seen": now_iso, "last_seen": now_iso,
                   "transitions": [{"ts": now_iso, "from": "-",
                                    "to": LC_OPEN,
                                    "reason": "first detected by reconciler"}]}
            store[key] = rec
        else:
            rec["last_seen"] = now_iso
            if rec["state"] == LC_RESOLVED:
                # A recurrence after remediation is new information: it stays
                # actionable (REOPENED) for this run so the regression is
                # visible. Re-suppression may apply on the next run if the
                # disposition still covers it.
                transition(rec, LC_REOPENED, "gap recurred after RESOLVED",
                           {"detected_state": g.get("state")})
                events["reopened"].append({"key": key,
                                          "reason": "recurred after RESOLVED"})
                just_reopened = True
        disp, matched = match_disposition(g, disps)
        ok, artifacts = (False, {})
        if disp:
            ok, artifacts = evidence_for_gap(g, disp, matched, intel_dir,
                                             ingested_log_path)
        if not just_reopened and rec["state"] in (LC_OPEN, LC_REOPENED):
            if disp and ok and rule_health.get(g.get("rule"), True):
                sig = gap_signature(g)
                transition(rec, LC_KNOWN_PERMANENT,
                           "valid closure disposition + ingestion evidence",
                           {"disposition": disp["path"],
                            "disposition_authority": disp["authority"],
                            "matched_identifiers": sorted(matched),
                            "evidence": artifacts,
                            "signature": sig})
                # persisted on the RECORD (not just the transition) so the
                # reopen checks can compare against the closure-time baseline
                rec["disposition"] = disp["path"]
                rec["evidence"] = artifacts
                rec["signature"] = sig
                events["suppressed"].append({"key": key,
                                             "disposition": disp["path"]})
        elif rec["state"] == LC_KNOWN_PERMANENT:
            problems = []
            if not disp:
                problems.append("no valid closure disposition covers this gap anymore")
            elif not ok:
                problems.append("closure evidence disappeared or invalidated")
            else:
                prev = rec.get("evidence", {})
                for p, h in artifacts.items():
                    if p in prev and prev[p] != h and h != "logref":
                        problems.append("source changed after closure: %s" % p)
                if gap_signature(g) != rec.get("signature"):
                    problems.append("gap signature changed since closure")
            if problems:
                transition(rec, LC_REOPENED, "; ".join(problems),
                           {"disposition": disp["path"] if disp else None,
                            "detected_state": g.get("state")})
                events["reopened"].append({"key": key,
                                           "reason": "; ".join(problems)})
        g["lifecycle"] = rec["state"]
        g["gap_key"] = key
        if rec["state"] == LC_KNOWN_PERMANENT:
            g["suppressed_by"] = rec.get("disposition") or (
                rec["transitions"][-1].get("disposition") if rec["transitions"] else None)

    # resolution: detected-absent + rule healthy -> RESOLVED (actual remediation)
    for key, rec in store.items():
        if key in seen:
            continue
        if rec["state"] == LC_RESOLVED:
            continue
        rule = (key.split("|") + [""])[0]
        if rule == "R7":
            continue  # appended post-run by the cron worker; never auto-resolve
        if not rule_health.get(rule, False):
            continue  # check did not run healthy; absence proves nothing
        transition(rec, LC_RESOLVED,
                   "gap condition no longer detected and rule %s check healthy" % rule,
                   {"last_seen": rec.get("last_seen")})
        events["resolved"].append({"key": key, "reason": "condition cleared"})

    return events


CAPTURE_FAILED_SUFFIX = ".md.CAPTURE_FAILED"
CF_TERMINAL_TRANSITION = "capture_failed_closed"


def cf_files_on_disk(intel_dir=INTEL):
    """Basenames of .md.CAPTURE_FAILED evidence files present on disk."""
    try:
        return sorted(n for n in os.listdir(intel_dir)
                      if n.endswith(CAPTURE_FAILED_SUFFIX))
    except OSError:
        return []


def check_capture_failed_terminal(sidecars, cf_files):
    """Classify capture_failed runs as terminal execution outcomes.

    Pure function of its inputs (unit-test seam); main() supplies the real
    sidecar map and the on-disk evidence list.
    Terminal = sidecar status capture_failed AND (verification == "failed"
    OR a capture_failed_closed transition). Terminal runs are counted, never
    gaps. Anything else is an actionable gap: the failed capture was never
    closed as a terminal execution outcome. A .md.CAPTURE_FAILED file with no
    capture_failed sidecar is orphan evidence (provenance gap).
    Returns (gaps, terminal_count, orphan_files).
    """
    gaps = []
    terminal = 0
    seen = set()
    for name, sc in sorted(sidecars.items()):
        if sc.get("_unreadable"):
            continue
        if sc.get("status") != "capture_failed":
            continue
        stem = name[:-len(".provenance.json")]
        seen.add(stem + CAPTURE_FAILED_SUFFIX)
        states = [t.get("state") for t in sc.get("transitions", [])
                  if isinstance(t, dict)]
        is_terminal = (sc.get("verification") == "failed"
                       or CF_TERMINAL_TRANSITION in states)
        if is_terminal:
            terminal += 1
            continue
        a = age_h(sc.get("timestamp"))
        age_txt = "%.1fh old" % a if a is not None else "age unknown"
        gaps.append({"rule": "R7", "step": "DISTILL", "state": "GAP",
            "reason": "capture_failed run (%s) without terminal disposition "
                      "(verification=%r, no capture_failed_closed transition); "
                      "the failed capture is not closed as a terminal "
                      "execution outcome" % (age_txt, sc.get("verification")),
            "run_id": sc.get("brief_id") or stem, "input": name,
            "next_eligible_step":
                "mark-distill-closed.sh %s --by <who> --decision capture_failed"
                % (stem + CAPTURE_FAILED_SUFFIX),
            "resumable": False})
    orphans = [f for f in cf_files if f not in seen]
    for f in orphans:
        gaps.append({"rule": "R7", "step": "PROVENANCE", "state": "GAP",
            "reason": "capture-failed evidence file on disk with no "
                      "capture_failed sidecar; provenance missing",
            "run_id": f[:-len(CAPTURE_FAILED_SUFFIX)], "input": f,
            "next_eligible_step": "investigate: restore or re-stamp the "
                                 "sidecar; never treat the file as answer evidence",
            "resumable": False})
    return gaps, terminal, orphans


def main():
    gaps = []
    info = {"checked_at": NOW.isoformat(), "rules": []}

    runs = load_runs()
    sidecars = load_sidecars()
    runs_by_id = {r.get("run_id"): r for r in runs if r.get("run_id")}

    # ---- R1: every ok/answer_captured run must have a readable sidecar with researched+validated
    for r in runs:
        if r.get("outcome") == "ok" and r.get("classification") == "answer_captured":
            sc_name = r.get("artifact_refs", {}).get("sidecar")
            sc = sidecars.get(sc_name) if sc_name else None
            states = [t.get("state") for t in (sc or {}).get("transitions", [])] if sc and not sc.get("_unreadable") else []
            if not sc or sc.get("_unreadable"):
                gaps.append({"rule": "R1", "step": "VALIDATE", "state": "GAP",
                    "reason": "expected sidecar artifact but none readable",
                    "run_id": r.get("run_id"), "input": sc_name,
                    "next_eligible_step": "re-run capture or quarantine ledger line",
                    "resumable": bool(r.get("resumable"))})
            elif not ("researched" in states and "validated" in states):
                gaps.append({"rule": "R1", "step": "VALIDATE", "state": "GAP",
                    "reason": "sidecar exists but lacks researched+validated transitions",
                    "run_id": r.get("run_id"), "input": sc_name,
                    "next_eligible_step": "re-run meta-pass.sh finalize or mark failed",
                    "resumable": True})
    info["rules"].append("R1 capture/validate completeness: %d runs checked" %
        sum(1 for r in runs if r.get("outcome") == "ok" and r.get("classification") == "answer_captured"))

    # ---- R2: answer_captured older than threshold must carry a terminal distill decision
    # terminal = verified+accepted_by_ping (emitted/ingested) OR ping_ingestion=skipped OR verification=failed
    for name, sc in sorted(sidecars.items()):
        if sc.get("_unreadable"): continue
        if sc.get("status") != "answer_captured": continue
        ts = sc.get("timestamp")
        a = age_h(ts)
        if a is None or a < TERMINAL_DECISION_AGE_H: continue
        verification, ing = sc.get("verification"), sc.get("ping_ingestion")
        states = [t.get("state") for t in sc.get("transitions", [])]
        ing_s = str(ing or "")
        # "skipped" or "skipped: <recorded reason>" are both terminal; a bare
        # reasoned skip must not be re-flagged, and an unreasoned nonstandard
        # value must not silently pass.
        terminal = (ing_s in ("emitted", "ingested") or ing_s == "skipped"
                    or ing_s.startswith("skipped:")) or verification == "failed"
        if not terminal:
            gaps.append({"rule": "R2", "step": "DISTILL", "state": "NOT_RUN",
                "reason": "answer_captured for %.1fh with no terminal verify/emit/skip decision" % a,
                "run_id": sc.get("brief_id") or name, "input": name,
                "next_eligible_step": "run mark-verified.sh then emit-observation.py, or record skipped with reason",
                "resumable": True})
    info["rules"].append("R2 terminal distill decisions checked")

    # ---- R3: every accepted_by_ping event_id must exist durably in ping_events
    event_ids = []
    for name, sc in sidecars.items():
        if sc.get("_unreadable"): continue
        for t in sc.get("transitions", []):
            if t.get("state") == "accepted_by_ping" and t.get("event_id"):
                event_ids.append((name, t["event_id"]))
    uniq = sorted(set(e for _, e in event_ids))
    found, unchecked, reason = pg_event_ids(uniq)
    if unchecked:
        gaps.append({"rule": "R3", "step": "EMIT", "state": "UNCHECKED",
            "reason": "could not verify event durability: %s" % reason,
            "run_id": "-", "input": "%d accepted event_ids" % len(uniq),
            "next_eligible_step": "re-run when Pig/gateway reachable", "resumable": True})
    else:
        for name, eid in event_ids:
            if eid not in found:
                gaps.append({"rule": "R3", "step": "EMIT", "state": "GAP",
                    "reason": "accepted_by_ping recorded but event_id absent from ping_events",
                    "run_id": name, "input": eid,
                    "next_eligible_step": "investigate gateway acceptance vs sidecar write ordering",
                    "resumable": False})
    info["rules"].append("R3 emit durability: %d accepted ids, %d found%s" %
        (len(uniq), len(found), " (UNCHECKED)" if unchecked else ""))

    # ---- R4: recent sweep summaries must record a PING-DISTILL decision
    # Timing comes from the sweep ledger lines in runs.jsonl (authoritative),
    # not from parsing .md bodies. Sweeps ending before the rule cutoff are
    # NOT_REQUIRED (the rule did not exist), which is distinct from NOT_RUN.
    sweep_runs = {}
    for r in runs:
        rid = r.get("run_id") or ""
        if rid.startswith("sweep-") and r.get("ended_at"):
            sweep_runs[rid] = r
    sweep_dir = os.path.dirname(INTEL)
    for f in sorted(glob.glob(os.path.join(sweep_dir, "sweep-2026-09-1[45]-*.md"))):
        rid = os.path.basename(f).replace(".md", "")
        sr = sweep_runs.get(rid)
        ended = parse_ts(sr.get("ended_at")) if sr else None
        if ended is None:
            # fall back to the summary file's mtime as end-of-sweep proxy
            try: ended = datetime.fromtimestamp(os.path.getmtime(f), tz=timezone.utc)
            except Exception: pass
        if ended and ended < DISTILL_RULE_CUTOFF:
            continue  # NOT_REQUIRED
        try: body = open(f).read()
        except Exception: continue
        if "PING-DISTILL" not in body:
            gaps.append({"rule": "R4", "step": "DISTILL", "state": "NOT_RUN",
                "reason": "sweep summary has LEARNING but no PING-DISTILL decision line",
                "run_id": rid, "input": f,
                "next_eligible_step": "append PING-DISTILL distilled|skipped line to LEARNING",
                "resumable": True})
            continue
        # WORKER CLAIMS but NO DURABLE EVIDENCE: if the line claims distilled
        # event_ids, they must exist in ping_events. A fabricated distill line
        # passes the existence check but fails here.
        m = re.search(r"PING-DISTILL\s+distilled:\s*\d+\s+observations?,\s*event_ids\s*\[([^\]]*)\]", body)
        if m:
            claimed = re.findall(r"[0-9a-f]{64}", m.group(1))
            if claimed:
                found, unchecked, why = pg_event_ids(claimed)
                missing = [e for e in claimed if e not in found]
                if missing and not unchecked:
                    gaps.append({"rule": "R4", "step": "DISTILL", "state": "FAILED",
                        "reason": "PING-DISTILL claims event_ids absent from ping_events: %s" % ", ".join(missing[:3]),
                        "run_id": rid, "input": f,
                        "next_eligible_step": "re-emit or correct the distill line; do not fabricate event_ids",
                        "resumable": True})
                elif unchecked:
                    gaps.append({"rule": "R4", "step": "DISTILL", "state": "BLOCKED",
                        "reason": "could not verify claimed event_ids in ping_events: %s" % why,
                        "run_id": rid, "input": f,
                        "next_eligible_step": "retry probe when Pig reachable",
                        "resumable": True})
    info["rules"].append("R4 sweep distill decisions checked")

    # ---- R7: capture_failed runs are TERMINAL EXECUTION OUTCOMES (2026-09-23)
    # A .md.CAPTURE_FAILED file means the run failed to capture evidence; it
    # is not successful evidence and must never enter extraction. Terminal
    # iff the sidecar carries the terminal disposition: verification ==
    # "failed" or a capture_failed_closed transition (mark-distill-closed.sh
    # --decision capture_failed). Terminal ones are counted (auditable), never
    # gaps. Non-terminal ones are actionable: the close was never recorded.
    # Orphan evidence (.md.CAPTURE_FAILED on disk with no capture_failed
    # sidecar) is a provenance gap.
    cf_gaps, cf_terminal, cf_orphans = check_capture_failed_terminal(
        sidecars, cf_files_on_disk())
    gaps.extend(cf_gaps)
    info["rules"].append(
        "R7 capture_failed terminal outcomes: %d recognized terminal, "
        "%d non-terminal, %d orphan evidence files"
        % (cf_terminal, len([g for g in cf_gaps if g["rule"] == "R7"
                             and g["step"] == "DISTILL"]),
           len(cf_orphans)))

    # ---- R5: stale in-flight runs (started/requested, old, no completion)
    # A sidecar with no runs.jsonl line at all is an ORPHAN (e.g. test fixture),
    # not a stale run: expected initiation record is itself missing.
    for name, sc in sorted(sidecars.items()):
        if sc.get("_unreadable"): continue
        if sc.get("status") not in ("started", "requested"): continue
        a = age_h(sc.get("timestamp"))
        if a is None or a < STALE_INFLIGHT_H: continue
        brief = sc.get("brief_id")
        # Test fixtures are the test harness's responsibility, not production
        # reconciliation's. Skip names that declare themselves as fixtures.
        if brief and ("bogus" in brief.lower() or brief.lower().startswith("test") or "fixture" in brief.lower()):
            continue
        ledger_lines = [r for r in runs if brief and r.get("brief_id") == brief]
        if not ledger_lines:
            gaps.append({"rule": "R5", "step": "CAPTURE", "state": "GAP",
                "reason": "sidecar claims in-flight but no ledger line ever initiated it (orphan/test fixture?)",
                "run_id": brief or name, "input": name,
                "next_eligible_step": "quarantine sidecar or attach to a real run; do not emit from it",
                "resumable": False})
            continue
        completed_ok = any(r.get("outcome") == "ok" for r in ledger_lines)
        if not completed_ok:
            later = sum(1 for r in ledger_lines if (parse_ts(r.get("started_at")) or NOW) > (parse_ts(sc.get("timestamp")) or NOW))
            gaps.append({"rule": "R5", "step": "CAPTURE", "state": "FAILED",
                "reason": "in-flight sidecar %.1fh old, brief never captured ok (%d later attempt(s) in ledger)" % (a, later),
                "run_id": brief or name, "input": name,
                "next_eligible_step": "safe to retry brief (captures are idempotent per resume notes)" if later < 3 else "brief failing repeatedly: investigate capture path before further retries",
                "resumable": True})
    info["rules"].append("R5 stale in-flight runs checked")

    # ---- R6: canonical_events direction (corrected 2026-09-14 by read-only audit)
    # canonical_events is NOT a downstream projection of ping_events. It is an
    # UPSTREAM tenant-event inbox (TenantOS business events) that the live
    # EventBridge drains INTO ping_events (5s poll, errors=0). Zero rows = empty
    # inbox, EXPECTED: no tenant flow has emitted yet. No projection to check.
    info["projection"] = ("NOT_APPLICABLE: canonical_events is the upstream "
        "tenant-event inbox, not a ping_events projection; 0 rows expected, "
        "EventBridge live and polling")

    # ---- Closure-aware lifecycle (2026-09-21): consume closure dispositions
    # and ingested.log BEFORE counting. Disposition-closed gaps become
    # KNOWN_PERMANENT: auditable but not actionable and not re-alerted.
    disps = parse_dispositions(OUT_DIR)
    store = load_lifecycle(LIFECYCLE_STORE)
    r3_unchecked = any(g["rule"] == "R3" and g.get("state") == "UNCHECKED"
                       for g in gaps)
    rule_health = {"R1": True, "R2": True, "R3": not r3_unchecked,
                   "R4": True, "R5": True, "R7": True}
    lc_events = run_lifecycle(gaps, disps, store, INTEL,
                              os.path.join(HOME, "workspace/outreach/ingested.log"),
                              rule_health, NOW.isoformat())
    save_lifecycle(LIFECYCLE_STORE, store)

    actionable = [g for g in gaps if g.get("lifecycle") in LC_ACTIONABLE]
    suppressed = [g for g in gaps if g.get("lifecycle") == LC_KNOWN_PERMANENT]
    info["lifecycle"] = ("lifecycle: %d actionable (OPEN/REOPENED), "
                         "%d suppressed (KNOWN_PERMANENT), %d resolved this run, "
                         "%d reopened this run; %d disposition(s) parsed" %
                         (len(actionable), len(suppressed),
                          len(lc_events["resolved"]), len(lc_events["reopened"]),
                          sum(1 for d in disps if d["valid"])))

    report = {"meta": info, "gap_count": len(actionable), "gaps": actionable,
              "suppressed_count": len(suppressed), "suppressed": suppressed,
              "resolved_this_run": lc_events["resolved"],
              "reopened_this_run": lc_events["reopened"],
              "newly_suppressed_this_run": lc_events["suppressed"],
              "lifecycle_store": LIFECYCLE_STORE,
              "dispositions": [{"path": d["path"], "rule": d["rule"],
                                "valid": d["valid"],
                                "authority": d["authority"],
                                "items_cited": len(d["items"])} for d in disps]}

    os.makedirs(OUT_DIR, exist_ok=True)
    stamp = NOW.strftime("%Y%m%d-%H%M%S")
    json_path = os.path.join(OUT_DIR, "reconcile-%s.json" % stamp)
    md_path = os.path.join(OUT_DIR, "reconcile-%s.md" % stamp)
    with open(json_path, "w") as f: json.dump(report, f, indent=2)
    # Atomic + durable LATEST.json write (2026-09-14): a mid-write interruption
    # (SIGKILL, host death) must not leave a corrupted LATEST.json. Write to
    # temp then os.replace() for atomicity. Durability: fsync the temp file
    # before replace (contents reach stable storage), then fsync the directory
    # after replace (the rename itself is durable) where supported. A fresh
    # agent reading a torn file cannot determine what happened; this makes
    # the boundary crash-consistent AND durable across host/power loss.
    # Invariant: once this block completes, the new state has been handed to
    # the OS for durable persistence as far as filesystem semantics allow.
    # A reader sees either the previous complete state or the new complete
    # state, never a torn state.
    latest_path = os.path.join(OUT_DIR, "LATEST.json")
    latest_tmp = latest_path + ".tmp"
    with open(latest_tmp, "w") as f:
        json.dump(report, f, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(latest_tmp, latest_path)
    try:
        dir_fd = os.open(OUT_DIR, os.O_DIRECTORY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    except OSError:
        pass  # platform/filesystem does not support directory fsync; atomicity still holds

    lines = ["# Reconciliation %s" % NOW.isoformat(),
             "",
             "Gaps: %d (actionable: OPEN/REOPENED)" % len(actionable),
             "Suppressed (KNOWN_PERMANENT, auditable, not actionable): %d" % len(suppressed),
             "Resolved this run: %d" % len(lc_events["resolved"]),
             "Reopened this run: %d" % len(lc_events["reopened"]),
             ""]
    for g in actionable:
        lines.append("## [%s] %s step=%s state=%s lifecycle=%s" % (
            g["rule"], g["run_id"], g["step"], g["state"], g.get("lifecycle")))
        lines.append("- reason: %s" % g["reason"])
        lines.append("- next: %s" % g["next_eligible_step"])
        lines.append("- resumable: %s" % g["resumable"])
        lines.append("")
    if not actionable:
        lines.append("No actionable gaps. All expected transitions have corresponding actual transitions, or remaining gaps are disposition-closed (see suppressed section).")
        lines.append("")
    if suppressed:
        lines.append("## Suppressed: KNOWN_PERMANENT (do not re-alert; query gap-lifecycle.json for full audit trail)")
        lines.append("")
        for g in suppressed:
            lines.append("- [%s] %s step=%s state=%s" % (
                g["rule"], g["run_id"], g["step"], g["state"]))
            lines.append("  suppressed_by: %s" % g.get("suppressed_by"))
            lines.append("  reason: %s" % g["reason"])
        lines.append("")
    if lc_events["resolved"]:
        lines.append("## Resolved this run (condition cleared by remediation)")
        for e in lc_events["resolved"]:
            lines.append("- %s: %s" % (e["key"], e["reason"]))
        lines.append("")
    if lc_events["reopened"]:
        lines.append("## Reopened this run (actionable again)")
        for e in lc_events["reopened"]:
            lines.append("- %s: %s" % (e["key"], e["reason"]))
        lines.append("")
    with open(md_path, "w") as f: f.write("\n".join(lines) + "\n")

    if "--json-only" not in sys.argv:
        print(json.dumps({"gap_count": len(actionable),
                          "suppressed_count": len(suppressed),
                          "report": md_path,
                          "rules": info["rules"]}, indent=2))
    sys.exit(0 if not actionable else 2)

if __name__ == "__main__":
    main()
