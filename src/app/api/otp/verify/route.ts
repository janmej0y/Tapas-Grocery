import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAdminPhone } from "@/lib/admin-access";
import { normalizeIndianPhone } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileFromPhone } from "@/lib/supabase/mappers";

export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`otp-verify:${ip}`, 8, 60_000);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many OTP verification attempts. Please wait a minute." }, { status: 429 });
  }

  const { phone, token } = (await request.json()) as { phone?: string; token?: string };
  const normalizedPhone = normalizeIndianPhone(phone ?? "");

  if (!normalizedPhone || !token?.trim()) {
    return NextResponse.json({ error: "Phone number and OTP are required." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (admin) {
    const { data: profile } = await admin
      .from("blocked_phones")
      .select("phone")
      .eq("phone", normalizedPhone.replace("+91", ""))
      .maybeSingle();

    if (profile?.phone) {
      return NextResponse.json({ error: "This mobile number has been blocked by the store." }, { status: 403 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    if (token === "123456") {
      return NextResponse.json({
        provider: "demo",
        user: { id: "demo-user", phone: normalizedPhone },
        role: isAdminPhone(normalizedPhone) ? "admin" : "customer",
        session: null
      });
    }

    return NextResponse.json({ error: "Invalid demo OTP." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token,
    type: "sms"
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = data.user?.id;

  if (admin && userId) {
    await admin.from("customer_profiles").upsert(profileFromPhone(userId, normalizedPhone), { onConflict: "id" });
  }

  return NextResponse.json({
    provider: "supabase",
    user: data.user,
    role: isAdminPhone(normalizedPhone) ? "admin" : "customer",
    session: data.session
  });
}
