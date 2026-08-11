# GCore Architecture Reference

## Project Summary
GCore is a mobile-first golf course operations platform built with Next.js, React, TypeScript, Tailwind CSS, Supabase, Zustand, and next-pwa.

## Core Stack
- Framework: Next.js 16 App Router
- UI: React 19 + TypeScript
- Styling: Tailwind CSS 4 with shadcn/ui-inspired primitives
- Data: Supabase SSR and route handlers
- State: Zustand for local client state
- PWA: next-pwa for installable/offline support

## Primary Directories
- app/ — route pages and route handlers
- app/api/ — backend endpoints such as order submission
- components/ — reusable UI components
- components/ui/ — shared primitive UI elements
- lib/ — shared helpers and client/server integrations
- public/ — static assets and PWA files
- src/lib/types/ — shared TypeScript contracts (single source of truth)

## Current Product Surface
- Login experience: app/page.tsx
- Order submission route: app/api/order/route.ts
- Auth integration: lib/supabase.ts (browser) + app/api/admin/auth.ts (SSR)
- Client state: lib/store.ts
- Secure admin dashboard: app/admin/page.tsx, app/admin/AdminDashboardClient.tsx
- Admin API routes: app/api/admin/orders/route.ts, app/api/admin/orders/[id]/route.ts, app/api/admin/catalog/route.ts, app/api/admin/catalog/[sku]/route.ts
- Admin sub-components: AdminOrdersTable.tsx, AdminCatalogTable.tsx, ProductScanner.tsx

## Admin Feature Surface
- Owner-only admin dashboard at /admin
- Orders view with incoming orders and order_items
- Catalog manager with CSV/JSON bulk import
- Shared contracts in src/lib/types/admin.ts

