"use client";
import { useSyncExternalStore } from "react";
import { langStore } from "./lang";

/** Bahasa aktif tanpa kamus lengkap: untuk komponen layout (lihat chrome.ts). */
export const useLang = () => useSyncExternalStore(langStore.subscribe, langStore.get, langStore.getServer);
