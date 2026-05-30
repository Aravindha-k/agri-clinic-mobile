import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type AppNotificationType =
  | "gps_off"
  | "workday_expired"
  | "sync_failed"
  | "upload_failed"
  | "session_replaced"
  | "session_expired"
  | "info";

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type PushInput = {
  type: AppNotificationType;
  title: string;
  message: string;
};

type NotificationsContextValue = {
  items: AppNotification[];
  unreadCount: number;
  push: (input: PushInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const MAX_ITEMS = 40;

function iconForType(type: AppNotificationType): "location-outline" | "time-outline" | "cloud-offline-outline" | "shield-outline" | "notifications-outline" {
  switch (type) {
    case "gps_off":
      return "location-outline";
    case "workday_expired":
      return "time-outline";
    case "sync_failed":
    case "upload_failed":
      return "cloud-offline-outline";
    case "session_replaced":
    case "session_expired":
      return "shield-outline";
    default:
      return "notifications-outline";
  }
}

export { iconForType };

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);

  const push = useCallback((input: PushInput) => {
    const row: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: input.type,
      title: input.title,
      message: input.message,
      createdAt: new Date().toISOString(),
      read: false
    };
    setItems((prev) => [row, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo(
    () => ({ items, unreadCount, push, markRead, markAllRead, clearAll }),
    [clearAll, items, markAllRead, markRead, push, unreadCount]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return ctx;
}
