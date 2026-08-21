# Stive Landry Store — E-Commerce Management System (ECMS)

Web application for an iPhone and electronics store: public catalog, live stock, checkout, reservations, pre-orders, and a staff operations console.

**Frontend:** React + Vite + TypeScript + Tailwind  
**Backend / database:** Supabase (Auth, PostgreSQL, Row Level Security, Storage)

This implements the internship SRS: product catalog, inventory movements, orders, reservations, pre-orders, role-based access, reports (PDF/Excel), notifications, and an audit trail.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Copy **Project URL** and **anon public** key from Settings → API.

## 2. Run the database

In the Supabase SQL editor, run in order:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_sellers.sql`
3. `supabase/migrations/003_category_images.sql`
4. `supabase/seed.sql`

Enable **Email** auth (Authentication → Providers). For local testing you can disable “Confirm email”.

## 3. Configure the app

```bash
copy .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

## 4. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 5. Create the first administrator

1. Register a normal customer account on `/register`.
2. In the SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Sign out and back in. You can open `/console` and promote other staff under **Staff & users**.

Roles: `customer`, `sales_staff`, `inventory_manager`, `admin`, `store_owner`, `it_support`.

## 6. Client, seller, and admin portals

The login page has three entries:

- **Client** — dashboard to browse products, place orders, reserve items, and leave remarks / ratings on sellers.
- **Seller** — after an **admin approves** the shop, the seller can post, edit, and remove products and update stock.
- **Admin** — verify sellers, add or remove shops, and use every seller tool plus the full operations console.

Sellers register with a shop name. They stay **pending** until an administrator opens **Console → Sellers** and clicks Approve.

## What is included

| Area | Features |
| --- | --- |
| Storefront | Home, shop (search/filter), product pages, about, contact |
| Availability | In stock, low stock, out of stock, pre-order |
| Commerce | Cart, checkout, unique order numbers (`ECMS-YYYY-######`) |
| Payments | Pay at store, or card marked **pending** until staff confirm (status is separate from order status) |
| Holds | Reservations with expiry, convert to order, pre-orders |
| Console | Products, categories, brands, inventory add/remove/adjust, orders, reports, users, audit |
| Reports | Filter by date, export PDF and Excel |

Stock is never updated from the browser directly. Add / remove / adjust / checkout / reserve run as Postgres functions so available stock stays consistent (`available = total − reserved`).

## Deploy

- Frontend: Vercel or Netlify (this repo includes `vercel.json` for SPA routing).
- Set the same `VITE_SUPABASE_*` environment variables on the host.
- Add your production URL under Supabase Auth → URL configuration.

## Project layout

```
src/pages/store       Public website
src/pages/account     Customer dashboard
src/pages/console     Staff operations
src/pages/auth        Login, register, password reset
supabase/migrations   Schema, RLS, RPCs
supabase/seed.sql     Demo iPhones and accessories
```
