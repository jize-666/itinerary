import { BedPlayer } from "./bed";
import { BED_LEVEL, BEDS, type BedName, DUCK_LEVEL, SFX, SFX_LEVEL, type SfxName } from "./catalog";
import { LOOP_LOOKAHEAD } from "./loop";
import { writeSoundPref } from "./preference";
import { type AudioState, audioStatus, INITIAL_AUDIO } from "./status";

export type { AudioState };

export type PlayBedOptions = { loop?: boolean; fadeIn?: number; xfade?: number; then?: BedName };
export type PlaySfxOptions = { gain?: number; delay?: number; duck?: boolean };

/** Efek yang datang lebih telat dari ini (masih diunduh) dibuang: bunyi gong yang tertinggal visual lebih mengganggu daripada hening. */
const SFX_LATE = 0.4;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext; __lakonAudio?: unknown };

/**
 * Mesin audio: satu AudioContext, gendhing (bed) di bawah, efek suara di atas, master untuk toggle.
 * Rantai: bed → bedBus (ducking) → master → keluaran; sfx → sfxBus → master.
 * AudioContext hanya dibuat di dalam gesture tamu (klik), jadi aman terhadap kebijakan autoplay.
 */
class AudioEngine {
  private state: AudioState = INITIAL_AUDIO;
  private readonly listeners = new Set<() => void>();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bedBus!: GainNode;
  private sfxBus!: GainNode;
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private bed: BedPlayer | null = null;
  private bedName: BedName | null = null;
  private bedToken = 0;
  private pumpTimer: ReturnType<typeof setInterval> | null = null;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSfx: SfxName | null = null;

  constructor() {
    if (typeof window !== "undefined") (window as AudioWindow).__lakonAudio = { debug: () => this.debug() };
  }

  // ---- status untuk React (useSyncExternalStore) ----
  getState = () => this.state;
  getServerState = () => INITIAL_AUDIO;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private set(patch: Partial<AudioState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
    audioStatus.publish(this.state, this);
  }

  /** Pilihan di gerbang. HARUS dipanggil langsung dari handler klik. */
  begin(withSound: boolean) {
    writeSoundPref(withSound ? "on" : "off");
    this.set({ started: true, enabled: withSound });
    if (!withSound) return;
    if (!this.unlock()) return;
    // Sambutan Kebo Giro sekali, lalu bersambung (crossfade) ke gendhing keraton yang diulang.
    // Sisanya baru diunduh setelah sambutan berbunyi, supaya tidak berebut jaringan di HP.
    void this.playBed("kebo-giro", { loop: false, fadeIn: 0.8, xfade: 4, then: "keraton" }).then(() => {
      void this.load(BEDS.keraton);
      for (const url of Object.values(SFX)) void this.load(url);
    });
  }

  /** Toggle speaker. HARUS dipanggil langsung dari handler klik. */
  setEnabled(on: boolean) {
    writeSoundPref(on ? "on" : "off");
    this.set({ enabled: on });
    if (on) {
      if (!this.unlock()) return;
      this.rampMaster(1, 0.35);
      // Sambutan hanya di gerbang; menyalakan belakangan langsung ke latar bab.
      if (!this.bed?.playing) void this.playBed("keraton", { loop: true, fadeIn: 2.5, xfade: 4 });
      for (const url of Object.values(SFX)) void this.load(url);
    } else if (this.ctx) {
      this.rampMaster(0, 0.3);
      this.clearSuspend();
      // Hemat baterai: hentikan jam konteks setelah redam selesai.
      this.suspendTimer = setTimeout(() => {
        if (!this.state.enabled) void this.ctx?.suspend();
      }, 380);
    }
  }

  async playBed(name: BedName, { loop = true, fadeIn = 2.5, xfade = 4, then }: PlayBedOptions = {}) {
    const ctx = this.ctx;
    if (!ctx || (this.bedName === name && this.bed?.playing)) return;
    const token = ++this.bedToken;
    this.bedName = name;
    const buffer = await this.load(BEDS[name]).catch(() => null);
    if (!buffer || token !== this.bedToken) return;
    this.startBed(name, buffer, ctx.currentTime + 0.05, { loop, fadeIn, xfade, then });
  }

  stopBed(fade = 1.5) {
    this.bedToken++;
    this.bed?.stop(fade);
    this.bed = null;
    this.bedName = null;
  }

