#!/usr/bin/env python3
"""Onset stress suite (worker A): 50 diverse generation starts through Engine D.

Runs on the Pig (127.0.0.1:5000 /clone), mirroring engines/local_qwen.py's
exact request shape (multipart reference_audio + text/ref_text form fields,
sacrificial "Okay. " carrier, cut_carrier_aligned forced-alignment trim).

For each case: generate -> save pre-cut raw -> copy -> cut_carrier_aligned ->
score the final clip with faster-whisper STT + PCM onset analysis.

Defect classes:
  1. hallucinated leading word   (extra word before the real text)
  2. carrier leak                ("okay" survives the cut)
  3. missing first phoneme       (first word truncated at onset)
  4. reference-tail leak         (words from the reference transcript leak in)
  5. clicks/pops at onset        (discontinuity in first ~120ms)
  6. startup fragments           (short speech burst before the first word)

Target: 0 in every class. Writes results.json + results.md next to itself.
"""

import json
import os
import shutil
import sys
import wave

import numpy as np
import requests

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from audio_fix import CARRIER, cut_carrier_aligned  # noqa: E402

REF_WAV = "/home/nolan/voice-studio/refs/nolan-ref-15s.wav"
REF_TEXT = ("Using these will explore how these pieces fit together, where they overlap, "
            "where they conflict and how they can be organized into a constitutional "
            "architecture built around replay truth. The goal is to interconnect more APIs.")
URL = "http://127.0.0.1:5000/clone"

# Distinctive reference-tail vocabulary (words that must never appear at onset
# unless the case text itself contains them).
TAIL_VOCAB = {"interconnect", "apis", "constitutional", "replay", "truth",
              "architecture", "organized", "overlap", "conflict"}

CASES = [
    # vowel starts
    "An apple a day keeps the doctor away, or so the old saying goes.",
    "Every engineer on the team agreed the deadline was impossible.",
    "I never expected the migration to finish before midnight.",
    "Open the dashboard and tell me what the error rate looks like.",
    "Underneath the polished homepage, the database was a complete mess.",
    "Eggs over easy, rye toast, and black coffee, he ordered without looking up.",
    # hard consonants
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs before noon.",
    "Brick by brick, we rebuilt the entire pipeline from scratch.",
    "Quick decisions beat perfect plans when the market moves this fast.",
    "Strict schedules kept the project on track through a brutal winter.",
    "Click the link below and the report downloads instantly.",
    # numbers
    "In 2026, revenue grew 34 percent while costs fell 12 percent.",
    "Three hundred forty-seven customers signed up in the first week.",
    "Half a second is all the latency budget we have left.",
    "At 4:30 PM on Friday, the servers finally went quiet.",
    "Ninety-nine percent uptime sounds great until you do the math.",
    "1-800-555-0199. Call before midnight and mention this ad.",
    # quotes
    "\"'Ship it,' she said, 'before someone else does.'\"",
    "\"The best time to plant a tree was twenty years ago,\" he quoted.",
    "She whispered, \"Meet me at the north gate at midnight.\"",
    "'Twas the week before launch, and all through the office, nobody slept.",
    "The sign read: \"No refunds after thirty days.\"",
    # questions
    "What exactly are we optimizing for here?",
    "How did the database end up with three primary keys?",
    "Why would anyone schedule a deploy on a Friday afternoon?",
    "Are you sure the backup actually ran last night?",
    "Could this meeting have been an email?",
    # acronyms
    "The API and GPU handshake failed during the LLM benchmark.",
    "NASA, NOAA, and the EPA all published conflicting reports.",
    "Our SLA guarantees 99.99 percent uptime across all AWS regions.",
    "PING, FYD, and ORCA are the three pillars of the platform.",
    # proper nouns
    "Mesa County keeps growing faster than anyone predicted.",
    "Palisade peaches ripen earlier than the orchards in Paonia.",
    "Xavier from the Berlin office joined the call at dawn.",
    "Qwen3 handled the edge cases better than the previous model.",
    # short sentences
    "Go.",
    "It works.",
    "Done. Ship it.",
    "No.",
    # long paragraphs
    ("The migration took eleven days, three engineers, and more coffee than any of us "
     "care to admit. We moved two terabytes of customer data across three regions without "
     "a single minute of downtime, and when the final checksum matched, the whole team "
     "just sat there in silence for a moment before someone finally said what we were "
     "all thinking."),
    ("Nolan reviewed the proposal twice, marked up the margins with a red pen, and sent "
     "it back with a single note at the top. The note said the numbers were right but "
     "the story was wrong, and that nobody would fund a spreadsheet. Rewrite the opening, "
     "lead with the customer, and bring it back by Thursday."),
    # emotional
    "I was furious when I saw the invoice; they had charged us twice for the same migration.",
    "She laughed so hard the coffee nearly came out of her nose.",
    # quiet
    "In the hush before dawn, the valley holds its breath.",
    "He spoke softly, as if the walls themselves were listening.",
    "Some nights the desert is so quiet you can hear your own heartbeat.",
    # high-energy
    "Let's go! This is the biggest launch in company history!",
    "Unbelievable! We just closed the round!",
    "Yes! The demo worked! The demo actually worked!",
]
assert len(CASES) == 50, "need exactly 50 cases, got %d" % len(CASES)
if os.environ.get("N_CASES"):
    CASES = CASES[: int(os.environ["N_CASES"])]


