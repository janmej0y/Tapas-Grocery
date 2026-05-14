import { NextResponse } from "next/server";
import { initialProducts } from "@/lib/mock-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapProductRow } from "@/lib/supabase/mappers";
import type { Product } from "@/lib/types";

export async function GET() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ source: "mock", products: initialProducts });
  }

  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, source: "supabase", products: initialProducts }, { status: 500 });
  }

  return NextResponse.json({ source: "supabase", products: (data ?? []).map(mapProductRow) });
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  const product = (await request.json()) as Omit<Product, "id">;

  if (!supabase) {
    return NextResponse.json({ source: "mock", product: { ...product, id: `p-${Date.now()}` } });
  }

  const { data, error } = await supabase
    .from("products")
    .insert(productToRow(product))
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ source: "supabase", product: mapProductRow(data) });
}

export async function PATCH(request: Request) {
  const supabase = createSupabaseAdminClient();
  const product = (await request.json()) as Product;

  if (!supabase) {
    return NextResponse.json({ source: "mock", product });
  }

  const { data, error } = await supabase
    .from("products")
    .update(productToRow(product))
    .eq("id", product.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ source: "supabase", product: mapProductRow(data) });
}

export async function DELETE(request: Request) {
  const supabase = createSupabaseAdminClient();
  const { id } = (await request.json()) as { id?: string };

  if (!id) {
    return NextResponse.json({ error: "Product id is required." }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ source: "mock", id });
  }

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ source: "supabase", id });
}

function productToRow(product: Omit<Product, "id"> | Product) {
  return {
    name: product.name,
    category: product.category,
    price: product.price,
    image_url: product.image_url,
    stock: product.stock,
    brand: product.brand,
    dietary: product.dietary,
    unit_type: product.unitType,
    unit_options: product.unitOptions,
    variant_prices: product.variantPrices
  };
}
