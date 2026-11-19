"""Campur suara Clawd ke video pratinjau film (rekaman Playwright tidak membawa audio).

  python3 -I scripts/preview/mix-voice.py <repo> <video.mp4> <voice.json> <keluaran.mp4>

<voice.json> dibuat record-film.cjs dengan VOICE=<berkas>: {K, fps, events:[{t, type:"start"|"stop"|"hush", name}]}, t = waktu
VIDEO (detik). Tiap klip (public/audio/clawd/en/<name>.mp3) ditaruh pada waktu start-nya dan dipotong dengan fade 60 ms
bila ada stop atau klip lain mulai (satu suara pada satu waktu, seperti AudioEngine.endVoice). Gain = VOICE_LEVEL di
src/engine/audio/catalog.ts. Hasilnya disamakan ke ±-16 LUFS (limiter -1 dBTP), 48 kHz stereo, lalu digabung ke video
(stream video disalin, audio AAC 160k). Gendhing dan efek tidak ikut: hanya suara Clawd.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.dont_write_bytecode = True
REPO, VIDEO, VOICE, OUT = (Path(a) for a in sys.argv[1:5])
SR = 48000
FADE = 0.06
TARGET = -16.0
# Bahasa klip: bahasa Inggris saja (pilihan host 18 Nov); mengikuti /audio/clawd/<lang>/ di catatan bila ada.
LANG = "en"


def voice_level():
    src = (REPO / "src/engine/audio/catalog.ts").read_text()
    return float(re.search(r"export const VOICE_LEVEL\s*=\s*([0-9.]+)", src).group(1))


def load(name):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(REPO / f"public/audio/clawd/{LANG}/{name}.mp3"), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2).astype(float)


def probe_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def ebur(args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *args, "-af", "ebur128=peak=sample", "-f", "null", "-"], capture_output=True, text=True)
    tail = r.stderr[r.stderr.rindex("Summary:"):]
    return float(tail.split(" I:")[1].split()[0]), float(tail.split("Peak:")[1].split()[0])


def main():
    level = voice_level()
    events = sorted(json.loads(VOICE.read_text())["events"], key=lambda e: e["t"])
    total = probe_duration(VIDEO)
    track = np.zeros((int(round(total * SR)) + SR, 2))
    # satu suara pada satu waktu: [(mulai, nama, berhenti atau None)]
    clips = []
    for e in events:
        if e["type"] == "start":
            if clips and clips[-1][2] is None:
                clips[-1][2] = e["t"]  # klip baru memotong yang lama (playVoice → endVoice)
            clips.append([e["t"], e["name"], None])
        elif e["type"] == "hush":
            if clips and clips[-1][2] is None:
                clips[-1][2] = e["t"]  # gelembung mulai memudar → suara berhenti (session.ts → audioStatus.hush)
        elif clips and clips[-1][2] is None and clips[-1][1] == e["name"]:
            clips[-1][2] = e["t"]
    summary = []
    for at, name, stop in clips:
        pcm = load(name) * level
        cut = False
        if stop is not None:
            keep = max(0, int(round((stop - at) * SR)))
            if keep < len(pcm):
                pcm = pcm[:keep].copy()
                cut = True
                f = min(int(FADE * SR), len(pcm))
                if f:
                    pcm[-f:] *= np.cos(np.linspace(0, np.pi / 2, f))[:, None]
        if at < 0:  # klip mulai sebelum video (film 3D: selagi panggung dimuat): awalnya dipotong
            pcm = pcm[int(round(-at * SR)):]
            at = 0.0
            if not len(pcm):
                continue
        i = int(round(at * SR))
        j = min(len(track), i + len(pcm))
        if j > i:
            track[i:j] += pcm[: j - i]
        summary.append((at, name, len(pcm) / SR, cut))
    if not clips:
        sys.exit("tidak ada klip di catatan suara")
    raw = OUT.with_suffix(".f32")
    track.astype("<f4").tofile(raw)
    fmt = ["-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(raw)]
    i, _ = ebur(fmt)
    gain = round(min(TARGET - i, 12.0), 2)
    af = f"volume={gain}dB,alimiter=limit=0.891:attack=3:release=80:level=false,atrim=0:{total}"
    wav = OUT.with_suffix(".wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *fmt, "-af", af, "-c:a", "pcm_s16le", str(wav)], check=True)
    raw.unlink()
    i2, pk2 = ebur(["-i", str(wav)])
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(VIDEO), "-i", str(wav), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", str(SR), "-movflags", "+faststart", "-shortest", str(OUT)],
        check=True,
    )
    wav.unlink()
    print(f"{len(clips)} klip, video {total:.2f} dtk, suara {i2:.1f} LUFS, puncak {pk2:.1f} dB (gain {gain:+.1f} dB) -> {OUT}")
    for at, name, dur, cut in summary:
        print(f"  t={at:7.2f}  {name:<24} {dur:5.2f} dtk{'  (dipotong)' if cut else ''}")


main()
