"""Read-only probe for ping_events on the Pig gateway Postgres.

Follows the established reconcile.py pattern: credentials are resolved at
runtime from the ping-gateway container env over SSH and are never stored,
written to files, or logged. Queries are caller-supplied SELECT statements
only. Best effort by design: failures raise ProbeError and callers record
UNCHECKABLE rather than inventing data.

Transport (settled 2026-09-14 after live flakiness): exactly ONE SSH
connection per attempt. The PowerShell program travels as -EncodedCommand
(UTF-16LE base64, ASCII-safe); the SQL travels inside it as UTF-8 base64 and
is written to a uniquely named file on the Pig, docker-cp'd into the
container, and executed with psql -f; result rows come back as UTF-8 base64
on stdout. No scp round-trips, no stdin piping (both proved intermittently
lossy through the egress proxy), no inline -c quoting. A query that matches
zero rows returns the explicit plain-text sentinel EMPTY_RESULT (not an
empty stdout), so "no rows" is never confused with a psql failure.

This is a read path for projections. It creates no state.
"""

import base64
import itertools
import os
import re
import subprocess
import time

_counter = itertools.count()


class ProbeError(Exception):
    pass


def query_events(sql, timeout=90):
    """Run a read-only SELECT against ping_events. Returns list of rows,
    each row a list of string fields. Raises ProbeError on any failure.

    Transport-level failures are retried with backoff; the query is
    read-only and idempotent, so a retry cannot double-apply anything.
    SQL-layer failures fail immediately.
    """
    if not re.match(r"(?is)^\s*select\s", sql or ""):
        raise ProbeError("only SELECT statements are allowed")
    if re.search(r"(?i)\b(insert|update|delete|drop|alter|create|grant|copy)\b", sql):
        raise ProbeError("write statements are not allowed")
    last = None
    for attempt in range(4):
        try:
            return _query_once(sql, timeout)
        except ProbeError as e:
            last = e
            if "PSQL_FAILED" in str(e):
                raise
            if attempt < 3:
                time.sleep(10 * (attempt + 1))
    raise last


def _query_once(sql, timeout):
    tag = "pgq-%d-%d" % (os.getpid(), next(_counter))
    container_sql = "/tmp/%s.sql" % tag
    pig_sql = "C:/Users/nolan/.local/share/pigi/%s.sql" % tag
    sql_b64 = base64.b64encode(sql.encode("utf-8")).decode("ascii")
    ps1 = (
        "$pw = (docker exec ping-gateway printenv POSTGRES_PASSWORD).Trim()\n"
        "$u = (docker exec ping-gateway printenv POSTGRES_USER).Trim()\n"
        "$db = (docker exec ping-gateway printenv POSTGRES_DB).Trim()\n"
        "[System.IO.File]::WriteAllText('%s', "
        "[System.Text.Encoding]::UTF8.GetString("
        "[System.Convert]::FromBase64String('%s')))\n" % (pig_sql, sql_b64) +
        "docker cp '%s' ping-postgres:%s\n" % (pig_sql, container_sql) +
        "$q = docker exec -e PGPASSWORD=$pw ping-postgres psql -v ON_ERROR_STOP=1 "
        "-U $u -h localhost -d $db -t -A -F \"`t\" -f %s\n" % container_sql +
        "if ($LASTEXITCODE -ne 0) { Write-Output 'PSQL_FAILED' } else {\n"
        "Remove-Item -Force '%s' -ErrorAction SilentlyContinue\n" % pig_sql +
        "$raw = ($q -join \"`n\")\n"
        "$b64 = [System.Convert]::ToBase64String("
        "[System.Text.Encoding]::UTF8.GetBytes($raw))\n"
        "if ([string]::IsNullOrEmpty($b64)) { Write-Output 'EMPTY_RESULT' } "
        "else { Write-Output $b64 }\n"
        "}\n"
    )
    enc = base64.b64encode(ps1.encode("utf-16-le")).decode("ascii")
    try:
        r = subprocess.run(
            ["bash", "-lc",
             "source ~/workspace/pig-fb/pig-ssh.sh && PIG_TIMEOUT=%d pig_ssh "
             "\"powershell -NoProfile -EncodedCommand %s\"" % (timeout, enc)],
            capture_output=True, text=True, timeout=timeout + 30)
        if r.returncode != 0:
            raise ProbeError("probe execution failed: %s"
                             % (r.stderr.strip()[:160] or r.stdout.strip()[:160]
                                 or "rc!=0"))
        out = r.stdout.strip()
        # EMPTY_RESULT is the explicit zero-rows signal from the remote
        # script (a plain-text sentinel; '_' cannot appear in base64 output,
        # so it cannot collide with real rows). An unexplained empty stdout
        # with rc==0 stays PSQL_FAILED: fail closed, never invent rows.
        if out == "EMPTY_RESULT":
            return []
        if not out or "PSQL_FAILED" in out:
            raise ProbeError("PSQL_FAILED")
        try:
            raw = base64.b64decode(out).decode("utf-8", errors="replace")
        except Exception:
            raise ProbeError("result decode failed")
        return [line.split("\t") for line in raw.split("\n") if line.strip()]
    except ProbeError:
        raise
    except Exception as e:
        raise ProbeError("probe exception: %s" % str(e)[:160])
