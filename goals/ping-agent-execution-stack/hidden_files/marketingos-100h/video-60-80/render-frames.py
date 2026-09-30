#!/usr/bin/env python3
"""Render the 12 video frames (1920x1080) from recorded evidence.
Frames are deterministic renderings of recorded trial outputs / doc quotes /
inspection results — NOT live captures. Provenance footer on every frame.
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1920, 1080
BG = (16, 18, 24)
PANEL = (24, 27, 36)
ACCENT = (96, 165, 250)
GREEN = (74, 222, 128)
RED = (248, 113, 113)
AMBER = (251, 191, 36)
FG = (226, 232, 240)
DIM = (148, 163, 184)
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANSB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

FOOTER = ("Rendered from recorded evidence (trials 2026-09-30, disposable PG 16 — destroyed after run). "
          "Not a live capture. Narration: synthetic voice. Headline: pending Nolan's pick.")

def base(title, tag):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 110], fill=PANEL)
    d.text((48, 30), title, font=font(SANSB, 44), fill=FG)
    d.text((48, 78), tag, font=font(MONO, 26), fill=DIM)
    d.line([0, 110, W, 110], fill=(45, 55, 72), width=2)
    d.text((48, H - 46), FOOTER, font=font(SANS, 20), fill=DIM)
    return img, d

def term_body(d, lines, y0=170, x0=80, size=30, lh=46):
    f = font(MONO, size)
    y = y0
    for text, color in lines:
        d.text((x0, y), text, font=f, fill=color)
        y += lh
    return y

def wrapped(d, text, x, y, maxw, fnt, fill, lh=44):
    words, line, yy = text.split(), "", y
    for w in words:
        t = (line + " " + w).strip()
        if d.textlength(t, font=fnt) <= maxw:
            line = t
        else:
            d.text((x, yy), line, font=fnt, fill=fill); yy += lh; line = w
    if line:
        d.text((x, yy), line, font=fnt, fill=fill); yy += lh
    return yy

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frames")
os.makedirs(OUT, exist_ok=True)

def save(img, name):
    p = os.path.join(OUT, name)
    img.save(p)
    print("wrote", p)

# ---------- S01 title ----------
img, d = base("What does PostgreSQL read-only actually seal?", "marketingos · block 60–80 · video compiler · 2026-09-30")
d.text((48, 220), "A recorded-evidence piece for senior engineers.", font=font(SANS, 34), fill=DIM)
d.text((48, 300), "We sealed our audit journal with a role setting.", font=font(SANS, 36), fill=FG)
d.text((48, 352), "Then we checked what that setting really does.", font=font(SANS, 36), fill=FG)
d.rectangle([48, 480, W - 48, 640], outline=AMBER, width=3)
d.text((90, 520), "[ HEADLINE — NOLAN'S PICK PENDING: H1 / H2 / H3 ]", font=font(SANSB, 36), fill=AMBER)
d.text((48, 700), "12 shots · ~6 min · every claim ledgered (CL-01…CL-23)", font=font(MONO, 28), fill=DIM)
d.text((48, 760), "8 trials CONFIRMED · 1 REFUTED-as-worded · 5 unresolved questions named", font=font(MONO, 28), fill=DIM)
save(img, "s01.png")

# ---------- S02 T1 ----------
img, d = base("Shot 2 — The default holds… at first", "trial T1 · finding C1 · CONFIRMED · ledger CL-01")
term_body(d, [
    ("$ psql -U app_ro journal          # fresh session", DIM),
    ("journal=> SHOW default_transaction_read_only;", FG),
    (" on", ACCENT),
    ("journal=> INSERT INTO journal(body) VALUES('t1') RETURNING id;", FG),
    ("ERROR:  cannot execute INSERT in a read-only transaction", RED),
    ("", FG),
    ("recorded outcome: the default is real — verified on a", DIM),
    ("disposable database before we trusted it.", DIM),
])
save(img, "s02.png")

# ---------- S03 T2/T3 ----------
img, d = base("Shot 3 — …until the session asks otherwise", "trials T2/T3 · finding C2 · CONFIRMED · ledger CL-02, CL-03")
term_body(d, [
    ("journal=> SET default_transaction_read_only = off;", FG),
    ("SET", ACCENT),
    ("journal=> INSERT INTO journal(body) VALUES('t2') RETURNING id;", FG),
    (" INSERT 0 1", ACCENT),
    ("", FG),
    ("journal=> START TRANSACTION READ WRITE;", FG),
    ("journal=> INSERT INTO journal(body) VALUES('t3') RETURNING id;", FG),
    (" INSERT 0 1", ACCENT),
    ("", FG),
    ("recorded outcome: both lifts restore writes. A default, not a boundary.", GREEN),
])
save(img, "s03.png")

# ---------- S04 docs ----------
img, d = base("Shot 4 — The word 'default' was load-bearing", "PostgreSQL 16 docs · runtime-config-client · ledger CL-04, CL-20")
y = wrapped(d, '"default_transaction_read_only ... controls the default read-only status of each new transaction."', 80, 200, W-200, font(SANS, 34), FG)
y = wrapped(d, "Parameter context: USERSET — settable by any role for its own session. Documented behavior, not just our trial.", 80, y + 40, W-200, font(SANS, 32), DIM)
d.text((80, y + 60), "What we had was a session default, not a privilege boundary.", font=font(SANSB, 36), fill=ACCENT)
save(img, "s04.png")

# ---------- S05 K2 vs T9 ----------
img, d = base("Shot 5 — Our own doc over-claimed", "contradiction K2 · trials T9a/T9b · finding C6 · CONFIRMED · ledger CL-06, CL-05")
d.rectangle([48, 160, 900, 700], outline=(45, 55, 72), width=2)
d.text((80, 190), "OUR RETIREMENT DOC SAID:", font=font(SANSB, 28), fill=DIM)
wrapped(d, '"read-only enforced at the database boundary ... binds even superusers"', 80, 250, 780, font(SANS, 32), AMBER)
d.rectangle([980, 160, W - 48, 700], outline=(45, 55, 72), width=2)
d.text((1010, 190), "TRIALS T9a / T9b (superuser):", font=font(SANSB, 28), fill=DIM)
term_body(d, [
    ("-- T9a: fresh session", DIM),
    ("INSERT ... → ERROR: cannot execute INSERT", RED),
    ("           in a read-only transaction", RED),
    ("-- T9b: superuser runs SET", DIM),
    ("SET default_transaction_read_only = off;", FG),
    ("INSERT ... → INSERT 0 1  (write succeeded)", GREEN),
], y0=250, x0=1010, size=27, lh=44)
d.text((80, 780), "As a claim about PostgreSQL itself, the doc was wrong. (Fairness half: next shot.)", font=font(SANS, 30), fill=FG)
save(img, "s05.png")

# ---------- S06 chain ----------
img, d = base("Shot 6 — The fairness half", "K2 resolution · ledger CL-07 · non-claim N1/U1")
d.text((80, 200), "The doc scoped its claim to the app's connection pattern:", font=font(SANS, 32), fill=FG)
d.text((80, 270), '"the app never issues SET or START TRANSACTION"', font=font(SANS, 34), fill=ACCENT)
d.text((80, 360), "— the doc author's understanding.", font=font(SANS, 32), fill=DIM)
y = 480
for label, color, sub in [
    ("[ doc claim ]", FG, "scoped to the connection pattern"),
    ("      — assumes →", DIM, ""),
    ("[ app never issues SET ]", AMBER, "the author's understanding"),
    ("      — unverified →", RED, ""),
    ("[ gateway code ]", RED, "NOT READ · link unverified (U1)"),
]:
    d.text((120, y), label, font=font(MONO, 34), fill=color)
    if sub:
        d.text((620, y + 4), sub, font=font(SANS, 28), fill=DIM)
    y += 74
d.text((80, 880), "The gap between 'assumed' and 'verified' is what this piece is about.", font=font(SANS, 30), fill=FG)
save(img, "s06.png")

# ---------- S07 T10 ----------
img, d = base("Shot 7 — What actually stopped writes", "trial T10 · finding C7 · CONFIRMED · ledger CL-08, CL-23")
term_body(d, [
    ("-- role app_append: INSERT/UPDATE/DELETE/TRUNCATE revoked", DIM),
    ("journal=> SHOW default_transaction_read_only;", FG),
    (" off     (no read-only default in this trial)", DIM),
    ("journal=> INSERT INTO journal(body) VALUES('t10');", FG),
    ("journal=> UPDATE journal SET body='mut' WHERE id=1;", FG),
    ("journal=> DELETE FROM journal WHERE id=1;", FG),
    ("journal=> TRUNCATE journal;", FG),
    ("recorded outcome: every write blocked — permission denied", RED),
    ("journal=> START TRANSACTION READ WRITE;", FG),
    ("journal=> INSERT INTO journal(body) VALUES('t10b');", FG),
    ("recorded outcome: blocked again — even under explicit READ WRITE", RED),
    ("", FG),
    ("The revocation is a boundary the role cannot cross.", GREEN),
])
save(img, "s07.png")

# ---------- S08 scope ----------
img, d = base("Shot 8 — The most important sentence", "scope limit · ledger CL-09 (N6), CL-10")
d.text((80, 200), "THIS HOLDS FOR NON-SUPERUSER ROLES ONLY.", font=font(SANSB, 40), fill=RED)
y = wrapped(d, "PostgreSQL docs: superusers bypass all permission checks. We did not trial this — we are citing the docs. (N6)", 80, 300, W-200, font(SANS, 32), FG)
y = wrapped(d, "Which means REVOKE cannot bind a superuser. And our own journal role is a superuser — role ping on ping-core-01, verified by read-only inspection, zero write attempts. (C8)", 80, y + 40, W-200, font(SANS, 32), FG)
d.text((80, y + 60), "The universal prescription is dead. The scoped one survives.", font=font(SANS, 32), fill=DIM)
save(img, "s08.png")

# ---------- S09 board ----------
img, d = base("Shot 9 — Our own seal, honestly described", "ledger CL-11 · epistemic boundary CL-21 (N7)")
rows = [
    ("VERIFIED PRESENT", GREEN, "session default in role settings, active in a fresh session (C8)"),
    ("UNVERIFIED", RED, "application discipline — the gateway code was not read (U1/N1)"),
    ("PRESENT · UNTESTED", AMBER, "append-only triggers exist — blocking behavior never tested (U2/N2)"),
]
y = 200
for badge, color, text in rows:
    d.rectangle([80, y, 480, y + 90], outline=color, width=3)
    d.text((110, y + 26), badge, font=font(SANSB, 30), fill=color)
    wrapped(d, text, 520, y + 12, W - 620, font(SANS, 30), FG)
    y += 130
d.text((80, 640), "That is not a privilege boundary.", font=font(SANSB, 36), fill=FG)
y = wrapped(d, "We are not claiming our journal is unsealed, and we are not claiming it is sealed. We claim exactly what we verified, and name what we did not.", 80, 720, W-200, font(SANS, 32), DIM)
save(img, "s09.png")

# ---------- S10 T4/T11 ----------
img, d = base("Shot 10 — Precision beat 1: temp tables", "trials T4/T11 · finding C3 · ledger CL-12, CL-13, CL-22")
d.rectangle([48, 160, 900, 640], outline=(45, 55, 72), width=2)
d.text((80, 190), "T4 — CREATE TEMP TABLE, read-only:", font=font(SANSB, 28), fill=DIM)
term_body(d, [
    ("journal=> CREATE TEMP TABLE t1(i int);", FG),
    ("ERROR:  cannot execute CREATE TABLE", RED),
    ("        in a read-only transaction", RED),
], y0=250, x0=80, size=28, lh=46)
d.rectangle([980, 160, W - 48, 640], outline=(45, 55, 72), width=2)
d.text((1010, 190), "T11 — DML on EXISTING temp table:", font=font(SANSB, 28), fill=DIM)
term_body(d, [
    ("journal=> INSERT INTO t2 VALUES(10);", FG),
    ("INSERT 0 1", GREEN),
    ("journal=> COPY t2 FROM STDIN;", FG),
    ("20", DIM), ("\\.", DIM),
    ("COPY 1", GREEN),
], y0=250, x0=1010, size=28, lh=46)
d.text((80, 700), "A secondary source overstated this as a general temp-table exemption.", font=font(SANS, 30), fill=DIM)
d.text((80, 760), "The trials narrowed it: DML on existing temp tables only. Not DDL.", font=font(SANSB, 32), fill=FG)
save(img, "s10.png")

# ---------- S11 matrix ----------
img, d = base("Shot 11 — Precision beat 2: the matrix", "trials T4–T7, T11 · findings C3–C5 · ledger CL-14, CL-15")
rows = [
    ("SELECT nextval('testseq')", "BLOCKED", RED, "T5"),
    ("CREATE TEMP TABLE", "BLOCKED", RED, "T4"),
    ("pg_advisory_lock / unlock", "works", GREEN, "T6"),
    ("LISTEN / NOTIFY", "works", GREEN, "T7"),
    ("INSERT / COPY on existing temp table", "works", GREEN, "T11"),
]
y = 200
d.text((80, y), "operation", font=font(SANSB, 30), fill=DIM)
d.text((900, y), "in a read-only transaction", font=font(SANSB, 30), fill=DIM)
d.text((1500, y), "trial", font=font(SANSB, 30), fill=DIM)
y += 60
for op, res, color, t in rows:
    d.text((80, y), op, font=font(MONO, 30), fill=FG)
    d.text((900, y), res, font=font(SANSB, 32), fill=color)
    d.text((1500, y), t, font=font(MONO, 28), fill=DIM)
    y += 70
d.text((80, 780), "Do not generalize from the name \"read-only.\" Test each operation class.", font=font(SANSB, 34), fill=FG)
save(img, "s11.png")

# ---------- S12 close ----------
img, d = base("Shot 12 — The honest close", "non-verifications U1–U5 · ledger CL-16…CL-19")
d.text((80, 170), "WHAT WE DID NOT VERIFY:", font=font(SANSB, 34), fill=FG)
items = [
    "whether the gateway code ever issues SET / START TRANSACTION  (U1)",
    "whether the append-only triggers actually block writes — inspected, never tested  (U2)",
    "PG 16 trials vs the journal's PG 17 — docs indicate parity, not trialed  (U3)",
    "any pooler or proxy between gateway and database  (U4)",
    "the full extent of disk writes possible under read-only, beyond tested ops  (U5)",
]
y = 240
for it in items:
    y = wrapped(d, "•  " + it, 100, y, W - 200, font(SANS, 29), DIM, lh=52) + 8
d.rectangle([80, y + 20, W - 80, y + 130], outline=ACCENT, width=2)
d.text((120, y + 44), "NEXT MISSION: test the triggers on a disposable database. No writes against the journal.", font=font(SANS, 30), fill=ACCENT)
d.text((80, y + 170), "The boundary that actually holds, for roles that are not superusers: REVOKE.", font=font(SANSB, 34), fill=FG)
save(img, "s12.png")

print("all frames rendered")
