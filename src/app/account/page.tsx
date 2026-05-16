"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Heart, MapPin, PackageCheck, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/format";

export default function AccountPage() {
  const { customer, orders, products, reorder } = useStore();
  const customerOrders = orders.filter((order) => customer.orderIds.includes(order.order_id) || order.customer_phone === customer.phone);
  const favorites = products.filter((product) => customer.favoriteProductIds.includes(product.id));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-leaf-700">Account</p>
        <h1 className="mt-2 text-4xl font-black text-ink">{customer.name}</h1>
        <p className="mt-2 text-ink/65">Saved addresses, favorites, and order history for this device.</p>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Panel title="Saved Addresses" icon={<MapPin className="h-5 w-5" />}>
          <div className="space-y-3">
            {customer.addresses.map((address) => (
              <div key={address.id} className="rounded-lg bg-leaf-50 p-3 text-sm">
                <p className="font-black text-ink">{address.label}: {address.receiverName}</p>
                <p className="text-ink/70">{address.line1}, {address.line2}</p>
                <p className="text-ink/70">{address.city} - {address.pincode}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Favorite Items" icon={<Heart className="h-5 w-5" />}>
          <div className="space-y-2">
            {favorites.length ? favorites.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="flex justify-between rounded-lg bg-leaf-50 p-3 text-sm font-bold hover:bg-leaf-100">
                <span>{product.name}</span>
                <span className="text-leaf-700">{formatCurrency(product.price)}</span>
              </Link>
            )) : <p className="text-sm text-ink/60">No favorites saved yet.</p>}
          </div>
        </Panel>

        <Panel title="Order History" icon={<PackageCheck className="h-5 w-5" />}>
          <div className="space-y-2">
            {customerOrders.length ? customerOrders.map((order) => (
              <div key={order.order_id} className="rounded-lg bg-leaf-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/orders/${order.order_id}`} className="font-black text-ink hover:text-leaf-700">{order.order_id}</Link>
                  <span className="font-bold text-leaf-700">{order.status}</span>
                </div>
                <p className="mt-1 text-ink/70">{formatCurrency(order.total_amount)} · {order.delivery_eta}</p>
                <button
                  type="button"
                  onClick={() => {
                    reorder(order.order_id);
                    toast.success("Previous order added to cart");
                  }}
                  className="mt-2 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 font-bold hover:bg-leaf-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reorder
                </button>
              </div>
            )) : <p className="text-sm text-ink/60">No orders yet.</p>}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Panel({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-md bg-leaf-50 p-2 text-leaf-700">{icon}</span>
        <h2 className="text-xl font-black text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}
