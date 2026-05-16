# 🛒 Tapas Grocery Store

Tapas Grocery Store is a modern, responsive grocery e-commerce web app built for my personal business. The goal of this project is to help local customers browse groceries, add items to cart, verify their phone number, select a delivery address, and place orders online with a simple owner-controlled admin dashboard.

The app is designed for a local delivery workflow around Tapas Grocery Store, Hatimuri, with delivery availability and fees calculated from the shop location.

## ✨ Features

- 📱 Mobile-first grocery shopping experience
- 🔐 Phone OTP login for customers and owner/admin
- 🧾 Cart and checkout flow with full delivery address validation
- 📍 Google Maps location selection and automatic distance calculation
- 🚚 Delivery fee logic for orders within 2 km
- 💳 Razorpay-ready payment endpoint for UPI/cards/net banking
- 🛍️ Product variants by kg, gram, liter, packet, bottle, tube, dozen, and more
- 🔎 Fuzzy product search and deep filters
- 🧠 AI customer assistant endpoint
- 🌐 English and Bengali UI support
- ❤️ Favorites and customer account page
- 📦 Order history, reorder, and live order tracking
- 🔔 Toast notifications instead of browser alerts
- 🧑‍💼 Admin dashboard for products, orders, users, ETA, refunds, analytics, and CSV import/export
- 🖼️ Supabase Storage support for product images
- 📊 Admin analytics with charts
- 📲 PWA support for installable mobile experience
- 🛡️ Supabase schema with RLS policies and storage policies

## 🧱 Tech Stack

- **Framework:** Next.js App Router
- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Database/Auth/Storage:** Supabase
- **Authentication:** Supabase phone OTP and NextAuth support
- **Payments:** Razorpay-ready API
- **Search:** Fuse.js
- **Charts:** Recharts
- **Notifications:** react-hot-toast
- **Icons:** lucide-react
- **PWA:** Web manifest + service worker

## 📍 Shop Location

The shop location is hardcoded in:

```ts
src/lib/location.ts
```

Current coordinates:

```text
23.457619, 86.151317
```

This is used to calculate customer delivery distance.

## 🚚 Delivery Fee Logic

The checkout uses this delivery rule:

- `<= 300 meters`: ₹3 delivery fee
- `> 300 meters` and `<= 1 km`: ₹10 delivery fee
- Free delivery within 1 km if cart total is above ₹150
- `> 1 km` and `<= 2 km`: ₹20 delivery fee
- Free delivery within 2 km if cart total is above ₹400
- `> 2 km`: delivery unavailable

Main function:

```ts
src/lib/delivery.ts
```

## 🧑‍💼 Admin Access

The owner/admin phone number is:

```text
7477661933
```

Admin access is handled through phone OTP. After verification, admin access is remembered for 30 days on the same device.

Admin page:

```text
/admin
```

## 🗃️ Supabase Setup

The Supabase production schema and RLS policies are inside:

```text
supabase/migrations/202605150001_init_tapas_grocery.sql
```

It includes:

- Products
- Customer profiles
- Roles
- Blocked phones
- Addresses
- Favorites
- Orders
- Order items
- Delivery agents
- Product reviews
- Promo codes
- Admin activity log
- Product image storage bucket
- RLS policies
- Realtime setup for orders and admin activity

### Apply Schema

Option 1: Supabase Dashboard

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste the migration SQL
4. Click Run

Option 2: Supabase CLI

```bash
supabase db push
```

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3010

ADMIN_EMAIL=
ADMIN_PASSWORD=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
GEMINI_API_KEY=
```

Supabase dashboard may call the anon key a **publishable key**.

Use this mapping:

```text
Project URL / URI  -> NEXT_PUBLIC_SUPABASE_URL
Publishable key    -> NEXT_PUBLIC_SUPABASE_ANON_KEY
Secret key         -> SUPABASE_SERVICE_ROLE_KEY
```

Never commit `.env`.

## 🧪 Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev -- -p 3010
```

Open:

```text
http://localhost:3010
```

## 🏗️ Build

Create a production build:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

## 📁 Important Project Structure

```text
src/app/                  App Router pages and API routes
src/components/           UI components and providers
src/lib/                  Business logic, delivery, Supabase, invoice, location
src/lib/mock-data.ts      Local fallback grocery data
supabase/migrations/      Database schema and RLS policies
public/                   PWA manifest, service worker, icons
```

## 🛒 Product Catalog

The current catalog focuses on grocery and household essentials:

- Oils & Spices
- Frozen Foods
- Personal Care
- Household
- Baby Care
- Pet Care
- Instant Foods
- Meat & Seafood

Products support unit choices like:

```text
Kg, Gram, Liter, Milliliter, Packet, Bottle, Piece, Bundle, Can, Tube, Tub, Dozen
```

## 🔐 Security Notes

- `.env` is ignored by Git
- Supabase RLS is included
- Admin dashboard uses owner phone OTP
- Admin phone cannot be blocked from the dashboard
- Checkout and OTP APIs include basic rate limiting
- Service role key must only be used server-side

## 🚀 Deployment Notes

Before deployment:

1. Add all environment variables to your hosting provider
2. Apply the Supabase migration
3. Enable Supabase Phone Auth
4. Configure SMS provider such as Twilio Verify
5. Create/verify the `product-images` Supabase Storage bucket
6. Set `NEXTAUTH_URL` to your production domain

## 🤖 Android APK

This project can be packaged as an Android APK/AAB from the PWA using PWABuilder or Bubblewrap.

Guide:

```text
docs/ANDROID_APK.md
```

## ❤️ Purpose

This project was created for my personal grocery business so customers can order local grocery items more easily, and so I can manage products, orders, delivery time, users, and inventory from one dashboard.

## 📌 License

This is a private personal business project. All rights reserved.
