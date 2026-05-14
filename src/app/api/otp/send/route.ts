import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeIndianPhone } from "@/lib/supabase/config";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`otp:${ip}`, 4, 60_000);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many OTP requests. Please wait a minute." }, { status: 429 });
  }

  const { phone } = (await request.json()) as { phone?: string };
  const normalizedPhone = normalizeIndianPhone(phone ?? "");

  if (!normalizedPhone) {
    return NextResponse.json({ error: "Valid 10 digit Indian phone number is required." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({
      provider: "demo",
      phone: normalizedPhone,
      otp: "123456",
      message: "Supabase is not configured. Demo OTP returned for local development."
    });
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizedPhone
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    provider: "supabase",
    phone: normalizedPhone,
    message: "OTP sent by Supabase Auth."
  });
}
