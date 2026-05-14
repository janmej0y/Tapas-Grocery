import { formatCurrency } from "@/lib/format";
import type { Order } from "@/lib/types";

export function buildInvoiceText(order: Order) {
  return [
    "Tapas Grocery Store",
    `Invoice: ${order.invoice_number}`,
    `Order: ${order.order_id}`,
    `Date: ${new Date(order.created_at).toLocaleString("en-IN")}`,
    "",
    `Customer: ${order.customer_name}`,
    `Phone: ${order.customer_phone}`,
    `Address: ${order.delivery_address.line1}, ${order.delivery_address.line2}, ${order.delivery_address.city}, ${order.delivery_address.state} - ${order.delivery_address.pincode}`,
    `Landmark: ${order.delivery_address.landmark}`,
    "",
    `Items: ${order.items_ordered}`,
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Discount: ${formatCurrency(order.discount_amount)}`,
    `Delivery: ${formatCurrency(order.delivery_fee)}`,
    `Total: ${formatCurrency(order.total_amount)}`,
    `Payment: ${order.payment_method} (${order.payment_status})`,
    `Status: ${order.status}`,
    `Estimated delivery: ${order.delivery_eta}`
  ].join("\n");
}

export function buildWhatsAppOrderUrl(order: Order) {
  const phone = order.customer_phone.replace(/\D/g, "");
  const message = encodeURIComponent(
    `Your Tapas Grocery Store order ${order.order_id} is confirmed.\nTotal: ${formatCurrency(order.total_amount)}\nStatus: ${order.status}\nEstimated delivery: ${order.delivery_eta}\nInvoice: ${order.invoice_number}`
  );
  return `https://wa.me/91${phone}?text=${message}`;
}

export function downloadInvoice(order: Order) {
  const blob = new Blob([buildInvoiceText(order)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${order.invoice_number}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
