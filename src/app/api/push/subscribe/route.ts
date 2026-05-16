import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isAdminPhone, normalizeLocalPhone } from "@/lib/admin-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type BrowserPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`push-subscribe:${ip}`, 8, 60_000);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many notification subscription attempts. Please wait a minute." }, { status: 429 });
  }

  const body = (await request.json()) as {
    phone?: string;
    subscription?: BrowserPushSubscription;
  };
  const phone = normalizeLocalPhone(body.phone ?? "");
  const subscription = body.subscription;

  if (!isAdminPhone(phone)) {
    return NextResponse.json({ error: "Only the owner phone can enable admin notifications." }, { status: 403 });
  }

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    return NextResponse.json({ error: "Invalid browser push subscription." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role key is required for push subscriptions." }, { status: 503 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      admin_phone: phone,
      user_agent: headerStore.get("user-agent"),
      updated_at: new Date().toISOString()
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
