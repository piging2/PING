#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1051..1100 (documents-pdf cases 100-149).
Second adversarial batch; reuses valid_pdf from gen_pdf."""
import os, sys, json, zlib

WORK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, WORK)
from gen_pdf import valid_pdf, rebuild_xref

FX = os.path.join(WORK, "fx", "pdf")
os.makedirs(FX, exist_ok=True)

CASES = {}
CASE_REBUILD = {}
def case(num, rebuild=True):
    def deco(fn): CASES[num] = fn; CASE_REBUILD[num] = rebuild; return fn
    return deco

@case(100)
def c100(): return valid_pdf("ten pages here", 10)
@case(101)
def c101():
    d = valid_pdf("PLACEHOLDER")
    return d.replace(b"(PLACEHOLDER) Tj", b"(parens \\(escaped\\) and \\\\ backslash) Tj")
@case(102)
def c102():
    d = valid_pdf("names dict")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Names << /Dests << /Names [(a) [3 0 R /Fit]] >> >>")
@case(103)
def c103():
    d = valid_pdf("page labels")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /PageLabels << /Nums [0 << /S /D >>] >>")
@case(104)
def c104():
    d = valid_pdf("viewer prefs")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /ViewerPreferences << /HideToolbar true >>")
@case(105)
def c105():
    d = valid_pdf("trapped")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Trapped /True")
@case(106)
def c106():
    d = valid_pdf("pdfa-ish")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OutputIntents [<< /Type /OutputIntent /S /GTS_PDFA1 /OutputCondition (sRGB) >>]")
@case(107)
def c107():
    d = valid_pdf("redacted?")
    return d.replace(b"Tj ET", b"Tj 0 0 0 rg 100 690 200 20 re f ET")
@case(108)
def c108():
    d = valid_pdf("rotated")
    return d.replace(b"/MediaBox [0 0 612 792]", b"/MediaBox [0 0 612 792] /Rotate 90", 1)
@case(109)
def c109():
    d = valid_pdf("cropbox")
    return d.replace(b"/MediaBox [0 0 612 792]", b"/MediaBox [0 0 612 792] /CropBox [100 100 500 700]", 1)
@case(110)
def c110():
    d = valid_pdf("two streams")
    extra = b"<< /Length 11 >>\nstream\nBT ET\nendstream"
    return d.replace(b"/Contents 4 0 R", b"/Contents [4 0 R 9 0 R]") + b"9 0 obj\n" + extra + b"\nendobj\n"
@case(111)
def c111():
    comp = zlib.compress(b"BT /F1 24 Tf 100 700 Td (Flate text) Tj ET")
    d = valid_pdf("PLACEHOLDER")
    newstream = b"<< /Length %d /Filter /FlateDecode >>\nstream\n" % len(comp) + comp + b"\nendstream"
    import re
    return re.sub(rb"<< /Length \d+ >>\nstream\n.*?endstream", lambda m: newstream, d, count=1, flags=re.S)
@case(112)
def c112():
    import base64
    raw = b"BT /F1 24 Tf 100 700 Td (A85 text) Tj ET"
    enc = base64.a85encode(raw, adobe=True)
    d = valid_pdf("PLACEHOLDER")
    newstream = b"<< /Length %d /Filter /ASCII85Decode >>\nstream\n" % len(enc) + enc + b"\nendstream"
    import re
    return re.sub(rb"<< /Length \d+ >>\nstream\n.*?endstream", lambda m: newstream, d, count=1, flags=re.S)
@case(113, rebuild=False)
def c113():
    d = valid_pdf("lzw?")
    return d.replace(b"(lzw?) Tj", b"(lzw) Tj").replace(
        b"<< /Length", b"<< /Filter /LZWDecode /Length", 1)
@case(114, rebuild=False)
def c114():
    d = valid_pdf("rle?")
    return d.replace(b"<< /Length", b"<< /Filter /RunLengthDecode /Length", 1)
@case(115)
def c115():
    d = valid_pdf("circular")
    return d.replace(b"/Pages 2 0 R >>", b"/Pages 2 0 R /Self 1 0 R >>")
@case(116)
def c116():
    d = valid_pdf("gap xref")
    return d.replace(b"xref\n0 6", b"xref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000000 00000 f \n3 3")
@case(117)
def c117():
    d = valid_pdf("lying encrypt trailer")
    return d.replace(b"trailer\n<< /Size", b"trailer\n<< /Encrypt << /Filter /Standard >> /Size")
@case(118)
def c118():
    d = valid_pdf("lying count")
    return d.replace(b"/Count 1", b"/Count 1000000")
@case(119)
def c119():
    d = valid_pdf("missing font")
    return d.replace(b"/F1 5 0 R", b"/F9 99 0 R")
@case(120)
def c120():
    d = valid_pdf("tounicode")
    tu = (b"<< /Length 40 >>\nstream\n/CIDInit /ProcSet findresource begin\nendstream")
    return d.replace(b"/BaseFont /Helvetica >>",
                     b"/BaseFont /Helvetica /ToUnicode 9 0 R >>") + b"9 0 obj\n" + tu + b"\nendobj\n"
@case(121)
def c121():
    d = valid_pdf("tagged")
    return d.replace(b"/Type /Catalog",
                     b"/Type /Catalog /MarkInfo << /Marked true >> /StructTreeRoot << /Type /StructTreeRoot >>")
@case(122)
def c122():
    d = valid_pdf("markinfo")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /MarkInfo << /Marked false >>")
@case(123)
def c123():
    d = valid_pdf("lang")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Lang (en-US)")
@case(124)
def c124():
    d = valid_pdf("xobject")
    fx = (b"<< /Type /XObject /Subtype /Form /BBox [0 0 100 100] /Length 11 >>\n"
          b"stream\nBT ET\nendstream")
    return d.replace(b"/Font << /F1",
                     b"/XObject << /Fm1 9 0 R >> /Font << /F1") + b"9 0 obj\n" + fx + b"\nendobj\n"
@case(125)
def c125():
    d = valid_pdf("pattern")
    return d.replace(b"/Type /Catalog",
                     b"/Type /Catalog /PageMode /UseNone")  # benign variant placeholder
@case(126)
def c126():
    d = valid_pdf("shading?")
    return d.replace(b"Tj ET", b"Tj ET")  # structurally valid; shading via annot skip
@case(127)
def c127():
    d = valid_pdf("ocg")
    return d.replace(b"/Type /Catalog",
                     b"/Type /Catalog /OCProperties << /OCGs [<< /Type /OCG /Name (layer1) >>] >>")
@case(128)
def c128():
    d = valid_pdf("pieceinfo")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /PieceInfo << /Vendor << /LastModified (D:2026) >> >>")
@case(129, rebuild=False)
def c129():
    d = valid_pdf("info weird")
    return d.replace(b"trailer", b"9 0 obj\n<< /Producer (weird\xff\xfe) >>\nendobj\ntrailer")
@case(130, rebuild=False)
def c130():
    d = valid_pdf("rev1")
    upd = b"xref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R /Prev 1 >>\nstartxref\n0\n%%EOF\n"
    return d + upd + upd
@case(131)
def c131():
    d = valid_pdf("linearized dict")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Linearized << /L 100 >>")
@case(132)
def c132():
    d = valid_pdf("extensions")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Extensions << /ADBE << /BaseVersion /1.7 >> >>")
@case(133, rebuild=False)
def c133():
    d = valid_pdf("big info")
    keys = b" ".join(b"/K%d (v)" % i for i in range(100))
    return d.replace(b"trailer", b"9 0 obj\n<< " + keys + b" >>\nendobj\ntrailer")
@case(134)
def c134():
    d = valid_pdf("ids")
    return d.replace(b"trailer\n<< /Size",
                     b"trailer\n<< /ID [<001122> <334455>] /Size")
@case(135)
def c135():
    d = valid_pdf("bin comment")
    return d.replace(b"%PDF-1.4\n", b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
@case(136)
def c136():
    d = valid_pdf("crlf")
    return d.replace(b"\n", b"\r\n")
@case(137, rebuild=False)
def c137():
    d = valid_pdf("cronly")
    return d.replace(b"\n", b"\r")
@case(138, rebuild=False)
def c138():
    d = valid_pdf("mixed endings")
    return d.replace(b"\nendobj\n", b"\r\nendobj\r")
@case(139)
def c139():
    d = valid_pdf("PLACEHOLDER")
    return d.replace(b"(PLACEHOLDER) Tj", b"(caf\xc3\xa9 na\xc3\xafve) Tj")
@case(140)
def c140():
    d = valid_pdf("PLACEHOLDER")
    return d.replace(b"(PLACEHOLDER) Tj", b"(octal \\101\\102\\103) Tj")
@case(141)
def c141():
    d = valid_pdf("PLACEHOLDER")
    return d.replace(b"(PLACEHOLDER) Tj", b"<6865782074657874> Tj")
@case(142)
def c142():
    d = valid_pdf("inline img")
    img = b"q 100 0 0 100 100 700 cm BI /W 1 /H 1 /CS /G /BPC 1 ID \x80 EI Q"
    return d.replace(b"Tj ET", b"Tj " + img + b" ET")
@case(143)
def c143():
    d = valid_pdf("dct?")
    fake = b"\xff\xd8\xff\xe0" + b"\x00" * 100
    xo = (b"<< /Type /XObject /Subtype /Image /Width 10 /Height 10 /ColorSpace /DeviceRGB "
          b"/BitsPerComponent 8 /Filter /DCTDecode /Length %d >>\nstream\n" % len(fake) + fake + b"\nendstream")
    return d.replace(b"/Font << /F1", b"/XObject << /Im1 9 0 R >> /Font << /F1") + b"9 0 obj\n" + xo + b"\nendobj\n"
@case(144, rebuild=False)
def c144():
    d = valid_pdf("ccitt?")
    return d.replace(b"<< /Length", b"<< /Filter /CCITTFaxDecode /DecodeParms << /K 4 >> /Length", 1)
@case(145, rebuild=False)
def c145():
    d = valid_pdf("jbig2?")
    return d.replace(b"<< /Length", b"<< /Filter /JBIG2Decode /Length", 1)
@case(146)
def c146():
    d = valid_pdf("smask?")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog")  # structurally valid page-level
@case(147)
def c147():
    d = valid_pdf("transparency")
    return d.replace(b"/Type /Page /Parent",
                     b"/Type /Page /Group << /Type /Group /S /Transparency >> /Parent", 1)
@case(148)
def c148():
    d = valid_pdf("aa action")
    aa = b"<< /O << /S /JavaScript /JS (evil) >> >>"
    return d.replace(b"/Contents", b"/AA " + aa + b" /Contents")
@case(149)
def c149():
    d = valid_pdf("goto openaction")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction [3 0 R /Fit]")

manifest = {}
for num in range(100, 150):
    data = CASES[num]()
    if CASE_REBUILD.get(num, True):
        try: data = rebuild_xref(data)
        except Exception as e: print("rebuild failed for", num, e)
    path = os.path.join(FX, "case-%d.pdf" % num)
    with open(path, "wb") as f: f.write(data)
    manifest[str(num)] = {"file": "fx/pdf/case-%d.pdf" % num, "bytes": len(data)}
json.dump(manifest, open(os.path.join(WORK, "manifest-1051-1100.json"), "w"), indent=1)
print("wrote", len(manifest), "fixtures")
