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

MAX_CHARS = 2000

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
                        "error": "Text too long. Keep it under 2000 characters."}), 400
    if engine in ("A", "B", "C") and not KEY:
        return jsonify({"ok": False,
                        "error": "Alibaba key not available on the server."}), 500

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    fname = "%s_%s.wav" % (ts, engine)
    path = os.path.join(OUT, fname)
    access_log.info("GEN start engine=%s chars=%d from=%s", engine, len(text),
                    request.remote_addr)

    try:
        with gen_lock:
            if engine == "A":
                gen_vc(KEY, text, path)
            elif engine in ("B", "C"):
                instr = INSTRUCTIONS["strong" if emotion == "strong" else "restrained"]
                gen_plus(KEY, text, instr, path)
            else:
                gen_local(text, path)
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
    access_log.info("GEN done engine=%s file=%s bytes=%d", engine, fname,
                    os.path.getsize(path))
    return jsonify({"ok": True, "audio_url": "/audio/" + fname,
                    "file_path": path, "engine": engine, "chars": len(text)})


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
