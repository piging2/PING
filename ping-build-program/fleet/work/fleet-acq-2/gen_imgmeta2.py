#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1201..1250 (image-metadata cases 50-99).
Second adversarial image-metadata batch."""
import io, json, os, struct, zlib

WORK = os.path.dirname(os.path.abspath(__file__))
sys_path = WORK
import sys
sys.path.insert(0, sys_path)
from gen_imgmeta import base_jpeg, base_png, png_chunk, png_with_chunks, text_chunk, jpeg_with_appn

FX = os.path.join(WORK, "fx", "imgmeta")
os.makedirs(FX, exist_ok=True)

from PIL import Image

CASES = {}
def case(num):
    def deco(fn): CASES[num] = fn; return fn
    return deco

@case(50)
def c50():
    im = Image.new("RGB", (48, 48), (70, 70, 70))
    ex = Image.Exif(); ex[271] = "ThumbMake"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(51)
def c51(): return png_with_chunks([png_chunk(b"sRGB", b"\x00")])
@case(52)
def c52(): return png_with_chunks([png_chunk(b"gAMA", struct.pack(">I", 45455))])
@case(53)
def c53(): return png_with_chunks([png_chunk(b"cHRM", struct.pack(">8I", *[31270, 32900, 64000, 33000, 30000, 60000, 15000, 6000]))])
@case(54)
def c54(): return png_with_chunks([png_chunk(b"sBIT", b"\x08\x08\x08")])
@case(55)
def c55(): return png_with_chunks([png_chunk(b"hIST", struct.pack(">3H", 10, 20, 30))])
@case(56)
def c56():
    im = Image.new("L", (32, 32), 128)
    b = io.BytesIO(); im.save(b, "PNG")
    d = b.getvalue()
    trns = png_chunk(b"tRNS", b"\x80")
    i = d.rfind(b"IEND") - 4
    return d[:i] + trns + d[i:]
@case(57)
def c57(): return png_with_chunks([png_chunk(b"bKGD", b"\x00\xff\x00\xff\x00\xff")])
@case(58)
def c58():
    xmp = b'<x:xmpmeta xmlns:x="adobe:ns:meta/"/>'
    d = jpeg_with_appn(1, b"http://ns.adobe.com/xap/1.0/\x00" + xmp)
    return jpeg_with_appn(1, b"http://ns.adobe.com/xap/1.0/\x00" + xmp)[:2] + d[2:]
@case(59)
def c59():
    im = Image.new("RGB", (24, 24))
    ex = Image.Exif(); ex[271] = "Combo"; ex[306] = "2026:01:01 00:00:00"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex)
    d = b.getvalue()
    xmp = b'<x:xmpmeta xmlns:x="adobe:ns:meta/"/>'
    return d[:2] + b"\xff\xe1" + struct.pack(">H", len(xmp) + 29) + b"http://ns.adobe.com/xap/1.0/\x00" + xmp + d[2:]
@case(60)
def c60():
    im = Image.new("RGB", (24, 24))
    ex = Image.Exif(); ex[34665] = 1  # ExifIFD pointer-ish
    b = io.BytesIO(); im.save(b, "TIFF")
    return b.getvalue()
@case(61)
def c61():
    im = Image.new("RGB", (24, 24))
    b = io.BytesIO(); im.save(b, "TIFF"); return b.getvalue()
@case(62)
def c62(): return b"II+\x00\x08\x00\x00\x00" + b"\x00" * 100  # BigTIFF magic
@case(63)
def c63(): return b"\x00\x00\x00\x0cjP  \x0d\x0a\x87\x0a" + b"\x00" * 100  # JP2 signature
@case(64)
def c64(): return b"\x00\x00\x00\x18ftypavif" + b"\x00" * 100
@case(65)
def c65(): return png_with_chunks([png_chunk(b"abCD", b"unknown ancillary")])
@case(66)
def c66(): return png_with_chunks([png_chunk(b"ABCD", b"unknown critical")])
@case(67)
def c67(): return png_with_chunks([png_chunk(b"tEXt", b"")])
@case(68)
def c68():
    im = Image.new("RGB", (64, 64), (9, 9, 9))
    b = io.BytesIO(); im.save(b, "PNG")
    d = b.getvalue()
    # split IDAT into pieces: find IDAT chunks and re-split data
    import re
    parts = []
    pos = 8
    idat_data = b""
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos + 4])[0]
        ct = d[pos + 4:pos + 8]
        if ct == b"IDAT":
            idat_data += d[pos + 8:pos + 8 + ln]
        elif ct != b"IEND":
            parts.append(d[pos:pos + 12 + ln])
        pos += 12 + ln
        if ct == b"IEND": break
    chunks = b"".join(png_chunk(b"IDAT", idat_data[i:i + 100]) for i in range(0, len(idat_data), 100))
    return d[:8] + b"".join(parts) + chunks + d[pos - 12:]
@case(69)
def c69(): return png_with_chunks([png_chunk(b"IDAT", b"")])
@case(70)
def c70():
    im = Image.new("RGB", (32, 32), (11, 22, 33))
    b = io.BytesIO(); im.save(b, "PNG")
    d = b.getvalue()
    actl = png_chunk(b"acTL", struct.pack(">II", 1, 0))
    i = d.find(b"IDAT") - 4
    return d[:8] + actl + d[8:]
@case(71)
def c71():
    ims = [Image.new("P", (16, 16)) for _ in range(3)]
    b = io.BytesIO(); ims[0].save(b, "GIF", save_all=True, append_images=ims[1:]); return b.getvalue()
@case(72)
def c72():
    im = Image.new("RGBA", (32, 32), (1, 2, 3, 128))
    b = io.BytesIO(); im.save(b, "WEBP"); return b.getvalue()
@case(73)
def c73():
    im = Image.new("RGB", (32, 32), (4, 5, 6))
    b = io.BytesIO(); im.save(b, "WEBP", lossless=True); return b.getvalue()
@case(74)
def c74():
    d = base_jpeg()
    return d.replace(b"\xff\xc0", b"\xff\xca", 1)  # SOF10 arithmetic (likely unsupported)
@case(75)
def c75():
    d = base_jpeg()
    return d[:2] + b"\xff\xdd" + struct.pack(">H", 4) + b"\x00\x10" + d[2:]
@case(76)
def c76():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[271] = "I"; ex[40965] = 1
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(77)
def c77():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[40091] = "xp-title"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(78)
def c78(): return png_with_chunks([png_chunk(b"tEXt", "Café".encode("latin-1") + b"\x00na\xefve")])
@case(79)
def c79():
    payload = b"C\x01\x00en\x00" + zlib.compress("compressed-itxt".encode())
    return png_with_chunks([png_chunk(b"iTXt", payload)])
@case(80)
def c80():
    payload = b"K\x00\x01" + zlib.compress(b"bad method")
    return png_with_chunks([png_chunk(b"zTXt", payload)])
@case(81)
def c81(): return jpeg_with_appn(15, "comment héllo".encode("utf-8"))
@case(82)
def c82():
    d = base_jpeg()
    return d.replace(b"JFIF\x00\x01\x01", b"JFIF\x00\x09\x09", 1)
@case(83)
def c83():
    im = Image.new("RGB", (32, 32), (7, 7, 7))
    b = io.BytesIO(); im.save(b, "TIFF", compression="jpeg"); return b.getvalue()
@case(84)
def c84():
    im = Image.new("RGB", (32, 32), (8, 8, 8))
    b = io.BytesIO(); im.save(b, "TIFF", compression="tiff_lzw"); return b.getvalue()
@case(85)
def c85():
    im = Image.new("RGB", (32, 32), (9, 9, 9))
    b = io.BytesIO(); im.save(b, "TIFF", compression="tiff_packbits"); return b.getvalue()
@case(86)
def c86():
    d = base_png()
    i = d.find(b"IHDR")
    ihdr = d[i + 4:i + 17]
    bad = ihdr[:9] + b"\x01" + ihdr[10:]
    return d[:i + 4] + bad + struct.pack(">I", zlib.crc32(b"IHDR" + bad) & 0xffffffff) + d[i + 21:]
@case(87)
def c87():
    d = base_png()
    i = d.find(b"IHDR")
    ihdr = d[i + 4:i + 17]
    bad = ihdr[:4] + b"\x01" + ihdr[5:]
    return d[:i + 4] + bad + struct.pack(">I", zlib.crc32(b"IHDR" + bad) & 0xffffffff) + d[i + 21:]
@case(88)
def c88():
    im = Image.new("1", (32, 32))
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()
@case(89)
def c89():
    d = base_png()
    i = d.find(b"IHDR")
    ihdr = d[i + 4:i + 17]
    bad = ihdr[:12] + b"\x02" + ihdr[13:]
    return d[:i + 4] + bad + struct.pack(">I", zlib.crc32(b"IHDR" + bad) & 0xffffffff) + d[i + 21:]
@case(90)
def c90():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[306] = "2026:09:24 10:00:00+02:00"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(91)
def c91():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[33434] = (1, 250)  # rational exposure
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(92)
def c92():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[271] = "R"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(93)
def c93():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[270] = "desc\x00with\x00nulls"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(94)
def c94(): return base_jpeg()
@case(95)
def c95(): return png_with_chunks([png_chunk(b"pHYs", struct.pack(">IIB", 0, 0, 0))])
@case(96)
def c96():
    im = Image.new("P", (16, 16))
    b = io.BytesIO(); im.save(b, "GIF", loop=5); return b.getvalue()
@case(97)
def c97():
    im = Image.new("RGB", (32, 32), (3, 3, 3))
    ex = Image.Exif(); ex[271] = "WebpExif"
    b = io.BytesIO(); im.save(b, "WEBP", exif=ex); return b.getvalue()
@case(98)
def c98():
    im = Image.new("RGB", (32, 32), (4, 4, 4))
    b = io.BytesIO(); im.save(b, "WEBP", xmp=b"<x/>"); return b.getvalue()
@case(99)
def c99(): return base_png() + b"\n<!-- trailing html comment -->\n"

manifest = {}
for num in range(50, 100):
    data = CASES[num]()
    head = data[:12]
    if head.startswith(b"\xff\xd8"): ext = "jpg"
    elif head.startswith(b"\x89PNG"): ext = "png"
    elif head.startswith(b"II*\x00") or head.startswith(b"MM\x00*"): ext = "tif"
    elif head.startswith(b"GIF8"): ext = "gif"
    elif head.startswith(b"RIFF"): ext = "webp"
    else: ext = "bin"
    path = os.path.join(FX, "case-%d.%s" % (num, ext))
    with open(path, "wb") as f: f.write(data)
    manifest[str(num)] = {"file": os.path.basename(path), "bytes": len(data)}
json.dump(manifest, open(os.path.join(WORK, "manifest-1201-1250.json"), "w"), indent=1)
print("wrote", len(manifest), "fixtures")
