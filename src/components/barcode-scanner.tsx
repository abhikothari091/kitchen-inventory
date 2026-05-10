"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, RotateCcw, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string, productName?: string) => void;
  onClose: () => void;
}

function isValidBarcode(text: string): boolean {
  const cleaned = text.replace(/[\s-]/g, "");
  return /^\d{8,14}$/.test(cleaned);
}

async function lookupProduct(barcode: string): Promise<string | null> {
  const cleaned = barcode.replace(/[\s-]/g, "");

  // Try Open Food Facts (good intl coverage including Indian products)
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${cleaned}.json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        return (
          p.product_name_en ||
          p.product_name ||
          p.generic_name_en ||
          p.generic_name ||
          null
        );
      }
    }
  } catch {
    // continue to next source
  }

  // Try Open Food Facts India specifically for 890-prefix barcodes
  if (cleaned.startsWith("890")) {
    try {
      const res = await fetch(
        `https://in.openfoodfacts.org/api/v2/product/${cleaned}.json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          return (
            p.product_name_en ||
            p.product_name ||
            p.generic_name_en ||
            p.generic_name ||
            null
          );
        }
      }
    } catch {
      // continue
    }
  }

  // Try UPC ItemDB (good US coverage)
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${cleaned}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].title || null;
      }
    }
  } catch {
    // all lookups failed
  }

  return null;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const processedRef = useRef(false);

  const handleDecode = useCallback(async (decodedText: string) => {
    if (processedRef.current) return;

    // Ignore URLs (QR codes with links)
    if (decodedText.startsWith("http") || decodedText.includes("://")) {
      return;
    }

    if (!isValidBarcode(decodedText)) {
      return;
    }

    processedRef.current = true;
    const scanner = scannerRef.current;
    if (scanner) {
      try { await scanner.stop(); } catch { /* ok */ }
    }

    setLooking(true);
    const cleaned = decodedText.replace(/[\s-]/g, "");
    const productName = await lookupProduct(cleaned);

    if (productName) {
      onScanRef.current(cleaned, productName);
    } else {
      setLooking(false);
      setNotFound(cleaned);
    }
  }, []);

  useEffect(() => {
    if (manualEntry) return;

    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;
    processedRef.current = false;
    let running = false;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        handleDecode,
        () => {}
      )
      .then(() => {
        running = true;
      })
      .catch(() => {
        setError(
          "Camera access denied. Please allow camera access and try again."
        );
      });

    return () => {
      if (running) {
        scanner.stop().catch(() => {});
      }
    };
  }, [handleDecode, manualEntry]);

  function handleRetry() {
    setNotFound(null);
    setLooking(false);
    processedRef.current = false;
  }

  function handleUseAnyway(barcode: string) {
    onScanRef.current(barcode);
  }

  async function handleManualSubmit() {
    const cleaned = manualBarcode.replace(/[\s-]/g, "");
    if (!cleaned) return;

    if (!isValidBarcode(cleaned)) {
      setError("Please enter a valid barcode (8-14 digits)");
      return;
    }

    setLooking(true);
    setError(null);
    const productName = await lookupProduct(cleaned);

    if (productName) {
      onScanRef.current(cleaned, productName);
    } else {
      setLooking(false);
      setNotFound(cleaned);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Scan Barcode</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setManualEntry(!manualEntry);
              setError(null);
              setNotFound(null);
            }}
            title="Type barcode manually"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && !notFound ? (
        <p className="text-sm text-destructive text-center py-8">{error}</p>
      ) : looking ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Looking up product...</p>
          <p className="text-xs text-muted-foreground">
            Checking multiple databases...
          </p>
        </div>
      ) : notFound ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-xl">🔍</span>
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-sm">Product not found</p>
            <p className="text-xs text-muted-foreground">
              Barcode <span className="font-mono">{notFound}</span> wasn&apos;t in
              our databases. You can still add it manually.
            </p>
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={handleRetry}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Scan Again
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleUseAnyway(notFound)}
            >
              Add Manually
            </Button>
          </div>
        </div>
      ) : manualEntry ? (
        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Type the barcode number printed below the barcode
          </p>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="e.g., 8901234567890"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            autoFocus
          />
          <Button
            className="w-full"
            onClick={handleManualSubmit}
            disabled={!manualBarcode.trim()}
          >
            Look Up
          </Button>
        </div>
      ) : (
        <>
          <div
            id="barcode-reader"
            className="rounded-lg overflow-hidden"
          />
          <p className="text-xs text-muted-foreground text-center">
            Point your camera at a barcode
          </p>
        </>
      )}
    </div>
  );
}
