"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Plus, ShoppingBag } from "lucide-react";
import { VoiceInput, parseVoiceBatch } from "@/components/voice-input";
import { logItemChange, logActivity } from "@/lib/activity";
import { cn } from "@/lib/utils";
import type {
  ItemWithRelations,
  Item,
  Location,
  Category,
  TrackingMode,
} from "@/lib/types";
import { getSettings } from "@/lib/settings";
import { toast } from "sonner";

interface RestockItem {
  name: string;
  quantity: number;
  unit?: string;
  matchedItemId?: string;
  isNew: boolean;
  locationId?: string;
  trackingMode?: TrackingMode;
}

interface VoiceRestockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemWithRelations[];
  locations: Location[];
  categories: Category[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<unknown>;
  onAdd: (
    item: Omit<Item, "id" | "user_id" | "created_at" | "updated_at" | "last_touched_at">
  ) => Promise<unknown>;
  onRefresh: () => void;
}

export function VoiceRestock({
  open,
  onOpenChange,
  items,
  locations,
  categories,
  onUpdate,
  onAdd,
  onRefresh,
}: VoiceRestockProps) {
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [showVoice, setShowVoice] = useState(true);
  const [saving, setSaving] = useState(false);

  function handleVoiceResult(transcript: string) {
    const parsed = parseVoiceBatch(transcript);
    const settings = getSettings();

    const mapped: RestockItem[] = parsed.map((p) => {
      const match = items.find(
        (i) => i.name.toLowerCase() === p.name.toLowerCase()
      );
      return {
        name: p.name,
        quantity: p.quantity || 1,
        unit: p.unit,
        matchedItemId: match?.id,
        isNew: !match,
        trackingMode: match?.tracking_mode || settings.default_tracking_mode,
      };
    });

    setRestockItems(mapped);
    setShowVoice(false);
  }

  function removeItem(index: number) {
    setRestockItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRestockItem(index: number, updates: Partial<RestockItem>) {
    setRestockItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  }

  async function save() {
    setSaving(true);
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    for (const ri of restockItems) {
      if (ri.matchedItemId) {
        const existing = items.find((i) => i.id === ri.matchedItemId);
        if (!existing) continue;

        if (existing.tracking_mode === "counted") {
          const newQty = (existing.quantity || 0) + ri.quantity;
          await onUpdate(ri.matchedItemId, {
            quantity: newQty,
            last_touched_at: now,
          });
          await logItemChange(
            existing,
            "restocked",
            "voice",
            { quantity_change: ri.quantity, quantity_after: newQty },
            sessionId
          );
        } else {
          const newState =
            existing.tracking_mode === "status" ? "plenty" : "full";
          await onUpdate(ri.matchedItemId, {
            state: newState,
            last_touched_at: now,
          });
          await logItemChange(
            existing,
            "restocked",
            "voice",
            { state_before: existing.state || "", state_after: newState },
            sessionId
          );
        }
      } else {
        const settings = getSettings();
        const newItem = await onAdd({
          name: ri.name,
          tracking_mode: ri.trackingMode || settings.default_tracking_mode,
          quantity:
            ri.trackingMode === "counted" || !ri.trackingMode
              ? ri.quantity
              : null,
          unit: ri.unit || "pcs",
          threshold: settings.default_threshold,
          state:
            ri.trackingMode === "status"
              ? "plenty"
              : ri.trackingMode === "bag"
                ? "full"
                : null,
          location_id: ri.locationId || null,
          category_id: null,
          barcode: null,
          notes: null,
          expires_on: null,
        });

        if (newItem && typeof newItem === "object" && "id" in newItem) {
          await logActivity({
            item_id: (newItem as { id: string }).id,
            item_name_snapshot: ri.name,
            action: "created",
            source: "voice",
            session_id: sessionId,
          });
        }
      }
    }

    toast.success(`Restocked ${restockItems.length} items!`);
    setRestockItems([]);
    setShowVoice(true);
    setSaving(false);
    onRefresh();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Voice Restock
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(90vh-140px)] px-4 py-4">
          {showVoice && (
            <VoiceInput
              onResult={handleVoiceResult}
              onClose={() => onOpenChange(false)}
              label='"I bought tomatoes, milk, bread, two onions, a bag of rice"'
            />
          )}

          {!showVoice && restockItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Review and confirm your restock:
              </p>
              {restockItems.map((ri, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border space-y-2",
                    ri.isNew ? "border-blue-200 bg-blue-50/50" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{ri.name}</span>
                      {ri.isNew ? (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs text-emerald-600 border-emerald-200"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Matched
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeItem(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={ri.quantity}
                      onChange={(e) =>
                        updateRestockItem(index, {
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-20"
                    />
                    {ri.isNew && (
                      <Select
                        value={ri.locationId || "none"}
                        onValueChange={(v: string | null) =>
                          updateRestockItem(index, {
                            locationId: !v || v === "none" ? undefined : v,
                          })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No location</SelectItem>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowVoice(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add more by voice
              </Button>
            </div>
          )}
        </ScrollArea>

        {!showVoice && restockItems.length > 0 && (
          <div className="p-4 border-t">
            <Button
              className="w-full tap-target"
              disabled={saving}
              onClick={save}
            >
              {saving
                ? "Saving..."
                : `Restock ${restockItems.length} Items`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
