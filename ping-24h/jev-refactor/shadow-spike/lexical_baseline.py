#!/usr/bin/env python3
"""Deterministic lexical retrieval baseline for E1 (no Jev, no network).

Index: repo file list. Each file -> tokens from path segments + content head.
Score: weighted token overlap between question tokens and file tokens.
Self-check: runs the baseline over e1-corpus.json and reports top-k hit rates.
"""
import json
import re
import sys
from pathlib import Path

REPO = Path("/home/hatch/workspace/crx-autonomous-missions/repos/openhands-sdk")
SPIKE = Path("/home/hatch/workspace/ping-24h/jev-refactor/shadow-spike")

TOKEN_RE = re.compile(r"[a-z0-9]+")
STOP = set("where which what how does do the a an is are of in to for on and or with by from at as file files defined define implement implements implemented".split())


def tokenize(text):
    toks = []
    # split camelCase and snake_case
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text).replace("_", " ").replace("-", " ").replace("/", " ").replace(".", " ")
    for t in TOKEN_RE.findall(text.lower()):
        if t not in STOP and len(t) > 1:
            toks.append(t)
    return toks


def build_index():
    files = []
    for p in sorted(REPO.rglob("*")):
        if not p.is_file():
            continue
        rel = str(p.relative_to(REPO))
        if rel.startswith(".git/") or "__pycache__" in rel:
            continue
        try:
            head = p.read_text(encoding="utf-8", errors="replace")[:4000]
        except OSError:
            head = ""
        files.append({
            "path": rel,
            "path_tokens": tokenize(rel),
            "content_tokens": tokenize(head),
        })
    return files


def score_file(qtoks, f):
    # path tokens weigh 3x; content tokens 1x. Score = sum over question tokens
    # of weighted presence (binary per token to avoid stuffing).
    pt, ct = set(f["path_tokens"]), set(f["content_tokens"])
    s = 0.0
    for t in set(qtoks):
        if t in pt:
            s += 3.0
        elif t in ct:
            s += 1.0
    return s


def retrieve(question, index, k=10):
    qtoks = tokenize(question)
    ranked = sorted(index, key=lambda f: score_file(qtoks, f), reverse=True)
    return [f["path"] for f in ranked[:k]]


def main():
    index = build_index()
    print(f"index files: {len(index)}", file=sys.stderr)
    corpus = json.loads((SPIKE / "e1-corpus.json").read_text())
    hits1 = hits3 = hits10 = 0
    n = len(corpus["questions"])
    for q in corpus["questions"]:
        top10 = retrieve(q["question"], index, 10)
        ans = q["answer_files"][0]
        if ans == top10[0]:
            hits1 += 1
        if ans in top10[:3]:
            hits3 += 1
        if ans in top10:
            hits10 += 1
    print(f"E1 lexical baseline self-check: n={n} top1={hits1} top3={hits3} top10={hits10}")
    print(f"  top1_rate={hits1/n:.3f} top3_rate={hits3/n:.3f} top10_rate={hits10/n:.3f}")


if __name__ == "__main__":
    main()
