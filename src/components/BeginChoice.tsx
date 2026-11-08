"use client";
import { getAudio } from "@/engine/audio/AudioEngine";

/**
 * Dua pintu masuk (PRD FR-43): tamu memilih sendiri mau disambut gamelan atau hening.
 * Klik ini juga gesture yang membuka audio di iOS/Chrome (kebijakan autoplay).
 */
export function BeginChoice({ onBegin }: { onBegin: (withSound: boolean) => void }) {
  const choose = (withSound: boolean) => {
    getAudio().begin(withSound);
    onBegin(withSound);
  };
  return (
    <div className="begin">
      <button type="button" className="begin-btn begin-btn--sound" onClick={() => choose(true)}>
        <span className="begin-en">Begin with gamelan</span>
        <span className="begin-id" lang="id">
          Mulai dengan gamelan
        </span>
      </button>
      <button type="button" className="begin-btn begin-btn--quiet" onClick={() => choose(false)}>
        <span className="begin-en">Begin quietly</span>
        <span className="begin-id" lang="id">
          Mulai tanpa suara
        </span>
      </button>
      <p className="begin-note">Sound can be switched at any time.</p>
    </div>
  );
}
