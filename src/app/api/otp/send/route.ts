import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeIndianPhone } from "@/lib/supabase/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const OTP_RESEND_COOLDOWN_MS = 60_000;

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

  const phoneCooldown = checkRateLimit(`otp-phone:${normalizedPhone}`, 1, OTP_RESEND_COOLDOWN_MS);

  if (!phoneCooldown.allowed) {
    return cooldownResponse(phoneCooldown.resetAt);
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const cooldown = supabaseAdmin ? await getOtpCooldown(supabaseAdmin, normalizedPhone) : null;

  if (cooldown && cooldown.retryAfterSeconds > 0) {
    return NextResponse.json(
      {
        error: `Please wait ${cooldown.retryAfterSeconds} seconds before requesting another OTP.`,
        retryAfterSeconds: cooldown.retryAfterSeconds
      },
      {
        status: 429,
        headers: { "Retry-After": String(cooldown.retryAfterSeconds) }
      }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    await recordOtpSend(supabaseAdmin, normalizedPhone, ip);
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

  await recordOtpSend(supabaseAdmin, normalizedPhone, ip);

  return NextResponse.json({
    provider: "supabase",
    phone: normalizedPhone,
    message: "OTP sent by Supabase Auth."
  });
}

function cooldownResponse(resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return NextResponse.json(
    {
      error: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
      retryAfterSeconds
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) }
    }
  );
}

async function getOtpCooldown(supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, phone: string) {
  const { data, error } = await supabaseAdmin.from("otp_request_locks").select("last_sent_at").eq("phone", phone).maybeSingle();

  if (error || !data?.last_sent_at) {
    return null;
  }

  const elapsedMs = Date.now() - new Date(data.last_sent_at).getTime();
  const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000);
  return { retryAfterSeconds };
}

async function recordOtpSend(supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>> | null, phone: string, ipAddress: string) {
  if (!supabaseAdmin) {
    return;
  }

  await supabaseAdmin.from("otp_request_locks").upsert(
    {
      phone,
      ip_address: ipAddress.split(",")[0]?.trim() ?? "unknown",
      last_sent_at: new Date().toISOString()
    },
    { onConflict: "phone" }
  );
}
