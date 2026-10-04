#!/usr/bin/env python3
"""Nolan Voice Studio: paste text, hit Generate, hear it, see the file.

Tailnet only (binds 0.0.0.0:5010, no auth; reachable via Tailscale).
DASHSCOPE_API_KEY is read from the environment (or the Windows user env as a
fallback) once at startup. It is never printed, logged, or written anywhere.
"""
import os
import sys
import subprocess
import threading
import logging
from datetime import datetime, timezone

from flask import Flask, request, jsonify, send_file, render_template

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "output")
os.makedirs(OUT, exist_ok=True)

access_log = logging.getLogger("studio.access")
_access_hdl = logging.FileHandler(os.path.join(BASE, "access.log"))
_access_hdl.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
access_log.addHandler(_access_hdl)
access_log.setLevel(logging.INFO)

sys.path.insert(0, BASE)
from engines.alibaba import gen_vc, gen_plus, AlibabaError
from engines.local_qwen import gen_local


def get_key():
    k = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if k:
        return k
    try:
        r = subprocess.run(
            ["powershell.exe", "-NoProfile", "-Command",
             "[Environment]::GetEnvironmentVariable('DASHSCOPE_API_KEY','User')"],
            capture_output=True, text=True, timeout=60)
        k = r.stdout.strip()
        if k:
            return k
    except Exception:
        pass
    return ""


KEY = get_key()

INSTRUCTIONS = {
    "restrained": "Warm, natural conversational delivery.",
    "strong": "Expressive and animated delivery with clear emotional coloring.",
}

MAX_CHARS = 20000
CHUNK_CHARS = 1500  # per-request size; long texts are split on sentences
CHUNK_GAP_MS = 150  # silence between chunks so joins breathe

app = Flask(__name__)
gen_lock = threading.Lock()  # one generation at a time: protects quota and GPU


def scrub(s):
    if not s:
        return s
    s = str(s)
    if KEY:
        s = s.replace(KEY, "[REDACTED]")
    return s


@app.route("/")
def index():
    return render_template("index.html")


@app.before_request
def _log_request():
    access_log.info("REQ %s %s %s", request.remote_addr, request.method,
                    request.path)


@app.after_request
def _log_response(resp):
    access_log.info("RESP %s %s %s -> %s", request.remote_addr,
                    request.method, request.path, resp.status_code)
    return resp


@app.route("/health")
def health():
    return jsonify({"ok": True, "key_present": bool(KEY)})


@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True, silent=True) or {}
    engine = (data.get("engine") or "B").upper()
    text = (data.get("text") or "").strip()
    emotion = (data.get("emotion") or "restrained").lower()

    if engine not in ("A", "B", "C", "D"):
        return jsonify({"ok": False, "error": "Unknown engine"}), 400
    if not text:
        return jsonify({"ok": False, "error": "Type or paste some text first."}), 400
    if len(text) > MAX_CHARS:
        return jsonify({"ok": False,
                        "error": "Text too long. Keep it under 20000 characters."}), 400
    if engine in ("A", "B", "C") and not KEY:
        return jsonify({"ok": False,
                        "error": "Alibaba key not available on the server."}), 500

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    fname = "%s_%s.wav" % (ts, engine)
    path = os.path.join(OUT, fname)

    chunks = _split_chunks(text)
    access_log.info("GEN start engine=%s chars=%d chunks=%d from=%s", engine,
                    len(text), len(chunks), request.remote_addr)
    try:
        with gen_lock:
            if len(chunks) == 1:
                _gen_one(engine, emotion, chunks[0], path)
            else:
                _gen_chunked(engine, emotion, chunks, path)
    except AlibabaError as e:
        return jsonify({"ok": False, "error": scrub(str(e)),
                        "engine": engine}), 502
    except Exception as e:
        return jsonify({"ok": False, "error": scrub(str(e))[:300],
                        "engine": engine}), 500

    if not os.path.isfile(path) or os.path.getsize(path) < 1000:
        access_log.info("GEN fail engine=%s no-audio", engine)
        return jsonify({"ok": False, "error": "Generation produced no audio.",
                        "engine": engine}), 500
    access_log.info("GEN done engine=%s file=%s bytes=%d chunks=%d", engine,
                    fname, os.path.getsize(path), len(chunks))
    return jsonify({"ok": True, "audio_url": "/audio/" + fname,
                    "file_path": path, "engine": engine, "chars": len(text),
                    "chunks": len(chunks)})


def _split_chunks(text):
    """Split long text on sentence boundaries into <=CHUNK_CHARS pieces."""
    import re
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks, cur = [], ""
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if len(cur) + len(s) + 1 <= CHUNK_CHARS:
            cur = (cur + " " + s).strip()
        else:
            if cur:
                chunks.append(cur)
            while len(s) > CHUNK_CHARS:  # one monster sentence: hard split
                chunks.append(s[:CHUNK_CHARS])
                s = s[CHUNK_CHARS:]
            cur = s
    if cur:
        chunks.append(cur)
    return chunks or [text]


def _gen_one(engine, emotion, text, path):
    if engine == "A":
        gen_vc(KEY, text, path)
    elif engine in ("B", "C"):
        instr = INSTRUCTIONS["strong" if emotion == "strong" else "restrained"]
        gen_plus(KEY, text, instr, path)
    else:
        gen_local(text, path)


def _gen_chunked(engine, emotion, chunks, path):
    """Synthesize each chunk (carrier+trim applies per chunk, so no
    onset stumble repeats) and join with a short silence gap."""
    import struct
    import numpy as np
    import tempfile
    parts = []
    sr = channels = None
    try:
        for i, ch in enumerate(chunks):
            tmp = tempfile.mktemp(suffix=".wav", prefix="chunk%d_" % i,
                                  dir=OUT)
            _gen_one(engine, emotion, ch, tmp)
            with open(tmp, "rb") as f:
                data = f.read()
            di = data.find(b"data")
            fmt = data[12:36]
            c = struct.unpack("<H", fmt[10:12])[0]
            s = struct.unpack("<I", fmt[12:16])[0]
            b = struct.unpack("<H", fmt[22:24])[0]
            if b != 16:
                raise RuntimeError("chunk %d: unexpected bit depth" % i)
            if sr is None:
                sr, channels = s, c
            elif (s, c) != (sr, channels):
                raise RuntimeError("chunk %d: format drift" % i)
            parts.append(np.frombuffer(data[di + 8:], dtype=np.int16))
            os.remove(tmp)
    finally:
        for p in os.listdir(OUT):
            if p.startswith("chunk") and p.endswith(".wav"):
                try:
                    os.remove(os.path.join(OUT, p))
                except OSError:
                    pass
    gap = np.zeros(int(sr * CHUNK_GAP_MS / 1000), dtype=np.int16)
    joined = gap
    for p in parts:
        joined = np.concatenate([joined, p, gap])
    raw = joined.astype(np.int16).tobytes()
    head = struct.pack("<4sI4s4sIHHIIHH4sI",
                       b"RIFF", 36 + len(raw), b"WAVE",
                       b"fmt ", 16, 1, channels, sr,
                       sr * channels * 2, channels * 2, 16,
                       b"data", len(raw))
    with open(path, "wb") as f:
        f.write(head + raw)


@app.route("/audio/<filename>")
def audio(filename):
    name = os.path.basename(filename)
    if not name.endswith(".wav"):
        return jsonify({"ok": False, "error": "Not found"}), 404
    p = os.path.join(OUT, name)
    if not os.path.isfile(p):
        return jsonify({"ok": False, "error": "Not found"}), 404
    return send_file(p, mimetype="audio/wav")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5010, threaded=True)
