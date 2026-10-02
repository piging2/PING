#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1151..1200 (image-metadata cases 0-49).
Adversarial image-metadata fixtures under fx/imgmeta/."""
import io, json, os, random, struct, zlib

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "imgmeta")
os.makedirs(FX, exist_ok=True)
random.seed(11511200)

from PIL import Image, PngImagePlugin

def base_jpeg():
    im = Image.new("RGB", (64, 64), (200, 30, 30))
    b = io.BytesIO(); im.save(b, "JPEG"); return b.getvalue()

def base_png():
    im = Image.new("RGB", (64, 64), (30, 200, 30))
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()

def png_chunk(ctype, data):
    c = ctype + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

def png_with_chunks(extra_chunks, wh=(64, 64)):
    im = Image.new("RGB", wh, (30, 200, 30))
    b = io.BytesIO(); im.save(b, "PNG")
    d = b.getvalue()
    iend = d.rfind(b"IEND")
    iend_start = d.rfind(struct.pack(">I", 0), 0, iend - 8)
    # find start of IEND chunk: length(4) + "IEND" at iend-4
    iend_chunk_start = iend - 4
    return d[:iend_chunk_start] + b"".join(extra_chunks) + d[iend_chunk_start:]

def text_chunk(kw, txt):
    return png_chunk(b"tEXt", kw.encode() + b"\x00" + txt.encode())

def jpeg_with_appn(n, payload):
    d = base_jpeg()
    seg = b"\xff\xe0"  # use APPn marker slot
    marker = bytes([0xFF, 0xE0 + n]) + struct.pack(">H", len(payload) + 2) + payload
    return d[:2] + marker + d[2:]

CASES = {}
def case(num):
    def deco(fn): CASES[num] = fn; return fn
    return deco

@case(0)
def c0(): return base_jpeg()
@case(1)
def c1(): return base_png()
@case(2)
def c2(): return png_with_chunks([text_chunk("Title", "A test image")])
@case(3)
def c3():
    kw = b"Description\x00\x00"  # zTXt: keyword null + comp method 0
    payload = kw + zlib.compress(b"compressed description " * 50)
    return png_with_chunks([png_chunk(b"zTXt", payload)])
@case(4)
def c4():
    payload = b"Comment\x00\x01\x00en\x00\x00" + "héllo wörld".encode("utf-8")
    return png_with_chunks([png_chunk(b"iTXt", payload)])
@case(5)
def c5():
    xmp = b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF></x:xmpmeta>'
    return jpeg_with_appn(1, b"http://ns.adobe.com/xap/1.0/\x00" + xmp)
@case(6)
def c6():
    im = Image.new("RGB", (32, 32), (0, 0, 200))
    b = io.BytesIO(); im.save(b, "TIFF"); return b.getvalue()
@case(7)
def c7():
    # EXIF with GPS-ish tags via PIL
    from PIL.ExifTags import TAGS
    im = Image.new("RGB", (32, 32), (10, 10, 10))
    ex = Image.Exif()
    ex[271] = "TestMake"; ex[272] = "TestModel"; ex[306] = "2026:09:24 10:00:00"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(8)
def c8():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif()
    for i in range(100): ex[40000 + i] = "v%d" % i
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(9)
def c9():
    d = base_jpeg()
    # truncate APP1 EXIF segment: find APP1 and cut it short
    i = d.find(b"\xff\xe1")
    return d[:i + 10] if i > 0 else d[:100]
@case(10)
def c10(): return png_with_chunks([text_chunk("Big", "x" * (1024 * 1024))])
@case(11)
def c11(): return png_with_chunks([text_chunk("K%03d" % i, "v%d" % i) for i in range(100)])
@case(12)
def c12(): return jpeg_with_appn(15, b"hello comment\x00")
@case(13)
def c13(): return b"This is not an image.\n"
@case(14)
def c14(): return b""
@case(15)
def c15():
    d = base_jpeg(); return d[:len(d) // 2]
@case(16)
def c16():
    d = base_png()
    # corrupt a chunk CRC: flip a byte in IHDR CRC
    return d[:33] + bytes([d[33] ^ 0xFF]) + d[34:]
@case(17)
def c17():
    d = base_png()
    # bad chunk length: inflate IDAT length field
    i = d.find(b"IDAT")
    return d[:i - 4] + struct.pack(">I", 999999) + d[i - 4 + 4:]
@case(18)
def c18():
    # EXIF with invalid tag type (manual TIFF header surgery is complex; use bad IFD via truncated exif)
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[271] = "X"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex)
    d = b.getvalue()
    i = d.find(b"\xff\xe1")
    # corrupt IFD entry count
    return d[:i + 20] + b"\xff\xff" + d[i + 22:] if i > 0 else d
@case(19)
def c19():
    im = Image.new("RGB", (48, 48), (90, 90, 90))
    thumb = Image.new("RGB", (8, 8), (1, 2, 3))
    ex = Image.Exif(); ex[271] = "Make"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex)
    return b.getvalue()
@case(20)
def c20():
    xmp = b'<x:xmpmeta xmlns:x="adobe:ns:meta/" xmlns:weird="http://weird.example/ns"><weird:tag>1</weird:tag></x:xmpmeta>'
    return jpeg_with_appn(1, b"http://ns.adobe.com/xap/1.0/\x00" + xmp)
@case(21)
def c21():
    # APP13-ish IPTC stub
    return jpeg_with_appn(13, b"Photoshop 3.0\x008BIM\x04\x04\x00\x00\x00\x00\x00\x19\x1c\x02\x00\x00\x02\x00\x02")
@case(22)
def c22():
    im = Image.new("RGB", (32, 32), (5, 5, 5))
    b = io.BytesIO(); im.save(b, "WEBP"); return b.getvalue()
@case(23)
def c23():
    im = Image.new("P", (32, 32))
    im.putpalette([i % 256 for i in range(768)])
    b = io.BytesIO(); im.save(b, "GIF", comment=b"gif comment here"); return b.getvalue()
@case(24)
def c24():
    im = Image.new("RGB", (16, 16), (1, 1, 1))
    b = io.BytesIO(); im.save(b, "BMP"); return b.getvalue()
@case(25)
def c25():
    # eXIf chunk in PNG
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[271] = "ExifMake"
    eb = io.BytesIO(); im.save(eb, "JPEG", exif=ex)
    # extract raw exif bytes from the JPEG APP1
    jd = eb.getvalue(); i = jd.find(b"Exif\x00\x00")
    exif_raw = jd[i:i + 200]
    return png_with_chunks([png_chunk(b"eXIf", exif_raw)])
@case(26)
def c26(): return jpeg_with_appn(14, b"Adobe\x00" * 20)
@case(27)
def c27():
    # large ICC profile in PNG iCCP
    icc = zlib.compress(b"icc-profile-data" * 10000)
    return png_with_chunks([png_chunk(b"iCCP", b"profile\x00\x00" + icc)])
@case(28)
def c28():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[274] = 6  # orientation
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(29)
def c29():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[271] = "M"; ex[37500] = b"\x00" * 5000  # makernote-ish blob
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(30)
def c30(): return png_with_chunks([png_chunk(b"tEXt", b"\x00bad keyword")])
@case(31)
def c31(): return png_with_chunks([png_chunk(b"tEXt", b"\x00")])
@case(32)
def c32():
    # big-endian EXIF (MM)
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[271] = "MMMake"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex, quality=90)
    return b.getvalue()
@case(33)
def c33():
    d = base_jpeg()
    i = d.find(b"\xff\xe1")
    if i > 0:
        # corrupt IFD offset to point past EOF
        return d[:i + 14] + b"\xff\xff\xff\xff" + d[i + 18:]
    return d
@case(34)
def c34():
    # PNG claiming huge dimensions (decompression-bomb shaped)
    d = base_png()
    ihdr = struct.pack(">IIBBBBB", 100000, 100000, 8, 2, 0, 0, 0)
    i = d.find(b"IHDR")
    return d[:i - 4] + struct.pack(">I", 13) + b"IHDR" + ihdr + struct.pack(">I", zlib.crc32(b"IHDR" + ihdr) & 0xffffffff) + d[i + 21:]
@case(35)
def c35(): return png_with_chunks([png_chunk(b"pHYs", struct.pack(">IIB", 2835, 2835, 1))])
@case(36)
def c36():
    import time
    t = time.gmtime()
    return png_with_chunks([png_chunk(b"tIME", struct.pack(">HBBBBB", 2026, 9, 24, 10, 30, 0))])
@case(37)
def c37(): return base_jpeg()  # JFIF baseline
@case(38)
def c38():
    im = Image.new("RGB", (64, 64), (80, 0, 80))
    b = io.BytesIO(); im.save(b, "JPEG", progressive=True); return b.getvalue()
@case(39)
def c39():
    im = Image.new("RGB", (64, 64), (0, 80, 80))
    b = io.BytesIO(); im.save(b, "PNG", interlace=1); return b.getvalue()
@case(40)
def c40():
    im = Image.new("I;16", (32, 32))
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()
@case(41)
def c41():
    im = Image.new("P", (32, 32)); im.putpalette([i % 256 for i in range(768)])
    b = io.BytesIO(); im.save(b, "PNG", transparency=0); return b.getvalue()
@case(42)
def c42():
    im = Image.new("LA", (32, 32), (128, 200))
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()
@case(43)
def c43():
    im = Image.new("RGB", (16, 16))
    b = io.BytesIO(); im.save(b, "TIFF"); d = b.getvalue()
    return d + d[:200]  # second IFD-ish appended (adversarial)
@case(44)
def c44(): return b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # truncated PNG, no IHDR
@case(45)
def c45(): return b"not-heic-data"
@case(46)
def c46(): return b'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
@case(47)
def c47():
    im = Image.new("RGB", (16, 16))
    ex = Image.Exif(); ex[306] = "not-a-date"
    b = io.BytesIO(); im.save(b, "JPEG", exif=ex); return b.getvalue()
@case(48)
def c48(): return png_with_chunks([text_chunk("Dup", "one"), text_chunk("Dup", "two")])
@case(49)
def c49():
    # polyglot: valid PNG + trailing ZIP (quarantine)
    d = base_png()
    fakezip = b"PK\x03\x04" + b"\x00" * 100 + b"evil-payload"
    return d + fakezip

manifest = {}
for num in range(0, 50):
    data = CASES[num]()
    ext = "bin"
    head = data[:8]
    if head.startswith(b"\xff\xd8"): ext = "jpg"
    elif head.startswith(b"\x89PNG"): ext = "png"
    elif head.startswith(b"II*\x00") or head.startswith(b"MM\x00*"): ext = "tif"
    elif head.startswith(b"BM"): ext = "bmp"
    elif head.startswith(b"GIF8"): ext = "gif"
    elif head.startswith(b"RIFF"): ext = "webp"
    path = os.path.join(FX, "case-%d.%s" % (num, ext))
    with open(path, "wb") as f: f.write(data)
    manifest[str(num)] = {"file": os.path.basename(path), "bytes": len(data)}
json.dump(manifest, open(os.path.join(WORK, "manifest-1151-1200.json"), "w"), indent=1)
print("wrote", len(manifest), "fixtures")
