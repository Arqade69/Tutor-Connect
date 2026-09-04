"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
} from "@/actions/notifications";
import { asFormAction } from "@/components/form";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Read inside the SSE handler below without needing to re-subscribe the
  // effect every time the dropdown opens/closes.
  const openRef = useRef(open);
  openRef.current = open;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const notifs = await getNotifications();
      setNotifications(notifs);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  // Live unread-count updates via Server-Sent Events — the server pushes a
  // message only when the count actually changes, instead of this
  // component polling on a fixed timer. If the connection drops (e.g. the
  // server recycles it after a while), the browser's EventSource
  // reconnects automatically — no extra code needed here for that.
  useEffect(() => {
    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("unread-count", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { count: number };
      setCount((prev) => {
        if (data.count > prev && openRef.current) {
          // Something new arrived while the dropdown is already open —
          // refresh the visible list too, not just the badge.
          loadNotifications();
        }
        return data.count;
      });
    });

    return () => source.close();
  }, [loadNotifications]);

  const toggle = () => {
    if (!open) {
      loadNotifications();
    }
    setOpen(!open);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setCount(0);
  };

  const handleMarkRead = async (id: string) => {
    const fd = new FormData();
    fd.set("id", id);
    await markNotificationRead(fd);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setCount((c) => Math.max(0, c - 1));
  };

  const timeAgo = (date: Date) => {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              {count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="h-5 w-5 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <svg className="mx-auto mb-2 h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-slate-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-slate-50 px-4 py-3 transition ${
                      n.isRead ? "bg-white" : "bg-brand-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!n.isRead && (
                            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                          )}
                          <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="mt-1 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Mark as read"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
