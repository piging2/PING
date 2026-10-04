#!/usr/bin/env python3
"""8-condition x 4-engine emotional A/B for Nolan voice (corrected rewrite).

A = Qwen3-TTS VC Nolan (fidelity baseline, no emotion controls)
B = qwen-audio-3.0-tts-plus Nolan (RESTRAINED instruction)
C = qwen-audio-3.0-tts-plus Nolan (STRONGER instruction)
D = local Qwen3-TTS Nolan (no emotion controls)

DASHSCOPE_API_KEY is read from the Windows user environment in-process only.
It is never printed, logged, or written anywhere.

Usage:
  python3 emotion_ab_4engine.py [engines...] [only-emotion-id]
  e.g. python3 emotion_ab_4engine.py B neutral   (smoke test: B leg, neutral only)
       python3 emotion_ab_4engine.py             (full 8x4 run)

Outputs progress lines plus a metadata JSON document to stdout at the end.
"""
import os, sys, json, time, hashlib, subprocess
from datetime import datetime, timezone


def get_key():
    r = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command",
         "[Environment]::GetEnvironmentVariable('DASHSCOPE_API_KEY','User')"],
        capture_output=True, text=True, timeout=60)
    k = r.stdout.strip()
    if not k:
        raise RuntimeError("DASHSCOPE_API_KEY not found in Windows user env")
    return k


KEY = get_key()
os.environ["DASHSCOPE_API_KEY"] = KEY

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(SCRIPT_DIR, "emotion_ab_manifest.json")
OUT = "/home/nolan/voice-factory-data/emotion-ab-out"
WS = "ws-02xuedm070ye1xu5"
WS_HTTP = "https://ws-02xuedm070ye1xu5.ap-southeast-1.maas.aliyuncs.com/api/v1"
WS_WSS = "wss://ws-02xuedm070ye1xu5.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/inference"
VC_MODEL = "qwen3-tts-vc-2026-01-22"
VC_VOICE = "qwen-tts-vc-nolan-voice-20261004105757963-6964"
PLUS_MODEL = "qwen-audio-3.0-tts-plus"
PLUS_VOICE = "qwen-audio-3.0-tts-plus-nolanexp1-03cfef52776e4ea2b09d11f6f1935de8"
REF_WAV = "/home/nolan/workspace/voice/inventory/nolan-clone-ref-18s.wav"
REF_TEXT = ("Using these will explore how these pieces fit together, where they overlap, "
            "where they conflict and how they can be organized into a constitutional "
            "architecture built around replay truth. The goal is to interconnect more APIs. "
            "The goal is to understand how open source tools,")
CHAR_BUDGET = 10000

results = {"timestamp": datetime.now(timezone.utc).isoformat(),
           "runs": [], "char_budget": CHAR_BUDGET}
chars_used = 0


def scrub(s):
    return str(s).replace(KEY, "[REDACTED]") if s else s


def rec(engine, cond, ok, ms, path=None, req_id=None, err=None, chars=0, extra=None):
    r = {"engine": engine, "condition": cond, "ok": ok,
         "latency_ms": ms, "path": path, "request_id": req_id,
         "error": scrub(err), "chars": chars}
    if extra:
        r.update(extra)
    results["runs"].append(r)
    return r


def detect_ext(data):
    if data[:4] == b"RIFF":
        return "wav"
    if data[:3] == b"ID3" or (len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0):
        return "mp3"
    return "bin"


def save(data, path):
    with open(path, "wb") as f:
        f.write(data)
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def gen_a(cond):
    import dashscope
    from dashscope.audio.qwen_tts import SpeechSynthesizer
    dashscope.base_http_api_url = WS_HTTP
    text = cond["text"]
    t0 = time.time()
    try:
        resp = SpeechSynthesizer.call(model=VC_MODEL, text=text, api_key=KEY,
                                      workspace=WS, voice=VC_VOICE)
        ms = int((time.time() - t0) * 1000)
        if resp.status_code != 200:
            return rec("A", cond["id"], False, ms,
                       err="HTTP %s: %s %s" % (resp.status_code, resp.code,
                                              str(resp.message)[:200]),
                       chars=len(text))
        out = resp.output or {}
        aurl = (out.get("audio") or {}).get("url") if isinstance(out, dict) else None
        if not aurl and hasattr(out, "audio"):
            aurl = getattr(out.audio, "url", None)
        if not aurl:
            return rec("A", cond["id"], False, ms, err="NO_AUDIO_URL", chars=len(text))
        import urllib.request
        with urllib.request.urlopen(urllib.request.Request(aurl), timeout=120) as ar:
            data = ar.read()
        if len(data) < 1000:
            return rec("A", cond["id"], False, ms, err="AUDIO_TOO_SMALL", chars=len(text))
        ext = detect_ext(data)
        p = "%s/%s_A_vc.%s" % (OUT, cond["id"], ext)
        info = save(data, p)
        return rec("A", cond["id"], True, ms, path=p, req_id=resp.request_id,
                   chars=len(text), extra=info)
    except Exception as e:
        return rec("A", cond["id"], False, int((time.time() - t0) * 1000),
                   err=str(e)[:300], chars=len(text))


