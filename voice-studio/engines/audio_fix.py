"""Shared onset-stumble fix for TTS engines.

Both the Alibaba qwen3-tts-vc model and the local Qwen3-TTS /clone endpoint
fumble their first generated tokens: Alibaba stretches the first word
(low-confidence, ~0.5s), the local model hallucinates whole leading words
(e.g. "tools," before the real text). A sacrificial carrier word absorbs
the instability; we then cut it off at the pause that follows it.

The post-carrier pause is the LONGEST quiet run in the first 2.5s
(inter-word gaps are far shorter), which makes the trim robust to the
pause length varying between generations.
"""

CARRIER = "Okay. "


def trim_carrier(path):
    """Cut the sacrificial carrier off the front of a generation.

    Finds the longest contiguous sub -42dB run between 0.3s and 2.5s,
    cuts 30% into it, applies a 15ms fade-in to kill clicks, and
    rewrites the file with a correct WAV header. Fail-safe: if no run
    of >=150ms is found the file is left untouched. Returns True when
    a trim was applied.
    """
    import numpy as np
    import struct
    with open(path, "rb") as f:
        data = f.read()
    di = data.find(b"data")
    if di < 0 or len(data) < 44:
        return False
    fmt = data[12:36]
    channels = struct.unpack("<H", fmt[10:12])[0]
    sr = struct.unpack("<I", fmt[12:16])[0]
    bits = struct.unpack("<H", fmt[22:24])[0]
    if bits != 16:
        return False
    pcm = np.frombuffer(data[di + 8:], dtype=np.int16).copy().astype(np.float32)
    step = int(sr * 0.05)
    frames = []
    end = min(int(sr * 2.5), len(pcm) - step)
    for k in range(int(sr * 0.3), end, step):
        seg = pcm[k:k + step]
        frames.append(20 * np.log10(float(np.sqrt((seg ** 2).mean())) / 32768.0 + 1e-9))
    best = (0, 0, 0)  # start_frame, end_frame, length_frames
    cur = None
    for idx, db in enumerate(frames):
        if db < -42:
            cur = [idx, idx] if cur is None else [cur[0], idx]
        elif cur is not None:
            runlen = cur[1] - cur[0] + 1
            if runlen > best[2]:
                best = (cur[0], cur[1], runlen)
            cur = None
    if cur is not None:
        runlen = cur[1] - cur[0] + 1
        if runlen > best[2]:
            best = (cur[0], cur[1], runlen)
    if best[2] < 3:  # need >=150ms of quiet
        return False
    cut_frame = best[0] + int(best[2] * 0.3)
    cut = int(sr * 0.3) + cut_frame * step
    if cut > len(pcm) - sr:
        return False
    out = pcm[cut:].astype(np.float32)
    nfade = int(sr * 0.015)
    if len(out) > nfade:
        out[:nfade] *= np.linspace(0, 1, nfade)
    raw = np.clip(out, -32768, 32767).astype(np.int16).tobytes()
    head = struct.pack("<4sI4s4sIHHIIHH4sI",
                       b"RIFF", 36 + len(raw), b"WAVE",
                       b"fmt ", 16, 1, channels, sr,
                       sr * channels * 2, channels * 2, 16,
                       b"data", len(raw))
    with open(path, "wb") as f:
        f.write(head + raw)
    return True


_WHISPER_MODEL = None


def _get_whisper():
    """Lazily load faster-whisper (cached after first use)."""
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        from faster_whisper import WhisperModel
        _WHISPER_MODEL = WhisperModel("base.en", device="cpu",
                                      compute_type="int8")
    return _WHISPER_MODEL


