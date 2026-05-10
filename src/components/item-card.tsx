"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minus, Plus, MapPin, Tag } from "lucide-react";
import { StatusBadge, BagIndicator } from "@/components/item-state-badge";
import { logItemChange } from "@/lib/activity";
import {
  isLowStock,
  getNextState,
  STATUS_CYCLE,
  BAG_CYCLE,
  type Item,
  type ItemWithRelations,
  type StatusState,
  type BagState,
  type ActivitySource,
} from "@/lib/types";
import { toast } from "sonner";

interface ItemCardProps {
  item: ItemWithRelations;
  onUpdate: (id: string, updates: Partial<Item>) => Promise<unknown>;
  onTap?: (item: ItemWithRelations) => void;
  source?: ActivitySource;
  compact?: boolean;
}

export function ItemCard({
  item,
  onUpdate,
  onTap,
  source = "manual",
  compact = false,
}: ItemCardProps) {
  const [animating, setAnimating] = useState<"plus" | "minus" | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lowStock = isLowStock(item);

  async function adjustQuantity(delta: number) {
    if (item.tracking_mode !== "counted" || item.quantity === null) return;
    const newQty = Math.max(0, item.quantity + delta);
    setAnimating(delta > 0 ? "plus" : "minus");
    setTimeout(() => setAnimating(null), 200);

    await onUpdate(item.id, {
      quantity: newQty,
      last_touched_at: new Date().toISOString(),
    });
    await logItemChange(
      item,
      delta > 0 ? "restocked" : "used",
      source,
      {
        quantity_change: delta,
        quantity_after: newQty,
      }
    );

    if (newQty === 0 && item.quantity > 0) {
      toast(`${item.name} is now out of stock!`);
    }
  }

  async function cycleState() {
    const now = new Date().toISOString();
    if (item.tracking_mode === "status") {
      const current = (item.state as StatusState) || "plenty";
      const next = getNextState(current, STATUS_CYCLE);
      await onUpdate(item.id, { state: next, last_touched_at: now });
      await logItemChange(item, "state_changed", source, {
        state_before: current,
        state_after: next,
      });
    } else if (item.tracking_mode === "bag") {
      const current = (item.state as BagState) || "full";
      const next = getNextState(current, BAG_CYCLE);
      await onUpdate(item.id, { state: next, last_touched_at: now });
      await logItemChange(item, "state_changed", source, {
        state_before: current,
        state_after: next,
      });
    }
  }

  function handleLongPressStart(delta: number) {
    longPressTimer.current = setTimeout(() => {
      adjustQuantity(delta * 5);
    }, 500);
  }

  function handleLongPressEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border bg-card transition-all",
        lowStock && "border-amber-300/60 bg-amber-50/30",
        !compact && "active:scale-[0.98]"
      )}
      onClick={() => onTap?.(item)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              "font-medium truncate",
              compact ? "text-sm" : "text-base"
            )}
          >
            {item.name}
          </h3>
          {lowStock && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          )}
        </div>

        {!compact && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {item.location.name}
              </span>
            )}
            {item.category && (
              <Badge
                variant="secondary"
                className="text-xs py-0 px-1.5"
                style={
                  item.category.color
                    ? {
                        backgroundColor: `${item.category.color}20`,
                        color: item.category.color,
                        borderColor: `${item.category.color}40`,
                      }
                    : undefined
                }
              >
                {item.category.name}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {item.tracking_mode === "counted" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full transition-transform",
                animating === "minus" && "scale-90"
              )}
              onClick={() => adjustQuantity(-1)}
              onMouseDown={() => handleLongPressStart(-1)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(-1)}
              onTouchEnd={handleLongPressEnd}
              disabled={item.quantity === 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span
              className={cn(
                "text-lg font-semibold min-w-[3ch] text-center tabular-nums",
                lowStock && "text-amber-600"
              )}
            >
              {item.quantity}
            </span>
            <span className="text-xs text-muted-foreground mr-1">
              {item.unit}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full transition-transform",
                animating === "plus" && "scale-90"
              )}
              onClick={() => adjustQuantity(1)}
              onMouseDown={() => handleLongPressStart(1)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(1)}
              onTouchEnd={handleLongPressEnd}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </>
        )}
        {item.tracking_mode === "status" && (
          <StatusBadge
            state={(item.state as StatusState) || "plenty"}
            onClick={cycleState}
          />
        )}
        {item.tracking_mode === "bag" && (
          <BagIndicator
            state={(item.state as BagState) || "full"}
            onClick={cycleState}
          />
        )}
      </div>
    </div>
  );
}