def gen_plus(tag, cond, instruction):
    global chars_used
    import dashscope
    from dashscope.audio.tts_v2 import SpeechSynthesizer as TTS2
    from dashscope.audio.tts_v2.speech_synthesizer import AudioFormat
    dashscope.api_key = KEY
    text = cond["text"]
    need = len(text) + len(instruction)
    if chars_used + need > CHAR_BUDGET:
        return rec(tag, cond["id"], False, 0, err="CHAR_BUDGET_EXCEEDED", chars=0)
    t0 = time.time()
    try:
        synth = TTS2(model=PLUS_MODEL, voice=PLUS_VOICE,
                     format=AudioFormat.WAV_24000HZ_MONO_16BIT,
                     instruction=instruction, language_hints=["en"],
                     workspace=WS, url=WS_WSS)
        data = synth.call(text, timeout_millis=180000)
        ms = int((time.time() - t0) * 1000)
        chars_used += need
        if isinstance(data, (bytearray, memoryview)):
            data = bytes(data)
        if not isinstance(data, bytes) or len(data) < 1000:
            return rec(tag, cond["id"], False, ms,
                       err="BAD_AUDIO_RETURN: %s" % type(data).__name__, chars=need)
        p = "%s/%s_%s.wav" % (OUT, cond["id"], tag)
        info = save(data, p)
        info["detected_format"] = detect_ext(data)
        return rec(tag, cond["id"], True, ms, path=p,
                   req_id=getattr(synth, "last_request_id", None),
                   chars=need, extra=info)
    except Exception as e:
        return rec(tag, cond["id"], False, int((time.time() - t0) * 1000),
                   err=str(e)[:300], chars=need)


def gen_d(cond):
    import requests
    text = cond["text"]
    t0 = time.time()
    try:
        with open(REF_WAV, "rb") as f:
            r = requests.post("http://localhost:5000/clone",
                              files={"reference_audio": ("ref.wav", f, "audio/wav")},
                              data={"text": text, "ref_text": REF_TEXT},
                              timeout=300)
        ms = int((time.time() - t0) * 1000)
        if r.status_code != 200:
            return rec("D", cond["id"], False, ms,
                       err="HTTP %d: %s" % (r.status_code, r.text[:200]),
                       chars=len(text))
        if len(r.content) < 1000:
            return rec("D", cond["id"], False, ms, err="AUDIO_TOO_SMALL",
                       chars=len(text))
        p = "%s/%s_D_local.wav" % (OUT, cond["id"])
        info = save(r.content, p)
        info["detected_format"] = detect_ext(r.content)
        return rec("D", cond["id"], True, ms, path=p, chars=len(text), extra=info)
    except Exception as e:
        return rec("D", cond["id"], False, int((time.time() - t0) * 1000),
                   err=str(e)[:300], chars=len(text))


def main():
    os.makedirs(OUT, exist_ok=True)
    with open(MANIFEST) as f:
        conds = json.load(f)["conditions"]
    args = sys.argv[1:]
    engines = [a for a in args if a in ("A", "B", "C", "D")] or ["A", "B", "C", "D"]
    only = [a for a in args if a not in ("A", "B", "C", "D")]
    only_id = only[0] if only else None
    for eng in engines:
        for c in conds:
            if only_id and c["id"] != only_id:
                continue
            if eng == "A":
                r = gen_a(c)
            elif eng == "B":
                r = gen_plus("B_plus_restrained", c, c["instruction_restrained"])
            elif eng == "C":
                r = gen_plus("C_plus_strong", c, c["instruction_strong"])
            elif eng == "D":
                r = gen_d(c)
            status = "OK" if r["ok"] else "FAIL"
            detail = "" if r["ok"] else " " + str(r["error"])[:120]
            print("[%s] %s: %s (%d ms)%s" % (eng, c["id"], status, r["latency_ms"], detail),
                  flush=True)
    results["chars_used_plus"] = chars_used
    results["ok"] = all(r["ok"] for r in results["runs"])
    print(json.dumps(results))


if __name__ == "__main__":
    main()