## Styling Guidelines
- Dark-concrete visual language
- Charcoal and slate backgrounds with subtle green accents
- Electric Blue (#007BFF) and Neon Green (#39FF14) highlight accents
- Touch-friendly spacing and large tap targets
- Progressive enhancement for mobile and field use

## Data Intent
The platform should support operational workflows such as:
- order submission
- resource tracking
- scheduling and assignment workflows
- inventory awareness for field operations
- admin catalog management and bulk product ingestion

---

# PHASE 1 BLUEPRINT — Order History (/history) + Admin Dashboard (/admin)

## 1. Database Schema (source of truth)

### public.products
| column | type | notes |
|--------|------|-------|
| sku | text PK | |
| name | text | |
| base_price | numeric(10,2) | >= 0 |
| quantity_on_hand | integer | >= 0 |
| status | text check | 'active' \| 'archived' |
| modified_by | uuid FK auth.users | set by trigger |
| created_at | timestamptz | |
| updated_at | timestamptz | set by trigger |

### public.orders
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK auth.users | buyer |
| status | text check | 'pending' \| 'fulfilled' \| 'shipped' \| 'cancelled' |
| modified_by | uuid FK auth.users | set by trigger (admin) |
| created_at | timestamptz | |
| updated_at | timestamptz | set by trigger |

### public.order_items
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| order_id | uuid FK orders ON DELETE CASCADE | |
| sku | text FK products | |
| quantity | integer | > 0 |
| price_at_purchase | numeric(10,2) | >= 0 |
| created_at | timestamptz | |

**RLS NOTE:** All three tables currently allow ANY authenticated user to SELECT. Buyer history MUST therefore be scoped by `user_id` in the API route (never trust client-side filters). Admin mutations MUST be gated by `isOwnerUser`.

## 2. Security & Role Model

| Role | Determinant | Access |
|------|------------|--------|
| `buyer` | any authenticated user who is NOT the owner | GET /api/orders (own orders), POST /api/order, POST /api/orders/[id]/reorder (own orders) |
| `admin` | `isOwnerUser(user)` via `ADMIN_USER_ID` / `ADMIN_EMAIL` env vars | ALL /api/admin/* routes, GET /api/orders (all, for oversight) |

- New shared constant: `OrderStatus = 'pending' | 'fulfilled' | 'shipped' | 'cancelled'` validated server-side in every admin status mutation.
- Catalog status: `CatalogStatus = 'active' | 'archived'` — archived products are hidden from buyer catalog queries (`.neq('status', 'archived')`) and only visible under the Admin Catalog Manager.

## 3. Shared TypeScript Interfaces (src/lib/types/)

### New file: src/lib/types/orders.ts
```ts
export type OrderStatus = 'pending' | 'fulfilled' | 'shipped' | 'cancelled';

export type OrderHistoryItem = {
  id: string;                 // order_items.id
  sku: string;
  name: string;               // joined from products
  quantity: number;
  price_at_purchase: number;
};

export type OrderHistoryRecord = {
  id: string;                 // orders.id
  status: OrderStatus;
  created_at: string;
  updated_at?: string;
  item_count: number;         // derived client-side or server-side
  total: number;              // derived server-side: sum(quantity * price_at_purchase)
  items: OrderHistoryItem[];
};

export type ReorderPayload = {
  items: { sku: string; quantity: number }[];
};
```

### Update: src/lib/types/admin.ts
```ts
export type CatalogStatus = 'active' | 'archived';

export type AdminCatalogRecord = {
  sku: string;
  name: string;
  base_price: number;
  quantity_on_hand?: number;
  status?: CatalogStatus;
};

// PATCH /api/admin/catalog/[sku] now accepts status toggles
export type AdminCatalogPatchPayload = {
  name?: string;
  base_price?: number;
  quantity_on_hand?: number;
  status?: CatalogStatus;
};
```

### Update: src/lib/types/index.ts
```ts
export * from './golfCart';
export * from './admin';
export * from './orders';
```

## 4. API Routes Blueprint

### 4.1 GET /api/orders — Buyer Order History (NEW)
- **Auth**: SSR client (`createServerClient` from `@supabase/ssr`), `getUser()`. 401 if no user.
- **Role**: `buyer` or `admin` (any authenticated user).
- **Query (Supabase)**:
  ```ts
  supabase
    .from('orders')
    .select('id, status, created_at, updated_at, order_items(id, sku, quantity, price_at_purchase, products(name))')
    .eq('user_id', user.id)          // hard-scope to authenticated buyer
    .order('created_at', { ascending: false })
    .limit(50)                        // pagination guard
  ```
- **Response**: `{ orders: OrderHistoryRecord[] }` with `total` = Σ quantity·price_at_purchase, `item_count` = Σ quantity, `name` flattened from `order_items.products.name`.
- **Errors**: 401 unauthenticated, 500 unexpected.

### 4.2 POST /api/orders/[id]/reorder — Reorder Past PO (NEW)
- **Auth**: SSR + `getUser()`. 401 if no user.
- **Role**: `buyer` only.
- **Validation**: order `id` must exist AND `.eq('user_id', user.id)` — a buyer can ONLY reorder their own PO.
- **Logic**:
  1. Fetch source order `select('id, user_id, order_items(sku, quantity)')` `.eq('id', id).eq('user_id', user.id).single()`.
  2. If missing → 404 `{ error: 'Order not found' }`.
  3. Insert new order `{ user_id: user.id, status: 'pending' }`.
  4. Insert order_items copying `sku` and `quantity` from the source items.
  5. Return `{ success: true, orderId: newOrder.id }`.
- **Errors**: 401, 404, 400 (source has no items), 500.

### 4.3 PATCH /api/admin/catalog/[sku] — Catalog Status Toggle (ENHANCED)
- **Auth/role**: existing `getAdminUser()` + `isOwnerUser`. 401 if not owner.
- **Body**: `{ name?, base_price?, quantity_on_hand?, status? }` — `status` must be `'active' | 'archived'`; validated before update.
- **Query**:
  ```ts
  supabase.from('products').update(updates).eq('sku', sku).select().single()
  ```
- **Response**: `{ success: true, product: data }`.
- **Note**: `DELETE` already soft-archives via `{ status: 'archived' }` — keep.

### 4.4 GET /api/admin/orders — Status-Filtered Oversight (ENHANCED)
- **Auth/role**: `getAdminUser()` + `isOwnerUser`. 401 if not owner.
- **Optional query param**: `?status=pending` (validated against `OrderStatus`).
- **Query**:
  ```ts
  let query = supabase
    .from('orders')
    .select('id, user_id, status, created_at, order_items(id, sku, quantity, price_at_purchase)');
  if (status) query = query.eq('status', status);
  query.order('created_at', { ascending: false });
  ```
- **Response**: `{ orders: AdminOrderSummary[] }` (existing shape — reuse).

### 4.5 Existing routes (unchanged, but referenced)
- POST /api/order — checkout (buyer)
- GET /api/admin/orders — oversight (admin)
- PATCH /api/admin/orders/[id] — status changes (admin), validates against `OrderStatus`
- GET/POST /api/admin/catalog — list/import (admin)
- POST /api/scan — AI product scan

## 5. Frontend Page Blueprints

### 5.1 /history — Order History Page (NEW)
- **Route**: `app/history/page.tsx` (server component, `dynamic = 'force-dynamic'`) → auth check via SSR `getUser()`; redirect to `/login` if unauthenticated. Renders client component.
- **Client component**: `app/history/OrderHistoryClient.tsx`
  - On mount: `fetch('/api/orders')` → `OrderHistoryRecord[]`.
  - Displays: status badge (colored per `OrderStatus`), date, item count, total, expandable item list.
  - **Reorder button** per record: `POST /api/orders/[id]/reorder` → success toast → refresh list.
  - Empty state: "No orders yet — scan a product to place your first PO."
  - Loading skeletons matching dark-concrete aesthetic.
- **Accessibility**: large tap targets (≥44px), mobile-first single-column cards on small screens, table layout on ≥md.
- **Aesthetic**: `#161719` concrete background, `#1b1d20` cards, `#39FF14` (Neon Green) accents for status + reorder, `#007BFF` (Electric Blue) for navigation/secondary actions.

### 5.2 /admin — Admin Dashboard (ENHANCED EXISTING)
- **Route exists**: `app/admin/page.tsx` (server, `dynamic = 'force-dynamic'`, `getAdminUser()` + `isOwnerUser` → redirect `/login`).
- **Enhancements to `AdminDashboardClient.tsx`**:
  - Add **status filter bar** for Orders tab: All / Pending / Shipped / Fulfilled / Cancelled — re-fetches `/api/admin/orders?status=<value>`.
  - Keep existing tabs: Orders, Catalog Manager, AI Scanner.
- **Enhancements to `AdminCatalogTable.tsx`**:
  - Add a **status column** showing `active`/`archived` badge.
  - Add an **Archive/Reactivate toggle button** → `PATCH /api/admin/catalog/[sku]` with `{ status: 'archived' | 'active' }` (replaces reliance on DELETE for a second action).
  - Keep Edit (name/price/qty) and existing archive dialog.
- **Enhancements to `AdminOrdersTable.tsx`**:
  - Status select already wired to `PATCH /api/admin/orders/[id]` — validated statuses live in shared `OrderStatus`.

## 6. Execution Order (anti-context-drift)

1. **Phase 2 (Backend)**: Add `src/lib/types/orders.ts` + update `admin.ts`/`index.ts`; build `/api/orders/route.ts`, `/api/orders/[id]/reorder/route.ts`; enhance `PATCH /api/admin/catalog/[sku]` and `GET /api/admin/orders` with status filter support.
2. **Phase 3 (Frontend)**: Build `/history` page (+ client component); enhance `/admin` dashboard, catalog table (status toggle column), orders table (status filter).
3. **Quality gate**: `npm run lint` + `npm run build` → fix until clean.
4. **Phase 4 (PWA)**: Verify next.config.ts (already has `turbopack: {}` + next-pwa), manifest.webmanifest (App Name GCore, `#161719`, standalone — already correct), and extend SW caching for `/history` + `/admin` routes + new API GET routes for offline resiliency.
5. **Quality gate**: `npm run lint` + `npm run build` → fix until clean.

## Agent Boundaries
- Frontend agent: presentation, layout, interaction, and styling
- Backend/data agent: server routes, authentication flow, and data contracts
- PWA/infrastructure agent: installation, caching, offline behavior, and resilience

## Working Rule
Treat this document as the shared source of truth for every agent. Any implementation request should be routed through the orchestrator before changes are made.