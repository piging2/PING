#!/bin/bash
# hermes-run.sh — Pig-side launcher for headless Hermes oneshot prompts.
#
# PERSISTENT PATH (moved out of C:\Windows\Temp 2026-09-26: Temp is volatile —
# the originals were silently lost on 2026-09-25 and had to be reconstructed).
# Lives at C:\Users\nolan\hermes-bridge\hermes-run.sh (NOT under
# AppData\Local\hermes, which is the desktop app's domain — do not touch).
#
# Invoked by prompt-hermes.sh as:
#   wsl -u nolan -- bash /mnt/c/Users/nolan/hermes-bridge/hermes-run.sh
# The prompt arrives via C:\Users\nolan\hermes-bridge\hermes-prompt.txt
# (scp'd by prompt-hermes.sh). Prints the model's final response on stdout.
set -u
PROMPT_FILE_WIN='C:\Users\nolan\hermes-bridge\hermes-prompt.txt'
LAUNCH_PY_WIN='C:\Users\nolan\hermes-bridge\hermes-launch.py'
VENV_PY=/mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe
exec "$VENV_PY" "$LAUNCH_PY_WIN" "$PROMPT_FILE_WIN"
