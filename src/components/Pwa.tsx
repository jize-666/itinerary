"use client";
import { useEffect } from "react";
import { startPwa } from "@/lib/pwa";

/** Mendaftarkan service worker setelah halaman selesai dimuat (PRD FR-33). */
export function Pwa() {
  useEffect(() => startPwa(), []);
  return null;
}
