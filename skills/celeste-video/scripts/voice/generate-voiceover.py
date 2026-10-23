#!/usr/bin/env python
"""
Reusable local voice-over generator built on Piper TTS (no API, no cost).

Part of the celeste-video skill. Run it from the project folder with the Piper interpreter
(`cv voice generate` does this for you):

    python generate-voiceover.py --script .cv/narration.json --out public/audio/voiceover

Paths are relative to the current folder; the voices folder can be set with CV_VOICES_DIR.

Inputs (pick one)
    --script FILE.json     segments with ids, text and optional per-segment overrides (see references/voiceover.md)
    --text "..."           raw text; add --segments to split it sentence by sentence
    --text-file FILE.txt   one segment per non-empty line

Main options
    --voice NAME|PATH      Piper voice, e.g. fr_FR-mls-medium (auto-downloaded into ./voices if missing)
    --speaker N            speaker id for multi-speaker voices
    --speed X              reading speed, 1.0 = model default (>1 faster). Mapped to Piper's length_scale = 1 / X
    --noise-scale / --noise-w-scale   Piper variability controls (more = livelier, less stable)
    --pause S              silence between consecutive segments (seconds) when no explicit start is given
    --sentence-pause S     silence between the sentences *inside* one segment
    --lead-in S            where the first segment starts
    --out DIR              output folder (default public/audio/voiceover)
    --full-track [FILE]    also render one mono WAV with every segment placed on the timeline
    --duration S           timeline length: warns when a segment ends after it
    --copy-manifest FILE   copy manifest.json there too (e.g. src/config/voiceover.manifest.json)
    --phonemes             print the phonemes Piper will say (pronunciation check) and exit

What it does to the audio (and nothing more): removes DC offset, trims leading/trailing silence,
applies 8 ms / 30 ms fades, and matches every segment to the same speech loudness (RMS) with a peak
ceiling at -1 dBFS. No pitch shifting, no effects.

Piper has no emotion control. Expressiveness only comes from the model, punctuation, speed and the
noise parameters above.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import sys
import wave
from pathlib import Path

import numpy as np

try:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252
except Exception:  # pragma: no cover
    pass

ROOT = Path.cwd()  # the project folder: this script never assumes where the skill is installed
PEAK_CEILING = 10 ** (-1 / 20)  # -1 dBFS


# ----------------------------------------------------------------------------- voices
def resolve_voice(name_or_path: str, voices_dir: Path) -> Path:
    p = Path(name_or_path)
    if p.suffix == ".onnx" and p.exists():
        return p
    model = voices_dir / f"{name_or_path}.onnx"
    if not model.exists():
        from piper.download_voices import download_voice

        print(f"[voice] downloading {name_or_path} into {voices_dir} ...")
        voices_dir.mkdir(parents=True, exist_ok=True)
        download_voice(name_or_path, voices_dir)
    return model


# ----------------------------------------------------------------------------- audio helpers
def to_float(chunk) -> np.ndarray:
    return chunk.audio_int16_array.astype(np.float32) / 32768.0


def silence(seconds: float, sr: int) -> np.ndarray:
    return np.zeros(int(round(seconds * sr)), dtype=np.float32)


def trim_silence(x: np.ndarray, sr: int, thr_db: float = -45.0, head: float = 0.04, tail: float = 0.08):
    thr = 10 ** (thr_db / 20)
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x, 0
    a = max(0, idx[0] - int(head * sr))
    b = min(len(x), idx[-1] + int(tail * sr))
    return x[a:b], a


def speech_rms(x: np.ndarray, sr: int) -> float:
    """RMS over active frames only, so pauses do not change the measured level."""
    frame = int(0.03 * sr)
    n = len(x) // frame
    if n == 0:
        return float(np.sqrt(np.mean(x**2)) + 1e-9)
    frames = x[: n * frame].reshape(n, frame)
    rms = np.sqrt(np.mean(frames**2, axis=1))
    active = rms > (np.max(rms) * 0.1)
    return float(np.sqrt(np.mean(rms[active] ** 2)) + 1e-9)


def finish(x: np.ndarray, sr: int, target_db: float):
    """Returns (processed audio, number of samples trimmed from the head)."""
    x = x - np.mean(x)
    x, head = trim_silence(x, sr)
    gain = 10 ** (target_db / 20) / speech_rms(x, sr)
    x = x * gain
    peak = np.max(np.abs(x))
    if peak > PEAK_CEILING:  # gentle ceiling instead of hard clipping
        x = np.tanh(x / peak * 1.2) / np.tanh(1.2) * PEAK_CEILING
    fi, fo = int(0.008 * sr), int(0.030 * sr)
    x[:fi] *= np.linspace(0, 1, fi)
    x[-fo:] *= np.linspace(1, 0, fo)
    return x.astype(np.float32), head


def write_wav(path: Path, x: np.ndarray, sr: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(x, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as r:
        return r.getnframes() / r.getframerate()


# ----------------------------------------------------------------------------- segments
def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?…])\s+", text.strip())
    return [p for p in parts if p]


def phrase_split(sentence: str, max_chars: int) -> list[str]:
    """Cut a sentence into subtitle-sized phrases (one line each), preferring breaks after commas."""
    sentence = re.sub(r"\s+([?!:;])", lambda m: "\u00a0" + m.group(1), sentence.strip())  # keep French punctuation glued to the word
    phrases: list[str] = []
    current = ""
    for word in sentence.split(" "):
        if current and len(current) + 1 + len(word) > max_chars:
            phrases.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
        if current.endswith((",", ";", ":")) and len(current) >= 14:
            phrases.append(current)
            current = ""
    if current:
        if phrases and len(current) < 8 and len(phrases[-1]) + 1 + len(current) <= max_chars + 6:
            phrases[-1] = f"{phrases[-1]} {current}"  # avoid orphan words
        else:
            phrases.append(current)
    return phrases


def build_cues(text: str, seg_start: float, seg_duration: float, sentences: list[dict], max_chars: int) -> list[dict]:
    """Subtitle cues for one segment. Sentence boundaries are measured; inside a sentence the
    time is shared between phrases in proportion to their length (Piper gives no word timings)."""
    texts = split_sentences(text)
    if len(texts) != len(sentences):  # unexpected split: fall back to the whole segment
        texts, sentences = [text], [{"start": 0.0, "end": seg_duration}]
    cues: list[dict] = []
    for t, tm in zip(texts, sentences):
        phrases = phrase_split(t, max_chars)
        weights = [len(p) + (4 if p.endswith((",", ";", ":")) else 0) for p in phrases]
        total = float(sum(weights)) or 1.0
        span = tm["end"] - tm["start"]
        t0 = tm["start"]
        for p, w in zip(phrases, weights):
            dur = span * w / total
            cues.append({"start": round(seg_start + t0, 3), "end": round(seg_start + t0 + dur, 3), "text": p})
            t0 += dur
    return cues


def srt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    return f"{ms // 3600000:02d}:{ms % 3600000 // 60000:02d}:{ms % 60000 // 1000:02d},{ms % 1000:03d}"


def load_segments(args) -> tuple[list[dict], dict]:
    defaults: dict = {}
    if args.script:
        data = json.loads(Path(args.script).read_text(encoding="utf-8"))
        defaults = {k: v for k, v in data.items() if k != "segments"}
        segs = data["segments"]
    elif args.text_file:
        lines = [l.strip() for l in Path(args.text_file).read_text(encoding="utf-8").splitlines() if l.strip()]
        segs = [{"text": l} for l in lines]
    elif args.text:
        parts = split_sentences(args.text) if args.segments else [args.text]
        segs = [{"text": p} for p in parts]
    else:
        sys.exit("Provide --script, --text or --text-file")
    for i, s in enumerate(segs, 1):
        s.setdefault("id", f"seg{i:02d}")
    return segs, defaults


# ----------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description="Piper TTS voice-over generator", formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument("--script")
    ap.add_argument("--text")
    ap.add_argument("--text-file")
    ap.add_argument("--segments", action="store_true", help="with --text: one segment per sentence")
    ap.add_argument("--voice")
    ap.add_argument("--voices-dir", default=os.environ.get("CV_VOICES_DIR") or str(ROOT / "voices"))
    ap.add_argument("--speaker", type=int)
    ap.add_argument("--language", help="informational (fr, en...); used to pick a default voice if --voice is absent")
    ap.add_argument("--speed", type=float)
    ap.add_argument("--noise-scale", type=float)
    ap.add_argument("--noise-w-scale", type=float)
    ap.add_argument("--pause", type=float)
    ap.add_argument("--sentence-pause", type=float)
    ap.add_argument("--lead-in", type=float)
    ap.add_argument("--target-db", type=float, help="speech RMS target in dBFS (default -19)")
    ap.add_argument("--out")
    ap.add_argument("--full-track", nargs="?", const="voiceover-full.wav")
    ap.add_argument("--duration", type=float)
    ap.add_argument("--copy-manifest")
    ap.add_argument("--phonemes", action="store_true")
    ap.add_argument("--srt", help="also write subtitles (.srt) built from the real speech timing")
    ap.add_argument("--subtitle-max-chars", type=int, help="characters per subtitle line (default 27)")
    args = ap.parse_args()

    segs, d = load_segments(args)

    def opt(name, default):
        v = getattr(args, name.replace("-", "_"), None)
        return v if v is not None else d.get(name.replace("-", "_"), default)

    # Only voices whose licence was checked are defaulted. Any other language needs an explicit --voice.
    default_voices = {"fr": "fr_FR-upmc-medium"}
    language = opt("language", "fr")
    voice_name = args.voice or d.get("voice") or default_voices.get(language)
    if not voice_name:
        sys.exit(f"No default voice for language {language!r}: pass --voice (see `cv voice list`).")
    speaker = opt("speaker", None)
    speed = float(opt("speed", 1.0))
    noise_scale = opt("noise_scale", None)
    noise_w = opt("noise_w_scale", None)
    pause = float(opt("pause", 0.35))
    sentence_pause = float(opt("sentence_pause", 0.14))
    lead_in = float(opt("lead_in", 0.0))
    target_db = float(opt("target_db", -19.0))
    out_dir = Path(args.out or d.get("out", ROOT / "public" / "audio" / "voiceover"))
    duration = opt("duration", None)
    max_chars = int(opt("subtitle_max_chars", 27))

    from piper import PiperVoice, SynthesisConfig

    model = resolve_voice(voice_name, Path(args.voices_dir))
    voice = PiperVoice.load(model)
    sr = voice.config.sample_rate

    if args.phonemes:
        for s in segs:
            spoken = s.get("spoken", s["text"])
            print(f"{s['id']}: {spoken}\n   {[''.join(p) for p in voice.phonemize(spoken)]}")
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.wav"):
        old.unlink()  # stale segments from a previous script must not linger

    manifest_segments = []
    subtitles: list[dict] = []
    placed: list[tuple[float, np.ndarray]] = []
    cursor = lead_in
    warnings: list[str] = []

    for s in segs:
        seg_speed = float(s.get("speed", speed))
        cfg = SynthesisConfig(
            speaker_id=s.get("speaker", speaker),
            length_scale=1.0 / seg_speed,
            noise_scale=s.get("noise_scale", noise_scale),
            noise_w_scale=s.get("noise_w_scale", noise_w),
            normalize_audio=False,
        )
        spoken = s.get("spoken", s["text"])
        pieces: list[np.ndarray] = []
        bounds: list[tuple[int, int]] = []  # (start, end) sample of each sentence before trimming
        pos = 0
        for chunk in voice.synthesize(spoken, syn_config=cfg):
            if pieces:
                gap = silence(float(s.get("sentence_pause", sentence_pause)), sr)
                pieces.append(gap)
                pos += len(gap)
            audio = to_float(chunk)
            pieces.append(audio)
            bounds.append((pos, pos + len(audio)))
            pos += len(audio)
        x, head = finish(np.concatenate(pieces), sr, target_db)
        sentences = [
            {"start": round(max(0, a - head) / sr, 3), "end": round(min(len(x), b - head) / sr, 3)}
            for a, b in bounds
        ]

        start = float(s["start"]) if "start" in s else cursor
        if "start" in s and start < cursor - 1e-3:
            if d.get("auto_shift", False):
                warnings.append(f"{s['id']}: moved from {start:.2f}s to {cursor:.2f}s to avoid overlapping the previous segment (shorten the previous text to keep the planned timing)")
                start = cursor
            else:
                warnings.append(f"{s['id']}: starts at {start:.2f}s but the previous segment ends at {cursor:.2f}s (overlap)")
        dur = len(x) / sr
        end = start + dur
        fname = f"{s['id']}.wav"
        write_wav(out_dir / fname, x, sr)
        real = wav_duration(out_dir / fname)
        manifest_segments.append(
            {
                "id": s["id"],
                "text": s["text"],
                "spoken": spoken,
                "file": fname,
                "duration": round(real, 3),
                "start": round(start, 3),
                "end": round(start + real, 3),
                "sentences": sentences,
                **({"cue": s["cue"]} if "cue" in s else {}),
            }
        )
        placed.append((start, x))
        subtitles += build_cues(s["text"], start, real, sentences, max_chars)
        cursor = end + float(s.get("pause_after", pause))
        print(f"[{s['id']}] {start:6.2f}s -> {end:6.2f}s  ({dur:4.2f}s)  {s['text'][:70]}")
        if duration and end > float(duration):
            warnings.append(f"{s['id']}: ends at {end:.2f}s, after the {float(duration):.2f}s timeline")

    manifest = {
        "voice": voice_name,
        "speaker": speaker,
        "speed": speed,
        "sampleRate": sr,
        "noiseScale": noise_scale,
        "noiseWScale": noise_w,
        "targetRmsDb": target_db,
        "end": manifest_segments[-1]["end"],
        "segments": manifest_segments,
        "subtitles": subtitles,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.copy_manifest:
        dest = Path(args.copy_manifest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(out_dir / "manifest.json", dest)

    if args.srt:
        srt_path = Path(args.srt)
        srt_path.parent.mkdir(parents=True, exist_ok=True)
        blocks = [
            f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}\n"
            for i, c in enumerate(subtitles, 1)
        ]
        srt_path.write_text("\n".join(blocks), encoding="utf-8")

    if args.full_track:
        total = float(duration) if duration else manifest["end"] + 0.5
        track = np.zeros(int(math.ceil(total * sr)), dtype=np.float32)
        for start, x in placed:
            a = int(round(start * sr))
            b = min(len(track), a + len(x))
            track[a:b] += x[: b - a]
        write_wav(out_dir / args.full_track, np.clip(track, -1, 1), sr)

    for w in warnings:
        print("WARNING:", w)
    print(f"\n{len(manifest_segments)} segments -> {out_dir}  (voice {voice_name}, speaker {speaker}, speed {speed}, {sr} Hz)")


if __name__ == "__main__":
    main()
