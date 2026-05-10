"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { Location } from "@/lib/types";

export function useLocations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("locations")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order");
    if (data) setLocations(data);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function create(name: string, icon?: string) {
    if (!user) return;
    const maxOrder = Math.max(0, ...locations.map((l) => l.sort_order));
    const { data } = await supabase
      .from("locations")
      .insert({
        user_id: user.id,
        name,
        icon: icon || null,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();
    if (data) setLocations((prev) => [...prev, data]);
    return data;
  }

  async function update(id: string, updates: Partial<Location>) {
    const { data } = await supabase
      .from("locations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (data)
      setLocations((prev) => prev.map((l) => (l.id === id ? data : l)));
    return data;
  }

  async function remove(id: string) {
    await supabase.from("locations").delete().eq("id", id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }

  return { locations, loading, refresh: fetch, create, update, remove };
}
