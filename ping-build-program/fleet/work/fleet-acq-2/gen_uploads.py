#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1401..1450 (owner-uploads cases 0-49).
Adversarial owner-upload fixtures: (filename, bytes) pairs. Ground truth in
labels-1401-1450.json (harness never reads it)."""
import io, json, os, random, struct, zlib

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "uploads")
os.makedirs(FX, exist_ok=True)
random.seed(14011450)

from PIL import Image

def jpeg_bytes(mode="RGB", size=(64, 64), color=(200, 30, 30), **kw):
    im = Image.new(mode, size, color) if mode != "P" else Image.new("RGB", size, color)
    b = io.BytesIO(); im.save(b, "JPEG", **kw); return b.getvalue()

def png_bytes(size=(64, 64), color=(30, 200, 30), **kw):
    im = Image.new("RGB", size, color)
    b = io.BytesIO(); im.save(b, "PNG", **kw); return b.getvalue()

def exif_jpeg(tags):
    im = Image.new("RGB", (48, 48), (70, 70, 70))
    ex = Image.Exif()
    for k, v in tags.items(): ex[k] = v
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()

F = []
def fx(num, name, data, label, flags=None):
    F.append((num, name, data, label, flags or {}))

fx(0, "storefront.jpg", jpeg_bytes(), "ACCEPT")
fx(1, "logo.png", png_bytes(), "ACCEPT")
d2 = jpeg_bytes()
fx(2, "exact.jpg", d2, "ACCEPT", {"size_cap": len(d2)})
fx(3, "over.jpg", d2, "TYPED_FAILURE", {"size_cap": len(d2) - 1})
fx(4, "screenshot.PNG", png_bytes(), "ACCEPT")
fx(5, "photo.jpg", png_bytes(), "TYPED_FAILURE")  # PNG content, jpg ext
fx(6, "evil.jpg.exe", jpeg_bytes(), "QUARANTINE")
fx(7, "../../etc/passwd", png_bytes(), "QUARANTINE")
fx(8, "photo\x00.jpg", jpeg_bytes(), "QUARANTINE")
fx(9, "CON.jpg", jpeg_bytes(), "TYPED_FAILURE")
fx(10, "a" * 260 + ".jpg", jpeg_bytes(), "TYPED_FAILURE")
fx(11, "empty.jpg", b"", "TYPED_FAILURE")
fx(12, "update.jpg", b"MZ" + b"\x00" * 200, "QUARANTINE")
fx(13, "photo.jpg", b"\x7fELF" + b"\x00" * 200, "QUARANTINE")
fx(14, "album.jpg", b"PK\x03\x04" + b"\x00" * 200, "QUARANTINE")
fx(15, "pic.jpg", b"<html><body>hi</body></html>", "QUARANTINE")
fx(16, "data.jpg", b'{"key": "value"}', "TYPED_FAILURE")
fx(17, "notes.jpg", b"just some text\n", "TYPED_FAILURE")
fx(18, "icon.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>', "ACCEPT")
fx(19, "icon.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "QUARANTINE")
fx(20, "icon.svg", b'<svg xmlns="http://www.w3.org/2000/svg" onload="evil()"><circle r="5"/></svg>', "QUARANTINE")
fx(21, "icon.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body/></foreignObject></svg>', "QUARANTINE")
def _gif_anim():
    ims = [Image.new("P", (16, 16)) for _ in range(3)]
    b = io.BytesIO(); ims[0].save(b, "GIF", save_all=True, append_images=ims[1:]); return b.getvalue()
fx(22, "anim.gif", _gif_anim(), "ACCEPT")
def _webp():
    im = Image.new("RGB", (32, 32), (1, 2, 3))
    b = io.BytesIO(); im.save(b, "WEBP"); return b.getvalue()
fx(23, "photo.webp", _webp(), "ACCEPT")
def _bmp():
    im = Image.new("RGB", (16, 16), (1, 1, 1))
    b = io.BytesIO(); im.save(b, "BMP"); return b.getvalue()
fx(24, "scan.bmp", _bmp(), "ACCEPT")
def _tif():
    im = Image.new("RGB", (16, 16))
    b = io.BytesIO(); im.save(b, "TIFF"); return b.getvalue()
fx(25, "raw.tif", _tif(), "ACCEPT")
fx(26, "photo.heic", b"\x00\x00\x00\x18ftypheic" + b"\x00" * 100, "TYPED_FAILURE")
fx(27, "trip.jpg", exif_jpeg({271: "Make", 272: "Model"}), "ACCEPT", {"gps": True})
fx(28, "rot.jpg", exif_jpeg({274: 6}), "ACCEPT", {"orientation": True})
def _icc():
    im = Image.new("RGB", (16, 16))
    b = io.BytesIO(); im.save(b, "JPEG", icc_profile=b"icc" * 100); return b.getvalue()
fx(29, "brand.jpg", _icc(), "ACCEPT", {"icc": True})
def _cmyk():
    im = Image.new("CMYK", (32, 32), (0, 128, 128, 0))
    b = io.BytesIO(); im.save(b, "JPEG"); return b.getvalue()
fx(30, "print.jpg", _cmyk(), "ACCEPT")
fx(31, "pixel.png", png_bytes(size=(1, 1)), "ACCEPT")
def _bomb():
    d = png_bytes()
    ihdr = struct.pack(">IIBBBBB", 100000, 100000, 8, 2, 0, 0, 0)
    i = d.find(b"IHDR")
    return d[:i - 4] + struct.pack(">I", 13) + b"IHDR" + ihdr + struct.pack(">I", zlib.crc32(b"IHDR" + ihdr) & 0xffffffff) + d[i + 21:]
fx(32, "bomb.png", _bomb(), "TYPED_FAILURE")
fx(33, "cut.jpg", jpeg_bytes()[:500], "TYPED_FAILURE")
fx(34, "IMG_001", jpeg_bytes(), "ACCEPT")
def _gray():
    im = Image.new("L", (32, 32), 128)
    b = io.BytesIO(); im.save(b, "JPEG"); return b.getvalue()
fx(35, "bw.jpg", _gray(), "ACCEPT")
def _deep():
    im = Image.new("I;16", (16, 16))
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()
fx(36, "deep.png", _deep(), "ACCEPT")
fx(37, "poly.png", png_bytes() + b"<script>evil()</script>", "QUARANTINE")
fx(38, "tail.jpg", jpeg_bytes() + b"trailing text here", "QUARANTINE")
fx(39, "раураl.jpg", jpeg_bytes(), "TYPED_FAILURE")  # Cyrillic a's
fx(40, "🎉party.jpg", jpeg_bytes(), "ACCEPT")
fx(41, "archive.png", b"\x00" * 257 + b"ustar" + b"\x00" * 200, "QUARANTINE")
fx(42, "doc.jpg", b"%PDF-1.4\n%\xe2\xe3\n", "TYPED_FAILURE")
def _gif_comment():
    im = Image.new("P", (16, 16))
    b = io.BytesIO(); im.save(b, "GIF", comment=b"hello"); return b.getvalue()
fx(43, "note.gif", _gif_comment(), "ACCEPT")
fx(44, "prog.jpg", jpeg_bytes(progressive=True), "ACCEPT")
fx(45, "inter.png", png_bytes(interlace=1), "ACCEPT")
fx(46, "photo.jpeg", jpeg_bytes(), "ACCEPT")
fx(47, ".jpg", jpeg_bytes(), "TYPED_FAILURE")
fx(48, "my photo (1).jpg", jpeg_bytes(), "ACCEPT")
def _xmp():
    d = jpeg_bytes()
    xmp = b'<x:xmpmeta xmlns:x="adobe:ns:meta/"/>'
    seg = b"\xff\xe1" + struct.pack(">H", len(xmp) + 29) + b"http://ns.adobe.com/xap/1.0/\x00" + xmp
    return d[:2] + seg + d[2:]
fx(49, "meta.jpg", _xmp(), "ACCEPT", {"xmp": True})

manifest, labels = {}, {}
for num, name, data, label, flags in F:
    safe = "case-%d.dat" % num
    open(os.path.join(FX, safe), "wb").write(data)
    manifest[str(num)] = {"file": "fx/uploads/" + safe, "name": name, "bytes": len(data), "flags": flags}
    labels[str(num)] = label
json.dump(manifest, open(os.path.join(WORK, "manifest-1401-1450.json"), "w"), indent=1)
json.dump(labels, open(os.path.join(WORK, "labels-1401-1450.json"), "w"), indent=1)
print("wrote", len(manifest), "fixtures")
