"""Alibaba Model Studio engines (A = voice clone, B/C = expressive Plus).

The API key is passed in by the caller and is never printed, logged, or stored.
Free Quota Only is enforced in the Alibaba console; quota errors are surfaced
to the caller as AlibabaError with the provider message intact.
"""
import urllib.request

import dashscope
from dashscope.audio.qwen_tts import SpeechSynthesizer as VC
from dashscope.audio.tts_v2 import SpeechSynthesizer as TTS2
from dashscope.audio.tts_v2.speech_synthesizer import AudioFormat

WS = "ws-02xuedm070ye1xu5"
WS_HTTP = "https://ws-02xuedm070ye1xu5.ap-southeast-1.maas.aliyuncs.com/api/v1"
WS_WSS = "wss://ws-02xuedm070ye1xu5.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/inference"

VC_MODEL = "qwen3-tts-vc-2026-01-22"
VC_VOICE = "qwen-tts-vc-nolan-voice-20261004105757963-6964"

PLUS_MODEL = "qwen-audio-3.0-tts-plus"
PLUS_VOICE = "qwen-audio-3.0-tts-plus-nolanexp1-03cfef52776e4ea2b09d11f6f1935de8"


class AlibabaError(Exception):
    """Honest provider-side failure (quota, auth, bad request, empty audio)."""


# The qwen3-tts-vc model fumbles the first ~0.5s of most generations
# (stretched low-confidence first word). A sacrificial "Okay. " carrier
# absorbs the stumble; we cut it off in the pause that follows.
CARRIER = "Okay. "


def _trim_carrier(path):
    """Cut the sacrificial carrier off the front of a generation.

    The carrier ("Okay. ") is always followed by the model's natural
    end-of-sentence pause. That pause is the LONGEST quiet run in the
    first 2.5s (inter-word gaps are far shorter), so we find the
    longest contiguous sub -42dB run between 0.3s and 2.5s, cut 30%
    into it, and apply a 15ms fade-in to kill clicks. Rewrites the
    file with a correct WAV header. Fail-safe: if no run of >=150ms
    is found the file is left untouched.
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
    nframes = len(raw) // (channels * 2)
    head = struct.pack("<4sI4s4sIHHIIHH4sI",
                       b"RIFF", 36 + len(raw), b"WAVE",
                       b"fmt ", 16, 1, channels, sr,
                       sr * channels * 2, channels * 2, 16,
                       b"data", len(raw))
    with open(path, "wb") as f:
        f.write(head + raw)
    return True


def _download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "voice-studio/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    if len(data) < 1000:
        raise AlibabaError("downloaded audio too small (%d bytes)" % len(data))
    with open(path, "wb") as f:
        f.write(data)


def gen_vc(key, text, path):
    """Engine A: qwen3-tts-vc voice clone, plain text, no emotion controls.

    Prepends the CARRIER to absorb the model's onset stumble, then
    trims it off. The returned file starts cleanly on the real text.
    """
    dashscope.base_http_api_url = WS_HTTP
    try:
        resp = VC.call(model=VC_MODEL, text=CARRIER + text, api_key=key,
                       workspace=WS, voice=VC_VOICE)
    except Exception as e:
        raise AlibabaError("request failed: %s" % str(e)[:200])
    if resp.status_code != 200:
        raise AlibabaError("HTTP %s: %s %s" % (
            resp.status_code, getattr(resp, "code", ""),
            str(getattr(resp, "message", ""))[:200]))
    out = resp.output or {}
    aurl = (out.get("audio") or {}).get("url") if isinstance(out, dict) else None
    if not aurl and hasattr(out, "audio"):
        aurl = getattr(out.audio, "url", None)
    if not aurl:
        raise AlibabaError("no audio URL in provider response")
    _download(aurl, path)  # URLs are signed and expire; fetch immediately
    _trim_carrier(path)  # fail-safe: no-op when no silence window found


def gen_plus(key, text, instruction, path):
    """Engines B/C: qwen-audio-3.0-tts-plus with an instruction string.

    The instruction is the emotion mechanism: it is passed as the
    `instruction` parameter of the tts_v2 SpeechSynthesizer and steers
    delivery style. Restrained vs strong = different instruction text.
    """
    dashscope.api_key = key
    try:
        synth = TTS2(model=PLUS_MODEL, voice=PLUS_VOICE,
                     format=AudioFormat.WAV_24000HZ_MONO_16BIT,
                     instruction=instruction, language_hints=["en"],
                     workspace=WS, url=WS_WSS)
        data = synth.call(CARRIER + text, timeout_millis=180000)
    except Exception as e:
        raise AlibabaError("request failed: %s" % str(e)[:200])
    if isinstance(data, (bytearray, memoryview)):
        data = bytes(data)
    if not isinstance(data, bytes) or len(data) < 1000:
        raise AlibabaError("no usable audio returned")
    with open(path, "wb") as f:
        f.write(data)
    _trim_carrier(path)  # fail-safe: no-op when no silence window found
