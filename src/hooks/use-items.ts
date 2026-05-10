"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { Item, ItemWithRelations, Location, Category } from "@/lib/types";

export function useItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [itemsRes, locationsRes, categoriesRes] = await Promise.all([
      supabase
        .from("items")
        .select("*, location:locations(*), category:categories(*)")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("locations")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order"),
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order"),
    ]);

    if (itemsRes.data) setItems(itemsRes.data as ItemWithRelations[]);
    if (locationsRes.data) setLocations(locationsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function createItem(
    item: Omit<Item, "id" | "user_id" | "created_at" | "updated_at" | "last_touched_at">
  ) {
    if (!user) return null;
    const { data, error } = await supabase
      .from("items")
      .insert({ ...item, user_id: user.id })
      .select("*, location:locations(*), category:categories(*)")
      .single();
    if (error) throw error;
    if (data) {
      setItems((prev) => [...prev, data as ItemWithRelations]);
    }
    return data;
  }

  async function updateItem(id: string, updates: Partial<Item>) {
    const { data, error } = await supabase
      .from("items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, location:locations(*), category:categories(*)")
      .single();
    if (error) throw error;
    if (data) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? (data as ItemWithRelations) : i))
      );
    }
    return data;
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) throw error;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function touchItem(id: string) {
    await supabase
      .from("items")
      .update({ last_touched_at: new Date().toISOString() })
      .eq("id", id);
  }

  return {
    items,
    locations,
    categories,
    loading,
    refresh: fetchAll,
    createItem,
    updateItem,
    deleteItem,
    touchItem,
  };
}
