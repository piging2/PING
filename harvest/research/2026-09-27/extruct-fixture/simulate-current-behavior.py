"""
Soundness check for the extruct Q9 fixture (research space only, never run against the repo).

1. CURRENT-IMPLEMENTATION MIRROR: implements exactly what the 2026-09-26 audit
   verified for src/fyd/proceduralize/structured-data.ts (670 LOC):
   discoverStructuredData (line 74) extracts exclusively
   <script type="application/ld+json"> blocks via regex; no microdata/RDFa/
   itemscope parsing anywhere. We run this mirror over the fixture HTML and
   show it yields zero records, so the test's `expect(...).toHaveLength(1)`
   fails with received length 0. This is the "fails before" half of Q9.

2. MINIMAL-PARSER PROTOTYPE: a small microdata itemscope/itemprop walker
   (~60 lines, html.parser only) demonstrating what the TS patch must add.
   We run the test's assertions (shape-tolerant find + six field values)
   against its output to show the "passes after" half is satisfiable by a
   minimal, type-filtered parser, not by the full extruct architecture.
"""
import json
import re
import sys
from html.parser import HTMLParser

FIXTURE = "amicomechanical-microdata.html"

# ---------------------------------------------------------------- current mirror
LD_JSON_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)

def current_discover_structured_data(html: str):
    """Mirrors the verified current behavior: JSON-LD regex extraction only."""
    records = []
    for m in LD_JSON_RE.finditer(html):
        try:
            records.append(json.loads(m.group(1)))
        except json.JSONDecodeError:
            continue
    return records

# ------------------------------------------------- minimal microdata prototype
class MicrodataParser(HTMLParser):
    """Minimal itemscope/itemprop walker. Emits JSON-LD-shaped records
    ({"@type": ..., props...}) so downstream consumers see one record shape."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []          # open itemscope frames: {"type": str, "props": dict, "prop": str|None}
        self.records = []

    def _cur(self):
        return self.stack[-1] if self.stack else None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "itemscope" in a:
            itemtype = a.get("itemtype", "")
            short = itemtype.rsplit("/", 1)[-1] if itemtype else "Thing"
            frame = {"type": short, "props": {}, "prop": a.get("itemprop")}
            self.stack.append(frame)
        elif "itemprop" in a:
            val = a.get("content") or a.get("href") or a.get("src") or ""
            frame = self._cur()
            if frame is not None:
                frame["props"].setdefault(a["itemprop"], []).append(val)
                frame["_pending_text_prop"] = a["itemprop"]

    def handle_data(self, data):
        text = data.strip()
        if not text:
            return
        frame = self._cur()
        if frame is None:
            return
        prop = frame.pop("_pending_text_prop", None)
        if prop is not None and not frame["props"][prop][-1]:
            frame["props"][prop][-1] = text  # element with itemprop, text content
        # text directly inside an itemscope without itemprop is ignored (same as extruct)

    def handle_endtag(self, tag):
        # Pop one itemscope frame per closing tag only if the top frame was
        # opened by an element; html.parser does not pair scopes to tags, so we
        # close a scope when its opening element's matching close arrives via a
        # depth counter.
        pass

    # The parser above is intentionally simple; scope closing is handled by a
    # second pass below using a tag-depth-aware variant for correctness.
    def close(self):
        super().close()

def parse_microdata(html: str):
    """Depth-aware microdata extraction (still small, still stdlib-only)."""
    class P(HTMLParser):
        VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
                "link", "meta", "param", "source", "track", "wbr"}
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.depth = 0
            self.scopes = []   # (open_depth, prop_name, record)
            self.records = []
        def handle_starttag(self, tag, attrs):
            if tag in self.VOID:
                return  # void elements must not disturb scope-depth pairing
            a = dict(attrs)
            self.depth += 1
            if "itemscope" in a:
                itemtype = a.get("itemtype", "")
                short = itemtype.rsplit("/", 1)[-1] if itemtype else "Thing"
                rec = {"@type": short}
                prop = a.get("itemprop")
                self.scopes.append((self.depth, prop, rec, {}))
            elif "itemprop" in a and self.scopes:
                d, prop, rec, pending = self.scopes[-1]
                val = a.get("content") or a.get("href") or a.get("src")
                if val is None:
                    pending[a["itemprop"]] = True  # text content follows
                    self.scopes[-1] = (d, prop, rec, pending)
                else:
                    rec.setdefault(a["itemprop"], val)
        def handle_data(self, data):
            text = data.strip()
            if text and self.scopes:
                d, prop, rec, pending = self.scopes[-1]
                for k in list(pending.keys()):
                    if k not in rec:
                        rec[k] = text
                    del pending[k]
                self.scopes[-1] = (d, prop, rec, pending)
        def handle_endtag(self, tag):
            # close any scopes opened at this depth
            while self.scopes and self.scopes[-1][0] == self.depth:
                d, prop, rec, pending = self.scopes.pop()
                if self.scopes:
                    pd, pprop, prec, ppending = self.scopes[-1]
                    prec[prop] = rec
                    self.scopes[-1] = (pd, pprop, prec, ppending)
                else:
                    self.records.append(rec)
            self.depth -= 1
    p = P()
    p.feed(html)
    p.close()
    return p.records

def find_typed(records, type_name):
    found = []
    def visit(node):
        if isinstance(node, list):
            for x in node: visit(x)
        elif isinstance(node, dict):
            t = node.get("@type")
            names = t if isinstance(t, list) else [t]
            if any(isinstance(n, str) and type_name in n for n in names):
                found.append(node)
            for v in node.values(): visit(v)
    visit(records)
    return found

def main():
    with open(FIXTURE, encoding="utf-8") as f:
        html = f.read()

    current = current_discover_structured_data(html)
    print("CURRENT implementation mirror: records found =", len(current))
    businesses = find_typed(current, "LocalBusiness")
    print("LocalBusiness records under current impl:", len(businesses))
    assert len(businesses) == 0, "unexpected: current impl found a record"
    print("=> test assertion `expect(businesses).toHaveLength(1)` FAILS (received 0). Q9 'fails before' CONFIRMED by simulation.\n")

    harvested = parse_microdata(html)
    businesses2 = find_typed(harvested, "LocalBusiness")
    print("MINIMAL microdata parser: LocalBusiness records =", len(businesses2))
    assert len(businesses2) == 1
    text = json.dumps(businesses2[0])
    for expected in [
        "Amico Plumbing & Mechanical Inc.",
        "595 N. Westgate Drive",
        "Grand Junction",
        "Colorado",
        "81505",
        "970-241-6258",
    ]:
        assert expected in text, f"missing field value: {expected}"
    print("All six field values present in the typed record.")
    print("=> test assertions PASS under the minimal patch. Q9 'passes after' is satisfiable without the extruct architecture.")
    print("\nPrototype record:")
    print(json.dumps(businesses2[0], indent=2))

if __name__ == "__main__":
    sys.exit(main())
