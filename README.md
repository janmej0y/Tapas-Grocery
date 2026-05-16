# Tapas Grocery Store

Tapas Grocery Store is a responsive grocery e-commerce app built for my personal business in Hatimuri. Customers can browse products, add items to cart, enter a delivery address and mobile number, and place cash-on-delivery orders. The owner/admin can manage products, orders, delivery ETA, users, inventory, analytics, and notifications.

## Features

- Mobile-first grocery shopping experience
- Supabase email/password and Google login for customer accounts
- Cart and checkout with mandatory mobile number and full address validation
- Google Maps location selection with automatic distance calculation
- Delivery fee logic for orders within 20 km
- Cash on delivery while Razorpay verification is pending
- Product variants by gram/kg for loose products and quantity for packaged products
- Fuzzy product search and deep filters
- AI customer assistant endpoint
- English and Bengali UI support
- Favorites, account page, order history, reorder, and order tracking
- Admin dashboard for products, orders, users, ETA, refunds, analytics, and CSV import/export
- Supabase Storage support for product images
- PWA support and downloadable APK
- Web Push notifications for admin order alerts
- Supabase schema with RLS policies and storage policies

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase database, auth, and storage
- Next.js API routes
- Recharts
- Fuse.js
- react-hot-toast
- lucide-react

## Shop Location

The shop location is stored in:

```text
src/lib/location.ts
```

Current coordinates:

```text
23.457619, 86.151317
```

## Delivery Fee Logic

The checkout uses this rule:

- `<= 300 meters`: ₹3 delivery fee
- `> 300 meters`: ₹1 is added for every extra 100 meters
- Free delivery within 1 km if cart total is above ₹200
- Free delivery within 2 km if cart total is above ₹400
- `> 20 km`: delivery unavailable

Main function:

```text
src/lib/delivery.ts
```

## Supabase Setup

Schema and RLS policies are in:

```text
supabase/migrations/202605150001_init_tapas_grocery.sql
```

Enable these Supabase auth providers:

- Email
- Google

Phone SMS login is not used by the current app.

## Environment Variables

Copy `.env.example` to `.env` locally and add real values. Never commit `.env`.

Important variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

## Deployment Notes

Before deployment:

1. Add environment variables to Vercel.
2. Apply the Supabase migration.
3. Enable Supabase Email and Google auth.
4. Add production redirect URL: `https://tapas-grocery.vercel.app/login`.
5. Create/verify the `product-images` Supabase Storage bucket.
6. Set `NEXTAUTH_URL` to your production domain.