def load_pcm(path):
    w = wave.open(path)
    sr = w.getframerate()
    ch = w.getnchannels()
    n = w.getnframes()
    pcm = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32)
    if ch > 1:
        pcm = pcm.reshape(-1, ch).mean(axis=1)
    return sr, pcm


def to_16k_mono(pcm, sr):
    """faster-whisper assumes 16kHz input; resample or timestamps stretch."""
    if sr == 16000:
        return (pcm / 32768.0).astype(np.float32)
    idx = np.linspace(0, len(pcm) - 1, int(len(pcm) * 16000 / sr))
    return (np.interp(idx, np.arange(len(pcm)), pcm).astype(np.float32)
            / 32768.0)


def rms_db(x):
    return float(20 * np.log10(np.sqrt((x ** 2).mean()) / 32768.0 + 1e-9))


def norm(w):
    return w.strip(" ,.!?;:\"'()[]").lower()


def has_digit(s):
    return any(c.isdigit() for c in s)


_ONES = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
         "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
         "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
         "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
         "nineteen": 19}
_TENS = {"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
         "seventy": 70, "eighty": 80, "ninety": 90}


def num_to_digits(w):
    """'ninety-nine' -> '99'; None when not a plain number phrase."""
    toks = w.lower().replace("-", " ").split()
    if not toks:
        return None
    total, cur = 0, 0
    for t in toks:
        if t in _ONES:
            cur += _ONES[t]
        elif t in _TENS:
            cur += _TENS[t]
        elif t == "hundred":
            cur *= 100
        else:
            return None
    return str(total + cur)


def word_key(w):
    d = num_to_digits(w)
    if d is not None:
        return "num:" + d
    dd = "".join(ch for ch in w if ch.isdigit())
    if dd and not w.strip("0123456789"):
        return "num:" + dd.lstrip("0") or "num:0"
    return w


