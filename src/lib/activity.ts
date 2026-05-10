import { createClient } from "@/lib/supabase/client";
import type { ActivityAction, ActivitySource, Item } from "@/lib/types";

interface LogActivityParams {
  item_id: string;
  item_name_snapshot: string;
  action: ActivityAction;
  quantity_change?: number | null;
  quantity_after?: number | null;
  state_before?: string | null;
  state_after?: string | null;
  source: ActivitySource;
  session_id?: string | null;
}

export async function logActivity(params: LogActivityParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  return supabase.from("activity_log").insert({
    user_id: user.id,
    item_id: params.item_id,
    item_name_snapshot: params.item_name_snapshot,
    action: params.action,
    quantity_change: params.quantity_change ?? null,
    quantity_after: params.quantity_after ?? null,
    state_before: params.state_before ?? null,
    state_after: params.state_after ?? null,
    source: params.source,
    session_id: params.session_id ?? null,
  });
}

export async function logItemChange(
  item: Item,
  action: ActivityAction,
  source: ActivitySource,
  changes: {
    quantity_change?: number;
    quantity_after?: number;
    state_before?: string;
    state_after?: string;
  },
  session_id?: string
) {
  return logActivity({
    item_id: item.id,
    item_name_snapshot: item.name,
    action,
    quantity_change: changes.quantity_change,
    quantity_after: changes.quantity_after,
    state_before: changes.state_before,
    state_after: changes.state_after,
    source,
    session_id,
  });
}
