import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { initialProducts } from "@/lib/mock-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Admin login is required to seed products." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role key is required to seed products." }, { status: 503 });
  }

  const { data: existingRows, error: existingError } = await supabase.from("products").select("name");

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  const existingNames = new Set((existingRows ?? []).map((row) => normalizeProductName(row.name)));
  const missingProducts = initialProducts.filter((product) => !existingNames.has(normalizeProductName(product.name)));

  if (missingProducts.length === 0) {
    return NextResponse.json({ inserted: 0, total: initialProducts.length });
  }

  const { error } = await supabase.from("products").insert(missingProducts.map(productToRow));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ inserted: missingProducts.length, total: initialProducts.length });
}

function productToRow(product: Product) {
  return {
    name: product.name,
    category: product.category,
    price: product.price,
    image_url: product.image_url,
    description: product.description,
    stock: product.stock,
    min_stock: product.minStock ?? 10,
    brand: product.brand,
    dietary: product.dietary,
    unit_type: product.unitType,
    unit_options: product.unitOptions,
    variant_prices: product.variantPrices
  };
}

function normalizeProductName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
