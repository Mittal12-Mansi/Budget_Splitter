import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Receipt,
  HandCoins,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  groupId: number | null;
  read: boolean;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

function NotifIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "expense_added":
      return <Receipt className={`${cls} text-primary`} />;
    case "settlement_made":
      return <HandCoins className={`${cls} text-green-500`} />;
    case "debt_reminder":
      return <AlertCircle className={`${cls} text-amber-500`} />;
    case "member_added":
      return <UserPlus className={`${cls} text-blue-500`} />;
    default:
      return <Bell className={`${cls} text-muted-foreground`} />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/notifications");
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // fail silently — bell is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // fail silently
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) fetchNotifications(); // refresh on open
      }}
    >
      {/* ── Trigger ── */}
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      {/* ── Panel ── */}
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Body */}
        {loading && notifications.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Bell className="h-6 w-6 opacity-25" />
            <span>You're all caught up!</span>
          </div>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-4 transition-colors ${
                    !n.read ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  {/* Icon bubble */}
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      !n.read ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <NotifIcon type={n.type} />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                    {n.groupId && (
                      <Link href={`/groups/${n.groupId}`}>
                        <span
                          className="mt-0.5 block text-[10px] text-primary hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          View group →
                        </span>
                      </Link>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}