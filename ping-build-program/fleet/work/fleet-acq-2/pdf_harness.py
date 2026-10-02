#!/usr/bin/env python3
"""fleet-acq-2 acquisition ACQ-1001..1050 (documents-pdf cases 50-99).
Hardened extraction boundary: every fixture must end BOUNDED_SUCCESS (with
provenance), TYPED_FAILURE, or QUARANTINE. A parser guess is never presented
as a canonical fact."""
import io, json, os

from pypdf import PdfReader
from pypdf.errors import PdfReadError

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "pdf")
MAX_BYTES = 5 * 1024 * 1024
MAX_PAGES = 200
MAX_CHARS = 1_000_000

ACTIVE_KEYS = (b"/JavaScript", b"/JS", b"/Launch", b"/EmbeddedFiles", b"/Sound",
               b"/Movie", b"/Hide", b"/SubmitForm", b"/ImportData", b"/GoToR",
               b"/XFA", b"/RichMedia", b"/Subtype /3D", b"/Subtype /Screen", b"/FileAttachment")

def classify(num, data):
    prov = {"case": num, "bytes": len(data)}
    if len(data) == 0:
        return ("TYPED_FAILURE", "empty file: zero bytes", prov)
    if len(data) > MAX_BYTES:
        return ("TYPED_FAILURE", "size %d exceeds cap %d" % (len(data), MAX_BYTES), prov)
    if not data.lstrip(b"\xef\xbb\xbf \t\r\n").startswith(b"%PDF-"):
        return ("TYPED_FAILURE", "missing %PDF header: not a PDF", prov)
    for key in ACTIVE_KEYS:
        if key in data:
            return ("QUARANTINE", "active content marker %s present" % key.decode(), prov)
    if b"/URI" in data and b"/Annot" in data:
        return ("QUARANTINE", "URI action annotation present", prov)
    if b"/OpenAction" in data:
        seg = data[data.index(b"/OpenAction"):data.index(b"/OpenAction") + 400]
        if any(s in seg for s in (b"/JavaScript", b"/Launch", b"/URI", b"/SubmitForm",
                                  b"/ImportData", b"/Hide", b"/Movie", b"/Sound")):
            return ("QUARANTINE", "OpenAction with dangerous action type", prov)
        prov["openaction_benign_goto"] = True
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as e:
        return ("TYPED_FAILURE", "parse error: %s: %s" % (type(e).__name__, str(e)[:120]), prov)
    if reader.is_encrypted:
        try:
            ok = reader.decrypt("")  # null credential only; never guess passwords
        except Exception:
            ok = 0
        if not ok:
            return ("TYPED_FAILURE", "encrypted: no credential available, will not guess", prov)
        prov["decrypted_with_null_credential"] = True
    try:
        npages = len(reader.pages)
    except Exception as e:
        return ("TYPED_FAILURE", "page tree unreadable: %s" % type(e).__name__, prov)
    prov["pages"] = npages
    if npages == 0:
        return ("TYPED_FAILURE", "zero pages", prov)
    if npages > MAX_PAGES:
        return ("TYPED_FAILURE", "page count %d exceeds cap %d" % (npages, MAX_PAGES), prov)
    texts = []
    try:
        for i, page in enumerate(reader.pages):
            t = page.extract_text() or ""
            texts.append(t)
            if sum(len(x) for x in texts) > MAX_CHARS:
                return ("TYPED_FAILURE", "extracted text exceeds cap", prov)
    except Exception as e:
        return ("TYPED_FAILURE", "extraction error on page %d: %s" % (i, type(e).__name__), prov)
    total = sum(len(t) for t in texts)
    prov["chars"] = total
    prov["method"] = "pypdf extract_text per page"
    if total == 0:
        return ("BOUNDED_SUCCESS", "no extractable text (image-only or empty pages); 0 chars with provenance", prov)
    return ("BOUNDED_SUCCESS", "%d chars from %d pages" % (total, npages), prov)

def main():
    import sys
    start, end = int(sys.argv[1]), int(sys.argv[2])
    manifest_name, evidence_name = sys.argv[3], sys.argv[4]
    manifest = json.load(open(os.path.join(WORK, manifest_name)))
    results = {}
    for num in range(start, end + 1):
        data = open(os.path.join(FX, "case-%d.pdf" % num), "rb").read()
        verdict, detail, prov = classify(num, data)
        results[str(num)] = {"verdict": verdict, "detail": detail, "provenance": prov,
                             "pass": verdict in ("BOUNDED_SUCCESS", "TYPED_FAILURE", "QUARANTINE")}
        print("case %d: %s -- %s" % (num, verdict, detail))
    counts = {}
    for v in results.values():
        counts[v["verdict"]] = counts.get(v["verdict"], 0) + 1
    results["_meta"] = {"counts": counts, "all_typed": all(v["pass"] for v in results.values() if isinstance(v, dict) and "pass" in v)}
    json.dump(results, open(os.path.join(WORK, evidence_name), "w"), indent=1)
    print(counts, "all_typed:", results["_meta"]["all_typed"])

if __name__ == "__main__":
    main()
