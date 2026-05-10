"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useItems } from "@/hooks/use-items";
import { useAuth } from "@/components/auth-provider";
import { isLowStock } from "@/lib/types";
import { getSettings } from "@/lib/settings";

const SESSION_KEY = "kitchen-inventory-notified";

export function LowStockNotifier() {
  const { user } = useAuth();
  const { items, loading } = useItems();
  const notified = useRef(false);

  useEffect(() => {
    if (loading || !user || notified.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const lowItems = items.filter(isLowStock);
    if (lowItems.length === 0) return;

    notified.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");

    const outItems = lowItems.filter(
      (i) => i.state === "out" || i.state === "empty" || (i.quantity !== null && i.quantity <= 0)
    );
    const label =
      outItems.length > 0
        ? `${outItems.length} out, ${lowItems.length - outItems.length} running low`
        : `${lowItems.length} item${lowItems.length === 1 ? "" : "s"} running low`;

    const names = lowItems.slice(0, 4).map((i) => i.name).join(", ");
    const suffix = lowItems.length > 4 ? ` and ${lowItems.length - 4} more` : "";

    toast.warning(label, {
      description: names + suffix,
      duration: 8000,
    });

    const settings = getSettings();
    if (settings.notifications_enabled && "Notification" in window && Notification.permission === "granted") {
      new Notification("Kitchen Inventory", {
        body: `${label}: ${names}${suffix}`,
        icon: "/icons/icon-192.png",
        tag: "low-stock",
      });
    }
  }, [loading, items, user]);

  return null;
}
