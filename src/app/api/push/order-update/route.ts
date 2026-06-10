import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  sendCustomerEtaNotification,
  sendCustomerOrderStatusNotification,
  sendCustomerRefundNotification
} from "@/lib/push";
import type { Order, OrderStatus, RefundStatus } from "@/lib/types";

type OrderUpdateBody = {
  type?: "status" | "eta" | "refund";
  order?: Order;
  status?: OrderStatus;
  eta?: string;
  refundStatus?: RefundStatus;
  reason?: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Admin login is required to send order notifications." }, { status: 401 });
  }

  const body = (await request.json()) as OrderUpdateBody;

  if (!body.order?.order_id || !body.order.customer_phone) {
    return NextResponse.json({ error: "Order id and customer phone are required." }, { status: 400 });
  }

  if (body.type === "status" && body.status) {
    const result = await sendCustomerOrderStatusNotification(body.order, body.status);
    return NextResponse.json({ ok: true, result });
  }

  if (body.type === "eta") {
    const result = await sendCustomerEtaNotification(body.order, body.eta ?? body.order.delivery_eta);
    return NextResponse.json({ ok: true, result });
  }

  if (body.type === "refund" && body.refundStatus) {
    const result = await sendCustomerRefundNotification(body.order, body.refundStatus, body.reason);
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json({ error: "A valid notification type is required." }, { status: 400 });
}
