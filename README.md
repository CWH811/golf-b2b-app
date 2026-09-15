# GCore â€” Golf Course Operations Resource Engine

A mobile-first B2B platform for golf course operations. GCore enables field teams to scan products with AI-powered camera recognition, manage orders, and maintain the master catalog â€” all with offline-first resiliency for spotty course Wi-Fi.

## Core Features

### ðŸ“· AI Product Scanner
- Camera-based product identification using **Gemini 2.5 Flash** vision model
- 85% confidence threshold â€” matches below this trigger a manual review state
- Low-light detection and graceful timeout handling for poor network conditions
- Offline scan queue with automatic retry when connectivity returns

### ðŸ›’ Order Management
- Scan-to-cart workflow with Zustand state management
- Secure order submission via Supabase auth
- Admin dashboard for order status tracking (pending â†’ fulfilled â†’ shipped â†’ cancelled)

### ðŸ—‚ï¸ Admin Command Center
- Owner-only protected dashboard at `/admin`
- **Orders tab** â€” view incoming orders with line items and customer email, update statuses inline (also pushes a status tag to GoHighLevel)
- **Catalog Manager** â€” inline product editing (name, price, stock), soft-archive (no hard deletes), CSV/JSON bulk import
- **Fleet tab** â€” manage golf cart status, battery level, odometer, location, and assignment
- **Activity tab** â€” read-only audit trail of catalog/order/fleet changes made through the admin dashboard
- **AI Scanner** â€” live camera scanning with offline queue (auto-retries the moment connectivity returns), manual review for low-confidence matches

### ðŸ“± PWA / Offline-First
- Installable via web manifest with standalone display mode
- Custom service worker with:
  - App shell caching for `/`, `/login`, `/admin`
  - Network-first navigation with offline fallback
  - Stale-while-revalidate for static assets
  - Cart state and scan queue caching for offline resilience
- Online/offline status indicator and install prompt

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| State | Zustand |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI Vision | Google Gemini 2.5 Flash |
| PWA | next-pwa, custom service worker |

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project
- A Google Gemini API key

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables** â€” create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   GEMINI_API_KEY=your-gemini-api-key

   # Admin owner credentials (for /admin access)
   ADMIN_USER_ID=your-supabase-user-id
   ADMIN_EMAIL=your-admin-email@example.com
   ```

3. **Run database migrations** â€” apply the SQL files in `supabase/migrations/` to your Supabase project, in order:
   - `20260725120000_create_golf_cart_fleet_inventory.sql` â€” golf cart fleet tracking
   - `20260802000000_create_core_tables.sql` â€” products, orders, order_items
   - `20260803230000_fix_core_table_schema.sql` â€” schema fixes
   - `20260914203000_secure_rls_policies.sql` â€” owner/admin-scoped RLS lockdown (see `TODO-admin-env.md` for the required post-migration `admin_users` insert)
   - `20260914204000_decrement_stock_rpc.sql` â€” SECURITY DEFINER RPC so order submission can decrement stock under the locked-down RLS
   - `20260914205000_admin_audit_log.sql` â€” admin activity audit log table
   - `20260914205500_add_order_user_email.sql` â€” denormalized `orders.user_email` for admin display and CRM sync

4. **Start the dev server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

### `products`
| Column | Type | Notes |
|--------|------|-------|
| `sku` | text (PK) | Unique product identifier |
| `name` | text | Product name |
| `base_price` | numeric(10,2) | Base price, >= 0 |
| `quantity_on_hand` | integer | Stock level, >= 0 |
| `status` | text | `active` or `archived` (soft-delete) |
| `modified_by` | uuid | Tracks last editor (FK to auth.users) |
| `created_at` / `updated_at` | timestamptz | Auto-managed |

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid | FK to auth.users |
| `user_email` | text | Denormalized copy of the purchaser's email, captured at order time for admin display and CRM sync |
| `status` | text | `pending`, `fulfilled`, `shipped`, `cancelled` |
| `modified_by` | uuid | Tracks last editor |
| `created_at` / `updated_at` | timestamptz | Auto-managed |

### `order_items`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `order_id` | uuid | FK to orders (cascade delete) |
| `sku` | text | FK to products |
| `quantity` | integer | > 0 |
| `price_at_purchase` | numeric(10,2) | Snapshot price at order time |

### `golf_cart_fleet`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `cart_number` | text (unique) | Fleet cart identifier |
| `model` | text | Cart model |
| `status` | text | `available`, `in_use`, `maintenance`, `out_of_service` |
| `battery_level` | integer | 0â€“100 |
| `odometer_miles` | integer | >= 0 |
| `location` | text | Current location |
| `assigned_to` | text | Assigned staff member |
| `last_service_at` / `next_service_at` | timestamptz | Service scheduling |

All tables use **Row Level Security**, and `updated_at` triggers automatically stamp modifications. Reads on `products`/`golf_cart_fleet` are open to any authenticated user; `orders`/`order_items` are scoped to the owning user (`auth.uid() = user_id`); all writes to catalog, order status, and fleet records require membership in the `public.admin_users` table (see `TODO-admin-env.md`).

### `admin_audit_log`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `admin_user_id` / `admin_email` | uuid / text | Who made the change |
| `action` | text | e.g. `update_product`, `archive_product`, `bulk_import_catalog`, `update_order_status`, `update_golf_cart` |
| `entity_type` | text | `product`, `order`, or `golf_cart` |
| `entity_id` | text | SKU, order id, or cart id |
| `details` | jsonb | The fields that changed |
| `created_at` | timestamptz | Auto-managed |

Only admins can read or write `admin_audit_log`; every admin catalog/order/fleet mutation writes an entry here (best-effort — a logging failure never blocks the underlying action), surfaced read-only in the dashboard's **Activity** tab.

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/scan` | POST | AI product identification from image (auth required, rate-limited per user) |
| `/api/order` | POST | Submit order (auth required); decrements product stock via RPC |
| `/api/orders` | GET | Fetch the current user's own order history |
| `/api/orders/[id]/reorder` | POST | Re-add a past order's items to the cart |
| `/api/admin/catalog` | GET | Fetch active catalog (owner only) |
| `/api/admin/catalog` | POST | Bulk import CSV/JSON (owner only) |
| `/api/admin/catalog/[sku]` | PATCH | Update product (owner only) |
| `/api/admin/catalog/[sku]` | DELETE | Soft-archive product (owner only) |
| `/api/admin/orders` | GET | Fetch all orders (owner only) |
| `/api/admin/orders/[id]` | PATCH | Update order status (owner only); syncs status to GoHighLevel |
| `/api/admin/fleet` | GET | Fetch golf cart fleet (owner only) |
| `/api/admin/fleet/[id]` | PATCH | Update a cart's status/battery/location/etc. (owner only) |
| `/api/admin/activity` | GET | Fetch recent admin audit log entries (owner only) |
| `/api/crm/sync-contact` | POST | Reusable GoHighLevel contact upsert for lead-capture forms |

