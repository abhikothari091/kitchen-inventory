"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScanBarcode, Mic, Keyboard, X, ArrowLeft } from "lucide-react";
import { ItemForm } from "@/components/item-form";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { VoiceInput, parseVoiceItem } from "@/components/voice-input";
import { logActivity } from "@/lib/activity";
import type { Location, Category, Item } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

type Mode = "choose" | "manual" | "barcode" | "voice";

interface AddItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  categories: Category[];
  onAdd: (
    item: Omit<Item, "id" | "user_id" | "created_at" | "updated_at" | "last_touched_at">
  ) => Promise<unknown>;
}

export function AddItemSheet({
  open,
  onOpenChange,
  locations,
  categories,
  onAdd,
}: AddItemSheetProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [prefill, setPrefill] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  function reset() {
    setMode("choose");
    setPrefill({});
  }

  function close() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  async function handleSubmit(data: Record<string, unknown>) {
    setLoading(true);
    try {
      const item = await onAdd({
        name: data.name as string,
        tracking_mode: data.tracking_mode as Item["tracking_mode"],
        quantity:
          data.tracking_mode === "counted"
            ? (data.quantity as number) ?? 0
            : null,
        unit: (data.unit as string) ?? "pcs",
        threshold:
          data.tracking_mode === "counted"
            ? (data.threshold as number) ?? 1
            : null,
        state: (
          data.tracking_mode !== "counted"
            ? ((data.state as string) || (data.tracking_mode === "status" ? "plenty" : "full"))
            : null
        ) as Item["state"],
        location_id: (data.location_id as string) || null,
        category_id: (data.category_id as string) || null,
        barcode: (data.barcode as string) || null,
        notes: (data.notes as string) || null,
        expires_on: (data.expires_on as string) || null,
      });

      if (item && typeof item === "object" && "id" in item) {
        await logActivity({
          item_id: (item as { id: string }).id,
          item_name_snapshot: data.name as string,
          action: "created",
          source: mode === "barcode" ? "barcode" : mode === "voice" ? "voice" : "manual",
        });
      }
      close();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleBarcodeScan(barcode: string, productName?: string) {
    setPrefill({
      name: productName || "",
      barcode,
      tracking_mode: "counted",
    });
    setMode("manual");
  }

  function handleVoiceResult(transcript: string) {
    const parsed = parseVoiceItem(transcript);

    const fuzzyMatch = <T extends { name: string }>(list: T[], query?: string) => {
      if (!query) return undefined;
      const q = query.toLowerCase();
      return (
        list.find((l) => l.name.toLowerCase() === q) ||
        list.find((l) => l.name.toLowerCase().includes(q)) ||
        list.find((l) => q.includes(l.name.toLowerCase()))
      );
    };

    const locationMatch = fuzzyMatch(locations, parsed.location);
    const categoryMatch = fuzzyMatch(categories, parsed.name);

    setPrefill({
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      tracking_mode: parsed.quantity ? "counted" : undefined,
      location_id: locationMatch?.id,
      category_id: categoryMatch?.id,
    });
    setMode("manual");
  }

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            {mode !== "choose" && (
              <Button variant="ghost" size="icon" onClick={reset}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <SheetTitle className="flex-1">
              {mode === "choose" && "Add Item"}
              {mode === "manual" && "New Item"}
              {mode === "barcode" && "Scan Barcode"}
              {mode === "voice" && "Voice Input"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(90vh-80px)] px-4 pb-8">
          {mode === "choose" && (
            <div className="grid gap-3 py-6">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1 text-base"
                onClick={() => setMode("barcode")}
              >
                <ScanBarcode className="w-6 h-6" />
                Scan Barcode
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1 text-base"
                onClick={() => setMode("voice")}
              >
                <Mic className="w-6 h-6" />
                Speak
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1 text-base"
                onClick={() => setMode("manual")}
              >
                <Keyboard className="w-6 h-6" />
                Type
              </Button>
            </div>
          )}

          {mode === "barcode" && (
            <div className="py-4">
              <BarcodeScanner
                onScan={handleBarcodeScan}
                onClose={reset}
              />
            </div>
          )}

          {mode === "voice" && (
            <div className="py-8">
              <VoiceInput
                onResult={handleVoiceResult}
                onClose={reset}
                label='Say something like "2 cans of black beans in pantry"'
              />
            </div>
          )}

          {mode === "manual" && (
            <div className="py-4">
              <ItemForm
                locations={locations}
                categories={categories}
                onSubmit={handleSubmit}
                loading={loading}
                prefill={prefill}
              />
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
