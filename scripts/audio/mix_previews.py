"""Audio untuk video preview (docs/design/previews), dicampur dengan aturan AudioEngine:
level gendhing/efek, kurva equal-power, dan ducking yang sama. Lalu disamakan ke ±-16 LUFS + limiter -1 dB.

  python3 -I scripts/audio/mix_previews.py . <folder_keluaran>
  → gong.wav (10 dtk), keris.wav (6,5 dtk), gunungan.wav (6,29 dtk: sapuan + balik)

Waktu peristiwa diambil dari frame video (lihat docs/design/decisions.md, "Preview bersuara").
"""
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import synth_sfx as sx  # noqa: E402

REPO = Path(sys.argv[1])
OUT = Path(sys.argv[2])
SR = 48000
BED, SFX, DUCK = 0.55, 0.9, 0.32  # = src/engine/audio/catalog.ts


def load(rel, offset=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(offset)]
    if dur:
        cmd += ["-t", str(dur)]
    cmd += ["-i", str(REPO / rel), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2).astype(float)


def n(t):
    return int(round(t * SR))


def place(track, clip, at, gain=1.0):
    i = n(at)
    j = min(len(track), i + len(clip))
    track[i:j] += clip[: j - i] * gain


def ep_env(length, fade_in=0.0, fade_out=0.0, start=0.0, end=None):
    """Amplop equal-power (sin masuk, cos keluar) seperti BedPlayer."""
    t = np.arange(length) / SR
    e = np.ones(length)
    if fade_in > 0:
        m = t < start + fade_in
        e[m] = np.sin(np.clip((t[m] - start) / fade_in, 0, 1) * np.pi / 2)
    if fade_out > 0 and end is not None:
        m = t > end - fade_out
        e[m] *= np.cos(np.clip((t[m] - (end - fade_out)) / fade_out, 0, 1) * np.pi / 2)
    e[t < start] = 0
    if end is not None:
        e[t >= end] = 0
    return e[:, None]


def duck_env(length, at, dur):
    """setTargetAtTime(DUCK, at, 0.04) lalu setTargetAtTime(BED, at + min(2.4, dur/2), 0.45)."""
    t = np.arange(length) / SR
    b = at + min(2.4, dur * 0.5)
    g = np.full(length, BED)
    m1 = (t >= at) & (t < b)
    g[m1] = DUCK + (BED - DUCK) * np.exp(-(t[m1] - at) / 0.04)
    gb = DUCK + (BED - DUCK) * np.exp(-(b - at) / 0.04)
    m2 = t >= b
    g[m2] = BED - (BED - gb) * np.exp(-(t[m2] - b) / 0.45)
    return (g / BED)[:, None]


def bed(rel, offset, at, until, total, fade_in, fade_out):
    clip = load(rel, offset, until - at + 0.1)
    track = np.zeros((n(total), 2))
    place(track, clip, at)
    return track * ep_env(len(track), fade_in, fade_out, at, until) * BED


def ebur(args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *args, "-af", "ebur128=peak=sample", "-f", "null", "-"], capture_output=True, text=True)
    tail = r.stderr[r.stderr.rindex("Summary:") :]
    i = float(tail.split(" I:")[1].split()[0])
    pk = float(tail.split("Peak:")[1].split()[0])
    return i, pk


def finish(name, mix, total, fade_out=1.0, target=-16.0):
    """Fade akhir, lalu gain ke target LUFS (limiter menahan puncak; reduksi ≤ ±3,5 dB) → WAV 16-bit."""
    mix = mix[: n(total)] * ep_env(n(total), 0, fade_out, 0, total)
    raw = OUT / f"{name}.f32"
    mix.astype("<f4").tofile(raw)
    fmt = ["-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(raw)]
    i, pk = ebur(fmt)
    gain = round(min(target - i, -1 - pk + 3.5), 2)
    af = f"volume={gain}dB,alimiter=limit=0.891:attack=3:release=80:level=false"
    subprocess.run(["ffmpeg", "-y", "-v", "error", *fmt, "-af", af, "-c:a", "pcm_s16le", str(OUT / f"{name}.wav")], check=True)
    raw.unlink()
    i2, pk2 = ebur(["-i", str(OUT / f"{name}.wav")])
    print(f"{name}.wav  {total:.2f} dtk  {i2:.1f} LUFS  puncak {pk2:.1f} dB")


OUT.mkdir(parents=True, exist_ok=True)
G = "public/audio/gamelan/"
FX = "public/audio/sfx/"

# ---- Gong: gong penutup gendhing (46,73 dtk di rekaman) jatuh tepat di pukulan visual (4,22 dtk) ----
T, HIT = 10.0, 4.22
# Mekar frekuensi rendah: gong gendhing 46,751 dtk, gong SFX 0,159 dtk setelah awal berkas → disejajarkan.
mix = bed(G + "gendhing.mp3", 46.751 - (HIT + 0.159), 0, T, T, 0.8, 0)
gong = load(FX + "gong-ageng.mp3")
api = load(FX + "api-naga.mp3")
sfx = np.zeros_like(mix)
place(sfx, gong, HIT, SFX)
place(sfx, api, HIT + 0.04, SFX * 0.8)
finish("gong", mix + sfx, T, fade_out=1.0)

# ---- Keris: "sret" di ujung tarikan, denting saat bilah lepas (±2,0) & pamor menyala (2,15) ----
T, AT = 6.5, 1.45
keris = load(FX + "keris-bangkit.mp3")
mix = bed(G + "keraton.mp3", 0.0, 0, T, T, 1.0, 0) * duck_env(n(T), AT, len(keris) / SR)
sfx = np.zeros_like(mix)
place(sfx, keris, AT, SFX)
finish("keris", mix + sfx, T, fade_out=1.2)

# ---- Gunungan: sapuan dalang (keraton, tenang) → klik → balik ke sisi api (gendhing rapat) ----
SAP, T = 2.79, 2.79 + 3.5
FLIP_SIDE = SAP + 0.625  # tampak tipis dari samping
LAND = SAP + 0.75  # sisi api menghadap depan, kilatan
balik = load(FX + "gunungan-balik.mp3")
# Suara sapuan (sintesis, pelan): kibas keluar ±0,5 · kibas kembali ±1,45 · ditancapkan 1,77.
d = 2.2
sw = sx.whoosh(d, 0.48, 0.13, 250, 1500) * 0.55 + sx.whoosh(d, 1.42, 0.12, 250, 1300) * 0.45 + sx.thump(d, 1.77, 64) * 0.5
sw = sw / np.abs(sw).max() * 0.35
mix = bed(G + "keraton.mp3", 15.0, 0, LAND, T, 0.5, 0.45)
mix += bed(G + "gendhing.mp3", 20.0, LAND - 0.35, T, T, 0.35, 0)
sfx = np.zeros_like(mix)
place(sfx, sw, 0.0, SFX)
place(sfx, balik, FLIP_SIDE - 0.26, SFX)  # puncak kibasan di saat tampak tipis
mix *= duck_env(n(T), FLIP_SIDE - 0.26, len(balik) / SR)
finish("gunungan", mix + sfx, T, fade_out=1.0)
