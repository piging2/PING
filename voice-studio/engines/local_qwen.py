"""Engine D: local Qwen3-TTS on the Pig (port 5000, POST /clone).

Parameter shape (proven by the earlier local baseline):
  multipart POST to http://127.0.0.1:5000/clone
    files: reference_audio = ("ref.wav", <wav bytes>, "audio/wav")
    data:  text = the text to speak
           ref_text = transcript of the reference audio
Returns raw audio bytes on HTTP 200.

Onset design (2026-10-04 benchmark, 20+ generations):
  The old 18s reference ended mid-word ("...how open source tools,") and the
  model completed the thought by hallucinating "tools," before the real text.
  A 39s reference ending on a complete sentence stopped the hallucination but
  made the model DROP leading words on shorter texts (deterministic per text).
  The 15s reference (0-15s of the same recording, ending "...interconnect
  more APIs.") speaks every text completely; a sacrificial "Okay. " carrier
  absorbs the residual onset instability (one "Guys," hallucination in 4
  carrier-free trials, zero in 5 carrier trials).
  The carrier is removed by forced alignment (cut_carrier_aligned): the model
  runs the carrier straight into the text with no pause, so the old
  pause-based trim cannot cut it. Alignment finds the carrier word's end
  timestamp and cuts there; falls back to pause-trim, then fail-safe no-op.
"""
import requests

from .audio_fix import CARRIER, cut_carrier_aligned

REF_WAV = "/home/nolan/voice-studio/refs/nolan-ref-15s.wav"
REF_TEXT = ("Using these will explore how these pieces fit together, where they overlap, "
            "where they conflict and how they can be organized into a constitutional "
            "architecture built around replay truth. The goal is to interconnect more APIs.")


def gen_local(text, path):
    """Engine D. Sacrificial carrier + alignment-based carrier removal."""
    with open(REF_WAV, "rb") as f:
        r = requests.post("http://127.0.0.1:5000/clone",
                          files={"reference_audio": ("ref.wav", f, "audio/wav")},
                          data={"text": CARRIER + text, "ref_text": REF_TEXT},
                          timeout=300)
    if r.status_code != 200:
        raise RuntimeError("local clone HTTP %d: %s" % (r.status_code, r.text[:200]))
    if len(r.content) < 1000:
        raise RuntimeError("local clone returned too little audio")
    with open(path, "wb") as f:
        f.write(r.content)
    cut_carrier_aligned(path)  # fail-safe: no-op when alignment+trim both miss
