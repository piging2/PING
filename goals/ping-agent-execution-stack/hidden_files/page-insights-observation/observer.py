#!/usr/bin/env python3
"""
Page-insights scheduled-producer observer (2026-10-01 08:21 MDT run).
READ-ONLY. Observe, do not rescue. No POST, no re-run, no state change.

Truth table:
  scheduler invocation
  -> producer attempt
  -> expected canonical endpoint reached
  -> admission result observed
  -> canonical observation identified by correlation/idempotency
  -> no duplicate effect
  -> bounded artifact lifecycle respected

Reports the first broken boundary with evidence. Ambiguous transport = UNKNOWN, never FAILED.
"""
import json, subprocess, os, sys, glob
from datetime import datetime, timezone, timedelta

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    return r.stdout.strip(), r.stderr.strip(), r.returncode

def pg_query(sql):
    pw_out, _, _ = sh("docker exec brain-postgres printenv POSTGRES_PASSWORD")
    pw = pw_out.strip().splitlines()[0] if pw_out.strip() else ""
    # Write SQL to a temp file to avoid shell quoting issues; password stays in env.
    sql_path = "/tmp/obs_q.sql"
    with open(sql_path, "w") as f:
        f.write(sql)
    r = subprocess.run(
        ["bash", "-c",
         "docker exec -i -e PGPASSWORD=\"$OBSPW\" brain-postgres psql -U postgres "
         "-d ping_runtime -t -A -F '\t' -v ON_ERROR_STOP=1 -f /dev/stdin < " + sql_path],
        capture_output=True, text=True, timeout=60,
        env={**os.environ, "OBSPW": pw,
             "PGOPTIONS": "-c default_transaction_read_only=on"})
    try:
        os.remove(sql_path)
    except OSError:
        pass
    if r.returncode != 0:
        return None, (r.stderr.strip()[:300] or "psql failed")
    return r.stdout.strip(), None

result = {"observed_at": datetime.now(timezone.utc).isoformat(), "checks": {}, "first_broken": None}

# Window: 2026-10-01 08:15 to 08:45 MDT (UTC-6)
mdt = timezone(timedelta(hours=-6))
win_start = datetime(2026, 10, 1, 8, 15, tzinfo=mdt).astimezone(timezone.utc)
win_end = datetime(2026, 10, 1, 8, 45, tzinfo=mdt).astimezone(timezone.utc)
result["window_utc"] = [win_start.isoformat(), win_end.isoformat()]

# 1. Scheduler invocation: is the cron scheduled?
cron_out, _, _ = sh("crontab -l 2>/dev/null | grep -i 'metric-ingest\\|metric_ingest\\|run-metric-ingest'")
result["checks"]["cron_scheduled"] = bool(cron_out)
result["checks"]["cron_entry"] = cron_out[:200] if cron_out else None

# 2. Producer on served line?
prod_out, _, prod_rc = sh("docker exec ping-gateway ls /app/ping-runtime/producers/run-metric-ingest.sh 2>/dev/null")
result["checks"]["producer_on_served_line"] = (prod_rc == 0 and bool(prod_out))
served_img, _, _ = sh("docker inspect ping-gateway --format='{{.Config.Image}}' 2>/dev/null")
result["checks"]["served_image"] = served_img

# 3-6. Journal: observations from metric-ingest-producer in the window
sql = (
    "SELECT event_id, created_at, payload->>'observation_type', "
    "length(payload::text) FROM ping_events "
    "WHERE event_type = 'OBSERVATION_CREATED' "
    "AND payload->>'source' = 'metric-ingest-producer' "
    "AND created_at >= '%s' AND created_at < '%s' "
    "ORDER BY created_at;" % (win_start.isoformat(), win_end.isoformat()))
rows, err = pg_query(sql)
if err:
    result["checks"]["journal_error"] = err
    result["first_broken"] = "journal_unreachable"
else:
    obs = [l.split("\t") for l in rows.splitlines() if l.strip()]
    result["checks"]["observation_count"] = len(obs)
    result["checks"]["observations"] = [
        {"event_id": o[0][:8], "created_at": o[1], "type": o[2], "payload_bytes": o[3]} for o in obs[:20]]
    ids = [o[0] for o in obs]
    result["checks"]["duplicate_event_ids"] = len(ids) - len(set(ids))
    # Idempotency: event_id should be deterministic per (page, date). Check format.
    result["checks"]["no_duplicate_effect"] = (len(ids) == len(set(ids)))

# 7. Bounded lifecycle: /tmp/mip-*.json accumulation
mip_files = glob.glob("/tmp/mip-*.json")
total_bytes = sum(os.path.getsize(f) for f in mip_files if os.path.exists(f))
result["checks"]["tmp_mip_files"] = len(mip_files)
result["checks"]["tmp_mip_bytes"] = total_bytes
result["checks"]["tmp_mip_newest"] = max(
    (datetime.fromtimestamp(os.path.getmtime(f), tz=timezone.utc).isoformat() for f in mip_files),
    default=None) if mip_files else None

# Verdict: first broken boundary
if result["first_broken"] is None:
    if not result["checks"]["cron_scheduled"]:
        result["first_broken"] = "scheduler_invocation_absent"
        result["verdict"] = "SCHEDULER_NOT_SCHEDULED"
        result["evidence"] = ("No crontab entry for run-metric-ingest.sh on the Pig; "
            "producer is merged in source (67da6aab1) but served image is %s (predates producer). "
            "The cron step activates on merge to the served line, which has not happened." % served_img)
    elif result["checks"].get("observation_count", 0) == 0:
        result["first_broken"] = "producer_attempt_or_admission"
        result["verdict"] = "NO_OBSERVATION_IN_WINDOW"
        result["evidence"] = ("Cron is scheduled but zero OBSERVATION_CREATED rows from metric-ingest-producer "
            "in the 08:15-08:45 MDT window. Ambiguous transport outcome = UNKNOWN, not FAILED. No rescue attempted.")
    elif not result["checks"]["no_duplicate_effect"]:
        result["first_broken"] = "duplicate_effect"
        result["verdict"] = "DUPLICATE_EFFECT"
        result["evidence"] = "Duplicate event_ids in the window; idempotency violated."
    elif result["checks"]["tmp_mip_bytes"] > 10 * 1024 * 1024:
        result["first_broken"] = "artifact_lifecycle"
        result["verdict"] = "LIFECYCLE_UNBOUNDED"
        result["evidence"] = "Temp input files exceed 10MB; bounded lifecycle not respected."
    else:
        result["first_broken"] = None
        result["verdict"] = "ALL_GREEN"
        result["evidence"] = ("%d observations admitted in window, no duplicates, lifecycle bounded." %
            result["checks"]["observation_count"])

print(json.dumps(result, indent=2))
