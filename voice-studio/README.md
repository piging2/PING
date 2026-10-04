# Nolan Voice Studio

Paste text, hit Generate, hear it, see the file. Tailnet only.

- Server: http://100.79.154.43:5010 (Flask, port 5010, on the Pig at /home/nolan/voice-studio/)
- Engines: A = Alibaba qwen3-tts-vc voice clone (plain text). B/C = Alibaba
  qwen-audio-3.0-tts-plus with restrained/strong instruction. D = local
  Qwen3-TTS via http://127.0.0.1:5000/clone.
- Outputs: /home/nolan/voice-studio/output/<timestamp>_<engine>.wav
- DASHSCOPE_API_KEY from environment only. Free Quota Only stays on.
- Restart: cd /home/nolan/voice-studio && setsid nohup python3 app.py < /dev/null >> studio.log 2>&1 &
