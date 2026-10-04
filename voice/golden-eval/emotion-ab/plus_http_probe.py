#!/usr/bin/env python3
"""One-off: test HTTP transport for qwen-audio-3.0-tts-plus."""
import os, subprocess

r = subprocess.run(
    ["powershell.exe", "-NoProfile", "-Command",
     "[Environment]::GetEnvironmentVariable('DASHSCOPE_API_KEY','User')"],
    capture_output=True, text=True, timeout=60)
k = r.stdout.strip()
assert k, "no key"

import dashscope
from dashscope.audio.http_tts.http_speech_synthesizer import HttpSpeechSynthesizer
dashscope.base_http_api_url = "https://ws-02xuedm070ye1xu5.ap-southeast-1.maas.aliyuncs.com/api/v1"
resp = HttpSpeechSynthesizer.call(
    model="qwen-audio-3.0-tts-plus",
    text="Hello, this is a short test.",
    voice="qwen-audio-3.0-tts-plus-nolanexp1-03cfef52776e4ea2b09d11f6f1935de8",
    workspace="ws-02xuedm070ye1xu5", api_key=k,
    instruction="Calm, neutral, informative delivery.", language_hints=["en"])
print("status:", resp.status_code)
print("code:", getattr(resp, "code", None))
print("msg:", str(getattr(resp, "message", ""))[:200])
out = resp.output
au = getattr(getattr(out, "audio", None), "url", None)
print("has_audio_url:", bool(au))
if au:
    import urllib.request
    with urllib.request.urlopen(au, timeout=60) as ar:
        data = ar.read()
    print("audio_bytes:", len(data), "riff:", data[:4])
