import { NextResponse } from "next/server";
import { ADMIN_PHONE } from "@/lib/admin-access";
import { hasPushConfig } from "@/lib/push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({
      ok: false,
      adminPhoneConfigured: Boolean(ADMIN_PHONE),
      pushConfig: hasPushConfig(),
      supabaseAdmin: false,
      pushTable: false,
      error: "Supabase admin client is not configured."
    });
  }

  try {
    const { error } = await supabase.from("push_subscriptions").select("endpoint", { count: "exact", head: true });

    return NextResponse.json({
      ok: !error && hasPushConfig(),
      adminPhoneConfigured: Boolean(ADMIN_PHONE),
      pushConfig: hasPushConfig(),
      supabaseAdmin: true,
      pushTable: !error,
      error: error?.message ?? null
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      adminPhoneConfigured: Boolean(ADMIN_PHONE),
      pushConfig: hasPushConfig(),
      supabaseAdmin: true,
      pushTable: false,
      error: error instanceof Error ? error.message : "Supabase connection failed."
    });
  }
}
