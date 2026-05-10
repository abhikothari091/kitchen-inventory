"use client";

import { useState, useMemo } from "react";
import { useItems } from "@/hooks/use-items";
import { useAuth } from "@/components/auth-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ItemForm } from "@/components/item-form";
import { ItemCard } from "@/components/item-card";
import { AddItemSheet } from "@/components/add-item-sheet";
import { CookingSession } from "@/components/cooking-session";
import { QuickCheck } from "@/components/quick-check";
import { VoiceRestock } from "@/components/voice-restock";
import { BulkAdd } from "@/components/bulk-add";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ChefHat,
  ClipboardCheck,
  ShoppingBag,
  Layers,
  AlertCircle,
  MapPin,
} from "lucide-react";
import {
  isLowStock,
  getLowStockSeverity,
  type ItemWithRelations,
  type Item,
} from "@/lib/types";
import { isQuickCheckDue, getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { user } = useAuth();
  const {
    items,
    locations,
    categories,
    loading,
    refresh,
    createItem,
    updateItem,
    deleteItem,
  } = useItems();

  const [showAdd, setShowAdd] = useState(false);
  const [showCooking, setShowCooking] = useState(false);
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editItem, setEditItem] = useState<ItemWithRelations | null>(null);

  const lowStockItems = useMemo(
    () =>
      items
        .filter(isLowStock)
        .sort((a, b) => getLowStockSeverity(b) - getLowStockSeverity(a)),
    [items]
  );

  const driftItems = useMemo(() => {
    const settings = getSettings();
    const threshold = settings.drift_threshold_days * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      const age = Date.now() - new Date(item.last_touched_at).getTime();
      if (age < threshold) return false;
      if (item.tracking_mode === "counted") {
        return (
          item.quantity !== null &&
          item.threshold !== null &&
          item.quantity > item.threshold
        );
      }
      if (item.tracking_mode === "status") {
        return item.state === "plenty";
      }
      if (item.tracking_mode === "bag") {
        return item.state === "full" || item.state === "half";
      }
      return false;
    });
  }, [items]);

  const locationSummary = useMemo(() => {
    const map = new Map<string, { name: string; total: number; low: number }>();
    for (const item of items) {
      const locName = item.location?.name || "Unassigned";
      const locId = item.location_id || "none";
      const entry = map.get(locId) || { name: locName, total: 0, low: 0 };
      entry.total++;
      if (isLowStock(item)) entry.low++;
      map.set(locId, entry);
    }
    return Array.from(map.values());
  }, [items]);

  const quickCheckDue = isQuickCheckDue();

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Kitchen Inventory</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} items tracked
          {lowStockItems.length > 0 && (
            <span className="text-amber-600 ml-1">
              &middot; {lowStockItems.length} running low
            </span>
          )}
        </p>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Welcome to your kitchen!</h2>
            <p className="text-muted-foreground mt-1">
              Start by adding your first items — scan a barcode, speak, or type.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            <Button variant="outline" onClick={() => setShowBulkAdd(true)}>
              <Layers className="w-4 h-4 mr-2" />
              Bulk Add
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-14 flex items-center gap-2 text-sm"
              onClick={() => setShowCooking(true)}
            >
              <ChefHat className="w-5 h-5 text-primary" />
              I cooked something
            </Button>
            <Button
              variant="outline"
              className="h-14 flex items-center gap-2 text-sm"
              onClick={() => setShowRestock(true)}
            >
              <ShoppingBag className="w-5 h-5 text-primary" />
              Voice Restock
            </Button>
          </div>

          {/* Quick check prompt */}
          {quickCheckDue && (
            <button
              onClick={() => setShowQuickCheck(true)}
              className="w-full p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-left transition-colors hover:bg-blue-50"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 text-sm">
                    Quick check (2 min)
                  </p>
                  <p className="text-xs text-blue-600">
                    Fly through your items and confirm what&apos;s accurate
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Low stock section */}
          {lowStockItems.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Running Low
                <Badge variant="secondary" className="ml-1">
                  {lowStockItems.length}
                </Badge>
              </h2>
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onUpdate={updateItem}
                    onTap={setEditItem}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Drift detection */}
          {driftItems.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Haven&apos;t checked in a while
              </h2>
              <div className="space-y-1">
                {driftItems.slice(0, 5).map((item) => {
                  const days = Math.floor(
                    (Date.now() -
                      new Date(item.last_touched_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <button
                      key={item.id}
                      className="w-full text-left p-3 rounded-lg border border-dashed border-muted-foreground/20 hover:bg-muted/50 transition-colors"
                      onClick={() => setEditItem(item)}
                    >
                      <p className="text-sm">
                        Still have{" "}
                        <span className="font-medium">{item.name}</span>?
                        <span className="text-muted-foreground ml-1">
                          Last updated {days} days ago
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Location summary */}
          {locationSummary.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                By Location
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {locationSummary.map((loc) => (
                  <div
                    key={loc.name}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{loc.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {loc.total} items
                      {loc.low > 0 && (
                        <span className="text-amber-600">
                          {" "}
                          &middot; {loc.low} low
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-all active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Sheets */}
      <AddItemSheet
        open={showAdd}
        onOpenChange={setShowAdd}
        locations={locations}
        categories={categories}
        onAdd={createItem}
      />

      <CookingSession
        open={showCooking}
        onOpenChange={setShowCooking}
        items={items}
        onUpdate={updateItem}
      />

      <QuickCheck
        open={showQuickCheck}
        onOpenChange={setShowQuickCheck}
        items={items}
        onUpdate={updateItem}
        onRefresh={refresh}
      />

      <VoiceRestock
        open={showRestock}
        onOpenChange={setShowRestock}
        items={items}
        locations={locations}
        categories={categories}
        onUpdate={updateItem}
        onAdd={createItem}
        onRefresh={refresh}
      />

      <BulkAdd
        open={showBulkAdd}
        onOpenChange={setShowBulkAdd}
        locations={locations}
        categories={categories}
        onAdd={createItem}
        onRefresh={refresh}
      />

      {/* Edit item sheet */}
      {editItem && (
        <Sheet open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Edit {editItem.name}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(90vh-80px)] py-4">
              <ItemForm
                item={editItem}
                locations={locations}
                categories={categories}
                onSubmit={async (data) => {
                  const d = data as Record<string, string | number | null | undefined>;
                  await updateItem(editItem.id, {
                    name: String(d.name),
                    tracking_mode: String(d.tracking_mode) as Item["tracking_mode"],
                    quantity: d.tracking_mode === "counted" ? Number(d.quantity ?? 0) : null,
                    unit: String(d.unit ?? "pcs"),
                    threshold: d.tracking_mode === "counted" ? Number(d.threshold ?? 1) : null,
                    state: d.tracking_mode !== "counted" ? (String(d.state ?? "") || null) as Item["state"] : null,
                    location_id: (d.location_id as string) || null,
                    category_id: (d.category_id as string) || null,
                    barcode: (d.barcode as string) || null,
                    notes: (d.notes as string) || null,
                    expires_on: (d.expires_on as string) || null,
                  });
                  setEditItem(null);
                }}
                onDelete={async () => {
                  await deleteItem(editItem.id);
                  setEditItem(null);
                }}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
