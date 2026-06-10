# Tapas Grocery UI/UX Guidelines

These guidelines keep the interface fast, local, and conversion-focused. Avoid decorative effects that do not improve scanning, ordering, or checkout confidence.

## Visual Language

- Use emerald and forest green for primary commerce actions, trust, freshness, and success states.
- Use amber or mustard only for urgency, offers, progress, and priority prompts.
- Use slate text on white or off-white surfaces for maximum readability.
- Keep radius tight: `rounded-md` for controls and `rounded-lg` for product cards or checkout modules.
- Prefer borders and subtle shadows over heavy blur, glass, floating gradients, or oversized decorative shapes.

## Typography

- Use the existing system font stack.
- Product names should be bold, compact, and clamped to two lines.
- Variant, stock, distance, and helper labels should use muted slate and smaller text.
- Reserve large text for page headers and primary product prices.
- Bengali and English strings must be allowed to wrap without shifting the card footer or CTA position.

## Mobile Storefront

- Search and cart actions should be reachable without thumb travel.
- Primary tap targets must be at least `h-11` and preferably `h-12` for bottom navigation and commerce controls.
- Product grid cards should use fixed-height sections for image, title, variant, and CTA areas.
- Variant controls must stay inside a reserved row so changing weight or pack size does not push the CTA down.
- The ADD button must immediately become a `- qty +` stepper after the first tap.

## Checkout

- Address and payment sections should be segmented with clear labels and inline validation.
- Delivery fee feedback should show current fee, distance, cart value, and the next free-delivery target.
- Cash on Delivery should be visually explicit as the primary route until online payment is fully enabled.
- Razorpay states should be visibly disabled, pending, selected, or verified. Do not hide payment limitations in small text.

## Admin

- Prefer data tables over card grids for orders, products, and users.
- Use dense rows, alternating backgrounds, sticky table headers, and clear status badges.
- Status colors:
  - Pending: amber
  - Accepted or Preparing: blue/slate
  - Out for delivery: indigo
  - Delivered: emerald
  - Cancelled or Refunded: red
- Analytics charts should use one or two tones, restrained gridlines, and readable axes.

## Motion

- Use motion only for functional feedback: add-to-cart pop, panel slide, or fast page transition.
- Keep animation duration under 200ms for commerce controls.
- Avoid delayed entrances, looping decoration, and animation that blocks ordering.