def cut_carrier_aligned(path, carrier_word="okay"):
    """Remove the sacrificial carrier via pause-start acoustic cut.

    Design (2026-10-04 onset stress suite, 50 cases):
    Whisper's word timestamps are coarse (+/-200ms) and tile contiguously, so
    they locate the carrier only roughly (S_w often equals E). The carrier's
    vowel decay + breath tail (-28 to -35dB, 100-400ms) survives a fixed +30ms
    margin and is audible as a ~80-150ms onset fragment whenever a pause
    follows the carrier. The cut is placed at the PAUSE START, found
    acoustically and bounded by the word's true onset:

      1. Transcribe at 16k with word timestamps. Scan ALL words for the
         carrier word; take the LAST occurrence starting before 2.0s (handles
         a hallucinated leading word and a stuttered double carrier). Its end
         is E.
      2. Find W_on, the first content word's true loud onset: the first 60ms
         run averaging above -30dB scanning forward from E+0.05. (Words peak
         at -20 to -28dB; the tail rarely sustains above -30dB.) This bounds
         the pause scan so a later inter-word pause can never be mistaken for
         the post-carrier pause, even when whisper tiles S_w == E.
      3. Scan 20ms RMS bins forward from E+0.03 to min(E+0.6, W_on) for the
         first 3 consecutive bins below -34dB: the tail's end / pause's start.
         Cut at the first of the three. Fall back to E+0.03 when no
         sustained-quiet run is found (carrier abuts the word; the tail is
         masked). If W_on < E+0.1 (word immediate), cut minimally at E+0.01.
      4. 15ms fade-in at the cut; rewrite the file.
    No-carrier fallback: trim <400ms of leading sub -28dB mumble/noise at the
    first >=200ms sub -38dB run. Then fail-safe no-op.
    Returns True when audio was removed.
    """
    import numpy as np
    import struct
    import wave

    def _rms_db(x):
        return float(20 * np.log10(np.sqrt((x ** 2).mean()) / 32768.0 + 1e-9))

    def _rewrite(pcm, sr, cut):
        ch = 1 if pcm.ndim == 1 else pcm.shape[1]
        out = pcm[cut:].astype(np.float32)
        nfade = int(sr * 0.015)
        if len(out) > nfade:
            out[:nfade] *= np.linspace(0, 1, nfade)
        raw = np.clip(out, -32768, 32767).astype(np.int16).tobytes()
        head = struct.pack("<4sI4s4sIHHIIHH4sI",
                           b"RIFF", 36 + len(raw), b"WAVE",
                           b"fmt ", 16, 1, ch, sr,
                           sr * ch * 2, ch * 2, 16,
                           b"data", len(raw))
        with open(path, "wb") as f:
            f.write(head + raw)

    try:
        w = wave.open(path)
        sr, n = w.getframerate(), w.getnframes()
        ch = w.getnchannels()
        pcm = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32)
        if ch > 1:
            pcm = pcm.reshape(-1, ch).mean(axis=1)
        dur = len(pcm) / sr
        w.close()

        idx = np.linspace(0, len(pcm) - 1, int(len(pcm) * 16000 / sr))
        pcm16 = np.interp(idx, np.arange(len(pcm)),
                          pcm).astype(np.float32) / 32768.0
        model = _get_whisper()
        segs, _ = model.transcribe(pcm16, language="en", beam_size=5,
                                   word_timestamps=True)
        allwords = []
        for s in segs:
            for wd in (s.words or []):
                allwords.append(wd)
        hits = [(wd.start, wd.end) for wd in allwords
                if wd.word.strip(" ,.!?").lower() == carrier_word
                and wd.start < 2.0 and wd.end < 3.0]
        cut = None
        # If whisper missed the carrier on the full audio (segmentation
        # inconsistency), re-transcribe just the first 1.5s: whisper finds a
        # leading "okay" far more reliably on a short segment.
        if not hits:
            try:
                seg_n = min(len(pcm16), int(1.5 * 16000))
                segs2, _ = model.transcribe(pcm16[:seg_n], language="en",
                                            beam_size=5, word_timestamps=True)
                for s in segs2:
                    for wd in (s.words or []):
                        if (wd.word.strip(" ,.!?").lower() == carrier_word
                                and wd.start < 2.0 and wd.end < 3.0):
                            hits.append((wd.start, wd.end))
                            break
                    if hits:
                        break
            except Exception:
                pass
        if hits:
            _, E = hits[-1]  # last occurrence
            # 20ms bins from E+0.03 to E+1.0 (for W_on + pause scan)
            wlen = int(sr * 0.02)
            t0 = E + 0.03
            a = int(t0 * sr)
            b = min(len(pcm), int(min(dur, E + 1.0) * sr))
            db = [_rms_db(pcm[k:k + wlen])
                  for k in range(a, b - wlen, wlen)]
            # W_on: first 100ms run averaging > -28dB, from E+0.05.
            # (Strict: a loud carrier tail can sustain -30dB for 60ms; words
            # sustain > -28dB for 100ms.)
            won = None
            start_i = 1  # bin at E+0.05
            for i in range(start_i, len(db) - 4):
                if sum(db[i:i + 5]) / 5.0 > -28.0:
                    won = i
                    break
            if won is not None and won < 5:
                # word immediate: minimal cut, do not scan
                cut_t = E + 0.01
            else:
                scan_end_i = len(db)
                if won is not None:
                    # bound by word onset (but never past E+0.6)
                    max_i = int(0.57 / 0.02)
                    scan_end_i = min(won + 1, max_i, len(db))
                else:
                    # no loud word found: conservative short scan
                    scan_end_i = min(int(0.37 / 0.02), len(db))
                cut_t = E + 0.03  # fallback
                for i in range(min(scan_end_i, len(db) - 2)):
                    if (db[i] < -34.0 and db[i + 1] < -34.0
                            and db[i + 2] < -34.0):
                        cut_t = t0 + i * 0.02
                        break
            cut_t = max(E + 0.01, min(cut_t, E + 0.6))
            cut = int(cut_t * sr)
        else:
            # --- no carrier word: trim leading mumble/noise only ---
            wlen = int(sr * 0.02)
            a = 0
            b = min(len(pcm), int(min(dur, 1.5) * sr))
            db = [_rms_db(pcm[k:k + wlen])
                  for k in range(a, b - wlen, wlen)]
            r0 = None
            run = None
            for i, d in enumerate(db):
                if d < -38.0:
                    if run is None:
                        run = i
                    if i - run + 1 >= 10:
                        r0 = run * 0.02
                        break
                else:
                    run = None
            if r0 is not None and r0 < 0.4:
                peak = max(db[i] for i in range(int(r0 / 0.02)))
                if peak < -28.0:
                    cut = int(r0 * sr)
            if cut is None:
                return False  # fail-safe no-op

        if cut >= len(pcm) - int(0.25 * sr):  # short-clip guard
            return False
        _rewrite(pcm, sr, cut)
        return True
    except Exception:
        try:
            return trim_carrier(path)
        except Exception:
            return False


