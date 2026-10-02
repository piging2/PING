#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1101..1150 (documents-pdf cases 150-199).
Third adversarial batch: actions, annotations, form fields, destinations."""
import os, sys, json

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

def annot(subtype, extra=b""):
    return (b"<< /Type /Annot /Subtype /%s /Rect [0 0 100 100] %s >>" % (subtype.encode(), extra))

@case(150)
def c150(): return valid_pdf("page one", 2).replace(b"(page one) Tj", b"(page one) Tj", 1)
@case(151)
def c151():
    d = valid_pdf("outlines mode")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /PageMode /UseOutlines")
@case(152)
def c152():
    d = valid_pdf("layout")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /PageLayout /TwoColumnLeft")
@case(153)
def c153():
    d = valid_pdf("needs rendering")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /NeedsRendering true")
@case(154)
def c154():
    d = valid_pdf("dests")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Dests << /ch1 [3 0 R /Fit] >>")
@case(155)
def c155():
    d = valid_pdf("sound action")
    act = b"<< /Type /Action /S /Sound /Sound << /Type /Sound >> >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(156)
def c156():
    d = valid_pdf("movie action")
    act = b"<< /Type /Action /S /Movie >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(157)
def c157():
    d = valid_pdf("hide action")
    act = b"<< /Type /Action /S /Hide /T (field1) >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(158)
def c158():
    d = valid_pdf("submitform")
    act = b"<< /Type /Action /S /SubmitForm /F (http://x.example/submit) >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(159)
def c159():
    d = valid_pdf("importdata")
    act = b"<< /Type /Action /S /ImportData /F (data.fdf) >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(160)
def c160():
    d = valid_pdf("goto action")
    act = b"<< /Type /Action /S /GoTo /D [3 0 R /Fit] >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(161)
def c161():
    d = valid_pdf("gotor")
    act = b"<< /Type /Action /S /GoToR /F (other.pdf) /D [0 /Fit] >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(162)
def c162():
    d = valid_pdf("thread")
    act = b"<< /Type /Action /S /Thread /D 0 >>"
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction " + act)
@case(163)
def c163():
    d = valid_pdf("named dest")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /Dests << /start [3 0 R /Fit] >>")
@case(164)
def c164():
    d = valid_pdf("fitr")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /OpenAction [3 0 R /FitR 0 0 612 792]")
@case(165)
def c165():
    d = valid_pdf("sticky note")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("Text", b"/Contents (note) /Open false"))
@case(166)
def c166():
    d = valid_pdf("fileattach")
    a = annot("FileAttachment", b"/FS << /Type /Filespec /F (evil.bin) >>")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % a)
@case(167)
def c167():
    d = valid_pdf("sound annot")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("Sound"))
@case(168)
def c168():
    d = valid_pdf("stamp")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("Stamp", b"/Name /Approved"))
@case(169)
def c169():
    d = valid_pdf("ink")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("Ink", b"/InkList [[0 0 10 10]]"))
@case(170)
def c170():
    d = valid_pdf("highlight")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("Highlight", b"/QuadPoints [0 0 100 0 100 20 0 20]"))
@case(171)
def c171():
    d = valid_pdf("border")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("Square", b"/Border [0 0 2]"))
@case(172)
def c172():
    d = valid_pdf("color annot")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("Circle", b"/C [1 0 0]"))
@case(173)
def c173():
    d = valid_pdf("text field")
    f = b"<< /Type /Annot /Subtype /Widget /FT /Tx /T (f1) /V (hello) /Rect [0 0 100 20] >>"
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % f)
@case(174)
def c174():
    d = valid_pdf("checkbox")
    f = b"<< /Type /Annot /Subtype /Widget /FT /Btn /T (c1) /V /Yes /AS /Yes /Rect [0 0 20 20] >>"
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % f)
@case(175)
def c175():
    d = valid_pdf("choice")
    f = b"<< /Type /Annot /Subtype /Widget /FT /Ch /T (ch1) /V (a) /Opt [(a) (b)] /Rect [0 0 100 20] >>"
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % f)
@case(176)
def c176():
    d = valid_pdf("sig field")
    f = b"<< /Type /Annot /Subtype /Widget /FT /Sig /T (sig1) /Rect [0 0 100 20] >>"
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % f)
@case(177)
def c177():
    d = valid_pdf("needappear")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /AcroForm << /NeedAppearances true >>")
@case(178)
def c178():
    d = valid_pdf("dr")
    return d.replace(b"/Type /Catalog",
                     b"/Type /Catalog /AcroForm << /DR << /Font << /F1 5 0 R >> >> >>")
@case(179)
def c179():
    d = valid_pdf("da")
    return d.replace(b"/Type /Catalog",
                     b"/Type /Catalog /AcroForm << /DA (/Helv 12 Tf 0 g) >>")
@case(180)
def c180():
    d = valid_pdf("xfa")
    return d.replace(b"/Type /Catalog",
                     b"/Type /Catalog /AcroForm << /XFA [<< /Length 10 >>] >>")
@case(181)
def c181():
    d = valid_pdf("richmedia")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("RichMedia"))
@case(182)
def c182():
    d = valid_pdf("3d annot")
    a = b"<< /Type /Annot /Subtype /3D /Rect [0 0 100 100] >>"
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % a)
@case(183)
def c183():
    d = valid_pdf("screen")
    a = b"<< /Type /Annot /Subtype /Screen /Rect [0 0 100 100] >>"
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % a)
@case(184)
def c184():
    d = valid_pdf("printermark")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("PrinterMark"))
@case(185)
def c185():
    d = valid_pdf("trapnet")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog /TrapNet << /Type /TrapNetwork >>")
@case(186)
def c186():
    d = valid_pdf("hidden annot")
    return d.replace(b"/Contents", b"/Annots [%s] /Contents" % annot("Text", b"/F 2"))
@case(187)
def c187():
    d = valid_pdf("structparents")
    return d.replace(b"/MediaBox [0 0 612 792]", b"/MediaBox [0 0 612 792] /StructParents 0", 1)
@case(188)
def c188():
    d = valid_pdf("tabs")
    return d.replace(b"/MediaBox [0 0 612 792]", b"/MediaBox [0 0 612 792] /Tabs /S", 1)
@case(189)
def c189():
    d = valid_pdf("pz")
    return d.replace(b"/MediaBox [0 0 612 792]", b"/MediaBox [0 0 612 792] /PZ 1.5", 1)
@case(190)
def c190():
    d = valid_pdf("unbalanced q")
    return d.replace(b"Tj ET", b"Tj Q Q ET")
@case(191)
def c191():
    d = valid_pdf("PLACEHOLDER")
    many = b" ".join(b"(w) Tj" for _ in range(20000))
    return d.replace(b"(PLACEHOLDER) Tj", many)
@case(192)
def c192():
    import zlib as z
    raw = b"BT /F1 24 Tf 100 700 Td (chained) Tj ET"
    comp = z.compress(raw)
    import base64
    enc = base64.a85encode(comp, adobe=True)
    d = valid_pdf("PLACEHOLDER")
    newstream = (b"<< /Length %d /Filter [/ASCII85Decode /FlateDecode] >>\nstream\n" % len(enc)
                 + enc + b"\nendstream")
    import re
    return re.sub(rb"<< /Length \d+ >>\nstream\n.*?endstream", lambda m: newstream, d, count=1, flags=re.S)
@case(193)
def c193():
    d = valid_pdf("PLACEHOLDER")
    return d.replace(b"(PLACEHOLDER) Tj", b"[ (a) 120 (b) -40 (c) ] TJ")
@case(194)
def c194():
    d = valid_pdf("predictor?")
    return d.replace(b"<< /Length", b"<< /DecodeParms << /Predictor 12 /Columns 4 >> /Length", 1)
@case(195)
def c195():
    d = valid_pdf("type0")
    f = (b"<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiMin-W3 "
         b"/DescendantFonts [<< /Type /Font /Subtype /CIDFontType2 /BaseFont /HeiseiMin-W3 >>] >>")
    return d.replace(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", f)
@case(196)
def c196():
    d = valid_pdf("fontfile3")
    fd = (b"<< /Type /FontDescriptor /FontName /F /FontFile3 9 0 R >>")
    return d.replace(b"/BaseFont /Helvetica >>", b"/BaseFont /Helvetica /FontDescriptor " + fd + b" >>")
@case(197)
def c197():
    d = valid_pdf("cidsys")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog")  # valid baseline variant
@case(198)
def c198():
    d = valid_pdf("w arrays")
    return d.replace(b"/Type /Catalog", b"/Type /Catalog")  # valid baseline variant
@case(199)
def c199(): return valid_pdf("cap page", 200)

manifest = {}
for num in range(150, 200):
    data = CASES[num]()
    if CASE_REBUILD.get(num, True):
        try: data = rebuild_xref(data)
        except Exception as e: print("rebuild failed for", num, e)
    path = os.path.join(FX, "case-%d.pdf" % num)
    with open(path, "wb") as f: f.write(data)
    manifest[str(num)] = {"file": "fx/pdf/case-%d.pdf" % num, "bytes": len(data)}
json.dump(manifest, open(os.path.join(WORK, "manifest-1101-1150.json"), "w"), indent=1)
print("wrote", len(manifest), "fixtures")
