#!/usr/bin/env python3
"""redact-secrets.py: make diagnostics safe by construction.

Reads text on stdin, writes redacted text on stdout. Any KEY=VALUE style
assignment (shell env, docker inspect env lists, .env files) whose key contains
one of the sensitive substrings has its value replaced with ***REDACTED***.
Also redacts JSON string pairs with sensitive keys, and Authorization /
Cookie / Set-Cookie header values.

Sensitive key substrings (case-insensitive):
  PASSWORD, PASS, TOKEN, SECRET, KEY, CREDENTIAL, DATABASE_URL, AUTH, COOKIE

Non-matching lines pass through byte-identical. This filter is deliberately
conservative: it never alters line structure, only replaces values.
"""
import re
import sys

SUBSTRINGS = ("PASSWORD", "PASS", "TOKEN", "SECRET", "KEY", "CREDENTIAL",
              "DATABASE_URL", "AUTH", "COOKIE")
REDACTED = "***REDACTED***"


def is_sensitive(key: str) -> bool:
    k = key.upper()
    return any(s in k for s in SUBSTRINGS)


# KEY=VALUE  (shell, env files, docker -e lists). Value runs to end of line,
# optionally quoted.
ENV_RE = re.compile(
    r'^(?P<indent>[ \t"\']*)(?P<key>[A-Za-z_][A-Za-z0-9_]*)'
    r'(?P<sep>\s*=\s*)(?P<quote>["\']?)(?P<val>.*?)(?P<q2>["\']?)$'
)
# "key": "value"  or  "key": 'value'  (JSON-ish; keeps the document parseable)
JSON_RE = re.compile(
    r'^(?P<pre>\s*"(?P<key>[^"]+)"\s*:\s*)(?P<quote>["\'])(?P<val>.*?)(?P<q2>["\'])(?P<post>\s*,?\s*)$'
)
# Authorization: <scheme> <credentials>  /  Cookie: ...  /  Set-Cookie: ...
HEADER_RE = re.compile(
    r'^(?P<name>\s*(?:Authorization|Proxy-Authorization|Cookie|Set-Cookie)\s*:)(?P<rest>.*)$',
    re.IGNORECASE,
)


def redact_line(line: str) -> str:
    nl = "\n" if line.endswith("\n") else ""
    body = line[:-1] if nl else line

    m = HEADER_RE.match(body)
    if m:
        return m.group("name") + " " + REDACTED + nl

    m = JSON_RE.match(body)
    if m and is_sensitive(m.group("key")):
        return (m.group("pre") + m.group("quote") + REDACTED +
                m.group("q2") + m.group("post") + nl)

    m = ENV_RE.match(body)
    if m and is_sensitive(m.group("key")):
        return (m.group("indent") + m.group("key") + m.group("sep") +
                m.group("quote") + REDACTED + m.group("q2") + nl)

    return line


def main() -> None:
    data = sys.stdin.read()
    sys.stdout.write("".join(redact_line(l) for l in data.splitlines(keepends=True)))


if __name__ == "__main__":
    main()
