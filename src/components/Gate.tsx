"use client";
import { useState } from "react";
import { BeginChoice } from "./BeginChoice";

/** Gerbang sementara: kode akses menyusul (Tugas 12). Sekarang: salam + pilihan suara. */
export function Gate() {
  const [begun, setBegun] = useState(false);
  return (
    <main className="gate">
      {begun ? (
        <h1 className="gate-title" lang="jv">
          Sugeng rawuh.
        </h1>
      ) : (
        <>
          <h1 className="gate-title">Kulonuwun?</h1>
          <BeginChoice onBegin={() => setBegun(true)} />
        </>
      )}
    </main>
  );
}
