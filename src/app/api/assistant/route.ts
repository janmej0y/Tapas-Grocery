import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { initialProducts } from "@/lib/mock-data";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`assistant:${ip}`, 20, 60_000);

  if (!rate.allowed) {
    return NextResponse.json({ answer: "Please slow down a little before asking another question." }, { status: 429 });
  }

  const { message } = (await request.json()) as { message?: string };
  const prompt = message?.trim();

  if (!prompt) {
    return NextResponse.json({ answer: "Ask me about groceries, recipes, delivery, or available products." });
  }

  if (process.env.GEMINI_API_KEY) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are the virtual shopkeeper for Tapas Grocery Store. Keep answers concise and use only these products when recommending items: ${initialProducts
                    .map((product) => `${product.name} (${product.category}, ₹${product.price})`)
                    .join(", ")}. Customer asks: ${prompt}`
                }
              ]
            }
          ]
        })
      }
    );
    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (answer) {
      return NextResponse.json({ answer });
    }
  }

  const lower = prompt.toLowerCase();
  const matches = initialProducts.filter((product) => lower.includes(product.category) || lower.includes(product.name.toLowerCase().split(" ")[0]));

  if (lower.includes("recipe")) {
    return NextResponse.json({
      answer: "Try a quick snack combo with Instant Noodles, Soup Mix, and a little Black Pepper. I can also help pick items from the current catalog."
    });
  }

  if (matches.length > 0) {
    return NextResponse.json({
      answer: `I found ${matches.map((product) => `${product.name} for ₹${product.price}`).join(", ")}. Add them from the product grid when you are ready.`
    });
  }

  return NextResponse.json({
    answer: "Delivery is available within 20 km. Delivery is free above ₹200 within 1 km and above ₹400 within 2 km."
  });
}
