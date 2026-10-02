#!/usr/bin/env python3
"""Recount hunk envelopes in 088 diff files (fixes the 097-class envelope bug).

For every @@ -a,b +c,d @@ header, recompute b (old lines = context+removed)
and d (new lines = context+added) from the actual hunk body. Preserves the
a/c start line numbers and everything else byte-for-byte.
Also reports em dashes found in '+' lines (for manual review).
"""
import re
import sys

HUNK_RE = re.compile(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$')

def fix(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')
    out = []
    i = 0
    nfixed = 0
    emdash_plus = []
    while i < len(lines):
        m = HUNK_RE.match(lines[i])
        if not m:
            out.append(lines[i])
            i += 1
            continue
        a, c, rest = m.group(1), m.group(3), m.group(5)
        old_n = new_n = 0
        i += 1
        body_start = len(out)
        # collect hunk body: ' '/'-'/'+' lines, '\' no-newline markers, and
        # truly-empty lines (empty context lines). Stop at the next hunk
        # header, a new file header, or EOF (a trailing empty line from the
        # final newline is NOT a context line).
        while i < len(lines):
            ln = lines[i]
            if ln.startswith('@@ ') or ln.startswith('--- ') or ln.startswith('diff '):
                break
            if ln == '' and i == len(lines) - 1:
                break  # EOF trailing newline
            if ln.startswith((' ', '-', '+', '\\')) or ln == '':
                if ln.startswith(' ') or ln == '':
                    old_n += 1
                    new_n += 1
                elif ln.startswith('-'):
                    old_n += 1
                elif ln.startswith('+'):
                    new_n += 1
                    if '—' in ln:
                        emdash_plus.append((i + 1, ln[:90]))
                # '\ No newline at end of file' contributes nothing
                out.append(ln)
                i += 1
            else:
                break
        new_header = f'@@ -{a},{old_n} +{c},{new_n} @@{rest}'
        out.insert(body_start, new_header)
        nfixed += 1
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    return nfixed, emdash_plus

for p in sys.argv[1:]:
    n, em = fix(p)
    print(f'{p}: {n} hunks recounted')
    for lineno, text in em:
        print(f'  EMDASH(+) line ~{lineno}: {text}')
