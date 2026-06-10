import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { calculateDeliveryFee } from "@/lib/delivery";
import { applyPromoCode } from "@/lib/promos";
import { sendAdminOrderNotification } from "@/lib/push";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapOrderRow, orderToSupabaseRow } from "@/lib/supabase/mappers";
import type { Order, OrderStatus, RefundStatus, UserAddress } from "@/lib/types";

type CheckoutItem = {
  productId: string;
  name: string;
  selectedUnit?: string;
  price: number;
  quantity: number;
};

export async function GET() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ source: "mock", orders: [] });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(product_name, selected_unit, quantity)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, source: "mock", orders: [] }, { status: 400 });
  }

  return NextResponse.json({ source: "supabase", orders: (data ?? []).map(mapOrderRow) });
}

export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`checkout:${ip}`, 5, 60_000);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait a minute." }, { status: 429 });
  }

  const body = (await request.json()) as {
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: UserAddress;
    distanceKm?: number;
    promoCode?: string;
    paymentMethod?: "COD" | "UPI" | "Card" | "NetBanking";
    items?: CheckoutItem[];
  };

  if (!body.customerName || !body.customerPhone || !body.deliveryAddress || !body.items?.length || typeof body.distanceKm !== "number") {
    return NextResponse.json({ error: "Customer name, phone, full address, distance, and cart items are required." }, { status: 400 });
  }

  if (body.paymentMethod && body.paymentMethod !== "COD") {
    return NextResponse.json({ error: "Only cash on delivery is available until Razorpay verification is completed." }, { status: 400 });
  }

  const subtotal = body.items.reduce((total, item) => total + item.price * item.quantity, 0);
  const promo = body.promoCode ? applyPromoCode(body.promoCode, subtotal) : null;
  const delivery = calculateDeliveryFee(body.distanceKm, subtotal - (promo?.discount ?? 0));

  if (!delivery.available) {
    return NextResponse.json({ error: delivery.message }, { status: 400 });
  }

  const total = subtotal - (promo?.discount ?? 0) + delivery.fee;

  const order: Order = {
      order_id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      delivery_address: body.deliveryAddress,
      items_ordered: body.items.map((item) => `${item.name} x ${item.quantity}`).join(", "),
      subtotal,
      discount_amount: promo?.discount ?? 0,
      total_amount: total,
      delivery_fee: delivery.fee,
      delivery_distance: body.distanceKm,
      payment_method: "COD",
      payment_status: "Pending",
      status: "Pending",
      assigned_agent_id: undefined,
      delivery_eta: "Waiting for owner confirmation",
      refund_status: "Not requested",
      invoice_number: `INV-${Date.now()}`,
      created_at: new Date().toISOString()
  };

  const supabase = createSupabaseAdminClient();

  if (supabase) {
    const { data: insertedOrder, error: orderError } = await supabase
      .from("orders")
      .insert(orderToSupabaseRow(order))
      .select("id")
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 400 });
    }

    const orderId = insertedOrder?.id;

    if (orderId && body.items.length > 0) {
      const { error: itemsError } = await supabase.from("order_items").insert(
        body.items.map((item) => ({
          order_id: orderId,
          product_id: isUuid(item.productId) ? item.productId : null,
          product_name: item.name,
          selected_unit: item.selectedUnit ?? "1",
          quantity: item.quantity,
          unit_price: item.price
        }))
      );

      if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 400 });
      }
    }
  }

  sendAdminOrderNotification(order).catch(() => undefined);

  return NextResponse.json({ order });
}

export async function PATCH(request: Request) {
  const supabase = createSupabaseAdminClient();
  const body = (await request.json()) as {
    orderId?: string;
    status?: OrderStatus;
    deliveryEta?: string;
    refundStatus?: RefundStatus;
    cancellationReason?: string;
    assignedAgentId?: string | null;
  };

  if (!body.orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ source: "mock", orderId: body.orderId });
  }

  const updates: Record<string, string | null> = {};

  if (body.status) {
    updates.status = body.status;
  }

  if (typeof body.deliveryEta === "string") {
    updates.delivery_eta = body.deliveryEta;
  }

  if (body.refundStatus) {
    updates.refund_status = body.refundStatus;
  }

  if (typeof body.cancellationReason === "string") {
    updates.cancellation_reason = body.cancellationReason;
  }

  if ("assignedAgentId" in body) {
    updates.assigned_agent_id = body.assignedAgentId || null;
  }

  const { error } = await supabase.from("orders").update(updates).eq("public_order_id", body.orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
