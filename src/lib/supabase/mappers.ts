import type { Order, Product, UserAddress } from "@/lib/types";

type ProductRow = {
  id: string;
  name: string;
  category: Product["category"];
  price: number;
  image_url: string;
  description?: string;
  stock: number;
  min_stock?: number;
  brand: string;
  dietary: string[];
  unit_type: Product["unitType"];
  unit_options: string[];
  variant_prices: Record<string, number>;
};

type OrderRow = {
  public_order_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: UserAddress;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  delivery_distance: number;
  payment_method: Order["payment_method"];
  payment_status: Order["payment_status"];
  status: Order["status"];
  assigned_agent_id?: string;
  delivery_eta: string;
  refund_status: Order["refund_status"];
  cancellation_reason?: string;
  invoice_number: string;
  created_at: string;
  order_items?: Array<{
    product_name: string;
    selected_unit: string;
    quantity: number;
  }>;
};

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    image_url: row.image_url,
    description: row.description,
    stock: row.stock,
    minStock: row.min_stock,
    brand: row.brand,
    dietary: row.dietary ?? [],
    unitType: row.unit_type,
    unitOptions: row.unit_options ?? [],
    variantPrices: row.variant_prices ?? {},
    reviews: []
  };
}

export function mapOrderRow(row: OrderRow): Order {
  return {
    order_id: row.public_order_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    delivery_address: row.delivery_address,
    items_ordered: formatOrderItems(row.order_items ?? []),
    subtotal: Number(row.subtotal),
    discount_amount: Number(row.discount_amount),
    total_amount: Number(row.total_amount),
    delivery_fee: Number(row.delivery_fee),
    delivery_distance: Number(row.delivery_distance),
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    status: row.status,
    assigned_agent_id: row.assigned_agent_id,
    delivery_eta: row.delivery_eta,
    refund_status: row.refund_status,
    cancellation_reason: row.cancellation_reason,
    invoice_number: row.invoice_number,
    created_at: row.created_at
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

function formatOrderItems(items: Array<{ product_name: string; selected_unit: string; quantity: number }>) {
  return items.map((item) => `${item.product_name} (${item.selected_unit}) x ${item.quantity}`).join(", ");
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
    latitude: address.latitude,
    longitude: address.longitude,
    distance_km: address.distanceKm
  };
}
