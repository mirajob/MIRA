"use client";

import { useState, useTransition } from "react";
import { approveCardBlock } from "@/lib/actions/card-blocks";
import type { CardBlockStatus, CardBlockType } from "@mira/types";

export function CardBlockHeader({
  title,
  status,
  blockType,
}: {
  title: string;
  status: CardBlockStatus;
  blockType: CardBlockType;
}) {
  const [pending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(status);

  function handleApprove() {
    setLocalStatus("approved");
    startTransition(() => {
      approveCardBlock(blockType);
    });
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
      <h2 className="font-sans text-h3 text-navy">{title}</h2>
      <div className="flex items-center gap-3">
        {localStatus === "approved" && (
          <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">Approvato</span>
        )}
        {localStatus === "draft" && (
          <>
            <span className="text-xs px-2 py-0.5 rounded bg-warning-bg text-warning font-medium">Da confermare</span>
            <button
              onClick={handleApprove}
              disabled={pending}
              className="text-xs font-medium text-white bg-petrol rounded-md px-3 py-1.5 hover:bg-petrol-700 transition-colors disabled:opacity-50"
            >
              Conferma
            </button>
          </>
        )}
      </div>
    </div>
  );
}
