"use client";
import { useSyncExternalStore } from "react";
import { sessionStore } from "@/lib/session";

/** Sesi di perangkat; "unknown" selama render server & hidrasi. */
export const useSession = () => useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.getServer);
