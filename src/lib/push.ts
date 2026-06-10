import webpush, { type PushSubscription } from "web-push";
import { ADMIN_PHONE, normalizeLocalPhone } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderStatus, RefundStatus } from "@/lib/types";

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export function hasPushConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

export function configureWebPush() {
  if (!hasPushConfig()) {
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  return true;
}

export async function sendAdminOrderNotification(order: Order) {
  return sendNotificationToPhone(ADMIN_PHONE, {
    title: "New order received",
    body: `${order.customer_name} placed ${order.order_id} for Rs ${Math.round(order.total_amount)}`,
    url: "/admin",
    tag: `admin-order-${order.order_id}`
  });
}

export async function sendCustomerOrderStatusNotification(order: Order, status: OrderStatus) {
  return sendNotificationToPhone(order.customer_phone, {
    title: `Order ${status}`,
    body: getStatusMessage(order, status),
    url: `/orders/${order.order_id}`,
    tag: `customer-order-${order.order_id}-${status.toLowerCase().replace(/\s+/g, "-")}`
  });
}

export async function sendCustomerEtaNotification(order: Order, eta: string) {
  return sendNotificationToPhone(order.customer_phone, {
    title: "Delivery time updated",
    body: `Order ${order.order_id}: ${eta || "Your delivery time will be confirmed soon."}`,
    url: `/orders/${order.order_id}`,
    tag: `customer-order-${order.order_id}-eta`
  });
}

export async function sendCustomerRefundNotification(order: Order, refundStatus: RefundStatus, reason?: string) {
  return sendNotificationToPhone(order.customer_phone, {
    title: `Refund ${refundStatus}`,
    body: reason ? `Order ${order.order_id}: ${reason}` : `Order ${order.order_id} refund status is ${refundStatus}.`,
    url: `/orders/${order.order_id}`,
    tag: `customer-order-${order.order_id}-refund-${refundStatus.toLowerCase().replace(/\s+/g, "-")}`
  });
}

async function sendNotificationToPhone(phone: string, payload: PushPayload) {
  if (!configureWebPush()) {
    return { sent: 0, reason: "missing-push-config" };
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { sent: 0, reason: "missing-supabase" };
  }

  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("admin_phone", normalizeLocalPhone(phone));

  const rows = (data ?? []) as PushRow[];
  let sent = 0;

  await Promise.all(
    rows.map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      };

      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;

        if ([404, 410].includes(statusCode)) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
        }
      }
    })
  );

  return { sent };
}

function getStatusMessage(order: Order, status: OrderStatus) {
  switch (status) {
    case "Accepted":
      return `Order ${order.order_id} has been accepted. We are preparing it now.`;
    case "Preparing":
      return `Order ${order.order_id} is being packed by Tapas Grocery Store.`;
    case "Out for delivery":
      return `Order ${order.order_id} is on the way and should reach in about 1 hour.`;
    case "Delivered":
      return `Order ${order.order_id} has been delivered. Thank you for shopping with us.`;
    case "Cancelled":
      return `Order ${order.order_id} has been cancelled. Contact the store if this looks wrong.`;
    case "Refunded":
      return `Order ${order.order_id} has been marked as refunded.`;
    case "Pending":
    default:
      return `Order ${order.order_id} is waiting for owner confirmation.`;
  }
}
