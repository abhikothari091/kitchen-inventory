"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Loader2 } from "lucide-react";
import { logActivity } from "@/lib/activity";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import type { Item, Location, Category, TrackingMode } from "@/lib/types";
import { toast } from "sonner";

interface BulkAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  categories: Category[];
  onAdd: (
    item: Omit<Item, "id" | "user_id" | "created_at" | "updated_at" | "last_touched_at">
  ) => Promise<unknown>;
  onRefresh: () => void;
}

export function BulkAdd({
  open,
  onOpenChange,
  locations,
  categories,
  onAdd,
  onRefresh,
}: BulkAddProps) {
  const [name, setName] = useState("");
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(
    getSettings().default_tracking_mode
  );
  const [locationId, setLocationId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [added, setAdded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  async function addItem() {
    if (!name.trim()) return;
    setSaving(true);
    const settings = getSettings();

    try {
      const newItem = await onAdd({
        name: name.trim(),
        tracking_mode: trackingMode,
        quantity: trackingMode === "counted" ? 1 : null,
        unit: "pcs",
        threshold: trackingMode === "counted" ? settings.default_threshold : null,
        state:
          trackingMode === "status"
            ? "plenty"
            : trackingMode === "bag"
              ? "full"
              : null,
        location_id: locationId || null,
        category_id: categoryId || null,
        barcode: null,
        notes: null,
        expires_on: null,
      });

      if (newItem && typeof newItem === "object" && "id" in newItem) {
        await logActivity({
          item_id: (newItem as { id: string }).id,
          item_name_snapshot: name.trim(),
          action: "created",
          source: "bulk",
        });
      }

      setAdded((prev) => [name.trim(), ...prev]);
      setName("");
      inputRef.current?.focus();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    toast.success(`Added ${added.length} items!`);
    setAdded([]);
    setName("");
    onRefresh();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Bulk Add Items</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Add items quickly, one after another
          </p>
        </SheetHeader>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <Select
              value={trackingMode}
              onValueChange={(v: string | null) => setTrackingMode((v ?? "status") as TrackingMode)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="counted">Counted</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="bag">Bag</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={locationId || "none"}
              onValueChange={(v: string | null) =>
                setLocationId(!v || v === "none" ? "" : v)
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
          </div>

          <Select
            value={categoryId || "none"}
            onValueChange={(v: string | null) =>
              setCategoryId(!v || v === "none" ? "" : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Category (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              placeholder="Item name — press Enter to add"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!name.trim() || saving} size="icon">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>

        <ScrollArea className="h-[calc(90vh-300px)] px-4">
          {added.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Type an item name and press Enter.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Change the location and category above to apply to all new items.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {added.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm animate-in slide-in-from-top-2"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="capitalize">{name}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <Button
            className="w-full tap-target"
            onClick={finish}
            disabled={added.length === 0}
          >
            Done ({added.length} added)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
