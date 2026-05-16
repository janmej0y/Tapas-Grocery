import webpush, { type PushSubscription } from "web-push";
import { ADMIN_PHONE } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
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
  if (!configureWebPush()) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("admin_phone", ADMIN_PHONE);

  const rows = (data ?? []) as PushRow[];

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
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: "New order received",
            body: `${order.customer_name} placed ${order.order_id} for ₹${order.total_amount}`,
            url: `/admin`,
            tag: `order-${order.order_id}`
          })
        );
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;

        if ([404, 410].includes(statusCode)) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
        }
      }
    })
  );
}
