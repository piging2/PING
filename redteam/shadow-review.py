#!/usr/bin/env python3
"""Shadow reviewer: adversarial code review of a git diff using a free local
Ollama model on the Pig. Outputs structured findings.

Usage:
  git diff HEAD~1 | python3 shadow-review.py            # diff from stdin
  python3 shadow-review.py --diff-file patch.diff
  python3 shadow-review.py --diff-file patch.diff --model qwen2.5-coder:7b
  python3 shadow-review.py --local --ollama-url http://127.0.0.1:11434 \\
      --diff-file patch.diff                            # run ON the Pig

Default path (from the cloud VM): the prompt is staged to the Pig with
pig-put and the Ollama call runs Pig-side via pigwsl-exec, since the free
models live in the Pig's ollama container.

Read-only: never modifies the repo, never commits, never pushes.
Threat classes come from redteam/ping-red-corpus.json.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(HERE, "ping-red-corpus.json")
PIG_PUT = os.path.expanduser("~/workspace/bin/pig-put")
PIG_EXEC = os.path.expanduser("~/workspace/bin/pigwsl-exec")

DEFAULT_MODEL = os.environ.get("SHADOW_MODEL", "qwen2.5-coder:14b")
MAX_DIFF_CHARS = 30000
OLLAMA_TIMEOUT = 900

THREAT_CLASSES = []
try:
    _c = json.load(open(CORPUS))
    THREAT_CLASSES = sorted({c["threat_class"] for c in _c["cases"]})
except Exception:
    pass

PROMPT_TMPL = """You are a white-hat adversarial code reviewer for the PING project. Review the unified diff below for security-relevant defects.

Threat classes to consider: {threats}.

Rules:
- Only flag issues with a CONCRETE exploit sketch grounded in the changed lines.
- Do not flag style, naming, or hypothetical issues without a diff-grounded path.
- Severity: critical | high | medium | low. Confidence: 0.0-1.0.
- Line numbers refer to the NEW file version (+ lines).

Output ONLY a JSON array, no prose. Each element:
{{"file": "path/to/file", "line": 123, "threat_class": "SSRF", "severity": "high",
  "finding": "one sentence", "exploit_sketch": "concrete steps", "confidence": 0.8}}
If no issues found, output [].

--- DIFF ---
{diff}
"""


def build_prompt(diff):
    if len(diff) > MAX_DIFF_CHARS:
        diff = (diff[:MAX_DIFF_CHARS]
                + "\n... [diff truncated at %d chars]" % MAX_DIFF_CHARS)
    return PROMPT_TMPL.format(threats=", ".join(THREAT_CLASSES), diff=diff)


def ollama_generate_local(url, model, prompt):
    import urllib.request
    req = urllib.request.Request(
        url.rstrip("/") + "/api/generate",
        data=json.dumps({"model": model, "prompt": prompt, "stream": False,
                         "options": {"temperature": 0.2,
                                     "num_ctx": 16384}}).encode("utf-8"),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as r:
        return json.loads(r.read().decode("utf-8"))["response"]


def ollama_generate_via_pig(model, prompt):
    ts = time.strftime("%Y%m%d-%H%M%S")
    local = os.path.join(tempfile.gettempdir(), "shadow-req-%s.json" % ts)
    remote = "/tmp/shadow-req-%s.json" % ts
    json.dump({"model": model, "prompt": prompt, "stream": False,
               "options": {"temperature": 0.2, "num_ctx": 16384}},
              open(local, "w"))
    try:
        p = subprocess.run([PIG_PUT, local, remote], capture_output=True,
                           text=True, timeout=300)
        if p.returncode != 0:
            raise RuntimeError("pig-put failed: " + p.stderr[:300])
        cmd = ("curl -s --max-time %d -X POST "
               "http://127.0.0.1:11434/api/generate "
               "-H 'Content-Type: application/json' -d @%s"
               % (OLLAMA_TIMEOUT, remote))
        p = subprocess.run([PIG_EXEC, cmd], capture_output=True, text=True,
                           timeout=OLLAMA_TIMEOUT + 120)
        if p.returncode != 0:
            raise RuntimeError("pigwsl-exec failed: " + p.stderr[:300])
        return json.loads(p.stdout)["response"]
    finally:
        try:
            os.unlink(local)
        except OSError:
            pass
        subprocess.run([PIG_EXEC, "rm -f " + remote],
                       capture_output=True, timeout=60)


def extract_findings(text):
    start, end = text.find("["), text.rfind("]")
    if start < 0 or end <= start:
        return []
    try:
        items = json.loads(text[start:end + 1])
    except Exception:
        return []
    out = []
    for it in items if isinstance(items, list) else []:
        if not isinstance(it, dict):
            continue
        out.append({
            "file": str(it.get("file", "?")),
            "line": it.get("line", 0),
            "threat_class": str(it.get("threat_class", "UNKNOWN")),
            "severity": str(it.get("severity", "low")),
            "finding": str(it.get("finding", ""))[:500],
            "exploit_sketch": str(it.get("exploit_sketch", ""))[:1000],
            "confidence": float(it.get("confidence", 0.0) or 0.0),
        })
    return out


def main(argv):
    ap = argparse.ArgumentParser(description="adversarial shadow review")
    ap.add_argument("--diff-file")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--local", action="store_true",
                    help="call Ollama directly (run on the Pig)")
    ap.add_argument("--ollama-url", default="http://127.0.0.1:11434")
    args = ap.parse_args(argv)

    if args.diff_file:
        diff = open(args.diff_file, encoding="utf-8",
                    errors="replace").read()
    else:
        diff = sys.stdin.read()
    if not diff.strip():
        print("no diff input", file=sys.stderr)
        return 2

    prompt = build_prompt(diff)
    print("reviewing %d diff chars with %s ..."
          % (len(diff), args.model), file=sys.stderr)
    if args.local:
        text = ollama_generate_local(args.ollama_url, args.model, prompt)
    else:
        text = ollama_generate_via_pig(args.model, prompt)
    findings = extract_findings(text)
    print(json.dumps(findings, indent=1))
    sev = {}
    for f in findings:
        sev[f["severity"]] = sev.get(f["severity"], 0) + 1
    print("%d findings %s" % (len(findings), sev), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
