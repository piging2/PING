#!/usr/bin/env python3
"""
gate-check.py - deterministic gate checker for PING autonomy-challenge
FAIL-*.md mechanism-hunt reports.

Verifies, per report file, the hard gates from the challenge brief:

  1. Each surviving mechanism prevents at least 2 of the 9 failure classes.
  2. Each survivor has a falsifiable-test block with identifiable
     Input / Procedure / Expected-outcome / Falsification markers.
  3. No em dash characters (U+2014) anywhere in the file.
  4. A cut list with reasons is present.
  5. Each prevented class has an adjacent crisp reason (bare class-name
     mentions with no explanatory sentence nearby are warnings).

Hard violations print as VIOLATION lines and force a nonzero exit.
Soft issues print as WARNING lines and do not affect the exit code.

Usage:
    python3 gate-check.py <FAIL-x.md> [FAIL-y.md ...]

Fully deterministic: no randomness, no network, no timestamps in output.
"""

import re
import sys
from pathlib import Path

EM_DASH = "\u2014"

# Canonical numbering of the 9 FYD failure classes.
CLASSES = {
    1: "mobile-overflow",
    2: "unsafe-url",
    3: "graph-blindness",
    4: "fixture-drift",
    5: "claim-binding",
    6: "visibility-error",
    7: "clone-sitespecs",
    8: "correction-loss",
    9: "conflict-collapse",
}
NAME_TO_NUM = {v: k for k, v in CLASSES.items()}
CLASS_NAME_PATTERN = "|".join(re.escape(n) for n in CLASSES.values())

# Mechanism headings seen in the lanes: "### Survivor 1: Title" or "### S1. Title".
MECH_HEADING_RE = re.compile(
    r"^(#{2,4})\s*(?:Survivor\s+(\d+)|S(\d+))\s*[.:]", re.MULTILINE
)
ANY_HEADING_RE = re.compile(r"^(#{1,6})\s*(.*)$", re.MULTILINE)
BULLET_RE = re.compile(r"^\s*[-*]\s+(.+)$")
TEST_BLOCK_RE = re.compile(r"falsifiable\s+test", re.IGNORECASE)
PREVENTS_RE = re.compile(r"^\s*(?:\*\*)?\s*prevents?\b", re.IGNORECASE | re.MULTILINE)
DECLARED_COUNT_RE = re.compile(r"prevents?\s+(\d+)\s+classes?", re.IGNORECASE)

# "#2 unsafe-url" / "#5" / "#9 conflict-collapse" inside Prevents bullets.
NUMBERED_CLASS_RE = re.compile(
    r"#(\d{1,2})\s*((" + CLASS_NAME_PATTERN + r")\b)?", re.IGNORECASE
)
NAMED_CLASS_RE = re.compile(r"\b(" + CLASS_NAME_PATTERN + r")\b", re.IGNORECASE)

# Falsifiable-test markers (bullets or bold labels).
INPUT_RE = re.compile(r"^\s*[-*]?\s*\**\s*input\b", re.IGNORECASE | re.MULTILINE)
PROCEDURE_RE = re.compile(r"^\s*[-*]?\s*\**\s*procedure\b", re.IGNORECASE | re.MULTILINE)
EXPECTED_RE = re.compile(
    r"^\s*[-*]?\s*\**\s*expected\b", re.IGNORECASE | re.MULTILINE
)
FALSIFY_RE = re.compile(
    r"falsif|proves?\s+(the\s+)?mechanism\s+(doesn.?t|does\s+not)\s+work|"
    r"what\s+(would\s+)?(disprove|falsify)",
    re.IGNORECASE,
)

CUT_HEADING_RE = re.compile(r"^#{1,4}\s*.*\bcut\b", re.IGNORECASE | re.MULTILINE)

REASON_MIN_LEN = 40  # heuristic: a crisp reason is at least this long


class Finding:
    def __init__(self, kind, where, message):
        self.kind = kind  # "VIOLATION" or "WARNING"
        self.where = where
        self.message = message

    def __str__(self):
        return "%s: %s: %s" % (self.kind, self.where, self.message)


def mechanism_regions(text):
    """Yield (mech_id, label, region_text) for each surviving-mechanism heading."""
    heads = list(MECH_HEADING_RE.finditer(text))
    out = []
    for i, m in enumerate(heads):
        mech_num = m.group(2) or m.group(3)
        level = len(m.group(1))
        start = m.start()
        # Region ends at the next heading of level <= this one.
        end = len(text)
        for other in ANY_HEADING_RE.finditer(text, m.end()):
            if len(other.group(1)) <= level and other.start() > m.start():
                end = other.start()
                break
        out.append((int(mech_num), "S%d" % int(mech_num), text[start:end]))
    return out


def prevents_block(region):
    """Return the Prevents... bullet region of a mechanism, or None."""
    m = PREVENTS_RE.search(region)
    if not m:
        return None
    block = region[m.start():]
    t = TEST_BLOCK_RE.search(block)
    if t:
        block = block[: t.start()]
    return block


def declared_prevents_count(region):
    m = DECLARED_COUNT_RE.search(region)
    return int(m.group(1)) if m else None


