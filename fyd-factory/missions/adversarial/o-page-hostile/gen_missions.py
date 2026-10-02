#!/usr/bin/env python3
"""Generate 200 hostile /o missions (OADV-001..OADV-200).

Categories:
  hostile-website   OADV-001..030  (expect: no website capability)
  hostile-phone     OADV-031..060  (expect: no call capability)
  hostile-email     OADV-061..090  (expect: no email capability)
  smuggling         OADV-091..120  (control chars / trim games, mixed fields)
  hostile-media     OADV-121..140  (resolveSafeLink navigate direct)
  private-direct    OADV-141..160  (composeObjectView on a private object: observe)
  private-relation  OADV-161..180  (relationship traversal into private objects)
  positive-control  OADV-181..200  (legit values still work)
"""
import json, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "missions.jsonl")
BIZ = "ping.social.business@1"
SVC = "ping.social.service@1"

def obj(mid, fields, visibility="public", title=None, schema=BIZ, description=None):
    return {
        "id": f"{mid}-biz", "schema": schema, "controllerId": f"{mid}-ctrl",
        "visibility": visibility,
        "title": title or f"Synthetic Test Business {mid}",
        "description": description or "Synthetic fixture for adversarial /o testing.",
        "fields": fields,
        "createdAt": "2026-09-24T00:00:00.000Z",
        "updatedAt": "2026-09-24T00:00:00.000Z",
        "provenance": {"kind": "website-derived", "ref": "synthetic-fixture",
                       "derivedAt": "2026-09-24T00:00:00.000Z"},
    }

def mission(mid, category, o, expect, extra_objects=None, relationships=None):
    return {"mission_id": mid, "category": category,
            "synthetic": True, "testing_only": True,
            "object": o,
            "extra_objects": extra_objects or [],
            "relationships": relationships or [],
            "expect": expect}

def rel(subj, pred, obj_):
    return {"id": f"rel-{subj}-{pred}-{obj_}", "subject": subj, "predicate": pred,
            "object": obj_, "status": "active", "createdAt": "2026-09-24T00:00:00.000Z",
            "evidenceRef": "synthetic-fixture"}

missions = []
def add(m): missions.append(m)

N = 0
def nid():
    global N
    N += 1
    return f"OADV-{N:03d}"

# ---- hostile-website: 30 ----
websites = [
    "javascript:alert(1)", "JaVaScRiPt:alert(1)", "  javascript:alert(1)",
    "\x00javascript:alert(1)", "javascript:alert(1)\x00",
    "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)",
    "file:///etc/passwd", "blob:https://example.com/uuid",
    "java\tscript:alert(1)", "java\nscript:alert(1)",
    "\u200bjavascript:alert(1)", "\ufeffjavascript:alert(1)",
    "HtTpS://example.com", "https://user:pass@example.com",
    "https://example.com:99999", "http://[::1", "https://",
    "//example.com/path", "/relative/path", "example.com",
    "mailto:shop@example.com", "tel:+19705550100",
    "javascript&#58;alert(1)", "&#106;avascript:alert(1)",
    "https://example.com/\x7f", "\x1bjavascript:alert(1)",
    "JaVaScRiPt\n:alert(1)", "data:image/svg+xml,<svg onload=alert(1)>",
    "java&#x09;script:alert(1)",
]
assert len(websites) == 30
for w in websites:
    mid = nid()
    add(mission(mid, "hostile-website", obj(mid, {"website": w}),
                {"no_capability": "website"}))

# ---- hostile-phone: 30 ----
phones = [
    "1234567\njavascript:alert(1)", "tel:javascript:alert(1)",
    "+1 (970) 555-0100; rm -rf", "<script>alert(1)</script>",
    "javascript:alert(1)", "123-456\x00", "   ", "abc", "+-(). ",
    "１２３４５６７", "1234\x7f5678", "+1-970-555-0100 ext. 123",
    "1-800-FLOWERS", "*67 9705550100", "970_555_0100",
    "(970) 555-0100\r\nBcc:evil@x.com", "\\\\+19705550100", "+19705550100\x08",
    "１(970)555-0100", "970\x0b5550100", "+--(   )", "00\n1\n970",
    "&#43;19705550100", "+1 (970) 555-0100#", "+1 (970) 555-0100?x=1",
    "+1 (970) 555-0100,123", "N/A", "unknown",
    "+19705550100;javascript:alert(1)", "callto:+19705550100",
]
assert len(phones) == 30
for p in phones:
    mid = nid()
    add(mission(mid, "hostile-phone", obj(mid, {"phone": p}),
                {"no_capability": "call"}))

