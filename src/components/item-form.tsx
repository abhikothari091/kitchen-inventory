"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type {
  Item,
  ItemWithRelations,
  Location,
  Category,
  TrackingMode,
} from "@/lib/types";
import { UNITS, STATUS_CYCLE, BAG_CYCLE } from "@/lib/types";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tracking_mode: z.enum(["counted", "status", "bag"]),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  threshold: z.coerce.number().min(0).optional(),
  state: z.string().optional(),
  location_id: z.string().optional(),
  category_id: z.string().optional(),
  barcode: z.string().optional(),
  notes: z.string().optional(),
  expires_on: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormProps {
  item?: ItemWithRelations | null;
  locations: Location[];
  categories: Category[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onDelete?: () => void;
  loading?: boolean;
  prefill?: Partial<Record<string, unknown>>;
}

export function ItemForm({
  item,
  locations,
  categories,
  onSubmit,
  onDelete,
  loading,
  prefill,
}: ItemFormProps) {
  const settings = getSettings();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema) as never,
    defaultValues: {
      name: (item?.name ?? prefill?.name ?? "") as string,
      tracking_mode:
        (item?.tracking_mode ??
        prefill?.tracking_mode ??
        settings.default_tracking_mode) as "counted" | "status" | "bag",
      quantity: (item?.quantity ?? prefill?.quantity ?? 1) as number,
      unit: (item?.unit ?? prefill?.unit ?? "pcs") as string,
      threshold:
        (item?.threshold ?? prefill?.threshold ?? settings.default_threshold) as number,
      state: (item?.state ?? prefill?.state ?? "plenty") as string,
      location_id: (item?.location_id ?? prefill?.location_id ?? "") as string,
      category_id: (item?.category_id ?? prefill?.category_id ?? "") as string,
      barcode: (item?.barcode ?? prefill?.barcode ?? "") as string,
      notes: (item?.notes ?? prefill?.notes ?? "") as string,
      expires_on: (item?.expires_on ?? prefill?.expires_on ?? "") as string,
    },
  });

  const trackingMode = watch("tracking_mode") as TrackingMode;

  function handleSelectChange(field: keyof ItemFormData) {
    return (v: string | null) => {
      setValue(field, v ?? "");
    };
  }

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as unknown as Record<string, unknown>))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g., Black Beans"
          autoFocus
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tracking Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["counted", "status", "bag"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={cn(
                "p-3 rounded-lg border text-sm font-medium transition-all text-center",
                trackingMode === mode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => {
                setValue("tracking_mode", mode);
                if (mode === "counted") {
                  setValue("state", undefined);
                } else if (mode === "status") {
                  setValue("state", "plenty");
                } else {
                  setValue("state", "full");
                }
              }}
            >
              <div className="font-semibold capitalize">{mode}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {mode === "counted" && "Exact numbers"}
                {mode === "status" && "Plenty / Low / Out"}
                {mode === "bag" && "Full to Empty"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {trackingMode === "counted" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="any"
              {...register("quantity")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Select
              value={watch("unit") ?? "pcs"}
              onValueChange={handleSelectChange("unit")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold">Low at</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              step="any"
              {...register("threshold")}
            />
          </div>
        </div>
      )}

      {trackingMode === "status" && (
        <div className="space-y-2">
          <Label>Current Status</Label>
          <div className="flex gap-2">
            {STATUS_CYCLE.map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all",
                  watch("state") === s
                    ? s === "plenty"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : s === "low"
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-red-400 bg-red-50 text-red-700"
                    : "border-border"
                )}
                onClick={() => setValue("state", s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {trackingMode === "bag" && (
        <div className="space-y-2">
          <Label>Current Level</Label>
          <div className="flex gap-2">
            {BAG_CYCLE.map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all",
                  watch("state") === s
                    ? s === "full"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : s === "half"
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : s === "low"
                          ? "border-orange-400 bg-orange-50 text-orange-700"
                          : "border-red-400 bg-red-50 text-red-700"
                    : "border-border"
                )}
                onClick={() => setValue("state", s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Location</Label>
          <Select
            value={watch("location_id") || "none"}
            onValueChange={(v: string | null) =>
              setValue("location_id", !v || v === "none" ? "" : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={watch("category_id") || "none"}
            onValueChange={(v: string | null) =>
              setValue("category_id", !v || v === "none" ? "" : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="barcode">Barcode (optional)</Label>
        <Input id="barcode" {...register("barcode")} placeholder="Scanned or manual" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expires_on">Expires on (optional)</Label>
        <Input id="expires_on" type="date" {...register("expires_on")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          rows={2}
          placeholder="Any notes about this item..."
        />
      </div>

      <div className="flex gap-2 pt-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            className="tap-target"
          >
            Delete
          </Button>
        )}
        <Button type="submit" className="flex-1 tap-target" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {item ? "Save Changes" : "Add Item"}
        </Button>
      </div>
    </form>
  );
}
