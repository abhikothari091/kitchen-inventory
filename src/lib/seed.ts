import { createClient } from "@/lib/supabase/client";

const DEFAULT_LOCATIONS = [
  { name: "Pantry", icon: "warehouse", sort_order: 0 },
  { name: "Fridge", icon: "refrigerator", sort_order: 1 },
  { name: "Freezer", icon: "snowflake", sort_order: 2 },
  { name: "Spice Rack", icon: "flame", sort_order: 3 },
  { name: "Other", icon: "box", sort_order: 4 },
];

const DEFAULT_CATEGORIES = [
  { name: "Grains", color: "#d4a574", sort_order: 0 },
  { name: "Spices", color: "#c2410c", sort_order: 1 },
  { name: "Canned", color: "#78716c", sort_order: 2 },
  { name: "Dairy", color: "#fbbf24", sort_order: 3 },
  { name: "Produce", color: "#65a30d", sort_order: 4 },
  { name: "Snacks", color: "#e879f9", sort_order: 5 },
  { name: "Baking", color: "#f5d0a9", sort_order: 6 },
  { name: "Other", color: "#94a3b8", sort_order: 7 },
];

let seeding: Promise<void> | null = null;

export function seedUserData(userId: string) {
  if (!seeding) seeding = doSeed(userId);
  return seeding;
}

async function doSeed(userId: string) {
  const supabase = createClient();

  const { data: existingLocations } = await supabase
    .from("locations")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingLocations && existingLocations.length > 0) return;

  await supabase.from("locations").insert(
    DEFAULT_LOCATIONS.map((loc) => ({ ...loc, user_id: userId }))
  );

  await supabase.from("categories").insert(
    DEFAULT_CATEGORIES.map((cat) => ({ ...cat, user_id: userId }))
  );
}