def main():
    outdir = os.path.join(BASE, "onset50")
    rawdir = os.path.join(outdir, "raw")
    findir = os.path.join(outdir, "final")
    os.makedirs(rawdir, exist_ok=True)
    os.makedirs(findir, exist_ok=True)

    from faster_whisper import WhisperModel
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    RECUT = os.environ.get("RECUT") == "1"  # re-cut saved raws, no generation

    results = []
    for i, text in enumerate(CASES, 1):
        tag = "case%02d" % i
        raw_path = os.path.join(rawdir, tag + ".wav")
        fin_path = os.path.join(findir, tag + ".wav")
        rec = {"case": i, "text": text}

        if RECUT:
            if not os.path.exists(raw_path):
                rec["gen_error"] = "no raw wav for recut"
                results.append(rec)
                continue
            import wave as _wv
            _w = _wv.open(raw_path)
            rec["gen_bytes"] = _w.getnframes() * _w.getsampwidth()
            _w.close()
        else:
            # --- generate (exact engine-D request shape) ---
            try:
                with open(REF_WAV, "rb") as f:
                    r = requests.post(URL,
                                      files={"reference_audio": ("ref.wav", f, "audio/wav")},
                                      data={"text": CARRIER + text, "ref_text": REF_TEXT},
                                      timeout=300)
                if r.status_code != 200:
                    raise RuntimeError("HTTP %d: %s" % (r.status_code, r.text[:200]))
                if len(r.content) < 1000:
                    raise RuntimeError("too little audio")
                with open(raw_path, "wb") as f:
                    f.write(r.content)
            except Exception as e:
                rec["gen_error"] = repr(e)
                results.append(rec)
                print("case %02d GEN FAIL: %s" % (i, e), flush=True)
                continue
            rec["gen_bytes"] = len(r.content)

        # --- carrier word end from raw (diagnostic) ---
        sr_raw, pcm_raw = load_pcm(raw_path)
        rec["raw_sec"] = round(len(pcm_raw) / sr_raw, 3)
        try:
            segs, _ = model.transcribe(to_16k_mono(pcm_raw, sr_raw), language="en",
                                       beam_size=5, word_timestamps=True)
            carrier_end = None
            raw_words = []
            for s in segs:
                for wd in (s.words or []):
                    raw_words.append((norm(wd.word), round(wd.start, 3), round(wd.end, 3)))
                    if carrier_end is None and norm(wd.word) == "okay":
                        carrier_end = round(wd.end, 3)
                break
            rec["raw_first_words"] = raw_words[:4]
            rec["carrier_end_ts"] = carrier_end
        except Exception as e:
            rec["raw_stt_error"] = repr(e)
            rec["carrier_end_ts"] = None

        # --- cut the carrier (engine-D path) ---
        shutil.copy(raw_path, fin_path)
        cut_ok = cut_carrier_aligned(fin_path)
        rec["cut_applied"] = bool(cut_ok)
        sr, pcm = load_pcm(fin_path)
        rec["final_sec"] = round(len(pcm) / sr, 3)
        rec["cut_sec"] = round(rec["raw_sec"] - rec["final_sec"], 3)

        # --- STT the final clip ---
        try:
            segs, info = model.transcribe(to_16k_mono(pcm, sr), language="en",
                                          beam_size=5, word_timestamps=True)
            words = []
            full = []
            for s in segs:
                full.append(s.text.strip())
                for wd in (s.words or []):
                    words.append((norm(wd.word), round(wd.start, 3), round(wd.end, 3)))
            rec["stt"] = " ".join(full)
            rec["stt_words"] = words[:10]
        except Exception as e:
            rec["stt_error"] = repr(e)
            results.append(rec)
            print("case %02d STT FAIL: %s" % (i, e), flush=True)
            continue

        # --- PCM onset analysis ---
        # onset energy profile: 20ms RMS bins over first 500ms
        prof = []
        win = int(sr * 0.02)
        for k in range(0, min(int(sr * 0.5), len(pcm) - win), win):
            prof.append(round(rms_db(pcm[k:k + win]), 1))
        rec["onset_profile_db"] = prof
        # click detection: max sample-to-sample jump in first 120ms vs rest
        n0 = int(sr * 0.12)
        d0 = np.abs(np.diff(pcm[:n0]))
        dr = np.abs(np.diff(pcm[n0:]))
        max0 = float(d0.max()) if len(d0) else 0.0
        medr = float(np.median(dr)) if len(dr) else 0.0
        rec["click_max0"] = round(max0, 1)
        rec["click_med_rest"] = round(medr, 2)

        flags = {}
        evidence = {}

        # --- classes 1-4: word-level onset checks ---
        exp_toks = [norm(t) for t in text.split()][:4]
        exp_keys = [word_key(t) for t in exp_toks]
        exp0 = exp_toks[0]
        stt0 = words[0][0] if words else ""
        stt_keys = [word_key(w) for (w, _, _) in words[:8]]
        needs_review = has_digit(exp0) and word_key(exp0) == exp0

        j = None
        j_n = 1  # how many expected tokens the match consumed
        # phrase-level number variants: "three hundred forty-seven" == "347"
        exp_variants = []
        for n in range(1, min(4, len(exp_keys)) + 1):
            d = num_to_digits(" ".join(exp_toks[:n]))
            if d is not None:
                exp_variants.append(("num:" + d, n))
        exp_variants.append((exp_keys[0], 1))
        for k, sk in enumerate(stt_keys):
            for vk, vn in exp_variants:
                if sk == vk:
                    j, j_n = k, vn
                    break
            if j is not None:
                break

        carrier_words = [(w, s, e) for (w, s, e) in words[:3] if w == "okay"]
        # Verify the "okay" is real audio, not an STT hallucination on silence:
        # check RMS during the word's timestamp; if < -50dB it's hallucinated.
        real_carrier = []
        for (w, s, e) in carrier_words:
            a = max(0, int(s * sr)); b = min(len(pcm), int(e * sr))
            if b > a:
                seg = pcm[a:b].astype(np.float32)
                db = 20 * np.log10(np.sqrt((seg ** 2).mean()) / 32768.0 + 1e-9)
            else:
                db = -99.0
            if db > -50:
                real_carrier.append(w)
        flags["carrier_leak"] = bool(real_carrier)
        if carrier_words and not real_carrier:
            evidence["carrier_leak"] = (
                "suppressed: stt 'okay' on digital silence (hallucination, not a leak)")
        elif carrier_words:
            evidence["carrier_leak"] = "stt_words[:3]=%s" % [w for (w, _, _) in words[:3]]

        tail_hits = [w for (w, _, _) in words[:4]
                     if w in TAIL_VOCAB and w not in exp_toks[:4]]
        flags["ref_tail_leak"] = bool(tail_hits)
        if tail_hits:
            evidence["ref_tail_leak"] = "tail vocab in onset: %s" % tail_hits

        def is_truncation(stt, exp):
            return stt in (exp[1:], exp[2:]) or (
                len(stt) == len(exp) and len(exp) > 2
                and stt[1:] == exp[1:] and stt[0] != exp[0])

        if not needs_review:
            if j is None:
                if stt0 in TAIL_VOCAB and not flags["ref_tail_leak"]:
                    flags["ref_tail_leak"] = True
                    evidence["ref_tail_leak"] = "first word %r is ref-tail vocab" % stt0
                elif is_truncation(stt0, exp0):
                    flags["missing_first_phoneme"] = True
                    evidence["missing_first_phoneme"] = "expected %r, stt first %r" % (exp0, stt0)
                else:
                    flags["hallucinated_leading"] = True
                    evidence["hallucinated_leading"] = (
                        "expected first %r, stt onset=%s"
                        % (exp0, [w for (w, _, _) in words[:4]]))
            elif j > 0:
                # dropped first word? (trim cut too deep) vs true hallucination
                lead = [w for (w, _, _) in words[:j]]
                rest_exp = exp_toks[j_n:]
                if rest_exp and word_key(words[0][0]) == word_key(rest_exp[0]):
                    flags["missing_first_phoneme"] = True
                    evidence["missing_first_phoneme"] = (
                        "first word(s) dropped by trim: expected %r, clip starts %r"
                        % (" ".join(exp_toks[:j_n]), lead))
                elif any(w == "okay" for w in lead):
                    flags["carrier_leak"] = True
                elif any(w in TAIL_VOCAB for w in lead):
                    flags["ref_tail_leak"] = True
                    evidence["ref_tail_leak"] = "leading words before match: %s" % lead
                else:
                    flags["hallucinated_leading"] = True
                    evidence["hallucinated_leading"] = "leading words before match: %s" % lead
        else:
            rec["needs_review"] = "numeric start: exp=%r stt=%s" % (
                exp0, [w for (w, _, _) in words[:4]])

        # --- class 5: click/pop ---
        flags["click_pop"] = bool(max0 > 15000 and medr > 0 and max0 > 8 * medr)
        if flags["click_pop"]:
            evidence["click_pop"] = "max|diff| first120ms=%.0f vs median rest=%.1f" % (max0, medr)

        # --- class 6: startup fragment (purely acoustic) ---
        # signature: loud onset burst -> dip -> speech resumes
        # (whisper word timestamps are too coarse to anchor this)
        def seg_db(a_ms, b_ms):
            seg = pcm[int(a_ms * sr / 1000):int(b_ms * sr / 1000)]
            if len(seg) < 10:
                return -99.0
            return rms_db(seg)

        on_db = seg_db(0, 150)
        dip_db = min(seg_db(a, a + 60) for a in range(150, 400, 30))
        resume_db = seg_db(450, 750)
        rec["frag_onset_db"] = round(on_db, 1)
        rec["frag_dip_db"] = round(dip_db, 1)
        rec["frag_resume_db"] = round(resume_db, 1)
        flags["startup_fragment"] = bool(
            on_db > -35 and dip_db < on_db - 6 and resume_db > -35)
        if flags["startup_fragment"]:
            # Suppress when STT's first word matches the expected first word (j==0):
            # the onset IS the expected word's natural attack, not a separate fragment.
            if j == 0:
                flags["startup_fragment"] = False
                evidence["startup_fragment"] = (
                    "suppressed: stt first word matches expected "
                    "(onset %.1fdB -> dip %.1fdB -> resume %.1fdB is word attack, not fragment)"
                    % (on_db, dip_db, resume_db))
            else:
                evidence["startup_fragment"] = (
                    "onset %.1fdB -> dip %.1fdB -> resume %.1fdB"
                    % (on_db, dip_db, resume_db))
        # leftover-carrier heuristic: strong voiced burst early but first word late
        if words and words[0][1] > 0.6 and not flags.get("carrier_leak"):
            early = rms_db(pcm[:int(sr * 0.3)])
            if early > -30:
                rec["needs_review"] = (rec.get("needs_review", "") +
                                       " | late first word %.2fs with loud early audio %.1fdB" % (words[0][1], early)).strip(" |")

        rec["first_word_start"] = words[0][1] if words else None
        rec["flags"] = {k: bool(v) for k, v in flags.items()
                        if k in ("hallucinated_leading", "carrier_leak",
                                 "missing_first_phoneme", "ref_tail_leak",
                                 "click_pop", "startup_fragment")}
        for k in ("hallucinated_leading", "carrier_leak", "missing_first_phoneme",
                  "ref_tail_leak", "click_pop", "startup_fragment"):
            rec["flags"].setdefault(k, False)
        rec["evidence"] = evidence
        results.append(rec)
        bad = [k for k, v in rec["flags"].items() if v]
        print("case %02d done flags=%s %s" % (i, bad, rec.get("needs_review", "")), flush=True)

    suffix = "results-recut.json" if os.environ.get("RECUT") == "1" else "results.json"
    mdname = "results-recut.md" if os.environ.get("RECUT") == "1" else "results.md"
    with open(os.path.join(outdir, suffix), "w") as f:
        json.dump(results, f, indent=1)

    # markdown summary
    classes = ["hallucinated_leading", "carrier_leak", "missing_first_phoneme",
               "ref_tail_leak", "click_pop", "startup_fragment"]
    lines = ["# Onset stress: 50-case results", "",
             "Engine D, ref nolan-ref-15s.wav, carrier %r + cut_carrier_aligned." % CARRIER, ""]
    for c in classes:
        hit = [r["case"] for r in results if r.get("flags", {}).get(c)]
        lines.append("- %s: **%d/50** %s" % (c, len(hit), hit if hit else ""))
    lines += ["", "## per-case", ""]
    for r in results:
        bad = [k for k, v in r.get("flags", {}).items() if v]
        line = "case %02d: %s" % (r["case"], "CLEAN" if not bad and not r.get("needs_review") else "")
        if bad:
            line += " FAIL[%s]" % ",".join(bad)
        if r.get("needs_review"):
            line += " REVIEW: %s" % r["needs_review"]
        if r.get("gen_error"):
            line += " GEN_ERROR: %s" % r["gen_error"]
        if r.get("evidence"):
            line += " | " + "; ".join("%s: %s" % kv for kv in r["evidence"].items())
        lines.append(line)
    lines.append("")
    with open(os.path.join(outdir, mdname), "w") as f:
        f.write("\n".join(lines))
    print("wrote %s + %s" % (suffix, mdname), flush=True)


if __name__ == "__main__":
    main()
