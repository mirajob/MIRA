"use client";

import { updateCycleStatus } from "@/lib/actions/cycles";

interface Props {
  associationId: string;
  cycleId: string;
  currentStatus: string;
}

export function CycleStatusButton({ associationId, cycleId, currentStatus }: Props) {
  if (currentStatus === "draft") {
    return (
      <form action={() => updateCycleStatus(associationId, cycleId, "open")}>
        <button type="submit" className="bg-navy text-white px-4 py-2 rounded-md text-label hover:bg-navy-700 transition-colors duration-100">
          Apri
        </button>
      </form>
    );
  }

  if (currentStatus === "open") {
    return (
      <form action={() => updateCycleStatus(associationId, cycleId, "closed")}>
        <button type="submit" className="text-body-sm text-error hover:text-error/80 px-4 py-2 transition-colors duration-100">
          Chiudi
        </button>
      </form>
    );
  }

  return null;
}
