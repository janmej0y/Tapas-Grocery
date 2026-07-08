"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { use } from "react";
import { ArrowLeft, CheckCircle2, Clock, Package, Truck } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/format";

const steps = ["Pending", "Accepted", "Preparing", "Out for delivery", "Delivered"] as const;

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { orders } = useStore();
  const order = orders.find((item) => item.order_id === id);

  if (!order) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/account" className="inline-flex items-center gap-2 font-semibold text-leaf-700">
          <ArrowLeft className="h-4 w-4" />
          Back to account
        </Link>
        <h1 className="mt-8 text-3xl font-bold text-ink">Order not found</h1>
      </main>
    );
  }

  const activeIndex = Math.max(0, steps.findIndex((step) => step === order.status));

  return (
    <main className="app-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
      <Link href="/account" className="inline-flex items-center gap-2 font-semibold text-leaf-700">
        <ArrowLeft className="h-4 w-4" />
        Back to account
      </Link>
      <section className="premium-card mt-6 rounded-2xl p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-leaf-700">Live Order Tracking</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">{order.order_id}</h1>
            <p className="mt-2 text-ink/65 font-medium">ETA: {order.delivery_eta}</p>
          </div>
          <div className="rounded-2xl bg-leaf-50 p-4 text-right">
            <p className="text-sm font-semibold text-ink/60">Total</p>
            <p className="text-2xl font-black text-leaf-700">{formatCurrency(order.total_amount)}</p>
          </div>
        </div>

        {["Cancelled", "Refunded"].includes(order.status) ? (
          <div className="mt-5 rounded-2xl bg-red-50 border border-red-200/50 p-4 text-red-800 font-semibold text-sm">
            This order has been {order.status.toLowerCase()}. Please contact store support if you have questions.
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => {
            const complete = index <= activeIndex && !["Cancelled", "Refunded"].includes(order.status);
            return (
              <div key={step} className={`rounded-2xl border p-4 transition-all duration-200 ease-out ${complete ? "border-leaf-200 bg-primary-accent/5 text-leaf-800 shadow-card" : "border-slate-200 bg-white text-ink/45"}`}>
                <CheckCircle2 className={`h-5 w-5 ${complete ? "fill-primary-accent text-white" : "text-slate-300"}`} />
                <p className="mt-3 text-sm font-semibold">{step}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Info title="Items" icon={<Package className="h-5 w-5" />}>
            {order.items_ordered}
          </Info>
          <Info title="Delivery" icon={<Truck className="h-5 w-5" />}>
            {order.delivery_address.line1}, {order.delivery_address.line2}, {order.delivery_address.city}
          </Info>
          <Info title="Payment" icon={<Clock className="h-5 w-5" />}>
            {order.payment_method} · {order.payment_status}
          </Info>
        </div>
      </section>
      </div>
    </main>
  );
}

function Info({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-2xl bg-leaf-50 p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
        {icon}
        {title}
      </div>
      <p className="text-ink/70 font-medium">{children}</p>
    </div>
  );
}
