"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Minus,
  RefreshCw,
  Trash2,
  ArrowRightLeft,
  Package,
  ChefHat,
} from "lucide-react";
import type { ActivityLog } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  added: <Plus className="w-3.5 h-3.5" />,
  used: <Minus className="w-3.5 h-3.5" />,
  adjusted: <RefreshCw className="w-3.5 h-3.5" />,
  state_changed: <ArrowRightLeft className="w-3.5 h-3.5" />,
  created: <Package className="w-3.5 h-3.5" />,
  deleted: <Trash2 className="w-3.5 h-3.5" />,
  restocked: <Plus className="w-3.5 h-3.5" />,
};

const ACTION_COLORS: Record<string, string> = {
  added: "bg-emerald-100 text-emerald-700",
  used: "bg-orange-100 text-orange-700",
  adjusted: "bg-blue-100 text-blue-700",
  state_changed: "bg-purple-100 text-purple-700",
  created: "bg-emerald-100 text-emerald-700",
  deleted: "bg-red-100 text-red-700",
  restocked: "bg-emerald-100 text-emerald-700",
};

export default function ActivityPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const supabase = createClient();

  const fetchLogs = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter !== "all") {
      query = query.eq("action", filter);
    }

    const { data } = await query;
    if (data) setLogs(data);
    setLoading(false);
  }, [user, filter, supabase]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function deleteEntry(id: string) {
    await supabase.from("activity_log").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  const grouped = useMemo(() => {
    const groups = new Map<string, ActivityLog[]>();
    for (const log of logs) {
      const date = new Date(log.created_at).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const existing = groups.get(date) || [];
      existing.push(log);
      groups.set(date, existing);
    }
    return Array.from(groups.entries());
  }, [logs]);

  function formatDetail(log: ActivityLog): string {
    if (log.quantity_change !== null) {
      const sign = log.quantity_change > 0 ? "+" : "";
      return `${sign}${log.quantity_change} (now ${log.quantity_after})`;
    }
    if (log.state_before && log.state_after) {
      return `${log.state_before} → ${log.state_after}`;
    }
    return "";
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="p-4 pb-2 space-y-2">
        <h1 className="text-xl font-bold">Activity</h1>
        <Select value={filter} onValueChange={(v: string | null) => setFilter(v ?? "all")}>
          <SelectTrigger className="w-40 h-9 text-xs">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="restocked">Restocked</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="state_changed">State Changed</SelectItem>
            <SelectItem value="adjusted">Adjusted</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 px-4">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {grouped.map(([date, entries]) => {
              const sessionGroups = new Map<string, ActivityLog[]>();
              const standalone: ActivityLog[] = [];

              for (const entry of entries) {
                if (entry.session_id) {
                  const group = sessionGroups.get(entry.session_id) || [];
                  group.push(entry);
                  sessionGroups.set(entry.session_id, group);
                } else {
                  standalone.push(entry);
                }
              }

              return (
                <div key={date}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {date}
                  </h3>
                  <div className="space-y-1.5">
                    {/* Cooking sessions grouped */}
                    {Array.from(sessionGroups.entries()).map(
                      ([sessionId, sessionEntries]) => (
                        <div
                          key={sessionId}
                          className="p-3 rounded-lg border bg-card space-y-1"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <ChefHat className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-primary">
                              {sessionEntries[0].source === "cooking_session"
                                ? "Cooking Session"
                                : "Batch Update"}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(
                                sessionEntries[0].created_at
                              ).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {sessionEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center gap-2 text-sm pl-6"
                            >
                              <span className="truncate flex-1">
                                {entry.item_name_snapshot}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatDetail(entry)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Standalone entries */}
                    {standalone.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card group"
                      >
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            ACTION_COLORS[entry.action] || "bg-muted"
                          )}
                        >
                          {ACTION_ICONS[entry.action]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            <span className="font-medium">
                              {entry.item_name_snapshot}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              {entry.action.replace("_", " ")}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {new Date(entry.created_at).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" }
                              )}
                            </span>
                            {entry.source && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1">
                                {entry.source}
                              </Badge>
                            )}
                            {formatDetail(entry) && (
                              <span>{formatDetail(entry)}</span>
                            )}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={<Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>}
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this log entry?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This won&apos;t undo the change, just remove the
                                history entry.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteEntry(entry.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
