# P2: CosyVoice — read-only dependency proof + disposition (2026-09-24)

## Dependency proof (read-only, verified)

**Nothing authorized in production depends on cosyvoice-tts.**

* Code search (workspace py/js/ts/sh/md, excluding agent noise): the only
  references are `voice/inventory/REPORT.md` (provenance note) and historical
  docs. No service, cron, or engagement pass calls it.
* Pig probes: no references to `:5001`/cosyvoice in `/home/nolan/projects/ping/src`
  (the :3100 app) or in the running `ping-gateway` image's live code paths
  (only doc JSON mentions vault; qdrant/vault/5001 absent from /app code).
* The only caller-shaped code is `/home/nolan/voice-factory-data/scripts/`
  (Nolan's own experiment scripts: `cosyvoice_app.py`,
  `v011_cosyvoice_deployment_strategy.py`).
* WSL crontab: no cosyvoice entries. No scheduled job touches it.
* Standing user rule (alignment synthesis): "Voice cloning stays paused
  until he gives direction; when resumed, build on the existing Pig setup,
  never a parallel cloning system."

Conclusion: zero production consumers. It is Nolan's personal TTS/voice-
cloning experiment rig, currently idle.

## Live state

* Container `cosyvoice-tts`, image `qwen3-tts-docker-cosyvoice-tts`
  (built 2026-09-08/10 during Nolan's Qwen3-TTS voice-factory experiments).
* **Recreated 2026-09-24 06:30 MDT** (container Created timestamp; Up ~5h at
  11:15 MDT probe). Someone stood it back up this morning; do not assume
  abandonment.
* Serving: Flask dev server on :5001 (host-published), root returns 404
  (HTTP alive). Restart policy `unless-stopped`.
* Resources: **1.787 GiB RAM**, CPU 0.01% (idle).
* Binds: `/mnt/c/Users/nolan/Videos` (ro), `/mnt/c/Users/nolan/OneDrive/
  Pictures/Camera Roll` (ro), `/home/nolan/voice-factory-data/scripts` (rw),
  `/home/nolan/cosyvoice-models` (rw), plus /host-phone-recordings.
  Data and models live OUTSIDE the container; the container itself is
  stateless-ish.

## Safe-stop procedure (prepared, NOT executed)

```bash
docker stop cosyvoice-tts            # reversible; ~2s
# resources reclaimed: ~1.8 GiB RAM, :5001 freed
```

Restart path (exact reversal):

```bash
docker start cosyvoice-tts          # image + binds persist; unless-stopped
# verify: curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/
```

Full rebuild path if the container is ever removed: image
`qwen3-tts-docker-cosyvoice-tts` exists locally; recreate with the same
binds (recorded above) and `--restart unless-stopped -p 5001:5001`.
Model/data dirs are host binds, so nothing is lost by container removal.
DO NOT DELETE the image or the host dirs (`/home/nolan/cosyvoice-models`,
`/home/nolan/voice-factory-data`) under any circumstance in this lane.

## Disposition

**Do NOT stop it now.** Reasons:

1. It was deliberately recreated TODAY (2026-09-24 06:30 MDT). Stopping it
   would fight whoever stood it up, possibly Nolan himself before school.
2. Voice cloning is "paused until he gives direction", and the standing
   instruction says a resumed effort builds on THIS setup. The setup must
   exist to be built on.
3. 1.8 GiB on a 31 GiB host is not an emergency.

**The one exact decision** (in p2-decisions.md): Nolan confirms whether
cosyvoice-tts should stay up (default: yes, it was just recreated) or be
stopped to reclaim ~1.8 GiB RAM. Either answer is reversible in seconds.
