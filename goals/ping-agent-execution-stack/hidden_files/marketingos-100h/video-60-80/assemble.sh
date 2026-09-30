#!/bin/bash
# Assemble the 12 shots into the final mp4.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
SEG="$D/seg"; mkdir -p "$SEG"
for n in 01 02 03 04 05 06 07 08 09 10 11 12; do
  ffmpeg -y -hide_banner -loglevel error \
    -loop 1 -framerate 30 -i "$D/frames/s$n.png" \
    -i "$D/audio/s$n.mp3" \
    -c:v libx264 -pix_fmt yuv420p -preset medium \
    -c:a aac -b:a 128k -shortest \
    "$SEG/s$n.mp4"
  echo "seg $n ok"
done
: > "$SEG/list.txt"
for n in 01 02 03 04 05 06 07 08 09 10 11 12; do
  echo "file '$SEG/s$n.mp4'" >> "$SEG/list.txt"
done
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$SEG/list.txt" \
  -c copy "$D/marketingos-readonly-seal-2026-09-30.mp4"
echo "FINAL: $D/marketingos-readonly-seal-2026-09-30.mp4"
ffprobe -hide_banner -v error -show_entries format=duration,size \
  -show_entries stream=codec_name,width,height,duration \
  "$D/marketingos-readonly-seal-2026-09-30.mp4"
