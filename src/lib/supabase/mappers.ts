import type { Order, Product, UserAddress } from "@/lib/types";

type ProductRow = {
  id: string;
  name: string;
  category: Product["category"];
  price: number;
  image_url: string;
  stock: number;
  brand: string;
  dietary: string[];
  unit_type: Product["unitType"];
  unit_options: string[];
  variant_prices: Record<string, number>;
};

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    image_url: row.image_url,
    stock: row.stock,
    brand: row.brand,
    dietary: row.dietary ?? [],
    unitType: row.unit_type,
    unitOptions: row.unit_options ?? [],
    variantPrices: row.variant_prices ?? {},
    reviews: []
  };
}

export function orderToSupabaseRow(order: Order, userId?: string) {
  return {
    public_order_id: order.order_id,
    user_id: userId,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    delivery_address: order.delivery_address,
    subtotal: order.subtotal,
    discount_amount: order.discount_amount,
    delivery_fee: order.delivery_fee,
    total_amount: order.total_amount,
    delivery_distance: order.delivery_distance,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    status: order.status,
    assigned_agent_id: order.assigned_agent_id,
    delivery_eta: order.delivery_eta,
    refund_status: order.refund_status,
    cancellation_reason: order.cancellation_reason,
    invoice_number: order.invoice_number,
    created_at: order.created_at
  };
}

export function profileFromPhone(userId: string, phone: string) {
  return {
    id: userId,
    full_name: "Tapas Customer",
    phone: phone.replace(/\D/g, "").slice(-10),
    phone_verified: true
  };
}

export function addressToSupabaseRow(address: UserAddress, userId: string) {
  return {
    id: address.id.startsWith("addr-") ? undefined : address.id,
    user_id: userId,
    label: address.label,
    receiver_name: address.receiverName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    landmark: address.landmark,
    distance_km: address.distanceKm
  };
}
