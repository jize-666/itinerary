"use client";
import { useSyncExternalStore } from "react";
import { type AudioState, audioStatus } from "@/engine/audio/status";

/** Status audio (started/enabled) yang reaktif, tanpa memuat mesin audio. */
export function useAudioState(): AudioState {
  return useSyncExternalStore(audioStatus.subscribe, audioStatus.get, audioStatus.getServer);
}