def extract_prevents(block):
    """Return list of (num, name, reason_text, bullet) found in the block."""
    found = []
    for line in block.splitlines():
        bm = BULLET_RE.match(line)
        if not bm:
            continue
        bullet = bm.group(1).strip()
        nm = NUMBERED_CLASS_RE.search(bullet)
        named = NAMED_CLASS_RE.search(bullet)
        num = name = None
        if nm:
            num = int(nm.group(1))
            if nm.group(2):
                name = nm.group(2).lower()
        elif named:
            name = named.group(1).lower()
            num = NAME_TO_NUM[name]
        if num is None:
            continue  # bullet mentions no failure class
        # Strip the class reference token to get the reason text.
        reason = NUMBERED_CLASS_RE.sub("", bullet, count=1) if nm else NAMED_CLASS_RE.sub("", bullet, count=1)
        reason = re.sub(r"^[\s:*\-|_,;.]", "", reason).strip()
        found.append((num, name, reason, bullet))
    return found


def check_mechanism(path, mech_id, label, region, findings):
    where = "%s %s" % (path, label)
    block = prevents_block(region)
    if block is None:
        findings.append(Finding("VIOLATION", where, "no Prevents block found"))
        return
    refs = extract_prevents(block)
    if not refs:
        findings.append(
            Finding("VIOLATION", where, "Prevents block names no failure class")
        )
        return
    distinct = {}
    for num, name, reason, bullet in refs:
        if num not in CLASSES:
            findings.append(
                Finding(
                    "VIOLATION",
                    where,
                    "unknown class number #%d (valid: 1-9)" % num,
                )
            )
            continue
        if name and NAME_TO_NUM.get(name) != num:
            findings.append(
                Finding(
                    "VIOLATION",
                    where,
                    "class number/name mismatch: #%d paired with name '%s' "
                    "(#%d is '%s')" % (num, name, num, CLASSES[num]),
                )
            )
        distinct[num] = distinct.get(num, 0) + 1
        # Gate 5: adjacent reason present.
        clean = re.sub(r"\*+", "", reason).strip()
        if len(clean) < REASON_MIN_LEN:
            findings.append(
                Finding(
                    "WARNING",
                    where,
                    "class #%d (%s) has no adjacent explanatory sentence "
                    "(reason text too short: %r)" % (num, CLASSES[num], clean[:60]),
                )
            )
    n = len(distinct)
    if n < 2:
        findings.append(
            Finding(
                "VIOLATION",
                where,
                "prevents only %d distinct class(es) %s; gate requires >= 2"
                % (n, sorted(distinct)),
            )
        )
    declared = declared_prevents_count(region)
    if declared is not None and declared != n:
        findings.append(
            Finding(
                "WARNING",
                where,
                "declared 'Prevents %d classes' but %d distinct class(es) found"
                % (declared, n),
            )
        )

    # Gate 2: falsifiable-test block with the four markers.
    t = TEST_BLOCK_RE.search(region)
    if not t:
        findings.append(Finding("VIOLATION", where, "no falsifiable-test block"))
        return
    tail = region[t.end():]
    markers = [
        ("input", INPUT_RE),
        ("procedure", PROCEDURE_RE),
        ("expected outcome", EXPECTED_RE),
        ("falsification", FALSIFY_RE),
    ]
    for marker_name, rx in markers:
        if not rx.search(tail):
            findings.append(
                Finding(
                    "VIOLATION",
                    where,
                    "falsifiable-test block missing '%s' marker" % marker_name,
                )
            )


def check_cut_list(path, text, findings):
    where = "%s cut list" % path
    m = CUT_HEADING_RE.search(text)
    if not m:
        findings.append(
            Finding("VIOLATION", where, "no cut-list section found")
        )
        return
    level = len(re.match(r"^(#+)", m.group(0)).group(1))
    region = text[m.end():]
    for other in ANY_HEADING_RE.finditer(text, m.end()):
        if len(other.group(1)) <= level and other.start() > m.end():
            region = text[m.end(): other.start()]
            break
    bullets = [BULLET_RE.match(l).group(1).strip() for l in region.splitlines() if BULLET_RE.match(l)]
    if not bullets:
        findings.append(
            Finding("VIOLATION", where, "cut-list section has no entries")
        )
        return
    for b in bullets:
        clean = re.sub(r"\*+", "", b).strip()
        if len(clean) < REASON_MIN_LEN:
            findings.append(
                Finding(
                    "WARNING",
                    where,
                    "cut entry may lack a reason: %r" % clean[:70],
                )
            )


def check_file(path):
    findings = []
    text = Path(path).read_text(encoding="utf-8")
    # Gate 3: no em dashes anywhere.
    for lineno, line in enumerate(text.splitlines(), 1):
        if EM_DASH in line:
            findings.append(
                Finding(
                    "VIOLATION",
                    "%s line %d" % (path, lineno),
                    "em dash character (U+2014) present",
                )
            )
    regions = mechanism_regions(text)
    if not regions:
        findings.append(
            Finding("VIOLATION", path, "no surviving-mechanism sections found")
        )
    for mech_id, label, region in regions:
        check_mechanism(path, mech_id, label, region, findings)
    check_cut_list(path, text, findings)
    return findings


def main(argv):
    if len(argv) < 2:
        print("usage: gate-check.py <FAIL-x.md> [FAIL-y.md ...]", file=sys.stderr)
        return 2
    all_findings = []
    for p in argv[1:]:
        if not Path(p).exists():
            print("VIOLATION: %s: file not found" % p)
            all_findings.append(Finding("VIOLATION", p, "file not found"))
            continue
        all_findings.extend(check_file(p))
    for f in all_findings:
        print(f)
    viol = sum(1 for f in all_findings if f.kind == "VIOLATION")
    warn = sum(1 for f in all_findings if f.kind == "WARNING")
    print("files checked: %d, violations: %d, warnings: %d" % (len(argv) - 1, viol, warn))
    return 1 if viol else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
