// Original filtered-noise bed; a short circular buffer and two slow envelopes on the film's
// existing audio context. No downloaded audio, second user-gesture gate or AudioContext.
export function mountAmbience(
  { context: ctx, output }: { context: BaseAudioContext; output: AudioNode },
  place: string,
  start = ctx.currentTime,
  end?: number,
) {
  const water = place === "grojogan-sewu",
    dawn = place === "kemuning-sunrise" || place === "depart-lawu";
  const gain = ctx.createGain(),
    filter = ctx.createBiquadFilter(),
    source = ctx.createBufferSource();
  const len = Math.floor(ctx.sampleRate * 2),
    buf = ctx.createBuffer(1, len, ctx.sampleRate),
    s = buf.getChannelData(0);
  let state = 939,
    previous = 0;
  for (let i = 0; i < len; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    previous = previous * 0.8 + (state / 4294967296 - 0.5) * 0.52;
    s[i] = previous * Math.min(1, i / 150, (len - i) / 150);
  }
  source.buffer = buf;
  source.loop = true;
  filter.type = water ? "lowpass" : "bandpass";
  filter.frequency.value = water ? 4100 : dawn ? 520 : 700;
  filter.Q.value = 0.64;
  const now = start;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(water ? 0.27 : dawn ? 0.1 : 0.04, now + 0.48);
  source.connect(filter).connect(gain).connect(output);
  source.start(start);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  const stop = (t: number) => {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0, t, 0.045);
    source.stop(t + 0.25);
  };
  if (end !== undefined) stop(end);
  return () => stop(ctx.currentTime);
}
