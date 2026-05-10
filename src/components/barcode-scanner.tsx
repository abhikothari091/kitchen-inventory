"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string, productName?: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          scanner.stop().catch(() => {});
          setLooking(true);

          try {
            const res = await fetch(
              `https://world.openfoodfacts.org/api/v2/product/${decodedText}.json`
            );
            const data = await res.json();
            if (data.status === 1 && data.product?.product_name) {
              onScan(decodedText, data.product.product_name);
            } else {
              onScan(decodedText);
            }
          } catch {
            onScan(decodedText);
          }
        },
        () => {}
      )
      .catch((err) => {
        setError(
          "Camera access denied. Please allow camera access and try again."
        );
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Scan Barcode</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive text-center py-8">{error}</p>
      ) : looking ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Looking up product...</p>
        </div>
      ) : (
        <>
          <div
            id="barcode-reader"
            ref={containerRef}
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
