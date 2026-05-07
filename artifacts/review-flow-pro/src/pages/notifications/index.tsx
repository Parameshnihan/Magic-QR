import React from "react";
import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Star, MessageSquareWarning, CreditCard, Info, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Notifications() {
  const { data, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'review': return <Star className="h-5 w-5 text-yellow-500" />;
      case 'feedback': return <MessageSquareWarning className="h-5 w-5 text-orange-500" />;
      case 'billing': return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'alert': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">Stay updated on recent activity.</p>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="mx-auto h-8 w-8 mb-3 opacity-20" />
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data?.data.map((notification) => (
                <div key={notification.id} className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${!notification.read ? 'bg-primary/5' : ''}`}>
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm border border-border">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{notification.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                  {!notification.read && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(notification.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
