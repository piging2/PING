#!/usr/bin/env python3
"""Validate a pulled Meta AI answer file before it enters the pipeline.

This is the pipeline's false-success boundary: a prompt-only capture must
NEVER be treated as a completed research result. The script decodes the raw
bytes (byte-exact, BOM-aware, strict UTF-8 that fails loudly), writes the
evidence .md file, then checks that an actual assistant answer is present.

Presence rule (all four research briefs demand a numbered list of 10):
  - at least MIN_NUMBERED_ITEMS parsed business entries in the answer region
  - total answer chars above MIN_ANSWER_CHARS
A file that fails is still WRITTEN (evidence is preserved); the caller must
rename it to .CAPTURE_FAILED and stamp the sidecar accordingly.

numbered_items invariant (2026-09-19): the item count is the parsed
business-entry count (validate-research-contract.py's entry parser, the
same parser the contract gate uses), never the raw numbered-syntax count.
The old regex counted template numbers in the echoed prompt (known list,
OUTPUT CONTRACT boilerplate) and even the script's own run-ID header
("04)\n\nMarketing"), so the ledger recorded item counts that never
measured businesses (observed: 9-10 vs 5 real, 5 vs 14 real). One entry
definition shared by both validators; the gate and the metric can no
longer disagree.

Exit codes: 0 = answer_captured, 3 = capture_failed (prompt-only/empty/
malformed), 2 = infra/decode error.
"""
import importlib.util
import os
import re
import sys

MIN_NUMBERED_ITEMS = 3
MIN_ANSWER_CHARS = 1200


def _contract_parser():
    """Shared entry parser: validate-research-contract.py owns the entry
    definition (authority boundary); this module only consumes it."""
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "validate-research-contract.py")
    spec = importlib.util.spec_from_file_location(
        "tandem_research_contract", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_CONTRACT = None


def count_business_entries(text: str) -> int:
    """Number of parsed business entries in the answer region.

    The prompt echo and UI chrome are stripped by the contract validator's
    answer_region() before parsing, so echoed template numbers can never
    count. An entry is accepted only when it carries at least one explicit
    labeled field (the contract's phantom-entry rule).
    """
    global _CONTRACT
    if _CONTRACT is None:
        _CONTRACT = _contract_parser()
    region = _CONTRACT.answer_region(text)
    return len(_CONTRACT.parse_entries(region))


def decode_raw(raw: bytes) -> str:
    if raw[:2] == b'\xff\xfe':
        text = raw.decode('utf-16')
    elif raw[:2] == b'\xfe\xff':
        text = raw.decode('utf-16-be')
    elif raw[:3] == b'\xef\xbb\xbf':
        text = raw.decode('utf-8-sig')
    else:
        text = raw.decode('utf-8')  # strict: never guess, fail loudly
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    cut = text.find('Ask Meta AI.')
    if cut > 0:
        text = text[:cut]
    return text.strip()


def main() -> int:
    if len(sys.argv) != 5:
        print('usage: validate-meta-answer.py <raw.bin> <out.md> <slug> <ts>', file=sys.stderr)
        return 2
    raw_path, out_path, slug, ts = sys.argv[1:5]
    try:
        raw = open(raw_path, 'rb').read()
    except OSError as e:
        print(f'INFRA read_failed {e}', file=sys.stderr)
        return 2
    try:
        text = decode_raw(raw)
    except (UnicodeDecodeError, ValueError) as e:
        print(f'CAPTURE decode_failed {e}', file=sys.stderr)
        return 3
    header = f'# Meta AI intel pass: {slug} ({ts[:8]} {ts[9:11]}:{ts[11:13]})\n\n'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(header + text + '\n')
    items = count_business_entries(text)
    chars = len(text)
    print(f'answer chars: {chars}, numbered items: {items}')
    if items < MIN_NUMBERED_ITEMS or chars < MIN_ANSWER_CHARS:
        print(f'CAPTURE answer_missing_or_malformed '
              f'(need >={MIN_NUMBERED_ITEMS} business entries and >{MIN_ANSWER_CHARS} chars)',
              file=sys.stderr)
        return 3
    return 0


if __name__ == '__main__':
    sys.exit(main())
