#!/usr/bin/env bash
# Bangun aset audio Lakon Tiga Hari dari rekaman host + SFX.
#
#   bash scripts/audio/build-audio.sh <folder_rekaman_host> <keris_sret_elevenlabs.mp3> [folder_keluaran]
#
# <folder_rekaman_host> berisi: "kebo giro.mp3", "gamelan keraton.mp3", "gendhing gamelan.mp3", "suara gong.mp3"
# (rekaman gamelan Solo milik host sendiri; tidak di-commit, hanya hasil olahannya di public/audio).
# Butuh: ffmpeg, python3 + numpy.
set -euo pipefail
IN="$1"; SRET="$2"; OUT="${3:-public/audio}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT/gamelan" "$OUT/sfx"

# MP3: satu-satunya format yang didukung semua browser termasuk Chromium tanpa codec proprietary (dipakai e2e)
enc () { ffmpeg -y -loglevel error -i "$1" -c:a libmp3lame -b:a "$3" -ar 44100 "$2"; }
lufs () { ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 | sed -n '/Summary:/,$p' | awk '/^ +I:/{print $2}'; }

# 1) Gendhing: buang rumble, kurangi noise (keraton paling berisik), kurangi "lumpur" 280 Hz, sedikit kejernihan,
#    kompresi sangat ringan, lalu samakan kenyaringan -16 LUFS (loudnorm 2 tahap, linear).
music () {
  local src="$1" name="$2" nr="$3" nf="$4"
  local pre="highpass=f=26:p=2,afftdn=nr=${nr}:nf=${nf}:tn=1,equalizer=f=280:t=q:w=1:g=-1.5,equalizer=f=3000:t=q:w=1:g=1.5,highshelf=f=10000:g=1,acompressor=threshold=-18dB:ratio=1.6:attack=25:release=300"
  ffmpeg -y -loglevel error -i "$src" -af "$pre" -ar 48000 "$TMP/$name.pre.wav"
  read -r mi mtp mlra mth off < <(ffmpeg -hide_banner -nostats -i "$TMP/$name.pre.wav" -af "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 \
    | sed -n '/^{/,/^}/p' | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
  ffmpeg -y -loglevel error -i "$TMP/$name.pre.wav" -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true" -ar 48000 "$TMP/$name.wav"
  enc "$TMP/$name.wav" "$OUT/gamelan/$name.mp3" 192k
  echo "gamelan/$name.mp3  $(lufs "$TMP/$name.wav") LUFS"
}
music "$IN/kebo giro.mp3"        kebo-giro 6  -70
music "$IN/gamelan keraton.mp3"  keraton   14 -48
music "$IN/gendhing gamelan.mp3" gendhing  6  -70

# 2) Gong ageng: pukulan pertama (paling bersih, noise -59 dB), bum diperkuat, "nong" lebih terang, sustain dinaikkan, puncak -1 dB.
ffmpeg -y -loglevel error -ss 0.705 -t 6.3 -i "$IN/suara gong.mp3" -af "highpass=f=24:p=2,afftdn=nr=10:nf=-60:tn=1,lowshelf=f=90:g=4,equalizer=f=700:t=q:w=1.2:g=2,equalizer=f=3000:t=q:w=1:g=1.5,acompressor=threshold=-26dB:ratio=3:attack=12:release=500:makeup=2,afade=t=in:st=0:d=0.004,afade=t=out:st=4.6:d=1.7" -ar 48000 "$TMP/gong.pre.wav"
pk=$(ffmpeg -hide_banner -nostats -i "$TMP/gong.pre.wav" -af volumedetect -f null - 2>&1 | awk '/max_volume/{print $5}')
ffmpeg -y -loglevel error -i "$TMP/gong.pre.wav" -af "volume=$(python3 -c "print(round(-1.0-($pk),2))")dB" "$TMP/gong.wav"
enc "$TMP/gong.wav" "$OUT/sfx/gong-ageng.mp3" 192k
echo "sfx/gong-ageng.mp3  $(lufs "$TMP/gong.wav") LUFS"

# 3) SFX: "sret" keris (potongan terbaik rekaman ElevenLabs) + sintesis prosedural, lalu samakan kenyaringan.
ffmpeg -y -loglevel error -ss 0.62 -t 0.85 -i "$SRET" -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.7:d=0.15" -ar 48000 -ac 2 -sample_fmt s16 "$TMP/sret.wav"
python3 -I "$HERE/synth_sfx.py" "$TMP/sfx" "$TMP/sret.wav" > /dev/null
for pair in "fire_breath:api-naga:-16" "gunungan_flip:gunungan-balik:-16" "keris_awaken:keris-bangkit:-17"; do
  IFS=: read -r src dst target <<< "$pair"
  i=$(lufs "$TMP/sfx/$src.wav")
  ffmpeg -y -loglevel error -i "$TMP/sfx/$src.wav" -af "volume=$(python3 -c "print(round($target-($i),2))")dB,alimiter=limit=0.89:attack=2:release=40:level=false" "$TMP/$dst.wav"
  enc "$TMP/$dst.wav" "$OUT/sfx/$dst.mp3" 160k
  echo "sfx/$dst.mp3  $(lufs "$TMP/$dst.wav") LUFS"
done
