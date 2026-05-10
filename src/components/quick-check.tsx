"use client";

import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, SkipForward, Minus, Plus } from "lucide-react";
import { StatusBadge, BagIndicator } from "@/components/item-state-badge";
import { cn } from "@/lib/utils";
import { logItemChange } from "@/lib/activity";
import { saveSettings } from "@/lib/settings";
import {
  type ItemWithRelations,
  type Item,
  type StatusState,
  type BagState,
  getNextState,
  STATUS_CYCLE,
  BAG_CYCLE,
} from "@/lib/types";
import { toast } from "sonner";

interface QuickCheckProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemWithRelations[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<unknown>;
  onRefresh: () => void;
}

export function QuickCheck({
  open,
  onOpenChange,
  items,
  onUpdate,
  onRefresh,
}: QuickCheckProps) {
  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) =>
        new Date(a.last_touched_at).getTime() -
        new Date(b.last_touched_at).getTime()
    );
  }, [items]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [checked, setChecked] = useState(0);

  const item = sorted[currentIndex];
  const progress = sorted.length > 0 ? (currentIndex / sorted.length) * 100 : 0;

  async function confirm() {
    if (!item) return;
    await onUpdate(item.id, {
      last_touched_at: new Date().toISOString(),
    });
    setChecked((c) => c + 1);
    next();
  }

  function skip() {
    next();
  }

  function next() {
    if (currentIndex >= sorted.length - 1) {
      finish();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function finish() {
    saveSettings({ last_quick_check: new Date().toISOString() });
    toast.success(`Quick check done! ${checked} items confirmed.`);
    setCurrentIndex(0);
    setChecked(0);
    onRefresh();
    onOpenChange(false);
  }

  async function adjustQuantity(delta: number) {
    if (!item || item.tracking_mode !== "counted") return;
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    await onUpdate(item.id, {
      quantity: newQty,
      last_touched_at: new Date().toISOString(),
    });
    await logItemChange(item, "adjusted", "quick_check", {
      quantity_change: delta,
      quantity_after: newQty,
    });
    setChecked((c) => c + 1);
    next();
  }

  async function cycleState() {
    if (!item) return;
    const now = new Date().toISOString();
    if (item.tracking_mode === "status") {
      const current = (item.state as StatusState) || "plenty";
      const nextState = getNextState(current, STATUS_CYCLE);
      await onUpdate(item.id, { state: nextState, last_touched_at: now });
      await logItemChange(item, "state_changed", "quick_check", {
        state_before: current,
        state_after: nextState,
      });
    } else if (item.tracking_mode === "bag") {
      const current = (item.state as BagState) || "full";
      const nextState = getNextState(current, BAG_CYCLE);
      await onUpdate(item.id, { state: nextState, last_touched_at: now });
      await logItemChange(item, "state_changed", "quick_check", {
        state_before: current,
        state_after: nextState,
      });
    }
    setChecked((c) => c + 1);
    next();
  }

  if (!item) return null;

  const daysSinceTouched = Math.floor(
    (Date.now() - new Date(item.last_touched_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle>Quick Check</SheetTitle>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {sorted.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </SheetHeader>

        <div className="flex flex-col items-center justify-center flex-1 p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{item.name}</h2>
            <div className="flex items-center gap-2 justify-center">
              {item.location && (
                <Badge variant="secondary">{item.location.name}</Badge>
              )}
              {item.category && (
                <Badge
                  variant="outline"
                  style={
                    item.category.color
                      ? { borderColor: item.category.color, color: item.category.color }
                      : undefined
                  }
                >
                  {item.category.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated {daysSinceTouched} days ago
            </p>
          </div>

          <div className="text-center space-y-4">
            {item.tracking_mode === "counted" && (
              <div className="space-y-3">
                <p className="text-4xl font-bold">
                  {item.quantity}{" "}
                  <span className="text-lg text-muted-foreground">
                    {item.unit}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Still accurate?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 w-14 rounded-full"
                    onClick={() => adjustQuantity(-1)}
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <Button
                    size="lg"
                    className="h-14 px-8 rounded-full"
                    onClick={confirm}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Correct
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 w-14 rounded-full"
                    onClick={() => adjustQuantity(1)}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {item.tracking_mode === "status" && (
              <div className="space-y-3">
                <StatusBadge
                  state={(item.state as StatusState) || "plenty"}
                  className="text-lg px-6 py-2"
                />
                <p className="text-sm text-muted-foreground">
                  Tap to change, or confirm
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-6 rounded-full"
                    onClick={cycleState}
                  >
                    Change
                  </Button>
                  <Button
                    size="lg"
                    className="h-14 px-8 rounded-full"
                    onClick={confirm}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Correct
                  </Button>
                </div>
              </div>
            )}

            {item.tracking_mode === "bag" && (
              <div className="space-y-3">
                <BagIndicator
                  state={(item.state as BagState) || "full"}
                  className="text-lg px-6 py-2 mx-auto"
                />
                <p className="text-sm text-muted-foreground">
                  Tap to change, or confirm
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-6 rounded-full"
                    onClick={cycleState}
                  >
                    Change
                  </Button>
                  <Button
                    size="lg"
                    className="h-14 px-8 rounded-full"
                    onClick={confirm}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Correct
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={skip}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip
          </Button>
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" className="w-full" onClick={finish}>
            End Quick Check ({checked} confirmed)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
