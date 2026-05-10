# Kitchen Inventory Tracker

A mobile-first PWA for tracking everything in your kitchen. Built for daily one-handed use on a phone.

## Quick Start

### 1. Clone and install

```bash
cd kitchen-inventory
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Authentication > Providers** and make sure **Email** is enabled
4. Copy your project URL and anon key from **Settings > API**

### 3. Configure environment

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Deploy to Vercel

```bash
npx vercel
```

Add the same two environment variables in the Vercel dashboard.

## Features

### Three tracking modes per item

- **Counted** -- exact quantities with +/- buttons. Best for cans, jars, packages.
- **Status** -- Plenty / Low / Out cycle. Best for spices, condiments, oils.
- **Bag** -- Full / Half / Low / Empty. Best for bulk staples like flour, rice, sugar.

### Entry methods

- **Type** -- manual form with all fields
- **Scan** -- barcode scanner using device camera, auto-looks up product name via OpenFoodFacts
- **Voice** -- speak items naturally ("2 cans of black beans in pantry")

### Daily workflows

- **Cooking session** -- "I cooked something" button opens fast multi-select; log everything used in one save
- **Voice batch restock** -- after a grocery trip, speak everything you bought; smart-matches against existing items
- **Quick check** -- weekly swipe-through of all items to resync reality with the app
- **Drift detection** -- items untouched for 60+ days that claim to be well-stocked get a "still accurate?" prompt

### Everything else

- Search and filter across 100+ items
- Per-item thresholds (1 jar of cumin is fine; 1 roll of paper towels is not)
- Full CRUD on locations, categories, units
- Activity log with cooking sessions grouped
- CSV export
- PWA installable on iOS and Android
- Opt-in browser push notifications for low-stock alerts
- Row-level security -- all data is private to the signed-in user

## Creative Decisions

### Visual design

Warm terracotta and amber palette inspired by kitchen ceramics and spice jars. The primary color is a rich burnt orange, backgrounds are a subtle warm cream, and the overall feel is inviting without being childish. Cards use rounded corners and gentle shadows. Low-stock items get an amber border rather than alarming red -- she'll see it often, so it should be informative, not stressful.

### Micro-interactions

- Quantity +/- buttons scale down briefly on tap for tactile feedback
- Long-press on +/- triggers a +-5 bulk adjustment
- When quantity hits 0, a toast confirms the item is out of stock
- Cooking session save shows a success toast with count of items updated
- Bulk add shows each item appear in a success list with a slide-in animation

### Onboarding

First sign-in seeds default locations (Pantry, Fridge, Freezer, Spice Rack, Other) and categories (Grains, Spices, Canned, Dairy, Produce, Snacks, Baking, Other). The empty home screen shows an encouraging message with clear CTAs to add the first item or use bulk add mode. No tutorial wizard -- the UI is simple enough to be self-evident.

### Bulk add ergonomics

The bulk add flow keeps focus in the input field after each add, shows the location and category selectors at the top so they persist across items, and confirms each addition with a green checkmark list that grows as you go. Designed for a single 10-minute session to seed 100+ items.

### Activity log

Cooking sessions are visually grouped with a chef hat icon. Individual changes show colored action badges. Timestamps are human-readable. Delete is available but requires confirmation.

### Settings organization

Grouped into clear sections: Locations, Categories, Preferences, Notifications, Data, Account. Inline editing for location/category names. Color picker for categories. Destructive actions (delete) require confirmation dialogs.

### Edge cases handled

- Items with no barcode: barcode field is always optional, scanning is just one entry path
- Items with no quantity (just "have/don't have"): use Status mode with Plenty/Out
- Fractional quantities: numeric inputs accept decimals
- Non-food items: barcode scan gracefully falls back when OpenFoodFacts has no match
- Items to track but not alert on: set threshold to 0 for counted items
- Voice parsing failures: transcript dumps into the name field for manual cleanup
- Offline: PWA caches last state for read; writes require connection

## Project Structure

```
src/
  app/
    (app)/             # Authenticated app shell with bottom nav
      page.tsx         # Home -- low stock, cooking, quick check
      inventory/       # Full inventory with search/filter
      activity/        # Activity log
      settings/        # Locations, categories, preferences
    auth/callback/     # Supabase OAuth callback
    login/             # Sign in / sign up
  components/
    item-card.tsx      # Main item card with tracking-mode-aware controls
    item-form.tsx      # Full create/edit form
    item-state-badge   # Status and Bag visual indicators
    add-item-sheet     # FAB -> scan/speak/type entry
    cooking-session    # Multi-select cooking flow
    quick-check        # Weekly swipe-through
    voice-restock      # Post-grocery-trip voice batch
    bulk-add           # Rapid seeding mode
    barcode-scanner    # Camera barcode reader
    voice-input        # Speech recognition
  hooks/
    use-items.ts       # Items CRUD with Supabase
    use-locations.ts   # Locations CRUD
    use-categories.ts  # Categories CRUD
  lib/
    types.ts           # All TypeScript types and utility functions
    activity.ts        # Activity log writer (single path for all sources)
    settings.ts        # localStorage-backed user preferences
    seed.ts            # First-sign-in default data
    supabase/          # Supabase client (browser + server + middleware)
supabase/
  schema.sql           # Full database schema with RLS
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Hosting | Vercel (Hobby tier, free) |
| Database + Auth | Supabase (Free tier) |
| Styling | Tailwind CSS v4 + shadcn/ui v4 |
| Barcode | html5-qrcode |
| Product lookup | OpenFoodFacts API |
| Voice | Web Speech API |
| PWA | @ducanh2912/next-pwa |
| Forms | React Hook Form + Zod |
| Icons | lucide-react |

## v2 Foundation

The `activity_log` table already captures timestamps, source attribution, session grouping, and state transitions -- everything needed for the v2 Insights Dashboard. The activity writer is a single utility function (`lib/activity.ts`) so all event sources go through one path. Dashboard route can be added at `app/dashboard/` without refactoring.