## Project Structure

```
app/
â”œâ”€â”€ admin/              # Admin dashboard (orders, catalog, scanner)
â”œâ”€â”€ api/
â”‚   â”œâ”€â”€ admin/          # Owner-protected admin API routes
â”‚   â”œâ”€â”€ order/          # Order submission
â”‚   â””â”€â”€ scan/           # Gemini AI vision pipeline
â”œâ”€â”€ login/              # Auth page
â”œâ”€â”€ layout.tsx          # Root layout with PWA shell
â”œâ”€â”€ page.tsx            # Mobile scanner + cart
â””â”€â”€ PwaStatus.tsx       # Online/offline + install prompt
components/ui/          # shadcn/ui primitives
lib/                    # Zustand store, Supabase client
public/                 # Manifest, service worker, assets
src/lib/types/          # Shared TypeScript contracts
supabase/migrations/    # Database schema migrations
.agent/                 # Multi-agent development architecture
```

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm test         # Run Vitest suite
```

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, test, and build on every push/PR to `master` so regressions are caught automatically instead of relying on manual discipline.

## Multi-machine workflow (home laptop / work PC)

Always work from a real local git clone — never open this repo via VS Code's "Open Remote Repository" / GitHub virtual filesystem view. That view can't run `npm`/tests, and edits made there create a second, independently-diverging copy of the repo, which is what causes merge conflicts when switching machines.

On each machine:

```bash
git clone https://github.com/CWH811/golf-b2b-app.git
cd golf-b2b-app
npm install
```

Each time you sit down to work:

```bash
git pull            # sync latest before starting
```

Each time you finish a session:

```bash
npm test && npm run build   # verify before pushing
git add -A
git commit -m "..."
git push origin master
```

As long as both machines always open the local folder directly (`File > Open Folder`) instead of a remote/virtual view, `git pull`/`git push` alone keeps progress fully in sync between them.

## Deployment

Deploy to Vercel with the environment variables configured in your project settings. The PWA service worker and manifest are generated during the build.

## Known limitations & roadmap

- **Single-tenant data model.** `products`, `orders`, and `golf_cart_fleet` are shared across every signed-up user — there's no `org_id`/customer scoping. This is fine for one golf course (the current deployment at gcoregolf.com) but was **intentionally not reworked into multi-tenancy** here: doing so touches signup, RLS, billing, and the admin ownership model, and retrofitting it against a live single-customer production database without a clear tenant-onboarding/billing design would risk breaking the existing deployment. If GCore is sold to multiple golf courses, plan this as its own project: add an `organizations` table, an `org_id` column (with a backfill migration) on `products`/`orders`/`golf_cart_fleet`/`admin_users`, scope every RLS policy and admin query by org, and decide how staff get invited to an org at signup.
- **Rate limiting on `/api/scan` is in-memory and per-instance**, not distributed. It meaningfully bounds abuse from a single warm serverless instance but isn't a hard global cap. For a hard cap, back it with Upstash Redis or Vercel KV.
- **No APM/error-tracking service is wired up yet.** `lib/logger.ts` emits structured JSON logs so production errors are at least searchable in Vercel's log viewer; see the comment at the top of that file for how to add Sentry once a DSN is available.

## License

Private â€” GCore is a proprietary B2B platform. 
\n