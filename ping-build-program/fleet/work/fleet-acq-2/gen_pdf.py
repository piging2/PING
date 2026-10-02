#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1001..1050 (documents-pdf cases 50-99).
Generates 50 adversarial PDF fixtures under fx/pdf/. Hand-rolled PDF writer
for byte-level adversarial control; pypdf only for the encrypted fixtures."""
import os, json, random, zlib

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "pdf")
os.makedirs(FX, exist_ok=True)
random.seed(505099)
import re
def rebuild_xref(data):
    """Re-cut xref/trailer/startxref after body mutation: recompute offsets."""
    m = list(re.finditer(rb"\nxref\r?\n", data))
    assert m, "no xref found"
    body = data[:m[-1].start() + 1]
    objs = [(int(mm.group(1)), mm.start()) for mm in re.finditer(rb"(?m)^(\d+) 0 obj", body)]
    assert objs, "no objects found"
    maxn = max(n for n, _ in objs)
    off = {n: o for n, o in objs}
    # preserve trailer dict keys (esp. /Root); recompute /Size
    tm = re.search(rb"trailer\s*<<(.*?)>>\s*startxref", data, re.S)
    trailer_inner = tm.group(1) if tm else b"/Root 1 0 R"
    trailer_inner = re.sub(rb"/Size \d+", b"", trailer_inner).strip()
    out = [body, b"xref\n0 %d\n" % (maxn + 1), b"0000000000 65535 f \n"]
    for i in range(1, maxn + 1):
        if i in off: out.append(b"%010d 00000 n \n" % off[i])
        else: out.append(b"0000000000 00000 f \n")
    xref_pos = len(body)  # offset of the xref table itself
    out.append(b"trailer\n<< /Size %d %s >>\nstartxref\n%d\n%%%%EOF\n" % (
        maxn + 1, trailer_inner, xref_pos))
    return b"".join(out)

CASE_REBUILD = {}

def valid_pdf(text="Hello PDF", npages=1):
    """Correct minimal PDF with proper object numbering.
    1=catalog, 2=pages, 3=font, then per page: content(even), page(odd)."""
    parts = [b"%PDF-1.4\n"]
    offsets = []
    def obj(body):
        offsets.append(sum(len(x) for x in parts))
        num = len(offsets)
        parts.append(b"%d 0 obj\n" % num + body + b"\nendobj\n")
        return num
    page_nums = [5 + 2 * i for i in range(npages)]
    kids = b" ".join(b"%d 0 R" % n for n in page_nums)
    obj(b"<< /Type /Catalog /Pages 2 0 R >>")                       # 1
    obj(b"<< /Type /Pages /Kids [%s] /Count %d >>" % (kids, npages))  # 2
    font = obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")  # 3
    for _ in range(npages):
        content = b"BT /F1 24 Tf 100 700 Td (" + text.encode() + b") Tj ET"
        cn = obj(b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream")
        obj(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents %d 0 R "
            b"/Resources << /Font << /F1 %d 0 R >> >> >>" % (cn, font))
    data = b"".join(parts)
    xref_pos = len(data)
    out = [data, b"xref\n0 %d\n" % (len(offsets) + 1), b"0000000000 65535 f \n"]
    for o in offsets:
        out.append(b"%010d 00000 n \n" % o)
    out.append(b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n"
               % (len(offsets) + 1, xref_pos))
    return b"".join(out)

CASES = {}
def case(num, rebuild=True):
    def deco(fn): CASES[num] = fn; CASE_REBUILD[num] = rebuild; return fn
    return deco

@case(50)
def c50(): return valid_pdf("Baseline success document", 1)
@case(51)
def c51(): return valid_pdf("Three page doc", 3)
@case(52, rebuild=False)
def c52(): return b""
@case(53, rebuild=False)
def c53(): return b"This is plain text, not a PDF at all.\n"
@case(54, rebuild=False)
def c54():
    d = valid_pdf("truncated"); return d[:len(d)//2]
@case(55, rebuild=False)
def c55(): return b"<html><body><h1>Not a PDF</h1></body></html>"
@case(56)
def c56():
    from pypdf import PdfWriter
    import io
    w = PdfWriter(); w.add_blank_page(612, 792); w.encrypt("secret")
    b = io.BytesIO(); w.write(b); return b.getvalue()
@case(57)
def c57():
    d = valid_pdf("has js")
    js = b"<< /Type /Action /S /JavaScript /JS (app.alert('x')) >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + js)
@case(58)
def c58():
    d = valid_pdf("has launch")
    act = b"<< /Type /Action /S /Launch /Win << /F (cmd.exe) >> >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(59)
def c59():
    d = valid_pdf("has uri annot")
    annot = (b"<< /Type /Annot /Subtype /Link /Rect [0 0 100 100] "
             b"/A << /Type /Action /S /URI /URI (http://evil.example/) >> >>")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot)
@case(60)
def c60():
    d = valid_used = valid_pdf("embedded file host")
    ef = (b"<< /Names << /EmbeddedFiles << /Names [(evil.exe) << /Type /Filespec "
          b"/F (evil.exe) /EF << /F 9 0 R >> >>] >> >> >>")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog " + ef)
@case(61)
def c61(): return valid_pdf("page", 500)
@case(62, rebuild=False)
def c62():
    d = valid_pdf("big")
    return d + b"% " + b"x" * (6 * 1024 * 1024)
@case(63, rebuild=False)
def c63(): return bytes(random.getrandbits(8) for _ in range(4096))
@case(64, rebuild=False)
def c64(): return b"\x00" * 2048
@case(65)
def c65():
    # image-only page: white rect, no text ops
    p = valid_pdf("x")
    return p.replace(b"(x) Tj", b"")
@case(66)
def c66():
    # UTF-16BE text in content stream
    txt = "Héllo Ünïcodé".encode("utf-16-be")
    hexed = b"<" + txt.hex().encode() + b">"
    d = valid_pdf("placeholder")
    return d.replace(b"(placeholder) Tj", hexed + b" Tj")
@case(67, rebuild=False)
def c67():
    d = valid_pdf("bad xref offsets")
    return d.replace(b"00000 n", b"00000 n", 1)[:0] + d.replace(
        b"%010d 00000 n \n" % 9, b"9999999999 00000 n \n", 1)
@case(68, rebuild=False)
def c68():
    d = valid_pdf("no startxref")
    return d.split(b"startxref")[0]
@case(69, rebuild=False)
def c69():
    d1 = valid_pdf("first rev")
    upd = (b"4 0 obj\n<< /Length 5 >>\nstream\nBT ET\nendstream\nendobj\n"
           b"xref\n4 1\n0000000000 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R /Prev 0 >>\n"
           b"startxref\n0\n%%EOF\n")
    return d1 + upd
@case(70)
def c70():
    from pypdf import PdfWriter
    import io
    w = PdfWriter()
    for _ in range(3): w.add_blank_page(612, 792)
    b = io.BytesIO(); w.write(b); return b.getvalue()  # pypdf writes obj streams
@case(71)
def c71():
    d = valid_pdf("linearized?")
    return d.replace(b"%PDF-1.4", b"%PDF-1.4\n% linearized hint fake")
@case(72)
def c72():
    d = valid_pdf("form")
    acro = (b"<< /Fields [<< /Type /Annot /Subtype /Widget /FT /Tx /T (name) "
            b"/Rect [0 0 100 20] >>] >>")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /AcroForm " + acro)
@case(73)
def c73():
    d = valid_pdf("huge page")
    return d.replace(b"[0 0 612 792]", b"[0 0 100000 100000]")
@case(74)
def c74():
    d = valid_pdf("neg box")
    return d.replace(b"[0 0 612 792]", b"[-500 -500 612 792]")
@case(75)
def c75():
    d = valid_pdf("xmp")
    xmp = b"<< /Type /Metadata /Subtype /XML /Length 50 >>\nstream\n" + b"<x/>" * 12 + b"\nendstream"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Metadata 9 0 R") + b"9 0 obj\n" + xmp + b"\nendobj\n"
@case(76)
def c76():
    d = valid_pdf("uri annot 2")
    annot = (b"<< /Type /Annot /Subtype /Link /Rect [10 10 200 200] "
             b"/A << /S /URI /URI (https://example.com/) >> >>")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot)
@case(77)
def c77():
    d = valid_pdf("no contents")
    import re
    return re.sub(rb"/Contents \d+ 0 R", b"", d)
@case(78)
def c78():
    d = valid_pdf("ok")
    return d.replace(b"Tj ET", b"Tj /BogusOp ET")
@case(79)
def c79():
    d = valid_pdf("custom enc")
    enc = b"<< /Type /Encoding /Differences [65 /Aacute] >>"
    return d.replace(b"/BaseFont /Helvetica >>", b"/BaseFont /Helvetica /Encoding " + enc + b" >>")
@case(80)
def c80():
    from pypdf import PdfWriter
    import io
    w = PdfWriter(); w.add_blank_page(612, 792)
    b = io.BytesIO(); w.write(b); return b.getvalue()
@case(81)
def c81():
    d = valid_pdf("deep")
    deep = b"<< /A " * 100 + b"1" + b" >>" * 100
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Deep " + deep)
@case(82)
def c82():
    d = valid_pdf("giant string")
    big = b"(" + b"A" * (1024 * 1024) + b")"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Big " + big)
@case(83, rebuild=False)
def c83():
    d = valid_pdf("no root")
    return d.replace(b"/Root 1 0 R", b"")
@case(84, rebuild=False)
def c84():
    return valid_pdf("first") + valid_pdf("second")
@case(85, rebuild=False)
def c85():
    d = valid_pdf("no eof")
    return d.split(b"%%EOF")[0]
@case(86, rebuild=False)
def c86():
    d = valid_pdf("bad startxref")
    import re
    return re.sub(rb"startxref\n\d+", b"startxref\n99999999", d)
@case(87, rebuild=False)
def c87():
    d = valid_pdf("free weird")
    return d.replace(b"0000000000 65535 f", b"0000000000 99999 f", 1)
@case(88)
def c88():
    d = valid_pdf("unbalanced")
    return d.replace(b"BT /F1", b"/F1").replace(b"ET\nendstream", b"\nendstream")
@case(89)
def c89():
    d = valid_pdf("ok2")
    return d.replace(b"(ok2) Tj", b"[ (ok2) 9999 ] TJ")
@case(90)
def c90():
    from pypdf import PdfWriter
    import io
    w = PdfWriter(); w.add_blank_page(612, 792); w.encrypt("")
    b = io.BytesIO(); w.write(b); return b.getvalue()
@case(91)
def c91():
    d = valid_pdf("producer")
    return d.replace(b"trailer", b"% weird comment\ntrailer")
@case(92, rebuild=False)
def c92():
    d = valid_pdf("kids")
    return d.replace(b"/Count 1", b"/Count 5")
@case(93, rebuild=False)
def c93():
    d = valid_pdf("bad length")
    return d.replace(b"/Length 44", b"/Length 5")
@case(94, rebuild=False)
def c94():
    d = valid_pdf("indirect length")
    return d.replace(b"/Length 44", b"/Length 9 0 R") + b"9 0 obj\n44\nendobj\n"
@case(95, rebuild=False)
def c95():
    d = valid_pdf("bom")
    return b"\xef\xbb\xbf" + d
@case(96, rebuild=False)
def c96():
    d = valid_pdf("ws prefix")
    return b"\n\n  " + d
@case(97)
def c97():
    d = valid_pdf("v2")
    return d.replace(b"%PDF-1.4", b"%PDF-2.0")
@case(98)
def c98():
    from pypdf import PdfWriter
    import io
    w = PdfWriter(); w.add_blank_page(612, 792)
    b = io.BytesIO(); w.write(b); return b.getvalue()
@case(99)
def c99():
    d = valid_pdf("outline")
    ol = (b"<< /Outlines << /Type /Outlines /Count 1 /First << /Title (Ch1) "
          b"/Parent 8 0 R /Dest [3 0 R /Fit] >> >> >>")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog " + ol)

manifest = {}
for num in range(50, 100):
    data = CASES[num]()
    if CASE_REBUILD.get(num, True):
        try: data = rebuild_xref(data)
        except Exception as e: print("rebuild failed for", num, e)
    path = os.path.join(FX, "case-%d.pdf" % num)
    with open(path, "wb") as f: f.write(data)
    manifest[str(num)] = {"file": "fx/pdf/case-%d.pdf" % num, "bytes": len(data)}
json.dump(manifest, open(os.path.join(WORK, "manifest-1001-1050.json"), "w"), indent=1)
import json
print("wrote", len(manifest), "fixtures")
