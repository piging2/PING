"""Shared onset-stumble fix for TTS engines.

Both the Alibaba qwen3-tts-vc model and the local Qwen3-TTS /clone endpoint
fumble their first generated tokens: Alibaba stretches the first word
(low-confidence, ~0.5s), the local model hallucinates whole leading words
(e.g. "tools," before the real text). A sacrificial carrier word absorbs
the instability; we then cut it off at the pause that follows it.

The post-carrier pause is the LONGEST quiet run in the first 2.5s
(inter-word gaps are far shorter), which makes the trim robust to the
pause length varying between generations.
"""

CARRIER = "Okay. "


def trim_carrier(path):
    """Cut the sacrificial carrier off the front of a generation.

    Finds the longest contiguous sub -42dB run between 0.3s and 2.5s,
    cuts 30% into it, applies a 15ms fade-in to kill clicks, and
    rewrites the file with a correct WAV header. Fail-safe: if no run
    of >=150ms is found the file is left untouched. Returns True when
    a trim was applied.
    """
    import numpy as np
    import struct
    with open(path, "rb") as f:
        data = f.read()
    di = data.find(b"data")
    if di < 0 or len(data) < 44:
        return False
    fmt = data[12:36]
    channels = struct.unpack("<H", fmt[10:12])[0]
    sr = struct.unpack("<I", fmt[12:16])[0]
    bits = struct.unpack("<H", fmt[22:24])[0]
    if bits != 16:
        return False
    pcm = np.frombuffer(data[di + 8:], dtype=np.int16).copy().astype(np.float32)
    step = int(sr * 0.05)
    frames = []
    end = min(int(sr * 2.5), len(pcm) - step)
    for k in range(int(sr * 0.3), end, step):
        seg = pcm[k:k + step]
        frames.append(20 * np.log10(float(np.sqrt((seg ** 2).mean())) / 32768.0 + 1e-9))
    best = (0, 0, 0)  # start_frame, end_frame, length_frames
    cur = None
    for idx, db in enumerate(frames):
        if db < -42:
            cur = [idx, idx] if cur is None else [cur[0], idx]
        elif cur is not None:
            runlen = cur[1] - cur[0] + 1
            if runlen > best[2]:
                best = (cur[0], cur[1], runlen)
            cur = None
    if cur is not None:
        runlen = cur[1] - cur[0] + 1
        if runlen > best[2]:
            best = (cur[0], cur[1], runlen)
    if best[2] < 3:  # need >=150ms of quiet
        return False
    cut_frame = best[0] + int(best[2] * 0.3)
    cut = int(sr * 0.3) + cut_frame * step
    if cut > len(pcm) - sr:
        return False
    out = pcm[cut:].astype(np.float32)
    nfade = int(sr * 0.015)
    if len(out) > nfade:
        out[:nfade] *= np.linspace(0, 1, nfade)
    raw = np.clip(out, -32768, 32767).astype(np.int16).tobytes()
    head = struct.pack("<4sI4s4sIHHIIHH4sI",
                       b"RIFF", 36 + len(raw), b"WAVE",
                       b"fmt ", 16, 1, channels, sr,
                       sr * channels * 2, channels * 2, 16,
                       b"data", len(raw))
    with open(path, "wb") as f:
        f.write(head + raw)
    return True