  async playSfx(name: SfxName, { gain = 1, delay = 0, duck = true }: PlaySfxOptions = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.state.enabled) return;
    const asked = ctx.currentTime;
    const buffer = await this.load(SFX[name]).catch(() => null);
    if (!buffer || !this.state.enabled) return;
    const at = Math.max(asked + delay, ctx.currentTime);
    if (at - (asked + delay) > SFX_LATE) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.sfxBus);
    src.onended = () => g.disconnect();
    src.start(at);
    this.lastSfx = name;
    if (duck) this.duck(at, buffer.duration);
  }

  /** Unduh dan urai satu efek lebih dulu, supaya saat dipakai tidak terlambat (dan dibuang oleh SFX_LATE). */
  preload(name: SfxName) {
    if (this.ctx && this.state.enabled) void this.load(SFX[name]).catch(() => null);
  }

  /** Untuk e2e & debug; tidak memuat data apa pun selain status audio. */
  debug() {
    return { ...this.state, ctx: this.ctx?.state ?? "none", bed: this.bed?.playing ? this.bedName : null, lastSfx: this.lastSfx };
  }

  // ---- internal ----

  private startBed(name: BedName, buffer: AudioBuffer, at: number, o: Required<Omit<PlayBedOptions, "then">> & { then?: BedName }) {
    const ctx = this.ctx!;
    const prev = this.bed;
    const player = new BedPlayer(ctx, buffer, this.bedBus, {
      loop: o.loop,
      fadeIn: o.fadeIn,
      xfade: o.xfade,
      onTail: o.then ? (tailAt, xf) => void this.chain(o.then!, tailAt, xf) : undefined,
    });
    prev?.stop(Math.max(o.fadeIn, 0.3));
    this.bed = player;
    this.bedName = name;
    player.start(at);
    this.ensurePump();
  }

  /** Sambung ke gendhing berikutnya tepat di ekor yang sedang berbunyi (crossfade equal-power). */
  private async chain(name: BedName, at: number, xf: number) {
    const token = this.bedToken;
    const buffer = await this.load(BEDS[name]).catch(() => null);
    const ctx = this.ctx;
    if (!buffer || !ctx || token !== this.bedToken) return;
    const prev = this.bed;
    const start = Math.max(at, ctx.currentTime + 0.05);
    const player = new BedPlayer(ctx, buffer, this.bedBus, { loop: true, fadeIn: xf, xfade: 4 });
    player.start(start);
    this.bed = player;
    this.bedName = name;
    // Ekor yang lama sudah punya fade-out sendiri; kalau sambungannya telat, redam sisanya.
    if (prev && start > at + 0.1) prev.stop(Math.min(xf, 1.5));
  }

  private ensurePump() {
    if (this.pumpTimer) return;
    // Jadwal memakai jam AudioContext; timer ini hanya "membangunkan" penjadwal, setengah lookahead cukup.
    this.pumpTimer = setInterval(() => this.bed?.pump(), (LOOP_LOOKAHEAD * 1000) / 4);
  }

  private duck(at: number, dur: number) {
    const g = this.bedBus.gain;
    g.cancelScheduledValues(at);
    g.setTargetAtTime(DUCK_LEVEL, at, 0.04);
    g.setTargetAtTime(BED_LEVEL, at + Math.min(2.4, dur * 0.5), 0.45);
  }

  private rampMaster(to: number, dur: number) {
    if (!this.ctx) return;
    const g = this.master.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(to, now + dur);
  }

  private clearSuspend() {
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    this.suspendTimer = null;
  }

  private load(url: string): Promise<AudioBuffer> {
    let p = this.buffers.get(url);
    if (!p) {
      const ctx = this.ctx;
      if (!ctx) return Promise.reject(new Error("audio belum dibuka"));
      p = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`${url}: ${r.status}`);
          return r.arrayBuffer();
        })
        .then((b) => ctx.decodeAudioData(b));
      p.catch(() => this.buffers.delete(url)); // boleh dicoba lagi nanti
      this.buffers.set(url, p);
    }
    return p;
  }

  /** Buka AudioContext di dalam gesture. Mengembalikan false bila browser tidak punya Web Audio. */
  private unlock(): boolean {
    this.clearSuspend();
    if (this.ctx) {
      if (this.ctx.state !== "running") void this.ctx.resume();
      return true;
    }
    const w = window as AudioWindow;
    const Ctor = window.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return false;
    // iOS 17+: kategori "playback" supaya tetap berbunyi meski sakelar senyap aktif [V].
    try {
      const nav = navigator as AudioSessionNavigator;
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      /* tidak didukung */
    }
    const ctx = new Ctor({ latencyHint: "playback" });
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.bedBus = ctx.createGain();
    this.bedBus.gain.value = BED_LEVEL;
    this.bedBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = SFX_LEVEL;
    this.sfxBus.connect(this.master);
    // iOS lama baru "terbuka" setelah ada buffer yang diputar di dalam gesture.
    const blip = ctx.createBufferSource();
    blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    blip.connect(ctx.destination);
    blip.start();
    void ctx.resume();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void ctx.suspend();
      else if (this.state.enabled) void ctx.resume();
    });
    // Safari bisa "interrupted" (telepon, Siri); sentuhan berikutnya membukanya lagi.
    document.addEventListener(
      "pointerdown",
      () => {
        if (this.state.enabled && !document.hidden && ctx.state !== "running") void ctx.resume();
      },
      { passive: true },
    );
    return true;
  }
}

let engine: AudioEngine | null = null;
export function getAudio(): AudioEngine {
  return (engine ??= new AudioEngine());
}
export type { AudioEngine };
