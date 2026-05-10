export type TrackingMode = "counted" | "status" | "bag";
export type StatusState = "plenty" | "low" | "out";
export type BagState = "full" | "half" | "low" | "empty";
export type ItemState = StatusState | BagState;

export type ActivityAction =
  | "added"
  | "used"
  | "adjusted"
  | "state_changed"
  | "created"
  | "deleted"
  | "restocked";

export type ActivitySource =
  | "manual"
  | "voice"
  | "barcode"
  | "cooking_session"
  | "quick_check"
  | "bulk"
  | "drift_check";

export interface Item {
  id: string;
  user_id: string;
  name: string;
  tracking_mode: TrackingMode;
  quantity: number | null;
  unit: string;
  threshold: number | null;
  state: ItemState | null;
  location_id: string | null;
  category_id: string | null;
  barcode: string | null;
  notes: string | null;
  expires_on: string | null;
  last_touched_at: string;
  created_at: string;
  updated_at: string;
}

export interface ItemWithRelations extends Item {
  location?: Location | null;
  category?: Category | null;
}

export interface Location {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  sort_order: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  item_id: string | null;
  item_name_snapshot: string;
  action: ActivityAction;
  quantity_change: number | null;
  quantity_after: number | null;
  state_before: string | null;
  state_after: string | null;
  source: ActivitySource;
  session_id: string | null;
  created_at: string;
}

export interface UserSettings {
  default_tracking_mode: TrackingMode;
  default_threshold: number;
  quick_check_cadence_days: number;
  drift_threshold_days: number;
  notifications_enabled: boolean;
  last_quick_check: string | null;
}

export const DEFAULT_SETTINGS: UserSettings = {
  default_tracking_mode: "status",
  default_threshold: 1,
  quick_check_cadence_days: 7,
  drift_threshold_days: 60,
  notifications_enabled: false,
  last_quick_check: null,
};

export const UNITS = [
  "pcs",
  "g",
  "kg",
  "ml",
  "l",
  "oz",
  "lb",
  "cans",
  "jars",
  "bags",
  "boxes",
  "bottles",
  "packs",
  "rolls",
  "cups",
  "tbsp",
  "tsp",
] as const;

export const STATUS_CYCLE: StatusState[] = ["plenty", "low", "out"];
export const BAG_CYCLE: BagState[] = ["full", "half", "low", "empty"];

export function getNextState<T extends string>(
  current: T,
  cycle: T[]
): T {
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

export function isLowStock(item: Item): boolean {
  switch (item.tracking_mode) {
    case "counted":
      return (
        item.quantity !== null &&
        item.threshold !== null &&
        item.quantity <= item.threshold
      );
    case "status":
      return item.state === "low" || item.state === "out";
    case "bag":
      return item.state === "low" || item.state === "empty";
    default:
      return false;
  }
}

export function getLowStockSeverity(item: Item): number {
  switch (item.tracking_mode) {
    case "counted":
      if (item.quantity === null || item.threshold === null) return 0;
      if (item.quantity <= 0) return 100;
      return Math.max(0, 100 - (item.quantity / item.threshold) * 100);
    case "status":
      if (item.state === "out") return 100;
      if (item.state === "low") return 60;
      return 0;
    case "bag":
      if (item.state === "empty") return 100;
      if (item.state === "low") return 60;
      if (item.state === "half") return 30;
      return 0;
    default:
      return 0;
  }
}
