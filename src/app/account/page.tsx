"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Heart, MapPin, PackageCheck, PackageSearch, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SavedChip } from "@/components/ui/saved-chip";

const cardMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: "easeOut" }
} as const;

export default function AccountPage() {
  const { customer, orders, products, reorder } = useStore();
  const customerOrders = orders.filter((order) => customer.orderIds.includes(order.order_id) || order.customer_phone === customer.phone);
  const favorites = products.filter((product) => customer.favoriteProductIds.includes(product.id));

  return (
    <main className="app-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
      <motion.div {...cardMotion}>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/70">Account</p>
        <h1 className="mt-2 text-4xl font-bold text-ink">{customer.name}</h1>
        <p className="mt-2 font-medium text-ink/65">Saved addresses, favorites, and order history for this device.</p>
      </motion.div>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Panel title="Saved Addresses" icon={<MapPin className="h-5 w-5" />}>
          <div className="space-y-3">
            {customer.addresses.length ? customer.addresses.map((address) => (
              <div key={address.id} className="rounded-lg bg-slate-50 p-3 text-sm border border-slate-100/50">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-ink">{address.label}</p>
                  <SavedChip label="Saved" className="py-0.5 px-2 text-[10px]" />
                </div>
                <p className="font-medium text-ink/80">{address.receiverName}</p>
                <p className="font-medium text-ink/70">{address.line1}, {address.line2}</p>
                <p className="font-medium text-ink/70">{address.city} - {address.pincode}</p>
              </div>
            )) : (
              <EmptyState
                icon={<MapPin className="h-5 w-5" />}
                message="No saved addresses yet."
                hint="Add one during checkout and it'll show up here."
              />
            )}
          </div>
        </Panel>

        <Panel title="Favorite Items" icon={<Heart className="h-5 w-5" />}>
          <div className="space-y-2">
            {favorites.length ? favorites.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm font-semibold hover:bg-slate-100">
                <span>{product.name}</span>
                <span className="text-primary-accent">{formatCurrency(product.price)}</span>
              </Link>
            )) : (
              <EmptyState
                icon={<Heart className="h-5 w-5" />}
                message="No favorites saved yet."
                hint="Tap the heart icon on any product to save it here."
                actionHref="/#product-tools"
                actionLabel="Browse products"
              />
            )}
          </div>
        </Panel>

        <Panel title="Order History" icon={<PackageCheck className="h-5 w-5" />}>
          <div className="space-y-2">
            {customerOrders.length ? customerOrders.map((order) => {
              const statusLower = order.status.toLowerCase();
              const badgeVariant =
                statusLower.includes("complete") || statusLower.includes("delivered") || statusLower.includes("approve")
                  ? "fresh"
                  : statusLower.includes("cancel") || statusLower.includes("reject")
                    ? "warning"
                    : statusLower.includes("pend") || statusLower.includes("process") || statusLower.includes("ship")
                      ? "deal"
                      : "default";

              return (
                <div key={order.order_id} className="rounded-lg bg-slate-50 p-3 text-sm border border-slate-100/50">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/orders/${order.order_id}`} className="font-semibold text-ink hover:text-primary-accent hover:underline">{order.order_id}</Link>
                    <Badge variant={badgeVariant}>{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-ink/70 font-medium">{formatCurrency(order.total_amount)} · {order.delivery_eta}</p>
                  <button
                    type="button"
                    onClick={() => {
                      reorder(order.order_id);
                      toast.success("Previous order added to cart");
                    }}
                    className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-slate-100 transition active:scale-95"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reorder
                  </button>
                </div>
              );
            }) : (
              <EmptyState
                icon={<PackageSearch className="h-5 w-5" />}
                message="No orders yet."
                hint="Your order history will show up here once you check out."
                actionHref="/#product-tools"
                actionLabel="Start shopping"
              />
            )}
          </div>
        </Panel>
      </section>
      </div>
    </main>
  );
}

function Panel({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <motion.section {...cardMotion} className="premium-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-full bg-slate-50 p-2 text-ink/70">{icon}</span>
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function EmptyState({ actionHref, actionLabel, hint, icon, message }: { actionHref?: string; actionLabel?: string; hint: string; icon: ReactNode; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-ink/70">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-ink">{message}</p>
      <p className="mt-1 text-xs font-medium text-ink/55">{hint}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-3 inline-flex items-center justify-center rounded-full bg-primary-accent px-3 py-2 text-xs font-semibold text-white hover:bg-leaf-800">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
