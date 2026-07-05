import type { ItemOrigin } from "@mira/types";

/** Etichetta di evidenza mostrata sulla card: da dove viene davvero questo dato. */
export function originLabel(origin: ItemOrigin): string {
  switch (origin) {
    case "transcript":
      return "libretto";
    case "cv_upload":
      return "dal CV";
    case "onboarding":
      return "dichiarata";
    case "manual":
      return "aggiunta a mano";
  }
}
