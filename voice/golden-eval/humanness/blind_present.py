#!/usr/bin/env python3
"""Blind A/B presentation scaffolding for NOLAN-HUMANNESS-GOLDEN-EVAL.

Pairs clips from two clip sets by relative path (e.g. clips/<category>/<nn>.wav),
presents each pair in randomized order, plays them, and logs the listener's
preference and 1-5 dimension scores. The engine mapping is NEVER shown during
the session; it lives only in the score log.

This is scaffolding for the future D-vs-A round. No engine logic beyond it.

Usage:
    python3 blind_present.py --a voice/golden-eval/humanness/clips_D \\
        --b voice/golden-eval/humanness/clips_A \\
        --label-a D --label-b A --out scores_20261004.jsonl [--seed 7]

Playback: uses ffplay if available, else aplay, else prints the file path
and waits for Enter so you can play it in any player.
"""
import argparse
import json
import os
import random
import shutil
import subprocess
import time

DIMENSIONS = [
    "voice_identity", "naturalness", "confidence", "intelligence",
    "emotional_fit", "prosody", "rhythm", "pauses", "pronunciation",
    "long_form_consistency", "listener_fatigue", "artifact_rate",
]


def list_clips(root):
    out = {}
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            if f.lower().endswith(".wav"):
                full = os.path.join(dirpath, f)
                out[os.path.relpath(full, root)] = full
    return out


def play(path):
    if shutil.which("ffplay"):
        subprocess.run(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", path])
    elif shutil.which("aplay"):
        subprocess.run(["aplay", path])
    else:
        print("  (no player found) play this file yourself: %s" % path)
        input("  press Enter when done...")


def prompt(msg, valid):
    while True:
        ans = input(msg).strip().lower()
        if ans in valid:
            return ans


def ask_scores(clip_label):
    print("  Score clip %s on the 12 dims, 1-5 each, space-separated." % clip_label)
    print("  (voice_identity naturalness confidence intelligence emotional_fit prosody")
    print("   rhythm pauses pronunciation long_form_consistency listener_fatigue artifact_rate)")
    while True:
        ans = input("  > ").strip()
        if ans == "":
            return None
        parts = ans.split()
        if len(parts) == len(DIMENSIONS) and all(
                p.isdigit() and 1 <= int(p) <= 5 for p in parts):
            return {d: int(p) for d, p in zip(DIMENSIONS, parts)}
        print("  need %d numbers 1-5, or blank to skip" % len(DIMENSIONS))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--a", required=True, help="first clip set dir")
    ap.add_argument("--b", required=True, help="second clip set dir")
    ap.add_argument("--label-a", default="A")
    ap.add_argument("--label-b", default="B")
    ap.add_argument("--out", default="scores.jsonl")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    clips_a = list_clips(args.a)
    clips_b = list_clips(args.b)
    pairs = sorted(set(clips_a) & set(clips_b))
    if not pairs:
        print("no matching relative paths between the two sets")
        return
    print("%d pairs found; logging to %s" % (len(pairs), args.out))

    rng = random.Random(args.seed)
    with open(args.out, "a") as logf:
        for rel in pairs:
            order = ["A", "B"]
            rng.shuffle(order)
            pos = {"1": order[0], "2": order[1]}
            files = {"A": clips_a[rel], "B": clips_b[rel]}
            print("\n=== pair: %s ===" % rel)
            play(files[pos["1"]])
            print("--- clip 2 ---")
            play(files[pos["2"]])
            pref = prompt("preference [1/2/tie]: ", ("1", "2", "tie", "t"))
            pref = "tie" if pref == "t" else pref
            s1 = ask_scores("1")
            s2 = ask_scores("2")
            entry = {
                "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                "pair": rel,
                "labels": {"A": args.label_a, "B": args.label_b},
                "presented": pos,          # "1"->"A"/"B": the blind mapping
                "preference": pref,
                "scores_1": s1,
                "scores_2": s2,
            }
            logf.write(json.dumps(entry) + "\n")
            logf.flush()
    if prompt("\nreveal mapping now? [y/n]: ", ("y", "n")) == "y":
        print("(mapping is in %s, presented field per pair)" % args.out)
    print("done.")


if __name__ == "__main__":
    main()
