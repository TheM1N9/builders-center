"use client";

import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/notifications-context";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Notification } from "@/contexts/notifications-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function NotificationsDropdown() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [error, setError] = useState<string | null>(null);

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    router.push(`/applications/${notification.application_id}`);
  };

  if (error) {
    return (
      <div className="text-destructive">
        Error loading notifications: {error}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 flex items-start gap-3 cursor-pointer group ${
                  notification.read ? "" : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start group-hover:text-white">
                    <span className="font-medium text-sm">
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <Badge variant="destructive" className="ml-2">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground group-hover:text-gray-200 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground group-hover:text-gray-300">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-2 hover:text-primary group-hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <CheckCheck className="h-6 w-6 text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mark as read</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
