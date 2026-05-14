import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`payment:${ip}`, 6, 60_000);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many payment attempts. Please wait a minute." }, { status: 429 });
  }

  const { amount } = (await request.json()) as { amount?: number };

  if (!amount || amount < 1) {
    return NextResponse.json({ error: "Valid amount is required." }, { status: 400 });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({
      gateway: "demo",
      orderId: `demo_order_${Date.now()}`,
      amountInPaise: Math.round(amount * 100),
      currency: "INR",
      message: "Razorpay credentials are not configured. Demo payment order created."
    });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `tapas_${Date.now()}`,
    notes: {
      store: "Tapas Grocery Store"
    }
  });

  return NextResponse.json({
    gateway: "razorpay",
    orderId: order.id,
    amountInPaise: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID
  });
}
