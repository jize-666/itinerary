"use client";
import type { TripView } from "@/lib/trip";
import { hasPass, PassFace } from "../pass/Pass";
import { Hang } from "./Scene";

/**
 * Boarding pass di sambutan (2,5D): tergantung di benang emas, miring mengikuti kursor, cap "Admitted" jatuh dari
 * depan saat lakon dimulai. Kartu dan isinya sama dengan Today dan film (src/components/pass).
 */
export function Pass({ data, flip }: { data: TripView; flip?: "in" }) {
  if (!hasPass(data)) return null;
  return (
    <Hang kind="pass" flip={flip}>
      <PassFace data={data} />
    </Hang>
  );
}
