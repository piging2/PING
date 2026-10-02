#!/usr/bin/env python3
"""Lane P red-team fixture generator. Craft hostile media files; never fetched, all synthetic."""
import zlib, struct, os, json

FIX = "/home/hatch/workspace/ping-build-program/lane-p/fixtures"
os.makedirs(FIX, exist_ok=True)

# ---------- 1. JPEG with EXIF GPS (privacy leak test) ----------
# Minimal valid JPEG built by hand: SOI, APP1 (EXIF with GPS IFD), SOS with tiny image.
def jpeg_with_gps(path):
    # Take a valid sharp-produced JPEG and insert an APP1 EXIF segment (with GPS) after SOI.
    # TIFF structure (little-endian): header(8) + IFD0(18) + GPS IFD(30) + data.
    def tiff():
        h = b"II*\x00\x08\x00\x00\x00"
        ifd0 = struct.pack("<H", 1)
        ifd0 += struct.pack("<HHI", 0x8825, 4, 1) + struct.pack("<I", 26)  # GPS IFD at offset 26
        ifd0 += struct.pack("<I", 0)
        gps = struct.pack("<H", 2)
        ref_off, lat_off = 56, 58  # data starts at 26+2+24+4 = 56
        gps += struct.pack("<HHI", 1, 2, 2) + struct.pack("<I", ref_off)
        gps += struct.pack("<HHI", 2, 5, 3) + struct.pack("<I", lat_off)
        gps += struct.pack("<I", 0)
        data = b"N\x00\x00\x00" + struct.pack("<IIIIII", 39, 1, 7, 1, 30, 1)  # 39d 7m 30s
        return h + ifd0 + gps + data
    exif = b"Exif\x00\x00" + tiff()
    app1 = b"\xff\xe1" + struct.pack(">H", len(exif) + 2) + exif
    base = open(f"{FIX}/clean.jpg", "rb").read()
    assert base[:2] == b"\xff\xd8", "clean.jpg is not a JPEG"
    open(path, "wb").write(base[:2] + app1 + base[2:])

# ---------- 2. Polyglot: valid JPEG with appended JS payload ----------
# Simulates a "JPEG" that is also meaningful JS after the EOI marker.
def polyglot_jpg(path):
    import subprocess
    base = open(f"{FIX}/clean.jpg", "rb").read()
    payload = b"\n/*`*/;alert('polyglot');// trailing script appended after JPEG EOI"
    open(path, "wb").write(base + payload)

# ---------- 3. SVG with embedded script ----------
def svg_script(path):
    # NOTE: no XML prolog; file-type sniffs "<svg" as image/svg+xml, with prolog it says application/xml
    open(path, "w").write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">\n'
        '  <script>alert("xss")</script>\n'
        '  <rect width="100" height="100" fill="red"/>\n'
        '</svg>\n')

# ---------- 4. Decompression bomb: tiny PNG, enormous declared pixels ----------
def png_bomb(path, w=10000, h=10000):
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    row = b"\x00" + b"\x7f\x7f\x7f" * w  # filter byte + solid gray
    raw = row * h
    open(path, "wb").write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

# ---------- 5. MIME mismatch: real PNG bytes, .jpg extension ----------
def mime_mismatch(path):
    import subprocess
    base = open(f"{FIX}/clean.png", "rb").read()
    open(path, "wb").write(base)

# ---------- 6. Truncated / corrupt JPEG ----------
def corrupt_jpg(path):
    base = open(f"{FIX}/clean.jpg", "rb").read()
    open(path, "wb").write(base[:len(base)//3])  # cut mid-scan

# ---------- clean bases generated via node/sharp at spike time ----------
print("fixture generator ready; clean bases must exist first")
