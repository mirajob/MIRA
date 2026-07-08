"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface NotificationBellProps {
  initialUnreadCount: number;
}

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      const data = await getNotifications();
      setNotifications(data as Notification[]);
      setLoaded(true);
    }
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.read_at) {
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationRead(n.id);
    }
    setOpen(false);
    const link = n.data?.link;
    if (typeof link === "string") router.push(link);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={handleOpen}
        aria-label="Notifiche"
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:text-navy hover:bg-navy-50 transition-colors duration-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error text-white text-[9px] font-bold px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-white shadow-xl z-50">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-white">
            <p className="text-body-sm font-medium text-navy">Notifiche</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-petrol hover:underline underline-offset-2">
                Segna tutte come lette
              </button>
            )}
          </div>
          {!loaded ? (
            <div className="px-4 py-6 text-center text-body-sm text-ink-tertiary">Caricamento...</div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-body-sm text-ink-tertiary">Nessuna notifica.</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-b-0 transition-colors duration-100 ${n.read_at ? "hover:bg-paper" : "bg-navy-50/60 hover:bg-navy-50"}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-petrol shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-medium text-navy leading-snug">{n.title}</p>
                    {n.body && <p className="text-xs text-ink-secondary mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-ink-tertiary mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
