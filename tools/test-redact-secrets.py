#!/usr/bin/env python3
"""Regression tests for redact-secrets.py.

Run: python3 test-redact-secrets.py
Exit 0 when every case passes.
"""
import subprocess
import sys
import os

FILTER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "redact-secrets.py")

CASES = [
    # (input, expected_output)
    ("POSTGRES_PASSWORD=s3cr3t-value\n", "POSTGRES_PASSWORD=***REDACTED***\n"),
    ("  POSTGRES_PASSWORD = s3cr3t\n", "  POSTGRES_PASSWORD = ***REDACTED***\n"),
    ('POSTGRES_PASSWORD="quoted-secret"\n', 'POSTGRES_PASSWORD="***REDACTED***"\n'),
    ("'API_TOKEN': 'abc'\n", "'API_TOKEN': 'abc'\n"),  # single-quote key: not JSON form, but env form redacts
    ('"api_token": "abc123"\n', '"api_token": "***REDACTED***"\n'),
    ('"DATABASE_URL": "postgres://u:p@h/db",\n', '"DATABASE_URL": "***REDACTED***",\n'),
    ("Authorization: Bearer eyJhbGciOi\n", "Authorization: ***REDACTED***\n"),
    ("authorization: basic dXNlcjpwYXNz\n", "authorization: ***REDACTED***\n"),
    ("Cookie: session=abc; pref=1\n", "Cookie: ***REDACTED***\n"),
    ("Set-Cookie: sid=xyz; Path=/\n", "Set-Cookie: ***REDACTED***\n"),
    ("MY_AUTH_TOKEN=x\n", "MY_AUTH_TOKEN=***REDACTED***\n"),
    ("SECRET_KEY_BASE=abcdef\n", "SECRET_KEY_BASE=***REDACTED***\n"),
    ("CREDENTIALS_FILE=/etc/x\n", "CREDENTIALS_FILE=***REDACTED***\n"),
    ("PGPASSFILE=/home/u/.pgpass\n", "PGPASSFILE=***REDACTED***\n"),
    # non-sensitive lines pass through byte-identical
    ("POSTGRES_USER=ping\n", "POSTGRES_USER=ping\n"),
    ("POSTGRES_DB=crx_runtime\n", "POSTGRES_DB=crx_runtime\n"),
    ('"event_type": "MISSION_CREATED"\n', '"event_type": "MISSION_CREATED"\n'),
    ("uptime: 129.5\n", "uptime: 129.5\n"),
    ("SELECT count(*) FROM ping_events;\n", "SELECT count(*) FROM ping_events;\n"),
    ("PATH=/usr/local/bin:/usr/bin\n", "PATH=/usr/local/bin:/usr/bin\n"),
    ("", ""),
    ("no equals here\n", "no equals here\n"),
]


def main() -> int:
    failed = 0
    blob_in = "".join(c[0] for c in CASES)
    blob_want = "".join(c[1] for c in CASES)
    p = subprocess.run([sys.executable, FILTER], input=blob_in,
                       capture_output=True, text=True, timeout=30)
    if p.returncode != 0:
        print("filter crashed: " + p.stderr[:300])
        return 1
    got_lines = p.stdout.splitlines(keepends=True)
    want_lines = blob_want.splitlines(keepends=True)
    in_lines = blob_in.splitlines(keepends=True)
    for i, (gi, wi, ii) in enumerate(zip(got_lines, want_lines, in_lines)):
        if gi != wi:
            failed += 1
            print("FAIL case %d: in=%r want=%r got=%r" % (i, ii, wi, gi))
    # length parity: no lines added or dropped
    if len(got_lines) != len(want_lines):
        failed += 1
        print("FAIL line count: got %d want %d" % (len(got_lines), len(want_lines)))
    print("%d/%d cases passed" % (len(CASES) - failed, len(CASES)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
