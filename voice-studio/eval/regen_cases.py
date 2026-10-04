#!/usr/bin/env python3
"""Regenerate specific onset-stress cases via /clone (for bad generations)."""
import os, sys, wave
import numpy as np
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from onset_stress_50 import CASES  # noqa

# Pig-side paths
EVAL = "/home/nolan/voice-studio/eval/onset50"
REF = "/home/nolan/voice-studio/refs/nolan-ref-15s.wav"
REF_TEXT = ("Using these will explore how these pieces fit together, where they overlap, "
            "where they conflict and how they can be organized into a constitutional "
            "architecture built around replay truth. The goal is to interconnect more APIs.")
CARRIER = "Okay. "
URL = "http://127.0.0.1:5000/clone"

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "engines"))
from audio_fix import cut_carrier_aligned  # noqa

def main():
    cases = [int(x) for x in sys.argv[1:]]
    for c in cases:
        text = CASES[c - 1]
        print("regenerating case %02d: %s" % (c, text[:60]), flush=True)
        with open(REF, "rb") as f:
            files = {"reference_audio": ("ref.wav", f, "audio/wav")}
            data = {"text": CARRIER + text, "ref_text": REF_TEXT}
            r = requests.post(URL, files=files, data=data, timeout=300)
        r.raise_for_status()
        raw_path = os.path.join(EVAL, "onset50", "raw", "case%02d.wav" % c)
        with open(raw_path, "wb") as f:
            f.write(r.content)
        # trim to final
        fin_path = os.path.join(EVAL, "onset50", "final", "case%02d.wav" % c)
        import shutil
        shutil.copy(raw_path, fin_path)
        ok = cut_carrier_aligned(fin_path)
        print("  cut_ok=%s" % ok, flush=True)
    print("done")

if __name__ == "__main__":
    main()
