"""Sintesis efek suara prosedural (numpy saja) untuk Lakon Tiga Hari.

Dipakai karena antrean ElevenLabs gratis sedang penuh; bisa diganti versi ElevenLabs kapan saja.
Keluaran WAV 48 kHz stereo, puncak -1 dBFS:
  fire_breath.wav    semburan api naga saat gong dipukul (±2,4 dtk)
  gunungan_flip.wav  gunungan diayun lalu sisi api menyala (±1,6 dtk)
  keris_awaken.wav   "sret" keris (potongan rekaman ElevenLabs) + denting bilah + dengung pamor (±3,4 dtk)

Pakai: python3 -I scripts/audio/synth_sfx.py <folder_keluaran> [keris_sret_elevenlabs.wav]
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def onepole_lp(x, cutoff):
    """Lowpass satu kutub; cutoff boleh berupa array (sapuan) per sampel."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def hp(x, cutoff):
    return x - onepole_lp(x, cutoff)


def smooth_noise(n, rate_hz):
    """Noise acak yang dihaluskan: untuk kedip nyala api."""
    return onepole_lp(rng.standard_normal(n), rate_hz) * np.sqrt(SR / rate_hz) * 0.25


def env_adsr(t, a, hold_until, release_end, a_curve=2.0):
    e = np.zeros_like(t)
    m1 = t < a
    e[m1] = (t[m1] / a) ** (1 / a_curve)
    m2 = (t >= a) & (t < hold_until)
    e[m2] = 1.0
    m3 = (t >= hold_until) & (t < release_end)
    e[m3] = np.exp(-4.5 * (t[m3] - hold_until) / (release_end - hold_until))
    return e


def crackles(dur, rate, start, end, band_lo=1500.0):
    """Letupan bara: impuls jarang yang meluruh cepat, stereo acak."""
    n = int(dur * SR)
    out = np.zeros((n, 2))
    k = rng.poisson(rate * (end - start))
    for _ in range(k):
        t0 = rng.uniform(start, end)
        i0 = int(t0 * SR)
        ln = int(rng.uniform(0.002, 0.009) * SR)
        if i0 + ln >= n:
            continue
        burst = rng.standard_normal(ln) * np.exp(-np.linspace(0, 6, ln)) * rng.uniform(0.2, 1.0)
        pan = rng.uniform(0.2, 0.8)
        out[i0:i0 + ln, 0] += burst * (1 - pan)
        out[i0:i0 + ln, 1] += burst * pan
    out[:, 0] = hp(out[:, 0], band_lo)
    out[:, 1] = hp(out[:, 1], band_lo)
    return out


def fire_bed(dur, start, hold, release, intensity=1.0):
    """Gemuruh api: rumble rendah + desis nyala yang berkedip + letupan."""
    t = t_axis(dur)
    e = env_adsr(np.clip(t - start, 0, None), 0.08, hold - start, release - start) * (t >= start)
    flick = 0.7 + 0.3 * np.tanh(smooth_noise(len(t), 9.0))
    brown = onepole_lp(rng.standard_normal(len(t)), 25.0) * 40
    rumble = onepole_lp(brown, 180.0) * e * flick
    sweep = 900 + 2600 * np.exp(-np.clip(t - start, 0, None) * 2.2)
    hiss_l = onepole_lp(rng.standard_normal(len(t)), sweep) * e * flick
    hiss_r = onepole_lp(rng.standard_normal(len(t)), sweep) * e * flick
    out = np.stack([rumble * 0.9 + hiss_l * 0.5, rumble * 0.9 + hiss_r * 0.5], axis=1) * intensity
    out += crackles(dur, 38 * intensity, start + 0.1, release - 0.15) * 0.6
    return out


