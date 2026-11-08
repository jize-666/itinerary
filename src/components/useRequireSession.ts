"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { type Session, UNKNOWN } from "@/lib/session";
import { useSession } from "./useSession";

/** Halaman privat (/film, /today): tanpa sesi → kembali ke gerbang (PRD FR-01). */
export function useRequireSession(): Session | null {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session === null) router.replace("/");
  }, [session, router]);
  return session === UNKNOWN ? null : session;
}