# ---- hostile-email: 30 ----
emails = [
    'a@b.com" onclick="alert(1)', "shop@example.com><script>alert(1)</script>",
    "a b@c.com", "a@b c.com", "plainstring", "@example.com", "a@", "a@b",
    "a@b.", "a@b.com\nBcc:x@y.com", "a@\tb.com", '"quoted"@example.com',
    "<angle@example.com>", "a@@b.com", "a\n@b.com", "a@b.com\x7f",
    "a@b.com\x00", "java\tscript:alert(1)", "data:text/html,<b>@x.com",
    "vbscript:msgbox(1)@x", "a@b@c@d.com", "a@b,com", "a b@c@d.com",
    "\x01a@b.com", "a@b.com\x1f", '"><svg onload=alert(1)>@x.com',
    'a@b.com"', "a@b .com", "a@b..", "a @b.com",
]
assert len(emails) == 30
for e in emails:
    mid = nid()
    add(mission(mid, "hostile-email", obj(mid, {"email": e}),
                {"no_capability": "email"}))

# ---- smuggling: 30 (mixed fields) ----
smuggle = [
    ("website", "\x00https://example.com", {"no_capability": "website"}),
    ("website", "https://example.com\x00", {"no_capability": "website"}),
    ("website", "https:\x00//example.com", {"no_capability": "website"}),
    ("website", "\x1fhttps://example.com", {"no_capability": "website"}),
    ("website", "https://exam\x7fple.com", {"no_capability": "website"}),
    ("phone", "970\x005550100", {"no_capability": "call"}),
    ("phone", "\x009705550100", {"no_capability": "call"}),
    ("phone", "9705550100\x1b", {"no_capability": "call"}),
    ("email", "\x00a@b.com", {"no_capability": "email"}),
    ("email", "a@b.com\x00", {"no_capability": "email"}),
    ("website", "\u2028https://example.com",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("website", "\u00a0https://example.com",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("website", "https://example.com\u200b", {"no_capability": "website"}),
    ("phone", "+1\u00a09705550100",
     {"capability": {"kind": "call", "href": "tel:+19705550100"}}),
    ("email", "a@\u00a0b.com", {"no_capability": "email"}),
    ("website", "java\tscript:alert(1)", {"no_capability": "website"}),
    ("website", "java\tscript\n:alert(1)", {"no_capability": "website"}),
    ("phone", "123\t456", {"no_capability": "call"}),
    ("email", "a\t@b.com", {"no_capability": "email"}),
    ("website", "\r\njavascript:alert(1)", {"no_capability": "website"}),
    ("website", "\t https://example.com \n",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("phone", "\t+19705550100\t",
     {"capability": {"kind": "call", "href": "tel:+19705550100"}}),
    ("email", " shop@example.com ",
     {"capability": {"kind": "email", "href": "mailto:shop@example.com"}}),
    ("website", "https://example.com\nevil", {"no_capability": "website"}),
    ("website", "https://example.com\r",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("phone", "970-555\x0100", {"no_capability": "call"}),
    ("email", "sh\x00op@example.com", {"no_capability": "email"}),
    ("website", "\x7f", {"no_capability": "website"}),
    ("website", "\x00", {"no_capability": "website"}),
    ("website", "", {"no_capability": "website"}),
]
assert len(smuggle) == 30
for field, val, expect in smuggle:
    mid = nid()
    add(mission(mid, "smuggling", obj(mid, {field: val}), expect))

# ---- hostile-media: 20 (resolveSafeLink navigate, direct) ----
media_urls = [
    ("javascript:alert(1)", "non_navigable", None),
    ("data:text/html,<script>alert(1)</script>", "non_navigable", None),
    ("vbscript:msgbox(1)", "non_navigable", None),
    ("file:///etc/passwd", "non_navigable", None),
    ("blob:https://example.com/x", "non_navigable", None),
    ("data:image/svg+xml,<svg onload=alert(1)>", "non_navigable", None),
    ("\x00https://example.com/img.jpg", "non_navigable", None),
    ("https://example.com/img.jpg\x00", "non_navigable", None),
    ("JaVaScRiPt:alert(1)", "non_navigable", None),
    ("https://example.com/photo.jpg", "safe", "https://example.com/photo.jpg"),
    ("http://example.com/photo.jpg", "safe", "http://example.com/photo.jpg"),
    ("//example.com/photo.jpg", "non_navigable", None),
    ("/img/photo.jpg", "non_navigable", None),
    ("example.com/photo.jpg", "non_navigable", None),
    ('https://example.com/photo.jpg" onerror="alert(1)', "safe",
     'https://example.com/photo.jpg%22%20onerror=%22alert(1)'),
    ("java\tscript:alert(1)", "non_navigable", None),
    ("data:,", "non_navigable", None),
    ("about:blank", "non_navigable", None),
    ("https://user:pass@example.com/img.jpg", "safe",
     "https://user:pass@example.com/img.jpg"),
    ("ftp://example.com/img.jpg", "non_navigable", None),
]
assert len(media_urls) == 20
for url, kind, href in media_urls:
    mid = nid()
    exp = {"resolve": "navigate", "expect_kind": kind}
    if href:
        exp["expect_href"] = href
    add(mission(mid, "hostile-media", obj(mid, {}),
                exp, ))

# fix: hostile-media missions carry the url in expect
for m in missions:
    if m["category"] == "hostile-media":
        idx = int(m["mission_id"].split("-")[1]) - 121
        m["expect"]["url"] = media_urls[idx][0]

# ---- private-direct: 20 (observe) ----
for i in range(20):
    mid = nid()
    marker = f"PRIV-MARK-{1000+i}"
    if i < 5:
        fields = {"website": "javascript:alert(1)"}
        note = "private object with hostile website"
    elif i < 10:
        fields = {"phone": "123\njavascript:alert(1)"}
        note = "private object with hostile phone"
    elif i < 15:
        fields = {"email": 'x@y.com" onclick="alert(1)'}
        note = "private object with hostile email"
    else:
        fields = {"website": "https://example.com", "phone": "(970) 555-0100",
                  "email": "shop@example.com"}
        note = "private object with legitimate contact"
    o = obj(mid, fields, visibility="private",
            description=f"Synthetic private fixture. {marker}. {note}.")
    add(mission(mid, "private-direct", o, {"observe": "private-compose"}))

# ---- private-relationship: 20 ----
for i in range(20):
    mid = nid()
    biz = obj(mid, {"website": "https://example.com"})
    if i < 15:
        svc_name = f"PRIV-SVC-MARK-{2000+i}"
        svc = obj(mid, {}, visibility="private", title=svc_name, schema=SVC,
                  description="Synthetic private service.")
        svc["id"] = f"{mid}-svc"
        pred = "provides" if i < 10 else "offers"
        add(mission(mid, "private-relationship", biz,
                    {"absent_service": svc_name},
                    extra_objects=[svc],
                    relationships=[rel(biz["id"], pred, svc["id"])]))
    else:
        svc_name = f"PUBLIC-SVC-CTRL-{3000+i}"
        svc = obj(mid, {}, visibility="public", title=svc_name, schema=SVC,
                  description="Synthetic public service control.")
        svc["id"] = f"{mid}-svc"
        add(mission(mid, "private-relationship", biz,
                    {"present_service": svc_name},
                    extra_objects=[svc],
                    relationships=[rel(biz["id"], "provides", svc["id"])]))

# ---- positive-control: 20 ----
positives = [
    ("website", "https://example.com",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("website", "https://example.com",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("website", "https://example.com",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("website", "https://example.com",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("website", "https://example.com",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("website", "http://example.com/path?q=1",
     {"capability": {"kind": "website", "href": "http://example.com/path?q=1"}}),
    ("phone", "(970) 555-0100",
     {"capability": {"kind": "call", "href": "tel:(970)555-0100"}}),
    ("phone", "(970) 555-0100",
     {"capability": {"kind": "call", "href": "tel:(970)555-0100"}}),
    ("phone", "(970) 555-0100",
     {"capability": {"kind": "call", "href": "tel:(970)555-0100"}}),
    ("phone", "(970) 555-0100",
     {"capability": {"kind": "call", "href": "tel:(970)555-0100"}}),
    ("phone", "+1-970-555-0100",
     {"capability": {"kind": "call", "href": "tel:+1-970-555-0100"}}),
    ("email", "shop@example.com",
     {"capability": {"kind": "email", "href": "mailto:shop@example.com"}}),
    ("email", "shop@example.com",
     {"capability": {"kind": "email", "href": "mailto:shop@example.com"}}),
    ("email", "shop@example.com",
     {"capability": {"kind": "email", "href": "mailto:shop@example.com"}}),
    ("email", "shop@example.com",
     {"capability": {"kind": "email", "href": "mailto:shop@example.com"}}),
    ("email", "info.shop+tag@example.co.uk",
     {"capability": {"kind": "email", "href": "mailto:info.shop+tag@example.co.uk"}}),
    ("website", "HTTPS://EXAMPLE.COM",
     {"capability": {"kind": "website", "href": "https://example.com/"}}),
    ("phone", "9705550100",
     {"capability": {"kind": "call", "href": "tel:9705550100"}}),
]
assert len(positives) == 18
for field, val, expect in positives:
    mid = nid()
    add(mission(mid, "positive-control", obj(mid, {field: val}), expect))
# all-three-legit
mid = nid()
add(mission(mid, "positive-control",
            obj(mid, {"website": "https://example.com", "phone": "(970) 555-0100",
                      "email": "shop@example.com"}),
            {"capabilities": [
                {"kind": "website", "href": "https://example.com/"},
                {"kind": "call", "href": "tel:(970)555-0100"},
                {"kind": "email", "href": "mailto:shop@example.com"}]}))
# no-contact negative control
mid = nid()
add(mission(mid, "positive-control", obj(mid, {}),
            {"no_capabilities": ["website", "call", "email"]}))

assert N == 200, f"expected 200 missions, got {N}"
assert len(missions) == 200

with open(OUT, "w", encoding="utf-8") as fh:
    for m in missions:
        assert m["synthetic"] is True and m["testing_only"] is True
        fh.write(json.dumps(m, ensure_ascii=False) + "\n")
print(f"wrote {len(missions)} missions to {OUT}")

from collections import Counter
print(Counter(m["category"] for m in missions))
