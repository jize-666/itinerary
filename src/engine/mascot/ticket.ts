/**
 * Pemetaan isyarat tiket bertali (`PassSignal`, dari tiket 3D maupun 2,5D) ke reaksi Clawd. Murni.
 */
import type { PassSignal } from "@/engine/stage/bus";
import type { TicketKind } from "./behavior";

/** Kecepatan lepas (m/s) paling pelan yang dianggap dilempar. */
export const TOSS_SPEED = 0.9;

/**
 * Reaksi "dipegang" ditunda sekian ms: ketukan (pegang lalu langsung lepas, yang membalik tiket) bukan pegangan, jadi
 * Clawd menanggapi baliknya, bukan pegangannya.
 */
export const GRAB_DELAY = 350;

export function ticketReaction(signal: PassSignal): TicketKind | null {
  switch (signal.type) {
    case "grab":
      return "grab";
    case "release":
      return signal.speed >= TOSS_SPEED ? "toss" : null;
    case "flip":
      return signal.back ? "back" : "front";
    default:
      return null;
  }
}
