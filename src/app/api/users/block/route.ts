import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  const { phone, blocked, reason } = (await request.json()) as {
    blocked?: boolean;
    phone?: string;
    reason?: string;
  };
  const normalizedPhone = phone?.replace(/\D/g, "").slice(-10);

  if (!normalizedPhone) {
    return NextResponse.json({ error: "Valid phone number is required." }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ source: "mock", phone: normalizedPhone, blocked: Boolean(blocked) });
  }

  const { error } = blocked
    ? await supabase.from("blocked_phones").upsert(
        {
          phone: normalizedPhone,
          reason: reason ?? "Blocked by admin",
          blocked_at: new Date().toISOString()
        },
        { onConflict: "phone" }
      )
    : await supabase.from("blocked_phones").delete().eq("phone", normalizedPhone);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ source: "supabase", phone: normalizedPhone, blocked: Boolean(blocked) });
}
