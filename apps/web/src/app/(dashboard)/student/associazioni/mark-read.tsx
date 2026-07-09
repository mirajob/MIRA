"use client";

import { useEffect } from "react";
import { markOtherNotificationsRead } from "@/lib/actions/notifications";

export function MarkAssociationNotificationsRead() {
  useEffect(() => {
    markOtherNotificationsRead();
  }, []);
  return null;
}
