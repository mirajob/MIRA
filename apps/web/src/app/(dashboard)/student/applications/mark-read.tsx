"use client";

import { useEffect } from "react";
import { markAllNotificationsRead } from "@/lib/actions/notifications";

export function MarkNotificationsRead() {
  useEffect(() => {
    markAllNotificationsRead();
  }, []);
  return null;
}
