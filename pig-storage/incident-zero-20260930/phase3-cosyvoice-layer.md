# Incident Zero Phase 3 — cosyvoice-tts 15 GB Writable Layer Investigation
Date: 2026-09-30 ~06:14-06:40 MDT. Container `cosyvoice-tts` (image `qwen3-tts-docker-cosyvoice-tts`) RUNNING throughout; no stop/restart.

## Result
- Writable layer BEFORE: **15 GB** (virtual 24 GB)
- Writable layer AFTER: **11.8 GB** (virtual 20.8 GB)
- Reclaimed: **~3.2 GB**, service healthy before and after.

## What the 15 GB was (exact breakdown, read-only evidence)
Method: `docker ps -s` for layer size; `docker diff` (44,263 entries: 29,698 added, 14,530 changed, 35 deleted);
`du` inside the running container vs a one-shot `docker run --rm` of the base image to isolate writable-layer growth.

| Component | Writable-layer growth | Nature |
|---|---|---|
| `/root/.cache/modelscope` | **+5.45 GiB** | modelscope download cache: `iic/CosyVoice-300M` (5.4 GB) + `pengzhendong/wetext` (52 MB) |
| `/root/.cache/pip` | **+2.9 GiB** (merged 4.2 GiB incl. 1.24 GiB baked into image) | pip wheel/http cache from runtime `pip install` — **RECLAIMED** |
| `/root/.cache/matplotlib` | 32 KiB | trivial cache — **RECLAIMED** |
| `/usr/local/lib/python3.10/dist-packages` | **+3.4 GiB** (6.01 → 9.4 GiB) | packages installed by the container's start command |
| `/app` | ~0 | only `__pycache__` churn + empty bind-mount point dirs |
| `/var`, `/tmp`, `/etc` | ~0 | nothing added |
| Remainder | ~1-2 GiB | whiteouts + overlayfs accounting |

Root cause of growth: the compose `command` is
`bash -c "pip install flask flask_cors && python /app/scripts/cosyvoice_app.py"`.
Every (re)start runs an **unpinned** pip install into the writable layer. `pip freeze` diff (base image vs
running container) shows **166 changed package lines**, including clearly unintended packages
(fastapi, uvicorn, full jupyter stack, torchvision 0.18.1+cu121) and a **MarkupSafe downgrade 3.0.3 → 2.1.5**.

Critical: `/root/.cache/modelscope/hub/iic/CosyVoice-300M` (5.4 GB) is the **ACTIVE model**.
`/app/scripts/cosyvoice_app.py` (bind-mounted from `/home/nolan/voice-factory-data/scripts/`) loads it via
`CosyVoice('iic/CosyVoice-300M')` (line 41), which triggers modelscope `snapshot_download` at runtime.
It is NOT disposable while the service runs.

## What was reclaimed
- `rm -rf /root/.cache/pip /root/.cache/matplotlib` **inside** the running container.
- Safety proof: no pip process running (`ps` checked); the running app never reads the pip wheel cache;
  pip cache deletion is equivalent to documented `pip cache purge`. Only cache files were removed —
  no packages, no models, no code.
- Health probe before: `{"model_loaded":true,"status":"healthy"}` (both in-container wget and host curl).
- Health probe after (5 s later): `{"model_loaded":true,"status":"healthy"}` — **service still responds, model still loaded**.
- Layer: 15 GB → 11.8 GB.

## What was deliberately NOT touched
- `/root/.cache/modelscope` (5.4 GB): active model; deleting it breaks the running TTS service and forces a
  5.4 GB re-download. Needs a volume mount, not surgery (see recurrence defect).
- `/usr/local/.../dist-packages` additions (3.4 GB): the running python process imports flask/flask_cors
  from there; partial removal is unsafe. Needs a rebuild with the packages baked into the image.
- No user/generated data exists in the writable layer: all voice data dirs
  (`output`, `voice-output`, `references`, `voice-corpus`, `voice-candidates`, `voice-profiles`,
  `experiments`, `scripts`, `models`) are bind mounts to host paths. Nothing irreplaceable was at risk.

## Recurrence defect (recorded)
Declaration: `/mnt/c/Users/nolan/qwen3-tts-docker/docker-compose.cosyvoice.yml` (project `qwen3-tts-docker`),
image built from `Dockerfile.cosyvoice` in the same dir.

1. **Runtime pip install in compose command** — every start writes ~6.4 GB (packages + cache) into the
   writable layer, unpinned, and dragged in 166 unintended packages.
   FIX: move `pip install flask==<pin> flask_cors==<pin>` into `Dockerfile.cosyvoice` (with `--no-cache-dir`);
   change compose `command:` to `python /app/scripts/cosyvoice_app.py`.
2. **MODELSCOPE_CACHE unset** — compose sets `HF_HOME`/`TRANSFORMERS_CACHE=/app/models` (comment says
   "Persist model cache outside container") but modelscope ignores both; the 5.4 GB active model lands in
   `/root/.cache/modelscope` inside the writable layer.
   FIX: add `MODELSCOPE_CACHE=/app/models/modelscope` to compose `environment:` (inherits the existing
   `/home/nolan/cosyvoice-models` bind mount). During the maintenance window, first
   `docker cp cosyvoice-tts:/root/.cache/modelscope /home/nolan/cosyvoice-models/modelscope` to avoid a
   5.4 GB re-download.
3. **Dockerfile pip installs lack `--no-cache-dir`** — the base image itself carries 1.24 GiB of pip cache
   (`/root/.cache/pip` in the one-shot image).
   FIX: add `--no-cache-dir` to every `pip install` line in `Dockerfile.cosyvoice`.

## Recommended follow-up rebuild (later maintenance window, container STOPPED — not this phase)
1. `docker cp cosyvoice-tts:/root/.cache/modelscope` → `/home/nolan/cosyvoice-models/modelscope`.
2. Edit compose: add `MODELSCOPE_CACHE=/app/models/modelscope`; drop `pip install ... &&` from `command:`.
3. Edit `Dockerfile.cosyvoice`: bake in pinned `flask`/`flask_cors`; add `--no-cache-dir` everywhere.
4. Rebuild image, recreate container, verify `/health` returns `model_loaded:true`, confirm writable layer stays small.

## Items needing Nolan's word
- The rebuild itself: it requires stopping the running TTS service — schedule a maintenance window.
- Model choice: the app loads `iic/CosyVoice-300M` via modelscope at runtime, while `/app/models`
  (bind mount) holds a **different** 6.1 GB model (`Fun-CosyVoice3-0.5B-2512`); the `MODEL_DIR =
  "/app/models/CosyVoice-300M"` constant in `cosyvoice_app.py` is dead code. Nolan should confirm which
  model the service is supposed to run — if CosyVoice-300M, consider pre-downloading it at build time
  instead of a runtime download.
- Nothing else: no user data was found in the layer, nothing irreplaceable was touched, no secrets involved.
