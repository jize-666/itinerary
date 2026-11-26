/**
 * Pembangkit "biip" Clawd. Hanya memakai simpul standar (osilator, filter, penguat), jadi jalan di AudioContext
 * maupun OfflineAudioContext (rekaman pratinjau). Nada dan jadwalnya dari `engine/mascot/beep.ts`.
 */
import type { BeepTone } from "@/engine/mascot/beep";

/** Lowpass lembut untuk gelombang kotak dan gergaji supaya tidak melengking. */
const SOFTEN_HZ = 3000;
const ATTACK = 0.004;
const FLOOR = 0.0001;

/** Bunyikan satu biip di `dest` pada waktu konteks `at` (dtk). Simpul dilepas sendiri sesudah selesai. */
export function renderBeep(ctx: BaseAudioContext, dest: AudioNode, tone: BeepTone, at: number) {
  const end = at + tone.dur;
  const osc = ctx.createOscillator();
  osc.type = tone.wave;
  osc.frequency.setValueAtTime(tone.freq, at);
  if (tone.glide !== 0) osc.frequency.exponentialRampToValueAtTime(tone.freq * 2 ** (tone.glide / 12), end);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, at);
  gain.gain.linearRampToValueAtTime(Math.max(FLOOR, tone.gain), at + ATTACK);
  gain.gain.exponentialRampToValueAtTime(FLOOR, end);
  const nodes: AudioNode[] = [osc, gain];
  if (tone.wave === "triangle") osc.connect(gain);
  else {
    const soft = ctx.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = SOFTEN_HZ;
    osc.connect(soft).connect(gain);
    nodes.push(soft);
  }
  gain.connect(dest);
  osc.onended = () => nodes.forEach((n) => n.disconnect());
  osc.start(at);
  osc.stop(end + 0.02);
}
