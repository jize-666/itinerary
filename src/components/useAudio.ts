"use client";
import { useSyncExternalStore } from "react";
import { getAudio, type AudioState } from "@/engine/audio/AudioEngine";

/** Status audio (started/enabled) yang reaktif. Engine baru dibuat di klien. */
export function useAudioState(): AudioState {
  const a = getAudio();
  return useSyncExternalStore(a.subscribe, a.getState, a.getServerState);
}
