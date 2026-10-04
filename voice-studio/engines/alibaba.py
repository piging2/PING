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


def _download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "voice-studio/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    if len(data) < 1000:
        raise AlibabaError("downloaded audio too small (%d bytes)" % len(data))
    with open(path, "wb") as f:
        f.write(data)


def gen_vc(key, text, path):
    """Engine A: qwen3-tts-vc voice clone, plain text, no emotion controls."""
    dashscope.base_http_api_url = WS_HTTP
    try:
        resp = VC.call(model=VC_MODEL, text=text, api_key=key,
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
        data = synth.call(text, timeout_millis=180000)
    except Exception as e:
        raise AlibabaError("request failed: %s" % str(e)[:200])
    if isinstance(data, (bytearray, memoryview)):
        data = bytes(data)
    if not isinstance(data, bytes) or len(data) < 1000:
        raise AlibabaError("no usable audio returned")
    with open(path, "wb") as f:
        f.write(data)
