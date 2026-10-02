#!/usr/bin/env python3
# robots_allows.py: RFC 9309 simplified robots check for our crawler UA.
# Usage: robots_allows.py <robots.txt path> <path>
# Prints ALLOWED or BLOCKED. Our UA matches only the '*' group.
# Rule: longest matching Allow/Disallow wins; ties go to Allow.
import sys, re

def rule_to_regex(rule):
    # '*' -> '.*', '$' end anchor, escape the rest
    out = []
    for ch in rule:
        if ch == '*':
            out.append('.*')
        elif ch == '$':
            out.append('$')
        else:
            out.append(re.escape(ch))
    return '^' + ''.join(out)

def main():
    rpath, path = sys.argv[1], sys.argv[2]
    try:
        with open(rpath, encoding='utf-8', errors='replace') as f:
            lines = f.read().splitlines()
    except Exception:
        print("ALLOWED")
        return
    groups = []  # (agents, [(allow: bool, value)])
    agents, rules = [], []
    def flush():
        nonlocal agents, rules
        if agents or rules:
            groups.append((agents, rules))
        agents, rules = [], []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        m = re.match(r'(?i)^(user-agent|allow|disallow)\s*:(.*)$', line)
        if not m:
            continue
        kind, val = m.group(1).lower(), m.group(2).strip()
        if kind == 'user-agent':
            if rules:
                flush()
            agents.append(val)
        elif kind == 'allow':
            rules.append((True, val))
        else:
            rules.append((False, val))
    flush()
    star_rules = []
    for ags, rs in groups:
        if any(a == '*' for a in ags):
            star_rules.extend(rs)
    best = None  # (length, allow)
    for allow, val in star_rules:
        if val == '':
            continue
        if re.match(rule_to_regex(val), path):
            ln = len(val.replace('*', '').replace('$', ''))
            if best is None or ln > best[0] or (ln == best[0] and allow and not best[1]):
                best = (ln, allow)
    if best is None:
        print("ALLOWED")
    else:
        print("ALLOWED" if best[1] else "BLOCKED")

main()
