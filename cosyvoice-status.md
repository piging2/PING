# CosyVoice — stopped 2026-09-24

## Dependency check (read-only, before stop)

- No references to cosyvoice/TTS in `runtime/`, `gateway/`, `ping-runtime/`
  (PING codebase). The only "5001" hits are the unrelated stopped newsletter
  dashboard's own default port (`brainos/newsletter/`, not running).
- No running container carries COSY/TTS/5001 env references.
- No live consumer found. Voice cloning is separately paused per standing
  directive; nothing authorized uses this service.

## Action

- `docker stop cosyvoice-tts` — container stopped, NOT removed, NOT uninstalled.
- All data lives on host bind mounts (untouched):
  - /home/nolan/cosyvoice-models → /app/models (rw)
  - /home/nolan/voice-factory-data/{references,voice-output,output,experiments,voice-corpus,voice-candidates,voice-profiles} (rw)
  - /mnt/c/Users/nolan/Videos → /host-videos (ro)
  - /mnt/c/Users/nolan/OneDrive/Pictures/Camera Roll → /host-phone-recordings (ro)
- Image retained: qwen3-tts-docker-cosyvoice-tts (sha256:93ee189e0d3b4d2c1d7d306fb3feef715569c84223f3189c5c6807d6ee5180a6)

## Restart procedure (exact)

From the compose labels on the container:

```
cd /mnt/c/Users/nolan/qwen3-tts-docker
docker compose -f docker-compose.cosyvoice.yml up -d
```

(Project: qwen3-tts-docker, service: cosyvoice-tts, port 5001, restart
unless-stopped. `docker start cosyvoice-tts` also works since the container
was stopped, not removed.)

## Verdict

STOPPED. Evidence: no authorized consumer. Data and config preserved.
Restart is one compose command.
