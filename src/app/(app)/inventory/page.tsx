"use client";

import { useState, useMemo } from "react";
import { useItems } from "@/hooks/use-items";
import { ItemCard } from "@/components/item-card";
import { ItemForm } from "@/components/item-form";
import { AddItemSheet } from "@/components/add-item-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, Plus, Package } from "lucide-react";
import {
  isLowStock,
  getLowStockSeverity,
  type ItemWithRelations,
  type Item,
  type TrackingMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type SortOption = "severity" | "name" | "updated";

export default function InventoryPage() {
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

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("severity");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ItemWithRelations | null>(null);

  const filtered = useMemo(() => {
    let result = items;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.location?.name.toLowerCase().includes(q) ||
          i.category?.name.toLowerCase().includes(q) ||
          i.barcode?.includes(q)
      );
    }

    if (locationFilter !== "all") {
      result = result.filter((i) => i.location_id === locationFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category_id === categoryFilter);
    }

    if (modeFilter !== "all") {
      result = result.filter((i) => i.tracking_mode === modeFilter);
    }

    if (lowStockOnly) {
      result = result.filter(isLowStock);
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "severity":
          return getLowStockSeverity(b) - getLowStockSeverity(a);
        case "name":
          return a.name.localeCompare(b.name);
        case "updated":
          return (
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
          );
        default:
          return 0;
      }
    });

    return result;
  }, [items, search, locationFilter, categoryFilter, modeFilter, lowStockOnly, sort]);

  const activeFilters =
    (locationFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (modeFilter !== "all" ? 1 : 0) +
    (lowStockOnly ? 1 : 0);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Sticky search */}
      <div className="sticky top-0 z-10 bg-background p-4 pb-2 space-y-2">
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
            className="relative"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
            <Select value={locationFilter} onValueChange={(v: string | null) => setLocationFilter(v ?? "all")}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v: string | null) => setCategoryFilter(v ?? "all")}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modeFilter} onValueChange={(v: string | null) => setModeFilter(v ?? "all")}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="counted">Counted</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="bag">Bag</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v: string | null) => setSort((v ?? "severity") as SortOption)}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="severity">Low stock first</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={lowStockOnly ? "default" : "outline"}
              className="col-span-2 h-9 text-xs"
              onClick={() => setLowStockOnly(!lowStockOnly)}
            >
              {lowStockOnly ? "Showing low stock only" : "Show low stock only"}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {filtered.length} of {items.length} items
        </p>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1 px-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {items.length === 0
                ? "No items yet — tap + to add your first item"
                : "No items match your search"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onTap={setEditItem}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-all active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddItemSheet
        open={showAdd}
        onOpenChange={setShowAdd}
        locations={locations}
        categories={categories}
        onAdd={createItem}
      />

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
