"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusState, BagState, TrackingMode } from "@/lib/types";

interface StatusBadgeProps {
  state: StatusState;
  onClick?: () => void;
  className?: string;
}

const STATUS_STYLES: Record<StatusState, string> = {
  plenty: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200",
  low: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200",
  out: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200",
};

const STATUS_LABELS: Record<StatusState, string> = {
  plenty: "Plenty",
  low: "Low",
  out: "Out",
};

export function StatusBadge({ state, onClick, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "tap-target px-3 py-1 text-sm font-medium cursor-pointer transition-all select-none active:scale-95",
        STATUS_STYLES[state],
        className
      )}
      onClick={onClick}
    >
      {STATUS_LABELS[state]}
    </Badge>
  );
}

interface BagIndicatorProps {
  state: BagState;
  onClick?: () => void;
  className?: string;
}

const BAG_FILL: Record<BagState, number> = {
  full: 100,
  half: 50,
  low: 20,
  empty: 0,
};

const BAG_COLORS: Record<BagState, string> = {
  full: "bg-emerald-400",
  half: "bg-amber-400",
  low: "bg-orange-400",
  empty: "bg-red-300",
};

const BAG_LABELS: Record<BagState, string> = {
  full: "Full",
  half: "Half",
  low: "Low",
  empty: "Empty",
};

export function BagIndicator({ state, onClick, className }: BagIndicatorProps) {
  const fill = BAG_FILL[state];
  return (
    <button
      onClick={onClick}
      className={cn(
        "tap-target flex items-center gap-2 px-3 py-1 rounded-full border transition-all select-none active:scale-95",
        state === "low" || state === "empty"
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50",
        className
      )}
    >
      <div className="w-5 h-8 rounded-sm border border-current/20 overflow-hidden flex flex-col justify-end bg-white/50">
        <div
          className={cn("transition-all duration-300 rounded-b-xs", BAG_COLORS[state])}
          style={{ height: `${fill}%` }}
        />
      </div>
      <span className="text-sm font-medium">{BAG_LABELS[state]}</span>
    </button>
  );
}

interface TrackingModeLabelProps {
  mode: TrackingMode;
  className?: string;
}

export function TrackingModeLabel({ mode, className }: TrackingModeLabelProps) {
  const labels: Record<TrackingMode, string> = {
    counted: "Counted",
    status: "Status",
    bag: "Bag",
  };
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {labels[mode]}
    </span>
  );
}
