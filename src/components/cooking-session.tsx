"use client";

import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Minus, Plus, ChevronDown, Check, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { logItemChange } from "@/lib/activity";
import { VoiceInput, parseVoiceBatch } from "@/components/voice-input";
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

interface CookingSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemWithRelations[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<unknown>;
}

interface SessionChange {
  itemId: string;
  type: "quantity" | "state";
  delta?: number;
  newState?: string;
}

export function CookingSession({
  open,
  onOpenChange,
  items,
  onUpdate,
}: CookingSessionProps) {
  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Map<string, SessionChange>>(new Map());
  const [saving, setSaving] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.location?.name.toLowerCase().includes(q) ||
        i.category?.name.toLowerCase().includes(q)
    );
  }, [items, search]);

  function toggleItem(item: ItemWithRelations) {
    const existing = changes.get(item.id);
    if (existing) {
      const next = new Map(changes);
      next.delete(item.id);
      setChanges(next);
      return;
    }

    const change: SessionChange = { itemId: item.id, type: "quantity" };
    if (item.tracking_mode === "counted") {
      change.delta = -1;
    } else if (item.tracking_mode === "status") {
      const current = (item.state as StatusState) || "plenty";
      change.type = "state";
      change.newState = getNextState(current, [...STATUS_CYCLE].reverse() as unknown as StatusState[]);
    } else {
      const current = (item.state as BagState) || "full";
      change.type = "state";
      change.newState = getNextState(current, [...BAG_CYCLE].reverse() as unknown as BagState[]);
    }
    setChanges(new Map(changes).set(item.id, change));
  }

  function adjustDelta(itemId: string, delta: number) {
    const existing = changes.get(itemId);
    if (!existing) return;
    setChanges(
      new Map(changes).set(itemId, { ...existing, delta: (existing.delta || 0) + delta })
    );
  }

  async function save() {
    setSaving(true);
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    for (const [itemId, change] of changes) {
      const item = items.find((i) => i.id === itemId);
      if (!item) continue;

      if (change.type === "quantity" && change.delta) {
        const newQty = Math.max(0, (item.quantity || 0) + change.delta);
        await onUpdate(itemId, {
          quantity: newQty,
          last_touched_at: now,
        });
        await logItemChange(
          item,
          "used",
          "cooking_session",
          { quantity_change: change.delta, quantity_after: newQty },
          sessionId
        );
      } else if (change.type === "state" && change.newState) {
        await onUpdate(itemId, {
          state: change.newState as Item["state"],
          last_touched_at: now,
        });
        await logItemChange(
          item,
          "state_changed",
          "cooking_session",
          { state_before: item.state || "", state_after: change.newState },
          sessionId
        );
      }
    }

    toast.success(`Cooking session saved! ${changes.size} items updated.`);
    setChanges(new Map());
    setSaving(false);
    onOpenChange(false);
  }

  function handleVoiceResult(transcript: string) {
    const parsed = parseVoiceBatch(transcript);
    const newChanges = new Map(changes);

    for (const p of parsed) {
      const match = items.find(
        (i) => i.name.toLowerCase() === p.name.toLowerCase()
      );
      if (match) {
        const change: SessionChange = { itemId: match.id, type: "quantity" };
        if (match.tracking_mode === "counted") {
          change.delta = -(p.quantity || 1);
        } else {
          change.type = "state";
          if (match.tracking_mode === "status") {
            change.newState = "low";
          } else {
            change.newState = "low";
          }
        }
        newChanges.set(match.id, change);
      }
    }

    setChanges(newChanges);
    setShowVoice(false);
    if (newChanges.size > changes.size) {
      toast.success(`Matched ${newChanges.size - changes.size} items from voice`);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>I cooked something</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowVoice(!showVoice)}
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>

          {showVoice && (
            <VoiceInput
              onResult={handleVoiceResult}
              onClose={() => setShowVoice(false)}
              label='"I used onions, garlic, a can of tomatoes"'
            />
          )}
        </div>

        <ScrollArea className="h-[calc(90vh-220px)] px-4">
          <div className="space-y-1">
            {filtered.map((item) => {
              const change = changes.get(item.id);
              const isSelected = !!change;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
                    isSelected
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  )}
                  onClick={() => toggleItem(item)}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.location?.name}
                    </p>
                  </div>

                  {isSelected && item.tracking_mode === "counted" && (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => adjustDelta(item.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-semibold min-w-[2ch] text-center">
                        {change?.delta || 0}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => adjustDelta(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {isSelected && item.tracking_mode !== "counted" && (
                    <Badge variant="secondary" className="text-xs">
                      {change?.newState}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button
            className="w-full tap-target"
            disabled={changes.size === 0 || saving}
            onClick={save}
          >
            {saving ? "Saving..." : `Save Session (${changes.size} items)`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