def whoosh(dur, center, width, lo=350.0, hi=2400.0):
    t = t_axis(dur)
    g = np.exp(-0.5 * ((t - center) / width) ** 2)
    cut = lo + (hi - lo) * g
    l = onepole_lp(rng.standard_normal(len(t)), cut) - onepole_lp(rng.standard_normal(len(t)), lo * 0.5) * 0.3
    r = onepole_lp(rng.standard_normal(len(t)), cut * 0.92)
    return np.stack([l * g, r * g], axis=1)


def thump(dur, at, f0=58.0):
    t = t_axis(dur)
    tt = np.clip(t - at, 0, None)
    f = f0 * (1 + 0.8 * np.exp(-tt * 25))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-tt * 9) * (t >= at)
    return np.stack([s, s], axis=1)


def blade_ring(dur, at, f0=1180.0):
    """Denting bilah: parsial tak-harmonis balok bebas (1 : 2,76 : 5,40 : 8,93), meluruh."""
    t = t_axis(dur)
    tt = np.clip(t - at, 0, None)
    out = np.zeros_like(t)
    for ratio, amp, decay in [(1.0, 1.0, 1.4), (2.756, 0.55, 2.2), (5.404, 0.3, 3.4), (8.933, 0.16, 5.0)]:
        out += amp * np.sin(2 * np.pi * f0 * ratio * tt + rng.uniform(0, 6)) * np.exp(-decay * tt)
    out *= (t >= at) * (1 - np.exp(-tt * 900))
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt)
    return np.stack([out * vib, out / vib], axis=1)


def pamor_hum(dur, start, peak, end):
    """Dengung pamor: 65 & 130 Hz dengan pelayangan pelan, membengkak lalu meredup."""
    t = t_axis(dur)
    e = np.clip((t - start) / (peak - start), 0, 1) ** 1.5 * np.clip((end - t) / (end - peak), 0, 1) ** 0.8
    l = np.sin(2 * np.pi * 65 * t) + 0.5 * np.sin(2 * np.pi * 130.4 * t) + 0.18 * np.sin(2 * np.pi * 196.2 * t)
    r = np.sin(2 * np.pi * 65.6 * t) + 0.5 * np.sin(2 * np.pi * 129.7 * t) + 0.18 * np.sin(2 * np.pi * 195.6 * t)
    return np.stack([l * e, r * e], axis=1)


def normalize(x, peak_db=-1.0):
    p = np.max(np.abs(x)) or 1.0
    y = x / p * 10 ** (peak_db / 20)
    fade = int(0.01 * SR)
    y[:fade] *= np.linspace(0, 1, fade)[:, None] ** 0.5
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return y


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def read_wav(path):
    with wave.open(str(path), "rb") as w:
        assert w.getsampwidth() == 2 and w.getframerate() == SR, "harus WAV 16-bit 48 kHz"
        ch = w.getnchannels()
        d = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
        d = d.reshape(-1, ch)
        return d if ch == 2 else np.repeat(d, 2, axis=1)


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)

    dur = 2.4
    fb = fire_bed(dur, 0.0, 1.0, 2.35) + whoosh(dur, 0.18, 0.12, 300, 3200) * 0.8 + thump(dur, 0.02, 48) * 0.5
    write_wav(out / "fire_breath.wav", normalize(fb))

    dur = 1.6
    gf = whoosh(dur, 0.26, 0.13, 250, 2000) * 1.1 + thump(dur, 0.38, 55) * 0.7 + fire_bed(dur, 0.34, 0.75, 1.58, 0.8) * 0.75
    write_wav(out / "gunungan_flip.wav", normalize(gf))

    dur = 3.4
    kr = blade_ring(dur, 0.62) * 0.6 + pamor_hum(dur, 0.55, 1.6, 3.35) * 0.22
    if len(sys.argv) > 2:
        sret = read_wav(sys.argv[2])[: int(0.85 * SR)]
        kr[: len(sret)] += sret * 1.8
    write_wav(out / "keris_awaken.wav", normalize(kr))
    print("ok:", ", ".join(p.name for p in sorted(out.glob("*.wav"))))


if __name__ == "__main__":
    main()
