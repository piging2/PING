"""Engine D: local Qwen3-TTS on the Pig (port 5000, POST /clone).

Parameter shape (proven by the earlier local baseline):
  multipart POST to http://127.0.0.1:5000/clone
    files: reference_audio = ("ref.wav", <wav bytes>, "audio/wav")
    data:  text = the text to speak
           ref_text = transcript of the reference audio
Returns raw audio bytes on HTTP 200.
"""
import requests

from .audio_fix import CARRIER, trim_carrier

REF_WAV = "/home/nolan/workspace/voice/inventory/nolan-clone-ref-18s.wav"
REF_TEXT = ("Using these will explore how these pieces fit together, where they overlap, "
            "where they conflict and how they can be organized into a constitutional "
            "architecture built around replay truth. The goal is to interconnect more APIs. "
            "The goal is to understand how open source tools,")


def gen_local(text, path):
    """Engine D. Prepends the sacrificial carrier (see audio_fix) because
    the local model hallucinates leading words on a bare text start."""
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
    trim_carrier(path)  # fail-safe: no-op when no silence window found
