"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useLocations } from "@/hooks/use-locations";
import { useCategories } from "@/hooks/use-categories";
import { useItems } from "@/hooks/use-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Download,
  LogOut,
  MapPin,
  Tag,
  Settings2,
  Bell,
} from "lucide-react";
import { getSettings, saveSettings } from "@/lib/settings";
import type { UserSettings, TrackingMode } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { locations, create: createLocation, update: updateLocation, remove: removeLocation } = useLocations();
  const { categories, create: createCategory, update: updateCategory, remove: removeCategory } = useCategories();
  const { items } = useItems();
  const [settings, setSettings] = useState<UserSettings>(getSettings());

  const [newLocationName, setNewLocationName] = useState("");
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingLocationName, setEditingLocationName] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#94a3b8");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  function updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) {
    const updated = saveSettings({ [key]: value });
    if (updated) setSettings(updated);
  }

  async function handleAddLocation() {
    if (!newLocationName.trim()) return;
    await createLocation(newLocationName.trim());
    setNewLocationName("");
  }

  async function handleSaveLocation(id: string) {
    if (!editingLocationName.trim()) return;
    await updateLocation(id, { name: editingLocationName.trim() });
    setEditingLocationId(null);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    await createCategory(newCategoryName.trim(), newCategoryColor);
    setNewCategoryName("");
  }

  async function handleSaveCategory(id: string) {
    if (!editingCategoryName.trim()) return;
    await updateCategory(id, { name: editingCategoryName.trim() });
    setEditingCategoryId(null);
  }

  function exportCSV() {
    const headers = [
      "Name",
      "Tracking Mode",
      "Quantity",
      "Unit",
      "Threshold",
      "State",
      "Location",
      "Category",
      "Barcode",
      "Notes",
      "Expires On",
      "Last Updated",
    ];

    const rows = items.map((item) => [
      item.name,
      item.tracking_mode,
      item.quantity ?? "",
      item.unit,
      item.threshold ?? "",
      item.state ?? "",
      (item as unknown as { location?: { name: string } }).location?.name ?? "",
      (item as unknown as { category?: { name: string } }).category?.name ?? "",
      item.barcode ?? "",
      item.notes ?? "",
      item.expires_on ?? "",
      item.updated_at,
    ]);

    const csv =
      [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kitchen-inventory-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV!");
  }

  return (
    <ScrollArea className="h-[calc(100vh-64px)]">
      <div className="p-4 space-y-8 pb-8">
        <h1 className="text-xl font-bold">Settings</h1>

        {/* Locations */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            Locations
          </h2>
          <div className="space-y-1">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center gap-2 p-2 rounded-lg border"
              >
                {editingLocationId === loc.id ? (
                  <>
                    <Input
                      value={editingLocationName}
                      onChange={(e) => setEditingLocationName(e.target.value)}
                      className="h-8 flex-1"
                      autoFocus
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveLocation(loc.id)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSaveLocation(loc.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingLocationId(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{loc.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingLocationId(loc.id);
                        setEditingLocationName(loc.name);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={<Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>}
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete &quot;{loc.name}&quot;?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Items in this location will become unassigned.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeLocation(loc.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddLocation();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="New location"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              className="h-9 flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newLocationName.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </section>

        <Separator />

        {/* Categories */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Tag className="w-4 h-4" />
            Categories
          </h2>
          <div className="space-y-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 p-2 rounded-lg border"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || "#94a3b8" }}
                />
                {editingCategoryId === cat.id ? (
                  <>
                    <Input
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="h-8 flex-1"
                      autoFocus
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveCategory(cat.id)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSaveCategory(cat.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingCategoryId(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{cat.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingCategoryId(cat.id);
                        setEditingCategoryName(cat.name);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={<Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>}
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete &quot;{cat.name}&quot;?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Items in this category will become uncategorized.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeCategory(cat.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddCategory();
            }}
            className="flex gap-2"
          >
            <input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              className="w-9 h-9 rounded border cursor-pointer"
            />
            <Input
              placeholder="New category"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="h-9 flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newCategoryName.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </section>

        <Separator />

        {/* Preferences */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            Preferences
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Default tracking mode</Label>
              <Select
                value={settings.default_tracking_mode}
                onValueChange={(v: string | null) =>
                  updateSetting("default_tracking_mode", (v ?? "status") as TrackingMode)
                }
              >
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="counted">Counted</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="bag">Bag</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Default threshold</Label>
              <Input
                type="number"
                min="0"
                value={settings.default_threshold}
                onChange={(e) =>
                  updateSetting(
                    "default_threshold",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Quick check every (days)</Label>
              <Input
                type="number"
                min="1"
                value={settings.quick_check_cadence_days}
                onChange={(e) =>
                  updateSetting(
                    "quick_check_cadence_days",
                    parseInt(e.target.value) || 7
                  )
                }
                className="w-20 h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Drift threshold (days)</Label>
              <Input
                type="number"
                min="7"
                value={settings.drift_threshold_days}
                onChange={(e) =>
                  updateSetting(
                    "drift_threshold_days",
                    parseInt(e.target.value) || 60
                  )
                }
                className="w-20 h-9 text-xs"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Notifications */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Bell className="w-4 h-4" />
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Low-stock alerts</Label>
              <p className="text-xs text-muted-foreground">
                Daily push notification for low-stock items
              </p>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={async (checked) => {
                if (checked && "Notification" in window) {
                  const permission = await Notification.requestPermission();
                  if (permission !== "granted") {
                    toast.error(
                      "Please allow notifications in your browser settings"
                    );
                    return;
                  }
                }
                updateSetting("notifications_enabled", checked);
              }}
            />
          </div>
        </section>

        <Separator />

        {/* Data */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Data</h2>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={exportCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Inventory to CSV
          </Button>
        </section>

        <Separator />

        {/* Account */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Account
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </section>
      </div>
    </ScrollArea>
  );
}
