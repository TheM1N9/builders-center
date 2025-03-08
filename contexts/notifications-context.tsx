"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./auth-context";

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  application_id: string;
  link?: string;
  read: boolean;
  created_at: string;
};

type NotificationsContextType = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt" | "read">
  ) => void;
};

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user, profile } = useAuth();
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!profile) return;

    // Add debug logging
    // console.log("Setting up notifications for profile:", profile.id);

    // Subscribe to notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      // If user is admin, also fetch admin notifications
      if (profile.role === "admin") {
        query.or(`recipient_type.eq.admin,user_id.eq.${profile.id}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
    };

    fetchNotifications();

    return () => {
      channel.unsubscribe();
    };
  }, [profile]);

  const markAsRead = async (id: string) => {
    if (!profile) return;

    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Update in database
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", profile.id);
  };

  const markAllAsRead = async () => {
    if (!profile) return;

    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Update in database
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
  };

  const addNotification = async (
    notification: Omit<Notification, "id" | "createdAt" | "read">
  ) => {
    if (!profile) return;

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        ...notification,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Error adding notification:", error);
      return;
    }

    // No need to update state as the real-time subscription will handle it
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}
