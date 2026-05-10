"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { Category } from "@/lib/types";

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order");
    if (data) setCategories(data);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function create(name: string, color?: string) {
    if (!user) return;
    const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order));
    const { data } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name,
        color: color || null,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();
    if (data) setCategories((prev) => [...prev, data]);
    return data;
  }

  async function update(id: string, updates: Partial<Category>) {
    const { data } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (data)
      setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  }

  async function remove(id: string) {
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return { categories, loading, refresh: fetch, create, update, remove };
}
