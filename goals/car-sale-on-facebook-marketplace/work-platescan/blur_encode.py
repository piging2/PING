#!/usr/bin/env python3
"""Build a segmented plate-blur ffmpeg filter graph for the Avalon listing video."""
import subprocess, json

SRC = "/home/hatch/workspace/user/media_library/video/40/40acf7af96796b6c9fdef242cc92d1b93c6a02963f7a6ba22b9b0517c560d30b.mp4"
DST = "/home/hatch/workspace/goals/car-sale-on-facebook-marketplace/files/avalon-listing-video-plate-blurred.mp4"

# (t0, t1, x, y, w, h) - measured from 1.5x band zooms of the SOURCE video,
# plate track (orig 720x1280): 6.8 x0-120 y1073-1173 | 7.0 x0-200 y1087-1227
# 7.2 x40-327 y1007-1193 | 7.4 x140-473 y987-1227 | 7.6 x260-533 y973-1173
# 7.8 ~x300-560 y950-1150 | 8.0 x363-540 y850-1020 | 8.2 x493-720 y800-1020
# 8.4 x547-720 y820-1000 | 8.6 x660-720 y880-1000. Plate absent at 6.6 and 8.8.
# Boxes carry >=60px padding around every measured plate position.
SEGS = [
    (6.55, 6.90,   0, 1010, 200, 230),
    (6.90, 7.15,   0, 1020, 280, 260),
    (7.15, 7.40,   0,  930, 540, 350),
    (7.40, 7.65,  80,  910, 520, 370),
    (7.65, 7.90, 200,  890, 430, 340),
    (7.90, 8.15, 240,  790, 390, 420),
    (8.15, 8.40, 300,  740, 420, 340),
    (8.40, 8.65, 480,  760, 240, 300),
    (8.65, 8.90, 600,  820, 120, 240),
]

parts = []
label = "0:v"
for i, (t0, t1, x, y, w, h) in enumerate(SEGS):
    blur, out = f"b{i}", f"v{i}"
    # NOTE: [0:v] (input stream) may be referenced by every crop branch,
    # but each intermediate [vN] must be consumed exactly once -> chain main path.
    parts.append(f"[0:v]crop={w}:{h}:{x}:{y},boxblur=25[{blur}]")
    parts.append(f"[{label}][{blur}]overlay={x}:{y}:enable='between(t,{t0},{t1})'[{out}]")
    label = out

fc = ";".join(parts)
cmd = [
    "ffmpeg", "-v", "error", "-y", "-i", SRC,
    "-filter_complex", fc,
    "-map", f"[{label}]", "-map", "0:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-pix_fmt", "yuv420p", "-c:a", "copy",
    "-movflags", "+faststart", DST,
]
print("Filter graph:", fc[:200], "...")
r = subprocess.run(cmd, capture_output=True, text=True)
print("rc:", r.returncode)
if r.returncode != 0:
    print("STDERR:", r.stderr[-3000:])
else:
    print("OK ->", DST)