def pitch_shift_file(path, n_semitones):
    """Shift pitch by n_semitones (negative = deeper) without changing
    tempo, via a phase-vocoder time stretch + resample. Small shifts
    (1-2 semitones) read as a deeper voice with no chipmunk artifacts.
    n_semitones == 0 is a no-op. Returns True when applied.
    """
    import numpy as np
    import struct
    if not n_semitones:
        return False
    n_semitones = max(-4.0, min(2.0, float(n_semitones)))
    with open(path, "rb") as f:
        data = f.read()
    di = data.find(b"data")
    if di < 0 or len(data) < 44:
        return False
    fmt = data[12:36]
    channels = struct.unpack("<H", fmt[10:12])[0]
    sr = struct.unpack("<I", fmt[12:16])[0]
    bits = struct.unpack("<H", fmt[22:24])[0]
    if bits != 16:
        return False
    pcm = np.frombuffer(data[di + 8:], dtype=np.int16).astype(np.float32)
    if channels > 1:
        pcm = pcm.reshape(-1, channels)

    def _shift_mono(x):
        win = 2048
        hop = 512
        window = np.hanning(win)
        frames = []
        for k in range(0, max(1, len(x) - win), hop):
            frames.append(np.fft.rfft(x[k:k + win] * window))
        if not frames:
            return x
        D = np.stack(frames, axis=1)  # (freq, time)
        n_in = D.shape[1]
        rate = 2.0 ** (-n_semitones / 12.0)  # >1 lowers pitch
        n_out = max(1, int(n_in / rate))
        pos = np.linspace(0, n_in - 1, n_out)
        i0 = np.floor(pos).astype(int)
        i1 = np.clip(i0 + 1, 0, n_in - 1)
        alpha = (pos - i0)[None, :]
        mag = np.abs(D)
        mag_i = mag[:, i0] * (1 - alpha) + mag[:, i1] * alpha
        omega = 2 * np.pi * hop * np.fft.rfftfreq(win)[:, None]
        dphi = np.angle(D[:, 1:] * np.conj(D[:, :-1]))
        dphi = np.concatenate([dphi[:, :1], dphi], axis=1)
        dphi = omega + np.angle(np.exp(1j * (dphi - omega)))  # unwrap
        phase_acc = np.angle(D[:, 0]).copy()
        Y = np.empty((D.shape[0], n_out), dtype=np.complex128)
        Y[:, 0] = mag_i[:, 0] * np.exp(1j * phase_acc)
        for i in range(1, n_out):
            dp = (dphi[:, i0[i]] * (1 - alpha[0, i]) +
                  dphi[:, i1[i]] * alpha[0, i])
            phase_acc = phase_acc + dp * rate
            Y[:, i] = mag_i[:, i] * np.exp(1j * phase_acc)
        y = np.zeros(n_out * hop + win)
        wsum = np.zeros_like(y)
        for i in range(n_out):
            seg = np.fft.irfft(Y[:, i], n=win) * window
            y[i * hop:i * hop + win] += seg
            wsum[i * hop:i * hop + win] += window ** 2
        nz = wsum > 1e-8
        y[nz] /= wsum[nz]
        stretched = y[:int(len(x) / rate)]
        if len(stretched) < 4:
            return x
        idx = np.linspace(0, len(stretched) - 1, len(x))
        return np.interp(idx, np.arange(len(stretched)),
                         stretched).astype(np.float32)

    if channels > 1:
        out = np.stack([_shift_mono(pcm[:, c]) for c in range(channels)], axis=1)
    else:
        out = _shift_mono(pcm)
    raw = np.clip(out, -32768, 32767).astype(np.int16).tobytes()
    head = struct.pack("<4sI4s4sIHHIIHH4sI",
                       b"RIFF", 36 + len(raw), b"WAVE",
                       b"fmt ", 16, 1, channels, sr,
                       sr * channels * 2, channels * 2, 16,
                       b"data", len(raw))
    with open(path, "wb") as f:
        f.write(head + raw)
    return True
